# Handoff, 2026-09-21, session 39

🔴 **READ THIS FIRST, AND IT IS THE SAME LINE AS LAST SESSION: `origin/main`
STILL NEEDS ONE COMMAND FROM A PERSON.** It points at **`4add323`**, a commit
whose message is about a Circuit pack and whose content is **57 plan renames, 0
insertions, 0 deletions**, verified again today. `6a8befc` is an ancestor of the
current head, so nothing is lost either way. The force push is blocked here.

```sh
gh auth switch --user kristjanjansen
git push --force-with-lease=main:4add3238cd812195db75fddfe405786fe5359a8b origin 6a8befc:main
gh auth switch --user Kristjan-Jansen_enefit
```

🔴 **AND EVERYTHING BELOW IS UNCOMMITTED.** This session did not commit, because
committing was not asked for. In a shared checkout that is a real hazard: a peer
session running `git add -A`, or a `git commit` with no path list, sweeps all of
it into a commit about something else. The path limited form:

```sh
git commit -F msg.txt -- demo/evo demo/model demo/circuit demo/kit demo/manifest.mjs \
  demo/shell/midi-log.mjs demo/shell/shell.css plans/ research/ CLAUDE.md LAYOUT.md BACKLOG.md
```

## What is new, and where to open it

The dev server is RUNNING as this is written, on **8890** and **8892**, and all
four pages answer 200 on both:

- **http://127.0.0.1:8890/bay/** is the patch bay. **22/22.** It is the first
  page here that SENDS to an instrument.

- **http://127.0.0.1:8890/evo/** is the Evolution MK-425C, the third hardware
  panel. **24/24.** 25 keys, 8 knobs, 10 buttons, both wheels, a drawn LCD.
- **http://127.0.0.1:8890/model/** is the TASCAM Model 12, **renamed from
  `/rack/` today**. **35/35.**
- **http://127.0.0.1:8890/circuit/** is the Novation Circuit. **30/30.**
- **http://127.0.0.1:8890/kit/** carries `MIDI LOG` as its new top section.
  **70/70.**

🔴 **`/bay/` IS THE ONE TO LOOK AT AND IT NEEDS A PERSON.** Press the status
button, grant MIDI, press a source port then a destination, and the line above
the button prints the whole link before it exists, with the refusal under it if
there is one. **Nobody has yet played the MK-425C into the Circuit through it**,
because a harness cannot grant Web MIDI and cannot hear a synth.

⚠️ **`/rack/` NO LONGER EXISTS AND THAT IS THE INTENDED OUTCOME.** For one day a
kept link to it opened a DIFFERENT page, which is the `/held/` situation and the
one failure worse than a dead link. After the next deploy it 404s. The build
output was checked: `public/rack/` is gone, `public/model/` and `public/evo/`
are there.

**Nothing is deployed.** Build stamp made here is `b06cf25-234409-b07d`.

## The three instruments now have one MIDI log, and it is a kit module

`demo/shell/midi-log.mjs`. Asked as *"add midi event logs to circuit and rack
demos"*, and `/evo/` was written the same hour, which made three callers on one
day and therefore a component rather than three copies.

🔴 **THE ROW IS ADDED BEFORE THE ROUTING, ON EVERY PAGE.** A log fed after the
routing lists only what the panel already understands, which is the opposite of
what a log is for. Asserted on both existing pages by feeding a CC on channel 5
that neither page routes anywhere, and checking it is listed all the same.

**Assert counts, all accounted for**: `/circuit/` 19 to 22 page asserts,
`/model/` 24 to 27, `/kit/` plus 4, `/evo/` 16 from new. Plus 8 harness asserts
each, which is where 30, 35, 24 and 70 come from.

## What was measured on the desk, and it answers two open questions at once

**Capturing the Circuit through the Fast Track Pro.**
`research/fasttrack-capture-2026-09-21.md`.

- The Circuit's **left** output is on the interface's **input 1**, which is
  **capture channel 1**. 48 kHz, 16 bit.
- **With the Circuit's output and the interface gain both at maximum: peak
  -1.69 dBFS over 9.46 s, and ZERO clipped samples of 454,144.**
- Channel 2 is unused and is **its own noise, not crosstalk**: correlation
  between the two captured channels is **+0.030**.
- One command does it, and it resolves the device **by name** because an
  avfoundation index is a shared mutable global this project has already been
  bitten by.

🔴 **AND THE CAPTURE WAS PROVED ALIVE BEFORE ANY SILENCE WAS INTERPRETED.** A
denied microphone permission delivers exact zeros; a real converter has a floor.
`-52 dBFS` is therefore the reading that says the permission is granted, the ADC
is running, and nothing is playing.

## The Circuit synth editor, researched and not built

`plans/plan-circuit-editor.md`. Reported in full in the session reply.

- 🟢 **An editor needs no SysEx to EDIT**: 374 parameters are addressable live,
  **98 by CC and 276 by NRPN**, on channels 1, 2 and 16.
- 🔴 **`Replace Current Patch` and `Replace Patch` differ by ONE BYTE at offset
  6**, and the second writes flash on a device with no factory reset. An editor
  here must be unable to express it, the way `/circuit/` cannot express a record.
- 🔴 **The 64 pack files were measured byte for byte and match the published
  format exactly.** They are `Replace Current Patch` messages for Synth 1, which
  is the documented portable single patch format.
- 🔴 **A sentence in this repository was wrong and is fixed.** The channel 16
  master filter **is** documented, in the Programmer's Reference, and
  `plans/plan-circuit-model12.md` §3.5 had already tabulated that section. The
  claim that no manual says it came from reading the USER GUIDE and generalising.

## The universal patch bay

`plans/plan-patchbay.md`, 414 lines, reported in full in the session reply.
Nothing built. The headline is that the patch bay is a **control plane**: it
carries MIDI, it **brokers** audio, and it never sits in the middle of a stream.

## The patch bay, built

`demo/shell/bay.mjs` is the model, the validator and the text form, all pure.
`node demo/shell/bay-test.mjs` is **30 asserts with no browser**, most of them
negative controls, because a validator is the one kind of code that passes a
naive suite by returning yes to everything.

🔴 **THE TEST FOUND TWO REAL BUGS BEFORE ANY PAGE EXISTED.** The cycle check
walked PORTS and started from the proposed destination, which is an input, so no
link ever started there, the walk ended at once and every loop was allowed. And
the rule refusing a link whose transforms drop everything fired on AUDIO links,
which carry no message classes at all, so it would have refused every audio link
in the building.

🔴 **THE PAGE SENDS, WHICH NO PAGE HERE HAS DONE BEFORE**, so there are two
walls rather than one: each port declares what it `accepts`, and separately
there is no code on the page that turns a SysEx, a program change or a clock
byte into bytes. The Circuit has no factory reset.

## The second half of the session

- **http://127.0.0.1:8890/bay/** the patch bay. **22/22**, model at **36/36**
  with no browser.
- **http://127.0.0.1:8890/wish/** speak a patch. **18/18**. Needs
  `node demo/wish-local.mjs` running, which is ALSO running now on **:8799**.
- `demo/shell/unzip.mjs` reads `New Pack.circuitpack` with nothing vendored,
  **13/13**.
- `demo/shell/circuit-cc.mjs` is the Circuit's 98 live parameters, **16/16**
  graded against this desk's own measurements rather than the document they
  were parsed from.

🔴 **THE MEASUREMENT THAT DECIDES THE WHOLE PATCH BAY DESIGN.** Asked to put
the mod wheel on the master filter, and separately to play the drums from the
keyboard, `llama-3.3-70b-instruct-fp8-fast` produced **well formed patches
aimed at the Model 12** when both belong to the Circuit. Nothing in a validator
can catch that. A person reading one line can, which is why `/wish/` proposes
and never connects.

🔴 **AND FOUR REAL BUGS WERE FOUND BY MEASURING RATHER THAN BY READING**: three
in the bay's validator (a cycle walk that started at an input, an audio rule
that refused every audio link, two refusals in the wrong order) and one in its
model (`accepts` doing two jobs, which refused every real link on this desk).

## Two plans and two pieces of research landed

- `plans/plan-patchbay.md`, the design. 414 lines.
- `plans/plan-circuit-editor.md`, the patch format, measured against the
  published one byte for byte.
- `plans/plan-circuit-samples.md`, the pack in a browser and the drum machine
  after it.
- `research/fasttrack-capture-2026-09-21.md` and
  `research/cf-models-speech-to-patch-2026-09-21.md`, both measured.

## Open, in priority order

1. **The 32 user sessions off the Circuit.** Asked for, still not done, and it
   is the part of the backup that is missing.
2. **`origin/main`**, above.
3. **Commit this session's work**, above.
4. 🔌 **Nobody has played the Circuit from a computer.** Every panel here
   listens. It is the one measurement the whole patch bay demo rests on.
5. **`/circuit/`: how wide the card should be**, unchanged from last session.
6. **`/model/`: three layout asks.** Channel strip content to the bottom, main
   and sub to the bottom, title to the right.
7. **No page is graded on a phone.** The harness runs at 756 px.
