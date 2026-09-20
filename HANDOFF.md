# Handoff, 2026-09-21, session 38

🔴 **READ THIS FIRST: ONE THING NEEDS A HUMAN AND IT IS A GIT REMOTE.**
`origin/main` on `kristjanjansen/positron` points at **`4add323`**, a commit
whose message is about a Circuit pack and whose content is 57 plan renames.
**That is my mistake.** A `cd` into a scratch directory failed, so the git
commands after it ran inside this repo: they committed the staged renames under
the wrong message, renamed the branch to `main`, and pushed.

**Local is fully repaired** and this session's work is now committed on
`session-28-station-videoradio`. `archive/` was reverted as part of that repair,
because the reference sweep had rewritten 7 files in there that it had no
business touching: an archive records what was there.

**The remote is not repaired**, because the force push is blocked by a safety
classifier here. It needs one line from a person. `6a8befc` is an ancestor of
the current head, so nothing is lost either way:

```sh
gh auth switch --user kristjanjansen
# a true undo: main back to where it was
git push --force-with-lease=main:4add3238cd812195db75fddfe405786fe5359a8b origin 6a8befc:main
# or, if main should carry session 38 after all:
# git push --force-with-lease=main:4add3238cd812195db75fddfe405786fe5359a8b origin HEAD:main
gh auth switch --user Kristjan-Jansen_enefit
```

## The one that mattered: a Circuit backed up, and verified twice

✅ **`New Pack.circuitpack` IS IN THE REPOSITORY ROOT AND MUST NOT BE DELETED.**
CLAUDE.md carries a section about it. The Circuit has **no factory reset and
therefore no undo**, and three ordinary operations in Novation Components
replace its contents.
✅ **ALSO AT `kristjanjansen/packs`, PRIVATE**, with a README explaining how to
verify one and what destroys a Circuit. **Round tripped: downloaded back from
GitHub and md5 compared, identical.** `91f6e2583e8d980069770caa1c5c6be6`.
🔴 **THE 32 USER SESSIONS ARE NOT IN IT AND THE USER SAID THEY ARE THE PART
THAT MATTERS**: *"user sessions are mine. very important"*. What is backed up is
the PACK: patches, samples, and the pack's own session slots. Getting the 32
live sessions off the device is a Components operation nobody has run yet, and
it is the top line of `BACKLOG.md`.
⚠️ **AND SESSION NAMES ARE NOT EVIDENCE OF SESSION CONTENT.** That was the
mistake this rule came from: a list of names was read as a list of empties.
Re-measured properly, **32 distinct fingerprints and not one empty**.

## What is new, and where to open it

Both are local only. `node demo/server.mjs` first, then:

- **http://127.0.0.1:8890/circuit/** — the Novation Circuit's panel, drawn and
  live. 22/22. Macros are CC 80-87 on channel 1; the filter is CC 74 on
  **channel 16**, which is measured and is not what any manual says.
- **http://127.0.0.1:8890/rack/** — the TASCAM Model 12's panel. 31/31. Eight
  channel strips that scroll, an FX and master lane pinned right.
- **http://127.0.0.1:8890/able/** — the Ableton demo, which used to be `/rack/`
  and gave the slug up to the mixer that has the hardware.
- **http://127.0.0.1:8890/kit/** — the three new controls are at the top.

Deployed pages are unchanged by this session apart from the build output. The
last deploy stamp built here is `c869cf9-222320-23b2`; **it has not been
deployed**, so nothing above is at positron.studio yet.

## Three controls joined the kit

`demo/shell/knob.mjs`, `demo/shell/pad.mjs`, `demo/shell/fader.mjs`.

- **The knob is dragged vertically, and that was researched rather than
  guessed.** Circular dragging is the historically fiddly one: the pointer
  leaves the knob, the angle jumps across the discontinuity, and a small knob
  gives a small radius to aim at. Vertical drag with `movementY`, a
  `ns-resize` cursor as the signifier, and a 270° arc, which is the arc a real
  potentiometer has.
- **The pad is one square button with an optional label over it and under it**,
  a latch mode, a tint, a half height mode and a round mode. `createPadGrid`
  collapses the label slots when no pad in the grid has one.
- **The fader is the horizontal slider turned 90°, value for value.** No fill:
  the handle is the reading. The invisible hand is a MODE rather than a second
  control, so the fader's own size never changes when it is switched on.

🔴 **AND THE LAYOUT CONTRACT BETWEEN THEM IS FOUR CUSTOM PROPERTIES ON
`:root`**, written up in CLAUDE.md. A control publishes one head and one foot
and nothing else it grows may count, or two controls in a row cannot line up.

## What is measured, and what is still a guess

`measured-devices-2026-09-20.md` is the file that outranks the plans. Every
number in it came off the wire through `/dump/`.

- **The Model 12's pan encoders send a magnitude of 2 per detent at a slow
  turn.** `MAX_STEP = 8` in `/rack/` is a ceiling for a FAST turn and is
  **still a guess**: nobody has measured what a spin sends.
- **The M-Audio Fast Track Pro sends no MIDI of its own.** It is an interface.
  Reported by the user as *"maudio does nada"* and confirmed on the wire.
- **The MK-425C's encoders are absolute, not relative.** The classifier said
  relative once and was wrong; it asks the sign bit now.

## `/circuit/` sends now, and nobody has heard it

The page drives the hardware: **note on, note off, MIDI Start and Stop**, and
that is the entire list. Press **Listen**, arm a track, press pads.
`Syn1` is channel 1, `Syn2` is channel 2, the four drums are channel 10 at notes
60, 62, 64 and 65. The two `Sc` buttons arm nothing, because a sidechain is not
something to play notes at.

🔴 **NO RECORD, AND IT IS NOT A DISABLED BUTTON.** `send()` has no path for a
control change, a program change or SysEx on any channel, so a record command
**cannot be expressed** and deleting the `disabled` flag still cannot produce
one. The check fires the guard on purpose with four shapes that could touch a
recording or move a patch, and puts a negative control beside it: notes and
transport really do go through, or a guard that refused everything would pass
while making the page inert.

🔴 **EVERY ASSERT GRADES THIS PAGE'S SIDE OF THE WIRE.** What was sent, what was
refused, which track is armed. **A counter on the sending side is not evidence
the device did anything.** Three things only the hardware can answer are in
`BACKLOG.md`: whether the synths respond on channels 1 and 2, whether the drum
notes are right, and whether Start is obeyed at all, given this Circuit was
measured **sending its own clock continuously**, which makes it the master.
⚠️ The pad to note map is a CHOICE, not a measurement: chromatic from 48, bottom
row lowest, because three notes out of thirty two have ever been seen.

## Open, in priority order

1. **The 32 user sessions off the Circuit.** Asked for, not done.
2. **`origin/main`**, above.
3. **`/circuit/`: how wide the card should be, asked and not settled.** *"add
   outer padding to fit w and get ~same padding on bottom"*. The card hugs at
   about 600 px; filling a 1200 px window puts 300 px either side, so a matching
   foot is 300 px deep. `BACKLOG.md` has the three readings and what each costs.
4. **`/rack/`: three layout asks are not done** — *"tascam: align channel strip
   content to bottom"*, *"align main/sub to the bottom"*, *"model 12: title to
   right"*.
5. **Nothing on either new page is graded on a phone.** The harness runs at
   756 px and never enters the media query, so every phone rule on `/rack/` and
   `/circuit/` is the fourth kind of dead CSS until something measures it.
