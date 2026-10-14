# Kit lessons: xr-quit.mjs, xr-quit-test.mjs

The long comments cut from `demo/shell/xr-quit.mjs` and `demo/shell/xr-quit-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-xr-quit.md#<anchor>`.

<a id="header"></a>

## xr-quit.mjs, file header

demo/shell/xr-quit.mjs — the way out of an immersive session. Hold any
controller button and a ring fills in front of you; let go and it cancels.

  quit = mountXRQuit(gl, session, { onQuit: () => tearDown() });   // once
  quit.draw(eyeVP, eyeView);                                       // per eye

🔴 A PAGE CANNOT FORGET IT, AND THAT IS WHY THIS FILE CHANGED ON 2026-09-19.
Instructed: *"global behaviour hold any vr/xr controller button to quit"*.
The gesture was already right and every page carried it by writing three
lines: build it, `update` it with the session's input sources, `draw` it.
`/blocks/` wrote two of the three. It built the badge, compiled its shader
and drew it at both hands every frame, and never called `update`, so the hold
could not advance and THERE WAS NO WAY OUT OF THAT PAGE AT ALL. Reported from
a headset as *"i was not able to get out"*. Every other page had the line, so
no shared code was wrong and nothing in the repo could disagree with
anything.

So the hold is no longer something a page advances. `mountXRQuit` takes the
SESSION and drives itself from `session.requestAnimationFrame`, which is the
session's own frame loop and needs nothing from the page. There is no
`update` to forget, because there is no `update` to call.
⚠️ **AND IT SURVIVES A PAGE WHOSE RENDER LOOP IS DEAD.** If the page throws
on its way in and never draws a frame, the hold still advances and the
session still ends when it fills: you hold blind for three seconds instead of
watching an arc. That is not the dead man's switch and does not replace it,
see below.

🔴 THE RING IS IN FRONT OF YOU, NOT AT YOUR HANDS. DIRECTED 2026-09-19:
*"Hold-to-quit: ui should not tied to controllers. it should be just front of
me"*. It used to be painted at EVERY grip matrix, and the argument for that
is worth keeping because it was a good one: the hold can start on either
controller, so a ring filling on the hand you are NOT pressing is feedback
pointing at the wrong place, and one badge per hand meant whichever hand you
pressed was the one you were looking at when it began to fill. That argument
dies the moment the ring is head locked. In front of you there is one of it,
it is already where you are looking, and WHICH hand started the hold stops
mattering to anybody.
⚠️ **IT TOOK THE `grips?.length` GUARD WITH IT, WHICH IS A REAL GAIN.** A
session driven by tracked HANDS has no grip matrices, so the badge could not
be drawn there at all. It draws now. ⚠️ Tracked hands usually report no
gamepad either, so on that input there is a ring to draw and no button to
hold. What ends such a session is the page's dead man's switch and the
headset's own menu, and this file cannot honestly claim otherwise.

🔴 WHY THE HOLD REPLACED THREE OTHER ANSWERS. Every headset page here has had
its own exit and none of them was discoverable:

  · **"any button leaves"** — a TAP on any button, which means every button is
    a trap. You cannot rest a thumb anywhere, and the page never says which
    button did it. ⚠️ THE BUTTON WAS NEVER THE FAULT, THE TAP WAS, and that
    distinction is what 2026-09-17 turned on: any button HELD for three
    seconds, with a ring saying how far it has got, cannot be reached by
    accident and needs nobody to be told which button to find.
  · **the grip** — invisible. Nothing on screen says the grip does anything,
    and a control you have to be told about is one nobody finds.
  · **a button on a tablet in your other hand** — real, labelled, and gone
    the moment somebody picks up ONE controller. It also costs a slab, a
    texture and a renderer that only one page has.

What is left is the one thing true of every headset: there is a button under
your thumb. Pressing anything and keeping it pressed raises an arc in front
of you and fills it. Let go early and nothing happens, which is what makes it
safe to put on a button somebody might press by accident.

⚠️ THE DEAD MAN'S SWITCH STAYS AND IS NOT THIS. It ends a session when
NOTHING HAS BEEN DRAWN for a few seconds, which is the case where the page
threw and there is nothing on screen to hold a ring. The two cover different
failures: this one is for a person who wants out, that one is for a page that
has stopped being able to offer anything. CLAUDE.md records the failure it
prevents in as many words: session live, nothing drawing, no way out, no log
line. It is not a user facing exit and it belongs to the page.

🔴 ANY BUTTON, NOT BUTTON 4. CHANGED 2026-09-17 ON INSTRUCTION: *"all vr/ar
general  make one general way to get out. hold down any controller button for
looooong enough then it quits. no other exit methods/ui's for now."* The
named-button version was already the good half of this design, the hold and
the ring, and it still asked somebody in a headset to find one particular
button under their thumb. Every button advances the same hold now, so the
gesture is "press something and keep pressing it", which is what a person
does when they want out and cannot see their hands.

⚠️ AND THE TRIGGER IS A BUTTON. On `/blocks/` and `/mirror/` the trigger is
also what drags a thing, so a drag held longer than `HOLD_MS` ends the
session. That is a real cost and it is why the arc is drawn from the first
millisecond of any press rather than appearing part way: a drag that is about
to become an exit says so in front of you, and letting go cancels it to zero.
UNVERIFIED IN A HEADSET, nobody here has one, so it is written down rather
than claimed to be fine.
⚠️ A page that needs one exact button back passes `button: 4`, which is A on a
right Touch controller and X on a left one in the `xr-standard` mapping.

<a id="eye-from-view"></a>

## xr-quit.mjs, the eyeFromView import

🔴 ONE ANSWER FOR WHERE THE CAMERA IS, AND IT IS NOT COPIED HERE.
`eyeFromView` takes the position out of the view matrix that is doing the
projecting, so the badge cannot be turned against a position the page derived
some other way. The forward, right and up below come out of the SAME matrix
for the same reason.

<a id="hold-ms"></a>

## xr-quit.mjs, HOLD_MS

🔴 HOW LONG THE HOLD IS, AND WHY THIS NUMBER.
3 s. Long enough that nothing accidental reaches it: a brush is under 300 ms
and a deliberate press about 500, so an exit at three seconds cannot be
arrived at by resting a thumb. Short enough to be reachable by somebody who
wants out NOW, three seconds being about as long as anybody will hold a
control before deciding it is broken, and the ring says how far the hold has
got, so the wait is spent watching something happen rather than wondering.
⚠️ It was 900 ms while the exit was one named button nobody would press by
accident. With every button live, 900 ms is a trap.

<a id="dist-m"></a>

## xr-quit.mjs, DIST_M

🔴 HOW FAR IN FRONT OF THE VIEWER THE RING SITS, IN METRES.

1.6 m, and the three things that fix it:
· **Clear of anything you are holding.** A brick on `/blocks/` is at arm's
  length, about 0.6 m, and the instruction for this change says in as many
  words that the ring must not be inside one. 1.6 m is a metre past the end
  of an arm.
· **Inside the headset's comfortable range.** A Quest focuses at somewhere
  between about 1.3 and 2 m whatever the geometry says, so content a person
  is asked to look at for three seconds belongs in that band. Closer than
  a metre is where a head locked thing starts to feel like it is on your
  face.
· **It is the distance `xr-panel.mjs` already hangs its panels at**, so on
  the one page that has both, the ring and the thing behind it are at one
  depth rather than two.
⚠️ AND IT IS DEAD CENTRE, WHICH IS ONLY BEARABLE BECAUSE THE BADGE IS HOLLOW.
There are no words on it and nothing in the middle: the arc frames what you
are looking at rather than covering it, and it is on screen only while a
button is down.

<a id="ring-deg"></a>

## xr-quit.mjs, RING_DEG

🔴 HOW BIG IT LOOKS, IN DEGREES, WHICH IS THE HONEST UNIT FOR SOMETHING HEAD
LOCKED. The badge used to be 40 mm at a controller, about 4.6 degrees across
at the distance a hand is held. Fixing the ANGLE rather than the metres means
moving `DIST_M` cannot silently change how big it reads.
⚠️ The arc itself is 0.8 of the badge, so the ring is about 4 degrees.

<a id="arm-ms"></a>

## xr-quit.mjs, ARM_MS

🔴 A BUTTON THAT WAS ALREADY DOWN WHEN THE SESSION STARTED DOES NOT COUNT,
AND THIS USED TO BE EVERY PAGE'S OWN PROBLEM.

The press that worked the page's own "enter" control can still be down as the
session starts, and with every button live it IS one of the buttons the hold
counts, so without this a session would end about three seconds after it
began. `xr-panel.mjs` carried exactly this guard in the page layer and the
other three pages did not, which is one more line nobody should have to
remember. The hold arms on the first frame with NOTHING pressed.
⚠️ OR AFTER THIS LONG REGARDLESS, so a stuck button cannot be the reason
somebody is trapped in a room. That is the better half of the two rules that
were merged here, and it is a deliberate trade: a genuinely stuck button ends
the session about six seconds in, which is worse than nothing happening only
if you wanted to stay.

<a id="bind-before-link"></a>

## xr-quit.mjs, compile, bindAttribLocation

🔴 BEFORE `linkProgram`. Called after the link it is a no-op that reads like
a fix. A Quest reported GL_INVALID_OPERATION on its first frame for exactly
this and drew correctly anyway, because the linker happened to pick the
same slot.

<a id="create-quit-hold"></a>

## xr-quit.mjs, createQuitHold

🔴 THE GESTURE, WITH NO DOM, NO GL AND NO SESSION IN IT.

Every bug this thing has ever had lived in the arithmetic: a hold that kept
its progress between presses, a hold that fired twice, a hold that counted
the press which opened the page. None of those need a headset to find and
none of them needed a browser, so they live here and `xr-quit-test.mjs`
drives this with a fake session on a laptop.

🔴 RELEASING CANCELS, AND IT CANCELS TO ZERO. A hold that kept its progress
between presses would let somebody quit by brushing a button nine times over
a minute, which is the accident this design exists to prevent.
⚠️ And it only ever fires ONCE: `session.end()` is async, and a ring that
stays full for three more frames would ask three times.

<a id="every-button"></a>

## xr-quit.mjs, createQuitHold, every button

⚠️ EVERY BUTTON, NOT ONE. `pad.buttons` is whatever the runtime
reports for this controller, so this covers the trigger, the squeeze,
the thumbstick click, A/X, B/Y, the thumbrest and the menu without
this file having to know which indices a given headset uses, which is
the whole point of "any". A page that named an index gets that index
and nothing else.

<a id="paint"></a>

## xr-quit.mjs, createBadge, paint

⚠️ REDRAWN ONLY WHEN THE PICTURE CHANGES, and the picture is a hundredth of
a turn. A 256 square canvas painted and uploaded on every eye of every
frame of a 90 Hz headset is 46 MB a second of traffic to say the same
thing; quantising the progress means the texture moves about a hundred
times over the whole hold.

<a id="arc-only"></a>

## xr-quit.mjs, createBadge, paint, the arc

🔴 NO CIRCLE UNTIL THERE IS SOMETHING TO COUNT. Reported 2026-09-16:
*"initially no circle, its appears on countdown (no bg circle just
arc). make it thinner and just white and bit rounded"*.

There was a faint full circle behind it at all times, on the argument
that the arc needs somewhere to fill INTO. That is a good argument about
a progress bar on a screen and the wrong one here: a ring drawn in front
of somebody who is not pressing anything is a shape that means nothing
yet, and it is the loudest thing in the room. The arc appearing from
nothing IS the feedback.

⚠️ WHITE, NOT THE SITE'S YELLOW. Yellow in here is spent on the thing
that is running; this is the way out, which is furniture until the moment
you use it. ⚠️ AND THIN, with round caps, which is the `bit rounded`:
at 0.055 of the badge it read as a heavy dial, and a countdown that has
only to be SEEN does not need weight.

<a id="no-words"></a>

## xr-quit.mjs, createBadge, no label drawn

🔴 NO WORDS ON IT. INSTRUCTED 2026-09-19: *"hold any controller button
down long enough it shows circular coundown (no labels) and quites"*.
The label was the whole discoverability argument this badge was built on,
and it lost to the thing it was competing with: a word floating in front
of you is furniture you read once and then look past for the rest of the
session, in a picture whose whole point is what is in front of you.
⚠️ **SO THE GESTURE IS THE DOCUMENTATION.** Press anything and keep
pressing it: the arc appears on the first millisecond and fills, which
tells a person holding a button that holding it is doing something,
without asking them to read at arm's length.
⚠️ `label` IS STILL ACCEPTED AND STILL REPORTED, so a page that wants to
SAY what its way out is can put it in its own log. Nothing draws it.

<a id="compile-error"></a>

## xr-quit.mjs, createBadge, ensure, compile error kept

⚠️ A SWALLOWED COMPILE ERROR IS A CONTROL THAT IS SIMPLY ABSENT, with
nothing anywhere saying why. This used to be a bare `catch {}`, so a
badge that would not build looked exactly like a badge nobody asked
for. Kept rather than rethrown, because a way out that will not compile
must not take the session with it.

<a id="badge-draw"></a>

## xr-quit.mjs, createBadge, draw

One ring, a fixed distance along the viewer's own forward, square to them.

🔴 EVERY NUMBER COMES OUT OF THE VIEW MATRIX THIS EYE IS BEING PROJECTED
WITH. A headset draws two views 64 mm apart, and a badge turned against a
position the page worked out some other way is not a smear, it is a
DISPARITY: it reads as sitting at a depth it is not at. The matrix is
column-major, so element (row, col) is `v[col * 4 + row]` and the
rotation's ROWS are the camera's own axes in the world. Right, up and
forward are three reads rather than a cross product, and `eyeFromView` is
the position.
⚠️ NORMALISED ANYWAY. A view matrix is rigid and these are already unit
vectors; a scale sneaking in would change the badge's SIZE with the pose,
which is a very confusing thing to look at for the cost of three square
roots on the frames where somebody is holding a button.

<a id="on-top"></a>

## xr-quit.mjs, createBadge, draw, on top

🔴 ON TOP OF EVERYTHING, AND IT PUTS THE STATE BACK.
A way out you cannot see because a wall is in front of it is the failure
the dead man's switch exists for, arrived at by drawing. So the depth
test is off for these four vertices and the depth mask with it, and both
go back afterwards: a kit component that leaves blending on, or the depth
mask off, breaks the NEXT thing its host draws and the host looks like
the broken one.

<a id="put-back"></a>

## xr-quit.mjs, createBadge, draw, state put back

⚠️ PUT BACK, NOT READ BACK. The obvious version asks `gl.isEnabled` first
and restores what it found, and a glGet inside a render loop can cost a
round trip to the driver: an exit that drops frames while you hold it is
an exit that looks broken. This leaves the state every other component
here leaves, which `xr-ray.mjs` and `xr-controller.mjs` both write down:
blending off, depth test on, depth mask on. The badge is the last thing
in the eye, so there is nothing after it to disagree.

<a id="mounted"></a>

## xr-quit.mjs, MOUNTED

🔴 ONE MOUNT PER SESSION, AND ASKING TWICE HANDS BACK THE SAME ONE.
Two drivers on one session is two holds counting the same thumb, and the
second one to fill would ask a session that is already ending to end again.
A page that cannot tell whether it has mounted already is a page that mounts
twice.

<a id="mount-xr-quit"></a>

## xr-quit.mjs, mountXRQuit

The way out, mounted on a session.

@param {WebGL2RenderingContext} gl   the context the page draws through
@param {XRSession|null} session      the live session. `null` builds the
                                    badge WITHOUT driving it, which is how a
                                    laptop grades the shader before anybody
                                    puts a headset on; such an object
                                    reports `driven === false`.
@param {object} [o]
@param {string} [o.label]    what the hold does, for a page's own log. Never
                            drawn, see `paint`.
@param {number|'any'} [o.button]  gamepad index, or `'any'` (the default).
@param {number} [o.holdMs]   how long to hold.
@param {Function} [o.onQuit] the page's own teardown, called once, first.
                            🔴 IT DOES NOT REPLACE THE EXIT. This module
                            ends the session itself whether a page passes
                            one or not, and whether the one it passes throws
                            or not, because "the page ends the session" is
                            exactly the line that went missing from
                            `/blocks/`.
@param {Function} [o.log]    the page's log, for a line a visitor can read.
@param {Function} [o.say]    the beacon. 🔴 NEVER A BATCHED SHIPPER:
                            `createShipper` holds for 2 s and a session
                            ending is exactly when timers stop being
                            generous.

<a id="leave"></a>

## xr-quit.mjs, mountXRQuit, leave

🔴 THE PAGE IS TOLD, THEN THE SESSION ENDS. In that order, so a page gets
to stop its sound and put its own things away with the session still live.
Both halves are guarded: a teardown that throws must not be able to keep
somebody in a room, and a session that is already ending answers the second
`end()` with a rejection nobody needs to hear about.

<a id="step"></a>

## xr-quit.mjs, mountXRQuit, step

🔴 THE SESSION'S OWN FRAME LOOP, NOT THE PAGE'S. This is the whole design:
`XRSession.requestAnimationFrame` is a list of callbacks and anybody
holding the session may add one, so the hold advances without a single line
in a page and keeps advancing if the page's render loop has died.
⚠️ IT RE-REGISTERS FIRST. A throw anywhere below would otherwise end the
loop silently, which is the failure this file exists to stop, arrived at
from the other side.

<a id="draw-only-holding"></a>

## xr-quit.mjs, mountXRQuit, draw, only while held

🔴 NOTHING IS DRAWN UNTIL SOMETHING IS BEING HELD. With no label on it
an idle badge is a blank square hanging in the middle of the view,
which is worse than the word it replaced: it says nothing and it is
still in the way. The countdown IS the badge, so there is no badge
until there is a countdown.
⚠️ AND THE ARC STARTS ON THE FIRST MILLISECOND, which is the property a
drag-to-quit page depends on: on `/blocks/` the trigger both drags a
brick and advances this hold, so a drag that is about to end the
session has to say so while there is still time to let go.

<a id="prepare"></a>

## xr-quit.mjs, mountXRQuit, prepare

🔴 COMPILE NOW, SO SOMETHING OTHER THAN A HEADSET CAN GRADE IT.
Everything in the badge is lazy until the first draw, which means the
object existing says nothing at all about whether its shader builds. A
page asserting "there is a way out" off the object alone passes on a
broken badge: PROVED by making `compile` throw and watching the check
stay green. Returns whether it is really ready.

<a id="test-header"></a>

## xr-quit-test.mjs, file header

demo/shell/xr-quit-test.mjs — is there really a way out of every headset page.

  node demo/shell/xr-quit-test.mjs

🔴 WHY THIS EXISTS. REPORTED 2026-09-19: *"i was not able to get out"*. The
cause was `/blocks/` calling `createXRQuit` and `draw` on every frame and
never once calling `update`, so the hold could not advance, the ring could not
fill and the session could not end. There was no way out of that page at all.

⚠️ IT LOOKED CORRECT FROM EVERY ANGLE THAT CAN BE LOOKED FROM. The object was
built, its shader compiled, the badge was drawn at both hands every frame, and
the page reported a way out as present. `/weight/`, `/floor/` and
`xr-panel.mjs` all had the missing line, so no shared code was wrong and
nothing in the repo could disagree with anything.

🔴 THE DESIGN CHANGED, SO THIS CHECK CHANGED WITH IT. The old build was a
grep: a file that DRAWS a way out must also ADVANCE it, matched on the
argument (`inputSources`) rather than on the method name, because `/blocks/`
updates its room, its hands and its document and a name match stayed green
with the quit's own call deleted. That check now grades a shape nobody can
write: `mountXRQuit` takes the SESSION and advances the hold from the
session's own frame loop, and the object it hands back HAS NO `update`. A
check about a line that cannot be forgotten is a check that cannot fail, and
CLAUDE.md is clear that this is worse than no check.

So it grades two things instead, and the first one is new in kind:

  · **THE SHARED PATH, BY RUNNING IT.** The hold is pure arithmetic over a
    list of gamepads and a frame clock, so a fake session drives the real
    `mountXRQuit` here on a laptop with no browser, no GL and no headset: a
    button held long enough ends the session, a button released early does
    not, and the page contributes NOTHING to either. Every assert below is
    reached without a single call to `update` or `draw`, which is the whole
    claim of the design stated as a test that would go red if it stopped
    being true.
  · **THE PAIRING, IN THE SOURCE.** A file that enters an immersive session
    must mount the way out on it. That is still static, and it still has to
    be: no harness can enter a session, and a file that never mounts one is a
    line that is NOT there.

⚠️ A STATIC CHECK IS A WEAK CHECK AND IT IS SAID HERE RATHER THAN DISCOVERED
LATER. The second half proves the call exists, not that the page reached it.
The first half is the one that proves behaviour, and it proves it about this
module rather than about any page.

<a id="test-fake-session"></a>

## xr-quit-test.mjs, 1. the shared path, fakeSession

─────────────────────────────────────────────────────────────────────────
1. THE SHARED PATH, DRIVEN
─────────────────────────────────────────────────────────────────────────
A session that is nobody's session: a list of buttons, a frame loop and an
`end()` that counts. It is deliberately the MINIMUM `mountXRQuit` touches, so
a mount that started reaching for anything else would fail here rather than
in a headset.

⚠️ THE FRAME STEP IS 11 ms, which is a 90 Hz headset. It matters: the first
frame carries no elapsed time at all, so a hold is always one frame behind
the wall clock, and a test that drove exactly `HOLD_MS` of frames would sit
11 ms short and read as a hold that does not fire.

<a id="test-hold-ends"></a>

## xr-quit-test.mjs, a held button ends the session

🔴 THE ONE THAT MATTERS. No `update`, no `draw`, no page: hold a button and
the session ends.

<a id="test-negative"></a>

## xr-quit-test.mjs, negative control, early release

🔴 NEGATIVE CONTROL. Without this the assert above is satisfied by a mount
that ends the session on any press, or on none.

<a id="test-opening-press"></a>

## xr-quit-test.mjs, the opening press

🔴 THE PRESS THAT OPENED THE PAGE IS NOT A PRESS TO LEAVE IT. Every page
used to need its own guard for this and only `xr-panel.mjs` had one.

<a id="test-on-quit"></a>

## xr-quit-test.mjs, onQuit is teardown

🔴 `onQuit` IS TEARDOWN, NOT THE EXIT. This is the exact line that went
missing from `/blocks/`: a page that does not end the session must not be
able to leave somebody in a room.

<a id="test-stall"></a>

## xr-quit-test.mjs, a stalled frame

⚠️ A STALLED FRAME MUST NOT ADVANCE A HOLD BY A SECOND. The hold measures a
deliberate press and a stall is not one.

<a id="test-sources"></a>

## xr-quit-test.mjs, 3. sources

─────────────────────────────────────────────────────────────────────────
3. EVERY FILE THAT ENTERS A SESSION MOUNTS THE WAY OUT ON IT
─────────────────────────────────────────────────────────────────────────
Every file under `demo/`. `archive/` is deliberately not walked: a retired
page is a record of what was there, and holding it to a rule written after it
was retired would make the archive lie.

<a id="test-code"></a>

## xr-quit-test.mjs, code, comments stripped

🔴 COMMENTS ARE NOT CODE, AND THIS CHECK READ THEM FOR ONE RUN.

FOUND BY SABOTAGE, 2026-09-19: with `xr-panel.mjs`'s actual `mountXRQuit`
call broken on purpose, its line stayed GREEN, because the sentence three
hundred lines above it explaining what `mountXRQuit(gl, session)` does
matches the regex perfectly. A file that only TALKS about the way out would
have passed, which is the `s.includes(<substring>)` trap CLAUDE.md names
three bugs from, met for the second time in this one file.

⚠️ IT IS DELIBERATELY BLUNT. Block comments, HTML comments, and `//` to the
end of a line unless a `:` is in front of it, which is what keeps a URL in a
string from eating the rest of its line. It is not a parser and does not need
to be: what it has to do is stop prose being read as a call.

<a id="test-enters"></a>

## xr-quit-test.mjs, ENTERS

🔴 WHAT MAKES A FILE ONE OF THESE: IT ASKS FOR A SESSION. Not that it imports
the module, not that it mentions a headset. `navigator.xr.requestSession` is
the one call that puts a person somewhere they cannot get out of by looking
away, so it is the call that has to be paired.
⚠️ IT IS MATCHED WITH THE `navigator.xr` IN FRONT OF IT. `requestSession`
alone appears in comments all over this repo and as a method on the stub
inside `demo/verify-quest.mjs`, and a check that fails a harness for owning a
fake is a check people learn to ignore.

<a id="test-mounts"></a>

## xr-quit-test.mjs, MOUNTS

⚠️ THE IMPORT DOES NOT COUNT, THE CALL DOES. A file that imports the module
and never mounts one has no way out to get wrong, and matching on the import
alone would pass the exact page that was reported. This is the
`s.includes(<substring>)` trap CLAUDE.md names: guard on the call.

<a id="test-files"></a>

## xr-quit-test.mjs, files, excluding the module and this test

⚠️ THE MODULE THAT DEFINES IT IS NOT A CALLER, and neither is this file. Both
match every regex above perfectly. That is the substring trap in its own
costume, and the first build of the old check failed `xr-quit.mjs` for not
calling the methods it declares.

<a id="test-controls"></a>

## xr-quit-test.mjs, negative controls

🔴 THE NEGATIVE CONTROLS, AND WITHOUT THEM THE LOOP ABOVE IS WORTH NOTHING. A
check that reports every file as fine is indistinguishable from a check that
cannot fail, so the same two regexes are run against sources written to be
wrong.

<a id="test-only-prose"></a>

## xr-quit-test.mjs, ONLY_PROSE

🔴 AND IT FAILS A FILE THAT ONLY TALKS ABOUT MOUNTING ONE. This control was
added after the sabotage above found the check passing a file whose real call
had been broken, on the strength of a sentence in a comment.

<a id="test-no-words"></a>

## xr-quit-test.mjs, 4. what the ring is, no words

─────────────────────────────────────────────────────────────────────────
4. WHAT THE RING IS
─────────────────────────────────────────────────────────────────────────
🔴 NO WORDS ON THE BADGE. INSTRUCTED 2026-09-19: *"circular coundown (no
labels)"*. The module used to draw its `label` into the texture, and a
sentence in a comment saying it no longer does is exactly the kind of claim
this project keeps finding stale. `fillText` is the one call that can put a
word there.

<a id="test-hold-floor"></a>

## xr-quit-test.mjs, the hold floor

⚠️ AND THE HOLD IS LONG ENOUGH TO BE DELIBERATE. A number this small is not
worth a test on its own; what it is worth is a floor, because the value was
900 ms while the exit was one named button and every button is live now. A
brush is under 300 ms and a deliberate press about 500.

<a id="test-ring-distance"></a>

## xr-quit-test.mjs, the ring distance

🔴 AND THE RING IS NOT INSIDE WHAT SOMEBODY IS HOLDING. DIRECTED 2026-09-19:
it sits in front of the viewer rather than at the controllers, and the one
thing that can go wrong with a head locked thing is putting it where a hand
already is. An arm is about 0.7 m.
