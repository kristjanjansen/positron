---
name: positron-describe
description: How to write the words a visitor reads about a page, and how to decide what they say. Load before writing or changing any card description (a `say` in demo/concepts/list.mjs, CONCEPTS or DEMO_CARDS), a `one` line in demo/manifest.mjs, a page's `what` text, or a readout key a visitor reads, and before checking somebody's proposed copy against a page.
---

# Describing a page

Written 2026-10-12 from the rewrite of every card on /concepts/ (85 cards,
`plans/plan-card-descriptions.md`), from the owner's brief: answer the relevant
of *what can I do here, what will I see, hear or control, what makes this
different, what technical or artistic idea it reveals*; no rigid formula;
archives and performances are not software tutorials. And, verbatim: *"These
rewrites are proposed copy, not verified descriptions of the implementations.
Check every claim against the source code and actual behavior ... When an
example overstates the implementation, correct it rather than modifying the
implementation to match the copy."*

This skill is the editorial half. The furniture rules (no jargon, a number in a
readout cell not a sentence, a tooltip is two lines) are `positron-ui`; the
plain voice and the anti-slop pass are `positron-slides`. Load them too.

## Who reads it, and where

- **A card is read by somebody choosing where to click**, on /concepts/ or the
  front page, beside forty others. It has to say what this one is, and why it
  is not the card next to it. It is not the page's manual: what to press is the
  control's label, what a number means is the readout key.
- **A `what` is read by somebody already on the page**, looking at it. It may
  say more about how, never less about what.
- The words on a card and the page's `what` are the same claim at two sizes.
  When one changes, read the other.

## Verify before you write

Every claim on a card is a claim about code, and nobody type-checks a sentence.
Before writing, read the page, find the line that backs each claim, and run it
headless when the claim is about behaviour (our pages and the relay only, the
fake camera, never somebody else's server: `CLAUDE.md`). Write down the line
next to the sentence. A claim you cannot point at does not go on the card.

The claims that went wrong in 2026-10-12's drafts, and that are worth checking
on every page, because they are the ones copy reaches for:

- **"Compare"**: is there a second thing on the page, and what does the page
  actually compare with? A crossfader, two scopes, a readout cell, or only the
  eye?
- **"Connect", "build", "patch"**: does the visitor make the connection, or
  pick from fixed steps while the patchbay draws it?
- **"Scrub", "loop", "go back"**: read the transport's options. `scrub: false`
  is common.
- **"Two computers", "remote", "join"**: count the tabs and the machines. A
  simulated clock in one tab is not a second computer.
- **"Live", "MIDI keyboard", "camera"**: is the input real, and is it real
  only when something is plugged in or answers?
- **"Delay", "how late", "arrives"**: which delay, measured where, from what to
  what? A network round trip is not glass to glass, and a one-tab page has
  nothing that arrives.
- **"Every"**: count it. `every 1965 newsreel` was one series with sixteen
  films left out on purpose.
- **"Simulated", "use a simulation"**: is it a choice or an automatic
  fallback? Say which.

## Choose which question this card answers

Not every card answers all four. Pick by asking what makes this card different
from its neighbour, and lead with that.

- **What can I do here** leads when the doing is the idea: an instrument, a
  recorder, a pad. *"Press play for a held note and drag across the pad. Left
  to right opens the filter and bottom to top raises its resonance."* (draw/000)
- **What will I see or hear** leads when the visitor watches more than acts: a
  picture coming back, a station, a timeline.
- **What makes it different** leads in a series. The tenth synth card must not
  read like the first. synth/110's difference is that the notes are fixed and
  only the sound changes: *"Emilie Gillet's Plaits plays one looping four note
  line, and a patch picker changes only the sound."*
- **What idea it reveals** leads on the clock and streaming pages, where the
  mechanism is the subject. Name the mechanism by what it does, not by the
  project's private word for it.

## Subject first for archives and performances

reel, floor, resources, tapes, making, partitur, held, stage, weight and the
stations are works and collections, not tools. Open with the work: its name,
its maker, its year, its form. Then the proposition, the one thing the piece
does that is the reason it is here. What a visitor presses comes last, and
only if it changes what is seen or heard.

- *"A year of Estonian newsreels, ERR's 1965 AK filmikroonika, laid on one line
  at the days they went out. The films were shot silent, so each one plays with
  that day's radio where a programme survives."* The second sentence is the
  proposition: the silence, filled from the same day.
- Proper names stay whole: László Moholy-Nagy, Erkki Kurenniemi, Yoshimi,
  MIM goes Sustainable. A name is not jargon (`positron-ui`).
- A count that is a fact about the subject stays (26 videos, eight scenes). A
  count that changes with the data goes (a resources row count that differed
  by one between a file and a comment on the same day).

## One sentence or two

One when it says the thing. A second only when it carries a second fact the
reader needs to choose: the proposition, the difference, or the condition that
keeps the first honest (*"When no board answers, a copy in this tab stands in
for the Pi."*). Never a second sentence that re-says, decorates or explains why
the page was built. No em dashes, no middots, no semicolons; a colon only
where the second half names the first (*"four drums made in SuperCollider:
kick, snare and two hats"*). Cards keep one size, so a long one is cut, not
allowed to grow its box.

## What overstatement looks like here, from the 2026-10-12 drafts

Each pair is the owner's proposed copy, then the verified text, then why.

**synth/040 Synth.** Draft: *"Build a synthesizer by connecting sound
modules. Hear how each new connection changes the instrument."* Verified: *"A
synthesizer built up one module at a time, from a bare sine to a filter, an
envelope and an LFO. Step through it and hear what each new module and its
knobs change."* The visitor connects nothing: a step picker loads six fixed
patches and the patchbay is a picture (`modules.mjs:100-107`).

**clock/030 Shared clock.** Draft: *"Synchronize two computers and start a
rhythm on both. They keep playing together without exchanging every beat, and
another computer can join while the rhythm is running."* Verified: *"Two places
in this tab, one with its clock set wrong on purpose, agree the time once over
the relay and then play one beat with nothing sent per beat. Press Join while it
runs and a third place comes in on the beat."* Three places in one tab, the
second clock set 100 to 300 ms wrong on purpose. Measured: 175 ms fast found as
-176, then 1.35 ms apart.

**clock/000 Scheduling.** Draft: *"... Hear the difference and see how late
each note arrives."* Verified: *"One rhythm played twice at two pitches, by a
JavaScript timer that wakes up to play and by the sound card told each note's
time in advance. Make the page busy and the timer's notes land tens of
milliseconds late while the sound card's stay on time."* Nothing arrives in a
one-tab page, and idle the timer was 3.33 ms late at worst, so the difference
is only heard with the busy switch (42 ms). The draft hid the one control that
makes the point.

**video/030 WebRTC loopback.** Draft: *"... Compare the delay introduced by
the WebRTC round trip."* Verified: *"Send your camera to Cloudflare Stream over
WebRTC and watch it come back beside the original for twenty seconds. The two
pictures show the delay by eye, and the footer reads the return connection's
round trip time."* The page has no glass to glass number; its `rtt` is the
network round trip on one leg.

**rhythm/050 Camera drums.** Draft: *"The brightness of sixteen sections of
the picture determines which beats play."* Verified: *"Point your camera and the
picture becomes the drum pattern, cut into 16 by 9 squares with one drum for
each of the nine rows. Brighter areas play busier, and 2x doubles it to 32 by 18
squares and eighteen drums."* 16 by 9, not sixteen, and a dither threshold
means brighter plays busier rather than brightness deciding each beat.

**weight.** Draft: *"A single sentence stretches across four walls. Move
through the space to read it."* Verified: *"One sentence, "If these walls could
talk", set a word at a time across the four walls of a room, so it closes only
when you turn all the way round. Each word is as big as it is short, and a word
you retype takes the size of its new length."* You turn, you do not walk, and
the draft dropped the piece's proposition (size from length).

**partitur.** Draft: *"... turning a historical notation into something that
unfolds in time."* That clause is decoration, and slightly false: the score's
own key already reads time downward. Verified: *"László Moholy-Nagy's 1924 score
sketch for a mechanical variety act, played as a timeline of its two stages,
its light and its sirens. Any other screen can join as the wall its light is
thrown on."*

## When the draft holds

**synth/000 Keyboard.** Draft: *"Play a simple synthesizer using the on-screen
keys or a connected MIDI keyboard."* MIDI input is real
(`synth/000/index.html:123-176`). Verified: *"Play a simple sine synthesizer
from the on-screen keys or from a MIDI keyboard plugged into this computer."*
Keep the owner's words when they are true. Add only what is checked and
useful (`sine`, `plugged into this computer`).

## Under-statement is a defect too

A card that has fallen behind its page hides what the page now does:
synth/090 is editable and its card did not say so; sampler/000's pedal clears
the loop with a long hold, and the card said it stops it. When a page changes,
its card is read again in the same commit (`CLAUDE.md`, a change in what a page
does is a change to what it says).

## Handing it over

Record each card as before, after, and the line or run that backs it. When the
facts sit in someone else's file (a list another agent is editing), write the
set to `plans/` and let the session apply it.
