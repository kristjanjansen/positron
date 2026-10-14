# Kit lessons: pad.mjs

The long comments cut from `demo/shell/pad.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-pad.md#<anchor>`.

<a id="header"></a>

## pad.mjs, file header

demo/shell/pad.mjs — a square button that can be lit, and a grid of them.

🔴 WHAT IT IS FOR. A beat grid, and a device whose pads are physically
coloured. Asked for 2026-09-20: *"squared-colorable-button for beat grid (can
be label on it)"*.

🔴 AND IT BREAKS THIS PROJECT'S COLOUR RULE ON PURPOSE, WHICH IS WORTH
WRITING DOWN RATHER THAN DOING QUIETLY. CLAUDE.md: *"A mark's colour says HOW
IT LANDED, never which lane it is in"*, because a strip already carries lane
identity in the row, the label and the gutter swatch, and a fourth channel
saying the same thing crowds out the one channel that has something new to
say.
**A pad grid is not a strip and has none of those three.** A pad has no row
to sit in, no gutter beside it and no label unless somebody puts one on its
face. On the hardware this mirrors, the pads are LITERALLY different colours,
and a grid that renders a Circuit's four coloured tracks in one grey is a
grid that has thrown away the only thing telling them apart.
⚠️ SO THE RULE STANDS WHERE IT WAS WRITTEN and this is a second surface with
a second answer. **Do not carry this back to `strip.mjs`.**

⚠️ A LABEL ON THE FACE IS OPTIONAL AND SHOULD USUALLY BE EMPTY. Sixteen pads
each carrying a word is sixteen things to read in a shape whose whole point
is that you take it in at a glance. Numbers on the downbeats, or nothing.

<a id="create-pad"></a>

## pad.mjs, createPad options

One pad.

@param {object} o
@param {string} [o.label]   ON THE FACE. Two or three characters at most.
@param {string} [o.top]     ABOVE the pad, its own, not the grid's. Asked for
 2026-09-20: *"each beatgrid/halfbutton have their own on-button and top
 label"*. They are two different jobs: the face label is read while you are
 looking at the pad you are about to hit, the top label names what that pad
 IS and is read once. A grid where only some pads carry one is normal and is
 how a beat grid marks its downbeats.
@param {string} [o.bottom]  BELOW the pad. Asked for 2026-09-20: *"rec mute
 solo should have bottom label (still have on-butotn and top label available
 in conf)"*, so a pad now has three text slots and a caller picks.
 🔴 **THEY ARE THREE DIFFERENT JOBS, NOT THREE PLACES TO PUT THE SAME
 WORD.** The FACE is read while you are looking at the pad you are about to
 hit, so it is a number or two characters. The TOP names what the pad IS and
 is read once. The BOTTOM is where hardware prints a button's name, under
 it, which is why a mixer strip wants it: the panel it mirrors does the same.
 ⚠️ A PAD WITH NO BOTTOM LABEL GETS NO SLOT AT ALL, unlike the top, which
 always reserves one. A grid names its downbeats and leaves the rest empty,
 so those pads must still line up; a bottom label is either on every pad in a
 row or on none, so a reserved empty line would just be a gap.
@param {string} [o.tint]    any CSS colour, or a `--var(...)`. Off pads show a
                           trace of it so a grid reads as coloured lanes even
                           when nothing is on.
@param {boolean} [o.on]     lit
@param {string} [o.title]   hover text, which is where a long name belongs
@param {string} [o.aria]    accessible name, defaults to `label` or `title`
@param {(on:boolean, pad:object)=>void} [o.onPress]
@param {boolean} [o.latch]  default true: a press toggles and stays. `false`
                           makes it momentary, which is what a trigger pad is.
@param {boolean} [o.small]  THREE QUARTERS OF A PAD, in every shape. Asked for
 2026-09-23 on `/evo/`: *"do you have small version of pad buttons?"* and
 *"also smaller versions of +- circlar ones"*. A panel MIRROR draws buttons
 at the size the real ones are relative to everything around them, and the
 standard `--ctl-w` is sized for a control somebody presses with a finger.
 ⚠️ IT SCALES THE BOX AND NOT THE TYPE. A face at three quarters would be
 unreadable, and the whole reason a face exists is to be read.
@param {boolean} [o.round]  A CIRCLE, 10 per cent smaller than a square pad.
 Asked for 2026-09-21: *"add circular buttons too (based on pads buttons,
 10% smaller) top on-button bottom labels"*.
 🔴 **IT IS THE SAME COMPONENT, NOT A NEW ONE**, which is the whole reason
 it is a prop: all three label slots work, the tint works, disabled works,
 latch works. A round button that could not carry a bottom label would be a
 second pad to keep in step with the first.
 ⚠️ **AND IT IS SMALLER, SO A ROW OF THEM IS SHORTER THAN A ROW OF SQUARES.**
 The head and foot are untouched, so labels still line up across kinds, but
 a column mixing round and square pads will not have its BUTTONS on one
 grid. That is what 10 per cent means and it is the caller's to know.
 ⚠️ IT DOES NOT COMBINE WITH `half`: a half height circle is an ellipse, and
 an ellipse is not a thing this kit draws. `round` wins and says so.
@param {boolean} [o.half]   HALF HEIGHT. Asked for 2026-09-20: *"halfheigt
 buttons; they are just pads with half height (a prop)"*, after a separate
 half-height option had been built onto `button-group.mjs`. That was the
 wrong home and it was reverted: a half-height button in a grid IS a pad, it
 just is not square, and having one component with a proportion prop beats
 two components that have to be kept in step.
@param {boolean} [o.disabled]  refuses presses and says so. See the note on
 `enable` below, because a disabled control has a cost in this project.
@returns {{el:HTMLElement, set:Function, on:()=>boolean, tint:Function,
          flash:Function, presses:()=>number}}

<a id="aria-pressed"></a>

## pad.mjs, createPad, aria-pressed

🔴 `aria-pressed` ONLY WHEN IT LATCHES. On a momentary pad the attribute
would announce a state that is never held, and `button-group.mjs`'s header
already records that this attribute is the channel an armed control is read
through. A trigger is not an armed anything.

<a id="wrapper"></a>

## pad.mjs, createPad, the wrapper

🔴 THE TOP LABEL IS OUTSIDE THE BUTTON, WHICH IS WHY THERE IS A WRAPPER.
Inside it would be part of the pressable surface and part of what a screen
reader announces as the button's name, and it would fight the face label
for the same square. Outside, the pad stays square and the label is free to
be wider than it.
⚠️ A PAD WITH NO TOP LABEL STILL GETS THE WRAPPER AND AN EMPTY SLOT. Without
the slot, a grid where only the downbeats are named would have four pads
sitting lower than the other twelve, and a row of pads that do not line up
reads as a rendering fault rather than as a labelling choice.

<a id="wrapper-disabled"></a>

## pad.mjs, createPad, wrapper disabled

🔴 THE WRAPPER CARRIES THE DISABLED STATE TOO, BECAUSE THE LABELS ARE NOT
INSIDE THE BUTTON. Reported 2026-09-21: *"main sub labels should be darker
(disabled rihht?)"*, about two pads that were correctly disabled and whose
names underneath were at full strength. `.pos-pad:disabled` dims the
button and cannot reach a sibling.
⚠️ IT IS THE SAME WRAPPER VERSUS BUTTON BOUNDARY that made an alignment
assert report a button 17 px low while the button was exactly right. **A
component whose visible extent is bigger than its interactive element has
to say so twice**: once where it can be pressed, once where it can be read.

<a id="data-on"></a>

## pad.mjs, set, data-on

⚠️ AN ATTRIBUTE THAT IS DELETED RATHER THAN EMPTIED. `[data-on]` matches
on PRESENCE, so `= ''` leaves a pad that was lit once looking lit for the
rest of the page's life. Measured in `video-panel.mjs`, 2026-09-19.

<a id="flash"></a>

## pad.mjs, flash

Light it for one moment, for a step head walking a grid or a note arriving
from a device.
⚠️ IT IS A CLASS AND A TIMER RATHER THAN A CSS ANIMATION RESTART, because
retriggering an animation needs a reflow and a grid of sixteen doing that
on every sixteenth note is a layout thrash nobody needs.

<a id="enable"></a>

## pad.mjs, enable

🔴 A CONTROL YOU DISABLE IS A CHECK THE HARNESS CAN NO LONGER REACH, and
this project has measured that twice in one day on two pages: switching
buttons off when a capability was missing took ten asserts silent on one
and six on another, while both pages read green. **Disable a control that
genuinely cannot do its job**, because a button that lies is the worse
defect, and then make sure whatever sat behind it is reachable another
way.
@param {boolean} yes
@param {string} [why]  shown on hover. A disabled control with no reason
                      is indistinguishable from a broken one.

<a id="create-pad-grid"></a>

## pad.mjs, createPadGrid options

A grid of pads.

@param {object} o
@param {number} o.cols   how many across. **This is the beat, so it is the
                        number that matters**: 16 for sixteenths of a bar.
@param {number} [o.rows] default 1
@param {(x:number, y:number)=>object} [o.pad]  options for the pad at x, y.
 ⚠️ An `onPress` returned from here is a PER PAD handler and it runs, before
 the grid's. It was silently discarded until 2026-09-25; see the note where
 the pads are built.
@param {(on:boolean, x:number, y:number, pad:object)=>void} [o.onPress] the
 whole grid's handler, which is told which pad it was.
@returns {{el:HTMLElement, pads:object[][], at:Function, column:Function,
          lit:()=>number, clear:Function}}

<a id="pad-cols"></a>

## pad.mjs, createPadGrid, --pad-cols

⚠️ THE COLUMN COUNT IS A CUSTOM PROPERTY, NOT AN INLINE `grid-template`.
A component that writes the property itself writes a rule nothing can
override, including its own stylesheet, which is the defect
`video-panel.mjs` shipped with its `aspect` option.

<a id="collapse-labels"></a>

## pad.mjs, createPadGrid, collapsing label slots

🔴 A GRID WITH NO LABELS AT ALL COLLAPSES ITS LABEL SLOTS. Reported
2026-09-21 with a screenshot of a 4 by 8 grid: *"make same horz vert gap"*.
Every pad reserves its top slot whether or not it uses one, so a grid of
unlabelled pads was adding 15 px to every row gap and none to the column
gaps: 8 px across and 23 px down, from one `gap` value.
⚠️ **THE RESERVATION IS STILL RIGHT AND IT IS WHY THIS IS DECIDED PER GRID
RATHER THAN PER PAD.** A row where only the downbeats are named must keep
the slot on the others, or four pads sit higher than twelve. A grid where
NOTHING is named has nothing to line up with, so the slot is only air.
⚠️ THE SPECS ARE READ FIRST FOR THIS, which is why the loop builds them all
before building any pad: a decision about the whole grid cannot be made
halfway through creating it.

<a id="both-handlers"></a>

## pad.mjs, createPadGrid, both handlers run

🔴 BOTH HANDLERS RUN. THE GRID'S OWN USED TO OVERWRITE THE PAD'S AND
NOTHING SAID SO. `createPad` documents `onPress` as a pad option and
`pad(x, y)` returns pad options, so the API invited a per-pad handler
and then spread it straight into the property the line below replaced.
A caller got no error, no warning and a pad that still lit on every
press, because the flash is this component's own.
🔴 MEASURED AS A LIVE DEFECT 2026-09-25 ON `/evo/`: a deliberate
sabotage of a per-pad handler came back GREEN, because that handler had
never run in the first place. That is `/stage/`'s dead buttons in a
second costume, and this one is harder to see: the name is right, the
wiring is right, and the LEVEL is wrong.
⚠️ THE PAD'S OWN GOES FIRST, because it is the more specific statement
and a grid level handler is usually the one that logs or routes. If the
pad's throws, the grid's does not run, which is ordinary and is how a
caller finds out.
⚠️ AND A GRID WITH NO PER PAD HANDLER IS UNCHANGED, which is every
caller today.
