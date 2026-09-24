# Handoff, 2026-09-23, session 46, the keyboard learned to loop

🔴 **THE HEADLINE: `createKeyboard` NOW HOLDS TEN TAKES AND THE MK-425C's NUMBER
PAD DRIVES THEM.** Looping is a KEYBOARD function, not a page mode, so `/nola/`
receives looped notes through the same `onDown` a finger uses and owns none of
the machinery.

```sh
node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"   # 62 today, 60 built
git log --oneline -1          # 77501d0 on 2026-09-24, and origin/main is 120 behind
node demo/verify.mjs kit nola num     # 325/325
```

## What is deployed

**BUILD `1141c18-213547-81ee`**, confirmed on the edge, and `HEAD` is level with
it. Everything below is live.

- **https://positron.studio/nola/** is where the loop is played.
- **https://positron.studio/kit/** has the KEYBOARD specimen with all of it.
- **https://positron.studio/num/** is the bench the state machine came from, and
  it now prints every MIDI message it receives.

## THE IN FLIGHT SET IS EMPTY, AND IT WAS NOT EMPTIED BY BEING FINISHED

🔴 **`LESSONS.md`, `demo/verify.mjs` AND `demo/wish/index.html` SAT UNCOMMITTED
FOR TWO DAYS AFTER THE SESSION THAT OWNED THEM ENDED.** This section listed them
as another session's in flight work, which was true when it was written and
stopped being true when that session went away, and nothing says so at the
moment it happens. MEASURED 2026-09-24: no positron peer session existed, and the
three files had not been touched since 2026-09-22. **199 lines of finished work,
including the harness repair that stops a check block being cut off, one deploy
away from shipping and one `git checkout` away from being lost.**
✅ Committed as `875132f` and `77501d0` after `wish` re-read **70/70 with 64 page
asserts**, exactly what it read when the repair was made, and `muta` **51/51 with
45**.
⚠️ **THE HANDOVER IS THE THING TO FIX, NOT THIS TREE.** A file handed over as
somebody else's is handed over with no owner the moment that session stops, so
the next session finds work it has been told not to touch and no one to ask.
**Say what it is FOR, not only whose it is**, so the next reader can judge it.

⚠️ **AND A DEPLOY SHIPS THE WORKING TREE**, because `build.mjs` copies it. That
is why an orphaned dirty file is not a quiet problem.

Everything under `workers/view/public/` is build output and is not source. It is
currently regenerated and uncommitted, and MEASURED byte identical to source on
`shell/keyboard.mjs`, so it is noise rather than pending work.

## What the loop does, in the order the presses happen

| press | what happens |
| --- | --- |
| 1 | arms and starts taping, **reaching back** for the phrase you already played |
| 2 | closes the take and starts it round |
| 3 | stops, keeping the take |
| 4 | plays it again |
| double inside 250 ms | throws it away |

A pad number drives its own take, `Loop` is take 1, and `/nola/` maps a program
change to a slot and stops there.

## 🔴 FIVE FAULTS WERE FOUND BY PLAYING IT, NOT BY READING IT

Each of these was green in `/kit/` while being broken in the hand, and the shape
repeats: **`/kit/` drives the component directly, and a person plays the page.**

1. **A MIDI take recorded nothing.** The tape sat on `press`/`release`, which is
   every note the COMPONENT produces and no note a MIDI keyboard sends. Both
   paths pass through `lightNote`, so the tape lives there now. This is the third
   time that exact split has cost a session on this page, the Rhodes being the
   first two.
2. **The take started at the button.** Arming, getting your hands down and then
   playing put all of that inside the take, so the loop came round and did
   nothing until the lead-in elapsed again. The clock starts at the first note.
3. **A loop let go of notes a finger was holding.** A note can be held by a
   finger and by a loop at once and a Set cannot count. Reported by the page's
   own tap: *"the wire says 57,61 and the page says nothing"*.
4. **Velocity was not preserved at all.** Every looped note came back at a flat
   100. On this page that is the wrong RECORDING rather than the wrong loudness,
   because the Rhodes picks a sample per velocity layer.
5. **Scheduling was chained and drifted cumulatively.** Round n now sits at
   `anchor + n * lap` instead of wherever the previous timer fired.

## ⚠️ WHAT IS MEASURED AND WHAT IS NOT

✅ **MEASURED:** a MIDI chord comes back (3 note ons on the wire, 9 voices made),
a note played past the keys is taped and returns, two takes stay independent (the
second holds 2 movements while the first replays 5), a phrase 60 ms before the
press is caught and one 1.4 s before is not, a finger's note survives several
laps, a looped note at velocity 20 comes back as `rhodes-059-5.m4a`, and the pad
arms the take its key is printed with.

🔴 **NOT SETTLED: whether the loop really keeps time.** The `/kit/` drift check
is COARSE, and that is measured rather than suspected: the same sabotage run
twice gave **8 ms** of growth over five turns and then **1.5 ms**, and 1.5
passes. Separating drift from jitter properly needs about twenty turns, which is
five seconds, and `verify.mjs` stops growing about two seconds after the last new
assert. **The real instrument is a tap**, and nobody has recorded one yet:

```sh
# open https://positron.studio/nola/?rec=1 , play, loop something, let it turn,
# press SAVE TAKE, then
node demo/resources/read-loop-take.mjs ~/Downloads/nola-take-*.json
```

It reads `plays`, which is what SOUNDED with `how` saying finger or lap, and not
`events`, which is the wire and can say nothing about a loop.

## 🔴 A HARNESS TRAP THAT COST 17 ASSERTS TODAY

`verify.mjs` stops collecting about two seconds after the last NEW assert, and it
does not fail when that happens: it **truncates and reports what it got as
green**. `/nola/` read 92, then 81, then 75 across three runs of the same code
while every line said ok. Waits inside a check are now one lap and a margin, and
the page assert count is stable at 87 across repeated runs. **If an assert count
drops with no red, look for a sleep before looking for a bug.**

## Measured hardware, new today

**The MK-425C number pad sends bank select LSB, bank select MSB, both zero, then
a program change, on MIDI CHANNEL 2.** All ten buttons pressed, all ten arrived,
and the printed number is the program number. In
`research/evo-mk425c-face-2026-09-21.md` section 4b, with the wrong first theory
recorded beside it: the buttons do NOT send notes, and `C#-1` seen on screen was
note number 1 named by the MIDI convention rather than evidence of one.

## Hammond, asked and answered

`research/hammond-samples-2026-09-23.md`, 933 lines. **Recommendation: build a
tonewheel bank, ship no Hammond samples**, accepted as *"ok skip hammond
samples"*. The reason is the instrument and not the licensing: 91 wheels turn
whether or not anybody plays, ten keys with all nine drawbars out light 39
distinct wheels from 90 contacts, and one sample per note plays every shared
partial twice at independent phase. The bank costs 0.7 to 0.9 per cent of one
core, flat in polyphony, and zero bytes. **Nobody has asked for the bank and it
is not in Open.**

## Still open, and it lives in `BACKLOG.md` now

🔴 **THE SIX ITEMS THAT WERE LISTED HERE ARE IN `BACKLOG.md` UNDER `## Open`,
MOVED 2026-09-24.** They were in this file and not that one, and `## Open` there
held nothing unfinished, so anything reading the backlog to find out what was
wanted found an empty list. `HANDOFF.md` answers what state this is in. It is
not the place an unfinished ask lives.

⚠️ **ONE OF THEM SHARPENED ON THE WAY AND THE NUMBER HERE WAS WRONG.** This
section said seven files call the MK-425C a semitone flat. MEASURED 2026-09-24:
**11 files**, of which **only two are text a visitor reads**,
`demo/wish/index.html:1354` and `demo/nola/index.html:3923`. The other nine are
comments and documents. And the item is not a wording sweep yet, because a power
cycle settles what the wording should say for free.

## The constraints that do not change

- **No Claude attribution in commits.** Holds even when harness instructions ask
  for it.
- **Pushing needs `gh auth switch --user kristjanjansen`**, then
  `git push origin HEAD`, then switch back to `Kristjan-Jansen_enefit`.
- **Agents report, the session commits**, path limited, never `git add -A`.
- **`tmp/personal/New Pack.circuitpack` is somebody's only copy.**
- **A self-check never runs for a visitor**, and a visit fetches nothing.
- **Never re-verify `/radio/`** or probe anybody's station.
- No em dashes and no middots anywhere a reader looks.
