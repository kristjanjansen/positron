# Kit lessons: xr-glb.mjs, xr-glb-test.mjs

The long comments cut from `demo/shell/xr-glb.mjs` and `demo/shell/xr-glb-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-glb.md#<anchor>`.

<a id="header"></a>

## xr-glb.mjs, file header

demo/shell/xr-glb.mjs — enough of glTF 2.0 to draw the two controller models
this repo vendors, and nothing else.

🔴 NOT A glTF LIBRARY, AND THAT IS THE POINT. The same argument that keeps a
markdown library out of this repo for two asterisks: three.js is 600 KB to
draw boxes, and a general loader would carry sparse accessors, Draco, KTX2,
skins, animation samplers, morph targets and a scene graph — none of which
these two files contain. What they DO contain was measured before a line was
written (`node demo/shell/xr-glb-test.mjs` re-measures it):

  glTF 2.0 · NO extensionsUsed, NO extensionsRequired
  31 nodes · 6 meshes · 23 accessors · 1 material · 1 texture · 1 PNG
  attributes POSITION / NORMAL / TEXCOORD_0 · indexed triangles
  no skins, no animations, no cameras, no sparse accessors

🔴 SO IT REFUSES WHAT IT CANNOT READ RATHER THAN DRAWING SOMETHING
APPROXIMATE. `synthdef-audio.mjs` already sets that rule here: a reader that
silently skips the part it does not understand produces a picture that is
WRONG in a way nobody can see, and a wrong picture of a real object is worse
than an obvious stand-in. Every refusal below names the thing it met.

⚠️ AND A REFUSAL IS NOT FATAL TO THE PAGE. The caller falls back to the
primitive stand-in and says on the tablet's own footer which one you are
looking at. A headset we have never seen still gets a controller.

⚠️ IT RUNS UNDER NODE. Nothing here touches WebGL, the DOM or `fetch` — it
takes an ArrayBuffer and returns plain arrays — so the whole parser is graded
on a laptop against the real 217,984 bytes rather than on a head.

── what this cost, against what it was predicted to cost ─────────────────

🔴 THE ESTIMATE THAT ARGUED AGAINST DOING THIS AT ALL CARRIED A FREE ITEM.
It read: "a container parser AND an accessor decoder AND a node walk AND a
PNG DECODE AND a third program". **The PNG decode is not work.** The image is
a byte range inside the file; it goes to `createImageBitmap` as a Blob and
the browser decodes it — one `await` and one `texImage2D`, which this repo
already does for every panel it hangs in a room. Carrying a free item made
the rejection look more expensive than it was, and an argument that does that
is wrong even when its conclusion happens to be defensible.

MEASURED, after the fact: **181 lines of code here** (272 with the comments)
and 106 in the test beside it. That is roughly what four of those five items
should cost and it is not close to a library.

🔴 WHEN TO STOP DEFENDING THIS AND TAKE A LIBRARY — a decision with no stated
expiry is how a hand-rolled thing quietly becomes a project. The trigger is
any ONE of:

  · animated parts — a trigger that tilts when you pull it. That needs the
    node hierarchy kept LIVE rather than baked, plus the profile's
    `visualResponses`, and the baking below is most of why this is short.
  · skinning, morph targets, or more than one material.
  · real PBR — metallic-roughness with its own maps, IBL, KHR extensions.
  · a second family of models that needs Draco or KTX2, both of which arrive
    through `extensionsRequired` and are refused by name below.

⚠️ AND THE RULE BEHIND THAT, WHICH IS WORTH MORE THAN THIS FILE: a library is
right when the thing is a DEPENDENCY of the work, hand-writing is right when
it is the SUBJECT. The timeline, the strip and the diagram engine are the
subject — writing them is how this repo came to know that `gl.clear` ignores
the viewport. Controller meshes are a dependency; nobody learns anything from
the four-hundredth glTF parser. That points at a library, and three.js is
still the wrong one: it is not a loader, it is a whole renderer, and adopting
it means rewriting both XR pages and throwing away the per-eye loop, the
blend modes and the four measured GL traps that live in their comments. Large
price, small problem. `LAYOUT.md` carries the rule.

<a id="container"></a>

## xr-glb.mjs, the container, and the two tables

── the container, and the two tables ─────────────────────────────────────
🔴 CHECKED AGAINST three.js `examples/jsm/loaders/GLTFLoader.js`, **v0.186.0,
MIT** (Copyright © 2010-2025 three.js authors), read 2026-09-13. The code
here was written from the specification first and then diffed against that
file; everything below matched it exactly, which is the point of saying so —
a table that agrees with the reference implementation is a different kind of
claim from a table somebody transcribed carefully.

What was compared, and what came of it:

  `GLTFBinaryExtension`      the container. three.js keeps the magic as the
                             STRING 'glTF'; this keeps it as the little-
                             endian uint32 0x46546c67, which is the same four
                             bytes and one fewer decode. Its chunk loop and
                             this one agree, INCLUDING that an unknown chunk
                             type is skipped rather than refused — the spec
                             says clients must ignore them.
                             ⚠️ AND IT CORRECTED A BUG HERE. This file used
                             to round each chunk length UP to the next
                             multiple of four before advancing. three.js does
                             not, because the spec requires the length to be
                             padded ALREADY — so the round-up was a second,
                             silent padding that would have walked past the
                             binary chunk of any file whose JSON chunk was
                             not a multiple of four. Both vendored files
                             happen to be aligned (10,768 bytes), so every
                             test passed and the bug was invisible. It now
                             advances by exactly the length and REFUSES an
                             unaligned one by name.
  `WEBGL_COMPONENT_TYPES`    identical, all six entries. There is no 5124 in
  `WEBGL_TYPE_SIZES`         either — Int32 is not a glTF component type —
                             and MAT2/MAT3 were missing here and are not now.
                             🔴 COPIED EXACTLY, because a wrong entry parses
                             cleanly and draws garbage: a table bug wearing a
                             rendering bug's clothes, which is the thing
                             `synthdef.mjs`'s OP table has a comment about.
  `loadAccessor`             its `byteStride` handling is the same rule this
                             uses. Its SPARSE path was read and then
                             DELIBERATELY NOT IMPLEMENTED — see the refusal
                             below. Its `normalized` handling likewise.

⚠️ AND THE GRADER IS THE FILE, NOT THE READING. `xr-glb-test.mjs` parses the
real vendored bytes and checks the result is controller-SHAPED — 6.8 x 6.0 x
12.3 cm, unit normals, texture coordinates inside the picture, a PNG that
starts with a PNG signature. A table can only be called right when the file
it parses comes out looking like the object it is of.

<a id="read-glb"></a>

## xr-glb.mjs, readGLB()

Read a `.glb`.

@param {ArrayBuffer} buf
@returns {{positions:Float32Array, normals:Float32Array, uvs:Float32Array,
          count:number, image:{bytes:Uint8Array, mime:string}|null,
          baseColor:number[], stats:object}}

🔴 EVERY PRIMITIVE IS BAKED INTO ONE FLAT TRIANGLE LIST, IN SCENE SPACE.
These models are 6 meshes across 31 nodes and ONE material, so the
alternative — a VAO and a draw call per primitive, with the node hierarchy
kept live — buys exactly one thing: moving parts, a trigger that tilts when
you pull it. That is not what a controller in this room is for; it is here to
answer "where is my hand", which a rigid model answers completely. ⚠️ Say so
rather than leave it to be discovered: THE TRIGGER AND THE THUMBSTICK DO NOT
MOVE, and making them move means keeping `nodes` and walking the profile's
`visualResponses`, which is a different piece of work and a bigger one.

Indices are resolved here too, so the caller gets `drawArrays` and never
needs an element buffer — 27k vertices against 9k is a few hundred kilobytes
of GPU memory, once, for two models, and it removes a whole class of
index-type bug from the drawing.

<a id="chunk-length"></a>

## xr-glb.mjs, readGLB(), chunk length

🔴 THE LENGTH IS ALREADY PADDED, so nothing is added to it here. See the
note on `GLTFBinaryExtension` at the top of this file: rounding up was a
second padding, and it was invisible because both vendored files happen
to be aligned.

<a id="extensions-required"></a>

## xr-glb.mjs, readGLB(), extensionsRequired

🔴 REFUSE ON `extensionsRequired` BEFORE ANYTHING ELSE. That array is the
file telling you, in the spec's own words, that it cannot be drawn
correctly without them — Draco geometry and KTX2 textures both arrive this
way, and both would otherwise parse into a plausible-looking nothing.

<a id="sparse"></a>

## xr-glb.mjs, readGLB(), sparse accessors

🔴 READ IN three.js AND DELIBERATELY NOT IMPLEMENTED. A sparse accessor
is a base array plus a list of (index, value) overrides; ignoring the
overrides parses cleanly and draws the UN-overridden mesh, which is a
model that is present, plausible and wrong. Neither vendored file uses
one — checked, 0 of 23 accessors — so this is a refusal rather than a
gap, and it names itself if a future model needs it.

<a id="normals"></a>

## xr-glb.mjs, readGLB(), normals

⚠️ ROTATED, NOT TRANSLATED. A normal is a direction: putting it
through the full matrix drags it away from the surface by the
node's position, which lights the model from a place that moves
with the geometry — it looks like a shading bug rather than a
matrix one. (These nodes carry no shear or non-uniform scale, so
the inverse-transpose the general case wants is the same matrix.)

<a id="test-header"></a>

## xr-glb-test.mjs, file header

demo/shell/xr-glb-test.mjs — the controller models, read with no browser.

  node demo/shell/xr-glb-test.mjs

🔴 THE READER IS THE HALF A HEADSET CANNOT GRADE. A model that parses into
the wrong triangles draws a shape, and a shape in a headset looks like a
shape — this is `mirror`'s "ask the picture the right question" one level
earlier. Here the question is asked of the bytes, against the real vendored
files, with the answers checked for things a wrong parse cannot produce: a
bounding box the size of a real controller, a surface that is actually
closed, normals that are unit length, and texture coordinates inside 0..1.

⚠️ AND FIVE OF THESE ARE NEGATIVE CONTROLS built by CORRUPTING the real file,
because `readGLB` exists to REFUSE what it cannot read and a refusal nobody
has seen refuse is a hope. Each one breaks a different clause.

<a id="test-size"></a>

## xr-glb-test.mjs, controller size

🔴 IS IT THE SIZE OF A CONTROLLER? A parse that reads the right number of
floats out of the wrong offsets still produces a cloud of points; what it
cannot produce is a cloud 10-25 cm across. This is the assert that would
catch a stride or endianness mistake, and nothing else here would.

<a id="test-two-hands"></a>

## xr-glb-test.mjs, the two hands

🔴 THE TWO HANDS ARE DIFFERENT MODELS, and it is worth one line: a loader
that keyed both hands to one file would look completely correct in a headset
held in one hand, and be a mirror-image controller in the other.

<a id="test-chunk-length"></a>

## xr-glb-test.mjs, the chunk length case

🔴 THE BUG three.js FOUND, PROVED. This reader used to round each chunk
length up to the next multiple of four before advancing — a SECOND padding,
on top of the one the spec already requires — which would have walked past
the binary chunk of any file whose JSON chunk was not 4-aligned. Both
vendored files happen to be aligned at 10,768 bytes, so every other case
here passed while it was wrong. It now advances by exactly the length and
refuses an unaligned one, and this is the case that says so.
