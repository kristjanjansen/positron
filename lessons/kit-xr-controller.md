# Kit lessons: xr-controller.mjs

The long comments cut from `demo/shell/xr-controller.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-controller.md#<anchor>`.

<a id="header"></a>

## xr-controller.mjs, file header

demo/shell/xr-controller.mjs — your actual controllers, drawn from their own
models, for a page that does NOT stand in `xr-room.mjs`'s room.

  const cons = createXRControllers(gl, { log, say });
  cons.want(profile, handedness);          // once, when a source appears
  cons.draw({ vp, grip, profile, handedness });   // per hand, per eye

🔴 WHY THIS IS NOT JUST A CALL INTO `xr-room.mjs`. That module already loads
and draws these models, and it is where they were written — but it draws them
as one step inside a whole renderer: it owns the sky, the walls, the dotted
grid, the tablet and its own box program, and a page gets all of that or none
of it. `floor` is a page with its own instanced tile shader and its own frame
loop; standing it in a room to borrow a controller would mean adopting a
second renderer to draw two hands.

So the MODEL LOADING is the shared thing and it is shared properly: the
vendored `.glb` files, `readGLB`, and the profile naming all come from where
they already are. What is new here is ~90 lines of program and draw call.

⚠️ IT DRAWS ONLY WHAT THE RUNTIME ANSWERED FOR. There is no stand-in here and
that is deliberate rather than missing: `xr-room.mjs`'s lathe exists because
that page puts a tablet on the controller and needs something to hang it off.
A page that just wants to see its hands should show the real thing or show
nothing, because a shape that is nearly a controller is worse than no shape —
it is a confident picture of the wrong object.

<a id="ctrl-tint"></a>

## xr-controller.mjs, CTRL_TINT

Greyed, and OPAQUE.
⚠️ MONOCHROME BECAUSE THE PAGE IS. `floor` is 1965 newsreel and everything
on it goes through one luma; a controller arriving in its vendor's plastic
grey-blue would be the only coloured object in the archive. The model's
texture is kept — it is where the buttons and the seams are — and collapsed
to luminance rather than thrown away.
🔴 AND IT WAS SEE-THROUGH FOR ONE VERSION, WHICH WAS WRONG. The idea was
that your hands should not hide the archive. What it actually does is stop
them being objects: a translucent controller shows its own far side through
its near side, so the shape reads as a smear rather than as a thing you are
holding — and it cannot write depth without punching a hand-shaped hole in
what is behind it, so it has no honest way to sit in front of the floor. A
real object in your hand is the one thing in a headset that does not need
softening.

<a id="want"></a>

## xr-controller.mjs, want

Ask for a hand's model. Safe to call every frame — the first call starts
the fetch and every later one is a Map lookup.

⚠️ NOTHING IS AWAITED ANYWHERE NEAR A SESSION'S ENTRY PATH. The model
arrives in whatever frame it arrives in and is drawn from the next one; a
page that waited for 218 KiB before its first frame would be a black
headset for as long as the network felt like taking.

<a id="draw"></a>

## xr-controller.mjs, draw

@param vp     the view-projection for THIS eye
@param grip   the gripSpace pose, in the same space as `vp`

⚠️ GRIP, NOT TARGET RAY. The ray is where you are POINTING and the grip
is where your HAND is; they differ by the controller's forward tilt, and
a model drawn at the ray sits visibly wrong in the fist.
