# Kit lessons: xr-hands.mjs

The long comments cut from `demo/shell/xr-hands.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-hands.md#<anchor>`.

<a id="header"></a>

## xr-hands.mjs, file header

demo/shell/xr-hands.mjs — what is in your hands, and the one place that
decides what each hand does.

🔴 ONE INPUT PATH, AND IT CANNOT TELL VR FROM AR. That is the requirement
stated as a property of the code rather than as a promise in prose: there is
no `immersive-vr`, no `immersive-ar`, no `environmentBlendMode` and no
`session.mode` anywhere in this file, so the controllers, the pointer, the
tablet and its slider are necessarily identical in both modes. Two code paths
that are MEANT to be the same will drift, and the drift gets found in a
headset, which is the most expensive place in this project to find anything.

The only thing that legitimately differs between the two modes is the ROOM —
passthrough draws the surfaces the headset MEASURED, an opaque session draws
the one surface `local-floor` guarantees. That lives in `xr-room.mjs`'s
`buildOwnRoom`/plane adoption and nowhere else. If you find yourself reaching
for the session mode out here, that is the smell.

🔴 AND THE ASSIGNMENT COMES FROM `handedness`, NEVER FROM A SLOT INDEX.
MEASURED on a Quest 3, 2026-09-13: ONE frame reported the SAME hand as both
`inputSources[0]` and `trackedSources[1]` with different profiles, and an
earlier run had the LEFT grip fail to resolve while the right one resolved.
An index is a statement about the order an array happened to be in;
`handedness` is the runtime answering the question. ⚠️ It can also be `none`,
so this is a three-way choice with a fallback, not a boolean.

⚠️ `session.trackedSources` IS A META-FORK ATTRIBUTE. Upstream Chromium has
no such thing, so reading it unguarded on a desktop browser is a TypeError
inside a frame callback — the failure that does not stop the loop, it
silently deletes everything below it. Guarded, and WHICH ARRAY a source came
from is itself reported, because absent-and-empty, present-and-empty and
present-with-a-hand are three different findings.

⚠️ NOTHING IN `observe` MAY THROW, for the same reason. Every read is inside
the one try, and a refusal is remembered rather than retried ninety times a
second to be told no.

🔴 AND THIS IS WHERE THE TABLET'S WAY OUT IS ACTUALLY PERFORMED. A control on
the tablet that raises `leaves` ends the session from here, and the reason it
is here rather than in `xr-tablet.mjs` or in a page is the shape of what each
one holds: the tablet must not hold a session at all, and a page holds one
but there are two pages, so one of them would be wired and one would not —
which is a button that looks live on one page and is inert on the other.
`observe` is handed the session every frame, so both pages get it for free.
⚠️ It is a THIRD way out and it cannot be the only one: a button drawn on a
tablet that only exists once a grip pose has resolved has two conditions in
front of it, and an exit with conditions is not an exit.
⚠️ THE FIRST TWO ARE NOT THE PAGE'S ANY MORE, WHICH IS THE SAME ARGUMENT THIS
NOTE MAKES, APPLIED TO THE HOLD. Since 2026-09-19 a long hold on any
controller button is mounted on the SESSION by `demo/shell/xr-quit.mjs` and
advanced by the session's own frame loop, for exactly the reason written
above: a page that has to remember a line is a page where one of them will
not, and `/blocks/` was the one that did not.

<a id="button"></a>

## xr-hands.mjs, `BUTTON` and `AXIS`

🔴 THE BUTTON INDICES, TAKEN FROM THE REGISTRY WITHOUT TAKING THE MESH.

`plan-xr-hands` §4.2 stage 2. Read out of
`@webxr-input-profiles/assets@1.0.20`'s own
`dist/profiles/meta-quest-touch-plus/profile.json` on 2026-09-13, which is
the file the registry would have been fetched for:

 xr-standard-trigger    button 0
 xr-standard-squeeze    button 1
 xr-standard-thumbstick button 3 · xAxis 2 · yAxis 3
 a/x-button             button 4
 b/y-button             button 5
 thumbrest              button 6
 menu (left only)       button 7

⚠️ IT CONFIRMS THE GUESSES ALREADY IN `scene` RATHER THAN CORRECTING THEM —
`buttons[4]` really is A/X and `axes[3]` really is the thumbstick's Y on this
controller. That is worth writing down precisely because it is a pass: those
two indices were typed against a controller nobody had asked the name of, and
"it happens to be right" and "it is right" are the same observation until
somebody checks. The headset reports `meta-quest-touch-plus`, and the four
ids it falls back to (`oculus-touch-v3`, `oculus-touch`,
`generic-trigger-squeeze-thumbstick`) carry the same first four indices.

<a id="same-thing-m"></a>

## xr-hands.mjs, `SAME_THING_M`

🔴 HOW CLOSE TWO GRIP POSES HAVE TO BE TO BE THE SAME PHYSICAL THING, in
metres. Two hands are never 6 cm apart in a way that matters here; one
controller reported twice is 0 cm apart, because it is one controller.

<a id="dedupe"></a>

## xr-hands.mjs, `dedupe`

🔴 ONE PHYSICAL THING, ONE STAND-IN — AND THE RULE IS WRITTEN DOWN.

Reported from a Quest 3: *"saw double controller geometry"*. The cause is in
this morning's own log and it is not a bug in the drawing: the SAME hand
arrives in BOTH arrays at once, with the same profile —

 1 input + 2 tracked · I0:right meta-quest-touch-plus … || T1:right meta-quest-touch-plus …

— and with hands raised it gets stranger still, the same hand appearing once
as `oculus-hand` and once as `meta-quest-touch-plus`. Nothing about the array
a source came out of tells you whether it is a new object, so a list that
draws one shape per entry draws two shapes for one hand.

The rule, in priority order, and it is a rule about the OBJECT rather than
about the array:

 1. **A controller beats a hand.** If one hand reports both, the controller
    is the thing that is physically there — it is what you would see if the
    headset were transparent — and it is the one with a trigger, a
    thumbstick and buttons. A hand skeleton drawn over the controller you
    are holding is a picture of something that is not happening.
 2. **`inputSources` beats `trackedSources`.** A primary input is the one
    that can act; a tracked source is pose only.
 3. Then drop anything that is the SAME THING as one already kept — same
    non-`none` handedness, or a grip within `SAME_THING_M`.

⚠️ NEVER BY ARRAY POSITION. An index is a statement about the order an array
happened to be in; handedness and a position in metres are statements about
the world. And `handedness` alone is not enough, because it can be `none` —
which is why the distance test is there as well as, not instead of.

Returns what was kept AND what was dropped, because "two controllers" and
"one controller reported twice" look identical once one of them is gone, and
the log has to be able to tell them apart on a single run.

<a id="create-xr-hands"></a>

## xr-hands.mjs, `createXRHands`

@param {object} o
@param {{aim:Function,press:Function,drag:Function,release:Function,holding:Function}} [o.tablet]
@param {(msg:string, kind?:string) => void} [o.log]
@param {(line:string) => void} [o.say]  🔴 THE BEACON, never a batched
      shipper — `createShipper` holds for 2 s and entering an immersive
      session is exactly when timers stop being generous.
@param {object} [o]
@param {object|null} [o.tablet]   the tablet component, or null for none.
@param {() => boolean} [o.tabletShown]
 🔴 IS THE TABLET ACTUALLY IN THE SCENE THIS FRAME. It is a PREDICATE rather
 than a flag because the answer moves: a page decides whether it wants the
 slab, and a passthrough session refuses it whatever the page decided
 (`environmentBlendMode`, never the session's name). Without this the hands
 go on hit-testing a slab nobody can see — `over` goes true when the ray
 crosses where it WOULD be, and a page that refuses a grab while the ray is
 on the tablet silently stops working for a reason there is nothing on
 screen to explain. That is an invisible control eating presses, which is
 the exact failure shape this repo keeps paying for.

<a id="pointer-src"></a>

## xr-hands.mjs, `state.pointerSrc`

⚠️ THE POINTER'S OWN SOURCE, so a page reads the thumbstick and the
buttons off THE HAND THAT IS POINTING rather than off whichever source
the array happened to put first. `scene` used to `break` out of that loop,
which is the same bug wearing a `break` — with two controllers it drove
the held thing from one hand and aimed with the other, at random.

<a id="state-left"></a>

## xr-hands.mjs, `state.left`

The label of the control that ended the session, or null. A page reads
this to say WHY a session ended rather than only that it did — three
exits that all log "session ended" make a page that cannot tell you which
one fired.

<a id="tablet-drains"></a>

## xr-hands.mjs, the tablet's drains checked once

🔴 AN OPTIONAL CALL IS HOW A WAY OUT BECOMES INERT WITHOUT SAYING SO. The
two drains below are written `tablet.fired?.()` so that a tablet-shaped
stub cannot throw inside a frame callback — and that is exactly the
optional-chaining failure this project paid for on an iPhone's fullscreen
button, where a missing method meant no throw, no log line and no picture.
So the absence is CHECKED once, out loud, rather than chained past ninety
times a second in silence.

<a id="stages"></a>

## xr-hands.mjs, instrumentation stages

── instrumentation, because the owner gets ONE run ────────────────────
🔴 A NAMED PHASE FOR EVERY STEP, AND A DEADLINE THAT NAMES THE ONE THAT DID
NOT HAPPEN. This repo has three headset runs that were indistinguishable
from outside until a line was shipped before and after every await, and the
per-frame path has no awaits at all — so the equivalent here is a STAGE
that has to be reached, with a clock on it. A stage that never arrives says
which stage, in words, rather than leaving a silent tablet to be guessed at.

<a id="stage-ray-on-tablet"></a>

## xr-hands.mjs, the ray on the tablet stage

⚠️ THIS ONE IS NOT A DIAGNOSIS AND IT MUST NOT READ AS ONE. Nobody is
obliged to point at the tablet, so the honest line names BOTH readings
and says which one the numbers beside it would settle. A guess presented
as a diagnosis has already cost this project a room rescan and a serious
suggestion of reinstalling a headset.

<a id="observe"></a>

## xr-hands.mjs, `observe`

Once per FRAME, never per eye, and it cannot throw.

@param {XRFrame} frame
@param {XRReferenceSpace} space  `local-floor`
@param {XRSession} session

<a id="both-arrays"></a>

## xr-hands.mjs, `observe`, both arrays

⚠️ BOTH ARRAYS, AND SAY WHICH. See the header.

<a id="grip-space"></a>

## xr-hands.mjs, `observe`, gripSpace

⚠️ `gripSpace` IS NULL FOR ANYTHING NOT INHERENTLY TRACKABLE, so every
read is guarded rather than dereferenced. And a pose that does not
RESOLVE is different from a space that does not exist — the first is
this frame, the second is this controller.

<a id="observe-dedupe"></a>

## xr-hands.mjs, `observe`, dedupe

🔴 ONE PHYSICAL THING, ONE STAND-IN. See `dedupe` above: the same hand
arrives in both arrays at once on this runtime, so a list drawn one
shape per entry drew two controllers for one hand.

<a id="who-gets-what"></a>

## xr-hands.mjs, `observe`, who gets what

── who gets what ───────────────────────────────────────────────────
🔴 BY HANDEDNESS, WITH A NAMED FALLBACK. The owner's rule is "right has
the ray, left is the tablet". A headset with one controller still has
to work, so the fallback is written down rather than left to whichever
source happened to be first: with only one source it carries the tablet
AND the ray, which is usable and is reported in words, because a tablet
that silently did not attach reads as a broken tablet.

<a id="armed"></a>

## xr-hands.mjs, `observe`, a pointer needs buttons

⚠️ A POINTER WITH NO BUTTONS CANNOT PRESS ANYTHING. Deduplication can
keep a source whose gamepad is empty — a tracked controller, or a hand
— so the choice prefers one that has buttons before it prefers the
right side. A ray that aims perfectly and never fires reads as a broken
slider rather than as the wrong source having been picked.

<a id="grip-ray"></a>

## xr-hands.mjs, `observe`, grip to ray distance

🔴 THE FIELD `plan-xr-hands` §6.3 CALLS THE HIGHEST-VALUE ONE IN THE
RUN: how far apart grip and target ray actually are on this runtime. It
turns "hang a model off the wrong space and it floats" from a claim
into a number. Taken on the pointer, once.

<a id="tablet-shown"></a>

## xr-hands.mjs, `observe`, the tablet

── the tablet ──────────────────────────────────────────────────────
⚠️ NOTHING IS HIT-TESTED AGAINST A SLAB THAT IS NOT DRAWN. See
`tabletShown` at the top of this function for what that costs when it
is got wrong.

<a id="trigger"></a>

## xr-hands.mjs, `observe`, the trigger

── the trigger, read off the gamepad rather than off session events ──
⚠️ ON PURPOSE, AND IT IS NOT A SECOND WAY TO DO THE SAME THING.
`selectstart` fires for WHICHEVER source pressed; a slider needs to know
that the POINTER's trigger is down, this frame, while the ray is
somewhere. Edge-detected here so a held trigger is a drag rather than
ninety presses, and index 0 is the registry's own `xr-standard-trigger`
rather than a guess — see BUTTON above.

<a id="tablet-notes"></a>

## xr-hands.mjs, `observe`, the tablet's words

⚠️ THE WORDS ARE THE TABLET'S, NOT THIS FILE'S. These lines used to be
written here — `pressed the tablet · {"grid":75}` — which was fine
while every control was a slider with a value to print, and became a
lie the moment one of them was not: a button press reported the
slider's number, unchanged, as though that were what had happened.
The tablet knows which control it is and what just became of it, so
it says so and this file carries the line to the beacon.

<a id="way-out"></a>

## xr-hands.mjs, `observe`, the tablet's way out

🔴 THE WAY OUT IS PERFORMED HERE, AND THIS IS THE ONLY PLACE IT COULD
BE. `xr-tablet.mjs` must not hold a session — its whole claim is that
it cannot tell one kind from another — and a page cannot be relied on
to wire it, because there are two pages and one of them would forget.
`observe` is handed the session every frame, so a control that raises
`leaves` gets its exit on both pages with no page wiring at all.

⚠️ IT ADDS TO THE PAGE'S OWN WAYS OUT AND REPLACES NEITHER. A button
drawn on a tablet that only exists once a grip pose has resolved
cannot be the only exit from a room — that is the black-headset trap
this project has already paid for twice. The page keeps its
any-controller-button exit and its dead-man's switch; this is a third.

<a id="drawn-count"></a>

## xr-hands.mjs, `observe`, how many shapes

🔴 HOW MANY SHAPES WILL BE DRAWN, AND WHY THAT IS FEWER THAN THE
SOURCES. "Two controllers" and "one controller reported twice" are
identical once the duplicate is gone, so the line says which it was
— otherwise the next person to see one stand-in for two hands has
no way to tell a fix from a new bug.

<a id="rate-line"></a>

## xr-hands.mjs, `observe`, the rate line

── the rate line, twice ──────────────────────────────────────────────
🔴 A FRACTION, NOT A Hz FIGURE. A Hz number needs a clock and still
cannot separate "the runtime updates at 60 while we render at 90" from
"poses drop out". Resolutions counted against frames answers both with
no clock at all. Twice because the first covers starting up and the
second covers running — `plan-xr-room` §9 measured those differing
84.5 -> 90.0 fps, and this is the same distinction for input.
