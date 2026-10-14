# Kit lessons: pedal.mjs, pedal-test.mjs

The long comments cut from `demo/shell/pedal.mjs` and `demo/shell/pedal-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-pedal.md#<anchor>`.

<a id="header"></a>

## pedal.mjs, file header

demo/shell/pedal.mjs. The sustain pedal, and what a key release means.

Lifted out of `demo/muta/index.html`, which grew it on 2026-09-22 in answer
to *"how can i get long sustaned notes, drony ones? i do have sustain pedal
but"*. Half of a keyboard is under the player's foot and none of it was
reaching any instrument on this site.

🔴 A SUSTAIN PEDAL IS THE ABSENCE OF THE DAMPER, NOT THE PRESENCE OF A
SUSTAIN. `rig/board/synth.mjs` already wrote the sentence this module is
built on: *"A struck piano has no sustain to release, but it does have a
damper."* Nothing here adds anything to a note. What it does is decide
WHETHER AND HOW FAST the note is taken away, which is why the page is handed
a `release` and never a `hold`.

── THE FOUR THINGS A FIRST IMPLEMENTATION GETS WRONG ───────────────────────

🔴 1. TWO SETS, NOT ONE. What is under a finger and what is only under the
foot are different questions, and one set cannot answer both. A key pressed
AGAIN while the pedal is down leaves the pedal with nothing to release later,
so lifting the pedal cannot steal a note somebody is still holding.

🔴 2. THE THRESHOLD IS 64, NOT 127, AND IT READS AS A TYPO BECAUSE THE
CONTROLLER NUMBER IS ALSO 64. 📄 DOCUMENTED at midi.org, fetched 2026-09-22:
controller 64 is `Damper Pedal on/off (Sustain)`, *"≤63 off, ≥64 on"*, and
controllers 65 to 69 share the threshold. A test for `=== 127` works on a
cheap switch pedal and fails on an expensive one.

🔴 3. IT ACTS ONLY ON A CHANGE. A pedal held down repeats its value, and a
page that released every held note on each repeat would stutter under a foot
that is not moving.

🔴 4. SWITCHING THE KEYBOARD OFF FORGETS THE FOOT. A pedal left down across a
switch off would hold the next session's first note for ever, and nothing on
screen would say why.

── THREE THINGS THAT ARE ABOUT THIS DESK ───────────────────────────────────

🔴 WHICH CONTROLLER THE PEDAL IN THIS BUILDING SENDS IS UNVERIFIED, WHICH IS
WHY `cc` IS AN OPTION. `research/evo-mk425c-face-2026-09-21.md` records the
rear panel printing `SUSTAIN - C21`, and the manual quoted in
`plans/plan-fasttrack-mk425c.md` §4.5 says the footswitch is *"fully MIDI
assignable"*. So 64 is the DEFAULT and not a measurement. `demo/evo/`,
`demo/circuit/` and `demo/twelve/` all draw `demo/shell/midi-log.mjs` with
the raw bytes in a column, and four seconds in front of any of them settles
it.

🔴 AND ITS POLARITY IS SENSED AT POWER UP, WHICH IS WHY `raw()` EXISTS.
📄 DOCUMENTED, the MK-425C manual verbatim: *"On power up, the sustain pedal
is assumed to be in the OFF position. So, if you want the sustain pedal to be
off when it is unpressed, make sure the pedal is unpressed when you power
up."* A pedal held down while the keyboard boots is inverted for the whole
session. **A page cannot tell an inverted pedal from a pedal somebody is
holding and must not pretend to.** What it can do is print the raw value
beside the reading, so `64 = 127, pedal down` is visible to a player whose
foot is nowhere near it.

⚠️ SOSTENUTO (66) AND UNA CORDA (67) ARE REFUSED, NOT FORGOTTEN. The middle
pedal is a third set and about fifteen lines, and nothing on this desk sends
it. The left pedal shifts the action so the hammer strikes fewer strings,
which changes timbre and not just volume: there is no cheap version, and the
version that turns the volume down is a lie. `plans/plan-nola.md` §5.2.

<a id="damp-min"></a>

## pedal.mjs, DAMP_MIN

🔴 0.12 s, TAKEN FROM `rig/board/synth.mjs` RATHER THAN INVENTED HERE.
A real damper takes 50 to 150 ms to silence a string and longer in the bass,
so a note-off is a ramp and not a `stop()`. That file picked this number for
the same reason and there is no argument for a second one.

<a id="damp-max"></a>

## pedal.mjs, DAMP_MAX

⚠️ 0.9 s IS A GUESS AND IS MARKED AS ONE. It is what a damper riding just
clear of the strings ought to cost, and NOTHING ON THIS DESK CAN GRADE IT: a
switch pedal only ever sends 0 and 127, so the whole range between them is
unreachable here. `plans/plan-nola.md` §7 lists the listening test.

<a id="damper-sec"></a>

## pedal.mjs, damperSec

How long a note takes to die, at a given pedal value.

🔴 HALF PEDALLING IS A CONTINUOUS QUANTITY, AND THE BOOLEAN ABOVE THROWS IT
AWAY. A continuous pedal sends the whole 0 to 127 range on controller 64: the
damper rides just clear of the strings and SHORTENS the decay rather than
stopping it. Above the threshold the note is held and this never runs; below
it, the value still says how firmly the damper landed.

<a id="pedal-says"></a>

## pedal.mjs, PEDAL_SAYS

🔴 ONE WORDING FOR BOTH PAGES, FOR THE REASON `looper.mjs` KEEPS `LOOP_SAYS`.
A sentence copied into two pages is a sentence that will be improved in one
of them. ⚠️ And nothing here carries an em dash or a middot: every string a
visitor reads goes through a page's log, and `demo/shell/pedal-test.mjs`
checks these rather than trusting a sweep.

<a id="says-raw"></a>

## pedal.mjs, PEDAL_SAYS.raw

🔴 THE INVERTED PEDAL, SAID IN THE ONE PLACE A PAGE CAN HONESTLY SAY IT.

<a id="create-pedal"></a>

## pedal.mjs, createPedal

@param {object} o
@param {number} [o.cc] which controller the pedal sends. 64 is the default and
 is NOT a measurement of the pedal in this building. See the header.
@param {(note:number, sec:number)=>void} o.release  take this note away, over
 `sec` seconds. A page owns what that means on its own graph; this module
 owns whether and when.
@param {boolean} [o.flip] read the controller upside down, for a pedal whose
 polarity was sensed wrong at power up. See the header.
@param {(down:boolean, value:number, freed:number)=>void} [o.onPedal] the foot
 moved. Called only on a CHANGE, never on a repeat.
@returns {{keyDown, keyUp, control, panic, forgetKeys, down, raw, held,
          fingers, damper, switchy, moves, cc}}

<a id="two-sets"></a>

## pedal.mjs, createPedal, the two sets

WHAT IS UNDER A FINGER, AND WHAT IS ONLY UNDER THE FOOT.

<a id="reading"></a>

## pedal.mjs, createPedal, reading

🔴 THE CORRECTED VALUE, AND `raw` IS DELIBERATELY NOT CORRECTED WITH IT.
MEASURED on the keyboard in this building 2026-09-23: two press and release
gestures in front of `/evo/` both arrived as `B1 40 00` followed 0.40 s
later by `B1 40 7F`, which reads as pressing sending **0** and releasing
sending **127**, the opposite way round from the specification. The manual
says why: the polarity is sensed at power up, so a pedal held down, or a
normally closed one, is inverted for the whole session.
⚠️ AND THE FIX ON THE INSTRUMENT IS BETTER THAN THE FIX HERE. Power the
keyboard up with the pedal unpressed and it corrects itself. This exists
because the property expires at the next power cycle and nobody should have
to restart an instrument to play a page.
⚠️ `raw()` STAYS THE WIRE VALUE, which is the whole reason it exists: a page
printing `64 is 0, so the pedal reads down` is showing a reader the
correction happening. Printing the corrected number would hide the one fact
the cell was added to carry.

<a id="key-up"></a>

## pedal.mjs, createPedal, keyUp

A key came up. Returns true if the note was really taken away, false if
the foot kept it.

🔴 A NOTE NOBODY WAS HOLDING IS RELEASED ANYWAY AND IS NEVER TAKEN BY THE
PEDAL. Releasing one costs nothing and can never hang; HOLDING one
invents a note that lifting the pedal would then stop, on a page where
nobody played it. Note offs with no matching note on are ordinary: a
panic, an engine that silenced its own voices, a keyboard replugged
mid-chord. This is the half of the asymmetry that matters, because a stuck
note is the worst failure a MIDI page has, and a spurious release is not
a failure at all.

<a id="double-off"></a>

## pedal.mjs, createPedal, keyUp, a second note off

🔴 AND A SECOND NOTE OFF FOR A NOTE THE FOOT ALREADY HAS RELEASES IT
        TWICE, WHICH IS WHY `was` IS NOT THE WHOLE TEST. A keyboard sending two
        releases for one key is ordinary (a note on at velocity 0 followed by a
        real 0x80 is the commonest shape of it), and reading only `was` sends
        the second one straight past the pedal to the instrument: the note
        stops under a foot that is still down, and the lift releases it again
        afterwards. FOUND BY SABOTAGE, not by reading.

<a id="control"></a>

## pedal.mjs, createPedal, control

A controller arrived. Returns true if the foot actually moved.

⚠️ IT READS EVERY VALUE AND ACTS ON THE CHANGES. The raw value is kept
whatever it is, because `raw()` is what makes an inverted pedal visible
and a pedal that repeats 127 is still reporting where it is.

<a id="freed"></a>

## pedal.mjs, createPedal, control, everything the foot holds

🔴 EVERYTHING THE FOOT HOLDS, AND THE FILTER THAT USED TO BE HERE WAS
        DEAD CODE. `/muta/` wrote `if (!keysDown.has(n))` on this line, which
        is the two-set rule stated a second time, and the two sets are DISJOINT
        by construction, because `keyDown` takes a note off the foot the moment
        a finger is back on it. So that test could never be false.
        ⚠️ IT WAS FOUND BY SABOTAGE AND WOULD NOT HAVE BEEN FOUND BY READING.
        Removing the filter left the whole test file green, which is this
        project's own signal that a guard is not reachable: LESSONS' dead CSS
        rule and dead `fullSupport()` branch are the same shape. Two guards on
        one rule, only one of them reachable, and the unreachable one reads as
        correct for ever. The rule is enforced in ONE place now, at `keyDown`,
        and test 5 in `pedal-test.mjs` goes red when that place is broken.

<a id="set"></a>

## pedal.mjs, createPedal, set

The foot moved, said by a control on the page rather than by a wire.

🔴 THIS EXISTS BECAUSE `flip` CORRECTED THE PAGE'S OWN SWITCH TOO, AND
THAT WAS A CONTROL THAT LIED. A SUSTAIN switch on a page is not the
instrument: it is somebody saying `the dampers are up`, and running that
through `control()` meant the correction for a backwards KEYBOARD also
reversed a button nobody had mis-wired. MEASURED under `?flip=1`, which
took four asserts red and would have shipped a switch that turned sustain
off.
⚠️ `raw` IS STILL SET, to the byte a pedal in this state WOULD have sent
on this instrument. A page printing the raw value beside the reading has
to have something to print, and a stale number from the last real message
would be worse than none.

<a id="wire"></a>

## pedal.mjs, createPedal, wire

The byte a pedal in this state would put on the wire HERE, flip included.

⚠️ IT IS FOR A CHECK, and it exists so the arithmetic has one home. A
page's own check drives `control()` because that is the only part of the
real MIDI path a harness can reach, and hard coding 127 there makes every
pedal assert wrong the moment somebody opens the page upside down.

<a id="panic"></a>

## pedal.mjs, createPedal, panic

Forget everything, foot included. For a page switching its keyboard off.
It releases NOTHING: a page doing this is already sending its own
all-notes-off, and a second one down a path this module cannot see is how
a panic ends up being sent twice.

<a id="panic-raw"></a>

## pedal.mjs, createPedal, panic, the byte that means up

🔴 THE BYTE THAT MEANS UP HERE, NOT THE NUMBER 0, AND THIS LINE SAID 0
        UNTIL 2026-09-23. On a pedal read upside down, 0 IS the foot going
        down, so a panic left `down` false beside a raw value meaning down, and
        the damper time is read off the raw value: every release after a panic
        took 0.9 s instead of 0.12. MEASURED as one red assert on `/nola/`
        under `?flip=1`, on a page where nothing else was wrong.
        ⚠️ THE SHAPE IS THE LESSON. A reset that writes a LITERAL into a field
        whose meaning depends on a setting is a reset that is only correct at
        the default.

<a id="forget-keys"></a>

## pedal.mjs, createPedal, forgetKeys

Forget what is down, and keep the foot where it is.

⚠️ THIS IS NOT `panic()` WITH LESS IN IT. `/muta/` needs it because its
engine silences every level-patched voice when a drone starts, so notes
the page still thinks are down no longer exist and a pedal lifting later
would send note offs for notes nobody is holding. The foot has not moved,
so clearing `down` would be a second lie on top of the first.

<a id="test-header"></a>

## pedal-test.mjs, file header

demo/shell/pedal-test.mjs. The sustain pedal's arithmetic, with no audio.

  node demo/shell/pedal-test.mjs

`createPedal` is two sets, a threshold and a change filter, and every bug a
sustain pedal has ever had lives in one of them: a lift that steals a note
still under a finger, a test for 127 that works on a cheap pedal and fails on
an expensive one, a repeat that stutters under a foot that is not moving, and
a foot remembered across a switch off. None of those needs a browser, and
`plans/plan-nola.md` §5.1 names all four before any of them was written.

NINETEEN OF THESE ARE NEGATIVE CONTROLS: they are written so that the bug they
describe would fail them, rather than so that today's code passes. The bug is
named in the comment above each one.

🔴 AND SEVEN DELIBERATE SABOTAGES TAKE BETWEEN 1 AND 4 OF THEM RED, MEASURED
2026-09-22 rather than claimed: a threshold of `=== 127` costs 2, a `keyDown`
that does not take a note off the foot costs 3, no change filter costs 1, a
panic that keeps the foot costs 2, a `keyUp` reading only `was` costs 2, a
constant damper time costs 4, and a `forgetKeys` that leaves the keys alone
costs 1. That list is the only reason to believe any of this grades anything.

🔴 ONE OF THOSE SABOTAGES CAME BACK GREEN THE FIRST TIME AND FOUND A REAL
DEFECT. `if (!keysDown.has(n))` at the pedal lift, copied over from
`/muta/`, was UNREACHABLE: the two sets are disjoint by construction, so the
test could never be false. Removing it changed nothing, which is this
project's own signal for a dead guard. What the hunt for a reachable path
then turned up is test 19, a duplicate note off releasing a note twice, which
was a live bug in `/muta/` and is fixed in both.

<a id="test-flip"></a>

## pedal-test.mjs, test 21, flip

21. MEASURED on the keyboard in this building 2026-09-23: two press and
    release gestures both arrived as `B1 40 00` then `B1 40 7F` 0.40 s later,
    so pressing sends 0 and releasing sends 127. `flip` reads it the right
    way up without touching the instrument.

<a id="test-panic-flip"></a>

## pedal-test.mjs, test 29, panic under flip

29. NEGATIVE CONTROL. A panic must leave the raw value meaning UP on THIS
    instrument, not the literal 0. On a flipped pedal 0 means down, so a
    panic used to leave the reading contradicting `down`, and the damper time
    is read off the reading: every release after a panic took 0.9 s instead
    of 0.12.

<a id="test-no-dashes"></a>

## pedal-test.mjs, test 18, no em dash or middot

18. Nothing a visitor reads carries an em dash or a middot. CLAUDE.md, and
    the reason this is code rather than a sweep is that two formatters in
    `shell.mjs` were stamping middots in under a comment calling one "already
    this project's separator".

<a id="test-double-release"></a>

## pedal-test.mjs, test 19, double release

19. NEGATIVE CONTROL, AND IT IS THE ONE THAT FOUND A REAL BUG. A keyboard
    sending two releases for one key is ordinary: a note on at velocity 0
    followed by a real 0x80 is the commonest shape of it. Reading only
    "was this key down" sends the second one past the pedal to the
    instrument, so the note stops under a foot that is still down and the
    lift releases it a second time afterwards.
