# Kit lessons: button-group

The longer comments cut from `demo/shell/button-group.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-button-group.md#<anchor>`.

<a id="header"></a>

## `button-group.mjs` module header

```text
demo/shell/button-group.mjs: two or more buttons that each DO something,
sharing one label and one row.

🔴 IT IS NOT A CHOICE, AND THE LINE BETWEEN THEM IS THE ARMED STATE, NOT THE
JOIN. `choice.mjs` is a segmented control where exactly ONE option is armed
and the others are the alternatives you did not pick. Here every button is an
action, pressing one says nothing about the others, and pressing both in turn
is the normal thing to do.

🔴 SO IT IS SEGMENTED TOO, AND THIS REVERSED ON 2026-09-19. It shipped with
`gap: 8px` between the buttons on the argument that joining them would claim
the page can only be in one of them. REPORTED on the first page to use it,
with a screenshot: *"i do not see buttongroup vr xr"*. Both buttons were
there, both were correctly switched off, and what was missing was the GROUP:
two boxes with air between them are what two unrelated controls look like.
`choice.mjs`'s own header had already settled this and the answer was not
carried over: *"Gaps between the options make three choices look like three
unrelated controls, and put the label further from what it labels than the
options are from each other."*

🔴 AND THE "IT WILL READ AS A CHOICE WITH NOTHING CHOSEN" OBJECTION IS REAL,
SO HERE IS WHAT ANSWERS IT, IN THREE CHANNELS A READER CAN SEE. It is not
the join: `/stage/` proves a segmented row with nothing armed is a legal
choice state, so the join alone cannot carry the difference.
  1. NO `aria-pressed`, EVER. That attribute is the channel a choice arms,
     both for a screen reader and for the `--hi` tint keyed on it in
     shell.css, so a group that never writes it can never paint an armed
     option and can never be announced as one. `/kit/` grades its absence.
  2. THE BUTTONS ARE FULL SIZE. A choice's options are 11 px words in an
     11 px pad, because they are values being compared; these keep the
     control row's own 13 px and 18 px, because they are things you press.
     On `/mirror/` a group sits in the same row as three choices and the two
     are visibly different sizes of object. `/kit/` grades that too.
  3. THE WORDS ARE VERBS. `Run in VR` is a thing to do; `2`, `8`, `24` are
     values to pick between. That one is editorial and is on the caller.

🔴 AND IT EXISTS BECAUSE FOUR PAGES HAND-ROLLED THE SAME ROW. Asked
2026-09-19: *"global: make buttongroup component and convert all vr/ar
buttons to it"*. `/weight/` calls them `vr` and `ar`, `/blocks/` says `enter`
and `ar`, `/floor/` has `vr`, `/mirror/` has `xr` and `ar`. Three spellings
for one control is the drift a component removes.

🔴 MOUNT IT INSIDE `.pos-controls`. `demo/verify.mjs` and
`demo/verify-gl.mjs` both press `.pos-controls button`, which is a DESCENDANT
selector, so a wrapper inside the row keeps every button pressable by the
harnesses. A group that moves these buttons out of that row silently stops
them being exercised, which is the failure `/mirror/` has already paid for
once when a stepper moved into the knob row.

⚠️ THE GROUP OWNS DISABLED, AND THAT IS ITS SECOND JOB. Whether a headset
session can be opened is a per-button fact that arrives late (see
`xr-caps.mjs`), so the four pages need one way to say it rather than four:
`enable(id, yes, reason)`. A disabled button with no reason is worse than an
enabled one, so the reason is not optional.

⚠️ NO GLYPH HANDLING HERE. `mount()`'s own row detects a one-character label
and squares the button up with `centreSymbol`, because a picture is drawn
small and high in a box sized for a capital. A group is for named actions; a
glyph control belongs in the shell's row where that already happens.

🔴 BUT AN ICON IS, SINCE 2026-10-10: `{ id, icon: 'play', label: 'Play' }`.
Asked as *"Use transport icons on all our concepts. Keep them square. Kit
iconbutton (group?)"*. The button is `icon-button.mjs`'s square, the label is
its accessible name and hover text rather than its face, and `setIcon(id,
name, label)` swaps play for stop. It is an option here rather than a second
group component because the join, the busy sweep and the disabled reason are
this file's, and a copy of them would be the drift this file was built to
stop.
```

<a id="orient"></a>

## `button-group.mjs` orient column

```text
asked 2026-10-06 for a slide: *"4 buttons vertcally grouped on the right"*
```

<a id="join"></a>

## `button-group.mjs` row join

```text
⚠️ `step pos-seg` IS THE JOIN, AND IT IS REUSED RATHER THAN REIMPLEMENTED.
The 1 px border overlap, the outer-only corners and the raise on hover all
live in that one block in shell.css, and `choice.mjs` and `stepper.mjs`
already wear it. A second copy here is the drift `/kit/` exists to catch,
and it is also how the two would come to disagree by a pixel.
```

<a id="off"></a>

## `button-group.mjs` off set

```text
Which ids are off, and why. Held rather than read back off the element,
because the busy treatment below borrows `disabled` for a second purpose
and the two must not be able to disagree.
⚠️ DECLARED ABOVE THE LOOP THAT CLOSES OVER IT. A `const` left below the
block that reads it is this repo's most repeated defect, and a click
handler is exactly the reader that would find it years later.
```

<a id="repeated-id"></a>

## `button-group.mjs` repeated id

```text
🔴 A REPEATED ID IS REFUSED. `button(id)` and `enable(id, …)` would answer
about the first of two, so the second would be a control that cannot be
disabled and cannot be found, while every line of the page reads correct.
```

<a id="no-aria-pressed"></a>

## `button-group.mjs` no aria-pressed

```text
⚠️ NO `aria-pressed` HERE OR ANYWHERE BELOW. It is the choice's channel,
and it is what a screen reader announces as "pressed" and what shell.css
keys the armed tint on. A group of actions has nothing selected, so
writing it would be the one change that turns this into a choice.
```

<a id="busy"></a>

## `button-group.mjs` busy press

```text
The shell's control row does exactly this for a handler that returns a
promise: disabled so a second press cannot start a second run, and swept
by the one busy highlight this project has. A group button sitting beside
a shell button and behaving differently under a slow press is the drift
this component was built to stop, so it keeps the same contract.
⚠️ NO SPINNER AND NO LABEL CHANGE, for the reason written in shell.mjs:
both resize the button and the row reflows under the pointer.
```

<a id="after-busy"></a>

## `button-group.mjs` after busy

```text
⚠️ IT GOES BACK TO WHAT THE CAPABILITY SAID, not to enabled. A press
that finishes must not re-open a control this browser cannot use.
```

<a id="enable"></a>

## `button-group.mjs` enable

```text
Turn one button on or off, and say why when it goes off.

🔴 THE REASON IS REQUIRED ON THE WAY OFF. A grey control with no
explanation reads as a broken page rather than as a browser that cannot do
the thing, and this project already answers that question the same way for
the index: `caps.mjs` un-links a row WITH the reason in words. Refused here
rather than drawn, the way `mount()` refuses an odd readout.
⚠️ THE LOOK IS NOT SET HERE EITHER. `button[disabled] { opacity: .4 }` is in
shell.css and is the one disabled appearance in the project.
```
