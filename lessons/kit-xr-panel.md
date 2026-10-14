# Kit lessons: xr-panel.mjs

The long comments cut from `demo/shell/xr-panel.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-panel.md#<anchor>`.

<a id="touch"></a>

## xr-panel.mjs, `TOUCH`, one look for the ray being on something

🔴 ONE LOOK FOR "THE RAY IS ON THIS", EVERYWHERE.

A room with a highlight per page is a room where you learn the highlight
again in every corner. This is the whole rule, and both `scene`'s things and
an XR panel take it from here rather than each inventing one:

 aimed   the ray is on it            brighter, and very slightly bigger
 held    you have hold of it         brighter still, and bigger still

⚠️ SIZE AS WELL AS BRIGHTNESS, and the size is the half that matters in a
headset. Brightness alone is a poor signal there — the panel is emissive, the
room around it is not, and a 35% lift reads as "that one happens to be pale"
rather than "that one is under your pointer". A thing that grows when you
point at it is unambiguous at any brightness, and it survives being looked at
from an angle, which a specular highlight does not.

⚠️ AND IT IS NOT A COLOUR CHANGE. In this project colour says HOW SOMETHING
LANDED; a hue that also means "you are pointing at it" is two meanings on one
channel, which is the rule a focus ring already broke here once (LESSONS #43).

<a id="header"></a>

## xr-panel.mjs, file header and the five WebXR traps

demo/shell/xr-panel.mjs — panel.mjs canvases, hung in front of you in a
headset, with the frame rate measured while you are standing in them.

`plans/plan-xr-room.md` §4.1 is the whole job: "One panel, one transport, measured.
Video→texture cost and fps against the known 89.8. No audio. Answers the
question the other seven panels depend on." This is the piece that enters the
session and draws the panel; the page supplies the picture.

🔴 THIS IS demo/scene's ENTRY PATH, EXTRACTED — NOT A SECOND ONE. Every rule
below was paid for on a real Quest and every one of them is in CLAUDE.md. A
hand-rolled copy in a second page is the "fourth copy" mistake with the most
expensive code in the repo, so the traps live here, once:

  1. `session.renderState.baseLayer` IS NULL until the next animation frame.
     `updateRenderState()` queues; it does not apply. Reading
     `baseLayer.framebufferWidth` one line after `requestSession` throws a
     TypeError, the throw escapes the handler, and the render loop, the
     exit-on-button AND the bail-out timer are all never registered — a live
     session, nothing drawing, no way out. The layer is read INSIDE the frame
     callback, where it exists.
  2. `alpha: false` MAKES PASSTHROUGH IMPOSSIBLE. The compositor puts the
     real room behind the page and can only do it through transparent
     pixels. This module creates its own context so no page can get that
     attribute wrong — the defect is unrepresentable rather than documented.
  3. `gl.clear` IGNORES THE VIEWPORT. Both eyes share ONE framebuffer, so a
     clear on the second view wipes what the first drew. Only the first view
     clears colour; the rest clear DEPTH inside a `gl.scissor`, or the second
     eye tests against the first eye's depths.
  4. `bindAttribLocation` ONLY TAKES EFFECT AT THE NEXT LINK. Called after
     `linkProgram` it is a no-op that reads like a fix — a Quest reported
     GL_INVALID_OPERATION (1282) for it and DREW CORRECTLY ANYWAY, because
     the linker happened to pick the same slot. So it is called before the
     link and `gl.getError()` is read on the first frame and published.
  5. THE WAY OUT COMES WITH THE SESSION. A long hold on ANY controller button
     ends it, with a ring filling in front of you while you hold
     (`xr-quit.mjs`) — plus a dead-man's switch that ends it if nothing has
     been drawn after 4 s. "Press the Meta button" is not an answer a page
     gets to give about its own bug.
     🔴 AND SINCE 2026-09-19 IT IS NOT A LINE ANYBODY REMEMBERS TO WRITE.
     `mountXRQuit(gl, session)` puts the hold on the session's own frame
     loop, so no file advances it and no file can fail to. `/blocks/` built
     the badge, drew it every frame and never advanced it, and there was no
     way out of that page at all.
     ⚠️ THE TWO ARE NOT THE SAME THING AND ONLY ONE IS AN EXIT. The hold is
     for a person who wants out; the dead-man's switch is for a page that has
     stopped being able to offer one. 2026-09-17 removed every OTHER exit
     here — the grip, and the tablet's own button — and deliberately kept
     that guard, because without it a throw in the entry path leaves a live
     session with nothing drawing, no way out and no log line.

⚠️ AND THE LINES THAT SAY WHERE IT HUNG CANNOT BE ON A BATCHED SHIPPER.
`createShipper` holds for 2 s and entering an immersive session is exactly
when timers stop being generous — measured on a Quest 3: every flat assert
arrived, then the press, then nothing at all. `navigator.sendBeacon` survives
it, so `beacon()` below is what the entry path uses.

⚠️ demo/scene STILL CARRIES ITS OWN SESSION and was deliberately left alone.
It is the page a real headset has already graded, its session holds a
controller ray and grab-and-move, and moving it onto this module is a change
only a device can re-grade. Do that on a day with a Quest to hand. What the
two DO now share is the PICTURE: demo/shell/xr-room.mjs draws the room for
both, so a panel hanging here hangs in the same room `scene` shows.

<a id="pick-quad"></a>

## xr-panel.mjs, import of `pickQuad`

⚠️ READ, NEVER WRITTEN, AND THAT IS THE POINT. `xr-pick.mjs` is the ONE
ray-to-rectangle answer in this repo — `xr-hands.mjs` already asks it where
the ray meets the tablet, and a second copy here would be two truths about
one pointer, which is the shape of bug nobody can see from inside a
working-looking picture. The panels' grab bars ask the same function.

<a id="beacon"></a>

## xr-panel.mjs, `beacon()`

A line that must arrive even if the event loop is about to be throttled.

⚠️ ONLY FROM A BROWSER THAT IS ABOUT TO ENTER A SESSION, which in practice
means a headset. Posting from every desktop visitor would put somebody else's
traffic in our diagnostics and is nobody's idea of consent — the same gate
`scene` uses. `?report=0` turns it off anywhere.

<a id="supported"></a>

## xr-panel.mjs, `supported`, the immersive-vr probe

⚠️ TAKEN ONCE, AT LOAD, AWAY FROM ANY GESTURE. `requestSession` needs a
TRANSIENT user activation and awaiting anything first can spend it — which is
why `enter()` below reads this cached answer and never asks afresh. It starts
as `null`, which means "we have not looked yet" and is a third answer, not a
polite false (demo/shell/caps.mjs makes the same distinction).

<a id="supported-ar"></a>

## xr-panel.mjs, `supportedAr`, the immersive-ar probe

⚠️ PASSTHROUGH IS ITS OWN QUESTION AND IT IS ASKED SEPARATELY. A headset that
does VR need not do AR, and answering the second from the first would be a
page claiming a capability it never probed. Same three-state rule: `null`
means we have not been told yet, which never reads as "no".

<a id="panel-fs"></a>

## xr-panel.mjs, `PANEL_FS`, two samplers

🔴 TWO SAMPLERS, BECAUSE A PANEL DRAWN BY THE GRAPHICS CARD HAS NO TEXT IN
IT. A panel here is a picture with a footer of real numbers under it — that
is the whole design in `panel.mjs` — and a picture that is rendered live in
this session's own context is a framebuffer, which cannot carry a word. So
the quad samples the picture above `uFoot` and a small canvas of numbers
below it. `uFoot` is 0 for a panel whose canvas already has its footer drawn
into it, and then the second sampler is never reached.

<a id="bar-fs"></a>

## xr-panel.mjs, `BAR_FS`, the grab bar

🔴 THE GRAB BAR, AND WHY THE WHOLE PANEL IS NOT THE HANDLE.

Asked for as "what the Meta lobby does with screens": a bar along one edge is
what you take hold of, and the surface stays a surface. Two reasons it has to
be that way here rather than "press anywhere on the picture":

 1. The picture is the thing this page exists to be looked at, and on
    `mirror` it is a picture somebody may later want to POINT at. A surface
    that jumps into your hand when you aim at it cannot also be aimed at.
 2. The right-hand ray already drives the tablet's slider. One ray with two
    meanings is how a press ends up doing two things, one of which you did
    not ask for — the same collision `selectstart` already has a guard for.

Drawn as a rounded capsule from a signed distance, the same trick the tablet
and the floor use, so it is exact at any distance from the eye.

<a id="place-facing"></a>

## xr-panel.mjs, `placeFacing()`

Where a panel hangs: `dist` metres in front of where you were looking when
the session started, at eye height, turned to face you.

⚠️ PLACED ONCE, IN THE ROOM — not head-locked. A panel that follows your face
cannot be looked away from, and looking away is the whole of the gaze-gating
in `plans/plan-xr-room.md` §2. It is worth getting right now rather than rebuilding
when that arrives.

Built by hand rather than by multiplying matrices: the quad's local +Z must
point back at your head and its local +Y must stay world-up, which is three
columns of a rotation anybody can check by eye.

<a id="facing"></a>

## xr-panel.mjs, `facing()`, both axes

The same quad, at a centre somebody else chose, turned to face a head.

🔴 BOTH AXES SINCE 2026-09-17, AND IT WAS YAW ONLY. Instructed: *"make them
always look at me not only horiz but also vertic"*. The old rule and its
reason are kept here because the reason was a real one and it lost on a
measurement nobody had: it said a panel that tips to meet a head looking down
from above reads as FALLING OVER, because a picture on a stand does not lean
back when you stand up. That is true of a picture standing on a floor. These
panels hang in mid-air at head height and can be pushed to 3 m up or pulled
to 0.45 m off the ground by the thumbstick, and at either of those a
world-upright rectangle is a plane you are reading at an angle — the text in
its footer keystones and the picture foreshortens. A thing hanging in the air
has no floor to be upright against.

⚠️ IT IS STILL A ROTATION AND NEVER A SKEW. The three columns are an
orthonormal basis built from one direction, so the quad stays a rectangle and
`pickQuad` — which reads exactly these columns — keeps answering about the
shape that is drawn.

⚠️ AND THE ROLL IS PINNED TO WORLD UP, WHICH IS THE HALF THAT MUST NOT
FOLLOW THE HEAD. Tilt your head sideways and a panel that matched it would
rotate in your view and stay rotated when you straighten up. `right` is
perpendicular to world up, so the panel's horizon is the room's.

🔴 AND IT IS AIMED AT THE HEAD, NOT AT THE CONTROLLER THAT PLACED IT. The
viewer is the head; aiming at the hand points the panel at your own wrist.

<a id="bar-of"></a>

## xr-panel.mjs, `barOf()`

The grab bar's own quad, hanging under a panel in the panel's own plane.

Its columns are built the same way a panel's are — first column right times
width, second up times height, third the normal, fourth the centre — which is
exactly what `pickQuad` reads, so the thing that is drawn and the thing the
ray is tested against are one matrix rather than two descriptions of one.

<a id="bar-of-up"></a>

## xr-panel.mjs, `barOf()`, the panel's own up

🔴 THE PANEL'S OWN UP, NOT WORLD UP — AND THIS BROKE THE MOMENT PANELS
STARTED TO PITCH. The bar used to be `(0, barH, 0)` dropped along world
−Y, which is the same thing while every panel is world-upright and is a
handle floating OUT OF the panel's plane the moment one tips: it would hang
in front of a panel tilted down at you and behind one tilted up, and
`pickQuad` would answer about a rectangle in a different plane from the one
being drawn. Both come off column 1 now, so the bar is in the picture's
plane at every angle by construction.

<a id="place"></a>

## xr-panel.mjs, `PLACE`

How a panel is picked up. Metres.

⚠️ THE BOUND IS THE INTERESTING ONE. A panel you can push six metres away and
then cannot read, or drop through the floor, is a panel you have lost — and
there is no menu in here to get it back. So the centre is clamped: never
closer than you can focus, never further than a big room, never low enough to
bury its own grab bar in the floor, never above head height plus a metre.
Everything inside that box is somewhere you can walk to and point at.

<a id="place-bar"></a>

## xr-panel.mjs, `PLACE`, the bar's three numbers

🔴 THE BAR'S THREE NUMBERS, AND IT HAS BEEN HALVED TWICE BY EYE IN A
HEADSET. Instructed 2026-09-17: *"retuce movebar size under panel 2x."*

  first guess   0.42 of the width, 45 mm tall, 22 mm clear
  2026-09-16    0.28 of the width, 32 mm tall, 38 mm clear
  2026-09-17    0.14 of the width, 16 mm tall, 30 mm clear

On the shipped 1.28 m panel that is **358 mm x 32 mm becoming 179 mm x
16 mm** — half in each direction, a quarter of the area. A handle should be
findable and unremarkable; the picture is the thing you came to look at.

⚠️ THE GAP CAME DOWN AND NOT BY HALF. It had GROWN as the bar shrank, on
the argument that a small handle sitting close reads as part of the frame
rather than as a separate thing to aim at — that argument still holds, so
38 mm of air under a 16 mm bar would be more than twice the handle's own
height and the thing would read as floating loose. 30 mm keeps it clearly
separate without setting it adrift.
⚠️ AND THE BAR IS STILL A SEPARATE GESTURE FROM THE PICTURE. That is the
whole reason it exists; making it smaller does not make it the picture.

<a id="grab-offset"></a>

## xr-panel.mjs, `grabOffset()`

Where a panel's centre sits in the CONTROLLER's own axes, at the moment it is
grabbed.

🔴 THIS IS THE WHOLE OF "GRAB WHERE THE RAY HIT, NOT THE CENTRE". Keep the
offset and the thing stays where your hand met it; keep only a distance and
it snaps to the middle of your pointer on the press, which reads as the panel
jumping away from you. The tablet's slider solves the same problem the same
way. The rotation part of a pose matrix is orthonormal, so its inverse is its
transpose and there is nothing to invert.

@param {Float32Array} M   the panel's model matrix
@param {Float32Array} m   the controller's target-ray pose matrix
@param {{x:number,y:number,z:number}} o  the ray's origin

<a id="held-at"></a>

## xr-panel.mjs, `heldAt()`

Where a held panel's centre goes this frame, bounded.

🔴 EXPORTED SO A LAPTOP CAN GRADE IT, and that is not a convenience. Nothing
about a drag can be tried without a controller in a headset, and this repo
gets one headset run — so the arithmetic lives in a pure function the page's
own checks drive with a made-up pose. ⚠️ The session calls THIS function, not
a copy of it: a test against a second implementation grades the test.

The bound is `PLACE`: never nearer than you can focus, never further than a
big room, never low enough to bury the panel's own grab bar in the floor,
never above head height plus a metre. Measured from YOUR HEAD rather than
from the origin, because you are the thing it has to stay reachable from and
you can walk.

<a id="create-xr-panels"></a>

## xr-panel.mjs, `createXRPanels()` options

@param {object} o
@param {Array<object>} o.panels  each panel's picture and its size IN METRES.
      `{ canvas }` is a 2-D canvas uploaded every frame — the original and
      still the default. `{ live }` is a renderer that draws INTO THIS
      SESSION'S OWN CONTEXT and hands back a texture, with `{ foot }` an
      optional small canvas of numbers drawn in a strip under it, because a
      framebuffer cannot carry a word. A panel may carry both, and
      `setLive()` decides which is on the quad — which is the only way to
      A/B the two paths in one session.
@param {(ctx:{frame:XRFrame, pose:XRViewerPose, session:XRSession}) => void} [o.onFrame]
      called once per animation frame, BEFORE the upload — this is where a
      page redraws its panel canvases. Once per FRAME, never per eye.
@param {() => void} [o.onEnd]
@param {(msg:string, kind?:string) => void} [o.log]
@param {number} [o.dist]  metres in front of you
@param {boolean|{seed?:number, sky?:boolean, things?:boolean, bg?:number[]}} [o.room]
      hang the panels INSIDE the room `scene` builds — the same module, the
      same seed arithmetic, the same dotted floor. `true` takes the default
      seed. `sky: false` turns the wall cube off and `things: false` empties
      the room of its objects, which together leave a floor and whatever the
      page puts in front of it — see the note by `sky` in xr-room.mjs.
@param {() => ({col:number[], amp:number}|null)} [o.glow]  the fake light the
      panels cast on the floor. Asked once a frame; see GRID_FS in
      xr-room.mjs for what it is and what it is NOT.
@param {boolean} [o.live]  start with the live renderers on the quads
@returns {object}

<a id="surface"></a>

## xr-panel.mjs, `surface` option

🔴 SOMETHING THE PAGE DRAWS ON THE GROUND, IN THIS SESSION'S CONTEXT.

`{ attach(gl), draw({ proj, view, eye, tSec, bg }), detach?() }`. It is
attached once when the context is built and drawn once per eye, after the
room and before the panels, because it is the ground the panels stand over.

⚠️ THIS EXISTS SO THERE IS NOT A FOURTH SESSION PATH. `blocks`, `floor` and
this module already each own one, and every one of the five WebXR defects
at the top of this file is silent from outside: a page that writes its own
`requestSession` inherits none of the fixes and none of the ways out. What
a page owns here is its picture and nothing else.

⚠️ AND IT IS HANDED `bg`, WHICH IS THE COLOUR THE FRAME WAS CLEARED TO.
A surface that fades at its edges has to fade INTO something, and if it
picks that colour itself the two drift: `demo/floor/index.html:154-168`
records a visibly brighter disc on a darker void, a rim nobody drew, at
exactly the radius the fade was meant to hide, because the fade target and
the clear colour were typed twice and were out by nearly a factor of two.
One triple, passed in.

⚠️ IT IS ALLOWED TO FAIL ON ITS OWN, like the grab bars and the room's
grid. A driver that will not compile it costs the picture on the floor,
never the session and never the way out.

<a id="the-quit"></a>

## xr-panel.mjs, `theQuit`, the way out

🔴 THE WAY OUT IS A HOLD, AND THE BUTTON WAS NEVER THE POINT. This page once
exited on a TAP of whatever button happened to be pressed, so you left it by
accident while reaching for something and it gave no warning. It then exited
on one NAMED button, held, which fixed the accident and asked somebody
wearing a headset to find a particular button by feel. Since 2026-09-17 it
is ANY button, HELD, with a ring in front of you filling while you hold:
nothing is reachable by accident and there is nothing to be told.
⚠️ THE RING CAME OFF THE CONTROLLERS ON 2026-09-19 and is head locked now,
and the hold is advanced by the session rather than by this file. See the
header of `xr-quit.mjs` for the argument that lost.

<a id="ensure-quit"></a>

## xr-panel.mjs, `ensureQuit()`

🔴 BUILT ON FIRST DRAW, IN EITHER PATH, AND THAT IS WHAT LETS A LAPTOP
GRADE IT. Built inside `requestSession` it is reached for the first time on
the first frame of a headset session, where a shader that will not compile
costs the one run somebody was going to make and the page has no way out at
the moment it needs one most. It is the same argument the tablet's own note
makes two hundred lines down, and WebXR draws through this very context, so
there is no second context to worry about.

⚠️ IT MUST NOT THROW INTO THE CALLER. A badge that will not compile is a
page with an uglier way out; a throw here is a page with none, because an
uncaught error in a frame callback deletes everything below it.

🔴 CALLED TWICE, WITH AND WITHOUT A SESSION, AND THE SECOND ONE IS THE REAL
EXIT. 2026-09-19 moved the hold behind the session's own frame loop, so
`mountXRQuit` wants the session and nothing else advances it. `build()`
still asks for one with no session, which compiles the shader on a laptop
and reports `driven: false`; the entry path asks again with the session and
gets an exit that drives itself. The compile-only one is thrown away at
that point, because two badges is two programs.

<a id="ensure-quit-armed"></a>

## xr-panel.mjs, `ensureQuit()`, no `armed` guard

🔴 NO `armed` GUARD HERE ANY MORE, AND IT DID NOT GO MISSING.
The press that opened this page's own button may still be down as the
session starts, and with every button live it IS one of the buttons
the hold counts. That guard is now inside `xr-quit.mjs` for every
page at once: the hold arms on the first frame with nothing pressed,
or after three seconds regardless so a stuck button cannot trap
somebody. This page's own `armed` flag still gates the trigger and
the thumbstick, which is what it was also for.
⚠️ AND THIS DOES NOT END THE SESSION. The module does that itself,
after this returns, which is the line that went missing from
`/blocks/` and left a page with no way out.

<a id="ensure-quit-prepare"></a>

## xr-panel.mjs, `ensureQuit()`, compiled here

⚠️ COMPILED HERE, NOT ON THE FIRST DRAW. The object is lazy, so having
one proves nothing about its shader, and the check below would pass on
a badge that cannot be drawn. PROVED by sabotage: with `compile` made to
throw, the assert stayed green until this line existed.

<a id="live-on"></a>

## xr-panel.mjs, `liveOn`

Whether the live renderers are the ones on the quads. The A/B this page
exists to measure is a single boolean, so it is one.
⚠️ AND ONLY WHERE THERE IS SOMETHING TO BE LIVE. `state.live` saying true
about a page with no live renderer would be the page reporting a mode it
is not in.

<a id="room"></a>

## xr-panel.mjs, the room the panels hang in

── the room the panels hang in ────────────────────────────────────────
🔴 A PANEL IN NOTHING IS NOT A PLACE. Before this, an immersive session
here was one rectangle in a black void — no floor, no scale, nothing to
judge the panel's distance against — and `scene` had a whole room sitting
in one page nobody else could use. It is one module now, so the room this
draws is byte for byte the room `scene` rolls.

⚠️ THE DOCUMENT IS BUILT AT LOAD, THE CONTEXT IS NOT. The room is four
bytes of seed and some arithmetic, so it can be built and CHECKED on a
laptop with no headset — but a WebGL2 context for every desktop visitor who
will never press the button is a cost with nothing on the other side of it.
`attach()` happens on the way into a session.

<a id="want-grid"></a>

## xr-panel.mjs, `grid: false`

🔴 `grid: false` HIDES THE DOTTED FLOOR AND KEEPS THE ROOM.

A page that draws its OWN ground has two floors: reported on
`/videoradio/`, whose sea is 46 wave fronts standing on a plane that the
room was also dotting. `room: null` is the wrong answer and CLAUDE.md says
why: the tablet and the hands are built only when there is a room, so a
page with none loses the pointer and the slab. It no longer loses the way
out, which is head locked and reads the session directly since 2026-09-19.
This takes the dots to zero alpha and leaves everything that gets you home.

<a id="want-hands"></a>

## xr-panel.mjs, `hands: false` and the default

🔴 `hands: false` DRAWS NO CONTROLLER AND KEEPS EVERY POSE.

Asked for on `/videoradio/`, which is a sea you stand in: *"rm dotted floor
and controlers from vr videoradio"*. A page whose whole subject is the
water has a pair of plastic Touch controllers floating in it.

⚠️ IT STRIPS THE MODELS, NOT THE INPUT. `pointer`, `tabletM` and the hit
test all still arrive, so the ray still points and the tablet still hangs.
The quit badge is not affected by any of this since 2026-09-19: it is head
locked and it reads its own controllers off the session, so it draws and
fires with nothing else in the picture.
🔴 AND THE DEFAULT IS NOW OFF. 2026-09-17: *"rm controller
geometry/tablet on all (only if i am ask on specific demo so keep that code
ready to pop into scene)"*. It was `!== false`, so every page got plastic
controllers unless it said otherwise; it is `=== true` now, so a page gets
them only by asking. The drawing code is untouched and lives where it
always did — `GRIP_PARTS` and `loadModel` in `demo/shell/xr-room.mjs`, and
the stand-in meshes in `demo/shell/xr-controller.mjs` — so putting them
back into one scene is `hands: true` and nothing else.

<a id="want-tablet"></a>

## xr-panel.mjs, `tablet: false` and the default

🔴 `tablet: false` TAKES THE SLAB OFF THE LEFT HAND TOO.
`hands: false` stopped the controller models and the tablet stayed, because
it hangs on a matrix that is input rather than a model: reported as
*"videoradio vr: still has left controller and tablet"* — the thing still
in the left hand WAS the tablet.
⚠️ THE WAY OUT SURVIVES. `xr-quit.mjs`'s ring is head locked and its hold
is advanced by the session, so it draws and fires with nothing else in the
picture at all. A page that takes the tablet away has one visible exit
instead of two, which is why this is a switch a page asks for rather than
the default.
🔴 OFF BY DEFAULT TOO, SAME INSTRUCTION, SAME DAY. The slab and its slider
are kept whole in `demo/shell/xr-tablet.mjs` and are one `tablet: true`
away from being back in a scene.
🔴 AND NEVER IN PASSTHROUGH, WHATEVER A PAGE ASKS FOR. 2026-09-17: *"slider
is ok. but again, do not show it on any vr/xr when showing ar scenes"*.
The test is `arMode`, which is read off `environmentBlendMode` and NOT off
the session's name — CLAUDE.md records that a session can be called
`immersive-ar` and still composite `opaque`, and gating on the name would
hide the tablet in a session that is drawing an opaque room.

<a id="drawn-doc"></a>

## xr-panel.mjs, `drawnDoc`

⚠️ THE DOCUMENT IS STILL ROLLED FROM THE SEED EVEN WHEN NOTHING IS DRAWN
FROM IT, because `hue` comes out of it and because "the room is a function
of four bytes" is the claim, not "the room has boxes in it". What a page
asked to SEE is a separate question and it is answered here.

<a id="controllers"></a>

## xr-panel.mjs, the controllers, the pointer and the tablet

── the controllers, the pointer and the tablet ────────────────────────
🔴 THE SAME ONES `scene` HAS, FROM THE SAME TWO MODULES. A page that stands
in this room gets the room's controller interface too — the stand-ins, the
beam from the right hand's target ray, and the tablet on the left with its
slider on it. Building a second one here is the "fourth copy" mistake with
the most expensive code in the repo, and it would be the copy that drifts.

⚠️ BUILT ONLY WHERE THERE IS A ROOM TO PUT IT IN. A page that asked for no
room is a page hanging one rectangle in an empty session, and a tablet in
a void is a thing with nothing to be near.

<a id="set-tablet"></a>

## xr-panel.mjs, `setTablet` where not shown

⚠️ THE ROOM IS GIVEN THE TABLET EVEN WHERE IT IS NOT SHOWN. `setTablet` is
what uploads its face when the version moves; whether the slab is DRAWN is
`tabletM`, and `setInput` below nulls that unless the page asked for it and
this is not a passthrough session. `applyAll()` is what puts the floor dots
at the strength the slider declares rather than at a default, so it has to
run whether anybody can see the slider or not.

<a id="gl-check"></a>

## xr-panel.mjs, `glCheck()`, per phase

🔴 WHICH CALL, NOT WHETHER. `gl.getError()` returns the FIRST error since
the LAST call and clears the flag — so one read on the first frame covers
everything from context creation onward and can name nothing. A Quest
reported `1282` (GL_INVALID_OPERATION) that way and it stayed unlocated
because the reading was a yes/no about a whole session's worth of calls.

This checks after each PHASE and keeps the first phase that was dirty, so
the next device run says where. It runs during setup and on the first frame
only — `getError` is a synchronous stall and calling it per frame would be
measuring the instrument.
🔴 AND THE IN-FRAME PHASES WERE DEAD CODE UNTIL 2026-09-13. Every one of
them was guarded on `state.frames === 0` and the counter is incremented at
the TOP of the frame callback, so `upload`, `footer` and `bindFramebuffer`
could never be reached — the file promised "the next device run says where"
and the only phase that could ever answer was `firstDraw`. That is exactly
the shape of the open `1282`: a per-phase attribution that was not running.
A guard that cannot fire is worse than no guard, because the page reads as
instrumented.

<a id="gpu-begin"></a>

## xr-panel.mjs, `gpuBegin()`

Time one pass on the CARD. ⚠️ Nothing here may throw inside a frame
callback — an uncaught error there does not stop the loop, it silently
deletes everything below it.

<a id="gpu-disjoint"></a>

## xr-panel.mjs, `gpuPoll()`, disjoint results

⚠️ A DISJOINT RESULT IS NOT A SLOW ONE, IT IS A MEANINGLESS ONE — the
driver is telling you the clock moved under the measurement. Kept out
of the sample rather than averaged in, because one absurd figure in a
median of eight is exactly the kind of number that gets quoted.

<a id="verdict-on-cost"></a>

## xr-panel.mjs, `verdictOnCost()`

🔴 WHERE THE COST LANDS, AS A SENTENCE, FROM TWO MEASUREMENTS. "It is
slower" is not actionable; "it is fragment-bound at this resolution" says
the next thing to try. Half the pixels at about half the time is the
fragment case; half the pixels at about the same time means the cost is in
issuing the pass and resolution is the wrong lever.

<a id="verdict-n"></a>

## xr-panel.mjs, `verdictOnCost()`, the sample count

⚠️ THE SAMPLE COUNTS, BECAUSE THE RATIO IS A MEDIAN OF A FEW AND IT
MOVES. Three runs of the same preview on one laptop gave 0.69, 0.84 and
0.86 — a verdict quoted without its n invites somebody to treat the first
of those as a fact.

<a id="verdict-spread"></a>

## xr-panel.mjs, `verdictOnCost()`, the instrument's spread

🔴 CHECK THE INSTRUMENT BEFORE BELIEVING THE PATTERN. MEASURED on this
laptop: the same preview, run four times with no code between, answered
0.24x, 0.72x, 0.73x and 0.82x — and the confident sentence below would
have called the first FRAGMENT-bound and the last not, from one run each.
A GPU timer is a driver's estimate of a span it is free to reorder, so
when its own samples disagree with themselves the only honest verdict is
that this device cannot answer.

<a id="grabbing"></a>

## xr-panel.mjs, `grabbing`

What the trigger has hold of.

🔴 THE OFFSET IS TAKEN IN THE CONTROLLER'S OWN FRAME, WHICH IS THE WHOLE OF
"grab where the ray hit, not the centre". `local` is the vector from the
ray's origin to the panel's centre AT THE MOMENT OF THE GRAB, written in
the ray's axes; every frame after that the centre is put back at
`origin + R_now · local`. So a panel taken by the corner of its bar stays
offset by exactly that corner, and nothing jumps on the press. Storing a
distance alone is what makes a panel snap to the middle of your pointer.

<a id="stopwatch"></a>

## xr-panel.mjs, the card's own stopwatch

── the card's own stopwatch ───────────────────────────────────────────
One TIME_ELAPSED query may be in flight at a time, so this is a one-slot
queue: a frame that finds the slot busy simply does not time itself, which
costs a sample and never a stall.

<a id="set-live"></a>

## xr-panel.mjs, `setLive()`

Swap the panels between the live renderers and the uploaded canvases.

⚠️ IT SAYS SO ON THE BEACON EVERY TIME. The whole value of the switch is
that a headset run can hold the two side by side afterwards, and a run
whose log does not say which path each second was drawn with cannot.

<a id="state"></a>

## xr-panel.mjs, `state`

Everything a harness or a report can read. `frames` and `fps` are counted
by THIS PAGE — printed beside, never averaged with, whatever the
compositor says, because the two are counted on opposite sides of the wire
and a mean of them hides the case worth catching.

<a id="state-frame-rate"></a>

## xr-panel.mjs, `state.frameRate`

⚠️ WHAT THE HEADSET PROMISES, so `fps` can be graded against the rate
this device actually runs at rather than against a number typed by
somebody who had a different one. CLAUDE.md measured that a Quest 3
reports NO `frameRate`, which is why the list beside it is read too and
why both are published even when they come back empty: "we asked and it
would not say" is a finding, and it is not the same as not asking.

<a id="state-surface"></a>

## xr-panel.mjs, `state.surface`

The page's own floor: whether it attached, and why not when it did not.
⚠️ `null` MEANS NONE WAS OFFERED, which is not the same as one that
refused. A check that cannot tell those apart passes on a page that
forgot to pass a surface at all.

<a id="state-cpu"></a>

## xr-panel.mjs, `state.drawCpuMs` and `uploadCpuMs`

⚠️ CPU TIME, AND IT SAYS SO. `uploadCpuMs` is how long `texImage2D` takes
on the PROCESSOR; the graphics card's own time for the copy is NOT
visible from here without a timer extension, and a number that has to be
disclaimed every time it is quoted is measured wrong. `fps` is the
load-bearing evidence; these two are the costs that would explain a bad
one. They are kept apart because they answer different questions: one is
the page drawing its picture, the other is handing that picture to the
card.

<a id="state-live"></a>

## xr-panel.mjs, `state.live` and the live costs

── what the live renderers cost ────────────────────────────────────
🔴 THREE NUMBERS BECAUSE THERE ARE THREE PLACES THE TIME CAN GO, and
"it is slower" says which of them exactly never. `liveCpuMs` is the
JavaScript side of issuing the pass; `liveGpuMs` is the card's own
time, read with EXT_disjoint_timer_query_webgl2 where the driver has
it and left NULL where it does not — "we could not measure" is a
finding and it is not the same as zero. `liveHalfGpuMs` is the same
pass at half the pixels, run once as a one-shot probe into a scratch
target nobody sees: if it comes back at about half, the cost is
FRAGMENT-bound and the lever is resolution; if it comes back at about
the same, it is per-draw and resolution will not help.

<a id="state-glow"></a>

## xr-panel.mjs, `state.glow`

🔴 THE FAKE LIGHT, PUBLISHED AS WHAT IT IS. A page that draws a glow and
reports nothing about it is asserting a physical claim with no number
under it. This is the colour and the strength actually handed to the
shader this frame, so a run can say the picture moved it.

<a id="state-grabbed"></a>

## xr-panel.mjs, `state.grabbed`

⚠️ WHERE THE PANELS ARE, IN METRES, so a run can say whether the drag
actually moved anything rather than whether the code for it exists.

<a id="state-room"></a>

## xr-panel.mjs, `state.room`

⚠️ WHERE THE PANEL IS HANGING, AND WHERE THE GRID'S FLOOR CAME FROM.
Published so one headset run answers both without anybody reading a log,
and so a laptop can still grade the half that is arithmetic. `surfaces`
is a WORD and there are six of them — see the list beside `planes` in
xr-room.mjs — because "we did not look", "we were refused", "it answered
and we could not read it" and "your room has no surfaces in it" are four
different findings, and a boolean would collapse all four into one.

<a id="state-made"></a>

## xr-panel.mjs, `state.room.made` and `things`

What the seed MADE, and what this page asked to have drawn from it.
Two numbers, because a page that hides the objects has not stopped
rolling them and the assert that used to read `things > 0` would
otherwise pass vacuously or fail for the wrong reason.

<a id="state-scenery"></a>

## xr-panel.mjs, `state.room.scenery`

Three facts about what is in the room, as a LIST rather than one
string with joins in it. This reaches a page's assert details and
so a visitor's log box, which is why it lost its middots on
2026-09-19 along with the rest of what a visitor reads.

<a id="state-ui"></a>

## xr-panel.mjs, `state.ui`

🔴 THE CONTROLLER INTERFACE, DESCRIBING ITSELF, WITH NO SESSION IN IT.
The same string `scene` publishes and beacons, out of the same modules —
so a run of this page and a run of that one, in either mode, are
comparable by eye. A difference here is a branch that should not exist.

<a id="state-supported"></a>

## xr-panel.mjs, `state.supported` getter

⚠️ A GETTER, NOT A COPY. The probe resolves after this object is built, so a
field written once here would publish `null` forever — a machine surface
saying "we never looked" about a browser that answered a second later.

<a id="state-quit"></a>

## xr-panel.mjs, `state.quit` getter

🔴 THE WAY OUT, ON THE MACHINE SURFACE. A page that cannot assert its own
exit has an exit nobody grades, and this is the one control a headset run
cannot recover from being wrong about: everything else on this page can be
got out of by leaving, and leaving is this. A getter, because the badge is
built when the session starts and this object is built at load.

<a id="state-quit-fields"></a>

## xr-panel.mjs, `state.quit` fields

⚠️ `button` IS `'any'` SINCE 2026-09-17, not an index, so a check that
asked `Number.isInteger(button)` is asking about the design that was
replaced. `holdMs` is published beside it because with every button
live the hold length is the only thing between a resting thumb and the
session ending, which makes it the number worth asserting on.
🔴 `driven` AND `frames` ARE THE TWO THE OLD SHAPE COULD NOT REPORT.
A badge that is built, compiled and drawn is what `/blocks/` had while
there was no way out of it: what was missing was anything ADVANCING the
hold. `driven` says a session is doing that and `frames` counts the
frames it has done it for, so a headset run can assert the exit is
live rather than that it exists.

<a id="alpha-true"></a>

## xr-panel.mjs, `build()`, the context

🔴 `alpha: true`, ALWAYS. See defect 2 at the top of this file.

<a id="bar-prog"></a>

## xr-panel.mjs, `build()`, the grab bar's program

The grab bar's own program. ⚠️ ALLOWED TO FAIL ON ITS OWN, like the room's
grid: a driver that will not compile a signed-distance capsule must cost
the handle, never the picture — and the page says so rather than
presenting a session with an invisible control in it.

<a id="build-surface"></a>

## xr-panel.mjs, `build()`, the page's floor

The page's floor gets the context once, here, and never a second one.
⚠️ SAME RULE AS THE BAR PROGRAM ABOVE: it may fail and the session goes on
without it, with the reason said in words rather than left as a black
floor somebody has to guess at. `attach` returning `false` is a refusal
and is treated exactly like a throw, so a surface that checks its own
capabilities does not have to invent an Error to report one.

<a id="build-gpu-timer"></a>

## xr-panel.mjs, `build()`, the GPU timer

── the card's own stopwatch ─────────────────────────────────────────
🔴 ASKED FOR BY NAME AND REPORTED WHEN IT IS NOT THERE. The one number
that says whether a live render is affordable is how long the CARD spends
on it, and CPU time cannot see that at all — GL commands are posted, not
executed. Where the driver has the extension this measures it; where it
does not, `liveGpuMs` stays NULL and `gpuTimer` says why, because a zero
here would read as "free".

<a id="build-live"></a>

## xr-panel.mjs, `build()`, live renderers

🔴 THE LIVE RENDERERS COMPILE INTO THIS CONTEXT, WHICH IS THE WHOLE
POINT. A page's own WebGL canvas is a DIFFERENT context: its programs and
its textures do not exist here, so "the shader is already compiled" is
false and a panel drawn from it can only ever arrive as a copied bitmap.
Handing the session's own `gl` to the page's renderer is what makes the
picture in the headset a render rather than a photograph of one.

<a id="build-quit"></a>

## xr-panel.mjs, `build()`, the way out compiles here

🔴 THE WAY OUT COMPILES HERE, WITH EVERYTHING ELSE. `build()` is where
this module's context comes into existence, so it is the earliest moment
the badge CAN be made, and making it here is what lets a laptop grade it
rather than a headset discovering the shader is broken at the moment
somebody needs to leave. Tried at construction first and it could not
work: `gl` is null until this function runs, and the swallowed error said
so only after `ensure` was made to report one.

<a id="enter"></a>

## xr-panel.mjs, `enter()`

@param {'immersive-vr'|'immersive-ar'} [mode]

🔴 ONE ENTRY PATH, TWO MODES, AND THE SECOND IS ALMOST FREE *HERE* — which
is not the same as saying the two look alike. Every trap this file was
written for is about getting INTO a session and none of them is about which
kind, so the request line is the only branch. What genuinely differs is
three things, all of them downstream: the clear is transparent so the
compositor can put your room behind the page (`ar` in `theRoom.draw`), the
wall cube is not drawn, and **planes only arrive in an AR session** —
measured on a Quest 3, 11 surfaces against none, same room and same grant.

<a id="enter-no-await"></a>

## xr-panel.mjs, `enter()`, no await before `requestSession`

🔴 NO AWAIT BEFORE `requestSession`. The support answer is the one already
taken at load; asking again here can spend the user activation, and a
handler that throws where nothing is reporting is what produced a run
with no asserts at all on a real Quest.

<a id="enter-step"></a>

## xr-panel.mjs, `enter()`, a deadline on every step

⚠️ A DEADLINE ON EVERY STEP. A rejected promise reports itself; one that
never settles does not, and that is what two headset runs looked like
from outside — a session somebody was standing in, with no line saying
which await had not come back.
🔴 AND 6 s IS NOT A DEADLINE FOR A STEP THAT CAN ASK A HUMAN A QUESTION.
MEASURED on a Quest 3, 2026-09-13, on the page that shares this room:
`requestSession` did not hang — it was waiting for the owner to answer a
ROOM-DATA PERMISSION PROMPT, which appears because this session asks for
plane detection. The short deadline fired underneath it, the page
declared failure and tore its own entry path down, and THEN the session
started: a headset standing in an immersive session that no code owned,
drawing nothing. Black, and a restart to get out.

⚠️ THIS MODULE STILL HAD THE 6 s. `scene` was fixed and this was not, and
the two ask for the same optional feature — so the same black headset was
one permission prompt away on `mirror`. A step that can prompt gets a
human's worth of time and says what it is probably waiting for;
everything after the session is machinery and keeps the short one.

<a id="enter-features"></a>

## xr-panel.mjs, `enter()`, the requested features

⚠️ `local-floor` IS REQUIRED, not optional: the panel hangs at eye
height measured from the floor, and on `local` the origin is wherever
your head happened to be when the session started.
🔴 `plane-detection` IS OPTIONAL AND IT MUST STAY OPTIONAL. It is what
lets the dotted grid lie on the floor you are actually standing on
rather than on the page's guess at one — but a headset whose owner has
never run Space Setup, or who says no to the permission, must still get
a room. In `requiredFeatures` this line would turn "I have not mapped
my house" into "this page refuses to start", and the grid would be
gated on a thing it is not allowed to be gated on.
⚠️ AND THE PROMISE IS KEPT, NOT ABANDONED. If the deadline wins, the
request is still in flight — and a session that arrives after the page
has given up is a headset in an immersive session nothing is drawing.
It is caught and ENDED, so the worst case is "it did not start" rather
than a black room and a restart.

<a id="enter-90s"></a>

## xr-panel.mjs, `enter()`, 90 s

🔴 90 s, BECAUSE THIS ONE ASKS YOU A QUESTION. See `step`.

<a id="enter-mark-asked"></a>

## xr-panel.mjs, `enter()`, `markAsked`

⚠️ The blend mode, not the session name — `markAsked` uses it to decide
what "no surfaces" is allowed to blame. Measured: a VR session returns
none however well the room is scanned.

<a id="enter-try"></a>

## xr-panel.mjs, `enter()`, everything inside one try

⚠️ EVERYTHING AFTER THE SESSION IS INSIDE THE SAME try. A throw from
makeXRCompatible, XRWebGLLayer or requestReferenceSpace escaping the
handler means the session STARTS and the page then dies with no line —
indistinguishable from the button never having been pressed.

🔴 AND `makeXRCompatible()` IS ONLY CALLED WHEN IT HAS SOMETHING TO DO.
The context above is created `xrCompatible: true`, so on a browser that
could honour that the call is a ritual — and it is not a free one.
MEASURED against a synthetic XRSystem on this laptop: it NEVER SETTLES,
so the 6 s deadline fired and tore down a session that was otherwise
fine. Ask the context what it already is (a capability test, the same
rule as everything else here) and only ask for the change when the
answer is no.

<a id="enter-base-layer"></a>

## xr-panel.mjs, `enter()`, nothing reads baseLayer

🔴 NOTHING READS `session.renderState.baseLayer` HERE. It is null until
the next animation frame — see defect 1 at the top of this file.

<a id="enter-ar-mode"></a>

## xr-panel.mjs, `enter()`, `arMode`

🔴 THE BLEND MODE DECIDES WHETHER TO COMPOSITE, NEVER THE SESSION'S NAME.
A session can be called `immersive-ar` and still come back `opaque`, and
then clearing to transparent puts BLACK where the room should be — which
presents as a drawing bug rather than as a session one. This is the one
place the two are separated, and everything downstream reads `arMode`.

<a id="selectstart"></a>

## xr-panel.mjs, `selectstart`

🔴 THE TRIGGER GRABS AND NOTHING HERE LEAVES. There was a `leave()` in
this scope, called from `squeezestart`, and it is gone with every other
exit on 2026-09-17: the one way out is `xr-quit.mjs`'s long hold, which
is armed by the same `armed` flag below.
🔴 A PRESS THAT LANDS ON THE TABLET BELONGS TO THE TABLET. Without this
the same trigger would move a slider AND drag the panel across the room,
two things from one press, one of which you did not ask for.
🔴 THE BAR IS THE HANDLE, NOT THE PICTURE — see the note above BAR_FS. A
press anywhere else is a press on a picture and this module lets it go
past, which is what leaves the surface free for the page to use later.

<a id="selectstart-hand"></a>

## xr-panel.mjs, `selectstart`, the pointing hand

⚠️ THE HAND THAT IS POINTING IS THE HAND THAT GRABS. `aimedBar` was
taken from the POINTER's ray — the right hand's, by the one decision in
xr-hands.mjs — so accepting a press from the other hand would drag the
thing this hand is aiming at with the hand that is not. It cannot
happen with one controller, which is what this user has; it is one line
and it stops the two-controller case being a surprise.

<a id="selectend"></a>

## xr-panel.mjs, `selectend`, the full cycle

🔴 THE FULL CYCLE, NAMED, BECAUSE THIS DRAG HAS NEVER RUN. Until the
exit scan stopped eating button 0 the trigger armed a drag and the
next frame ended the session, so "press, move, release" had no
evidence anywhere that it works. One line per completed cycle is that
evidence, and `grabbed`/`grabMovedM` are its machine copy.

<a id="dead-man"></a>

## xr-panel.mjs, the dead-man's switch

🔴 THE GRIP NO LONGER LEAVES, AND NEITHER DOES ANYTHING ELSE ON THIS
PAGE. 2026-09-17: *"make one general way to get out ... no other exit
methods/ui's for now."* `squeezestart` ended the session here, which was
an exit nothing on screen ever named and which sat next to the trigger
people drag panels with. The one way out is a long hold on any button,
with a ring at the controller saying how far it has got.
⚠️ AND A DEAD-MAN'S SWITCH. If nothing has been drawn 4 s after the
session started, the room is black and staying black: end it and say so
rather than leaving somebody standing in it.

<a id="mount-quit"></a>

## xr-panel.mjs, `ensureQuit(session)`

🔴 THE WAY OUT JOINS THE SESSION HERE, AND THIS IS THE ONE LINE THAT
MATTERS. `mountXRQuit` puts its own callback on the session's frame loop,
so the hold advances from this moment whatever happens to the render loop
below it. It is before `requestAnimationFrame(onXR)` on purpose: if the
page's own loop throws on its first frame, the exit is already running.

<a id="draw-eye"></a>

## xr-panel.mjs, `drawEye()`

ONE VIEW OF EVERYTHING THIS MODULE DRAWS.

🔴 EXTRACTED SO A LAPTOP CAN RUN IT. Every pixel below used to exist only
inside `onXR`, which needs an XRSession — so the only machine that could
ever find a pending `gl.getError()`, a shader that will not compile or a
quad drawn inside-out was a headset, on a page that gets one run. `preview`
at the bottom of this file drives this same function with a hand-made
projection into an off-screen canvas, which is how the suite reaches it.

⚠️ THE CALLER OWNS THE VIEWPORT AND THE SCISSOR, because in a session those
come out of the layer and this function has no business asking for them.

<a id="draw-eye-clear"></a>

## xr-panel.mjs, `drawEye()`, the first view clears

🔴 ONLY THE FIRST VIEW CLEARS COLOUR — defect 3. `gl.clear` ignores the
viewport and both eyes share one framebuffer, so a colour clear on the
second view wipes the first eye's picture and the headset goes black.
The room does exactly the same arithmetic when it is drawing, which is
why `clear` is handed to it rather than done twice.

<a id="draw-eye-sky"></a>

## xr-panel.mjs, `drawEye()`, walls

🔴 THE WALLS, OR NOT. In passthrough there is no sky to draw because
your room is behind the page; with `sky: false` there is none because
the page said so. The two arrive here as one picture, which is the
whole of why this module can offer both modes out of one draw call.

<a id="draw-eye-beam"></a>

## xr-panel.mjs, `drawEye()`, where the beam ends

The beam ends on the bar it is on, or on the panel it is holding —
`xr-room.mjs` already has that rule for `scene`'s things and the
tablet, and a pointer that behaves differently per page is two
pointers to learn.

<a id="draw-eye-depth"></a>

## xr-panel.mjs, `drawEye()`, panels in front of the room

⚠️ THE PANELS ARE IN FRONT OF THE ROOM, ON PURPOSE, and this one
line is what says so. A thing from the room standing between you and
the panel would hide the numbers this page exists to report — and
unlike `scene`'s things, nothing here can pick it up and move it out
of the way. Clearing depth inside this eye's scissor puts the room
behind the screen and leaves the screen readable.

<a id="draw-eye-transparent"></a>

## xr-panel.mjs, `drawEye()`, transparent in passthrough

⚠️ TRANSPARENT IN PASSTHROUGH HERE TOO. A page with no room still has
to let the compositor put your room behind it, and clearing to an
opaque colour is exactly the `alpha: false` failure one level up.

<a id="draw-eye-surface"></a>

## xr-panel.mjs, `drawEye()`, the page's floor

── the page's floor ─────────────────────────────────────────────────
🔴 AFTER THE ROOM AND BEFORE THE PANELS, because it is the GROUND: the
room's grid is under it and the panels stand over it. The room branch
above has just cleared depth inside this eye's scissor, so the floor is
never occluded by a wall, which is the whole reason it is drawn here
rather than with the room.

<a id="draw-eye-fb"></a>

## xr-panel.mjs, `drawEye()`, the framebuffer put back

🔴 THE FRAMEBUFFER IS REMEMBERED AND PUT BACK, AND THIS IS THE BUG THE
PREVIEW FOUND ON ITS FIRST RUN, ONE LEVEL UP. A page that renders its
own chain leaves ITS framebuffer bound and hands back a texture that is
that framebuffer's colour attachment; sampling it while drawing into it
is a feedback loop, which WebGL answers with GL_INVALID_OPERATION and a
frame with nothing in it. In a session the layer's framebuffer is the
one that must be bound, and it is bound long before this line.
🔴 THE LAYER'S FRAMEBUFFER BY NAME, NEVER `getParameter`. MEASURED on a
Quest the first time a page used this: `gl bindFramebuffer:1282` on the
first headset frame. An `XRWebGLLayer`'s framebuffer is OPAQUE — the
spec forbids inspecting it — so reading it back and binding what comes
out is asking the driver a question it is entitled to refuse. The
session already knows which framebuffer this frame is drawing into.
⚠️ `?? null` IS THE WINDOW CASE. `preview()` runs `drawEye` with no
session at all, where the default framebuffer is the right answer.

<a id="draw-eye-state"></a>

## xr-panel.mjs, `drawEye()`, state the panels assume

⚠️ AND THE STATE THE PANELS ASSUME. They are drawn unblended with depth
writing, and a surface that left `BLEND` on or `depthMask` off would
make them translucent for a reason nothing in their own code says. The
VAO, the program and face culling are set by the panels themselves a
few lines down, so only these two need putting back.

<a id="draw-eye-cull"></a>

## xr-panel.mjs, `drawEye()`, a screen has no back

⚠️ A SCREEN HAS NO BACK. The room turns face culling ON (it has to —
its walls are a cube seen from the inside), and a panel you can walk
behind and find gone is a panel that looks broken rather than
one-sided. Turned off again for the panels, every frame, because the
room's state is the room's business and this is the only place that
knows a quad is a screen.

<a id="draw-eye-bars"></a>

## xr-panel.mjs, `drawEye()`, the grab bars

── the grab bars ────────────────────────────────────────────────────
⚠️ AFTER the panels and BLENDED, because the capsule is transparent at
its rim. Depth WRITE off for the same reason a transparent quad never
writes depth: it would punch a hole the second eye cannot fill.

<a id="draw-eye-touch"></a>

## xr-panel.mjs, `drawEye()`, the bar's touch

ONE LOOK FOR "THE RAY IS ON THIS" — the table at the top of this
file, the same one `scene`'s things use. Brighter AND bigger,
because in a headset brightness alone reads as "that one is pale".

<a id="draw-eye-grey"></a>

## xr-panel.mjs, `drawEye()`, monochrome bar

🔴 MONOCHROME, LIGHTENING UP WHEN NEEDED. Instructed 2026-09-17:
*"make it monochrome, just lightening up when needed."* It was a
cold blue-grey at rest and YELLOW with hold of something, and the
yellow is the site's "this is the thing that is running" colour spent
on a handle. A handle has one thing to say and it is HOW IT LANDED —
nothing, the ray is on it, you have hold of it — which is three
brightnesses of one grey and needs no hue at all. It is the same
decision the pointer took on the same day, so the ray and the thing
it lands on now answer in the same channel.
⚠️ `tch.lit` IS THE SCALE AND IT IS NOT LINEAR IN THE GREY. 1.00,
1.35 and 1.80 against a 0.50 base gives 0.50, 0.68 and 0.90, which
stays inside the range rather than clipping to white at the aimed
step and having nothing left for held.

<a id="draw-eye-quit"></a>

## xr-panel.mjs, `drawEye()`, the badge last

⚠️ LAST IN THE EYE, AFTER EVERYTHING ELSE. The badge is the one thing in
here that must never be behind a panel: it is how somebody leaves, and a
way out you cannot see is the failure the module already has a dead-man's
switch for. Its own program binds what it needs and this one has finished
with the state.
🔴 THE VIEW MATRIX, NOT A LIST OF GRIPS. The ring is head locked since
2026-09-19, so where it goes comes out of the matrix this eye is already
being projected with: no hand has to be reporting a pose for there to be
a way out, which is what a session driven by tracked hands has.

<a id="on-xr-layer"></a>

## xr-panel.mjs, `onXR()`, the frame length and the layer

⚠️ HOW LONG THIS FRAME WAS IS WORKED OUT WHERE IT IS USED. There was one
here for the way out, capped at 0.1 s because a headset that stalled for
a second must not advance a hold by a second. The way out measures its
own frames now and caps them the same way, and the stick push below
keeps its own.
🔴 THE LAYER IS READ HERE, INSIDE THE CALLBACK, WHERE IT EXISTS.

<a id="on-xr-armed"></a>

## xr-panel.mjs, `onXR()`, arming

Arm the trigger and the thumbstick once every button is up, or after 3 s
regardless, so a stuck button cannot be the reason nothing on this page
works.
⚠️ THIS USED TO ARM THE WAY OUT TOO, AND THAT MOVED RATHER THAN WENT.
The press that opened this page's own button may still be down as the
session starts, and it IS one of the buttons the hold counts, so without
that guard the session would end about three seconds after it began.
`xr-quit.mjs` carries it for every page now: see ARM_MS in that file. The
flag is kept here because the trigger and the stick want the same answer.

<a id="on-xr-stick"></a>

## xr-panel.mjs, `onXR()`, the thumbstick

🔴 THE WAY OUT IS NOT READ HERE ANY MORE, AND ITS ABSENCE IS THE POINT.
There was an `ensureQuit()?.update(session.inputSources, dtSec)` on
this line, which is the line `/blocks/` never wrote: it built the
badge, drew it at both hands every frame and never advanced the hold,
so there was no way out of that page at all and no shared code was
wrong. The hold now runs on the session's own frame loop from inside
`mountXRQuit`, so there is nothing here to forget and nothing here that
can be deleted by accident.

🔴 THE THUMBSTICK IS THE A/B SWITCH AND IT IS NOT AN EXIT. The one
thing a headset run of this page has to do is compare the picture
RENDERED HERE against the same picture UPLOADED from a canvas, and a
comparison you have to take the headset off to make is not one anybody
will make. Click the stick and the panels swap path; the rate, the
card's own time and the verdict are all published and beaconed.
⚠️ It is the CLICK, and only while nothing is held: pushing the same
stick is how a held panel is pushed away and pulled back, so the two
gestures cannot collide.

<a id="on-xr-onframe"></a>

## xr-panel.mjs, `onXR()`, the page redraws once

── the page redraws its canvases, ONCE per frame ──────────────────────
⚠️ NOT PER EYE. Two views share one framebuffer and one picture; drawing
the source twice would double the cost this page exists to measure and
show the two eyes two different instants, which reads as a headache
rather than as a bug.

<a id="on-xr-upload"></a>

## xr-panel.mjs, `onXR()`, the upload

── and the panels go to the card ─────────────────────────────────────
⚠️ `texImage2D` EVERY FRAME, ON PURPOSE, because that is the cost
`plans/plan-xr-room.md` §2 asks about ("each panel is a texImage2D from a
<video> per frame — measure one panel first"). `texSubImage2D` after the
first upload would skip the reallocation and is the obvious next lever;
measure it against this number rather than instead of it.

🔴 A LIVE PANEL SKIPS ALL OF THIS, WHICH IS HALF OF WHAT IT BUYS. Its
picture is already in this context as a framebuffer's texture, so there
is no canvas, no compose and no copy across the bus — only the footer's
strip, which is a ninth of the pixels and only redrawn when a number
moves. The other half is that the picture is a RENDER rather than a
photograph of one taken a frame ago.

<a id="on-xr-live"></a>

## xr-panel.mjs, `onXR()`, the live picture

── the picture, drawn HERE, in this session's own context ────────────
🔴 ONCE PER FRAME, NEVER PER EYE. Both eyes sample one texture; rendering
it twice would double the cost this page exists to measure AND show the
two eyes two different instants, which reads as a headache rather than as
a bug. It also happens BEFORE the framebuffer is bound, because the
renderer binds one of its own and the next line takes it back.

<a id="on-xr-probe"></a>

## xr-panel.mjs, `onXR()`, the size probe

── the one-shot size probe ────────────────────────────────────────
A quarter of the pixels, into a scratch target nobody ever sees, for a
handful of frames once the session has settled. Two points is the
minimum that can say whether resolution is the lever, and a probe that
ran forever would be a cost pretending to be a measurement.

<a id="on-xr-verdict"></a>

## xr-panel.mjs, `onXR()`, the verdict once a second

⚠️ THE VERDICT IS BUILT ONCE A SECOND, NOT ONCE A FRAME. It is a sentence
with four numbers formatted into it; ninety of those a second is a cost
inside the measurement the sentence is about.

<a id="on-xr-planes"></a>

## xr-panel.mjs, `onXR()`, planes

── your real floor and walls, if this headset will say ───────────────
⚠️ ONCE PER FRAME, BEFORE THE EYE LOOP — the answer is the same for both
eyes. 🔴 AND IT CANNOT THROW: `frame.detectedPlanes` raises on a session
that was not granted the feature, and an uncaught error in a frame
callback does not stop the loop, it silently deletes everything below it.
The module swallows it, marks the session refused and stops asking.

<a id="on-xr-hands"></a>

## xr-panel.mjs, `onXR()`, the input path

🔴 ONE INPUT PATH, THE SAME ONE `scene` USES, AND IT HAS NO SESSION MODE
IN IT. Once per frame, never per eye, and it cannot throw — every read
inside it is guarded, because an uncaught error in a frame callback does
not stop the loop, it silently deletes everything below it.

<a id="on-xr-drag"></a>

## xr-panel.mjs, `onXR()`, dragging

── dragging ─────────────────────────────────────────────────────────

🔴 WHAT THE QUEST LOBBY DOES WITH A SCREEN, AS CLOSELY AS THIS PAGE CAN
SAY IT: you take a bar under the panel, it rides your ray keeping the
offset you grabbed it at, it turns to face you CONTINUOUSLY WHILE HELD so
you can see what you are placing, and it HOLDS that facing the moment you
let go. A panel you hung stays hung.

⚠️ THE SWIMMING ARGUMENT IS WHY IT IS ONLY WHILE HELD. This module already
says a panel is placed in the room rather than pinned to your face,
because a thing that follows you cannot be looked away from — and two
panels both re-aiming forever would read as the ROOM turning rather than
as you turning, on a page whose whole subject is two pictures held side by
side. Billboarding is only harmless while you are the one moving it.

⚠️ BOTH AXES, ROLL PINNED TO THE ROOM, AND AIMED AT THE HEAD — see `facing`.

<a id="on-xr-held-at"></a>

## xr-panel.mjs, `onXR()`, `heldAt` and `facing`

🔴 THE BOUND AND THE FACING ARE `heldAt` AND `facing`, WHICH ARE
EXPORTED AND TESTED. A drag cannot be tried without a headset, so the
arithmetic is pure and this page's own checks drive it with a made-up
pose — against these functions, not against a second copy of them.

<a id="on-xr-aimed"></a>

## xr-panel.mjs, `onXR()`, `aimedBar`

── where each panel is, and which bar the ray is on ──────────────────
⚠️ ONE ANSWER, TAKEN ONCE A FRAME, READ BY THE BEAM, THE HIGHLIGHT AND
THE PRESS. Asking again inside `selectstart` would be a second opinion
about where the pointer is, and the press could land on a bar the picture
never lit — two truths about one pointer.

<a id="on-xr-glow"></a>

## xr-panel.mjs, `onXR()`, the fake light

── the fake light the pictures throw on the floor ────────────────────
The colour is the page's — it is the one thing here that has seen the
picture — and the place is the middle of wherever the panels ended up, so
moving them moves the pool. See GRID_FS in xr-room.mjs for what this is
and, more to the point, what it is not.

<a id="on-xr-first-draw"></a>

## xr-panel.mjs, `onXR()`, the error flag

⚠️ ASSERT ON THE ERROR FLAG. A page will render a right-looking picture
with an error pending — a Quest did exactly that for a mismatched
attribute binding nobody would have seen by looking.

<a id="on-xr-beacon"></a>

## xr-panel.mjs, `onXR()`, the rate line

🔴 THE RATE AND WHAT IT WAS PAID FOR, ON ONE LINE. A page that gets
slower without saying so leaves the reader inferring it from how it
feels; this says which path drew the second, what the card spent on it
and what the picture is doing to the floor.

<a id="preview"></a>

## xr-panel.mjs, `preview()`

🔴 THE SAME PICTURE, DRAWN ON A LAPTOP, SO THE SUITE CAN FIND WHAT ONLY A
HEADSET USED TO FIND.

Everything this module draws lived behind `requestSession`, so a shader
that would not compile, a quad wound inside-out or a pending
`gl.getError()` cost a headset run to discover — and the owner gets one run.
This builds the same context, attaches the same room and the same live
renderers, and drives `drawEye` TWICE per frame with a hand-made projection
into an off-screen canvas nobody sees, so the error flag, the compile and
the ink are all gradeable here.

⚠️ WHAT IT IS NOT: a frame rate. There is no compositor, no reprojection
and no 3360x1760 framebuffer, so nothing about timing measured in here
describes a headset — the same refusal `verify-gl.mjs` makes about
SwiftShader, for the same reason. It answers "does it draw and is it
clean", and those are the two questions a laptop can answer.

@returns {Promise<object>} what it found, including a pixel spread so a
        page can assert there is a picture rather than a flat field.

<a id="preview-no-session"></a>

## xr-panel.mjs, `preview()`, never in a session

⚠️ NEVER WHILE A SESSION IS RUNNING. It resizes the context's canvas and
rewrites where the panels are — harmless on a laptop, and in a headset it
would move somebody's room while they were standing in it.

<a id="preview-wait"></a>

## xr-panel.mjs, `preview()`, the wait first

⚠️ THE WAIT COMES FIRST, NOT LAST. With no `preserveDrawingBuffer` the
default framebuffer is not readable once the frame has been presented —
so a `readPixels` after the final `requestAnimationFrame` samples a
cleared surface and reports a flat field on a picture that is fine.
That is this page's oldest recurring failure in a new costume.

<a id="preview-stopwatch"></a>

## xr-panel.mjs, `preview()`, the same stopwatch

🔴 THE SAME STOPWATCH THE HEADSET USES. A laptop cannot say what an
Adreno will do — that is the SwiftShader refusal again — but it CAN
say what one pass of this shader costs on the card in front of it,
and it can prove the instrument works before the one headset run that
has to produce the number that matters.
⚠️ The size probe alternates with the full pass rather than running
beside it, because only one TIME_ELAPSED query may be in flight.

<a id="preview-fb"></a>

## xr-panel.mjs, `preview()`, back to the screen

🔴 BACK TO THE SCREEN BEFORE ANYTHING IS DRAWN TO IT — AND THIS IS THE
BUG THE PREVIEW EXISTED TO FIND, ON ITS FIRST RUN. A live renderer
leaves ITS OWN framebuffer bound, and the texture it hands back is that
framebuffer's colour attachment; sampling a texture that is attached to
the framebuffer you are drawing into is a feedback loop, which WebGL
answers with GL_INVALID_OPERATION (1282) and a frame with nothing in
it. In a session the layer's framebuffer is bound a few lines later and
the hazard never arises, which is exactly why it needed a second place
to be caught.

<a id="preview-eyes"></a>

## xr-panel.mjs, `preview()`, both eyes

BOTH eyes, side by side in one framebuffer, because the rule that gets
broken is "only the first view clears colour" and one eye cannot break
it. A viewport is not a clip region; the scissor is what makes it one.

<a id="preview-read"></a>

## xr-panel.mjs, `preview()`, read the whole frame

⚠️ READ THE WHOLE FRAME, PER CHANNEL. Four points on a radial picture
measure its symmetry, and a sum over R+G+B is constant by construction on
three cosines 120° apart — this page has failed a working picture both
ways already.

<a id="preview-profile"></a>

## xr-panel.mjs, `preview()`, `PROFILE_N`

🔴 A LINE ACROSS THE FLOOR, SO A CHECK CAN TELL A RAMP FROM A DISC.

`spread` and `litShare` both pass on a surface drawn at one flat alpha,
which is exactly the failure a radial fade has: it is easy to draw a
bright plate with a hard edge and call it a fade. This is 32 samples
across the LEFT eye at a quarter of the way up the image, which is where
a floor in front of a standing viewer lands, each the brightest channel
at that point. Centre-bright and edge-dark is a ramp; flat is not.

⚠️ `readPixels` COUNTS ROWS FROM THE BOTTOM, so a quarter of the way up
this array is a quarter of the way up the picture. Getting that backwards
samples the sky and reports a floor that is not drawing.
⚠️ AND IT IS THE LEFT EYE ONLY. Both eyes are in one framebuffer side by
side, so a row across the whole width crosses the seam between them and
reads the second eye's left edge as the first eye's centre.

<a id="preview-band"></a>

## xr-panel.mjs, `preview()`, a band, not a row

🔴 A BAND, NOT A ROW, AND THE REASON IS THIN GEOMETRY. One pixel per
sample is right for a textured plane and useless for a mesh of
hairlines: most samples land between two lines and read as the ground,
so a picture that is drawing perfectly reports a flat field. Taking the
brightest pixel in a vertical strip catches a line wherever in the
strip it happens to be, and still answers the only question this is
for — is the middle of the view brighter than its edge.

<a id="preview-shrink"></a>

## xr-panel.mjs, `preview()`, the buffer goes back

⚠️ AND THE DRAWING BUFFER GOES BACK TO NOTHING. This module deliberately
does not build a context for a visitor who will never press the button;
the preview has to build one to check anything at all, so the least it
can do is not leave a 512x320 buffer behind on a phone for the rest of
the page's life.

<a id="preview-png"></a>

## xr-panel.mjs, `preview()`, the snapshot

🔴 A PICTURE OF THE HEADSET'S PICTURE, ON DEMAND. There is no other way to
LOOK at what a session draws without wearing one — `Page.captureScreenshot`
cannot see an immersive view, which research §3.3 already measured. Taken
from the pixels already read back, in the same turn, and flipped because
`readPixels` counts rows from the bottom and a canvas counts them from the
top. Off by default: it is a debugging instrument, not part of the page.

<a id="preview-draws"></a>

## xr-panel.mjs, `preview()`, `draws`

⚠️ `draws` IS THE LOAD-BEARING HALF. `attached` only says the page's
programs compiled; a surface can attach cleanly and never be reached,
which is what an early `return` in `drawEye` would look like from here.

<a id="preview-gpu"></a>

## xr-panel.mjs, `preview()`, this machine's numbers

⚠️ THIS MACHINE'S NUMBERS, AND THEY ARE NOT A HEADSET'S. Reported so
that "we can measure it at all" is established here rather than on the
one device run, and so the two can be held side by side afterwards.
