# Kit lessons: xr-ray.mjs

The long comments cut from `demo/shell/xr-ray.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-ray.md#<anchor>`.

<a id="header"></a>

## xr-ray.mjs, file header

demo/shell/xr-ray.mjs — the pointer ray, as a billboard rather than a stick.

  const ray = createXRRay(gl);
  ray.draw({ vp, eyePos, pose, len, held });   // once per EYE, per frame
  ray.dispose();

🔴 WHY IT IS NOT A LONG THIN BOX, WHICH IS WHAT THIS REPO HAD.
`xr-room.mjs`'s `beamM` scales a cube 4 mm x 4 mm x however far, and a box
has a fixed cross-section in the WORLD: point along it and you see a square
end-on, roll the controller and the lit face changes, and at 12 m it is four
millimetres of shaded geometry trying to be a line. It also ends at a hard
edge in mid-air, which reads as the pointer stopping rather than as the
pointer running out.

A billboard has a fixed cross-section in the VIEW instead. It is a ribbon
built along the ray whose width axis is chosen per-vertex to be perpendicular
to both the ray and the direction to the eye, so it presents the same face
from everywhere, cannot be rolled, and has no end-on degenerate angle.

🔴 AND THE BILLBOARDING IS IN THE VERTEX SHADER, WHICH IS NOT A STYLE CHOICE.
A headset draws the same geometry twice from two eye positions ~64 mm apart.
Orienting the ribbon on the CPU picks one of those two and is therefore wrong
for the other — and the error is not a smear, it is a DISPARITY: the two eyes
see the ribbon at different widths and slightly different places, which the
visual system reads as depth. A pointer that sits at the wrong depth is worse
than one that looks wrong, because it looks fine and lands somewhere else.
`uEye` is per-draw, and the host passes the view's own position.

⚠️ IT FADES AT BOTH ENDS ON PURPOSE. Near the hand because a line growing out
of a controller model intersects it and reads as a skewer; in the distance
because a hard end is a claim about where the ray stops, and this ray does
not stop — it is an aim, not a measurement. Anything that wants to say where
the ray LANDS says it at the landing, not by terminating the beam.

<a id="fade"></a>

## xr-ray.mjs, FADE_IN and FADE_OUT

How far along the ray the ribbon has faded in, and started to fade out.
⚠️ Exported because the check below and the shader must agree about them,
and a test that re-types its subject's constants grades nothing.

<a id="grey"></a>

## xr-ray.mjs, AIM_RGB and HELD_RGB

🔴 THE RAY IS GREY, EVERYWHERE, AND THERE IS NO WAY TO MAKE IT ANYTHING ELSE.
Instructed 2026-09-17: *"use global rays, (white, ends faded). when something
active happens lighten them up. no coloring of rays, grayscale."*

It used to be teal at rest and yellow with hold of something, with a second
grey pair beside it for `floor`, which is one pointer with two looks: you
learn the colour again per page, and a hue on a pointer is a hue that is not
available to say how something LANDED. Now the only channel the ray has is
how BRIGHT it is, which is the same channel doing the same job on every page,
and a page cannot opt out — `draw` takes no colour at all.

⚠️ `MONO_AIM` AND `MONO_HELD` ARE THE SAME TWO VALUES AND ARE KEPT AS NAMES
ONLY. They were `floor`'s private pair; now that every ray is grey there is
nothing private about them, and a page importing either gets what the module
would have used anyway.

<a id="eye-from-view"></a>

## xr-ray.mjs, eyeFromView

Where the camera is, taken out of its own view matrix.

🔴 DERIVED RATHER THAN PASSED, AND THAT IS THE WHOLE POINT. The billboard has
to be turned against the eye that is ALSO projecting it, and a headset draws
two views 64 mm apart. Handing the position down beside the matrix means two
values that must agree and nothing that makes them — the first draft threaded
a `viewPos` through two modules and three call sites, every one of which had
a HEAD position already sitting next to it in the right shape. Taking it out
of the matrix makes disagreement impossible.

A view matrix is `-R * e` in its translation with an orthonormal R above it,
so the inverse is a transpose and three dot products.

<a id="create-xr-ray"></a>

## xr-ray.mjs, createXRRay

One ribbon, reusable by every page and every eye.

⚠️ IT PUTS BACK EVERY PIECE OF GL STATE IT CHANGES. A kit component that
leaves blending on, or the depth mask off, is a component that breaks the
NEXT thing its host draws — and the host will look like the broken one.

<a id="draw"></a>

## xr-ray.mjs, draw

@param vp      the view-projection for THIS eye
@param view    THIS eye's view matrix. The position is taken out of it —
              see `eyeFromView` for why it is not a separate argument.
@param eyePos  an override, for a caller that has no view matrix to hand
@param pose    the controller's target-ray matrix (column-major 16)
@param len     metres to draw. To what it has hold of, else what it is
              on, else a fixed reach — the host owns that rule.
@param held    something ACTIVE is happening on this ray — a hit, a grab,
              a press. The ribbon lightens from grey to white; it never
              changes hue, because it has none. There is deliberately no
              `colour` parameter: see the note by AIM_RGB.

<a id="depth"></a>

## xr-ray.mjs, draw, depth state

⚠️ DEPTH TESTED, DEPTH MASK OFF. Tested, so the ray really does go
behind anything in front of it; not WRITTEN, so a ribbon that is mostly
transparent does not occlude whatever is drawn after it.

<a id="ray-check"></a>

## xr-ray.mjs, rayCheck

🔴 THE RAY, GRADED BY RENDERING IT — WHICH IS THE ONLY WAY A BILLBOARD CAN BE
GRADED AT ALL.

The whole claim is about a vertex shader that chooses an orientation per eye,
and there is no arithmetic on this side of the GPU to check: a node test
would have to re-implement the shader and would then be grading its own copy.
So this renders into a 64 px framebuffer and counts ink, and every number it
returns is a comparison between two renders of the SAME run — no golden
image, for the reason `verify-gl.mjs` records at length.

Three questions, and the second is the one that earns its place:

· does it draw at all, from a viewpoint beside the ray?
· does it TURN? The same ray is drawn a second time with `uEye` moved 90
  degrees around the ray's own axis — which is exactly the bug of orienting
  on the CPU and using one eye's answer for both. A ribbon that really faces
  the eye it is given comes out edge-on and nearly disappears; a stretched
  box, or a ribbon with the billboarding broken, does not change at all.
  ⚠️ So the test PASSES when the second render is much dimmer. A check that
  wanted both to look the same would be satisfied by the bug.
· and does it fade at both ends rather than stopping?

Returns raw counts; the host asserts on them, so the numbers appear in the
page that has the ray rather than in a file nobody runs.

<a id="check-n"></a>

## xr-ray.mjs, rayCheck, framebuffer size

🔴 THE FRAMEBUFFER HAS TO BE ABLE TO RESOLVE THE THING IT IS GRADING, AND
THE FIRST VERSION COULD NOT. At 64 px the frame covers 2.39 m, so the
shipping ribbon — 18 mm across — was **half a pixel** wide and the check
read 0 ink both ways: a component that draws correctly, reported as drawing
nothing at all. ⚠️ And the two zeroes would have satisfied a sloppier
assert: `facing >= edgeOn` is true of 0 and 0. At 512 the ribbon is 3.8 px.
⚠️ The width is NOT widened for the test. Grading the shipped RAY_W means
setting it to zero fails here, which is the point of having the number in
one place.

<a id="camera-distance"></a>

## xr-ray.mjs, rayCheck, camera distance

⚠️ THE CAMERA DISTANCE IS COMPUTED, NOT CHOSEN. At a 1.2 rad field of view
the half-width visible at distance D is D * tan(0.6), and the fade check
below reads the two ENDS of the ribbon — so if the ray overflows the frame
those columns are sampling the middle of it and "the ends are dark" is a
statement about the background. 1.75 m puts the 2 m ray inside the frame
with about 8 px of margin at each end.

<a id="up-param"></a>

## xr-ray.mjs, rayCheck, view up

⚠️ up is a PARAMETER here. The obvious helper takes (eye, at) and assumes
+Y, and eyeB looks straight down -Y — where that assumption is degenerate
and hands back a matrix of NaN, so the second render would be blank for a
reason that has nothing to do with the ray.

<a id="round-trip"></a>

## xr-ray.mjs, rayCheck, eyeFromView round trip

⚠️ AND THE DERIVATION IS ROUND-TRIPPED, because it has an exact expected
answer and almost nothing else here does: this matrix was BUILT from eyeA,
so taking the position back out of it must give eyeA again. A transpose
written the wrong way round still produces a plausible position.
