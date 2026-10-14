# Kit lessons: xr-room.mjs

The long comments cut from `demo/shell/xr-room.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-room.md#<anchor>`.

<a id="header"></a>

## xr-room.mjs, file header

demo/shell/xr-room.mjs — the room `scene` builds from one seed, as a module,
so a second page can stand in the same one.

🔴 THIS IS demo/scene's ROOM, EXTRACTED — NOT A SECOND ONE. `scene` drew the
sky, the wall cube, the things and the per-eye loop inside its own page, and
`mirror` had a panel hanging in nothing. Two rooms would be two sets of the
same five WebXR defects, each of them silent from outside and every one of
them already paid for on a real Quest. The traps live at the top of
demo/shell/xr-panel.mjs, which owns the SESSION; this file owns the PICTURE,
and the two rules it has to keep on its own are:

  1. `gl.clear` IGNORES THE VIEWPORT. Both eyes render into one framebuffer,
     so only the first view clears colour and the rest clear DEPTH inside a
     `gl.scissor` — `draw({ clear: eye === 0 })` is that, and a viewport is
     not a clip region.
  2. `bindAttribLocation` ONLY TAKES EFFECT AT THE NEXT LINK. One VAO feeds
     three programs with position at 0 and normal at 1, so every link here
     binds both slots BEFORE `linkProgram` — called after, it is a no-op that
     reads like a fix, and a Quest reported GL_INVALID_OPERATION for it while
     drawing a correct-looking picture.

⚠️ AND NOTHING IN `draw` OR `observePlanes` MAY THROW. An uncaught error
inside a frame callback does not stop the loop — it silently removes
everything below it, which is how `scene` lost its status panel and its
gl-error check for the whole life of the page. `frame.detectedPlanes` is the
new hazard: it THROWS on a session that was not granted the feature, so it is
asked once behind a try and never asked again after a refusal.

<a id="radius-of"></a>

## xr-room.mjs, `radiusOf`, nothing sits inside anything else

── nothing sits inside anything else ─────────────────────────────────────
🔴 THE GENERATOR PLACES EACH THING WITHOUT LOOKING AT THE ONES ALREADY
THERE, so two of them can occupy the same piece of space. Reported from a
Quest 2026-09-13, and MEASURED over 200 seeds before this landed: 264
overlapping pairs of 46,440, in 135 of 200 rooms, the worst of them 0.615 m
deep — one thing swallowing another. In a window that reads as an odd shape;
in a headset it is a thing you cannot walk round, because it is not one
thing.

⚠️ THE BALL, NOT THE BOX. Things SPIN (`ry + tSec * spin` in the draw), so a
box-against-box test is true this frame and false the next, and a separation
that holds at one instant is not a rule. The circumscribed sphere of a cube
of edge s — s·√3/2 — is the only bound that survives every rotation, and it
is the same ball `scene`'s `pick` aims with, read from this one constant
rather than typed in both places.

🔴 AND THE ROOM MUST STILL BE A FUNCTION OF ITS SEED. Everything below is
arithmetic on the generated numbers: no clock, no `Math.random`, no iteration
order that depends on anything but the index. Roll the same seed twice and it
is still byte for byte the same room, which is the claim the negative control
makes and the whole reason a room fits in four bytes.

<a id="half-of"></a>

## xr-room.mjs, `halfOf`, the box separation test

🔴 THE THINGS ARE CUBES NOW, SO THE SEPARATION RULE IS A BOX TEST. It was a
sphere test — `radiusOf` is a cube's half-diagonal, near enough — and that is
the right approximation for a room of tumbling objects you only need to keep
apart. It is the WRONG one for a builder: two unit bricks sitting side by
side have their centres one unit apart and their bounding spheres overlapping
by 74% of a unit, so every stack anybody built would have been reported as
things inside each other. A sphere cannot say "touching" about a cube.

⚠️ `radiusOf` STAYS, because two other things use it — the bounds check that
keeps a thing inside the room and the reach test that decides which thing the
tablet is near — and both of those want a generous radius rather than an
exact face.

@returns {{ox:number, oy:number, oz:number} | null} how deep they are into
 each other on each axis, or null when they are clear.

<a id="overlap-of"></a>

## xr-room.mjs, `overlapOf` and `TOUCH_EPS`

⚠️ NO `GAP` BY DEFAULT, AND THAT IS THE DIFFERENCE BETWEEN A ROOM AND A
BUILDER. `GAP` is 4 cm of air so that two things a rounding error apart read
as two things rather than one shape with a seam. On a grid the opposite is
wanted: bricks that TOUCH are the product, and demanding air between them
makes every stack illegal — MEASURED, a brick set exactly on top of another
came out 0.40 m apart against a rule asking for 0.44 and was reported as
still inside it. Two bricks flush read as two because they are different
colours and their edges are shaded, which is three channels the seam never
needed. Pass a gap where one is wanted.
🔴 TOUCHING IS NOT OVERLAPPING, AND AT ZERO GAP THAT IS A FLOAT QUESTION. Two
bricks flush on a 0.2 m grid are `need - |d| = 0` apart, and 0.4 - 0.4 in
binary floating point is 5.5e-17 as often as it is zero — so a stack was
reported as interpenetrating by a twentieth of a femtometre. The tolerance is
a millionth of a metre: far below anything a grid can produce and far above
anything the arithmetic can invent.

<a id="gap"></a>

## xr-room.mjs, `GAP`

Air between two surfaces, and it is doing two jobs. It has to clear the
document's own rounding — MEASURED at a gap of zero, 128 pairs of 46,440 were
pushed to exactly touching and then ROUNDED back into contact, by 1.3e-4 m,
which 1 cm already fixes. 4 cm is for the eye: two things a rounding error
apart are one shape with a seam in it, and the rule is meant to make two
things look like two.

🔴 IT WAS LEFT AT 4 cm WHEN THE BRICK DOUBLED, 2026-09-19, AND THE REASON IS
THAT NOTHING READS IT. The brick went from 0.5 m to 1.0 m in `seed.mjs`, so
4 cm is half the share of a brick it used to be, and the obvious move is to
double it. Checked before doing that: `spaced()` calls `overlapOf(a, b)` with
no gap at all, on purpose, for the measurement written a few lines above (a
brick set exactly on top of another was reported as still inside the rule),
and `/blocks/` imports this name and never uses it. So it governs nothing
today, and a constant with no consumer cannot be wrong for being small
against a brick. It is kept rather than deleted because a page imports it and
this file does not own that page.

<a id="spread-passes"></a>

## xr-room.mjs, `SPREAD_PASSES`

MEASURED over 400 seeds: 11 passes was the most any room needed, and 342 of
them settled in two. The cap is here so a pathological room cannot spin, not
because rooms reach it.

<a id="drop-passes"></a>

## xr-room.mjs, `DROP_PASSES`

How many goes a DROPPED thing gets at finding somewhere to be. It is far
larger than the placement number because only one thing moves there — the
rest of the room is nailed down — so it has to walk out of a crowd rather
than have the crowd open up. MEASURED over 123,027 drops made dead centre
into another thing: 8 goes left 146 of them still overlapping, 48 leaves 3.
⚠️ AND 64 ALSO LEAVES 3 — the same three. They are not slow to converge, they
do not converge: the thing bounces between two neighbours, clearing each by
entering the other. More passes buy nothing, the residue is 0.064 m at its
worst rather than the 0.73 m a generator can produce, and the honest thing is
to say so here rather than claim a guarantee this does not have.

<a id="spaced-axis"></a>

## xr-room.mjs, `spaced`, push along one axis

⚠️ ALONG ONE AXIS, THE SHORTEST ONE, and half the distance each. Pushing
along the line between two centres is what a sphere does; it takes two
bricks that are barely touching on one face and slides them diagonally
off the grid, which is a builder that will not stack.

<a id="room-of"></a>

## xr-room.mjs, `roomOf`

A room from a seed, spaced.

⚠️ THE SEPARATION IS PART OF THIS, NOT OF THE CALLERS. A rule applied at
three call sites is a rule missing from the fourth — and a generator swapped
in live over the wire would arrive without it.

<a id="clashes"></a>

## xr-room.mjs, `clashes`

How the things in a room stand to one another: how many pairs are inside each
other, how deep the worst of them is, and the tightest gap there is between
two surfaces.

`closest` is what the asserts print when they pass — a pass that prints only
"0 pairs" says the same thing about a room with 4 cm to spare and one with
4 metres, and the number that moves is the one worth reading.

<a id="beam-m"></a>

## xr-room.mjs, `beamM`

A long thin box lying along a controller's ray.

`modelM` cannot do this: it scales uniformly and only rotates about two axes,
while a beam needs the controller's OWN orientation and a different scale
down each axis. Taking the rotation straight out of the pose matrix is both
shorter and exact.

<a id="stand-in"></a>

## xr-room.mjs, the controller stand-in and `STAND_IN_COL`

🔴 THE CONTROLLER STAND-IN, AND WHY IT IS NOT THE REAL MODEL.

The headset reports `meta-quest-touch-plus`, so the WebXR input-profiles
registry WOULD hand over a real glTF, and the licence is not the obstacle —
`@webxr-input-profiles/assets` is MIT (Amazon, 2019). The obstacle is what it
costs, MEASURED off the registry on 2026-09-13 rather than guessed at:

 meta-quest-touch-plus/left.glb    217,984 bytes
 meta-quest-touch-plus/right.glb   213,868 bytes
 profile.json                       11,430 bytes   (taken — see xr-hands.mjs)

433 KiB of mesh, and every byte of it needs machinery this repo does not
have. The `.glb` is glTF 2.0 with 31 nodes, 6 meshes, 23 accessors, one PBR
material and one embedded PNG, with POSITION/NORMAL/**TEXCOORD_0** — and the
room's whole shader vocabulary is a flat-colour box program over one VAO with
position at slot 0 and normal at slot 1 and no texture coordinate anywhere.
So it is a container parser AND an accessor decoder AND a node walk AND a PNG
decode AND a third program, to draw a thing whose entire job is to answer
"where is my hand". And `LAYOUT.md` would put the bytes in
`demo/<slug>/vendor/`, listed by name in the build — while this module is
SHARED by two pages, so a per-slug asset path fetched from `demo/shell/` is
the exact shape of the `moq.mjs` rename bug that made two demos assert
nothing.

⚠️ So: primitives, and the tablet's footer SAYS it is a stand-in. A proxy
that admits to being a proxy is honest; one that pretends to be a controller
is not. `plan-xr-hands` §4.2 reached the same answer for the same reasons and
this is that decision with the numbers under it.

The parts, in metres, each one a box offset along the grip's own -Z:
the handle your fist is round, the SQUARE TOP FACE the tablet lies on, and a
nub where the thumbstick is so the thing has a visible orientation.
🔴 THE STAND-IN SAYS IT IS A STAND-IN BY BEING A COLOUR NO CONTROLLER IS.

The tablet used to carry a line reading "a stand-in shape, not your real
controller". That line has gone — it was a caption on a control surface and
it crowded out the numbers — but the FACT it carried has not, because
deleting a display without rehoming what it said is how a page quietly stops
reporting something.

So it moved into the thing rather than a caption about the thing. The real
`meta-quest-touch-plus` model is white-grey; this is `--warn` amber, held
down so it is not a lamp in a dark room. You cannot mistake one for the other
and there is nothing to read.

⚠️ AND THIS IS NOT THE GREEN GRID AGAIN. That colour was a proof device — it
answered "did you really render on my surfaces?" once, and was retired the
day it was believed, because a proof device that lingers is decoration with a
story attached. This one reports a condition that RECURS and varies per run:
an unknown controller profile, or a model that would not load. It is the same
register as amber on a mark — "this landed in the degraded way" — which is
the one meaning colour is allowed to carry here.

<a id="model-base"></a>

## xr-room.mjs, `MODEL_BASE` and `MODEL_PROFILES`

🔴 WHERE THE CONTROLLER MODELS LIVE, AND WHY A SHELL MODULE MAY HOLD THE
PATH.

The hazard is real and it is `LESSONS`' own: `demo/shell/moq.mjs` went on
importing a URL a slug rename had moved, 404ed, killed the module, and made
two demos assert NOTHING while reading red for an unrelated reason. A shared
module holding a path is exactly that shape.

Three things make it safe here, and all three had to be true:

 1. **The path is under `/shell/`, which is where this module lives.** These
    assets belong to the ROOM, and the room is shared by two pages — putting
    them under one page's `vendor/` would mean the other page's controllers
    came from a directory named after a demo it is not. `LAYOUT.md` carries
    the reasoning; the wall it describes is still a wall, this is just the
    right side of it.
 2. 🔴 **`workers/view/build.mjs` REFUSES THE BUILD if the file is missing**,
    by name, the same treatment an import with no deployed file already
    gets. That is the check `moq.mjs` did not have. A rename cannot ship.
 3. **A 404 at runtime is not fatal and it SAYS SO.** The primitive stand-in
    draws instead and the tablet's own footer says which one you are looking
    at. `moq.mjs`'s 404 was silent; this one is on the thing in your hand.

⚠️ KEYED ON `XRInputSource.profiles`, WHICH IS THE STRING THE HEADSET ITSELF
REPORTS. The filename carries the profile id for that reason — the name and
the lookup are the same string, so there is nothing to keep in step. A
headset reporting anything else gets the stand-in, and is told.

<a id="body-profile"></a>

## xr-room.mjs, `BODY_PROFILE`

The stand-in's outline, as radius against distance along the controller.

🔴 THE FIRST VERSION WAS THREE BOXES AND IT CAME BACK FROM THE HEADSET AS
*"butt-ugly boxes"*. That is a fair verdict and it is not an argument for the
433 KiB of glTF — those reasons are unchanged and they are in `LAYOUT.md`. It
is an argument for a shape somebody chose. A lathe is twelve numbers and one
loop, and a body of revolution round the controller's own axis is very nearly
what a controller is.

⚠️ AND IT HAS NO TRACKING RING, WHICH IS CORRECT RATHER THAN MISSING. The
headset reports `meta-quest-touch-plus` — the Quest 3 controller — and that
generation removed the ring. A ring here would be a stand-in for a DIFFERENT
controller, which is worse than an obvious placeholder: it would be a
confident picture of the wrong object.

⚠️ AND IT STILL SAYS IT IS A STAND-IN, on the tablet's own footer. A shape
that looks like a real controller and is not is worse than a box.

Metres, in grip-local coordinates, where -Z is the thumb's direction — so the
butt sits at positive z and the face plate at negative z.

<a id="part-m"></a>

## xr-room.mjs, `partM`

One part of the stand-in, at a grip pose.

`modelM` cannot do this — it scales uniformly and rotates about two axes,
while a part needs the controller's OWN orientation and a different size down
each axis. Taking the rotation straight out of the pose matrix is shorter and
exact; it is `beamM`'s pattern with different constants.

⚠️ THE PROFILES ARE ALREADY IN METRES, so `sz` is 1 and the scales are only
there to squash a circle into an oval. A lathe built at unit size and then
scaled to fit would be two places holding the controller's dimensions.

<a id="controller-top"></a>

## xr-room.mjs, `CONTROLLER_TOP`

🔴 HOW FAR ALONG THE CONTROLLER THE TOP OF IT IS — **MEASURED off the real
model**, not from the stand-in and not typed.

`readGLB` on the vendored `meta-quest-touch-plus` files puts the geometry at
z -0.0498 .. +0.0735 about the grip origin, both hands, identically. So the
face plate is 4.98 cm along the thumb's direction — and the stand-in's own
profile was 7.1 cm, **2.1 cm too long**, which is not nothing: swapping
between a stand-in and a real model would have moved the tablet's apparent
attachment point by two centimetres the moment the fetch landed, which reads
as the tablet jumping rather than as two shapes disagreeing. `BODY_PROFILE`
is built to these bounds now, so the two occupy the same space.

<a id="face-tilt"></a>

## xr-room.mjs, `FACE_TILT`

🔴 HOW FAR THE FACE LEANS BACK FROM SQUARE-ACROSS-THE-CONTROLLER, in radians.

0 would put the screen exactly perpendicular to the handle. 20 degrees leans
its top edge away and its bottom edge towards you, which is how a watch face
sits on a wrist and is what makes it readable at the angle a hand actually
holds a controller at.

⚠️ IT IS FIXED TO THE CONTROLLER AND IT DOES NOT FOLLOW YOUR HEAD, and that
is a decision rather than an omission. A face that turns to meet you is a
billboard: it swims whenever you look away and back, the thing it is attached
to appears to rotate under it, and you can never learn where it is because it
is never in the same place twice. `xr-panel.mjs` makes the same argument
about panels ("a panel that follows your face cannot be looked away from").
A fixed offset is learned once, with your wrist.

This is the first number to change if it still reads wrong in a headset.

<a id="tablet-lift"></a>

## xr-room.mjs, `TABLET_LIFT`

Where the tablet's centre sits, along the controller's own axis.

🔴 DERIVED, NOT TYPED, and it had to become derived. The tablet grew by two
thirds and a hand-typed lift left its lower edge 0.4 mm INSIDE the head — a
two-sided number (too little and it is buried, too much and it floats
detached and reads as a tracking fault) that four constants all move. It is
the top of the controller, plus air, plus however far the slab's own lower
edge reaches once it has leaned back. `xr-pick-test.mjs` measures the gap
that comes out and requires it to be positive and small.

<a id="hold-m"></a>

## xr-room.mjs, `holdM`, the tablet's pose

🔴 THE TABLET, STANDING UP FROM THE CONTROLLER'S TOP FACE AND LEANING BACK AT
YOU. Reported from a Quest 3: *"tablet works but looks to sky not to me (x
rot 90 missing)"* — and that diagnosis was exactly right.

The grip convention (WebXR CRD via MDN): the origin is the centroid of the
closed fist, **-Z runs along the controller in the direction of the thumb**,
and X comes out of the back of the hand. The first version put the tablet's
NORMAL along -Z — flat on the top plate, facing the way the plate faces,
which with the controller held normally is **straight up at the ceiling**. It
was square to the controller, which is what was asked for, and unreadable,
which was not.

One quarter turn about the controller's own X axis fixes it, and the axes
fall out of that rotation rather than being chosen again:

 its right   = the grip's +X                    (untouched by its own turn)
 its up      = -Y·cos(t) - Z·sin(t)             at t=90° that is -Z, i.e.
                                                straight up the controller
 its normal  = +Y·sin(t) - Z·cos(t)             at t=90° that is +Y, i.e.
                                                across the handle, back at
                                                whoever is holding it

with `t = 90° - FACE_TILT`, so the face leans back towards the reader.

🔴 AND THE DETERMINANT IS STILL THE LOAD-BEARING CHECK. A rotation cannot
change it — it is w·h either way — but a hand-negated column can, and the
room draws with `CULL_FACE` on, so a mirrored basis is an **INVISIBLE**
tablet rather than a wrong-looking one. That is why the fix above is a
rotation of the whole basis and not a sign flipped until the picture looked
right. `xr-pick-test.mjs` asserts the sign, the lean and the old failure's
exact signature, on a laptop.

⚠️ STILL NO `handedness` TERM. MDN's mirrored-X warning is about anything
hung off the HAND; this hangs off the PLASTIC, and the top face is on the
thumb side for both hands. A sign flip here would correct a bug this pose
does not have.

<a id="shade-rgb"></a>

## xr-room.mjs, `shadeRGB`

A thing's `c` 0..1 -> rgb. It is a SHADE OF GREY, and that is the whole
change: it used to be a hue on three cosines 120 degrees apart, which is the
family CLAUDE.md already records as varying almost entirely in hue at
near-constant luminance. That is the wrong property for bricks. Brightness is
how this room says what is under your pointer and what is in your hand, and a
red brick beside a blue one at the same luminance leaves that signal nowhere
to move.

<a id="model-vs"></a>

## xr-room.mjs, `MODEL_VS`, the real controller program

── the real controller, when we have its model ───────────────────────────
🔴 A THIRD PROGRAM, AND IT IS THE ONE THING THE MESHES GENUINELY COST. The
room's box program has position at slot 0 and normal at slot 1 and no texture
coordinate anywhere; a glTF model carries TEXCOORD_0 and a base-colour map,
so it needs its own attribute layout and its own fragment shader. That is
twenty lines, which is the honest price — and the PNG beside it costs
nothing, because `createImageBitmap` hands the decode to the browser.

⚠️ THE LIGHTING IS THE ROOM'S, NOT THE MODEL'S. One lambert from the same
direction `BOX_FS` uses, times the base-colour texture. It is deliberately
NOT physically-based: a metallic-roughness path needs an environment to
reflect and this room does not have one, so it would be a more expensive way
to look worse. See the revisit trigger at the top of xr-glb.mjs.

<a id="grid-vs"></a>

## xr-room.mjs, the dotted grid shaders

── the dotted grid ───────────────────────────────────────────────────────

A reference surface, not scenery. It says where the floor is and which way
the walls run, and in passthrough it is the only thing this page draws that
is ABOUT your room rather than in front of it — so it is dots rather than
lines (lines read as a cage), it fades out with distance rather than ending
in a hard rectangle, and the dots are one size — see the note in main()
can be read rather than guessed.

⚠️ THE WIDTH COMES FROM `fwidth` ON THE RAW COORDINATE, not on the folded
one. Folding with `fract` puts a discontinuity at every cell boundary, and a
derivative taken across it spikes — which draws a faint line down the middle
of each gap, i.e. exactly the grid of lines this is not supposed to be.

⚠️ AND A DOT SMALLER THAN A PIXEL FADES RATHER THAN ALIASES. At a grazing
angle one pixel covers many cells; drawn at full strength that is a grey haze
on the far floor, which reads as fog on a page that has none.

<a id="grid-fs-glow"></a>

## xr-room.mjs, the fake light off a panel (`GRID_FS`)

── the fake light off a panel ────────────────────────────────────────────

🔴 THIS IS AN APPROXIMATION AND THE COMMENT IS THE HONEST HALF OF IT. Asked
for as "a bit of glow so the video lights the room a bit", and what is
affordable is NOT what that sentence describes. So, in as many words:

  IT IS      one colour — the AVERAGE of the panel's own pixels, measured
             each time it is sampled — poured onto the surfaces the dots are
             already drawn on, falling off as a gaussian round the panel's
             centre.
  IT IS NOT  a light. Nothing is integrated over the panel's area, nothing
             falls off as 1/r², nothing is shadowed, nothing bounces, and
             NOTHING ELSE IN THE ROOM IS LIT BY IT — not the controllers, not
             the things, not the other panel. A bright patch in the corner of
             the picture does not move the patch on the floor, because the
             only thing crossing from the picture to the floor is one RGB
             triple. If the panel goes dark the pool goes out, and that is
             the whole of the physics in here.

⚠️ SO IT IS DELIBERATELY WEAK. A convincing fake invites the reader to
believe a measurement nobody made; a faint wash that answers to the picture's
colour reads as what it is. `uGlowFall.y` is the amplitude and the page keeps
it under half.

<a id="hold-vs"></a>

## xr-room.mjs, the tablet's face (`HOLD_VS`, `HOLD_FS`)

The tablet's face — a dark slab with rounded corners, with the tablet's own
canvas drawn onto it.

🔴 A SIGNED-DISTANCE ROUNDED RECTANGLE, NOT A TEXTURE AND NOT GEOMETRY. The
corner radius is computed per pixel from the quad's own coordinate, so it is
exact at any size and at any distance from the eye — a rounded PNG would be
soft the moment you brought it close, and rounded geometry would need
tessellation to look like anything. It is the same trick the grid uses one
shader up, for the same reason. ⚠️ And it is why `xr-tablet.mjs` draws NO
rounded rectangle of its own: two roundings over one another show a seam at
every corner.

🔴 `uHas` IS WHAT SEPARATES "NO CONTENT" FROM "CONTENT THAT IS BLANK". With
no tablet module wired in, the slab is a slab; with one, its ink is composited
over the fill. A shader that sampled an unbound texture would read black-and-
opaque, which is a tablet whose screen has failed rather than one that has no
screen — and those need different fixes.

⚠️ THE FILL IS HELD NEAR-OPAQUE AND THAT IS A CONTRAST DECISION, NOT A MODE
ONE. Over passthrough this composites onto a lit room and in an opaque
session onto a dark one; the tempting fix is to brighten it in the first,
which would put the session mode into the controller interface. Making the
slab its own background instead means what is behind it stops mattering, so
one number serves both and there is nothing to branch on. It is still DARK —
a bright panel at arm's length is a lamp in your vision.

<a id="hold"></a>

## xr-room.mjs, `HOLD`

The slab's look. Its SIZE lives in `xr-tablet.mjs` beside the texture that
has to fill it, because the two are one decision — pixels per degree — and
splitting them across two files is how they come to disagree.

<a id="hold-radius"></a>

## xr-room.mjs, `HOLD.radius`

⚠️ IN THE SHADER'S OWN UNITS, WHERE THE HALF-HEIGHT IS 0.5 — so this is a
corner radius of a quarter of the slab's height. It was 0.055, which is
11% and reads as a rectangle somebody forgot to round; *"bit rounded rect"*
was the note from the headset. The rounding itself is the signed-distance
one already in HOLD_FS — exact at any size and at any distance from the
eye — so this is a constant moving, not a second way of drawing a corner.

<a id="fade"></a>

## xr-room.mjs, `FADE_NEAR`, `FADE_FAR` and `GRID.span`

🔴 THE FLOOR IS BIGGER THAN THE FADE, WHICH IS MOST OF WHAT "DRAW A CORRECT
FLOOR" MEANT. The dots fade out with distance so the surface does not end in
a hard rectangle — but the square was 10 m across, half-span 5 m, against a
fade that does not finish until 11 m. So the dots were still at roughly two
thirds strength where the quad simply stopped, which is a hard edge 5 m in
front of you: exactly the cage the fade exists to avoid, drawn by the fade's
own constants disagreeing with the floor's. The span is DERIVED from the fade
now rather than typed beside it, so the two cannot drift again.
🔴 AND IT STAYED AT 11 m WHEN THE BRICK DOUBLED, 2026-09-19. The floor is not
measured in bricks: this is how far a dot can still be seen, so it is set by
the DOT and the eye. At 4 mm radius a dot subtends 0.042 degrees at 11 m,
which on the measured Quest 3 framebuffer (1680 px an eye over about 110
degrees) is roughly two thirds of a pixel, so the fade already ends where
there is nothing left to draw. The dots got SMALLER in the same edit, which
argues for a shorter reach rather than a longer one, and the build area went
to 4.8 m across, whose corners still sit 8.6 m inside this edge.
⚠️ AND A PAGE IS TUNED AGAINST THE NUMBER THIS DERIVES. `/blocks/` holds a
soft wall at 22 m, which is twice this half-span, and the reason it was not
doubled with the brick is that walking further would put somebody standing on
nothing. Moving `FADE_FAR` moves `GRID.span` and so moves what that wall is
measured against, which makes this a two-file change rather than a taste one.

<a id="grid-cell"></a>

## xr-room.mjs, `GRID.cell`

🔴 12.5 cm, HALVED FROM 25. Reported from a Quest 3 as *"xr grids too
big"*: at a quarter of a metre the dots read as a coarse lattice you look
AT rather than as a surface you stand ON, which is the whole job. A metre
is eight dots now rather than four, and 0.125 still divides the 22 m floor
exactly (176 cells a side), so the pattern stays centred on the origin.
⚠️ The count does not cost anything: the dots are a fragment shader over
ONE quad, so the work is per pixel and not per dot, and the sub-pixel fade
two lines down is what keeps a denser grid from turning into haze.

<a id="grid-dot"></a>

## xr-room.mjs, `GRID.dot`

🔴 4 mm, DOWN FROM 5, DOWN FROM 7. Asked twice, the same way both times:
*"make them smaller (global vr grid everywhere, same for xr)"* on
2026-09-16, and *"make floor grid dots a biiit smaller (global component)"*
on 2026-09-19 with a screen shot of the flat page. On a 12.5 cm cell 7 mm
is 11% of the gap between dots, 5 is 8% and 4 is 6.4%, so the surface goes
on being marked without the marks being what you look at. Every number is
here so the RATIO is visible, which is the quantity that matters rather
than any one of them alone.
⚠️ A DOT SMALLER THAN A PIXEL FADES RATHER THAN ALIASES, which the note
above GRID_FS explains: at a grazing angle one pixel covers many cells, and
the shader answers with strength rather than with a hard edge. So going
smaller costs distance rather than shimmer.

<a id="grid-alpha"></a>

## xr-room.mjs, `GRID.alpha`

🔴 HOW STRONG THE DOTS START, EXPORTED BECAUSE THE TABLET ALSO NEEDS IT.
`xr-tablet.mjs`'s `floor dots` slider had `value: 75` typed into it beside
this file's own `0.75`, which is a shared measurement in two files and this
project's own named way of getting one of them wrong. Lowering it here and
not there would have put the slider at 75 over dots drawn at 52.5, so the
control would have been lying the moment the page opened.

<a id="grid-col"></a>

## xr-room.mjs, `GRID_COL`

🔴 WHITE, AND ONE WHITE. It was blue-white in VR, brighter blue-white in
passthrough, and GREEN when the dots were on surfaces the headset had
reported — that last one was a proof device, asked for in as many words
("make it another colour for me to believe"), and it has done its job: 11
surfaces confirmed on a Quest 3 on 2026-09-13. A proof device that stays
after it has proved its point is decoration with a story attached.

⚠️ AND ONE COLOUR IS THE POINT, NOT A SIMPLIFICATION OF IT. Two brightnesses
chosen per session mode is the session mode reaching into the picture; the
dots' strength is now the tablet's slider, which is a thing the person
wearing the headset can answer for themselves in either mode. Where the grid
IS drawn — your measured surfaces, or the one surface `local-floor`
guarantees — is still said in words, in `describe()`, where a claim about
your room belongs.

<a id="glow-off"></a>

## xr-room.mjs, `GLOW_OFF`

No glow. A named constant rather than three literals at the call site,
because "amplitude zero" is the only thing that means "this page did not ask
for one" and it must be impossible to get wrong in one of the two places.

<a id="boundary-of"></a>

## xr-room.mjs, `boundaryOf`

🔴 WHICH DETECTED SURFACES GET DOTS: THE ROOM'S SHELL, NOT ITS FURNITURE.

Reported 2026-09-17: *"window seems to have doubled dots somehow when having
moving panels (mirror demo)"*. The grid is drawn with `depthMask(false)` and
nothing opaque between the surfaces, so every quad handed to it is
superimposed on every other one in the same look — and a Quest 3 hands over
ELEVEN, measured on 2026-09-13 in this repo: `door 1 · ceiling 1 · wall 4 ·
window 1 · bed 1 · shelf 2 · floor 1`. A bed at 0.5 m and a floor at 0 are
two parallel dot fields at two heights, in the same place on screen, at
slightly different scales. That is a doubled floor, and it is the only
mechanism in this module that can draw one.

⚠️ IT IS A HYPOTHESIS UNTIL A HEADSET SAYS SO. It was NOT reproduced here:
`xrPreview` on this laptop renders one dot field per eye with no doubling at
any zoom (checked down to single pixels), because a window session detects no
planes at all and falls back to the page's own single floor. What is certain
is the superimposition; what is unconfirmed is that it is what somebody saw.

The rule: **every VERTICAL plane, the LOWEST horizontal one, and the ceiling.**
Those are the surfaces a room is made of. A table, a bed, a shelf or a couch
is a thing standing in the room, and dotting it says the room's ground is
there — which is a false statement about where the floor is, made in the one
channel this page uses to say where the floor is.

⚠️ AND IT FALLS BACK TO EVERYTHING RATHER THAN TO NOTHING. A runtime that
labels nothing and reports no orientation would otherwise leave the shell
empty, and an empty shell reads as "your room has no surfaces" — which is a
claim about somebody's room made out of our own inability to classify one.

<a id="wall-yaw"></a>

## xr-room.mjs, `wallYaw`

🔴 WHICH WAY ROUND YOUR ROOM IS, IN RADIANS, FROM THE WALLS THE HEADSET
MEASURED. Zero when there are none, and zero is the old behaviour exactly.

Reported 2026-09-17 about `/blocks/`: *"in xr blocks are angled against wall,
rotated a bit, not fully against wall"*. The bricks are axis-aligned to the
REFERENCE SPACE, whose yaw is wherever the headset happened to be looking
when the session started; a real wall is at whatever angle the builder put
it. The two agree only by luck, so a brick pushed up to a wall meets it
corner-first. Nothing was rotated by mistake — the room was.

⚠️ MODULO A QUARTER TURN, AND THAT IS THE WHOLE TRICK. Four walls give four
normals ninety degrees apart, so a plain mean of their angles is meaningless
(north and east average to north-east). Folding by 4 maps all four onto one
direction, and the circular mean of THAT is the room's orientation: the
answer is in [-45°, +45°], which is the smallest turn that squares a grid up
with the walls.

⚠️ WEIGHTED BY AREA. A 3 m wall says more about which way a room faces than a
40 cm sliver beside a door, and an unweighted mean lets the sliver argue as
loudly as the wall.

⚠️ AND A PLANE'S NORMAL IS ITS OWN +Y, NOT ITS +Z. WebXR lays a plane in the
X-Z of its `planeSpace`, so the normal is column 1 of its pose. Reading
column 2 gives a direction lying IN the wall, which is a yaw that is wrong by
ninety degrees — and at a quarter turn that is the one error this function
cannot see, because it folds by four.

<a id="room-optional-features"></a>

## xr-room.mjs, `ROOM_OPTIONAL_FEATURES`

Ask for this ALONGSIDE the required features, never instead of them.

🔴 REAL ROOM DATA IS OPTIONAL AND IT MUST NOT GATE THE GRID. A headset whose
owner has never run Space Setup, or who refuses the permission, still gets a
floor to stand on — the page's own — and is TOLD that is what it is. Asking
for `plane-detection` in `requiredFeatures` would turn "I did not set my room
up" into "this page will not start", which is the same collapse as a blank
readout cell meaning both "we did not look" and "we looked and it was fine".

<a id="create-xr-room"></a>

## xr-room.mjs, `createXRRoom`

The room, drawn.

@param {WebGL2RenderingContext|null} gl  a context made with `alpha: true` —
      see xr-panel.mjs defect 2; with no alpha there is nothing to clear to
      zero and passthrough is replaced by black. May be null and handed over
      later with `attach()`: a page that only needs a context once somebody
      puts a headset on should not make one for every desktop visitor, and
      the document, the plane bookkeeping and the words about where the
      grid's floor came from are all answerable with no context at all.
@param {object} [o]
@param {(msg:string, kind?:string) => void} [o.log]  the page's own log
@param {(line:string) => void} [o.say]  a line that must survive entering a
      session — `shipNow`/`beacon`, never a batched shipper

<a id="link"></a>

## xr-room.mjs, `link`, bind before linking

🔴 BEFORE linkProgram, NOT AFTER — trap 2 at the top of this file.

<a id="lathe"></a>

## xr-room.mjs, `lathe`

A body of revolution round local Z, from `[[z, radius], ...]`.

⚠️ SMOOTH NORMALS, FROM THE PROFILE'S OWN SLOPE. A lathe with face normals
reads as a faceted barrel — which is the box problem again in a rounder
costume. The normal at a profile point is perpendicular to the segment
through its neighbours, swung round with the point: `(dz, -dr)` in the
half-plane, which needs no trigonometry and is exact at the caps where the
slope goes vertical.

⚠️ AND THE WINDING HAS TO COME OUT FRONT-FACING, because the room draws
with `CULL_FACE` on and `cullFace(BACK)` — a lathe wound the other way is
an object you see the INSIDE of, which reads as a hole in the controller
rather than as a winding bug. `z` DECREASES down the profile here (the butt
is at +z), so the ring order below is the one that comes out counter-
clockwise seen from outside.

<a id="hands"></a>

## xr-room.mjs, what is in your hands

── what is in your hands, handed over once a frame ──────────────────────
🔴 THE ROOM DOES NOT DECIDE ANY OF THIS, IT ONLY DRAWS IT. Which hand
carries the tablet and which one points is `xr-hands.mjs`'s single decision,
taken from `handedness`; this file is the picture. Two places choosing a
hand is two places that can choose differently, and only one of them would
be the one somebody reads.

<a id="grid-alpha-state"></a>

## xr-room.mjs, `gridAlpha`

0..1, and it is the tablet's slider. Set once at session start through
`applyAll` so the dots start where the control says they are rather than at
a default that only agrees with the number by coincidence.
🔴 HOW STRONG THE DOTS ARE, AND IT CAME DOWN 30% ON 2026-09-16.
Asked as *"reduce floor dot opacity 30%"*, globally, in VR and in
passthrough alike, along with the smaller dot in `GRID`. 0.75 to 0.525.

⚠️ IT IS ALSO THE TABLET'S SLIDER, so this is a DEFAULT and not a ceiling:
anybody wearing the headset can take the dots back up or down for
themselves, which is the reason the grid has one colour and one strength
rather than one per session mode.

<a id="model-state"></a>

## xr-room.mjs, the real controller models

── the real controller models ──────────────────────────────────────────
`null` until asked for, then a promise, then `{ vao, count, tex, col }` or
`false` for "we asked and it would not come". Three states, not two: "we
have not looked" and "we looked and there is none" are different findings
and the footer prints different words for them.

<a id="said-this-session"></a>

## xr-room.mjs, `saidThisSession`

⚠️ ONE LINE PER SESSION, ON THE SUCCESS PATH AS WELL AS THE FAILURE ONE.
`loadModel` says what it found, ONCE per page load — so a model fetched
during the flat preview is never mentioned again, and a headset session
that follows it would carry no line about the controllers at all. The
reader would then have "no line" meaning both "it worked" and "nothing
asked", which is the collapse this project keeps paying for. Reset by
`markAsked`, which is the one call that means a session started.

<a id="attach-fail"></a>

## xr-room.mjs, `attach`, grid and model programs may fail alone

⚠️ THE GRID IS ALLOWED TO FAIL ON ITS OWN. It is the newest thing here
and the only one that needs `fwidth`; a driver that will not compile it
must cost the dots, never the room.
⚠️ THE MODEL PROGRAM IS ALLOWED TO FAIL ON ITS OWN, like the grid. A
driver that will not compile it must cost the real controllers and fall
back to the stand-in, never the room.

<a id="attach-hold-fail"></a>

## xr-room.mjs, `attach`, the tablet program failing

⚠️ `log`, NOT `onLog`. There is no `onLog` in this scope, so a failed
compile would have thrown a ReferenceError out of `attach` — a handler
for a failure that fails.
⚠️ AND IT SAYS SO ON THE BEACON TOO. The tablet is the one thing here a
headset run is FOR, so "it would not compile" has to reach the log the
owner reads rather than only the page behind their face.

<a id="grid-placement"></a>

## xr-room.mjs, where the grid goes

── where the grid goes ─────────────────────────────────────────────────
Each surface is one quad: its model matrix, the metres it spans, and the
origin its dots count from — so dots on a detected wall line up with that
wall's own corner rather than with a world axis that has nothing to do
with it.

<a id="build-own-room"></a>

## xr-room.mjs, `buildOwnRoom`

🔴 A FLOOR, AND NOTHING ELSE. THE PAGE'S OWN WALLS ARE GONE.

This used to build a 10 m square and four 3 m walls, and the walls were the
page inventing geometry it has no information about. A made-up wall at 5 m
is a CLAIM about where your room ends, and that claim is always wrong —
which is the same offence as colouring an unmeasured thing as if it had
passed. The floor is different in kind: the session is on `local-floor`, so
the origin IS the floor. It is the one surface the page actually knows
about, and knowing it is what the reference space is for.

⚠️ AND THERE IS NO SESSION MODE IN HERE, WHICH IS THE POINT. "Walls in
passthrough, none in VR" would have been a branch, and a branch on
`planes.state` would have been worse: `none` only arrives after the grace
period, so a passthrough session would have drawn walls for two and a half
seconds and then taken them away — a flash, caused by a verdict about the
headset's scan being read as a verdict about what to draw. The rule that
removes both is simpler than either: **draw what was measured, and one
floor besides.** Real walls still appear in passthrough the moment the
headset reports them, because those are surfaces somebody's room actually
has; they arrive through `planeQuads`, which replaces this list entirely.

<a id="empty-grace"></a>

## xr-room.mjs, your room, and `EMPTY_GRACE_MS`

── your room, if this headset will say ─────────────────────────────────
🔴 "NO PLANES" IS NEVER DRAWN AS "NO WALLS". Three different things look
identical from outside — the session was never granted the feature, the
feature is granted and the room has never been set up, and the room is set
up and we are standing in it — so each one gets its own words and its own
line in the log. A grid at the page's own floor that does not say it is the
page's own floor is a measurement claiming to be about your room.
How long an AR session may keep answering "no surfaces" before that counts
as an answer. MEASURED: a Quest 3 took **200 ms** from session start to
handing over 11 surfaces; 2.5 s is an order of magnitude of headroom on the
one number anybody has. ⚠️ It is a floor on PATIENCE, not a timeout — the
room is still accepted whenever it turns up, including long after this.

<a id="planes-state"></a>

## xr-room.mjs, `planes.state`

🔴 SIX ANSWERS, NOT A BOOLEAN. `not asked` (no session yet), `waiting`
(asked, no frame has answered), `refused` (the session was never given
the feature), `unreadable` (it answered and we could not parse it),
`none` (granted, and your room has no surfaces in it — and ONLY after
`EMPTY_GRACE_MS`, because the first empty answer is not the final one),
`yours` (we are standing in a mapped room). A boolean would collapse at
least three
different findings — including "we did not look" and "we looked and
there is nothing" — into one word, which is the collapse this project
keeps paying for.

<a id="planes-dotted"></a>

## xr-room.mjs, `planes.dotted`

⚠️ HOW MANY OF THEM ACTUALLY GET DOTS, which is a different number and
has to be said separately: "your room reported 11 surfaces" and "the grid
is drawn on 6 of them" are two facts, and one of them is a decision this
page made. See `boundaryOf`.

<a id="planes-yaw"></a>

## xr-room.mjs, `planes.yaw`

⚠️ RADIANS, AND 0 MEANS "NO WALLS WERE MEASURED" RATHER THAN "YOUR ROOM
IS SQUARE TO THE HEADSET". Those are different and a page that wants to
know which asks `count`/`labels.wall` as well. See `wallYaw`.

<a id="plane-shell"></a>

## xr-room.mjs, `planeShell`

🔴 THE SUBSET OF THEM THAT IS THE ROOM'S SHELL, WHICH IS WHAT GETS DOTS.
See `boundaryOf`. Kept beside the full list rather than replacing it,
because `planes.count` is a fact about your room and this is a decision
about the picture — collapsing the two would make "your headset reported
nothing" and "your headset reported only furniture" the same finding.

<a id="describe-own"></a>

## xr-room.mjs, `describe`, words from the same constant

⚠️ THE WORDS ARE READ OFF THE SAME CONSTANT THE FLOOR IS BUILT FROM. A
description that can disagree with its config is worse than none, and
this one had exactly that shape: it said "with 3 m walls" for as long as
there were walls to say it about, and it would have gone on saying it.

<a id="describe-yours"></a>

## xr-room.mjs, `describe`, the yours note

Four facts, four sentences. This string reaches a page's log box, so it
lost its middots on 2026-09-19 with the rest of what a visitor reads: a
line that bolts a third and a fourth clause on with a separator is the
habit the em dash rule is about, wearing a different character.

<a id="describe-none"></a>

## xr-room.mjs, `describe`, the none note

🔴 THIS MESSAGE BLAMED THE WRONG THING AND SENT SOMEBODY LOOKING AT
THEIR HEADSET SETTINGS. MEASURED on a Quest 3, 2026-09-13, minutes
apart on one machine:

  immersive-ar   11 surface(s) — door 1 · ceiling 1 · wall 4 ·
                 window 1 · bed 1 · shelf 2 · floor 1
  immersive-vr   NO surfaces

Same room, same grant, same scan. **Planes come in an AR session and
not in a VR one** — which makes sense, since an opaque session has no
room to composite against, but nothing said so and the old wording
asserted "Space Setup has probably never been run here" about a
headset whose Space Setup was fine. A guess presented as a diagnosis
is worse than no diagnosis: it cost a room rescan and a serious
suggestion of reinstalling the headset.

So the note now says which session it is in, and only mentions Space
Setup where that is still a live possibility.

<a id="describe-unreadable"></a>

## xr-room.mjs, `describe`, the unreadable note

🔴 A FOURTH ANSWER, BECAUSE THREE WAS NOT ENOUGH. The headset answered
and we could not read what it said — which is not "it said no" and is
certainly not "your room has no walls". Without this it read as "not
asked", i.e. as OUR failure to ask, and the next person would go
looking for the request that was in fact made.

<a id="describe-quiet"></a>

## xr-room.mjs, `describe`, the first call is silent

⚠️ THE FIRST DESCRIPTION IS SILENT. It is written before any session
exists, so announcing it would put "nothing has asked your headset for
surfaces yet" in the log of every laptop visitor — a line about a
measurement nobody requested, which is noise wearing a finding's clothes.

<a id="mark-asked"></a>

## xr-room.mjs, `markAsked`

Say that a session asked for `plane-detection`, so "we never asked" and
"we asked and were refused" stop being the same state. Called by whatever
opened the session, because only that code knows what it put in
`optionalFeatures`.
@param opaque  true when the session composites OPAQUE — i.e. VR. It
 decides what "no surfaces" is allowed to blame, and that distinction
 was measured the expensive way: see the `none` branch in `describe`.
 ⚠️ Read off `environmentBlendMode`, never off the session's NAME — a
 session can be called `immersive-ar` and still composite opaque.

<a id="observe-planes"></a>

## xr-room.mjs, `observePlanes`

Once per FRAME, never per eye, and it cannot throw.

⚠️ `frame.detectedPlanes` THROWS on a session that was not granted
`plane-detection` — it is not `undefined`, it is an exception, and an
exception in a frame callback silently deletes every line below it. It is
asked behind a try, and after a refusal it is never asked again: retrying
90 times a second to be told no is a cost with no information in it.

<a id="plane-orientation"></a>

## xr-room.mjs, `observePlanes`, orientation

⚠️ `orientation` IS THE RUNTIME'S OWN WORD AND IT CAN BE MISSING.
Where it is, a wall is `vertical`; where it is not, the plane's own
up — column 1 of its pose — is read instead, so a runtime that
answers about geometry and not about semantics still gets classified.
Falling back to "horizontal" would put every unlabelled wall into the
competition for which surface is the floor.

<a id="plane-shell-set"></a>

## xr-room.mjs, `observePlanes`, the shell

🔴 THE DOTS GO ON THE ROOM'S SHELL, NOT ON EVERYTHING THE HEADSET SAW.
See `boundaryOf` for the doubled-floor this exists to stop.

<a id="plane-yaw-set"></a>

## xr-room.mjs, `observePlanes`, the yaw

🔴 WHICH WAY ROUND YOUR ROOM IS, so a page that puts square things in it
can line them up with the walls rather than with the reference space.
See `wallYaw`; it is 0 with no walls, which is what every page did
before this existed.

<a id="plane-empty"></a>

## xr-room.mjs, `observePlanes`, an empty first answer

🔴 AN EMPTY SET ON THE FIRST FRAMES IS NOT AN ANSWER, AND CALLING IT
ONE MADE THIS PAGE BLAME SPACE SETUP FOR THE SECOND TIME. MEASURED on
a Quest 3, 2026-09-13, ONE passthrough session:

  6.30 s   "your headset reported NO surfaces — Space Setup may never
           have been run here"
  6.50 s   11 surface(s) — shelf 2 · wall 4 · ceiling 1 · bed 1 ·
           floor 1 · window 1 · door 1

200 ms apart. The room was there the whole time; the headset simply had
not finished handing it over. The previous fix taught this message to
distinguish VR from AR — correctly — and left the assumption underneath
untouched: that the FIRST empty answer is the final one. A diagnosis
that is right about the mechanism and wrong about the timing reads
exactly like a diagnosis that is right, and this one cost a room rescan
and a serious suggestion of reinstalling the headset.

⚠️ The grace period is on the CLOCK, not on a frame count: a page that
is drawing slowly would otherwise wait longer in wall time for the same
verdict, and the thing being waited on is the headset's scan, which
does not care how fast we render.

<a id="plane-malformed"></a>

## xr-room.mjs, `observePlanes`, a malformed plane

A malformed plane must not take the render loop with it — and it must
not leave the page saying "nothing asked", which is a claim about US
rather than about the answer that did arrive.

<a id="fade-on"></a>

## xr-room.mjs, `fadeOn`

⚠️ CONSTANT-ALPHA BLENDING, AND `LEQUAL` WITH IT. The old picture is
already in the framebuffer, so drawing the new one over it with
`blendColor(0,0,0,k)` gives new*k + old*(1-k) for nothing — and it needs no
third program and no extra targets.

The depth function is the part that is easy to miss: the second pass is the
SAME geometry at the SAME depth, so the default `LESS` rejects every
fragment of it and the fade does nothing at all while looking wired up.

<a id="draw-glow"></a>

## xr-room.mjs, `drawGrid`, the glow uniforms

The fake light off a panel — see the note above GRID_FS for what this
is and, more to the point, what it is not. Amplitude 0 is the whole of
"there is no glow", so a page that never asks for one pays one uniform
and the `if` in the shader.

<a id="draw-grid-col"></a>

## xr-room.mjs, `drawGrid`, one colour

🔴 ONE COLOUR AND ONE STRENGTH, AND NEITHER OF THEM IS A FUNCTION OF THE
SESSION. `ar` used to be a parameter of this function purely so the dots
could be a different white in passthrough; it is gone, and with it the
last place the controller interface could have learned what kind of
session it was in. What the dots are ON is still a real difference and
it is one line below — the surfaces the headset measured, or the floor.

<a id="draw-grid-blend"></a>

## xr-room.mjs, `drawGrid`, separate alpha

⚠️ SEPARATE ALPHA, because in passthrough the destination starts at
zero alpha and the compositor reads that channel to decide how much of
your real room to let through. `ONE, ONE_MINUS_SRC_ALPHA` accumulates
coverage there; the ordinary two-argument form would leave the dots
painted onto a still-transparent buffer.

<a id="draw-grid-surfaces"></a>

## xr-room.mjs, `drawGrid`, which surfaces

🔴 YOUR ROOM'S SHELL WHERE THE HEADSET MEASURED ONE, THE PAGE'S OWN
FLOOR WHERE IT DID NOT. `planeShell` is `planeQuads` minus the
furniture — see `boundaryOf`.

<a id="draw"></a>

## xr-room.mjs, `draw`

One view of the room.

@param {object} o
@param {Float32Array} o.proj
@param {Float32Array} o.view
@param {number} [o.tSec]     seconds, for the spin and the wall shader
@param {object} [o.doc]      the room document
@param {boolean} [o.clear]   🔴 ONLY THE FIRST VIEW MAY CLEAR COLOUR
@param {boolean} [o.ar]      passthrough: no walls, and clear to nothing
@param {number|null} [o.aimed]        index the ray is on
@param {{i:number,dist:number}|null} [o.held]
@param {{m:Float32Array}|null} [o.ray]
@param {number} [o.aimedDist]
@param {number[]} [o.eye]    where the viewer is, for the grid's fade
@param {boolean} [o.grid]
@param {(lit:boolean, aimed:boolean) => {lit:number, scale:number}} [o.touch]

<a id="draw-no-throw"></a>

## xr-room.mjs, `draw`, nothing may throw

🔴 NOTHING THAT RUNS IN A FRAME CALLBACK MAY THROW. An uncaught error
there does not stop the loop — it silently removes every line below it,
which is how this project's own XR page lost its status panel and its
gl-error check for the whole life of the page, and how three headset runs
became indistinguishable from outside. If the room breaks, it stops being
the room and SAYS so; the page's panels, its way out and its dead-man's
switch all keep running.

<a id="draw-tablet"></a>

## xr-room.mjs, `drawTablet`

The tablet, wherever `xr-hands.mjs` says it is hanging.

⚠️ NOT INSIDE THE OPAQUE PASS. It is transparent at its edges, so it is
drawn after the room or it blends against whatever happened to be in the
depth buffer. Depth TEST stays on — a tablet behind a cube should be behind
it — but depth WRITE goes off, or it punches a hole the second eye cannot
fill.

⚠️ AND CULLING GOES OFF. A screen has no back, and the room turns culling
ON because its own walls are a cube seen from the inside. A tablet you can
see the back of is a one-sided object; a tablet that VANISHES when the
controller is turned over reads as a tracking fault.

<a id="upload-tablet"></a>

## xr-room.mjs, `uploadTablet`

The tablet's ink, on the card.

⚠️ ONCE PER FRAME AND ONLY WHEN IT CHANGED, which is the difference between
this and the panels in `xr-panel.mjs`. Those re-upload every frame ON
PURPOSE, because measuring that cost is what that page is for. This one is
a slider and a number: it changes when a thumb moves it and not otherwise,
so a version counter is the whole optimisation and the first upload's cost
is reported so that "it is free" stays a measurement rather than a belief.

🔴 CALLED ONCE PER FRAME, NEVER PER EYE. `texImage2D` between the left eye
and the right would show the two eyes two different instants.

<a id="draw-yaw"></a>

## xr-room.mjs, `drawInner`, the `yaw` option

🔴 WHICH WAY ROUND THE THINGS STAND, IN RADIANS, ADDED
TO EVERY ONE OF THEM. Default 0, which is every page's
behaviour before this existed.

A page whose objects are BOXES has to line them up with
the room, and the room is not square to the reference
space — reported on `/blocks/` as *"in xr blocks are
angled against wall, rotated a bit, not fully against
wall"*. `planes.yaw` is the angle; this is where it
lands. ⚠️ ONE angle for all of them, never per thing:
the whole point is that they agree with each other and
with the walls, and a per-thing rotation would put the
page back where it started.

<a id="draw-ray"></a>

## xr-room.mjs, `drawInner`, the pointer source

⚠️ THE POINTER COMES FROM `setInput` UNLESS A PAGE OVERRIDES IT. One
source of truth by default, and the override exists only because `scene`
still owns its own grab-and-move and hands the same ray back down.

<a id="draw-clear"></a>

## xr-room.mjs, `drawInner`, the clear

🔴 `gl.clear` IGNORES THE VIEWPORT — it clears the whole framebuffer.
Both eyes render into ONE framebuffer side by side, so clearing on the
second view wipes everything the first had just drawn. A viewport is not
a clip region, and `gl.scissor` is the thing that makes it one.

<a id="draw-clear-colour"></a>

## xr-room.mjs, `drawInner`, the clear colour

Transparent in passthrough: every pixel this page does not draw is a
pixel of your actual room.
⚠️ AND WITH NO SKY, THIS COLOUR *IS* THE ROOM. A page that turns the
walls off has nothing behind its floor but the clear, so it is allowed
to choose it — see `bg` in the parameter list. The default is what
every page that keeps its sky has always had.

<a id="draw-walls"></a>

## xr-room.mjs, `drawInner`, the walls

The walls: one big cube seen from the inside, so the front faces are the
ones pointing AWAY. Cull the other way round rather than turning culling
off — a room drawn with both faces writes depth from the near wall and
hides everything inside it.
⚠️ NO WALLS IN PASSTHROUGH. The walls ARE the room in the other two
modes; in passthrough your own room is the room, and drawing a box around
you would be drawing over the thing you asked to see.

🔴 AND A PAGE MAY TURN THEM OFF IN VR TOO — `sky: false`. That is not the
same statement as `ar`: passthrough has your room behind it, and a VR
session with no sky has NOTHING behind it, so the two look alike in the
code and not at all alike through a headset. A page that asks for this is
asking its floor, its panels and whatever it lights them with to carry
the whole room, and it had better have checked that they can.
⚠️ It also means the two modes CONVERGE here rather than diverging, which
is why a page can offer both out of one draw call — the only remaining
differences are the clear (transparent against `bg`) and whether your
headset hands over any surfaces at all.

<a id="draw-touch"></a>

## xr-room.mjs, `drawInner`, aimed and held things

The thing under the pointer, and the thing in your hand, are lit
differently — colour says WHAT IS HAPPENING to it, which is the same
rule every other page here follows about colour.
ONE LOOK, from the kit — see TOUCH in xr-panel.mjs. Brighter AND
slightly bigger, because in a headset brightness alone reads as "that
one is pale" rather than "that one is under your pointer".

<a id="draw-beam"></a>

## xr-room.mjs, `drawInner`, the pointer beam

⚠️ THE POINTER HAS TO BE VISIBLE OR THE ROOM IS UNUSABLE. Dragging worked
before this and still felt like guessing, because nothing showed where
you were aiming — reported from the headset, and it is the difference
between a control and a coincidence. A beam down the ray, and nothing at
the end of it: a marker there reads as a fourth object in the room, one
that follows you and cannot be picked up.
⚠️ THE BEAM IS THE POINTER'S, AND IT IS THE SAME BEAM IN BOTH MODES.
`ray` is whatever `xr-hands.mjs` chose — the right hand's target ray
where there is one — and its LENGTH follows the same rule whatever kind
of session this is: to the thing it has hold of, else to the nearest
thing it is on, else to the tablet if it is on that, else a fixed 2.4 m.
🔴 "IN PASSTHROUGH IT COULD END ON A REAL SURFACE" IS THE TEMPTING
EXCEPTION AND IT IS REFUSED. A beam that behaves one way over your room
and another in the dark is two pointers to learn; and the plane it would
stop on is one the page has only in one of the two modes, so the
behaviour would be a function of what was measured rather than of what
you did. One rule, both modes.
⚠️ THE HIT IS THE ONE `xr-hands.mjs` ALREADY TOOK, NOT A SECOND ONE.
Computing it again here would be a second answer to "is the ray on the
tablet", and the beam could stop somewhere the slider does not think it
was pressed — two truths about one pointer, which is the shape of bug
nobody can see from inside a working-looking picture.
🔴 A RIBBON, NOT A BOX — AND IT IS `demo/shell/xr-ray.mjs`, SHARED. This
used to be `beamM`: a cube scaled to 4 mm x 4 mm x however far. A box has
a fixed cross-section in the WORLD, so it is a square seen end-on, its
lit face changes as the controller rolls, and at 12 m it is four
millimetres of shaded geometry trying to be a line. The ribbon has a
fixed cross-section in the VIEW and fades out at both ends instead of
stopping at an edge in mid-air.
⚠️ IT TAKES THE `view` MATRIX, NOT `eye`. The ribbon is billboarded in
the vertex shader against the position it is given, and the two eyes are
64 mm apart — one position used for both is a stereo disparity, which the
visual system reads as the pointer being at a depth it is not at. `eye`
beside it is the HEAD, once a frame, which is right for the grid's
distance fade and wrong for this; handing over the matrix that is ALSO
doing the projecting means the two cannot disagree.

<a id="draw-beam-restore"></a>

## xr-room.mjs, `drawInner`, restore the box program

⚠️ AND THE BOX PROGRAM HAS TO BE PUT BACK. The ribbon has its own
program and VAO, and everything below here — the controllers, the
tablet's frame — is still drawing boxes.

<a id="draw-controllers"></a>

## xr-room.mjs, `drawInner`, the controllers

🔴 ONE STAND-IN PER HAND THAT ACTUALLY RESOLVED, and "resolved" is the
point. MEASURED on a Quest 3: two sources appeared and the LEFT grip did
not resolve while the right did, in the same frame. A page that draws a
controller wherever it last saw one would leave a shape sitting in the
air; a page that draws only what the runtime answered for shows you
exactly what it knows, which is also the debugging instrument.

⚠️ IDENTICAL ON BOTH HANDS. They used to be two slightly different greys
for no reason anybody could read off the picture — colour in this project
says how something LANDED, and "this is the left one" is not that. Which
hand is which is answered by the tablet being on one of them.
🔴 THE REAL MODEL WHERE THERE IS ONE, THE STAND-IN WHERE THERE IS NOT,
AND THE TABLET'S FOOTER SAYS WHICH. The model is fetched the first time a
controller with a known profile is seen and drawn from the frame it
lands; there is no waiting anywhere, so a session that starts before the
fetch finishes simply shows the stand-in for a moment. A headset
reporting a profile nobody has vendored keeps the stand-in for good, and
that is a supported outcome rather than a failure.

<a id="draw-models"></a>

## xr-room.mjs, `drawInner`, models after the loop

⚠️ THE MODELS RUN A DIFFERENT PROGRAM, SO THEY GO AFTER THE LOOP. Two
programs alternating once per controller is two `useProgram` calls per
hand for nothing; and the box program's uniforms are still needed below.

<a id="draw-model-pose"></a>

## xr-room.mjs, `drawInner`, the grip pose unscaled

🔴 THE GRIP POSE, UNSCALED. The model is authored in metres about the
grip origin — that is what the input-profiles registry means by a
controller asset — so the model matrix IS the grip matrix. Scaling it
to "look right" would be correcting a pose that is already correct,
and it would be wrong the moment somebody held it up to a real one.

<a id="apply-look"></a>

## xr-room.mjs, `applyLook`

A look on its way in.

⚠️ HELD, NOT SWAPPED. A shader changing between one frame and the next is a
hard cut, and a hard cut across your whole field of view is a great deal
more violent than the same cut in a browser pane. Throws if it will not
compile, and the picture keeps its own.

<a id="retire"></a>

## xr-room.mjs, `retire`

Retire the outgoing look when its fade has finished. True on the frame it
happened, so the page can say so.

⚠️ CALLED OUTSIDE `draw`, NEVER INSIDE IT — `draw` runs once PER EYE, so
swapping there would replace the programs between the left eye and the
right and show two different looks in one frame.

<a id="load-model"></a>

## xr-room.mjs, `loadModel`

Fetch, read and upload one controller model. Never awaited by anything the
picture depends on.

🔴 NOT IN THE ENTRY PATH, AND NOT EVEN NEAR IT. This repo has lost three
headset runs to things that take time between `requestSession` and the
first frame, and a 218 KB fetch is exactly that shape. It is started the
first time a controller with a known profile is SEEN — which is already
inside a running session, drawing at 90 fps — and until it lands the
stand-in draws. Nothing waits for it, nothing fails if it never arrives,
and every outcome has its own words.

⚠️ AND THE COSTS ARE MEASURED AND SHIPPED, because "it is free" should be a
number somebody can read back. Bytes, parse milliseconds, vertex count and
the texture decode all go into one line.

<a id="load-model-decode"></a>

## xr-room.mjs, `loadModel`, the texture decode

🔴 THE DECODE IS THE BROWSER'S, WHICH IS WHY IT IS NOT A COST. The
rejection this replaced listed "a PNG decode" among the work; it is
one `await` against a Blob and one upload. Said here because the
estimate was wrong in a way that made a decision look better than it
was — see the top of xr-glb.mjs.

<a id="load-model-said"></a>

## xr-room.mjs, `loadModel`, what the line says

🔴 IT SAYS WHAT LOADED, NOT WHAT IS ON SCREEN — AND IT SAID THE SECOND
FOR ONE DAY AFTER IT STOPPED BEING TRUE. This line read "your real
controllers are being drawn, from their own models" and was printed by
`/blocks/` in a window that draws no controller at all, because the
geometry came out of every scene on 2026-09-17 while the model is still
fetched (see `warmModel`). A log line is a page talking to a reader, and
this file cannot see whether anything draws what it loaded.

<a id="load-model-refused"></a>

## xr-room.mjs, `loadModel`, a failure

⚠️ REFUSED, NOT APPROXIMATED — and it is said in the one place you can
read it while wearing the thing.

<a id="set-input"></a>

## xr-room.mjs, `setInput`

Everything about the hands, from `xr-hands.mjs`, once a frame.

⚠️ GRIP FOR THE STAND-INS, TARGET RAY FOR THE POINTER, and the two are not
interchangeable. The ray is where you are POINTING and the grip is where
your HAND is; a controller drawn at the ray floats in front of you and a
tablet drawn there is unreachable. `plan-xr-hands` §1.4.

🔴 IT TAKES, IT DOES NOT DECIDE. Which hand carries the tablet, where the
tablet hangs and whether the ray is on it were all settled by the one
module that owns input. A second opinion here would be a second answer to
the same question, and only one of them would be the one anybody reads.

<a id="set-input-said"></a>

## xr-room.mjs, `setInput`, say what the controllers are

🔴 SAY WHAT THE CONTROLLERS ARE, ONCE, WHEN THE ANSWER HAS SETTLED — and
say it whichever way it settled. The tablet no longer carries the words,
so this is the only place a reader can find out WITHOUT looking at the
shape; and because it is per session rather than per page load, a run
whose model was already cached still reports.

<a id="set-grid"></a>

## xr-room.mjs, `setGrid`

How strongly the dots are drawn, 0..1 — the tablet's own slider, applied
through the control's `apply`. It is a setter rather than a read of the
tablet so that the room keeps working with no tablet at all, and so the
value arrives the same way any future control's would.

<a id="warm-model"></a>

## xr-room.mjs, `warmModel`

🔴 FETCH, READ AND UPLOAD A CONTROLLER MODEL WITHOUT DRAWING ONE.

Added 2026-09-17, when the controller geometry came out of every scene
(*"rm controller geometry/tablet on all"*). Until then the ONLY thing that
ever loaded a model was `drawInner` seeing a hand — so a page that draws no
hands never fetches the `.glb`, never runs `readGLB`, never decodes the
texture and never uploads it, and all four of those would first happen on
the first frame of somebody's one headset session if the models are ever
put back. That is exactly where a pending `gl.getError()` costs a run.

⚠️ IT DRAWS NOTHING AND IT IS NOT A SCENE OBJECT. It is the same
`loadModel` the draw path calls, reached by name instead of by a hand
appearing, so the suite can keep grading the path on real hardware while
the picture stays empty. `room.controllers` answers for it either way.

<a id="getters"></a>

## xr-room.mjs, the room's getters

⚠️ GETTERS, NOT COPIES. `look` is what a page compares before and after a
refused shader, and a field written once would answer about whichever
instant it was written in.

<a id="surfaces"></a>

## xr-room.mjs, `room.surfaces`

What the grid is ACTUALLY drawn on this frame — your room's planes when
there are any, the page's own five quads when there are not. Exposed
because the snapping is code only a headset can reach, and a list a
harness can read is the difference between "it should work" and a number.

<a id="all-surfaces"></a>

## xr-room.mjs, `room.allSurfaces`

⚠️ AND EVERYTHING THE HEADSET REPORTED, BESIDE IT. `surfaces` is what gets
dots; this is what your room has. A check that could only see the first
cannot tell "the headset found nothing" from "the headset found only
furniture", which is the collapse this file keeps writing about.

<a id="controllers"></a>

## xr-room.mjs, `room.controllers`

🔴 WHAT A CONTROLLER WOULD BE DRAWN FROM, as a word. Three answers,
not two: `not asked` (no controller has been seen), `model` (the real one),
`stand-in` (unknown profile, or the fetch failed). A boolean would collapse
"we have not looked" into "there is none", which is the collapse this
project keeps paying for.

<a id="has-tablet"></a>

## xr-room.mjs, `room.hasTablet`

⚠️ "THE FACE COMPILED", NOT "A TABLET IS ON SCREEN". Whether one is hanging
needs a hand in a headset; whether this driver would draw it is answerable
on a laptop, and it is the half that can silently fail — the shader gained
a sampler and a flag, and a page that cannot compile it loses the only
control it has in there.
