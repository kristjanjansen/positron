# Handoff, 2026-09-23, session 46, closed

**`/fau/` is a synthesiser you type in: ten lines of Faust in a text area become
a WebAssembly module on the audio thread in about seventy milliseconds, and the
keyboard plays it. 31/31.** `plans/plan-fau.md` is 1,419 lines of measurement
and this is its §9.4 order of work, steps 2 to 5.

```sh
node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"   # 61 today
node demo/check-html.mjs demo/fau/index.html   # no browser at all
node demo/shell/worklet-test.mjs               # 32 ok, no browser
node demo/verify.mjs fau                       # 31/31, 25 page asserts
```

## What to open

- **http://127.0.0.1:8898/fau/** with `node demo/server.mjs` running, which it
  is as this is written. **NOT DEPLOYED**, and that is a decision rather than an
  omission: `git status` shows `LESSONS.md`, `demo/verify.mjs` and
  `demo/wish/index.html` modified by another session, and `build.mjs` copies the
  working tree, so a deploy from here ships their unfinished work. Handoff 45
  records exactly that happening.
- Press **Organ**, **Rhodes** or **Djembe**, then edit the text and press
  **COMPILE**. The keys are playable from a mouse, from `a s d f g h j k`, and
  from a MIDI keyboard; **SUSTAIN** under them is the pedal if there is no real
  one.

## What it costs and what it does, MEASURED 2026-09-23 in a browser

| | |
| --- | --- |
| what a compiling page downloads | **6,379,006 B**, asserted to the byte off the browser's own resource timing |
| what a visit downloads | **0 B**. The compiler arrives on the first press |
| compile, ten lines, polyphonic | **66 to 68 ms** |
| machine code out of it | **7,266 B**, pinned exactly, name included |
| one voice of it | **256.1 KB**, because a Faust oscillator carries a 65,536 entry sine table |
| a drum named in one line | 78 B of source, **17,224 B** of machine code, **0.6 KB** a voice |

## The five things that were found rather than assumed

🔴 **THE COMPILER'S ERROR PATH GOES THROUGH `console.error`, WHICH WOULD TAKE
THE SUITE RED ON A PAGE DOING EXACTLY WHAT IT PROMISES.** libfaust is built with
C++ exception catching disabled, so every failed compile reaches Emscripten's
`abort()`, which prints `Aborted(Assertion failed: Exception thrown...)` and
throws a `WebAssembly.RuntimeError`. `faustwasm` catches it and reads the real
message out, so the visitor sees `syntax error, unexpected ENDDEF` and the
instance stays usable. ✅ **The repair is three lines in one place**: the glue
binds `console.error` ONCE, at module evaluation, so a forwarding function is
installed across that one await and taken off immediately after. The compiler
keeps the shim, the page gets the real console back. MEASURED: **2 lines
captured from a bad compile, 0 from a good one, 0 reaching the console**.

🔴 **AND A POLYPHONIC COMPILE THAT DEFINES NO `effect` COSTS ONE OF THOSE EVERY
TIME.** The generator probes for an effect and libfaust throws when there is
none. `effect = _, _;` is in every preset for that reason and it is the shape a
Faust instrument takes anyway. MEASURED both ways: **1 console error without it,
0 with it.**

🔴 **A MODULE'S NAME IS EMBEDDED IN THE WASM IT GENERATES, SO TWO COMPILES ARE
NOT COMPARABLE BY BYTE COUNT UNLESS THEIR NAMES ARE THE SAME LENGTH.**
`plan-fau.md` §3.3 says so and this page broke it anyway: an assert comparing
`organ_1` against `organ again_5` reported a 78 byte difference on a page where
nothing was wrong. Every compile a check compares now carries a seven character
name, and `fau_pin` pins 7,266 bytes exactly.

🔴 **THE PEDALLED CHORD CHECK WAS GREEN UNDER THE SABOTAGE IT WAS WRITTEN TO
CATCH.** With the release sent straight to the engine, `heldChord > chord * 0.5`
read 0.03028 against a 0.03940 threshold and passed, because the reading was
taken 200 ms into a 350 ms release. **It reads at 600 ms now, past the release,
where there is no ambiguity to be lucky with**, and the same sabotage takes 3
red. The other four sabotages that day each took the right asserts red first
time.

🔴 **A HARNESS PRESS CAN REBUILD THE AUDIO NODE IN THE MIDDLE OF AN AUDIO
CHECK.** `demo/verify.mjs` presses every control 650 ms apart while the page's
own checks are running, and each preset press is a compile that calls
`pedal.forgetKeys()`. Per-compile queueing left every `await sleep` as a hole a
press could fall through: MEASURED as `0 on the foot` where the check had just
put one note there. **The whole compiler half of the check block is ONE task on
the queue now**, and `build()` is called directly inside it, because a queued
task awaiting another task in the same queue is a deadlock.

## Two things the pictures caught and nothing else could

🔴 **`you` WAS DRAWN AS A 300 px EMPTY SLAB.** `plan-fau.md` §10.3 asks for a
`you` box outside the browser holding the ten lines of Faust, which is right
about the story and wrong about the picture: every top level box takes the
height of the tallest, so a childless box beside a machine with five parts is a
screen of nothing on a phone. **The honest box was already there** — the text is
a textarea IN the browser — so it moved inside and the picture is two machines.
🔴 **AND TWO ARROW LABELS PRINTED OVER EACH OTHER AT 390 px**, `notes` and
`CC64` arriving at one box from one side, rendering as `notCC64`. One label now,
and the footswitch's own `sub` carries `CC64 by default`.
⚠️ **THE CODE BOX WRAPS RATHER THAN SCROLLING SIDEWAYS**, for the same reason:
at 390 px `pre` put half of every long line off the right edge of a page whose
subject is reading ten lines of Faust before you change one.

## What is in the kit now, done once

- **`demo/shell/worklet.mjs` + `worklet-test.mjs`.** `Function.prototype
  .toString()` into a Blob into `addModule`, which is how anything in
  `demo/shell/` reaches an `AudioWorkletGlobalScope` with no module loader in
  it. **32 checks, 23 of them refusals or negative controls, five sabotages
  measured** (the value guard 9 red, the name check 4, the `[native code]` guard
  2, `let` for `const` 2, reversing the emission order **0**, which is the
  useful one and is kept).
  🔴 **ITS OWN TEST FOUND TWO DEFECTS IN IT ON THE FIRST RUN.** A `Map`
  stringifies to `{}` rather than to `undefined`, so the guard that tested for
  `undefined` accepted one and a worklet would have been handed an EMPTY OBJECT
  where a page passed a filled table. `NaN` and `Infinity` become `null` the
  same way. The guard walks the value now.
  🔴 **AND IT HAS NO CALLER YET**, which is in `BACKLOG.md` with the rule that
  if `/nola/`'s second engine lands another way, this module is deleted rather
  than left as a kit component nothing uses.
- **`demo/shell/field.mjs` takes `code: true`**, which is the third case that
  component now has: a one-line field turns the browser's writing help off
  because a value has to round-trip, a tall field turns it on because it holds
  prose, and a code box is tall AND has to round-trip. `autocapitalize:
  sentences` turning `os.osc` into `Os.osc` on a phone is a compile error the
  visitor did not type.

## What is open

1. 🔴 **`faust --version` ON THE BOARD, WHICH IS FOUR SECONDS AND DECIDES THE
   SECOND HALF OF THE PAGE.** `ssh positron@192.168.1.213` answers `No route to
   host` from this laptop today and the port 22 sweep was refused by the
   sandbox. Until it is answered `/fau/` draws no Raspberry Pi, because a
   diagram may not draw a mechanism the page does not have.
2. **DOES THE EDGE COMPRESS `libfaust-wasm.data`.** The page answers it itself
   now: it logs the decoded and the transferred size on the first compile and
   says in words whether whatever served it compressed it. **Open the deployed
   page and read the log.** 1.0 MB against 2.9 MB is the difference.
3. **THE STK PIANO PRESET**, `plan-fau.md` §9.4 step 6: 1,690 ms of frozen page,
   so it belongs behind a Worker, and the listening test that document could not
   do is still not done. **Nothing on `/fau/` has been heard through a speaker.**
4. **`/items/` IS RED ON ITS OWN DIAGRAM**, two `cloud` containers with no boxes
   inside them, found while diffing assert counts after the `field.mjs` change.
   Pre-existing, in `BACKLOG.md`.
5. **Everything from session 45 that was not touched**, below.

# Handoff, 2026-09-23, session 45, closed

**`/nola/` is a piano you play from a MIDI keyboard, with a line of chord
symbols drawn out above it as keyboards you can press. 34/34.** The sustain
pedal is a kit module now, the chord parser is another one, and both have a node
test beside them that needs no browser.

```sh
node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"   # 60 today
node demo/shell/pedal-test.mjs      # 44 ok, no browser
node demo/shell/chords-test.mjs     # 36 ok, no browser
node demo/verify.mjs nola muta      # 34/34 and 51/51
```

## What to open

- **https://positron.studio/nola/** deployed. Type chords in the field, press a
  chart, play the keys, and press SUSTAIN under them if you have no pedal.
- **https://positron.studio/nola/?flip=1** if the pedal works backwards, which
  it does on this desk this session. See the measurement below.
- **https://positron.studio/muta/** unchanged at 51/51, switched over to the new
  pedal module.

## What the instrument on this desk actually sends, MEASURED 2026-09-23

Read off `/evo/`'s own MIDI log, in two screenshots, which answered two of the
three questions `plans/plan-nola.md` §8 put first.

✅ **THE FOOTSWITCH DOES SEND CONTROLLER 64.** `B1 40 00` and `B1 40 7F` on
channel 2. The default in `pedal.mjs` is right on this unit, and `?pedal=<n>`
stays for the next one because the MK-425C's footswitch is *"fully MIDI
assignable"*.
🔴 **AND ITS POLARITY IS UPSIDE DOWN.** Two press and release gestures both
arrived as `00` then `7F` 0.40 s later, so PRESSING SENDS 0. The manual says
where that comes from: the polarity is sensed at power up, so a pedal held down
while the keyboard boots is inverted for the session. **The fix on the
instrument is to power it up with the pedal unpressed**; `?flip=1` is for the
session you are already in.
✅ **EVERY RELEASE IS A NOTE ON AT VELOCITY 0**, `91 25 00`, confirming what
`/evo/` recorded and what `midi.mjs` already handles.
🔴 **AND THE TRANSPOSE WAS FIXED ON THE KEYBOARD**, reported as *"fixed
transpose"*. **`BACKLOG.md` has the urgent entry**: eight files still say the
instrument is a semitone flat, `/evo/` computes `m.note - KEY_LO` against a 25
entry array so every key would light one position too high, and **`/evo/` cannot
go red about it** because its own check reads `KEY_LO === 47 && flatSaid` and
both halves are the page's own. Nothing is edited until the wire is read again.

## The five things that were found rather than assumed

🔴 **REMOVING `Play a phrase` TOOK 18 OF 25 CHECKS OUT OF THE RUN AND THE SUITE
READ 13/13 GREEN.** `verify.mjs` gives up after about two seconds with no new
assert, and this page's first audio check landed three and a half seconds in.
Found by opening the page by hand and reading `__demo.asserts.length`, which
said **20 and still climbing** while the suite had already left. The cheap
checks run first now. **Nothing failed in either run. The only thing that said
anything was wrong was 25 becoming 7.**

🔴 **AN ANALYSER AT 2048 SAMPLES IS A 46 ms WINDOW AND IT MADE A CHECK BLIND.**
Replacing the damper ramp with an instant stop left the page **24/24 green**,
because the reading taken 40 ms after a key came up was still half made of
samples from before it. 512 for level now, and a second analyser at 16384 for
pitch, because level and pitch want opposite windows.

🔴 **THE SHIFT CHECK WAS GRADING ARITHMETIC AND NOT SOUND.** Forcing
`playbackRate` to 1 on every note also read 24/24. It measures the loudest
partial now: note 63 reads **310.5 Hz** and note 64, bent from the same
recording, **331.1 Hz**, a ratio of **1.0660** against 1.0595.

🔴 **THE RECORDINGS ARE 21 dB DOWN.** All thirty peak between **0.068 and
0.097** of full scale, median 0.0894, a spread of only 3.1 dB across the whole
keyboard. Until the page made it up, two asserts were red on thresholds that
were right for the instrument and wrong for the files.

🔴 **THE CHORD CHARTS DID NOT LINE UP WITH THE KEYBOARD UNDER THEM.** Same
width, same key size, different base, so a shape could not be carried down the
page, which is the only thing a chord chart is for. Caught by a screenshot and
by nothing else. They share the instrument's window now and move with the octave
pad, asserted as a **column position in pixels** rather than as a base number.

## Three defects the kit had, found by sabotage

🔴 **`/muta/` RELEASED A NOTE TWICE.** A second note off for a note the foot was
holding went straight past the pedal, and lifting the pedal released it again. A
velocity-0 note on followed by a real `0x80` is the commonest shape of it.
🔴 **A DEAD GUARD IN THE PEDAL.** `if (!keysDown.has(n))` at the lift was
unreachable: the two sets are disjoint by construction, so removing it changed
nothing, which is this project's own signal.
🔴 **A DEAD ROW IN THE CHORD TABLE.** `['M', [0,4,7]]` could never be reached,
because a capital `M` is normalised to `maj` before the table is consulted. Its
own test reported it.

## What is in the kit now, done once

- **`demo/shell/pedal.mjs` + `pedal-test.mjs`.** Two sets, the 63/64 threshold,
  the change filter, the panic, the half pedal reading, the raw value for the
  inverted case, the controller number as an option and `flip` for a backwards
  pedal. **44 checks, nineteen negative controls**, ten sabotages take 1 to 4
  red each.
- **`demo/shell/chords.mjs` + `chords-test.mjs`.** Chord symbols into notes and
  roman numerals. **36 checks, twenty negative controls.**
- **`demo/shell/keyboard.mjs`** takes a Set of which keys carry a letter, an
  optional `pad: false` for a chart rather than an instrument, and a third
  `hint` colour. ⚠️ **`pad: false` AMENDS A STATED RULE** and the reasoning is
  written beside it: a picture of a chord and an instrument you play really are
  two things.
- **`demo/shell/midi.mjs`** passes the message's own timestamp as a fourth
  argument, because `e.timeStamp` and `performance.now()` inside the handler are
  not the same number on a busy main thread.

## Pushed, and the account put back

`c869cf9..7146853` on `origin/session-28-station-videoradio`, a clean fast
forward, 170 ahead and 0 behind, so **no force and no lease were needed**. The
dance was the one in `CLAUDE.md`: switch to `kristjanjansen`, fetch, push, switch
back to `Kristjan-Jansen_enefit`. Divergence read `0 0` after it and the active
account is the work one again.
⚠️ **THE DEPLOY SHIPPED THREE FILES THIS SESSION DID NOT WRITE**, because
`build.mjs` copies the working tree: `LESSONS.md`, `demo/verify.mjs` and
`demo/wish/index.html` are another session's in flight work, they are NOT in any
of these commits, and `/wish/` on the edge carries an unfinished change.

## 🔴 A correction to `plans/plan-fau.md` §8, found by reading this checkout

**The plan treats SuperCollider in the browser as a thing this repository does
not have, and it has most of it.** MEASURED here rather than recalled:

| what | where | bytes |
| --- | --- | --- |
| scsynth, the sound server, in the tab | `demo/shell/vendor/scsynth-nrt.wasm` | **1,701,983** |
| a SynthDef WRITER that runs in the tab | `demo/shell/synthdef.mjs`, `graph()` | source |
| a SynthDef compiled somewhere else | `demo/grains/defs/pappus-tiny.scsyndef` | 64,733 |

🔴 **SO THE MISSING HALF IS `sclang`, THE LANGUAGE, AND NOT THE ENGINE.**
`synthdef.mjs` writes format version 2 byte for byte and its own header says the
grader is real scsynth compiled to wasm, *"which either plays the bytes or does
not"*. The tab can already emit ANY graph. What it cannot do is let a PERSON
write one: `graph()` is a node list with explicit rates, special indices and
input references, and sclang is where multichannel expansion, signal arithmetic
and a thousand named unit generators live.
⚠️ **WHICH MAKES THE COMPILER QUESTION A QUESTION ABOUT WHO WRITES THE GRAPH.**
If the page writes it, everything needed is already here. If a visitor writes it
in a text area, a language is required and that is the whole of what `fau` is
for. `Engine_Pappus.sc` is **1,467 unit generators**; nobody hand writes that as
a node list, which is why `/grains/` ships an artefact.
⚠️ **AND THE STALENESS GUARD HAS A THIRD ANSWER NOBODY HAS PRICED**: compile on
the board at BUILD time rather than in the tab, which needs no compiler in a
browser at all and would still delete `checkCompiledDefs()`'s reason to exist.

## The Faust plan in five lines, for somebody not reading 1,419 of them

- **The mechanism is real**: `@grame/faustwasm` 0.18.5, libfaust 2.89.2, LGPL,
  compiles to an `AudioWorkletNode` in **10 to 100 ms**, and needs **no COOP or
  COEP**. It costs **6,162,473 bytes**, 970,416 over brotli.
- 🔴 **THE REASON IT WAS ASKED FOR DOES NOT HOLD.** The wasm compiler has three
  backends and C++ is not one of them, so the tab cannot emit what the board
  builds, and the tab is 2.89.2 against Debian's 2.54.9. One compiler two
  outputs is dead; **one source, two compilers, and a generated receipt** is
  what survives.
- ✅ **THE PART TO DO REGARDLESS** is `Function.prototype.toString()` into a
  `Blob` into `addModule`, which is how `faustwasm` gets a processor into a
  worklet with no module loader. **That unblocks `rhodes.mjs` with no Faust and
  no dependency.**
- 🔴 **A PATCH MAY NOT ARRIVE OVER THE RELAY AND SANITIZING THE TEXT CANNOT
  FIX IT.** `process = _ @ 100000000;` is 24 bytes, compiles in 25 ms, and
  RENDERS, taking a process from 91 to 603 MiB. At 2^28 the size arithmetic
  overflows to **-2,147,483,640**, reports success, and throws during render,
  which in a page is the audio thread. Containment is possible and untried:
  a dedicated Worker, `terminate()` on a 2 s watchdog, refuse a negative or
  huge `meta.size`, never instantiate on the main thread.
- ⚠️ **AND TWO `plan-nola.md` CLAIMS ARE WRONG**: `faust-stk/piano.dsp` does not
  compile to wasm at all, and `piano1.dsp`, which does, has **no pedal**.

## What is open

1. 🔴 **THE EIGHT FILES THAT STILL SAY THE KEYBOARD IS A SEMITONE FLAT**, listed
   in `BACKLOG.md` with the line numbers. It needs one reading off `/evo/`: press
   the leftmost white key and see whether it says a C or a B.
2. **`plans/plan-fau.md`, 1419 lines, written and not acted on.** Its headline is
   not about Faust: `faustwasm` gets a processor into a worklet with
   `Function.prototype.toString()` into a Blob, which deletes the blocker that
   keeps `demo/shell/rhodes.mjs` off `/nola/`. Also measured there:
   `faust-stk/piano.dsp` does NOT compile to wasm, and `piano1.dsp`, which does,
   has no pedal at all, so `plan-nola.md` §4's description of it is wrong.
3. **The Salamander pack**, `plan-nola.md` §8 steps 4 to 7, a session of its own.
   Until then velocity on `/nola/` is only volume and the page says so.
4. **The chord charts draw root position**, which is a spelling rather than a
   voicing. The four frames that bought the feature show a pedal point on C with
   the hands a long way apart, and a voicing option was offered and not asked
   for yet.
5. **`demo/shell/keyboard.mjs` clips its own note names** where a black key sits
   on a white key's shoulder. Photographed on two pages, so it is the component.
   In `BACKLOG.md` with why the obvious fix is wrong.
6. **Everything from session 44 that was not touched**, below.

# Handoff, 2026-09-22, session 44, closed

**A day spent almost entirely inside `/muta/`'s MIDI, which arrived working in
the trivial sense and broken in every sense that matters, and a harness that was
silently dropping the checks written to catch it.**

⚠️ **NOTHING IS COMMITTED.** `git status` shows eleven modified files and
`plans/plan-nola.md` untracked, all of it described below. The deploy is AHEAD of
`HEAD`: **BUILD befbd99-200309-9a46** is on the edge and its source is only on
this disk.

```sh
node -e "import('./demo/manifest.mjs').then(m => console.log(m.DEMOS.length))"   # 59 today
```

## What to open

- **https://positron.studio/muta/** deployed and **51/51 green against the
  edge**. A MIDI keyboard plays it, a sustain pedal holds it, and the drone is
  played from the keys.
- **https://positron.studio/wish/** unchanged today beyond one log line.

## The five reports, and what each one really was

Every one of these came in as a player's sentence and every one had a cause
somewhere other than where it looked.

1. 🔴 ***"i want long midi notes, i got plunky sound"*, AND THE CAUSE WAS THAT
   PLAITS HAS NO SUSTAIN UNLESS YOU PATCH `LEVEL`.** `voice.cc:212` drives the
   lowpass gate with `lpg_envelope_.ProcessPing(...)` whenever the trigger is
   patched and the LEVEL input is not, and **a ping is a decay**. Holding the
   gate high does nothing; the trigger only re-arms the ping on a rising edge.
   ✅ With `level_patched` the same gate runs `ProcessLP(compressed_level, ...)`,
   `voice.cc:210`, which FOLLOWS the level. On a rack that is two cables, TRIG
   for the attack and LEVEL for the gate, and the second one was missing.
   ⚠️ **THE FIRST REPAIR WAS `plai_note_off` AND IT CHANGED NOTHING AUDIBLE.**
   Necessary, not sufficient, and the report that followed it was *"midi support
   is really messed up"*, which was correct.
   ✅ MEASURED: **0.4653 held against 0.1817** for the same note at the same age
   with the key let go after 100 ms. Before the change those two numbers were
   equal.
   ✅ **VELOCITY IS REAL NOW AS A SIDE EFFECT.** `voice.cc:143` makes the level
   the engine's accent too, so the shim stops discarding the velocity byte.

2. 🔴 ***"i still hear drone wien midi on"*.** `toggleWarps` calls `startDrone`
   as well as `togglePlaits`, so stopping the drone once inside `toggleMidi`
   left two other ways back in. The drone is owned by an intent flag now
   (`droneWanted`) and `startDrone` refuses without it. ⚠️ The sabotage that
   proves it: with the guard removed, cycling the effect brings the drone back
   at **0.249822** while the first half of the same assert still reads 0.000000.

3. 🔴 ***"i get distorted pluck and then beneath it the right drone sound. that
   pluck never goes away"*, AND IT WAS A KEYBOARD NOTE BEING TURNED INTO A
   DRONE.** `plai_set_drone(1)` clears `trigger_patched` on everything SOUNDING,
   which takes the lowpass gate out of the circuit, so a note still ringing from
   a key when the drone starts becomes a second drone at that key's pitch
   **for ever**. Nothing could release it: no gate left to drop, and its own
   note off found `trigger_patched` false and correctly refused to touch it.
   ✅ The shim silences level-patched voices when a drone starts. MEASURED: a
   drone started over a sounding key reads **0.7066 on 1 voice**, identical to
   one started with nothing sounding.

4. 🔴 ***"plaits on should not turn midi on"*, SAID TWICE, AND NOTHING EVER
   REACHED THAT WAY.** Grepped and read: `togglePlaits` has never touched the
   MIDI switch. What existed was the REVERSE, `toggleMidi` turning the
   oscillator on for you, and that is what manufactured report 3: it set
   `droneWanted` true one line before clearing it, so the page wanted a drone it
   had just stopped, and the next press brought that drone up UNDER the held
   keys. The line is gone and the switches are independent in both directions.
   ⚠️ A keyboard switched on with PLAITS off is silent and says so in the log.
   Reaching into the instrument to make the lamp look honest was the worse of
   the two.

5. 🔴 ***"when voices is 1 i still hear chords"*, AND THE OSCILLATOR IS RIGHT.**
   MEASURED: three keys held at once leave **1 voice sounding, on note 67**.
   ⚠️ **`chord` IS ONE OF THE SIXTEEN MODEL NAMES**, model 6, and it plays a
   four note chord from a single voice by design. Not reproduced, not fixed, and
   probably not a fault.

## The wasm was rebuilt three times and the digest moved every time

`ece3f3c55e5ab63a` to `d77815fad21aa700` to `5091126ebca10e36` to
**`d2721dd0059930d4`**, 200,710 bytes. That is the shim's own bytes being part
of the digest working exactly as designed. Warps is untouched at
`1a0619e5a94767ee`, 78,204 bytes. ⚠️ **HANDOFF 43 AND `BACKLOG.md` BOTH QUOTE
`ece3f3c55e5ab63a` AS THE OSCILLATOR'S DIGEST AND BOTH ARE NOW HISTORY**, which
is correct for a record of what was measured that day.

🔴 **AND THE PAGE'S OWN BENCH CAUGHT ME BREAKING IT, WHICH IS THE BEST THING
THAT HAPPENED TODAY.** The first version inferred *this is a keyboard note* from
a hold of zero. `costOf` plays `plai_note_on(note, 0)` for each of eight voices
and then drones them, so all eight became keyboard notes and the drone wiped
them: it priced **eight voices at 4 µs against one voice at 4 µs** and
`every voice costs, and all of them together still fit a render quantum` went
red. That assert exists because a voice count costing the same whatever it is
set to means the voices are not being rendered. The level patch is an explicit
argument now, so a caller wanting a held gate with no envelope passes nothing
and gets the old behaviour exactly.

## The harness was dropping asserts in silence, in three different ways

🔴 **A CHECK BLOCK THAT GOES QUIET IS CUT OFF WHERE IT WENT QUIET, AND THE RUN
STAYS GREEN.** `verify.mjs`'s growth loop stopped collecting after ONE 400 ms
poll with no new assert. A check that holds a note for 700 ms and its release
for 900 ms looks exactly like a page that has finished. It took **itself and a
voice stealing check that had been there a day** out of the run, and the suite
read **40/40 before and after**.
⚠️ Raising `settleMs` from 8 s to 14 s changed nothing, which is what said the
settle window was not the cause. `settleMs` sizes the wait before the FIRST
assert and has no bearing on a gap in the middle.
🔴 **`isReady` WAS DECLARED AND NEVER CALLED**, three lines above a comment
saying in capitals that both conditions must hold, `Both conditions`.
🔴 **AND `ready` ALONE CANNOT REPLACE IT.** `/muta/` calls `ifSelfcheck(...)`
WITHOUT awaiting it and `d.ready()` on the next line, so ready is true a few
milliseconds in. `/radio/` does the same from inside the granulator's boot.
🔴 **THE THIRD WAY IS THE CEILING.** 12 s, and this page's DSP checks now run
about twelve seconds. Reaching it drops whatever has not asserted yet, which is
the same silent truncation arriving from the other end of the same loop.
✅ **NOW `GROWTH_PATIENCE = 5` AND `GROWTH_TRIES = 60`**, 2.0 s of tolerated
silence and a 24 s ceiling. Costs a fast page nothing, because the loop still
leaves the moment a page is quiet and ready. MEASURED after: `tom` 44/44 and
`wish` 70/70 unchanged, so no other page was being truncated.
✅ **AND THE FAILURE BRANCH SAYS WHICH FAULT IT IS NOW.** It printed
`failed: null` and `console: nothing` for two different causes, a module that
never finished and a page that finished without becoming ready. It prints
`typeof window.__demo`, the type of `ready` and the assert count, and that line
named the fault in one run after an hour of bisecting by hand.
⚠️ **AND A WRONG FIRST DIAGNOSIS COST MOST OF THAT HOUR.** `shell.mjs` has
`ready:` twice and it was read as one object literal re-declaring a key, so the
boolean was called an illusion and the shell was changed to publish a separate
`done`. **The two keys are on two different objects**: `api`, which is what
`window.__demo` is, carries the boolean, and the object `mount()` returns
carries the method that sets it. Reverted. **A key name appearing twice in a
file is not two declarations of one thing.**
⚠️ **AND TWO STRAY HEADLESS CHROMES FROM THIS SESSION'S OWN PROBES MADE ONE
ISOLATION RUN LIE.** The run that appeared to clear the shell change was the one
in which they had just been killed. The harness prints that warning for exactly
this reason and it was read past.

## What the checks now say, and what they cost

`/muta/` is **51/51 with 45 page asserts**, from 40/40 with 32 this morning.
Every new one has a control beside it, because two of them passed on a build
with no sustain in it at all:

| assert | number | its control |
| --- | --- | --- |
| a held key keeps sounding | 0.4653 | 0.1817 for the same note at the same age, let go at 100 ms |
| the release ends it | 1 voice, 0.4653 to 0.0620 | a note nobody holds releases 0 |
| the pedal holds it | 0.6052 | 0.1428 with no pedal, 0.0706 after the pedal lifts |
| the model changes under a held note | 0.2102 | 0.0732 for the same model over the same 300 ms |
| a key steers the drone | knob to 48, 0.7066 | still 0.7066 after the key comes up |
| a key is not turned into a drone | 0.7066 on 1 voice | 0.7066 for a drone with nothing sounding |
| one voice is one note | 1 voice, note 67 | three keys held at once |
| three keys do not clip | 0.6271 and 0.3190 | |

⚠️ **TWO THRESHOLDS WERE FITTED TO ONE AFTERNOON'S READINGS AND HAD TO BE
REWRITTEN.** `decay` sits at 0.5 and its tail is long, so a released note reads
0.07 to 0.18 at the same age across runs; a released note asserted to be *gone*
went red on a build where everything works, and a factor of three went red for
the same reason. What is asserted now is that holding is audibly LOUDER than
letting go, which is the claim. ⚠️ And the waveform comparison was **measuring
phase, not timbre**, until it was changed to compare SORTED amplitudes.

## `nola`, researched and not started

`plans/plan-nola.md`, **1,456 lines**, untracked. A playable piano from a MIDI
keyboard with a real sustain pedal.

- ✅ **PLAIN WEB AUDIO, one `AudioBufferSourceNode` per note.** Not scsynth,
  which measured **1.88 MB on disk** and buys nothing a browser lacks: there is
  no piano on the board and no `.scsyndef` to be faithful to.
- ✅ **Salamander Grand Piano**, and it is the one thing MEASURED rather than
  read about: the full tree is **641 files, 748,397,030 bytes**, and
  `STREAMINFO` was read out of fifty of them by ranged GET, 3.2 KB of requests
  with nothing downloaded. **48 kHz, 24 bit, stereo, 30 notes exactly three
  semitones apart, 16 velocity layers, 88 release samples, 69 resonance.**
  Licence genuinely open between CC-BY 3.0 on every mirror and the author's blog
  saying public domain since 2022.
- ✅ **3.80 MiB budget.** Every semitone at 16 layers across 88 keys is
  **3,707 MiB**; minor thirds cap the worst pitch shift at **one semitone**.
- 🔴 **THE CODEC FOLKLORE IS WRONG AND IT WAS MEASURED.** Neither codec smears
  the attack: every encode reproduced a 3.35 ms rise within 0.1 ms. What happens
  is PRE-ECHO, and **Opus is about 18 dB worse than AAC at the same bitrate**.
  Pre-echo lives BEFORE the attack, so trimming to just before onset discards
  exactly that region.
- 🔴 **NOT ONE SAMPLER LIBRARY IMPLEMENTS A SUSTAIN PEDAL**, and `smplr`'s
  README shows `setCC(64, 127) // sustain pedal on` while its source admits it
  only affects region matching and no bundled preset declares a `ccRange`. **A
  control that reads as live and is inert**, arriving from outside this
  repository.
- ⚠️ **FIVE PACKS FORBID WHAT A BROWSER DEMO DOES.** Pianobook forbids
  redistribution in as many words, Keppy's is **ND**, jRhodes3c is **NC**,
  Maestro is all-rights-reserved behind a `Custom` label, Piano in 162 has no
  licence at all. Iowa's only grant is one sentence and **Iowa does not call it
  public domain**.
- 🔴 **AND THE FIRST STEP IS FOUR SECONDS IN FRONT OF `/evo/` WITH A FOOT ON THE
  PEDAL.** The MK-425C's socket is fully MIDI assignable and nobody has checked
  which CC it sends; its polarity is sensed at power up, so a pedal held down
  while it boots is inverted for the session with nothing on screen saying so;
  and the keyboard is **a semitone flat** on notes 47 to 71, which on a piano
  page gets blamed on the sample pack.

## What is open

1. 🔴 **THE COMMIT AND THE PUSH.** Nothing is committed and the edge is ahead of
   `HEAD`. The push still needs `gh auth switch --user kristjanjansen` and the
   force-with-lease dance recorded in `CLAUDE.md`, and handoff 43's warning
   stands: **`git fetch origin` FAILS as the work account**, so the switch comes
   first and the lease is worth nothing before the fetch.
2. ✅ **DONE IN SESSION 45. `demo/shell/pedal.mjs` EXISTS**, with
   `demo/shell/pedal-test.mjs` beside it and `/muta/` switched over in the same
   change. The four things that page got right are all in it, plus the half
   pedal reading and the raw value. `/muta/` is unchanged at 51/51.
3. **`/muta/`'s check block is about twelve seconds long** and is the reason the
   harness ceiling had to move. It is not obviously too long for what it grades,
   but it is the longest on the site and worth watching.
4. **A GENERAL MIDI PAGE, from the `nola` research**: SpessaSynth is
   Apache-2.0, AudioWorklet, and is the one library that holds note offs until
   the pedal lifts as documented engine behaviour.
5. **Everything from session 43 that was not touched**: no page is graded on a
   phone, the board half of `/muta/`, `CHANNEL STRIP`'s specimen, the four
   checks that stopped being made, the segmented choice still being `button`,
   and the two vertical rhythms.
6. **The greyed `??` diagram boxes for hardware not on the desk**, raised twice
   and still blocked on `/wish/`'s reply gaining a free text field beside the
   port `enum`.
