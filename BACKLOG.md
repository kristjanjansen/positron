## Open

### Done 2026-09-26: the take adaptation is wired, and the deploy holds the new table

✅ **BOTH DONE. MEASURED: `/nola/` 103/103 to 106/106**, exactly +3 page asserts
and nothing else moved. The artefact was rebuilt in `d27cbe1` and
`workers/view/public/resources/chord-tables.json` now reads **18,237 bytes**.

✅ **`heard` IS CALLED IN `settleNow`, NOT IN `addLearned`, AND THE DIFFERENCE IS
A NUMBER ON THE PAGE RATHER THAN AN ARGUMENT.** It sits straight after
`chordKey(...)` and ABOVE every early return under it, so a chord the learning
rules refuse to write into the roll is still a chord somebody played. MEASURED:
the harness’s scripted take puts **7 chord events into the take while the roll
holds 2 rows**. Fed from `addLearned` it reads 2.

✅ **THE NEGATIVE CONTROL IS DRIVEN, NOT DECLARED**, which is the whole point.
The block already plays this page’s own proposal twice, so the counts are
snapshotted either side and the deltas asserted. Read on the green run: **7
chords played into the take and 3 of the page’s own refused**, the third being
the earlier fade check. **So `refused` has a real source and cannot be 0 for want
of anything ever being offered.**

✅ **FOUR SABOTAGES, EACH RUN AND REVERTED.** No provenance test reads
`10 chord(s) played and 0 refused` against the true 7. The take built and never
passed reads `0 time(s)`, **and every other assert on the page stayed green,**
which is exactly the hole that one exists for. Fed from `addLearned`, 2 red.
Passing it to `suggest` but not `routeTo` reads `1 time(s)`, so it cannot be
satisfied by half a wiring.

⚠️ **AND TWO THINGS ARE LEFT THAT ONLY PLAYING CAN SETTLE.** A very short take
leans hard: on a 7 event take of two distinct chords one way home came out
`Fmaj7 IV, Fmaj7 IV, Fmaj7 IV, Cmaj7 I`. It is not stuck, and the 12 draw check
found **7 distinct ways home against 5 before the wiring**, but a take of two
chords repeated is not the 30 to 80 chord chart the +6.32 was measured on.
⚠️ **AND THE HUNTING CHORDS COUNT AS PLAYED.** Reaching for a suggested
`Gmaj7` makes `Gmaj` then `G5`, which the roll refuses by its root guard but
which are not in `proposed` and so reach the take as played. That follows the
rule exactly and they are chords the hands really made. **If it should be the
roll’s rule instead, it is one line at the same site.**

🔴 **TWO THINGS ARE OWED AFTER `b0a0b06` AND THE KEEP WORK, AND NEITHER IS A
DEFECT. THEY ARE UNFINISHED WIRING.**

**1. `mkTake()` IS BUILT, GRADED AND CALLED BY NOTHING.** The within take
adaptation measures **+6.32 points of top 1** and it is idle until `/nola/` feeds
it. The API is in the commit message and in the plan’s section 14.
🔴 **AND `addLearned` IS THE WRONG SITE, WHICH WOULD WASTE MOST OF THE GAIN.**
`learned[]` is the DISTINCT chords somebody kept returning to, capped at
`LEARN_SLOTS = 6`. The take wants **the stream of chord events, repeats
included**, once per event.
⚠️ **AND THE PROVENANCE RULE IS ALREADY ON THAT PAGE**, from a report reading
*"you recorded a suggestion. why>"*. `take.heard(chord, proposed.has(key) ?
'suggested' : 'played')` makes it COUNTABLE, and `take.refused` is what the
assert reads. **There is no default source**, so a call that forgets to say is
refused rather than counted.

**2. `workers/view/public/resources/chord-tables.json` IS THE OLD 12,746 BYTE
TABLE.** `public/` is a committed deploy artefact and `cd workers/view && node
build.mjs` does `rm -rf public/`. ⚠️ **So that build belongs to a moment when
nothing is in flight**, which is why no agent ran it.

### Done 2026-09-25: a voicing with the root in the left hand and the rest rootless

✅ **DONE 2026-09-25 AS `Split`. MEASURED: chords-test 49 ok to 60 ok, `/nola/`
102/102 to 103/103**, so the fourth control button cost no assert anywhere and
the one new page assert is the whole of the change. Open it at
**http://127.0.0.1:8890/nola/** and press `Split` in the VOICING row.

**THE FOUR CHORDS FROM THE SCREENSHOT, ACTUAL NOTE NUMBERS**, window 48 to 72,
written out by hand in the test rather than computed from the rule they grade:

    Cmaj7   48, 52, 55, 59    C3 / E3 G3 B3
    Dm7     50, 53, 57, 60    D3 / F3 A3 C4
    Em7     52, 55, 59, 62    E3 / G3 B3 D4
    Fmaj7   53, 57, 60, 64    F3 / A3 C4 E4

The bass walks C3 D3 E3 F3, one note a chord, and the right hand travels **14
semitones over three changes, worst single move 2**. That is the tutorial’s two
staves.

✅ **THE NAME IS `Split` AND THE JARGON IS KEPT OUT OF SIGHT.** `rootless` and
`shell` are the vocabulary this control already drew a complaint about, so the
musician’s name is written once in `chords.mjs` for a reader who knows it and
nowhere a visitor looks. The hover reads *"the root on its own for your left hand
and the rest of the chord above it for your right"*.

✅ **A TRIAD LOSES ITS ROOT LIKE EVERYTHING ELSE** and gets a two note right
hand, `Cmaj` as C3 / E3 G3. Dropping the fifth instead would put the root back
above a bass that already has it, which is the one thing the mode exists to take
away. **Nothing is ever lost**, and that is an invariant over ten chords: a split
voicing holds exactly the pitch classes of the spelling.
🔴 **AND A SLASH CHORD KEEPS ITS ROOT, DECIDED BY A RED TEST RATHER THAN BY
TASTE.** `Fm6/C` is C3 D3 F3 G#3 C4. The premise of the mode is that the note
underneath already HAS the root; `Fm6/C` names a different note underneath, so
the premise fails and dropping the F would delete a note the symbol names. **The
first version dropped it and the pitch class assert went red**, which is how the
decision got made.

✅ **FOUR SABOTAGES, EACH RUN AND REVERTED**: leaving the root in the hand 4 red,
dropping it from a slash chord as well 2, placing the hand by span instead of
leading it 1, dropping the fifth instead of the root 5.

🔴 **ONE MEASUREMENT DECIDED A LINE OF CODE.** The distance is taken over the
BODY and not the whole voicing, because the bass is supposed to walk. MEASURED
over five lines and thirty chords: the hand travels **114 semitones compared body
to body against 132 compared whole to whole**, choosing differently on **10 of the
30**. ⚠️ **And on the four chords in the screenshot the two agree note for
note, so the supplied evidence would have settled nothing.**

⚠️ **THE PAGE GIVES `split` THE WHOLE DRAWN KEYBOARD (48 to 72) RATHER THAN
THE LETTER ROW (48 to 62).** MEASURED: into the letter row three of the four fit
and `Fmaj7` needs 64, **two semitones above the top letter key**. The letter row
is one hand and this voicing is two, so the mode declines a promise it never
made. **The bass is never let out of the window**, because the roll has no column
for a note the keyboard does not draw.

⚠️ **STILL OPEN: NOBODY HAS PLAYED IT.** Every number here is note numbers and
pixels, and whether this is the sound in the screenshot is a listening question.
⚠️ And a caller handing this mode an ALREADY INVERTED chord would have its
lowest note taken for a root. Every caller here passes `parseChord` output, so it
is documented and not enforced.

🔴 **ASKED, VERBATIM, WITH TWO SCREENSHOTS:** *"what voicing? wanna this"*.
One crop is `/nola/`’s roll on `Cmaj7 Dm7 Em7 Fmaj7`. The other is a piano
tutorial of **the same four chords**, notated on two staves: **a single bass note
per chord in the left hand (C, D, E, F) and three notes in the right that barely
move between chords.**

✅ **WHAT IT IS, NAMED: A ROOTLESS VOICING OVER A BASS ROOT.** The left hand
takes the root alone, the right hand drops the root and plays the notes that
carry the harmony, and the upper structure is placed to move as little as
possible from the chord before it. **That is why the tutorial’s treble barely
moves while the bass walks up C D E F.**

🔴 **AND `/nola/` CANNOT DO IT TODAY, WHICH THE PLAN ALREADY SAID IN
WRITING.** `plans/plan-better-chords-2026-09-25.md` section 12.2: the page voices
with `voiceChord(... near, bass: false)`, *"which is close position, no bass and
no inner voice motion, into a sampled piano"*, and **"nothing in this document
changes one thing a listener hears about the SOUND of a chord"**. It called this
*"probably the larger half of the complaint"*. **This is that half.**

⚠️ **`bass` ALREADY EXISTS IN `voiceChord` AND IT IS NOT THIS.**
`demo/shell/chords.mjs:319` takes `bass = false`, and `:322` reads
`src[0]`, **the lowest note of a SLASH chord’s named bass**. `:277` records
that the bass is never inverted in any mode. So the machinery for putting a note
underneath exists and is about `Fm6/C`, not about splitting a chord across two
hands. **Do not overload it silently.**

⚠️ **IT IS A FOURTH ENTRY IN A SHARED CONSTANT.** `VOICINGS = ['root',
'close', 'lead']` at `:282`, and `/nola/:1228` draws them as
`[['Exact', 'root'], ['Tight', 'close'], ['Smooth', 'lead']]`.
🔴 **SO THE NAME MUST BE A PLAIN WORD AND THIS PAGE HAS ALREADY PAID FOR
GETTING THAT WRONG.** The labels read `SPELLED`, `CLOSE` and `LEADING` for ten
minutes and the report was *"i do not know what spelled close leading means"*.
**`rootless` and `shell` are exactly that vocabulary again.**

⚠️ **AND ADDING A CONTROL OPTION MOVES EVERY OTHER CONTROL’S HARNESS PRESS**,
which is `positron-verify`’s standing rule. `chords.mjs` is imported by
`keyboard.mjs`, `roll.mjs`, `name.mjs`, `suggest.mjs` and `/nola/`.
⚠️ **THE ROLL HAS TO SURVIVE IT**: a bass note an octave or two below the
body widens the range `roll.mjs` draws, and this page already records a roll
drawn beside the instrument having *"neither its width nor its range"*.

### Done 2026-09-26: the keyboard looper detects a tempo and every later loop aligns to the first

✅ **DONE. Arithmetic `93acf28`, wiring `eb50054`. MEASURED: `numloop-test` 15
ok to 36 ok, `/kit/` 223/223 (211 page asserts) to 227/227 (215).** Open it at
**http://127.0.0.1:8890/kit/#keyboard**.

A second take of 300 ms against a first loop of 500 ms comes back at **250 ms**,
so it wraps exactly twice inside the first for ever instead of walking away.

✅ **TWO CELLS, EACH WITH ITS ABSENCE.** `150 bpm heard` off the playing,
`150 bpm set` when a page stated it, **empty** when there is none, never 0 and
never 120. The ratio reads `first`, then `x1/2 x1 x2 x1/4 x4`, and **`as played`
when the snap was refused. A refusal is a word, not a blank.**

🔴 **THE BRIEF’S PAGE LIST WAS WRONG AND IT IS SEVEN, NOT NINE.** `radio`
uses `looper.mjs` and `dump` only names `keyboard.mjs` in two comments. Measured
by COUNTING ELEMENTS in a browser rather than by grepping.

🔴 **AND ONE SABOTAGE CAME BACK FULLY GREEN, SO THAT CHECK WAS DECORATION.**
With notes struck and released in the same millisecond, feeding all eight
movements still answers four onsets, because `numloop.mjs` collapses anything
inside 50 ms into one chord and a down and its own up were 0 ms apart. Holding
each note 70 ms is what makes the wrong list answer eight.

🔴 **AND `/kit/` IS NOW CLOSE TO A CLIFF WHERE THE WHOLE PAGE READS RED.**
`verify.mjs` waits `1400 ms + 40 polls of 150 ms` for `d.ready()`. A first draft
of this block spent 2.7 s and took `/kit/` to **0/1 with 207 asserts** and
*"console: nothing, so it is hanging rather than throwing"*. The shipped block
spends 1.33 s and the page is ready at 7.2 to 7.4 s against a budget of roughly
7.8 to 8.6 s. **Under a second and a half is left in that file.**
⚠️ **AND THE ONE WORD NO CHECK IN THIS REPOSITORY DRAWS IS `heard` ITSELF.** A
tempo `numloop.mjs` will speak about needs three gaps of at least 375 ms, which
does not fit in that budget, so detection off real playing is graded by its INPUT
plus `numloop-test`’s 36 with no browser.

🔴 **ASKED, VERBATIM:** *"in keyboadd looper: do basic bmp detection / quant
and when first loop set, all next ones align on it, either times shorter, same or
longer"*.

**The subject is `demo/shell/numloop.mjs`, NOT `looper.mjs`**, and that is worth
establishing first because the two are easy to confuse. MEASURED: `keyboard.mjs`
imports `createNumLoop` from `./numloop.mjs` at `:125`, and `looper.mjs`’s real
importers are `transport-bar.mjs`, `/loops/`, `/looper/`, `/radio/` and
`/tapes/`. **The keyboard’s loops are the numeric ones.** `keyboard.mjs:122`
states the division: *"`numloop.mjs` owns WHICH slot is doing what; the keyboard
owns what"*.

✅ **THE TEMPO ARITHMETIC IS ALREADY IN THE KIT AND IS NOT BEING INVENTED.**
`demo/shell/step-grid.mjs:184` exports `stepMsFor(bpm, perBeat = 4)` and `:729`
carries a `bpm()` getter and a `setBpm()`. **Reuse it**, or the project has two
tempos that will disagree.

✅ **"EITHER TIMES SHORTER, SAME OR LONGER" IS AN INTEGER RATIO AND THAT IS THE
WHOLE ALIGNMENT RULE.** The first loop set becomes the unit, and every later one
is snapped to a power or a small integer multiple of it, so two loops can never
drift apart. **The set of allowed ratios is a decision to make out loud**, not a
default, because 1/4, 1/2, 1, 2, 4 and 1/3, 1, 3 are different instruments.

🔴 **AND A DETECTED TEMPO IS AN INFERENCE, WHICH THIS PROJECT HAS PAID FOR
REPEATEDLY.** *Basic* BPM detection off a take that is not metric returns a
number, and a number shown without its confidence is read as a fact. **Say
whether it was detected or assumed**, the same way `/knobs/` reports whether a
key was guessed. ⚠️ And decide what happens when the first loop is one note or
silence: there is no tempo in it, and the honest answer is not 120.

🔴 **THE ASSERT TRAP IS ALREADY WRITTEN DOWN ON THE PAGE NEXT DOOR.**
`/loops/` shipped *"quietly not looping"*: the page passed no `tickHost` and
never called `servo()`, so a wrap *"was neither committed nor polled: it simply
never happened"*, and **"the assert that should have caught it was tolerant of
'not reached yet' and passed vacuously every run"**. ⚠️ **So every assert here
asks what HAS HAPPENED, counted, never what is happening.** A second loop that
aligned is a loop that WRAPPED at the expected moment, counted.

✅ **`numloop-test.mjs` GRADES THIS WITH NO BROWSER AND IS THE CHEAP
INSTRUMENT.** ⚠️ **AND IT CARRIES ITS OWN WARNING**: writing the expected state
out by hand is doing the machine’s arithmetic a second time, so a test that
recomputes the implementation proves nothing.

⚠️ **IT IS SHARED: the keyboard reaches TEN pages.** The arithmetic is
`numloop.mjs`’s and the control and the readout are `keyboard.mjs`’s, which is
that file’s own stated division and is also how this can be worked while another
agent holds `keyboard.mjs`.

### Open 2026-09-25: the keyboard’s note naming pair reads N and D, not Nt and Dg

⚠️ **ASKED, VERBATIM:** *"Nt | Dg to N | D in keyboard"*. The naming pair in
the keyboard’s own footer.

🔴 **IT IS `demo/shell/keyboard.mjs`, SO IT REACHES TEN PAGES AT ONCE** and
is done by whoever holds that module, never per page.

⚠️ **THE WIDTH RULE APPLIES HERE TOO.** It is a two state pair in a segmented
control, and this round has already established that a control must not change
size between its states. `Nt` and `Dg` are both two characters and `N` and `D`
are both one, **so the pair stays balanced with itself**, but the group gets
narrower and the row beside it must not reshuffle.
⚠️ **AND A ONE LETTER CONTROL NEEDS ITS HOVER.** `N` and `D` alone are not
self explanatory, so the `title` and the accessible name have to say note names
and degrees in full. **A private vocabulary on a control a visitor has to be told
about is exactly what `positron-ui` bans**, and `/nola/` already paid for it once
with *"i do not know what spelled close leading means"*.

### Open 2026-09-25: the keyboard footer rule is edge to edge, and it belongs to the kit

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT, AND IT IS A CRITICISM OF HOW THIS
IS BEING WORKED RATHER THAN OF ONE BORDER:** *"the border on top of footer goes
edge to edge. in the life of me i don ot understand why you do not see it and
build a soliutiojn that stays (glued panels) not invent custom css with
measurements each time"*. And immediately after: *"add space on left of nona to
be same as top and bottob paddings"*.

🔴 **AND IT LANDS ON WORK THIS ROUND SHIPPED, WHICH IS THE POINT.** While
`seam()` was being built in the kit as an edge to edge rule owned by a component,
`demo/nola/index.html:4397` hand rolled this:

    .nola-foot { --foot-air: 10px; ... border-top: 1px solid var(--line); }

That footer is appended to `keys.el`, INSIDE `.kbd`, and `.kbd` is
`padding: var(--kbd-pad)` with `--kbd-pad: 9px` (`shell.css:3576`). **So the rule
stops 9 px short of the box’s border on both sides.** A per page border with a
per page number, reasoned about at length in that page’s comments instead of
being put where it belongs.

✅ **THE FIX IS THAT `keyboard.mjs` OWNS ITS FOOTER AND THAT FOOTER’S RULE
BLEEDS THROUGH `--kbd-pad` TO THE BOX’S BORDER**, the same way `seam()` escapes
`--panel-pad` to reach a case’s edges. Same idea, different box, **derived from
the token rather than copied as a number so the two cannot drift**. One
implementation reaching the **ten** pages that import that module, so no page
writes this border again.
⚠️ **AND THE CONTENT KEEPS A SYMMETRIC INSET**, which is the second ask: the
`NOLA` plate sits at **0 px** from the row’s left while the row has 10 px above
and below. Left, top and bottom read the same.

⚠️ **THE PRECEDENT FOR WHY IT IS THE COMPONENT IS ALREADY PAID FOR TWICE.**
`/tom/`’s nameplate, where a page local repair meant *"every page after it
inherited the defect and not the fix"*, re-reported on `/plai/`. The `/shape/`
agent refused a page local `padding-block` the same hour for the same reason.

### Open 2026-09-25: `/knobs/` has a flaky pair of asserts, and the constant is 6.4x stale

🔴 **TWO ASSERTS ON `/knobs/` ARE A COIN TOSS, PROVED ACROSS THREE RUNS:**
`a wheel and an arrow key each take the dial back in one frame` and `and it picks
the movement up again after the yield`. **Red in one run, green in the next, red
in the third**, with no code change between them.

🔴 **AND THE ARITHMETIC SAYS IT CANNOT BE RELIABLE, WHICH IS WHY THIS IS A
DEFECT AND NOT A RERUN.** Both conditions hinge on whether the cutoff moved **one
step of 127** during an `await wait(900)`. The sweep is `lapMs: 14000` on a
beta(3,4) ease in with a 130 ms hold at each end and 12% timing jitter, **and the
knob starts AT an end**. 900 ms is **6.4% of one reach**, most of it the hold and
the slow part of the curve, so the expected travel is a fraction of one step.

🔴 **THE CONSTANT WAS CHOSEN WHEN THE LAP WAS 2,200 ms. IT HAS SINCE GONE
2,200 to 7,000 to 14,000, A FACTOR OF 6.4, AND THIS ONE WAS LEFT UNDERIVED.**
⚠️ **AND THE SIBLING WAIT FIVE LINES BELOW IT IN THE SAME FUNCTION ALREADY
CARRIES A COMMENT SAYING THIS EXACT THING HAPPENED TO IT AND WAS FIXED BY
DERIVING IT FROM `lapMs`.** The fix was applied to one of a pair.

⚠️ **THE ONE LINE VERSION DOES NOT WORK AND WAS CHECKED**: a tenth of a lap is
still only about two steps. Reliability needs roughly a THIRD of a lap, about
**4.9 s added** to a page that already leans on the harness’s patience, **or a
different quantity to assert**. That is a design call, which is why it is written
here rather than patched.

### Open 2026-09-25: `full: true` reaches nothing on `/knobs/`, and it was hidden by a dead assert

⚠️ **FOUND 2026-09-25 while repairing an assert that could never fail.**
`.kbd.kbd-full` is `width: 100%` of a `max-content` host, **so the option has no
effect on this page at all.** It was invisible because the assert that should
have caught it compared the keyboard’s box against the very flow that box sizes.

✅ **THE REPAIR WAS MEASURED AND NOT APPLIED, DELIBERATELY.** Banded, the box
reads **582.0 px, the case’s own content width**, with the keys scrolling inside
it, 777 px in 564 px. **The repair is the band**, so this waits on the band
rhythm work rather than gaining a page local workaround.

### Open 2026-09-25: a synth on/off says ON and OFF, not FAU ON and FAU OFF

🔴 **REFINED IN THE SAME STREAM, VERBATIM:** *"just [() ON] and [() OFF]
(same w)"*. Two things, and the second answers the open question below.

✅ **THE DOT STAYS.** The control is the dot plus the word, so this is
`showName: false` and NOT stripping the badge to a bare word. The leading dot is
fixed to the text by the reserve, and `presence.mjs:345` records that moving it
right failed once and was asked back.

🔴 **AND `(same w)` IS A REQUIREMENT RATHER THAN A CHECK: BOTH STATES ARE
THE SAME WIDTH.** `OFF` is one character wider than `ON`, so the reserve after
the name is dropped is computed on the WIDER of the two, not on whichever one is
showing. **The button may not change size when it is pressed.**
✅ **THE PRECEDENT IS ALREADY HERE**: the transport bar reserves both words of a
two state button so that *"the control cannot change size under the finger that
pressed it"*. This is that rule on a different control.
⚠️ **THE ASSERT IS EQUALITY, NOT A TOLERANCE.** Read the width in `online` and
again in `offline` and require them EQUAL. A tolerance would hide exactly the
defect being asked about, and it must be driven through a real toggle so it
cannot pass vacuously.

⚠️ **ASKED, VERBATIM:** *"on synth on offs do not add synt name to fau on /
fau off: just ON OFF"*.

✅ **TRACED RATHER THAN GUESSED.** `buildHeader` in `demo/shell/instrument.mjs`
at `:169` reads `of = name`, so **the header’s status control defaults to the
instrument’s own name**, and `presence.mjs:329` paints the name and the state as
one string when a badge has an `of`. That is what makes it read `FAU ON`.

✅ **THE OPTION ALREADY EXISTS AND NOTHING IS INVENTED**: `showName: false`.
🔴 **AND `of` STAYS, WHICH IS THE PART THAT IS EASY TO GET WRONG.** The aria
label at `:178` is `switch ${of} on and off`, and a screen reader has to know
WHAT is being switched. *"switch on and off"* names nothing. **So this changes
what is PAINTED, not what the control knows about itself.**

✅ **AND THE ARGUMENT IS ALREADY IN THAT FILE FROM THE OTHER SIDE.** The header
carries the nameplate on the same row, and `instrument.mjs` records refusing a
plate beside a header because *"a plate beside it is the name twice on one row"*.
A status button naming the instrument again is that a third time.

**WHO IT REACHES**, MEASURED, pressable headers only: `/fau/:1194` (`FAU`),
`/muta/:783` (`PLAITS`) and `:918` (`WARPS`), plus `/kit/`’s three specimens.
`/knobs/` has `online: false` and is unaffected. **Three real pages, one kit
change.**

⚠️ **THE THING TO CHECK IS THE RESERVE, NOT THE WORD.** `presence.mjs`
reserves the widest phrase the badge can say, and the dot is fixed to the text
BECAUSE of that reserve. `:345` records that going the other way failed once and
was asked back. **Dropping the name changes the widest phrase**, and a reserve
computed on a phrase that no longer exists leaves the dot floating with a gap,
which reads as a stray mark rather than part of a label.

### Open 2026-09-25: the chord name moves about one character left in the keyboard

⚠️ **ASKED, VERBATIM:** *"move chordname ca 1ch left in keyboar"*. A nudge,
not a re-layout: *ca 1ch* is about one character width.

**The subject** is `.kpad-chord` in `demo/shell/keyboard.mjs`, built at about
`:913` as `make('span', 'kpad-chord', '')` with
`chordEl.style.minWidth = `${CHORD_CH}ch``, sitting in the keyboard’s own footer
to the right of the displacement readout.

🔴 **IT IS SHARED, SO IT IS DONE ONCE.** `demo/shell/keyboard.mjs` is
imported by **ten** pages (`able`, `fau`, `dump`, `evo`, `instrument`, `knobs`,
`kit`, `looper`, `nola`, `radio`) plus `chords.mjs` and `roll.mjs`.

🔴 **AND THE ONE THING NOT TO BREAK IS THE REASON THE CELL EXISTS.** It
RESERVES the widest name it can ever hold, computed from `name.mjs`’s own
tables rather than typed, so that a name going from `C` to `G#min7b5/D#` does
not move everything beside it. The original ask was *"avoind text moving in x
axis"*. **A nudge that makes the cell size to its content would answer this ask
by reinstating the one it was built to fix.** Read the cell’s left edge with a
one character name and again with a long one, and check both.
⚠️ **EXPRESS IT IN `ch`.** `ch` on a mono face is exactly characters, which is
what makes that arithmetic a measurement rather than an estimate.

### Done 2026-09-25: `/nola/`'s instrument choice becomes the standard patch selector

✅ **DONE 2026-09-25. MEASURED: 95/95 green before, 98/98 green after**, so the
three new asserts are the whole of the change in the count and no existing one
went silent. Open it at **http://127.0.0.1:8890/nola/**.

**The licence survived, which was the one part that could have broken something
outside the page.** The credit is written back onto the value cell after every
draw through the single function that calls `show()`, so `picker.mjs` overwriting
its own title no longer loses it. ⚠️ **AND THE ASSERT NOW HAS A NEGATIVE
CONTROL IT DID NOT HAVE BEFORE**: it reads the title with the Rhodes chosen, then
reads it again after switching to the piano and requires it to have CHANGED. A
credit written once at build would have been wiped by the redraw, and the old
shaped check would have stayed green on whatever was left.
⚠️ **ONE THING GENUINELY CHANGED FOR A READER**: a choice gave every option
its own button and so a hover that existed whatever was selected, and a selector
shows one name at a time, so the credit now FOLLOWS the selection. It is
reachable while the Rhodes is chosen and not while the piano is. The log line on
the first Rhodes press is the second channel and is untouched, and
`LICENSE-jrhodes3d` and `PROVENANCE-rhodes.json` still ship.
⚠️ **AND THE TEN INDEX DRIVEN PRESSES ARE GONE**, eight of them replaced by a
helper that presses the control until it reads the instrument NAMED. The tenth,
the one whose meaning genuinely inverted, became an explicit press of `‹` WITH
an assert on it, so the back arrow is no longer a button nothing in this
repository has ever pressed.
⚠️ **OPEN, AND SMALL**: the plate reads `NOLA` in upper case, which is the
kit default. `/shape/` and `/knobs/` both take `caps: false` because their asks
named a lower case word. Nothing was said about this one, so it took the rule.

🔴 **ASKED, VERBATIM:** *"in nolda demo convert instrument radiobutton to std
patch selector and add top border to that footer. add nola nameplace to the left
of footer"*. `nolda` is `nola`, `nameplace` is nameplate. Three changes to one
row: the control, a border above it, and a plate at its other end.

**Where it is today.** `createChoice` at `demo/nola/index.html:1070`, `label:
'INSTRUMENT'`, `options: [['Piano', 'piano'], ['Rhodes', 'rhodes']]`, mounted at
`:1205-1207` into `.nola-foot`, which is appended to `keys.el` and so lives
INSIDE the keyboard's own box. The standard patch selector is
`createPicker({ what: 'patch', prev, next })` from `demo/shell/picker.mjs:171`,
as `demo/kit/index.html:1478` and `demo/fau/index.html:1195` already call it.

🔴 **THE PAGE'S OWN CHECKS DRIVE THIS CONTROL BY INDEX, AND THE TWO COMPONENTS
INDEX DIFFERENTLY, SO A BLIND SWAP STAYS GREEN AND DRIVES THE WRONG THING.**
`createChoice` gives one button PER OPTION, so `instPick.buttons[0]` is Piano and
`buttons[1]` is Rhodes. `createPicker` returns `buttons = [back, fwd]`
(`picker.mjs:213`), so `buttons[0]` becomes *previous* and `buttons[1]` becomes
*next*. MEASURED 2026-09-25: **ten call sites** in this page click one of the
two, at `:3023`, `:3079`, `:3110`, `:3309`, `:3331`, `:3357`, `:3365` and
`:3375`, plus a title read at `:3092` and a box read at `:2546`.
⚠️ **AND THE FAILURE IS SILENT IN THE ONE DIRECTION THAT MATTERS.**
`buttons[1].click()` meaning *Rhodes* happens to still land on Rhodes, because
*next* from Piano is Rhodes. `buttons[0].click()` meaning *back to Piano* becomes
*previous*, which from Piano either wraps or does nothing. **Every one of those
ten is rewritten to name the instrument, not an index.**

🔴 **AND THE LICENCE HOVER HAS NO HOME ON A PICKER, WHICH IS THE ONLY PART OF
THIS ASK THAT CAN BREAK SOMETHING OUTSIDE THE PAGE.** The Rhodes is used under
CC BY-NC-SA 4.0, attribution has to travel with the work, and since 2026-09-23
the attribution IS this control's hover: `title: (id) => ...` at `:1075`,
asserted at `:3092-3094` against `/Learman/` and `/CC BY-NC-SA 4\.0/`. A picker's
arrows carry `the patch before this one` and `the patch after this one`, and its
value cell **overwrites its own title on every draw**: `cell.title = label_` at
`picker.mjs:103` and again at `:160`. So anything written there is gone the next
time the name is drawn. **Decide where the attribution lands before converting
the control.** It is not a paragraph under the keys, which was already removed on
instruction.

⚠️ **THE COMMENT ABOVE THE CONTROL ARGUES AGAINST THIS ASK IN WRITING.**
`:1056-1058`: *"Two mutually exclusive named options is `createChoice` and
nothing else: `picker.mjs` is a stepper for a list too long to show"*. An
instruction supersedes a rule and `LAYOUT.md` already says so. What it must not
do is stay there contradicting the page.

⚠️ **THE TWO CSS HALVES FIGHT EACH OTHER TODAY.** `.nola-foot` at `:4133` is
`display: flex; align-items: flex-end; margin-top: 10px`, and `:4134` is
`.nola-foot > * { margin-left: auto }`, which parks its one child hard right. A
plate on the LEFT and the picker on the right is `space-between` with that
blanket `margin-left: auto` removed, or both children end up right.

✅ **THE PLATE IS A KIT COMPONENT AND THIS PAGE HAS NONE TODAY**, measured: zero
occurrences of `nameplate` or `pos-plate` in `demo/nola/index.html`.
`createNameplate` is `demo/shell/panel-layout.mjs:355` and `plateSpec(maker,
name, place)` is `demo/shell/instrument.mjs:102`.
⚠️ **AND `plateSpec` DOWNGRADES A ONE LINE PLATE, WHICH IS THE OPPOSITE OF THE
INTUITIVE ANSWER.** `plateSpec('', 'nola')` returns place `end`, not `ends`,
because `ends` is `space-between` and parks a lone child on the LEFT, which is
exactly the placement this ask wants. Read the block at `instrument.mjs:82-99`
before choosing a placement.

⚠️ **THE FOOTER IS INSIDE `keys.el`, NOT UNDER IT, AND THAT WAS DELIBERATE ON
2026-09-25.** The keyboard's box is `width: fit-content`, so a sibling below it
would be a different width or force the box to stretch, and stretching it is the
one thing that box refuses. **A top border is therefore the first line drawn
across the inside of the keyboard's box**, so it is checked against that box's
own border rather than eyeballed.
⚠️ `positron-ui` loads before a line of this is written. If a picker variant or
the plate change lands in `demo/shell/`, it is SHARED, done once, `/kit/` re-run.


### Open 2026-09-25: `/shape/` loses its left rail and the plate moves to the top right

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT:** *"rm left panel / section. use
nameplate on top right. shape demo"*. The crop shows the rack's `VOICE` section,
four sliders, and a narrow column down the left holding `shape` turned ninety
degrees.

🔴 **THIS REVERSES AN ASK FROM THE SAME DAY AND THE OLD ONE IS QUOTED IN THE
FILE.** `demo/shape/index.html:576`: *"into isntrument box. nameplate is
\"shape\" vertical glued section"*. The vertical plate IS that instruction. So
this is a reversal, not a repair, and the reasoning around it comes out with it
rather than being left to contradict the page.

🔴 **AND IT DOES NOT STRAND THE KIT PLACEMENT, WHICH WAS WORTH CHECKING BEFORE
ASSUMING IT DID.** `place: 'side'` was created for this page and
`instrument.mjs:97` says so: *"`/shape/` is exactly that, `shape` with no maker.
Sending it to `end` would put the one page that asked for a vertical plate back
on a horizontal one"*. MEASURED 2026-09-25: `side` has exactly **two** callers,
`demo/shape/index.html:608` and `demo/knobs/index.html:730`. ⚠️ **`/knobs/` keeps
it, so `side` and `KEEPS_ONE_LINE` stay.** Deleting either would break the other
page.

⚠️ **THREE CHECKS READ THE THING BEING REMOVED.** `demo/shape/index.html:1373-1377`
measures the plate's height against the case's inner height and asserts
`place === 'side'`. `demo/shell/instrument-test.mjs:80-87` grades
`plateSpec('', 'shape', 'side')` with no browser at all. **The page assert moves
to the new placement; the kit test stays**, because it is about the function and
`/knobs/` still calls it that way. Rewriting the kit test to match this page
would delete `/knobs/`'s only no-browser coverage of that path.

⚠️ **`panel: { side: null, flow: false, plateSide: 'left' }` AT `:609` IS THE
LEFT RAIL**, and `panel-layout.mjs:187` only sets `plateSide` when the place is
`side`. *"rm left panel / section"* is that rail. **Check what else is in it
before the column goes.**
⚠️ **TOP RIGHT IS A HEADER AND THIS PAGE HAS NO HEADER**, stated at `:584`:
*"This page has no header, this plate is not on that row"*. So this either builds
that header row or puts the plate in the rack's first row. `instrument.mjs:108`
is the header and its right cell is the plate's home, at `end` and never `ends`.


### Part done 2026-09-25: an edge to edge horizontal separator on every button group

✅ **THE KIT HALF IS DONE, COMMIT `8ea1b59`. MEASURED: `/kit/` 217/217 before
(205 page asserts) and 221/221 after (209), so the four new asserts are the whole
of the change.** `verify.mjs muta shape` 104/104 green, `instrument-test` 17 ok.

    panel.seam()     a rule, edge to edge of the case
    panel.band(el)   a block stacked across the case, under what is there
    inst.seam() / inst.band(el)   forwarded by createInstrument

⚠️ **`band()` IS NOT `add()`.** `add()` puts a block in the scroller,
`band()` puts it in the case, and that distinction is the whole constraint.

🔴 **AND THE CONSTRAINT IS STRUCTURAL RATHER THAN STYLISTIC, MEASURED ON
`/knobs/` RATHER THAN ARGUED: A SEAM IS EDGE TO EDGE ONLY AS A CHILD OF THE
CASE.** Inside the scroller it is not hard, it is impossible. A rule put in that
page's `.panel-flow` laid out at **992 px against a 686 px case**, because the
flow is `width: max-content` around a keyboard wider than the panel. A negative
margin made it wider still and reached nothing: **`scrollLeft` clamps at 0**, so
inline-start overflow inside `overflow-x: auto` is clipped for good. **A page
whose sections live in the flow has to lift them into bands to get this.**

✅ **THE SEAM CROSSES A SIDE PLATE RAIL AND THE NAME IS PAINTED OVER IT.**
MEASURED: a side plate is `justify-content: flex-end` under `writing-mode:
vertical-rl`, so the ink sits at the TOP of the rail. `/shape/` **41 px of ink in
a rail of 1722**, `/knobs/` **41 in 199**. The rule passes behind the word and
reappears either side of it. ⚠️ The ground is on the LINE and not on the
plate, deliberately: a background on the plate would mask the whole rail and
erase the seam across it, which is the opposite of edge to edge.

🔴 **AND THE GRID CASE NEEDED EXPLICIT ROWS, WHICH `shell.css` PREDICTED IN
ITS OWN COMMENT**: *"which looks identical until a case grows a third child"*. A
case grows third and fourth children the moment it carries bands. MEASURED before
the fix, a four child case laid out `1721.5px 70.5px 0px 0px 1px 70.5px`, **six
tracks for four bands**, two of them empty ones the plate had blocked.

✅ **THE ASSERTS WERE SABOTAGED TO PROVE THEY BITE.** Remove the negative
margin: **2 of 4 red**, reading `20.0 px off the left inner edge and -20.0 off the
right`, which is the case’s own padding at both ends. Remove the row count:
**1 of 4 red**, with the seam and the band piled into row 1 at y17126.3. The
fourth is a negative control, a case with no side plate carrying no count.

⚠️ **STILL OPEN: WHICH PAGES GET SEAMS.** `/knobs/` and `/shape/` are being
decided by their own agents this round, and each has to judge whether lifting its
sections into bands costs anything it already guarantees. **`createButtonGroup`’s
four pages (`kit`, `mirror`, `twelve`, `weight`) were deliberately NOT swept**,
on the rule that a component name is not evidence that a page wants a rule drawn
through it.
⚠️ **AND NOTHING GRADES THE SEAM ON A PHONE.** `demo/verify.mjs` runs at 756
px with no viewport override and `--panel-pad` does not change there, so the
margin holding at phone width is READ and not measured.

⚠️ **ASKED, VERBATIM:** *"on each button group have horizontal panel separator
edge to edge"*.

🔴 **THE SUBJECT IS AMBIGUOUS AND THE TWO READINGS ARE DIFFERENT WORK, SO IT IS
WRITTEN DOWN RATHER THAN GUESSED AT SILENTLY.** It arrived directly after the
`/shape/` screenshot, and **`/shape/` has no button group**: it has nine SLIDER
sections, read at `:1491` as `VOICE OSC 1 OSC 2 MIXER FILTER ENVELOPE 1
DISTORTION CHORUS MACRO KNOBS`, drawn as `.sld-group`. The kit's
`createButtonGroup` is `demo/shell/button-group.mjs:75` and has **four** page
callers plus `pad.mjs`: `kit`, `mirror`, `twelve`, `weight`.
✅ **THE `/knobs/` SKETCH THAT ARRIVED NEXT SETTLES IT AS A SECTION SEPARATOR**,
because it draws the rules between the rotaries, the keyboard and the footer and
none of those three is a button group. **Built as a panel section separator,
applied where a section boundary exists, and NOT swept across four pages on the
strength of a component name.**

⚠️ **EDGE TO EDGE IS THE WHOLE DIFFICULTY AND IS WHY THIS IS NOT A
`border-top`.** `.panel-case` is `padding: 0 var(--panel-pad)`, so a rule drawn
on the group itself stops short of the case on both sides. A separator that
reaches the case's own edges has to escape that padding.
⚠️ **AND `panel-layout.mjs:362` ALREADY RECORDS A HORIZONTAL RULE SHIPPING TWICE
BY ACCIDENT**, *"this project has already shipped twice as a horizontal rule
nobody wrote"*. Read that before drawing a third.
🔴 **IT IS SHARED WORK.** If it lands in `panel-layout.mjs`, `button-group.mjs`
or `shell.css` it is done ONCE, by one agent, before any page agent starts, and
`/kit/` is re-run.


### Done 2026-09-25: `/knobs/` always enables MIDI, and the rail is gone

✅ **DONE 2026-09-25. MEASURED: 31 green of 35 before (29 page asserts), 34 of
38 after (32).** The plate assert became three and the MIDI visit assert gained a
machine independent partner. Open it at **http://127.0.0.1:8890/knobs/**.

✅ **"ALWAYS ENABLE MIDI" IS THE ALREADY GRANTED READING AND IT RAISES NO
PROMPT.** `navigator.permissions.query({ name: 'midi' })` on load, and on
`granted` the page opens MIDI itself so the footer button arrives reading `midi
is listening` and disabled. On `prompt`, `denied`, `unavailable` or no answer,
the visit is exactly what it was.
🔴 **AND THE VACUOUS PASS WAS DESIGNED AROUND RATHER THAN WALKED INTO.**
The old `midiAskedOnLoad` counter is read on the module’s last line and a
permission answer arrives a tick later, **so on a granted browser it would have
stayed 0 while the page really had opened MIDI on the visit.** There are two
counters now and the checks await the permission answer before pressing.
⚠️ **THE BRANCH THE HARNESS GRADES IS `prompt`, AND THE ASSERT PRINTS IT.**
The other half is a named predicate run against all five answers with no
permission, no prompt and no device, so the naive reading (always true) fails the
`prompt` line and a page that never opens fails the `granted` line.

✅ **THE `shown()` DEFECT IS FIXED** and the assert it lived in is gone anyway,
replaced by `/shape/`’s two assert pattern reading `plate.lines[0]`, the ink.
MEASURED: 20.0 px of a 20.0 px inset on both edges.

✅ **TWO MORE REDS FIXED THAT WERE NOT IN THE BRIEF, AND BOTH WERE BAD CHECKS**:
`each rotary drives its own controller` pressed `ArrowUp` on a dial already at
**127, its ceiling**, so the key clamped and sent nothing and it read one
controller of two, looking exactly like a dial wired to nothing. The arrow points
away from the end now and the ceiling is read off `aria-valuemax`. Green at
`CC 71, 74`. And `the keyboard is twenty-five keys and its box spans the case`
**could never fail**: it compared the keyboard’s box against `.panel-flow`, which
is `width: max-content` and is therefore sized BY that box, printing `992.0 px
wide inside a flow 992.0 px wide` against a case of 686.0.

🔴 **AND THE HANDOFF’S ATTRIBUTION OF THE REMAINING REDS TO THE RASPBERRY PI
WAS WRONG, CHECKED 2026-09-25.** Both board shaped reds are **structurally
unreachable under a default harness run whether the Pi answers or not**:
`this page makes no sound of its own` needs `board.ctx()`, and `startAudio()` is
only reached from a key press or `startNote()`, which `MAY_PLAY` deliberately
blocks. `the relay delivered the control messages this page sent` needs
`w.sent > 0` and the same guard held all 42 messages back. **Both need
`?board=1`.** ⚠️ The Pi WAS answering minutes later, with the footer reading
ONLINE and the log reading `yoshimi is playing on the board`, and was not during
the verify run. Both are true and it comes and goes.

⚠️ **THE SEAM IS REFUSED HERE TOO, WITH `/shape/`’S COLLAPSE REPRODUCED
INDEPENDENTLY**: strip bottom to seam **0.0 px**, seam to keyboard **0.0**,
keyboard to the case’s inner bottom **0.0**. ✅ What measured well and is worth
keeping: the seam reached **x297.0 to x983.0**, the case’s own inner edges to the
pixel. 🔴 **AND ONLY ONE OF THE SKETCH’S THREE RULES WAS EVER THIS PAGE’S TO
DRAW**: `.panel-case` has a 1 px border and `createGlue` already puts 1 px of
`--line` between the case and the footer, measured at case bottom 344.8 against
footer top 345.8. **Three seams would have doubled two edges.**

⚠️ **`place: 'side'` NOW HAS ZERO PAGE CALLERS.** Nothing was deleted.

🔴 **CORRECTED 2026-09-25, AND IT REVERSES THE PLATE HALF OF THIS ENTRY.
ASKED, VERBATIM, WITH A SCREENSHOT:** *"knobs: rm right panel. use regular
nameplate. i do not usrstand what you are doing"*.

⚠️ **THE READING ABOVE WAS WRONG AND IT WAS THIS SESSION’S OWN.**
*"knobs nameplate vertically"* was read as *keep the plate vertical*, and the
part B written under it argued for keeping `side` and the rail. **What was
wanted is the rail GONE and a regular horizontal plate top right**, which is
what `/shape/` was given in `54a1d02`. The screenshot shows the rail as an empty
column down the right edge of the case carrying nothing but the turned word,
with the seams stopping short of it.

✅ **SO IT IS `/shape/`’S CALL, COPIED RATHER THAN INVENTED**: `place: 'end'`
with `panel: { side: null, flow: false }`, and BOTH `side: 'left'` and
`plateSide: 'right'` out, because `plateSide` is read only when the placement is
`side`.

🔴 **AND THIS STRANDS A KIT PLACEMENT, WHICH IS A THING TO DECIDE AND NOT
TO TIDY AWAY.** `place: 'side'` had exactly two callers, `/shape/` and
`/knobs/`, and after this it has **none**. `demo/shell/instrument-test.mjs`
still grades `plateSpec('', 'shape', 'side')` with no browser and stays green,
because it is about the function. ⚠️ **Nothing was deleted**, and the
question of whether a placement no page uses should stay in the kit is left open
here rather than answered by whoever happened to be editing.

⚠️ **AND THE REPORTING WAS PART OF THE COMPLAINT.** *"i do not usrstand what
you are doing"* arrived after two long reports about band rhythm and case
children. **The plumbing is not the report.** What shipped, what it looks like
and where to open it is.

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT AND A SKETCH:** *"knobs. always enable
midi, knobs nameplate vertically"*, drawn as

    -----------
    ()()  KNOBS
    -----------
    |||||||||||
    -----------
    footer

The crop shows the case's right rail carrying `knobs` turned ninety degrees, the
keyboard, and an `enable midi` button alone in the footer.

**A. 🔴 "ALWAYS ENABLE MIDI" RUNS STRAIGHT INTO AN ASSERT AND A STANDING RULE,
AND THE NAIVE READING SHIPS A PERMISSION PROMPT TO EVERY VISITOR.**
`demo/knobs/index.html:1482` asserts `midiAskedOnLoad === 0`, and `:1470` records
why: *"`requestMIDIAccess` raises a permission prompt"*. `CLAUDE.md`'s rule is
that a visit opens nothing and asks nothing. **Calling `requestMIDIAccess` on
load would put a browser permission dialog in front of somebody who came to
read.**
✅ **THE READING THAT SATISFIES THE ASK WITHOUT BREAKING THE RULE IS THE ALREADY
GRANTED ONE.** `navigator.permissions.query({ name: 'midi' })` answers `granted`
on a browser that has already said yes, and opening on that answer asks a first
time visitor nothing while removing the press on the desk where this page is
actually used. **That is what will be built unless corrected.**
⚠️ **AND THE ASSERT MUST NOT BECOME ONE THAT PASSES VACUOUSLY**, which is this
project's most repeated harness defect. *"zero asks on a visit"* conditioned on
*"unless already granted"* is exactly the shape that passes on a machine where
the condition never holds. **Grade both branches, or grade the branch the harness
is actually in and say which.**
⚠️ `midiAsked` at `:54-57` wraps `requestMIDIAccess` before any page code runs,
and `:1506` asserts `midiAsked === 1` after a press. An auto-open changes both
counts.

**B. ⚠️ THE PLATE IS ALREADY VERTICAL, SO THE INSTRUCTION IS ABOUT WHAT THE NEW
SEPARATORS DO TO IT.** `demo/knobs/index.html:730` is `place: 'side'` with
`panel: { side: 'left', plateSide: 'right' }` and `caps: false`, and `:1447`
asserts `inst.plate.el.dataset.place === 'side'`. The sketch's three rules run
edge to edge across a case whose right edge is that rail. **So the question the
sketch answers is whether a separator crosses the plate rail or stops at it**,
and the answer the sketch gives is that it crosses: the rules span the full
width. Keep the plate vertical, keep `side`, and check the plate still reads
after a rule is drawn through its track.
⚠️ **THE FOOTER IS A HEADER AT THE BOTTOM**, `header: { at: 'foot', plate:
false, online: false, patch: midiBtn }` at `:732`, so the `enable midi` button is
in the header's PATCH slot. If the press goes away, that slot needs an answer
rather than a hole.

### Open 2026-09-25: `/wish/`'s diagram should gently grey what is not plugged in

🔴 **ASKED, VERBATIM, ACROSS THREE MESSAGES:** *"make diagram parts grayed out
when no hardware conneted. ping hw"*, then *"gently"*, then *"wish demo"*.

So the subject is `demo/wish/index.html`, the treatment is SUBTLE rather than a
hard off state, and the page is expected to find out rather than assume.

✅ **THE DIAGRAM ALREADY HAS THE RIGHT THREE BOXES AND THE PORT LIST ALREADY
NAMES THEM.** `PORTS` at `demo/wish/index.html:536` carries a `box` on every
entry, and there are exactly three: **`keys` (MK-425C USB MIDI Keyboard),
`circuit` (Circuit) and `model12` (Model 12, four ports across two pairs)**. So
*is this box connected* is already answerable as *did any of its declared ports
resolve to a real one*, with nothing new to model.

🔴 **AND HERE IS THE HARD PART, WHICH IS NOT THE COLOUR. THIS PAGE MAY NOT ASK
THE BROWSER FOR MIDI ON A VISIT, AND IT ASSERTS THAT TODAY.** `midiAsked` wraps
`navigator.requestMIDIAccess` before any of the page's own code runs and the
assert reads **`the visit asked 0 time(s)`**. `requestMIDIAccess` is the only
thing that can enumerate ports, so **on first paint the page genuinely does not
know what is plugged in, and it is not allowed to find out.**

🔴 **SO GREY MUST NOT MEAN TWO THINGS, AND THIS PROJECT HAS ALREADY PAID FOR
THAT EXACT MISTAKE.** `positron-verify`: *"a blank cell collapses we did not look
and we looked and it was fine"*. **`not asked yet` and `asked, and it is not
there` are two states**, and one dimming for both would tell a reader their
Circuit is unplugged when nothing has looked. Three states, named:
- **not asked yet**, which is every visit until somebody presses
- **asked, and the port answered**
- **asked, and it did not**
⚠️ Only the third earns the grey. What the first should look like is a design
question worth one sentence from the owner, and the honest default is *the
picture as it is today, with a word saying nothing has been asked*.

⚠️ **"GENTLY" HAS AN EXISTING TOKEN AND A MEASURED PRECEDENT, SO NOTHING IS
INVENTED.** `--ctl-off` is the switched-off ink this stylesheet already uses, and
`/evo/` is the page it was measured on. ⚠️ **BUT `/evo/` STOPPED BEING THAT
SUBJECT ON 2026-09-25** (*"make all buttons interactive"*, 0 of 24 controls off),
so the citation beside that rule is already being corrected. **Check the
contrast that is actually left** rather than copying a number: `/evo/`'s own
readability assert moved from a CEILING at 3.0 to a FLOOR at 3.0 and now reads
**5.91:1**, which is the opposite requirement. A greyed diagram box still has to
be readable.
⚠️ **AND IT IS A DIAGRAM, SO `positron-diagram` IS LOADED BEFORE A LINE IS
DRAWN.** `diagram.mjs` owns what a box, a label, a sub and a note are, and a
greyed state is a new thing for it to carry. **If it lands in `diagram.mjs` it is
SHARED** and reaches the sixteen pages that draw one, nine of which touch
hardware. Done once, `/kit/` re-run.

🔴 **"PING HW" HAS NO COMMAND LINE ANSWER ON THIS MACHINE, MEASURED
2026-09-25.** There is no CLI that can enumerate this desk's USB MIDI ports:
`rig/m1/midilisten.c` is C, and this laptop SIGKILLs locally compiled binaries,
which is a standing rule and not a thing to work around. **The only thing that
can see a Web MIDI port is a browser, behind a press.** So the ping is a press on
the page, and the diagram updates from what it gets back.
🔴 **THE OTHER HARDWARE WAS PINGED AND IT IS NOT ANSWERING. MEASURED
2026-09-25:** `node rig/board/ask.mjs --room studio-1 audio.status` answers
**`no reply in 5 s`**. That is the Raspberry Pi rather than this desk's USB MIDI,
so it is not `/wish/`'s subject, and it matters here for two reasons. It
independently explains three of `/knobs/`'s four red asserts, which need the
board. And **the `/knobs/` screenshot sent the same hour reads `RASPBERRY PI
ONLINE`**. The two observations are minutes apart and a board can come and go, so
this is NOT yet a finding that the badge lies. ⚠️ **It is a thing to check
deliberately while building a greyed diagram**, because a picture that greys on
presence is only as honest as the presence it reads, and this is the one page
whose whole subject is what is plugged in.

✅ **`access.onstatechange` IS THE HALF THAT MAKES IT LIVE**, and `/wish/` already
listens to it for the re-adopt. A box that greys when an instrument is unplugged
WHILE somebody watches is the version of this worth having.
⚠️ **AND THE KNOWN WEAKNESS IS NAMED IN THAT PAGE ALREADY**: the binding matches
a DECLARED LABEL against a port name, and CoreMIDI really does rename a held port
to `Circuit 2`. **So an instrument that comes back under another name will grey
even though it is plugged in.** That is a false negative in the one direction
that matters, and whatever ships says so in the log rather than silently lying in
the picture.


### Open 2026-09-25: a closed page leaves the show running, and it is billed

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT OF THE CONTROL ROOM ON AIR:** *"i see
mix of old hls. you need to stop streaming immediately when pae closes"*, then
*"some sort of \"keep alive\" signals?"*.

**What the screenshot shows**: `ON AIR`, colour bars from the container, the
burned in clock reading `18:45:06` and absolute `1790361905.741`, a show clock at
`0:08.461` and the HLS button reading `STOP HLS`. The complaint is that what
arrives is a MIX of an older run's output, which is what a publisher nobody
stopped looks like from the outside.

🔴 **THIS IS THE MOST EXPENSIVE ITEM IN THIS FILE AND IT IS NOT A UI BUG.** A
publisher left running is a container left running and a Cloudflare input left
open, billed by the minute, with nobody watching. `CLAUDE.md` already carries the
rule about what costs real money and somebody else's server; this is our own
money and our own server, and the same rule applies harder because nothing stops
it by itself.

⚠️ **AND THE PAGE CANNOT DO IT WITH AN UNLOAD HANDLER, WHICH IS THE OBVIOUS
ANSWER AND THE WRONG ONE.** `beforeunload` and `unload` are not delivered
reliably on a closed tab, a killed browser, a crashed machine or a phone going to
sleep, and `navigator.sendBeacon` is best effort. **A stop that depends on the
page being alive to send it cannot cover the case where the page is gone**, which
is precisely the reported case.
✅ **SO THE ASK'S OWN SECOND MESSAGE IS THE RIGHT SHAPE: A KEEP ALIVE.** The
publisher stops itself when nobody has said *I am still here* for N seconds.
That is a liveness lease rather than a farewell message, it survives a crash, and
it is the same reasoning `workers/items` already uses for an alarm that fires
with no request. **Decide N out loud**, because N is how long a forgotten show
runs.
⚠️ **THE CONTAINER ALREADY HAS A COLD START THAT BLOCKS `GET /status`**, so
whatever is built must not mistake a waking container for a dead one.
⚠️ **AND "A MIX OF OLD HLS" IS A SECOND CLAIM WORTH SEPARATING**: a stale
playlist being served is not the same fault as a publisher left running, and one
can be true without the other. **Check which before fixing either.**

### Open 2026-09-25: `/stage/`'s transport buttons are hand rolled, so they lost the shimmer

**ASKED, VERBATIM:** *"when i start start hls / webrtc, there is no shimmer. you
lost std buttons"*.

✅ **THE SHIMMER IS THE SHELL'S BUSY SWEEP AND IT IS REAL**: `shell.mjs` marks a
running control `data-busy="1"` and draws the sweep across it. `positron-verify`
records it as load bearing for a different reason too, that the press loop
**awaits `data-busy` before walking on**, and the case that found it was a page
whose checks were lost because a handler was still running.
🔴 **SO A HAND ROLLED BUTTON COSTS TWICE: THE VISITOR LOSES THE FEEDBACK AND
THE HARNESS LOSES THE WAIT.** A start that takes 4 to 22 seconds to come on air
with no shimmer is a page that looks broken for twenty seconds.
⚠️ **IT IS THE SAME THREE CONTROLS AS THE UPPERCASE AND THE CLIPPED BUTTON
ASKS**, so all three are one pass on `demo/stage/index.html`, and the answer to
all three is the same: **stop building these by hand.**

### Open 2026-09-25: `/wish/`'s remove button should be a small kit variant

**ASKED, VERBATIM, WITH A CROP:** *"just [x] button, use small variant (create in
kit if not exists)"*. The crop shows the `on` checkbox and a large square `×`
under it in the row's action column.

✅ **THE PARENTHESIS IS THE INSTRUCTION AND IT IS THE RIGHT ONE.** A small square
glyph button does not exist in the kit today, and `/wish/` has already been
measured needing one: its two controls are **37.3 px and 34.0 px across against a
72 px column**, which is why they stack. A smaller variant may let them sit side
by side.
⚠️ **AND IT IS A KIT CHANGE, SO IT IS DONE ONCE**, with `/kit/` re-run and a
specimen on that page. `shell.css` gained `button[data-glyph="1"]` at 34 by 34 on
2026-09-25 and the small variant belongs beside it, not in a page.


### Open 2026-09-25: `PLAY RECORDING` is clipped to `PL RECOR`

**ASKED, VERBATIM, WITH A CROP:** *"fix button, use regular button"*. The crop
shows the control room bar's right hand control wrapping to two lines and being
cut off on both, reading `PL` over `RECOR` inside a box too small for either.

⚠️ **IT IS THE SAME BUTTON AS THE UPPERCASE ASK**, `playRecBtn`, so the two are
done in one pass or the second undoes the first.
⚠️ **AND "REGULAR BUTTON" IS THE INSTRUCTION, WHICH MEANS THE PAGE SHOULD STOP
BUILDING ITS OWN.** `transport-bar.mjs` takes `right: [playRecBtn]` and this
page hands it a hand-made element. A kit button in a kit slot is what stops a
page inventing a width.
⚠️ **THE ASSERT TO WRITE IS THE INK AGAINST THE BOX**, which is the measurement
`/tom/` used on the same day to catch 64 clipped numbers in a zero width column:
read the label's ink through `measureText` against its content box, and
`scrollWidth > clientWidth`. A button that fits reads 0 clipped.


### Open 2026-09-25: the control room timeline does not move

**ASKED, VERBATIM:** *"timeline does not move on controlroom"*.

🔴 **READ THIS TOGETHER WITH THE CLOCK REPORT ABOVE, BECAUSE THE TWO ARE
PROBABLY ONE BUG AND THEY POINT OPPOSITE WAYS.** One says a counter keeps
running after stop, the other says the strip never moves at all. A page where
the clock advances and the strip does not is a page where the two have come
apart, and `/stage/` has exactly the machinery for that: `roomStrip.setFollow(true)`
is called next to `showDeck.play()` and `phase = 'live'`.

✅ **MEASURED 2026-09-25 AND IT NARROWS THE SEARCH**: `stopShow()` at
`demo/stage/index.html:2433` DOES call `showDeck.pause()` on its next line. So
the deck is being stopped and something downstream of it is not, which makes a
display reading its own timer rather than the deck the first place to look, not
the stop path.
⚠️ **AND THE STRIP HAS A MEASURED HISTORY OF BEING FITTED WHILE HIDDEN.** Same
page, same day: the control room strip read **90,947 ms wide when it should have
read 30,000**, because `fit` ran while the tab panel was still its hidden width.
The repair was a refit two frames later. A strip that does not move is the same
family of defect and the same tab is involved.
⚠️ **THE HARNESS CANNOT SEE EITHER OF THESE TODAY.** It never opens that tab
unless a check selects it, and the page's own strip assert had to start doing
that explicitly. Any new assert here selects the control room, waits two frames,
and reads the strip twice.


### Open 2026-09-25: two more on `/stage/`, one of them a live defect

**ASKED, VERBATIM, WITH A CROP OF THE TWO TRANSPORT BUTTONS:** *"rm uppercase,
regular buttons. when i stop ils, timer couner still run"*.

**A. THE BUTTONS ARE SHOUTING, AND IT IS THE PAGE'S OWN DOING.** MEASURED
2026-09-25: `demo/stage/index.html:1519` and `:1522` read `label: 'START HLS'`
and `label: 'START WEBRTC'`, typed in capitals. ✅ **SO IT IS A PAGE FIX AND NOT
A KIT FIX**, which was worth establishing first: a peer already deployed a
site-wide *"no uppercase on buttons"* rule in the `shell.css` that `e5ae793`
recovered, and a page that shouts through it would have meant the rule was
losing. It is not losing. The strings are shouting.
⚠️ **THE LABEL IS ALSO THE STOP LABEL.** Each button relabels to `STOP ...`
when the show is running, so both halves move together or the page reads
`Start HLS` and then `STOP HLS`.

**B. 🔴 A LIVE DEFECT: STOPPING THE SHOW DOES NOT STOP THE CLOCK.** *"when i
stop ils, timer couner still run"*. `ils` is `HLS`.
⚠️ **THIS IS THE EXACT MIRROR OF A BUG FIXED ON THE OTHER SIDE THE SAME DAY.**
The clock used to START on the press rather than on air, MEASURED reading
`0:02.191, then 0:06.291, then 0:19.089 while both badges said OFF AIR`. The
repair moved `showDeck.play()` next to `phase = 'live'`. **Nobody moved the
other end.**
✅ **THERE IS ALREADY AN ASSERT FOR THE OPENING HALF AND NONE FOR THE CLOSING
HALF**: `the show's clock does not start until it is on air` samples
`showDeck.playing()` on every tick of the wait. **The closing assert is its
mirror and must not be able to pass vacuously**: press stop, then read that the
position does not move across two samples.


### Open 2026-09-25: the control room's time footer, ASKED THREE TIMES

🔴 **ASKED, VERBATIM, WITH A CROP, AND THE WORDS ARE A COMPLAINT ABOUT THIS
FILE:** *"rm this footer from controlroom. asked 3x"*.

The block under the control room's video panel showing **`0:00.000` over
`22:11.850`**, a current position over a total. The crop shows it directly below
the `OFF AIR` badge row that carries the two glyph buttons.

🔴 **THREE ASKS AND NO CHANGE IS THIS FILE FAILING AT ITS ONE JOB.** The
2026-09-19 rule exists for exactly this: *"do you have it in yr backlog or you
keep losing them"*. A request that is worked from memory is a request that
looks, when dropped, exactly like one nobody made. It is written here now and
leaves this file by being FINISHED or by being refused in writing.

⚠️ **IT IS A READOUT OF A TRANSPORT, SO CHECK WHAT READS IT BEFORE DELETING.**
`/stage/` carries asserts about the show clock, including `the show's clock does
not start until it is on air`, and `demo/verify.mjs`'s shell drill seeks the
published transport. **Deleting the display must not delete the quantity**,
which is `positron-ui`'s rule about removing a block: rehome what it said. The
clock stays, its picture goes.


### Open 2026-09-25: three asks on `/knobs/` and the shared keyboard, reported against a broken page

🔴 **`/knobs/` WAS LEFT BROKEN AND IT WAS REPORTED WITH A SCREENSHOT:**
*"you broke knobs"*. The agent that edited it on 2026-09-25 **never ran a single
verify** before the session limit killed it. MEASURED after, run alone:
**31/35, four failed.**

**1. THE LAYOUT, ASKED WITH A DRAWING:**

```
------------------
()()     nameplate
------------------
|||keyboard|||||||
------------------
footer
------------------
```

So the rotaries and the nameplate share the TOP row, the keyboard gets a row of
its OWN at full width under them, and the footer is under that. What is on the
page today is a three column case, rotaries then keyboard then a vertical plate,
and **the keyboard is cut off at B3** because it is sharing a row with the
rotaries.

**2. ASKED, VERBATIM:** *"enable -> Enable"*. The footer button reads `enable
midi` and should read `Enable midi`. ⚠️ A peer deployed a *"no uppercase on
buttons, site wide"* rule, so this is sentence case and NOT a return to caps.

**3. ASKED, VERBATIM:** *"Nt|Dg -> N|D"*. 🔴 **THIS IS
`demo/shell/keyboard.mjs` AND IT REACHES TEN PAGES**: `fau`, `dump`, `evo`,
`instrument`, `knobs`, `kit`, `looper`, `nola`, `radio`, plus `chords.mjs` and
`roll.mjs`. **It is the FIFTH spelling of that label** and the file records the
other four: `c | 1`, `C D E | 1 2 3`, `Notes | Degrees`, `Nt | Dg`. The comment
argues in writing for each, so **the comment moves with the code** rather than
being left to contradict it. ⚠️ The `title` on each button carries the meaning
and is not what is being shortened.
⚠️ **`/kit/` IS RE-RUN**, because this is shared. MEASURED by the agent that
made it `Nt | Dg`: the segmented row was **118.48 px as words and 65.50 px
shortened**, so a third spelling moves that measurement again.

**4. ASKED, VERBATIM, WITH A CROP OF THE CUTOFF DIAL:** *"rm border aroind
inivible-hand-butotn"*. The `⇄` button that starts an invisible hand sits
inside the rotary's dial and wears a ring. ⚠️ **CHECK WHETHER THAT RING IS THE
COMPONENT'S OR THE PAGE'S** before removing it, because `knob.mjs` reaches
`/kit/`, `/tom/` and every other rotary. A border removed in the kit is a border
removed everywhere.

**5. ASKED, VERBATIM, AND IT REVERSES ASK 2 BEFORE ASK 2 WAS BUILT:** *"rm
enable midi, just listen midi"*, then *"(just make all keyboards instances
support midi)"*.

🔴 **SO ASK 2 IS DEAD. DO NOT BUILD `Enable midi`.** The button goes
entirely and the page listens, which is exactly what `/muta/` was asked for on
the same day (*"its should be listening"*) and did.
🔴 **AND THE SECOND SENTENCE MOVES IT INTO THE KIT.** `demo/shell/keyboard.mjs`
would open MIDI for EVERY instance, which reaches **ten pages**. That is a
shared change, done once, by one agent, before any page agent starts, with
`/kit/` re-run.

🔴 **THE ONE RULE THIS MUST NOT BREAK, AND IT IS ASSERTED ON TODAY: A VISIT
ASKS THE BROWSER FOR NOTHING.** `/knobs/` reads `the visit asked 0 time(s)` and
`/muta/` reads `the keyboard is opened by a press and never by a visit, and it
is asked for once`. Taking the button away removes the gesture that was carrying
`requestMIDIAccess`, so the component needs another one. ⚠️ **`/muta/` already
solved this and is the precedent to copy**: `ensureMidi()` is idempotent and is
called from the top of the control that turns the instrument on, BEFORE
`await ensureAudio()`, because a permission prompt has to be reachable from the
gesture. On `/knobs/` the equivalent gesture is the first key press, which that
page's own comment already calls *"the only way in now"*.
⚠️ **AND A PERMISSION PROMPT ON TEN PAGES IS A PRODUCT DECISION, NOT A REFACTOR.**
A keyboard that asks for MIDI the first time anybody touches it will prompt on
`/fau/`, `/dump/`, `/evo/`, `/radio/` and five more. Whether every one of those
should ask is worth one sentence from the owner before it is built.


### Open 2026-09-25: better sounding chords, and the session died before the research started

🔴 **ASKED, VERBATIM, WITH THREE SCREENSHOTS OF `/nola/`'s SUGGESTION LANES:**
*"better soudning chords. labme soundin susggestion, recording my played
suggestions. they sound unimaginative and dry and not moving anywhere. do
resraerch, perhaps you let me just play some, you record and hand it over to llm
and chord dbs and figure out my playing pattern and creativity inputs to move on
with in my vibe"*

🔴 **NOTHING WAS DONE. A RESEARCH AGENT WAS DISPATCHED AND KILLED BY THE
SESSION LIMIT BEFORE ITS FIRST TOOL CALL**, at 20:31, its transcript twelve
lines long and ending `You've hit your session limit, resets 9:30pm`. The brief
it was given is reconstructed here so the work does not have to be specified
twice.

**The three progressions that were uploaded as the complaint**: `Dmaj / Emin7 /
Fdim7 / Ddim`, `Dmin7 / Gmin / C7`, `D#maj7 / Amin7b5 / D7`. ⚠️ **The second is a
plain ii V i and the third a plain minor ii V**, which is the complaint stated
in its own evidence: correct, common, and going nowhere.

🔴 **THREE COMPLAINTS IN ONE SENTENCE AND THEY HAVE THREE DIFFERENT FIXES.
SEPARATE THEM BEFORE BUILDING ANYTHING**, because two of them are not chord
choice at all and no amount of better prediction reaches them.
- **unimaginative** is the CHOICE. `demo/shell/suggest.mjs`'s slot A is the
  modal continuation by construction, MEASURED at **16.2 per cent global max**
  on held-out jazz, which is a cliche rate rather than a bug.
- **dry** is the SOUND. What `/nola/` plays is `voiceChord(... near, bass:
  false)` into a sampled piano: close position, no bass, no inner voice motion,
  no rhythm. **The table has no voicing in it at all.**
- **not moving anywhere** is the SHAPE. A trigram is two chords of memory and no
  destination. `research/chord-suggester-benchmark-2026-09-23.md` §10.9 already
  says it: *"NOTHING HERE MEASURES RHYTHM, PHRASE LENGTH OR CADENCE POSITION ...
  the table has no idea which chord it is looking at."*

✅ **THE PRIOR RESEARCH IS EXTENSIVE AND MUST BE READ BEFORE A LINE IS WRITTEN,
BECAUSE IT ALREADY REFUSED FOUR OF THE OBVIOUS ANSWERS.**
`research/chord-suggester-benchmark-2026-09-23.md` (672 lines) and
`research/chord-learning-2026-09-23.md` (1,174 lines). Its §8 refuses a single
ranked list scored on accuracy, refuses slot B ranked by PMI with no pool
(**9.5 points of attestation for 1.8 bits of surprisal, visibly wrong
suggestions**), refuses a hand written tritone substitution rule on top of the
table until somebody plays it, and refuses shipping the corpora.

🔴 **AND §10.1 ALREADY NAMES THIS EXACT EXPERIMENT, WHICH IS WHY THE ASK IS
THE RIGHT ONE:** *"WHETHER SLOT B IS DELIGHTFUL OR ANNOYING ... Neither number
is a feeling. To settle it: put both slots behind `?learn=1` on `/nola/`, play
twenty progressions, and record which suggestion was taken. One session, one log
line."* **Nobody has played any of it.** Every number in that document is a fact
about written chord symbols.

✅ **BOTH CORPORA ARE ALREADY ON THIS DISK AND NOTHING NEEDS FETCHING.** MEASURED
2026-09-25 with `node demo/resources/fetch-chord-corpora.mjs --check`, which
contacts nobody: `tmp/chord-corpora/irb.zip` **530,984 bytes** and
`billboard-salami-chords.tar.gz` **219,100 bytes**, both gitignored, plus the
unpacked `tmp/chord-corpora/x`. **So every re-count, every sweep and every new
table is runnable today with zero requests to anybody.** ⚠️ The standing rule
still holds for anything NEW: *"super careful with external sources, better
avoid"*, and it is about whose server it is.

⚠️ **ONE CHEAP THING IS ALREADY IDENTIFIED AND IS NOT THE WHOLE ANSWER.** The
shipped table is `keep: 3`, so **slot B chooses from at most two candidates**,
while the benchmark that chose the design swept `pool 4`. `suggest.mjs` says so
itself: *"THE POOL THE BENCHMARK SWEPT WAS FOUR WHILE THE SHIPPED TABLE KEEPS
THREE ROWS A CONTEXT, so the pool here can never exceed three."* `MIN_CTX = 8,
MIN_ROW = 3, KEEP = 3` at `demo/resources/build-chord-tables.mjs:99`, and the
whole table is **12,746 bytes** today.

⚠️ **THE LLM HALF HAS A MEASURED PRECEDENT ON THIS DESK AND IT IS NOT
ENCOURAGING ABOUT PUTTING ONE IN THE LOOP.** `positron-verify` records Workers
AI `llama-3.3-70b` returning a schema-valid patch with the WRONG argument name
on every run, a tighter schema making it **1.6 s to 10.2 s** and worse, and well
formed patches **aimed at the wrong instrument**. The rules that came out of it
apply directly here: **validate meaning in ordinary code, never in the schema**,
and **a model proposes and a person presses**.

⚠️ **AND A PREFERENCE TEST THE PLAYER CAN SEE THROUGH IS NOT A MEASUREMENT.**
Whatever is built, the arm that produced a suggestion must be hidden from the
person judging it, and there has to be a control arm that can lose. This
repository has already shipped a green page with zero coverage more than once.

**Files this will touch**: `demo/shell/suggest.mjs` (SHARED, and
`suggest-test.mjs` beside it carries 6 negative controls),
`demo/resources/build-chord-tables.mjs`, `demo/resources/chord-tables.json`,
`demo/nola/index.html`, and a new document in `plans/`.
⚠️ **`demo/shell/` IS SHARED, SO ANY CHANGE THERE IS DONE ONCE, BY ONE AGENT,
WITH `/kit/` RE-RUN.**


### Open 2026-09-25: `.panel-head-mid` overflows its own grid track at every width

🔴 **FOUND BY MEASURING, NOT REPORTED BY ANYBODY**, while `/muta/` tried
to put a `Test tone` button in a header. `demo/shell/shell.css`'s
`.panel-head-mid` carries `min-width: 0` with `justify-self: end`, so it is laid
out from its right edge and **spills left across the plate cell**.
MEASURED on `/muta/`: the model picker is **315.5 px of content in a 266.8 px
track at 1280 px**, and a button placed in that cell was overlapped by **34.7 px
at 1280 and 114.2 px at 561**.

✅ **IT IS INVISIBLE TODAY AND THAT IS WHY NOBODY HAS SEEN IT.** The three
pages that build a header all pass `plate: false`, so the cell it spills into is
empty. **The cost is that a third control cannot go in that row**, which is a
real constraint the next person to try will spend an hour on.
⚠️ `/muta/` did NOT work around it by changing the kit. It put its
button in column 1 with `justify-self: end` and two page media queries below
700 px and 560 px, and asserted the rects. That page is fine; the component is
not.


### Open 2026-09-25: a stream of per-demo requests, COLLECTED WHILE IT IS STILL ARRIVING

🔴 **THE STREAM IS NOT FINISHED.** Said in the same message: *"i will
give moer requests nor per demo"* and *"...more coming..."*. Nothing below is
being worked yet, by the 2026-09-19 rule: *"lets work demo by demo. i will give
steam of request, you collect theb to backlog in detail and when done, do a
parallelized effort to fix it all"*. **Write now, fan out when the stream ends.**

🔴 **AND THE KEYBOARD IS SHARED, SO IT IS DONE ONCE AND FIRST.**
`demo/shell/keyboard.mjs` is imported by **ten** pages: `able`, `fau`, `dump`,
`evo`, `instrument`, `knobs`, `kit`, `looper`, `nola`, `radio`, plus
`demo/shell/chords.mjs` and `demo/shell/roll.mjs`. One agent does the component
BEFORE any page agent starts, or four agents write four versions of it in one
checkout.

#### `typist`: add the loop modes

⚠️ **ASKED, VERBATIM:** *"add loop modes to typist"*

`demo/manifest.mjs:709`, `group: 'th'`, one line *"type, and it types itself
back. Drag to any moment and the words and the cursor come back"*.

✅ **IT ALREADY HAS A TRANSPORT AND A DECK**, `createTransportBar(barHost,
deck, { scrub: false })` at `demo/typist/index.html:540`, so the modes have
something to run on. Same ask as `/loops/`, one page along, **so decide the two
together**: three directions or five, and whatever is chosen is chosen once.
⚠️ The kit's `LOOP_TURN = [0, 1, 4]` deliberately cycles only the three
DIRECTIONS, because `half` is a rate and `chop` is a length with no control.

🔴 **AND THIS PAGE IS WHERE "BACKWARDS" ACTUALLY MEANS SOMETHING NEW,
WHICH IS WHY IT IS WORTH ASKING WHAT IT MEANS BEFORE BUILDING IT.** The subject
is an edit history, not audio. Playing it `round` is retyping. Playing it `back`
is UNTYPING, and there-and-back is typing and untyping. **A backspace played
backwards is a character appearing**, which is a real behaviour to define rather
than a rate to flip. Nothing here follows from the audio meaning of the word.
⚠️ **THE PAGE'S OWN CHECKS ALREADY KNOW THE HARD CASES.** Driving it
with real key events found two bugs the first time: a fold at position 0
emptying the box the first letter had just gone into, and a strip that fits
itself once and so drew six of seventy-one edits. The harness sends characters,
a BACKSPACE, *"which never says what it removed"*, and an ARROW KEY, *"which
moves the caret with no input event at all"*. **Those three are exactly the
cases a reverse mode has to get right.**
⚠️ **`readout: null` at `:209` IS DELIBERATE AND ANNOUNCED**: the
document IS the readout here, and a row of cells repeating the letters and the
cursor position would be the same facts twice. **A loop mode does not earn a
readout cell on this page.** Both `verify.mjs` and `verify-quest.mjs` read
`readoutOptOut`, so do not add one casually.
⚠️ **IF ANY OF IT LANDS IN `demo/shell/looper.mjs` OR
`transport-bar.mjs` IT IS SHARED**, done once, `/kit/` re-run.

#### The four `timeline` demos: glue the transport to the timeline

⚠️ **ASKED, VERBATIM:** *"timeline demos: glue transport and
timelines"*

✅ **THE GROUP IS EXACTLY FOUR AND NONE OF THEM GLUES TODAY**, MEASURED
2026-09-25: `transport`, `lanes`, `loops`, `score`, and `grep -c createGlue`
answers **0** in all four.
✅ **NINE OTHER PAGES ALREADY DO IT**: `held`, `kit`, `pack`, `reel`,
`radio`, `stage`, `replay`, `tapes`, `wish`. So this is four pages joining a
convention the rest of the site already has, and `demo/shell/glue.mjs:44`
exports `createGlue(...blocks)` for it. **Nothing is being invented and no kit
change should be needed.** If one is, report it and stop, because another agent
owns `demo/shell/`.

🔴 **READ THE ONE THING THIS PROJECT HAS ALREADY PAID FOR ABOUT GLUE,
BEFORE WRITING A LINE.** From `/stage/`, 2026-09-25: **`createTransportBar(parent, ...)`
APPENDS TO THAT PARENT**, so deleting a `createGlue` line removed nothing and a
doubled bar survived TWO reports because of it. *"The first argument is a mount
point, not a hint."* A glue that repoints a container is not a glue that merges
its contents, which is the same page's other lesson (`LESSONS.md` #116). **After
gluing, count the bars and the strips on each page rather than looking at it.**

#### `loops`: add the loop modes

⚠️ **ASKED, VERBATIM:** *"add loop modes to loops"*

`demo/manifest.mjs:77`, `group: 'timeline'`, one line *"one recording placed
three times: a slice, the same slice faster, and a loop"*.

✅ **THE MODES ALREADY EXIST IN THE KIT AND ARE NOT BEING INVENTED.**
`demo/shell/looper.mjs:54` is `LOOP_WAYS = [['round'], ['back'], ['half'],
['chop'], ['pingpong']]`, with `WAY_GLYPH` and `WAY_SAYS` beside it.
🔴 **BUT ONLY THREE OF THE FIVE ARE ON THE BUTTON, AND THE REASON IS
WRITTEN DOWN.** `LOOP_TURN = [0, 1, 4]` at `:66`, and the comment above it:
*"THE THREE THE BUTTON CYCLES, IN THE ORDER IT CYCLES THEM. Directions, and only
directions: `half` is what a rate row beside it is for and `chop` is a length
with no control today. Both are still reachable and both are still driven by the
checks, which is a loose end written down rather than left to be found."*
⚠️ **SO "ALL THE MODES" IS A DECISION, NOT A DEFAULT.** Three
directions, or five including a rate and a length that the existing button
deliberately excludes. **Settle it before building the control**, and if it is
five here and three elsewhere, say why in the file.
⚠️ **AND `WAY_GLYPH` IS AMBIGUOUS ACROSS FIVE**: `round`, `half` and
`chop` all carry `→`. A five-way control cannot use the glyph alone to say
which state it is in, and `:75-80` records that the glyph IS the state rather
than the next press. **Three faces for three states works; five states need
something else.**

🔴 **THIS PAGE HAS ALREADY SHIPPED "QUIETLY NOT LOOPING", AND THE
RECORD OF IT IS THE THING TO READ FIRST.** `demo/loops/index.html:88-98`: the
page passed no `tickHost` and never called `servo()`, so a wrap *"was neither
committed nor polled: it simply never happened. Three passes, zero wraps, and a
page whose whole subject is looping quietly not looping."* And: **"The assert
that should have caught it was tolerant of 'not reached yet' and passed
vacuously every run."**
⚠️ **SO EVERY MODE ADDED HERE NEEDS AN ASSERT THAT CANNOT PASS
VACUOUSLY.** A check that tolerates *not reached yet* is the exact shape that
failed on this page once. Ask what has HAPPENED, counted, rather than what is
happening.

⚠️ **THE PAGE IS A NEST, NOT A LOOPER.** It draws with `createNest` and
quotations, and `:138-149` records that a 3-pass loop is ONE span carrying
`repeat: 3` until it is split, *"so the strip drew one long bar and the looping,
the entire subject of this page"*, was invisible. **Backwards and there-and-back
have to be visible in that drawing or the modes are a control with no readout.**
⚠️ **`demo/shell/looper-test.mjs` AND `numloop-test.mjs` GRADE THIS
ARITHMETIC WITH NO BROWSER** and are the cheap instrument here. `numloop-test.mjs`
also carries the warning about writing the expected state out by hand and doing
the machine's arithmetic a second time.
⚠️ **IF ANY OF IT LANDS IN `demo/shell/looper.mjs` IT IS SHARED**, and
that module reaches the transport bar, `/tapes/` and every page with a looper.
Done once, by one agent, with `/kit/` re-run.

#### Merge the `capture` group into `streaming`

⚠️ **ASKED, VERBATIM:** *"merge capture and streaming into streaming"*

MEASURED 2026-09-25, so the size of it is known rather than guessed:
- **`capture` holds 6**: `take`, `keep`, `record`, `replay`, `capture`, `show`.
- **`streaming` holds 7**: `llhls`, `webrtc`, `moq`, `room`, `now`, `flipper`,
  `remixer`.
- **The merged group is 13**, which would make it the second largest after
  `instruments` at 13. There are 11 groups today and there would be 10.

⚠️ **THERE IS A DEMO CALLED `capture` INSIDE THE GROUP CALLED
`capture`.** The row survives the merge and only its `group` changes, but
anything matching on the string has to tell the page from the group. **That is
the substring rule again**, one stream after the `click` and `sound` renames.

⚠️ **THE GROUP TABLE CARRIES ITS OWN LABELS AND ITS OWN ORDER.**
`demo/manifest.mjs:1186` is `['capture', 'capture']` and `:1226` is
`['streaming', 'streaming']`, and they sit far apart in that table: `capture` is
7th in the list and `streaming` 47 lines later. **The merged group inherits
`streaming`'s position unless told otherwise**, which moves six demos a long way
up or down the index. Worth one look at the result before it is called done.
⚠️ **AND THE TABLE HOLDS PROSE BETWEEN THE ROWS.** The entries are
separated by long comments recording why each group is what it is, including
`timeline`'s 2026-09-24 instruction *"timeline: leave ones who have timeline
component. the rest ..."* and `stage` moving to `th` on *"move stage to th"*.
**Deleting the `capture` row must not delete the reasoning around it**; where a
comment explains a group that no longer exists, it moves into `streaming`'s or
into `LESSONS.md`, rather than vanishing.

⚠️ **THIS IS A `demo/manifest.mjs` EDIT AND THAT FILE HAS ONE OWNER PER
ROUND.** It collides with the archive work (`bay` and `able` rows leaving) and
with all four renames. **Sequence it with them, not against them.**
⚠️ **COUNT THE DEMOS AND THE GROUPS AFTER, NEVER REMEMBER THEM.**

#### The lane jumps sideways when play starts, and it is `/transport/`, not `mars`

⚠️ **ASKED, VERBATIM, WITH TWO SCREENSHOTS:** *"mars: lane is jumping
position when start playing"*

🔴 **THERE IS NO `mars` DEMO AND THE SUBJECT WAS IDENTIFIED FROM THE
PICTURES RATHER THAN THE NAME.** `demo/mars/` does not exist and `mars` is in no
manifest row. The readout in both crops reads `0.38 20s, 20 marks, speeds
0.25/0.5/1/2/`, and **`demo/transport/index.html:162` logs exactly that string**:
`` d.log(`${DURATION / 1000}s, 20 marks, speeds ${adapter.caps.rates.join('/')}x`) ``.
The lane in the picture is labelled `marks`. **So the page is `/transport/` and
`mars` is a typo for `marks`, the lane.** Confirm in passing, do not re-derive.

🔴 **AND THE MECHANISM BELOW IS WRONG, MEASURED 2026-09-25 AFTER IT WAS
WRITTEN.** This entry said *"The gutter grows, the plot beside it is pushed"*.
MEASURED at 1280 px one press apart: the gutter is **132 px before and 132
after** and the canvas does not move at all. What moves is the lane's NAME AND
SWATCH, **29 px upward**, because `timeline/strip.mjs`'s `nameOnly` branch
centres a lane with no lines under its name on its own swatch (asked for
2026-09-16), and a lane that GAINS lines while somebody is watching gets both
arrangements one after the other. **The fix asked for below is still the right
one. The reason given for it was not.** Widest ordinary line asks 124.33 px
against a declared gutter of 132, so only a lateness over 100 ms could ever
widen it.

✅ **THE TRIGGER IS ONE LINE AND IT IS WHAT THE SCREENSHOTS SHOW.**
`demo/transport/index.html:95`:

    L.subLabel = [`typical +${typical.toFixed(2)} ms`, `worst +${worst.toFixed(2)} ms`];

Before play the gutter holds ONE line, `marks`. The moment marks land it holds
THREE. The gutter grows, the plot beside it is pushed, and the whole lane
appears to jump. The first crop has the playhead hard against the left edge of
the plot; the second has the plot starting further right with the same playhead.

⚠️ **RESERVE THE SPACE, DO NOT SHRINK THE TEXT.** The sub-labels are
real measurements and are worth showing. What must not happen is the box
changing size when they arrive, so the two sub-label rows are reserved from the
first frame, empty, exactly as the transport bar reserves both words of a
two-state button so *"the control cannot change size under the finger that
pressed it"*.

🔴 **AND THIS IS THE FOURTH ASK IN ONE STREAM WITH THE SAME DEFECT
UNDERNEATH IT, WHICH IS WORTH DECIDING ONCE.**
- **here**: a lane gutter grows from one line to three when values arrive.
- **`keyboard`**: *"add chord name to the footer ... avoind text moving in x
  axis"*, a name that is `C` or `F#m7b5`.
- **`dump`**: *"show empthy tables ... with fixed heigh"*, a table that is a
  caption until rows arrive.
- **`wish`**, already fixed on that page and recorded at `:96-98`: a box that
  was *"7 lines for one connection and 16 for the next"* and therefore *"would
  move the log and the end of the page on every press"*.
✅ **SO ASK WHETHER THE ANSWER BELONGS IN `demo/shell/strip.mjs` RATHER
THAN IN THIS PAGE.** A lane that reserves its sub-label rows would fix this one
and any other page whose lanes gain labels later. **If it is the strip's, it is
shared work done once**, and `/kit/` grades it.

#### `resources` renames to `niemi`, and it is a FOURTH rename of a different kind

🔴 **AND IT WAS ASKED A SECOND TIME ON 2026-09-25, AS *"rename resources
demo to niemi"*, WHILE THIS ENTRY WAS ALREADY SITTING IN THIS FILE UNWORKED.**
A repeat is this file failing at its one job, the same way the control room
footer reached three asks. It leaves this file by being FINISHED or by being
refused in writing, and nothing below changes: it still runs LAST, alone, after
the corpus edit, because `demo/resources/corpus.json` is edited by the `tapes`
work and `demo/manifest.mjs` by the archive work.

⚠️ **ASKED, VERBATIM:** *"resources: rename to niemi"*

⚠️ **THIS ONE IS NOT THE LETTER-DROP SCHEME AND MUST NOT BE
"CORRECTED" INTO IT.** `grains` to `rains`, `click` to `lick` and `sound` to
`ound` each drop a first letter. `resources` to `niemi` is a different thing
entirely and it reads as deliberate: **the row's group is `kurenniemi`**, so
`niemi` is the tail of the name this whole act is about.

🔴 **AND IT IS NOT LIKE THE OTHER THREE IN A SECOND WAY: IT IS A DEMO
ROW *AND* A WORKING DIRECTORY OF BUILD SCRIPTS.** `demo/manifest.mjs:282`,
`group: 'kurenniemi'`, `built: true`, so `/resources/` is a page. And
`demo/resources/` holds **28 entries**, among them `build-corpus.mjs`,
`corpus.json`, `durations.json`, `measure-durations.mjs`,
`build-mimproject-images.mjs`, `fetch-jrhodes3d.mjs` and `chord-tables.json`.
**A slug rename and a tooling directory move at the same time.**

⚠️ **PRICED 2026-09-25: 55 live files hold the path `demo/resources`**,
plus **1** under `archive/` which stays by the standing rule.
✅ **RE-COUNTED LATER THE SAME DAY AND THE 55 STANDS, WHICH IS WORTH SAYING
BECAUSE A NAIVE GREP NOW ANSWERS 89.** The extra 34 are `workers/view/public/`,
which is the tracked BUILD OUTPUT and regenerates from `cd workers/view && node
build.mjs`, plus `workers/tapes/test.mjs`. **They are not hand edits and must
not be rewritten by hand**: the rename edits the sources and then rebuilds, and
a sweep that rewrote the output directly would be undone by the next build while
looking correct in the diff.
🔴 **TWO OF THEM ARE IN `CLAUDE.md`'S OWN "Run and check" BLOCK**, lines
214 and 215: `node demo/resources/measure-durations.mjs` and `node
demo/resources/build-mimproject-images.mjs --check`. **A command in that block
that no longer runs is the worst kind of stale line in this repository**, so
they move in the same commit.
✅ **AND AN INSTRUCTION SUPERSEDES A PRICING, WHICH `LAYOUT.md` ALREADY
SAYS**: the `plans/` move was priced at 421 references and rejected, then done
on instruction, *"the same way `radio1965`, `box` and `rig/box/` superseded
their own rules"*. This is that again. ⚠️ The same entry carries the
lesson to work to: *"a rename moves URLs that live in modules, harnesses and
comments, none of which are type-checked"*, and on the `plans/` move the repair
was to rewrite **the 129 files holding a real path** and leave bare prose
citations as citations.

🔴 **ORDERING CONFLICT WITH THE `tapes` WORK, AND IT IS REAL.**
`demo/resources/corpus.json` is where the `Saharan uni I` row is deleted, and
`demo/fake-tapes.mjs` reads its paths out of that same file. **The corpus edit
and this directory move must not run at once.** Do the corpus edit first, then
the rename, or the two collide on one file.

⚠️ **SO THE RENAME BATCH IS FOUR, NOT THREE**, it runs LAST with
nothing else in flight, and `positron-history` loads before it and gains a line
after it.

#### `tapes`: a proxy for unreadable sound, inertia in two more places, and one row out

⚠️ **ASKED, VERBATIM:** *"this recordin wil noot allow read its sound:
make proxy. tapes demo. use varispeed/inertia on rate change and also
varispeed/inertia on switching looping modes / rm 6/24 Saharan uni I 1967 line"*

1. 🔴 **A PROXY SO A RECORDING'S SOUND CAN BE READ, AND IT RUNS STRAIGHT
   INTO THE STANDING EXTERNAL-SOURCE RULE.** Reading a recording's samples needs
   CORS headers the archive may not send, and a proxy is the ordinary answer.
   **But a proxy does not remove the fetch, it MOVES it from the browser to our
   worker**, and the rule is explicit that it is about whose server it is:
   *"stil: super careful with external sources, better avoid"*, said in reply to
   *"it uses archive.org, not ERR, so it is safe to run"*, and **that reasoning
   was named as the mistake.**
   ⚠️ **SO THE PROXY HAS TO CACHE**, or it is the same load with an
   extra hop. Say what the cache is and how long it holds.
   ⚠️ **AND THE HARNESS MUST NOT GO NEAR IT.** `demo/fake-tapes.mjs`
   exists so `node demo/verify.mjs tapes` reads **38/38 with the only hosts
   contacted being the dev server and the stand-in**. Nothing about a proxy may
   change that, and `DEMO_HOSTS=1 node demo/verify.mjs tapes` is the instrument
   that proves it.
   🔴 **WHICH RECORDING PROMPTED THIS IS NOT KNOWN.** *"this recordin"*
   points at something the owner had on screen. **Ask, or make the proxy general
   and say that is what was built.** A proxy for one file and a proxy for the
   corpus are different amounts of work.

2. ⚠️ **VARISPEED WITH INERTIA ON RATE CHANGES AND ON LOOP MODE
   SWITCHES.** ✅ **THE MECHANISM ALREADY EXISTS ON THIS PAGE AND IS NOT
   BEING INVENTED**: `demo/tapes/index.html:1396` is *"VARISPEED WITH INERTIA ON
   ‹ AND ›: THE TAPE WINDS DOWN AND COMES BACK UP"*, and `:1405`
   warns that the difference between inertia and *"a stall wearing its
   clothes"* is the whole point. `:565` records that pitch follows speed,
   which is what varispeed means. **Extend what is there to two more triggers
   rather than writing a second one.**
   ⚠️ **THE LOOP MODES ARE THE KIT'S**, `createLooper` from
   `demo/shell/looper.mjs` at `:48`, and `demo/shell/looper-test.mjs` grades the
   looper's arithmetic with no browser. If the inertia belongs in the looper it
   is SHARED and done once; if it belongs in this page's rate handling it is
   local. **Establish which before writing it.**

3. 🔴 **REMOVE THE `Saharan uni I 1967` ROW, AND IT MOVES MORE NUMBERS
   THAN IT LOOKS.** It is in `demo/resources/corpus.json`, `"title": "Saharan uni
   I"`, id `ia:videoplayback-13_202304/Erkki Kurenniemi - Saharan uni I (64
   kbps).mp3`. **`Saharan uni II` is a separate row and is NOT being removed**,
   so an anchored edit is needed here too, for the same reason as the renames.
   ⚠️ **THE CORPUS IS 24 ROWS AND EVERY MEASURED FIGURE DERIVED FROM IT
   MOVES.** ✅ **DONE 2026-09-25: IT IS 23 ROWS, 2 h 15 m AND 65 MB.** MEASURED after
   the removal: 8,096 s against 8,541 s. The line here said 2 h 22 m and 68 MB
   for 24 rows, which was true when written. `/tapes/` lays every recording end to end as ONE LONG TAPE and **its
   checks grade that geometry**, so the total length, the bar positions and any
   prose quoting either are all downstream of this one deletion.
   ✅ **THE STAND-IN FOLLOWS AUTOMATICALLY AND THAT IS BY DESIGN.**
   `demo/fake-tapes.mjs` *"reads its paths off `corpus.json` rather than a list,
   so it cannot drift from the page"*. One less row there is one less row
   everywhere.
   ⚠️ **AND THE STAND-IN HAS KNOWN HOLES**: a stand-in serving every
   recording at HALF its corpus length still reads 38/38, and one serving
   SILENCE reads 38/38 too. Both are already in this file. **So a green run after
   this change is weaker evidence than it looks**, and the assert count is what
   to read.

#### THREE RENAMES, ONE SCHEME, AND A SUBSTRING TRAP THAT WOULD WRECK THE REPOSITORY

⚠️ **ASKED, VERBATIM, ACROSS TWO MESSAGES:** *"grains -> rename to
rains"*, then *"click: rename to lick, move to the last item in index groupd"*
and *"sound: rename to ound"*.

✅ **IT IS A SCHEME AND NOT THREE TYPOS: EVERY ONE DROPS ITS FIRST LETTER.**
`grains` to `rains`, `click` to `lick`, `sound` to `ound`. The `grains` one was
put to the owner as a possible typo and CONFIRMED on 2026-09-25, and the two
that followed establish the pattern beyond doubt. **No further confirmation is
needed for the other two.**

🔴 **AND THIS IS THE MOST DANGEROUS TASK IN THE WHOLE STREAM, FOR A
REASON THAT IS ALREADY WRITTEN DOWN IN THIS REPOSITORY: NEVER GUARD A PATCH ON
`s.includes(<substring>)`.** The standing rule records three bugs in one day
from it, `BUILD` matching inside `REBUILD` among them. **These three slugs are
all substrings of ordinary words this repository is full of.** MEASURED
2026-09-25:

| slug | files with ANY occurrence | files with a SLUG-SHAPED reference |
| --- | --- | --- |
| `click` | 173 | 44 |
| `sound` | 264 | 24 |
| `grains` | 82 | 60 |

🔴 **THE GAP BETWEEN THOSE TWO COLUMNS IS THE BUG WAITING TO HAPPEN.**
MEASURED the same day: **`Csound` appears 69 times** and contains `sound`, so a
naive rewrite turns it into `Cound` and silently breaks every reference to the
audio language this project compiles scores with. **`onclick` and `.click(`
appear 156 times** and both contain `click`, so the same rewrite would turn
`element.click()` into `element.lick()` and take `demo/verify.mjs`'s entire
press loop with it. `soundbank`, `sounds` and the ordinary English verb *click*
are all in the same trap.
✅ **SO THE RENAME IS SCOPED TO THE SLUG AND NOTHING ELSE**: the directory
`demo/<slug>/`, the URL `/<slug>/`, and `name: '<slug>'` in `demo/manifest.mjs`.
**Never the bare word.** Every replacement is anchored, and the counts above are
the check: a rewrite that touches 173 files for `click` is wrong by 129 files.

⚠️ **RUN IT ALONE, WITH NOTHING ELSE IN FLIGHT.** Seven agents held
files in this checkout when these arrived. A repository-wide path rewrite while
another agent has a file open is the `git add -A` hazard at full width, and this
project has already had one agent's work swept into an unrelated commit twice in
one session. **This is the LAST task of the batch.**

⚠️ **`archive/` IS NOT REWRITTEN**, by the standing rule: an archive
records what was there, which is why `box` and `radio1965` are still spelled the
old way inside it. It holds **13** files naming `click`, **29** naming `sound`
and **8** naming `grains`. All stay.

⚠️ **`positron-history` LOADS BEFORE ANY OF IT**, and gains a line
after, because a slug that stops resolving is this project's most repeated
defect in its cheapest form.

##### `click` also moves in the index

⚠️ **ASKED:** *"move to the last item in index groupd"*.
`demo/manifest.mjs:81` is `{ name: 'click', group: 'vain', act: 0, created:
'2026-09-14', built: true }`, sitting directly after `sound` at `:78`, which is
in the same `vain` group.
✅ **THIS IS ONE LINE MOVING IN AN ARRAY AND NOTHING ELSE**, by CLAUDE.md's
own rule: a demo's identity is its slug and its ORDER is its position in
`DEMOS`. There is no number in the directory, the URL or the page, and there
used to be, in five places at once.
⚠️ **BUT CHECK WHICH ORDER IS MEANT.** The front page is ordered
NEWEST FIRST and `byNewest()` copies `DEMOS`; `DEMOS` itself is the STORY order.
Last in the group as the index draws it and last in the array are not
necessarily the same position. **Establish which one puts it where the owner
means before moving the line.**

#### `grains`: a RENAME, the instrument panel, and `createLocalRemote`

⚠️ **ASKED, VERBATIM:** *"grains -> rename to rains / wrap to isntument
panel. use createLocalRemote"*

✅ **CONFIRMED 2026-09-25, ASKED AND ANSWERED: `rains` IS CORRECT.** It
was put to the owner precisely because `rains` differs from `grains` by ONE
CHARACTER and the stream carried many typos (*"isntument"*, *"conrtol"*,
*"arhcive"*, *"reseonance"*), so acting on a misreading would have been
expensive to undo. It is not a typo. **Proceed.**
**`demo/shell/roll.mjs:77-79` is the precedent and it is exact**: *"A report
with no verb is ambiguous, and the reading that DESTROYS work is the one to
check before acting on it. Asking would have cost one line."*
⚠️ **MEASURED 2026-09-25: `grains` is named in 82 live files**, plus 8
under `archive/`. A rename is the slug, the directory, the URL, the manifest row
and every one of those references.
⚠️ **AND `archive/` IS NOT REWRITTEN**, by the standing rule: an
archive records what was there, which is why `box` and `radio1965` are still
spelled the old way inside it. Those 8 files stay as they are.
⚠️ **`positron-history` LOADS BEFORE THE MOVE** and a line goes into it
after, because a slug that stops resolving is this project's most repeated
defect in its cheapest form.
⚠️ **`LAYOUT.md` ALREADY PRICES TWO RENAMES THAT WERE REJECTED.** Read
what it says about cost before adding a third.

⚠️ **WRAP IT IN THE INSTRUMENT PANEL**, which is now the THIRD page
asking for this in one stream, with `/shape/` and `/knobs/`. **One piece of
component work, done once, before any of the three page agents start.**

✅ **`createLocalRemote` EXISTS AND IS BARELY USED**, which is the point of
the ask. `demo/shell/local-remote.mjs:117` exports it and **`demo/kit/index.html`
is the only page that calls it today**. `/grains/`'s one line is *"one
granulator, running in this page and on a Raspberry Pi at once, with a blend
between them"*, which is exactly what that component is for, so this is a
hand-rolled control being replaced by the kit's own. **Read what the page does
today before swapping**, because the blend is the demo.
🔴 **AND IT IS A BOARD PAGE**: `room: 'fixed'`, `studio-1`, `settleMs:
60000`, SuperCollider on the Raspberry Pi. **`positron-hardware` loads first**,
and the same rule as `/shape/` applies to anything that reaches the board.

#### `knobs`: the instrument panel, real rotaries, a 25 key keyboard and a footer

⚠️ **ASKED, VERBATIM:** *"knobs: / wrap into instument panel. left to
rotaries cutoff reseonance, right is 'knobs' namepate. make keyboard 25 full w.
/ add footer with rasperry pi online padge. on right add enable midi button +
add midi support"*

🔴 **LOAD `positron-hardware` BEFORE ANY OF IT.** `demo/knobs/index.html:35-37`:
*"`studio-1` is the ADDRESS OF THE RASPBERRY PI, not a rendezvous this page"*
invented, and `room: 'fixed'` in the manifest exists so no harness renames it.
**This page plays a real Yoshimi on a board in another building.** `settleMs:
20000`.

1. ⚠️ **WRAP IT IN THE INSTRUMENT PANEL**, which is the same shared
   work as `/shape/`'s ask. `demo/shell/instrument.mjs` over
   `demo/shell/panel-layout.mjs`, seven pages already wear it, `/kit/` grades
   it. **Do `/shape/` and `/knobs/` as ONE piece of component work**, not twice.
2. ✅ **THE PAGE CALLED `knobs` HAS NO KNOBS IN IT.** `:354-367` builds
   `cutoff` and `resonance` with `createSlider` and pairs them with
   `createSliderGroup([cutoff, reso], { pair: true })`. The ask is for
   ROTARIES on the left with the nameplate on the right, which is the panel
   header's own `place: 'end'` shape.
   ✅ **AND THE INVISIBLE HAND SURVIVES THE SWAP, CHECKED 2026-09-25 RATHER
   THAN ASSUMED.** `demo/shell/knob.mjs:58-61` imports `createHandDrive` from
   `hand-drive.mjs` and says in as many words that it is *"shared with
   `slider.mjs`"*. Both sliders here carry `hand: true` and `onHand:
   handSaid(...)`, and that is the page's subject, so losing it would have been
   the whole demo. **It does not get lost.**
   ⚠️ `knob.mjs:67` warns that `set(v, { from: 'hand' })` has meant A
   PERSON since the knob was written while `handMoves()` counts the invisible
   one. Two senses of one word in the module being adopted. Read it before
   wiring `onHand`.
3. ⚠️ **25 KEYS, FULL WIDTH.** `createKeyboard` at `:694`, shared with
   nine other pages, so a width change is checked against them rather than
   tuned here.
4. ⚠️ **A FOOTER WITH A RASPBERRY PI ONLINE BADGE.** `presence.mjs`
   already supplies the badge and this page already knows the board's address.
5. 🔴 **AN `enable midi` BUTTON, AND IT POINTS THE OPPOSITE WAY TO THE
   `muta` ASK IN THE SAME STREAM.** `/muta/` is being asked to DELETE its MIDI
   on button because *"its should be listening"*, with permission set up when an
   instrument is turned on. `/knobs/` is being asked to ADD one. **Both are
   reasonable and they are not the same page**: `muta` is a local instrument in
   the browser, `knobs` reaches a board in another building, so an explicit
   enable is a different promise there. **But they are one decision about how
   this project asks for MIDI, and deciding them apart is how two pages end up
   disagreeing.** Settle the pair together and write down why they differ.

#### `able`: move the demo to the archive, out of the index

⚠️ **ASKED, VERBATIM:** *"arhcive able demo and rm from index"*

Same shape as the `bay` ask above and the same two halves: a real move into
`archive/` AND out of the index, not `built: false` alone.
`demo/manifest.mjs:674-676`, `settleMs: 12000`, `room: 'fixed'`, one line
reading *"play Ableton Live on a studio Mac from here, with no virtual audio
cable"*.

🔴 **AND THIS ONE HAS A RIG BEHIND IT, WHICH `bay` DID NOT.** Four files
under `rig/` name it: `rig/m1/pace-agent.mjs`, `rig/m1/live-agent.mjs`,
`rig/m1/README.md` and `rig/board/board.mjs`. `room: 'fixed'` means `m1-1` is
**the address of the studio Mac's agent**, not a name this page chose.
**Archiving the page does not archive the agent**, and nothing in the ask says
to touch `rig/`. Load `positron-hardware` before deciding what, if anything,
moves there.
⚠️ **THREE LIVE PAGES AND TWO KIT MODULES ALSO NAME IT**:
`demo/kit/index.html`, `demo/knobs/index.html`, `demo/grains/index.html`,
`demo/shell/board.mjs` and `demo/shell/presence.mjs`. **Separate a page LINKING
to `/able/` from a module that merely shares its vocabulary** before moving
anything, which is the same separation the `bay` entry asks for.
⚠️ `positron-history` loads before the move, and the demo count in
CLAUDE.md is recounted after it and never remembered.

#### `dump`: empty tables at a fixed height instead of two placeholder sentences

⚠️ **ASKED, VERBATIM:** *"dump: nothing asked yet / press Listen, then
play something / show empthy tables / miditables immidately with fixed heigh. no
texdt in them until dumps arrive"*

The two quoted strings are the `empty` captions on this page's two tables:
`demo/dump/index.html:117` `empty: 'nothing asked yet'` on the `ports` table at
`:109`, and `:140` `empty: 'press Listen, then play something'` on the `traffic`
table at `:122`. Both are `createTable` from `demo/shell/table.mjs`.

⚠️ **WHAT IS BEING ASKED FOR IS THE TABLE ITSELF AS THE EMPTY STATE.**
Draw the table immediately, at a fixed height, with no text in it until dumps
arrive, rather than a sentence standing where the table will be.

🔴 **THE FIXED HEIGHT IS THE LOAD-BEARING HALF AND THIS PROJECT HAS
PAID FOR IT BEFORE.** `demo/wish/index.html:96-98` records a box that was *"7
lines for one connection and 16 for the next"* and therefore *"would move the
log and the end of the page on every press"*. A table that grows as rows land
does the same thing to everything under it. **So the height is chosen and
asserted, not left to the content.**
⚠️ **AND IT BUMPS INTO A RULE THAT POINTS THE OTHER WAY**, which is
worth naming rather than discovering halfway: `demo/shell/roll.mjs:111` records
*"an empty box is a line"*, the argument for a caption in an empty container.
**These are not in conflict here**: the ask is for a table with its own header
and ruled rows visible, which is structure a reader can see, not a blank
rectangle. Say that in the comment so nobody reverts it to a caption later.

⚠️ **IT IS A CHANGE TO `table.mjs` IF THE OPTION DOES NOT EXIST**, and
that module is shared across many pages. Check whether `createTable` can already
render its frame with zero rows before adding an option, and if it cannot, that
is kit work done once by one agent, with `/kit/` re-run after it.
⚠️ **A READOUT CELL IS NOT AN ASSERT**, so if the fixed height matters
it gets an assert that reads the rendered height before and after rows arrive.
`/dump/` is one of the pages where the harness drives real MIDI, so check what
its checks already do before adding to them.

#### `tom`: the gutter lost the second digit of every number

⚠️ **ASKED, VERBATIM, WITH A SCREENSHOT:** *"you lost 2-digin numbers
from tom demo"*

The crop shows the grid's left gutter reading `5 5 5 5 5 5 5 5 6 6 6 6` down
twelve rows. **Those are two-digit numbers with the second digit gone**, eight
in the fifties and four in the sixties, which is a run of consecutive values
rendered one character wide.

🔴 **AND THE SAME SCREENSHOT SHOWS `0.24 ready, 14/14 checks`.** The page
is FULLY GREEN while a person can see the defect in the same picture. That is
this project's own worst shape arriving in the cheapest possible form, and it
means **no assert on that page reads the gutter's text**. Whatever fixes the
digits adds the assert that would have caught it, or the next one goes the same
way.
⚠️ **SUSPECT THE WIDTH BEFORE THE FORMATTER.** A clip is a box too
narrow; a truncation is a `slice`. They look identical in a screenshot and have
different fixes, so measure the rendered rect against the text before changing
either. `demo/shell/knob-test.mjs` already records that writing a `minWidth`
from inside a component is *"a rule nothing can override"*, so a width forced
somewhere upstream is a live candidate.
⚠️ **AND `tom` CARRIES MIDDOTS**, at least at `:1619`, which the
standing rule removes when this page is worked on.

#### The play button is MOJIBAKE, and the page it is on takes a pack upload

⚠️ **ASKED, VERBATIM, WITH A SCREENSHOT:** *"what happened to play
button? autoplay when i upload saple pack"*

The crop shows a transport bar: a glyph button reading **`â—¶`**
and a two-line clock, `0:00.0` over `0:02.0`. **That is a multi-byte character
being decoded one byte at a time**, the classic UTF-8 read as Latin-1, so the
play glyph has become three characters.

🔴 **IF IT IS THE SHARED BAR, IT IS NOT A `tom` BUG, IT IS EVERY PAGE
WITH A TRANSPORT BAR.** The glyph comes from `demo/shell/transport-bar.mjs`,
which is the ONE transport control in this project and says so in its first
line. **Establish the blast radius before fixing anything.**
✅ **ANSWERED 2026-09-25: THE SCREENSHOT IS FROM `https://positron.studio`,
NOT FROM LOCALHOST.** So this is a DEPLOY fault and local is clean, which is the
worst shape for it: **every page with a transport bar is affected for every
visitor while every harness run on this machine stays green.** The deployed
response headers are the first thing to read.
⚠️ **WHAT WAS CHECKED TODAY AND WHAT WAS NOT.** CHECKED: `demo/server.mjs`
sends `charset=utf-8` for `.html`, `.mjs`, `.js`, `.css` and `.json`, and
`demo/tom/index.html` and `demo/pack/index.html` both carry
`<meta charset="utf-8">`. A grep for the mojibake byte sequences across `demo/`
found **nothing**, so it is not sitting in the source. NOT CHECKED: **whether
the DEPLOYED site serves a charset**, which is the obvious remaining suspect and
would make this local-clean and live-broken. `workers/view/src/index.js` sets
`charset=utf-8` on its JSON and plain-text answers and the static pages do not
go through those paths. **Reproduce it and say WHICH origin it was seen on
before touching a line**, because local and deployed have different answers here.
⚠️ **WHICH PAGE IS NOT SETTLED EITHER.** Five pages take a file:
`crate`, `kit`, `pack`, `shape` and `tom`.

✅ **ANSWERED 2026-09-25: IT IS A REQUEST.** Play as soon as a pack is
uploaded. It was put to the owner because it read equally as a report that the
page ALREADY autoplays and should not.
⚠️ **AND IT IS INSIDE THE STANDING RULE RATHER THAN AN EXCEPTION TO
IT.** *"A visit, a step and a scrub must open nothing"* is about a VISIT. An
upload is a gesture a person made, so playing what they just handed the page is
a consequence of that gesture. **A visit must still open nothing**, and that is
the line to hold while building this.

#### `evo`: make all buttons interactive

⚠️ **ASKED, VERBATIM:** *"evo: / make all buttons interactive"*

⚠️ **"ALL" IS THE WORD TO PIN DOWN FIRST.** It reads as: buttons on
that page are drawn but do nothing, or are disabled, and should work. **Find out
which ones and why they are inert before building anything**, because a button
that is disabled for a reason is different from one that was never wired, and
this session has already found one page where every transport button was wired
to a dead option name.
🔴 **AND A BUTTON THAT GAINS A HANDLER IS A BUTTON THE HARNESS NOW
PRESSES.** `demo/verify.mjs` clicks every button in `.pos-controls` on every
run, so making inert buttons live changes what the suite DOES to this page.
`/evo/` imports the instrument box and names `bay`, so check what those presses
would reach before enabling them. **The `/shape/` rule applies wherever it
fits: nothing that writes to somebody's instrument belongs in that row.**

#### `shape`: three controls on one line, and the third one is the DANGEROUS one

⚠️ **ASKED, VERBATIM:** *"shape: but butotns in one line"*, with a
sketch: *"[circuit connected] [Synth1|Synths] [⇄] <- square button, makes
all buttons \"invisible hand\" staeting from random positions"*

🔴 **THE `⇄` BUTTON IS THE EXACT CONTROL THIS PAGE REFUSES TO PUT IN
`.pos-controls`, IN WRITING, AND THE REASON IS SOMEBODY'S REAL INSTRUMENT.**
`demo/shape/index.html:9-13`: *"EVERYTHING THAT CAN REACH THE INSTRUMENT, AND
NOTHING ELSE. The part chooser and the two buttons live here rather than in
`.pos-controls`, because `demo/verify.mjs` clicks every button in that row on
every run: a `move everything` in there would be the suite putting a random
patch on somebody's synth dozens of times a day."* And `:180-184`: *"NOTHING
THAT SENDS IS IN THAT ROW ... a hand button or a `put back` in there would be
the suite writing to an instrument on this desk. `slider.mjs` refuses a hand
inside that row on its own, and there is an assert on it below."*
✅ **SO THE BUTTON IS FINE AND ITS PLACE IS NOT.** It goes in the page's own
row beside the others, never in `.pos-controls`, `slider.mjs`'s refusal stays,
and the assert on that refusal stays. **This is the Novation Circuit on this
desk, which has no factory reset.**

⚠️ **AND THE STATUS CONTROL PULLS THE OTHER WAY, WHICH IS WHY THE ROW
IS SHAPED AS IT IS.** `:176-179` records that `.pos-controls` is what
`demo/verify.mjs` presses and control 0 is what gets `settleMs`, so *"a status
control outside that row is a control no harness drives, and every check behind
it would go silent while the suite stayed green"*. `controls: []` at `:186`.
**`[circuit connected]` joining a page-owned row is therefore a coverage
question, not a layout one**: say what drives it after the move, or say what
went silent.

✅ **THE WIDTH IS ALREADY MEASURED AND THE ANSWER IS THREE.** `:14-20`
records four controls at **784 px in a 688 px column**, which always wrapped,
and that loose they broke 3 and 1 with `put back` alone on a line. Three were
then **RE-MEASURED off real rects at 390, 560, 756 and 1280 px**. The sketch is
three, so one line is achievable, and **a square glyph button is narrower than
what it replaces**. Re-measure at those four widths rather than trusting this.
⚠️ **AND `⇄` IS A GLYPH, SO IT IS NOT A NAME.** It needs an `aria`
label or the control is announced as a symbol, which is the rule
`transport-bar.mjs` already carries for its own glyph buttons.

⚠️ **"STARTING FROM RANDOM POSITIONS" IS A SECOND BEHAVIOUR, NOT A
RESTATEMENT.** The hand moves things; this also SETS them somewhere random
first. `/shell/hand.mjs` supplies `MOVES` and `minSteps`, and `HAND_STEPS =
minSteps(MOVES[0][1])` at `:158` exists so that a lane too coarse to show a hand
is not drawn. `HAND_CEILING = 600` control changes a second at `:322`, and
`:301-305` records that **forty hands are not one hand forty times**. A jump to a
random position on every control at once is the worst case that pacing exists
for, so measure what leaves rather than assuming the coalescer holds.

#### `shape`: drop the MIDI log's empty caption

⚠️ **ASKED, VERBATIM:** *"rm move a slider and what it sends is listed
here"*

`demo/shape/index.html:470`:
`const traffic = createMidiLog({ empty: 'move a slider and what it sends is listed here' });`
⚠️ **CHECK WHAT `createMidiLog` DOES WITH NO `empty`** before deleting
the option. An empty box with no caption at all may be the thing this project
calls *"an empty box is a line"*, which `roll.mjs:111` names. If the component
needs a placeholder, this is a shorter one rather than none.

#### `shape`: wrap it in the instrument box, with a vertical nameplate

⚠️ **ASKED, VERBATIM:** *"shape: / wrap into isntrument box. nameplate
is \"shape\" vertical glued section"*

`demo/shape/index.html`, 1,450 lines, `settleMs: 4000`, one line reading *"edit
a Novation Circuit's sound while it is playing, with sliders that can move
themselves"*. **It does not use the instrument box today.**

✅ **THE BOX EXISTS AND SEVEN PAGES ALREADY WEAR IT**: `demo/shell/instrument.mjs`
over `demo/shell/panel-layout.mjs`, used by `circuit`, `fau`, `evo`, `kit`,
`muta`, `tom` and `twelve`. So this is `/shape/` joining a convention rather
than anything being invented, and `demo/kit/index.html` is where the convention
is graded.

🔴 **"VERTICAL" MAY NOT EXIST YET, AND THAT IS THE PART TO ESTABLISH
FIRST.** `instrument.mjs:9-13` records the placements in use, and they are all
horizontal: `/tom/` is `createNameplate({ lines: ['POSITRON', 'TOM'], place:
'ends' })`, `/twelve/` is `place: 'end'`, `/circuit/` does its own placing.
`plateSpec(maker, name, place = 'ends')` at `:93` is the whole vocabulary.
**If a vertical plate glued down the side of the case is a new mode, it is a
change to SHARED kit that reaches all seven pages plus `/kit/`**, so it is done
once by one agent before any page agent starts, and `/kit/` is re-run.

🔴 **AND DO NOT READ THIS AS UNDOING *"rm nameplates"*.**
`instrument.mjs:144-146` records `plate: false`, added 2026-09-22 on that ask,
and the reason it gives is specific: **the status control already prints the
instrument's name in front of its state, so a plate BESIDE IT is the name
twice.** A plate glued vertically down the side of the case is a different
object in a different place and does not put the name next to the status. **Both
decisions can stand**, and whoever builds this says so in the comment rather
than leaving the two looking contradictory.

⚠️ **THE NAME IS `shape`, LOWER CASE, AS ASKED.** Every existing plate
is upper case (`POSITRON TOM`, `MODEL 12`, `PLAITS`, `WARPS`). Follow the ask
and note the departure, rather than quietly title-casing it.

⚠️ **THIS IS UI AND TOUCHES NOTHING THE PAGE SENDS.** `/shape/` edits a
real Novation Circuit's sound over SysEx, and the standing Circuit rules in
CLAUDE.md are about what gets WRITTEN to that instrument. Wrapping the page in a
box changes none of it, and nobody wandering into this task has a reason to send
anything to the Circuit.

#### `wish`: enable the connections, and a remove button in the column that was reserved for it

⚠️ **ASKED, VERBATIM:** *"wish: when connections (diagram rows) are
there, enable them. add small remove button on each to the right of the row"*

✅ **THE COLUMN ALREADY EXISTS AND WAS RESERVED FOR EXACTLY THIS, WHICH
MAKES THE SECOND HALF CHEAP.** `demo/wish/index.html:205-207` reads *"THE RIGHT
OF EVERY ROW IS FOR ACTIONS AND IT IS EMPTY TODAY"*, asked for on 2026-09-22 as
*"reserve right side of diagram+allowed to action buttons etc. align diagram to
left?"*, and `:229` is `grid-column: 2; grid-row: 1 / 3`. **This is the first
thing to land in it**, so nothing about the layout is being invented.
🔴 **AND THE WIDTH IS A MEASUREMENT, NOT A TASTE.** `:220-227` records
that `diagram.mjs` draws a row of boxes while its host is at least 560 px wide
and STACKS them below that, so the action column's 72 px comes off the picture.
**A button that does not fit inside it collapses the diagram into a stack**, and
the file already says the page reports which number broke it. Measure the button
against 72 px rather than styling it and looking.

✅ **SETTLED THE SAME DAY, ASKED AS:** *"arhive bay demo and rm from
index. use the connecting code in wish"*. **It is the first reading below.** The
rows become LIVE connections, and the code that makes them live is `bay`'s,
moved into service here rather than rewritten. The second reading is recorded
only so nobody re-opens the question.

🔴 **"ENABLE THEM" IS THE HALF WITH THE WORK IN IT AND IT HAD TWO
READINGS.** `/wish/`'s one line is *"say which instrument should play which, and
a language model proposes the connection"*, so today a row is a PROPOSAL.
- **The reading that fits the page:** when the rows are there, make them LIVE,
  so a proposed link actually routes one instrument into another. That is
  `demo/shell/bay.mjs`'s subject, and it is a feature rather than a style
  change.
- **The other reading:** the rows are drawn inert or disabled-looking today and
  should simply become interactive when connections exist.
✅ **THE FIRST ONE IS THE ANSWER.** No confirmation is outstanding.

🔴 **AND THE VALIDATOR IS NOT OPTIONAL.**
`bay.mjs` splits refusals into two lists on purpose and this repository has the
story in writing: one merged `accepts` list meant **every real link on the desk
was refused**. A class a destination does not handle is DROPPED at the boundary
and reported; a class on `never` REFUSES the link. **A model proposes and a
person presses**, which is already this project's rule for anything turning
words into actions, and it is why the rows show the connection as text first.
⚠️ **A remove button is a control per row**, so `/wish/`'s per-page
assert count moves and the harness will now press however many rows exist.
`demo/verify.mjs` presses `.pos-controls button, .tbar-x`, so whether these
buttons are inside that selector is a decision, not an accident: pressing every
remove button in order would empty the page mid-check.

#### `bay`: move the demo to the archive

⚠️ **ASKED, VERBATIM:** *"move bay demo to archive"*

`demo/bay/index.html`, `demo/manifest.mjs:520-522`, `group: 'instruments'`,
`built: true`, one line reading *"route one instrument to another, with the
connections it refuses explained in words"*.

🔴 **THE DEMO AND THE KIT MODULE ARE TWO DIFFERENT THINGS AND ONLY ONE
OF THEM WAS ASKED ABOUT.** `demo/shell/bay.mjs` is a KIT MODULE with its own
`demo/shell/bay-test.mjs` beside it, and this repository's own verify notes cite
it as a worked example of a validator that must assert the REASON as well as the
refusal. **Archiving the page does not archive the module**, and nothing in the
ask says to touch it.

⚠️ **NINE LIVE FILES NAME `bay` AND THEY ARE NOT ALL THE SAME KIND OF
REFERENCE.** `demo/shape/index.html`, `demo/evo/index.html`, `demo/wish/index.html`,
`demo/kit/index.html`, `demo/shell/presence.mjs`, `demo/shell/instruments.mjs`,
`demo/shell/instruments-test.mjs`, `demo/shell/bay.mjs` and
`workers/wish/src/wish.mjs`. **Separate the page references from the module
references before moving anything**, because a page importing `bay.mjs` is
untouched by this and a page LINKING to `/bay/` is not.
⚠️ `workers/view/public/` copies are BUILD OUTPUT and regenerate from
`cd workers/view && node build.mjs`. They are not files to edit.

✅ **SETTLED THE SAME DAY, ASKED AS:** *"arhive bay demo and rm from
index. use the connecting code in wish"*. **Both halves: a real move into
`archive/` AND out of the index.** The cheap reading, `built: false` alone, is
not what was asked for.
🔴 **AND THE MODULE IS NOT RETIRED, IT IS REHOMED.** *"use the connecting
code in wish"* is the other half of the same sentence, so `bay.mjs`'s connecting
code goes into service on `/wish/` in the same effort. **The page is archived;
what it demonstrated is not.** See the `/wish/` entry above, which this settles.
⚠️ **`positron-history` LOADS BEFORE THE MOVE**, since that skill
exists for exactly the links, slugs and paths a retirement leaves behind, and a
move into `archive/` makes every link to `/bay/` a dangling slug.
⚠️ **AND `archive/` IS DELIBERATELY NOT REWRITTEN.** CLAUDE.md records
that the 129-file path sweep left it alone on purpose, because an archive
records what was there, which is why `box` and `radio1965` are still spelled the
old way inside it.

⚠️ **COUNT THE DEMOS AFTER, NEVER REMEMBER THEM.** The row count in
CLAUDE.md moves with this and has been wrong twice in one day before.

#### `muta`: four, and THREE OF THEM REVERSE AN EARLIER EXPLICIT ASK

🔴 **ASKED, VERBATIM:** *"muta / fix sound routing. / rm midi on button.
its should be listening. set up midi listening / permission when i turn either
on at start. / no automatic drone. make a Test tone button in the right of
plaits. when midi notes arrive, they turn off test tone and vice versa / when
plaits is off and warps in on from plaits - how it can play at all?"*

🔴 **THE REVERSALS ARE THE THING TO WRITE DOWN, BECAUSE THE PAGE ARGUES
FOR THE OLD BEHAVIOUR IN ITS OWN COMMENTS AND THE NEXT READER WILL BELIEVE
THEM.** Each one is the owner's to make. What costs money is a comment left
standing that says the opposite, so **every comment named below moves in the
same commit as the code.**

1. ⚠️ **FIX SOUND ROUTING.** Said with no detail, and item 4 below may
   BE the detail rather than a separate question. **Confirm that reading before
   working it**, because "fix routing" with a wrong guess attached is a change
   nobody can find later.
   What the graph does today, `demo/muta/index.html:1261-1266`:
   `node.connect(warpNode)`, `warpNode.connect(wetGain)`,
   `wetGain.connect(ctx.destination)`, and separately `node.connect(drySplit)`,
   `drySplit.connect(dryGain, 0)`, `dryGain.connect(ctx.destination)`. So PLAITS
   reaches the output by two roads at once, through WARPS and around it.
2. 🔴 **REMOVE THE MIDI ON BUTTON, IT SHOULD JUST BE LISTENING, AND SET
   UP LISTENING AND PERMISSION WHEN EITHER INSTRUMENT IS TURNED ON. THIS
   REVERSES TWO EARLIER ASKS AND THE PAGE QUOTES BOTH.** `:921-922` records
   *"add webmidi support (online button midi off)"* and then *"add a button
   (online status one) to turn midi on and off. when on, listem webmidi"*, and
   `:1950` records *"plaits on should not turn midi on and should..."*, which is
   the exact behaviour now being asked for.
   ⚠️ **AND `:929` IS A DELIBERATE DECISION, NOT AN OVERSIGHT**:
   *"NOTHING IS OPENED UNTIL IT IS PRESSED. `requestMIDIAccess` is a..."*.
   Moving the request onto instrument power-up means a browser permission prompt
   fires from that press.
   ✅ **THAT IS STILL INSIDE THIS PROJECT'S RULE, WHICH WAS CHECKED RATHER
   THAN ASSUMED.** The standing rule is that a VISIT opens nothing; turning an
   instrument on is a press a person made, so the prompt is a consequence of a
   gesture and not of a page load. **A visit must still open nothing**, which is
   the line to hold while doing this.
   🔴 **AND IT TAKES AN ASSERT WITH IT.** `:2605` reads
   `midiBtn.el.tagName === 'BUTTON' && midiWas === false && !!midi`, so deleting
   the button deletes evidence. Find what that assert was standing in for and
   replace it rather than let the count drop, which is the `/fau/` compile
   button lesson of 2026-09-24.
3. 🔴 **NO AUTOMATIC DRONE, AND A `Test tone` BUTTON TO THE RIGHT OF
   PLAITS INSTEAD. THIS ALSO REVERSES AN ASK THE PAGE ARGUES FOR AT LENGTH.**
   `:383-396` records *"rm all top buttons, automatically go for drone"* from
   2026-09-22 and then defends it: *"THE PAGE PLAYS ITSELF NOW"*, *"the first
   thing a visitor does produces a continuous sound they can then take a knob
   to, which is what every knob on this panel is FOR"*.
   ⚠️ **MIDI NOTES AND THE TEST TONE ARE MUTUALLY EXCLUSIVE, BOTH
   WAYS**: *"when midi notes arrive, they turn off test tone and vice versa"*.
   🔴 **AND THIS PAGE HAS NO CONTROL ROW AT ALL**, `controls: []` at
   `:402`, which the file says at `:394` costs the harness nothing precisely
   because there is nothing to press. **Adding the first control back changes
   that**: `settleMs` only ever lands on control 0, and `:378-381` records that
   this page has already paid for exactly that once, when control 0 changed and
   the wait that covered a wasm fetch and two handshakes had to move. `muta`
   carries `settleMs: 8000`.
   ⚠️ **AND `/muta/` IS THE PAGE THIS REPOSITORY LOST ASSERTS ON
   SILENTLY**, twice, to the harness's patience while its DSP checks held notes.
   Diff the per-page assert count before against after and account for every row
   that moves.
4. 🔴 **THE QUESTION, AND IT LOOKS LIKE A REAL DEFECT RATHER THAN A
   MISREADING:** *"when plaits is off and warps in on from plaits - how it can
   play at all?"* `CARRIERS` at `:308` is
   `['from PLAITS', 'sine', 'triangle', 'saw']`, and `:1137` reads *"the second
   input comes from PLAITS, so the whole sound is the chain"*. **So with PLAITS
   offline and WARPS carrying `from PLAITS`, WARPS has no input and should be
   silent.** If it makes a sound anyway, either the offline state does not stop
   the node or the carrier selection is not doing what the label says.
   ⚠️ **ANSWER IT BY MEASURING, NOT BY READING THE GRAPH**, because
   both explanations are consistent with the source. This is very likely the
   whole of item 1.

#### `nola`: five, and the first one DEPENDS on the keyboard work above

🔴 **ASKED, VERBATIM, WITH A SCREENSHOT:** *"nola / rm chord from top
left (as it moves to keyb compoentn) / rm gap in piano roll vert lines /
recoridng in diagram is unclear. samples? / only show chords textfield when
typed is selected / add piano / rhodes into a isntrument footer to the right
glued under keyboaed"*

The screenshot shows `/nola/`'s roll: dot rows, faint vertical rules, and the
chord names `C#aug`, `Gmaj`, `Fmaj` stacked at the RIGHT of each row, with the
vertical rules visibly broken by a horizontal gap between rows.

1. ⚠️ **REMOVE THE CHORD FROM THE TOP LEFT.** The reason is in the ask
   and it is an ORDERING CONSTRAINT, not a detail: *"as it moves to keyb
   compoentn"*. **So the keyboard footer has to gain the chord name before
   `/nola/` gives it up**, or the page loses a readout and gains nothing. One
   agent, keyboard first, `/nola/` second.
2. 🔴 **REMOVE THE GAP IN THE PIANO ROLL'S VERTICAL LINES, AND THIS IS
   THE FIFTH REQUEST ABOUT THOSE LINES.** `demo/shell/roll.mjs:68-83` records
   the other four verbatim: *"add faint vertical lines ... (not sure how good
   idea)"*, then *"make vertical lines on pianoroll continuous"* which was done
   by closing the row gap, then *"no continous vertical bars on pianoroll!"*
   which **was read as `remove them` and meant `they are still not
   continuous`**, so they were deleted, then *"you lost vertical lines on piano
   roll"*.
   ⚠️ **READ THAT COMMENT BEFORE TOUCHING THIS.** The file's own lesson
   is that the reading which DESTROYS work is the one to check first, and this
   ask is the same complaint a fifth time: the gap that was closed once is open
   again. **The verb here is unambiguous, `rm gap`, so the lines stay and the
   gap goes.**
   🔴 **AND `roll.mjs` IS SHARED**: `demo/kit/index.html` and
   `demo/nola/index.html` use it, and `demo/shell/keyboard.mjs` and
   `demo/shell/numloop.mjs` build on it. `/kit/` grades the kit, so it moves and
   has to be re-run. Done once, by one agent, before the page agents start.
3. ⚠️ **THE `recording` NODE IN THE DIAGRAM IS UNCLEAR**, with a
   proposed replacement in the ask as a question: *"samples?"*. This is a
   `positron-diagram` task and that skill loads before the box is edited.
   ⚠️ **AND THE WORD MATTERS ON THIS PAGE MORE THAN MOST**, because
   `/nola/` already carries a collision it warns about twice in its own header:
   `demo/shell/rhodes.mjs` is a SYNTHESISED Rhodes and the files beside the page
   are a RECORDED one. A box reading `recording` sits exactly on that seam, so
   whatever replaces it has to be right about which of the two it names.
4. ⚠️ **ONLY SHOW THE CHORDS TEXT FIELD WHEN `typed` IS SELECTED.** A
   field that does nothing in the other mode is furniture that reads as broken.
   ⚠️ **AND IT IS A CONTROL DISAPPEARING, WHICH THE HARNESS FEELS.**
   `demo/verify.mjs` presses `.pos-controls button, .tbar-x` in order and types
   into the fields it finds, so hiding one moves every later control's press and
   may take asserts with it. Diff `/nola/`'s per-page assert count before
   against after and account for every one that moved.
5. ⚠️ **PIANO AND RHODES INTO AN INSTRUMENT FOOTER, TO THE RIGHT,
   GLUED UNDER THE KEYBOARD.** Both instruments already exist on the page: the
   piano is the recorded pack and the Rhodes is Jeff Learman's jRhodes3d, five
   velocity layers, with `demo/nola/PROVENANCE-rhodes.json` and
   `LICENSE-jrhodes3d` beside it.
   ⚠️ **THE ATTRIBUTION IS ON THE FACE OF THE PAGE ON PURPOSE** and the
   header says so, so a footer that re-homes the instrument switch must not
   quietly re-home the credit with it.
   ⚠️ **`glued under keyboard` IS A LAYOUT CONTRACT AND THE KEYBOARD
   ALREADY HAS ONE**: `roll.mjs:259` records that the roll *"goes inside the
   keyboard's own box, and that is what makes it line"* up. A second footer
   hanging off the same box is the same constraint again, so it is a
   `positron-ui` task and the component may be where it belongs rather than the
   page.

#### `keyboard` component, shared: the naming toggle loses its words

⚠️ **ASKED, VERBATIM:** *"keyboard component: Notes | Degreens -> Nt |
Dg."*

`demo/shell/keyboard.mjs:706-708` holds `mkName('Notes', 'letter', ...)` and
`mkName('Degrees', 'degree', ...)`.
🔴 **THIS IS THE FOURTH SPELLING OF ONE LABEL AND THE FILE RECORDS THE
OTHER THREE**, at `:700-705`: *"c | 1 - someting more descriptive?"*, then
`C D E | 1 2 3`, then *"Notes | Degrees"* on 2026-09-23. The comment there
argues IN WRITING for the words over the glyphs, *"a word a reader can look up
beats a demonstration they have to decode"*, so **that comment is now wrong and
moves in the same commit**, rather than being left to contradict the code.
⚠️ The `title` on each button is the sentence a reader looks up and it
is not what is being shortened, so it stays and carries the meaning the label
just gave up.

#### `keyboard` component, shared: a chord name in the footer

⚠️ **ASKED, VERBATIM:** *"add chord name to the footer, right from the
transpose message. avoind text moving in x axis"*

The footer is the keyboard's own, the one the sustain moved into on 2026-09-23
(*"integrate sustain to footer, create toggle button, big and small"*,
`:780-781`). The chord name goes to the RIGHT of the transpose message.
🔴 **AND THE SECOND SENTENCE IS THE HARD HALF.** A chord name changes
width as it changes (`C` against `Cmaj7` against `F#m7b5`), and a label to the
left of it would be shoved about by every chord played. Nothing may move in x.
That is a fixed slot or tabular figures, not a join.
⚠️ **AND IT IS CELLS, NOT ONE STRING WITH GLUE IN IT.** The standing
rule about middots applies before the code is written: a transpose message and a
chord name are two facts and therefore two cells.
⚠️ `demo/shell/chords.mjs` and `demo/shell/chords-test.mjs` already
exist and already name chords. **Find out what they answer before writing a
namer**, because a hand-rolled second one is this project's named defect.

#### `fau`: all sizes in kB

⚠️ **ASKED, VERBATIM:** *"faust all sizes in kb"*

`demo/fau/index.html` prints sizes in at least three units today: raw bytes
(`COMPILER_BYTES = 3598106 + 2407445 + 156922` at `:211`, `PAGE_BYTES` at
`:213`, `PINNED = { name: 'fau_pin', bytes: 7266 }` at `:235`), and one cell
already carries `'per voice': 'KB'` at `:392`. **Every size a reader sees goes
to kB**, which is a sweep of that page's readout keys and its prose, not one
cell.
⚠️ **THE PROSE CARRIES NUMBERS TOO** and goes stale silently: `:132`,
`:181`, `:193`, `:268` and `:272` all quote byte counts in comments and in
`what`. A changed unit that leaves those behind is the drift rule arriving in a
sentence.
⚠️ **DECIDE kB ONCE AND WRITE IT DOWN**: 1000 or 1024, and one decimal
or none. Two conventions on one page is worse than bytes.

#### `fau`: more patches

⚠️ **ASKED, VERBATIM:** *"add more patches if you have"*

⚠️ **"IF YOU HAVE" IS A REAL CONDITION AND NOT A POLITENESS.** Look for
Faust sources already in this repository or already measured, and prefer those
to invented ones. This page's own comments name real ones, the STK waveguide
piano at `:272` among them.
⚠️ **AND A PATCH IS A CONTROL.** Adding one moves every other control's
harness press, so the thing to look at is `/fau/`'s per-page assert count before
against after, and `/fau/` has already lost coverage to a control change once:
its compile button took three asserts' meaning with it on 2026-09-24.

#### A BLANK LINE AFTER EVERY COMMENT, AND THE FORMAT IS NOW EXACT

⚠️ **ASKED, VERBATIM:** *"add nl after comments"*, then clarified with a
worked example rather than a description:

    from                      to

    // comment                // comment
    some-code-here
                              some-code-here

✅ **SO THE FORMAT IS SETTLED**: a comment is followed by a blank line before
the code it introduces.
⚠️ **THE SCOPE IS THE ONLY OPEN HALF, AND THE THREE READINGS COST
WILDLY DIFFERENT AMOUNTS.** The example is JavaScript-shaped (`// comment`), not
Faust, although the ask arrived inside the `fau` block:
  1. **New and edited code only**, a convention from here on. Cheap, and it is
     what a style note normally means.
  2. **Every source file in this repository.** Enormous, and it touches every
     file an agent is holding, which is the `git add -A` hazard at full width.
  3. **The Faust listing shown on `/fau/`**, which is where the ask arrived.
✅ **ANSWERED 2026-09-25: READING 3. THE FAUST LISTING ON `/fau/` ONLY.**
Not a repository-wide sweep and not a convention for new code. **It is a
`/fau/` task and it belongs to that page's agent.**


### Open 2026-09-25: four reports on `/stage/` from looking at the working tree

🔴 **ASKED, VERBATIM, ALL FOUR IN ONE MESSAGE:** *"no hls video on
conrtol room. is it tab swithcing? zoom out transport a lot its frntic. it
should not start unti on aor. still that asked ghost lane"*

Reported against the UNCOMMITTED working tree, minutes after the `onClick` fix
took the page from 31/47 to 46/48. **So a suite reading 46/48 did not see any of
these**, which is the assert-count lesson from the other side: the count went up
and four things a person can see are still wrong.

1. ⚠️ **NO HLS PICTURE IN THE CONTROL ROOM**, and the reporter's own
   guess is in the ask: *"is it tab swithcing?"*. `demo/stage/index.html:390-412`
   builds the audience `<video>` into `byId.get('audience')`, and the control
   room is a different panel. `demo/shell/tabs.mjs` builds panels off-page. So
   the picture may be landing in the audience tab only, or landing in a panel
   that is not attached when the frame arrives. **The guess is worth testing
   first and is not worth trusting**, because `/stage/` has already had one
   bug that looked like tab switching and was a container being repointed.
2. ⚠️ **THE TRANSPORT IS ZOOMED IN FAR TOO FAR AND READS AS FRANTIC.**
   `ARCHIVE_WINDOW_MS = 30 * 1000` at `:956`, and the control room's timeline
   opens on the same window from zero (`:1733`, `:2898`). Asked for *"a lot"* of
   zoom out. ⚠️ **AND THE PAGE ASSERTS THE CURRENT NUMBER**: `:2915`
   checks the room's span against `ARCHIVE_WINDOW_MS` within 5 per cent, so this
   is a change to a constant AND to the assert that grades it, in one commit.
   ⚠️ The archive window was itself asked for on 2026-09-18 as *"zoom
   arhvie to 15s and allow to zoom out 4x more"* and tuned to *"zoom around this
   level"*, so **check whether this ask is about the control room only** before
   moving the archive's.
3. ⚠️ **IT SHOULD NOT START UNTIL ON AIR.** Read as: the timeline, the
   write head and the film should not be running while the badge still says
   `OFF AIR`. `armWall(0)` fires when recording starts (`:1240`), and the film
   was made to start with the show on 2026-09-25 when its own play button was
   removed, which `HANDOFF.md` already flags as a reversal to revisit. Whatever
   moves before `phase === 'live'` is the subject.
4. 🔴 **THE `asked` GHOST IS STILL THERE**, in the reporter's words
   *"still that asked ghost lane"*, AFTER the fix measured clean in three tabs.
   The earlier repair made the SENDER drop `asked` unless its phase is `live`
   and the RECEIVER take a question only from a live state, and it was verified
   across tabs in a private room. **So either there is a third path that paints
   a question, or the ghost is in the LANE rather than in the question**, and
   `:795-796` already records a lane assert that *"quietly stopped"* once
   before. A cross-tab measurement passing while the thing is still on screen
   means the measurement was not of the reported symptom.

⚠️ **NOTHING HERE IS COMMITTED.** The `onClick` fix, the question fix
and these four sit in one dirty working tree.


### Open 2026-09-25: a stale question appears on `/stage/` while the page is OFF AIR

🔴 **REPORTED WITH A SCREENSHOT AND NEVER WRITTEN DOWN UNTIL NOW**, which
is the defect this file exists to prevent. It lived in `HANDOFF.md` only, so it
was one session away from being lost. The exact words of the report are not
recorded; what is recorded is the picture: `KAS SA OLED TEINUD ÖKOPATTU?` on
screen on a page whose badge reads `OFF AIR`.

⚠️ **WHAT IS KNOWN.** `demo/stage/index.html:67` reads
`const ROOM = Q.get('room') || 'stage-demo'`, a FIXED default, so every manual
probe and every headful open of the page lands in the room a visitor lands in,
and a question asked in one of those probes outlives it.

🔴 **AND THE FIRST EXPLANATION WRITTEN DOWN WAS WRONG, CHECKED
2026-09-25.** `HANDOFF.md` said *"`demo/verify.mjs` gives every other page its
own room per run and this page's default is shared with the public"*, pointing
the next reader at the harness. **The harness is innocent**: `demo/verify.mjs:648`
is `const own = t.room === 'fixed' ? '' : 'room=<name>-test-<hash>'` and `stage`
is not `room: 'fixed'` in `demo/manifest.mjs`, so every suite run has had
`stage-test-<hash>` of its own and has never touched `stage-demo`. The probes did
it. Corrected in `HANDOFF.md` the same day.

⚠️ **THE SHAPE OF THE FIX IS NOT THE ROOM NAME.** A question belongs to
a show and an off-air page has no show, so a visitor arriving at a dead page
should not be shown somebody else's question from hours ago whatever the room is
called. Where the question is persisted and served from is the thing to find.

### Open 2026-09-25: the active tab on `/stage/` has a vertical rule down each side

⚠️ **ASKED WITH A CROP** of `CONTROLROOM` showing a border on the left
and the right of the active tab. The exact words are not recorded and the ask was
never written here until now. Nobody has looked at it.

⚠️ **IT MAY NOT BE THIS PAGE'S TO FIX.** If the rule comes from
`demo/shell/tabs.mjs` or `demo/shell/shell.css` it is shared, it moves every
tabbed page, and it is decided ONCE by the session rather than by whoever is
working `/stage/`. Diagnose, name the file and the rule, say which pages move,
and stop there.


### Done 2026-09-25: `/llhls/` was dark, and the key rotation is what did it

🔴 **ASKED, VERBATIM:** *"lets focus on get llmhls demo properly working. what
should be streaming there for testing?"*

✅ **THE ANSWER TO THE QUESTION IS: NOTHING EXTERNAL, AND NOTHING YOU HAVE TO
START.** `/llhls/` is its own source. Pressing its one control opens a socket to
`wss://pub.positron.studio/watch`, and **that socket IS the reference count**:
holding it wakes the `positron-pub` container, which runs ffmpeg on
`testsrc2` plus a chord with the epoch burned in by `drawtext`, and publishes
over RTMPS to the live input in `demo/shell/live.mjs`. Closing the tab is how
the publisher learns nobody is watching. So there is no OBS to set up, no file
to push, and no other server involved. `rig/push-llhls.sh` exists for pushing
something else in, and is not needed for a test.

🔴 **AND IT WAS BROKEN, BY YESTERDAY'S KEY ROTATION, IN THE ONE PLACE THE
HANDOFF SAID TO LOOK AND THEN LOOKED PAST.** The handoff reads *"the input UID
did not change, so nothing in the repository needed editing"*, which is TRUE and
is the whole trap: the key is not in the repository, it is a Worker secret
(`STREAM_KEY` on `positron-pub`), and rotating the key in Cloudflare without
re-putting that secret leaves the publisher authenticating with a dead value.
MEASURED 2026-09-25, holding the socket for 100 s:
- **The RTMPS leg died every time**, `ffmpeg exit 224`, with
  `error:0A00007F:SSL routines::bad write retry` and `Error writing trailer:
  Broken pipe` out of the flv muxer. It came up (`publishing=true pid=30`), was
  refused, and the 30 s sweep restarted it into the same wall.
- **The input never went live**: `lifecycle` read `status: disconnected`,
  `videoUID: null`, and the manifest answered **204** for the whole run, which
  is Cloudflare saying it has nothing.
- 🔴 **THE WHIP LEG PUBLISHED THE WHOLE TIME, 0 RESTARTS**, on the same
  container, the same ffmpeg, the same network and the same test pattern. **That
  is what makes this a credential fault rather than an encoder fault**: the two
  legs differ in exactly one thing, and it is which secret they carry. `WHIP_URL`
  was not rotated.
- **It worked six hours before the rotation.** `pub.positron.studio/logs` still
  holds a real session from **2026-09-24T13:25Z**: segments loading off video
  UID `d94be5df`, latency about 6 s, `ADV=0.99`, three level switches. The key
  was rotated at **19:08:11Z**. Worked, rotated, dark.

✅ **FIXED 2026-09-25** by putting the current key into the secret, fetched and
piped in one command so it was never printed, never written to a file and never
returned to an agent: `wrangler secret put STREAM_KEY --name positron-pub`.

⚠️ **THE LESSON, AND IT IS NOT ABOUT STREAMING.** A rotation is not done when the
provider accepts it. It is done when **every consumer of that credential has the
new value**, and the consumers are exactly the places a repository cannot see,
which is why they are the places nobody checks. The sentence *"nothing in the
repository needed editing"* was written as reassurance and read as completion.
⚠️ **AND THE SYMPTOM POINTED AWAY FROM THE CAUSE.** A broken pipe out of an FLV
muxer reads as a network fault or a sick encoder, and there is a container in
the path to blame. The thing that settled it in one run was having a SECOND leg
on the same container with a different credential, which is a comparison that
existed for an unrelated reason.

### Open 2026-09-25: `/stage/` lost its loopback, and the gate that replaces it is owed

🔴 **ASKED:** *"go both real leg. we build gate later. taavet (that my friend)
wants demo"*, then *"jusr rm loopback and add note about it somewhere"*. This is
the note.

**WHAT WENT.** `loopback(stream)` built two `RTCPeerConnection`s in the same tab,
wired them to each other, and handed the audience panel the track that came back
out of the second one. It was the DEFAULT, and the real Cloudflare leg was
behind `?live=1`.
✅ **WHY IT WAS RIGHT AND WHY IT HAD TO GO.** It kept the shape of the thing
being tested, a real encode, a real offer and answer, a real `ontrack`, so the
recorder could still take the returned track rather than the canvas. What it
could not do is be the thing somebody was sent a link to see. **A person opening
the page got two peer connections talking to themselves and no Cloudflare at
all**, which is the right default for a harness and the wrong one for a demo.

🔴 **WHAT IT COSTS NOW, AND IT IS OWED RATHER THAN DECIDED AWAY.** `/stage/` is
`built: true`, so it is in every full suite, and every pass now holds a real
Cloudflare live input open. **Stream bills by the minute DELIVERED and buffering
counts.** This was accepted knowingly in the words *"we build gate later"*, so
the debt is recorded here rather than argued about.
⚠️ **AND TWO DEAD BRANCHES WENT WITH IT.** `LIVE` is `const LIVE = true` now, so
`if (!LIVE)` was a guard that could never fire, in two places. A dead guard reads
as finished work and is this project's most expensive defect, so they were
deleted rather than left looking like a fallback.

⚠️ **WHAT THE GATE HAS TO BE, WHEN IT IS BUILT.** Not a return to loopback as the
default: the lesson above is that the default is what a visitor meets. It is a
limit on WHO and HOW LONG. The harness is the easy half, because `SELFCHECK` is a
flag a person never has. The visitor half is the real question and it is not
answered here.

### Open 2026-09-25: the control room UI is DONE and 14 asserts are one timing cascade

✅ **SHIPPED.** One bar in the control room: `START HLS` and `START WEBRTC` on
the left, the timers and `PLAY RECORDING` on the right, no play glyph, one
timeline, one diagram. Each transport button is its own stop and says so. The
publisher wake now says `starting` on the badge, because it is about twenty
seconds of nothing and silence reads as broken.

🔴 **AND IT IS 33/47, WITH ALL FOURTEEN FAILURES DOWNSTREAM OF ONE.** The page's
own check polls for `phase === 'live'` after pressing, and the start does not
land inside the window, so every assert about a running show, its recorder, its
archive and its strip follows it red. **The show DOES start**: the stop assert a
few lines later reads *"the page is live and the button reads STOP WEBRTC"*,
which is the same run contradicting the assert above it.
✅ **AND IT IS PROVEN WORKING IN A REAL BROWSER**, which is the thing that
matters: probed headful against the local page, `pc connecting` at 27.6 s,
`pc connected` at 27.9 s, `picture 1280x720`, recorder started. Headless is the
same, connecting at 38.4 s and live at 40.2 s.

🔴 **THE CONSTRAINT IS STRUCTURAL AND IS NOT A NUMBER TO TUNE.** This page HOLDS
its asserts and flushes them only when `checks()` returns, so every second spent
waiting inside it delays all 37. Widening the poll to 28 s, 45 s and 80 s were
all tried: at 28 s and beyond the flush moves past the harness's patience and
the page reports **2 asserts instead of 37** while the suite reads a confident
**12/12 green**. So the wait cannot be long enough for a cold container AND
short enough to report.
⚠️ `settleMs` was raised from 25000 to 75000, which is what `/webrtc/` uses,
and it is not sufficient on its own: `demo/verify.mjs` caps the first-assert
budget at `FIRST_ASSERT_CEIL = 30000` regardless.

✅ **THE FIX IS TO GRADE THE HLS LEG INSTEAD, AND IT IS THE RIGHT ONE ANYWAY.**
LL-HLS comes up in a couple of seconds where WebRTC needs a container wake, it
is what a harness can carry, and it exercises the SAME recorder, archive and
strip. The check block should press `START HLS` rather than `START WEBRTC`.
That is a restructure of the check, not a patch, and it is the next thing.

### Open 2026-09-25: WHEP MEDIA DOES NOT FLOW FROM THIS MACHINE, AND IT IS NOT THE CODE

🔴 **MEASURED WITH NO POSITRON PAGE INVOLVED, IN A REAL HEADFUL CHROME, AGAINST
THE LIVE INPUT.** A bare `RTCPeerConnection`, two recvonly transceivers, the
WHEP POST, nothing else:

    status         201        Cloudflare accepted the offer and answered
    connection     failed
    ice            disconnected
    states         connecting -> failed
    framesDecoded  0
    bytesReceived  0

**The signalling works and the media path does not.** This is a fact about the
network this machine is on, not about `/stage/`, not about the harness, and not
about headless Chrome, all three of which were blamed in turn today.

⚠️ **SO EVERY WebRTC FAILURE ON `/stage/` IS DOWNSTREAM OF THIS**, and no amount
of page work will move them from here. The same is true of `/webrtc/`, whose own
checks have therefore never run on this desk.
✅ **AND LL-HLS IS UNAFFECTED**, which is measured: `llhls` reads 12/12 against
the deploy. The HLS transport is the one that works from anywhere, which is an
argument for it beyond latency.
🔴 **WHAT IS NOT KNOWN IS WHETHER IT WORKS FOR A VISITOR ELSEWHERE**, and
nothing here can answer that. **Do not report `/stage/` as working or as broken
on the strength of a run from this laptop.** The cheap test is somebody on
another network opening it, or a phone on mobile data.
⚠️ **AND THE DAY'S REAL LESSON IS ABOUT THE CONTROL, NOT THE NETWORK.**
`/webrtc/` was used for hours as proof that WHEP worked, on the strength of an
8/8 that contained **two** page asserts, both of them the shell's. A green page
with no coverage is the worst possible control, and the assert count said so the
whole time.

### Open 2026-09-25: `/webrtc/` has been GREEN WITH ZERO COVERAGE, and WHEP does not connect here at all

🔴 **`node demo/verify.mjs webrtc` READS 8/8 GREEN AND THE PAGE'S OWN CHECKS
HAVE NEVER RUN.** MEASURED 2026-09-25: `page asserted something · 2`, and those
two are the SHELL's feedback-button asserts. Every claim that page makes about
WebRTC sits behind `await d.run('check')`, which is the last line of a `for`
loop that `return`s on success, so it is reached only after a connection that
never happens. **Six of its eight greens are the shell's, and the page
contributes none.**

🔴 **BECAUSE WHEP DOES NOT CONNECT IN THIS HEADLESS CHROME, FOR ANY PAGE.**
Probed directly on `/stage/` with the page's own log: the WHIP leg confirmed
publishing in 0.1 s, `pc connecting` at 2.2 s, and the connection then sits in
`connecting` until it times out, `pc failed` at about 17 s. Four attempts with
the connection state judged explicitly, rather than on whether `whepPlay` threw:
all four reached `connecting` and none reached `connected`.
⚠️ **SO NINE OF `/stage/`'s TWELVE FAILURES ARE THE ENVIRONMENT, NOT THE PAGE**,
and every hour spent "fixing" the page against them was spent against a wall.

🔴 **AND THE COMPARISON THAT SENT ME THERE WAS THE FAULT.** `/webrtc/` was used
all afternoon as the control, on the reasoning that it reads 8/8 against the
SAME input in the SAME browser, so WHEP must work and `/stage/` must be doing
something different. **A green page with no coverage is the worst possible
control**, and this project already knows the shape: a green suite can mean zero
coverage, and only the assert COUNT says so. The count was there to read the
whole time.

**WHAT IS ACTUALLY OWED:**
1. **`/webrtc/` has to report that it could not connect** rather than passing.
   A page that cannot reach its subject says so, the way `caps.mjs` un-links a
   row WITH THE REASON IN WORDS.
2. **`/stage/`'s show-dependent asserts need a leg the harness can carry.**
   LL-HLS works headless (`llhls` is 12/12), so the checks should drive the HLS
   transport and grade the same recorder, archive and strip behaviour through
   it. That is a restructure of the check block, not a patch.
3. **Whether WHEP connects from a REAL browser here is unmeasured.** Nothing in
   this session opened one. It may well be fine for a visitor, and that is the
   first thing to establish before anybody treats `/stage/` as broken.

### Open 2026-09-25: `/stage/` is DEPLOYED AT 37/49 and its WebRTC start fails cold

🔴 **THE LIVE PAGE IS NOT GREEN AND I REPORTED THAT IT WAS.** MEASURED cold on
2026-09-25 against the deployed commit: **37/49**, the show never reaches
`live`, and twelve asserts downstream of a running show are red.

🔴 **THE 49/49 I SHIPPED IT ON WAS A MEASUREMENT OF A WARM CONTAINER.** The
pure-receiver change was verified minutes after runs that had already woken
`positron-pub`, so its WHIP leg was publishing before the page ever asked.
**A green run against a warm dependency is a measurement of the warmth**, which
is this repository's own A/B rule arriving through STATE rather than through
code, and nothing in the output said which it was.

**WHAT IS ACTUALLY WRONG, as far as it was narrowed:**
1. **A receiver has no wait.** Holding the socket only ASKS the container to
   wake; its WHIP leg takes seconds to reach Cloudflare and a WHEP subscribe
   against an idle input answers 409. Adding a short retry did NOT fix it.
2. **`dropTransport()` closed the publisher hold**, dropping the container's
   viewer count to zero and stopping its legs, immediately before asking it to
   wake again. Keeping the hold across a switch did NOT fix it either.
⚠️ **BOTH WERE TRIED AND REVERTED**, because neither moved 37/49. So the cause
is a third thing and is not yet known.

⚠️ **AND THE CONSOLIDATION IS STILL NOT DONE** (one bar, starts left, timers and
PLAY RECORDING right, no play glyph, one timeline, one diagram, no
`Nothing recorded yet` card). Five attempts, five distinct causes:
`paintPlayRec` in a temporal dead zone; `toggleTransport` lost to an earlier
revert; **`right` takes DOM ELEMENTS and `extras` takes descriptors**
(`transport-bar.mjs:594` does `right[0].dataset.end = '1'`); `settleMs` landing
only on the FIRST PRESSED control; and a latch held across the container wake.
🔴 **THE ONE WORTH KEEPING IS HOW THE FAILURES HID.** `checks()` HOLDS its
asserts and flushes them at the end, and it is async and called WITHOUT `await`
(`const warm = () => { if (++warmed >= 6) checks(); ... }`). **So any throw
anywhere inside it loses all 37 silently, as an unhandled rejection the harness
does not classify as a console error**, and the suite reports a confident
**12/12 green**. That is the worst shape this project names, and it is built
into the page.
✅ **THE COUNT IS THE ONLY THING THAT CAUGHT IT**, every time.

### Open 2026-09-25: `/stage/`'s control room has two ways to start and it confuses

🔴 **ASKED, VERBATIM:** *"double play and start in stage control room is
confusing. make just start primary button (or Start HLS | Start WebRTC?) and rm
play button under video. measure"*

Two controls that both look like "begin": the page's own start, and a `play`
button under the video. Proposed shape is ONE primary control, and the
parenthesis in the ask is the real question: a single `Start`, or a choice of
`Start HLS` / `Start WebRTC`. ⚠️ **THE CHOICE READING IS THE ONE THAT FITS
WHERE THIS IS GOING**, because the transport decision was settled the same day
as ONE per show (*"no 2 transports in same time"*), and a control that names the
transport is that decision made visible instead of hidden in a query parameter.

🔴 **AND "measure" IS THE HALF THAT MAKES THIS NOT A COSMETIC CHANGE.**
`CLAUDE.md`'s rule: adding or removing a control moves every other control's
harness press, so the thing to look at is the per-page assert count before
against after. `/stage/` carries `settleMs: 25000` in `demo/manifest.mjs`, so it
is one of the slower pages to verify and the run should be `node demo/verify.mjs
stage` alone rather than any suite.
⚠️ **AND A DELETED CONTROL CAN TAKE AN ASSERT'S MEANING WITH IT.** The `/fau/`
compile button did exactly that on 2026-09-24: three asserts were reading
`d.button('compile').disabled` as evidence of power state, and deleting the
conjunct was coverage lost at a count that did not move. Check what the `play`
button's presses were standing in for before removing it.
⚠️ **AND THE PROSE MOVES IN THE SAME COMMIT.** `what` on the page and `one` in
`demo/manifest.mjs` both describe *"two presses, one for the picture and one for
the show"*, which is exactly the thing being removed.

### Open 2026-09-25: the native reload rate limit does not exist, and two files say it does

🔴 **FOUND while answering the config question, not looked for.**
`src/low-latency-player.js:564` reads `if (since < cfg.nativeReloadCooldownMs)
return;` and **`nativeReloadCooldownMs` is defined NOWHERE**. Not in `DEFAULTS`
(lines 103 to 235, 23 keys, it is not among them), not in any caller. MEASURED by
grep across the repository: the identifier appears **twice**, and both are that
same line, in `src/low-latency-player.js` and its byte-identical deployed copy
under `workers/view/public/`. **`since < undefined` is `false`**, so the guard
never returns and every native reload goes straight through.

🔴 **THE POINT IS NOT THE MISSING LINE, IT IS THAT TWO PLACES CLAIM THE GUARD
WORKS.** The function's own comment says it is *"rate limited, because a reload
storm is worse than a stall"*, and `positron-streaming` says **"Native HLS gives
one lever and it is a reload, so rate limit it"**. The same skill records that
**rebuild storms were the direct cause of the v4 tab crash**. So a defence that
was designed, commented, and written down in a skill is inert in the shipped
file, and every reader of either sentence believes it is there. ⚠️ **AN
UNDEFINED CONSTANT IS THE QUIETEST POSSIBLE FAILURE IN JAVASCRIPT**: no throw, no
warning, and a comparison that silently decides the safe branch is the one never
taken.

⚠️ **WHAT IS NOT KNOWN, AND WHY THIS IS NOT A ONE-LINE FIX YET.**
1. **The number has to be chosen rather than guessed.** The hls.js path next door
   uses `rebuildCooldown: 4000` with a 3,000 ms trigger gap. A native reload is
   heavier: it tears the element down and refetches. `sourceStallTimeout` is
   12000 and `stallTimeout` is 6000, so anything at or under 6 s risks reloading
   inside a stall the watchdog is still measuring.
2. 🔴 **NOTHING IN THIS REPOSITORY CAN TEST IT.** The native path is WebKit only,
   `verify.mjs` drives headless Chrome and never takes that branch, and
   `verify-native.mjs` needs a real iPhone. This is the exact class the file's
   own comment records: *"local verify could not catch it because desktop Safari
   never takes that branch"*, arriving one layer along.
3. **What bounds it today is accident, not design.** The source watchdog resets
   `nativeEdgeMoved` before calling, which re-arms a 12 s timer, and the other
   two triggers are element events. So the storm is unlikely rather than
   prevented, which is a different claim from the one being made.

**The fix is one key in `DEFAULTS` beside `rebuildCooldown`, plus a number with a
reason on it, plus a run of `verify-native.mjs` on a phone before anybody says it
is rate limited again.** NOT done in this session: `src/` is deployed and the
verification path needs a device that is not here.

### Done 2026-09-25: a new user gets the hls.js config, and ours is stock and wrapped

🔴 **ASKED, VERBATIM:** *"want tom make sure when new user works with llhls it
will get the hls.js optimizations / "right config" we have done. do our llhls
demo work on "right config" or patched hls.js?"*

Two questions in one, and the second decides the first.
1. **Is `hls.min.js` in this repository stock or patched?** `demo/llhls/index.html`
   loads `/proto/remixer/hls.min.js`, a VENDORED copy rather than a CDN URL, and
   a vendored minified bundle is exactly the shape that can carry an edit nobody
   records. `proto/flipper/hls.min.js` is a second copy. Settle it by comparing
   both against the official dist of the same version, not by reading them.
2. **Whatever the answer, the config has to travel.** `src/low-latency-player.js`
   (v14) is where the measured knobs live and `positron-streaming` already
   carries the reasons. `positron-start` does NOT point at either, so somebody
   standing up a site of their own gets hls.js defaults, which the skill says in
   measured terms are wrong in three directions at once: `maxLiveSyncPlaybackRate`
   1 and `maxLatency` Infinity park the player at whatever latency the startup
   hiccup gave it (7.6 s one run, 15.4 s the next, same stream same config), and
   `startFragPrefetch` false, `initialLiveManifestSize` 1 and
   `startOnSegmentBoundary` false all push against a low-latency live start.

✅ **BOTH HALVES ANSWERED 2026-09-25, AND THE ANSWER TO THE SECOND QUESTION IS
STOCK.** MEASURED: `proto/remixer/hls.min.js` and `proto/flipper/hls.min.js` are
byte identical to each other AND to the official hls.js 1.7.1 dist from npm,
**618,156 bytes, sha256 `6cfad701a61fb8a99add5e84449e64661169b0652bf44ceb2a28465c8817b5f1`**.
**Nothing is patched.** What makes LL-HLS work here is `src/low-latency-player.js`,
a WRAPPER, which is why it transfers at all: somebody can upgrade hls.js from npm
for ever with no patch to re-apply.
⚠️ **AND IT WAS NOT ATTRIBUTED.** hls.js is **Apache-2.0**, vendored twice, on a
repository that went public yesterday, and it was absent from `NOTICE.md`. A row
was added. Noticed only because the question forced an audit of the bundle.

🔴 **ASKED AS A FOLLOW-UP, VERBATIM:** *"can we not use it without wrapper just
"right config""*. **Partly, and the split is measured.** The `new Hls({...})`
literal is lines 401 to 461 of 1,070, holding **17 key lines**, which is **1.6
per cent of the file** and 3.1 per cent of its 546 code lines. The other 98 per
cent is what happens after something goes wrong, and **none of it has an hls.js
option behind it**: the native-WebKit path (~189 lines), the advance-ratio cap,
the drift-seek governor, the starved watchdog that must not seek over an
audio-only shortfall, destroy-and-rebuild on a fatal `manifestParsingError`, the
PDT wall-latency fallback, and twenty more, each with its line range and its
failure written down in `positron-streaming`.
✅ **THREE OF THE SIXTEEN PASTE-ABLE KEYS ARE NO-OPS** against 1.7.1 defaults
(`lowLatencyMode`, `levelLoadingMaxRetry`, `levelLoadingRetryDelay`), which
nothing had said before. **Thirteen move something.**
🔴 **AND THE `xxxLoading*` KEYS ARE DEPRECATED SHIMS IN 1.7.1 THAT LOG A
WARNING**, rewritten internally into `manifestLoadPolicy` / `playlistLoadPolicy`
/ `fragLoadPolicy`. They work today and they are **the first thing that breaks on
an hls.js upgrade**, which is a live maintenance fact about a file nobody has
moved off them.
⚠️ **`maxLatency` IS NOT A CONFIG KEY**, it is a getter off
`liveMaxLatencyDurationCount` (default Infinity). ⚠️ And `liveSyncDuration`
must not be paired with `liveSyncDurationCount`: hls.js throws
`Illegal hls.js config: don't mix up`.

**WRITTEN INTO:** `.claude/skills/positron-streaming/SKILL.md` (+266, the
reference copy with every measurement), and `.claude/skills/positron-start/SKILL.md`
(+64 in Step 4b, plain register, the paste-able object plus what it does and does
not buy and when to take the whole file instead).

### Done 2026-09-25: the rotate-keys claim was stale in three files, on a public repo

🔴 **ASKED, VERBATIM:** *"rm stale rotate keys stuff"*

`HANDOFF.md` records `positron-demo`'s RTMPS key as ROTATED at
2026-09-24T19:08:11Z with the input UID unchanged, and says the `rotate_keys`
endpoint has existed since 2026-07-31. Four lines in three files still said
otherwise, on a repository anybody can now read.

✅ **DONE 2026-09-25, ALL FOUR.** `research/SECRETS-ROTATION.md`: the heading
`RTMPS key still owed`, the `exposed and NOT yet rotated` paragraph, and the
`There is no rotate-key API for a Cloudflare live input` claim under it.
`BACKLOG.md` twice and `LAYOUT.md` once, both of which had copied the
delete-and-recreate ripple out of that third sentence.
🔴 **AND THE WRONG SENTENCE IS THE PART WORTH KEEPING, SO IT WAS CORRECTED
RATHER THAN DELETED.** `POST /stream/live_inputs/<uid>/rotate_keys` has existed
since 2026-07-31 and rotates IN PLACE, leaving the input UID alone, so nothing
in the repository needed editing. The file had said rotating meant DELETE AND
RECREATE with a new UID rippling through `demo/shell/live.mjs`, `workers/pub`'s
container and every demo that plays it. **That made a one-command fix read as a
scoped refactor, so a live exposed credential sat unrotated for two weeks.** The
cost of this class of staleness is usually a wasted lookup; here it was an open
credential, which is why the correction says so in the file rather than quietly
swapping the tense.
⚠️ **NOT RE-MEASURED TODAY.** The rotation is taken from `HANDOFF.md`'s
timestamp rather than from the API, deliberately: the way to confirm a live
input's key from here is to fetch the key, which is the exact call
(`GetStreamServiceSettings`, in clear) that caused the original exposure.

### Open 2026-09-24: more embedded knowledge into skills, and the .md files tidied

🔴 **ASKED:** *"add more of this embedded knowledge to skills. clean up .md
files"*, after *"the key is to use cf services in coherent composing way as
positron does"*.

✅ **THE COMPOSITION ITSELF IS DONE** and is in `positron-start` as eleven
numbered rules, measured rather than asserted: one Worker per capability, a
Durable Object that is both the room and the database, R2 as the archive tier
against Stream as the live tier, the browser doing the work the platform should
not, nothing opening on a visit, one list read by every renderer, a build that
enumerates, a deploy interlocked with verification, a handle on every page, a
build stamp in every device log, and an alarm rather than a poll.

⚠️ **WHAT IS STILL OPEN IS THE SWEEP, AND IT NEEDS SCOPING RATHER THAN
GUESSING.** Two halves:
1. **More embedded knowledge out of the pages and into the skills.** The
   candidates are the long red comment blocks in `demo/*/index.html` and
   `demo/shell/*.mjs` that are true of every task rather than of one page. The
   rule for moving one is already written in `CLAUDE.md`: move it VERBATIM, and
   leave its trigger behind in the table, because a rule nobody knows to load is
   a rule that is gone.
2. ✅ **The root `.md` files. DONE 2026-09-24.** The repository is public now and
   a stranger saw twelve of them at the top level. `README.md`, `AGENTS.md`,
   `LICENSE`, `NOTICE.md` and `CLAUDE.md` are the front door, and `HANDOFF.md`,
   `BACKLOG.md`, `LESSONS.md`, `PROGRESS.md`, `LAYOUT.md` and `SUMMARY.md` stay
   at the root with them, because they are named in `CLAUDE.md`'s own table and
   carry **291 references** between them. Two files moved with `git mv`:
   `research/measured-devices-2026-09-20.md`, a dated measurement that belongs
   with the research, **27** references rewritten in **17** files, and
   `research/SECRETS-ROTATION.md`, **7** in **6**. `LAYOUT.md` now records both
   moves and the reasoning.
   🔴 **AND THE MOVE WAS NOT THE FIX FOR THE KEY.** The repository is public and
   the file is already in git history, so it is still readable at its old path
   by anyone who clones. ✅ **THE KEY ITSELF IS ROTATED, 2026-09-24T19:08:11Z**,
   through `POST /stream/live_inputs/<uid>/rotate_keys`, which rotates in place
   and did NOT change the input UID, so `demo/shell/live.mjs`, `workers/pub` and
   every demo that plays it needed no edit. The delete-and-recreate ripple this
   line used to describe came from a wrong sentence in
   `research/SECRETS-ROTATION.md`, corrected 2026-09-25.
⚠️ **NOTHING HERE IS A DELETION.** `LAYOUT.md` decides where a file goes and
this is a `LAYOUT.md` question; the plans move of 2026-09-20 is the precedent,
and it cost 129 files holding a path by name.

### Open 2026-09-24: the repo goes public, and a README somebody can paste

🔴 **ASKED, VERBATIM, ACROSS FIVE MESSAGES:** *"make repo public. add to
readme a prompt how one can replicate similar setup with cf
https://developers.cloudflare.com/agent-setup/prompt.md etc. they should be able
to just paste repo url. a (meta?) skill next to it?"*, *"example: i want build
something like that stage demo"*, *"add gates: cf account? wranger? node? detect
envitonment. osx mostly. cf auth / tokens? paid nonpaid?"*, *"nondeveloper might
use it"*, *"explain why havin domain is prefeered"*, *"do it now"*

1. **A `README.md`, which this repo has never had.** `ls README*` finds nothing
   at the root. It is the file a stranger opens first and the only one written
   for somebody who does not work here.
2. **A prompt in it that a person can paste**, with nothing but this repo's URL,
   into Claude Code or another agent, and get a positron-shaped site of their
   own on Cloudflare. It hands off to Cloudflare's own
   `https://developers.cloudflare.com/agent-setup/prompt.md`, which is a system
   prompt that tells an agent to install the Cloudflare plugin and MCP servers
   ITSELF rather than asking the reader to run anything.
3. **A skill beside it**, so the instructions travel with the checkout:
   `.claude/skills/` is picked up by Claude Code in any clone.
4. **Gates, checked before anything is created**: an operating system (macOS
   mostly), node, wrangler, a Cloudflare account, whether that account is
   authenticated, and **whether it is a paid plan**, because some of what this
   repo uses is not on the free one.
5. **Written for a non-developer.** That is the constraint that decides the
   whole shape: every gate says what to do when the answer is no, and nothing
   assumes a terminal habit.
6. **Why a custom domain is preferred**, explained rather than asserted.

🔴 **AND THE AUDIT FOUND ONE THING THAT MUST NOT BE PUBLISHED, SO THE REPO IS
NOT FLIPPED IN THE SAME BREATH AS THE REST.** `New Pack.circuitpack` is
**reachable in history at `419ec5c`, 3,506,555 bytes**, verified with
`git cat-file -s`. CLAUDE.md says what it is in red: a complete backup of the
Novation Circuit on this desk, **29 sessions of somebody's real work**, their
ONLY copy since `tmp/` stopped being tracked, and the owner's words about it are
*"user sessions are mine. very important"*. A public repository hands that file
to anyone who clones it, and a clone cannot be recalled.
⚠️ **AND THE SAME BLOB IS CURRENTLY A BACKUP**, which is the bind. CLAUDE.md
names `git show 419ec5c:'New Pack.circuitpack'` as the recovery path, so a
history rewrite that drops it destroys the second copy at the same moment it
protects it. **The order is: copy the blob out to disk, verify 3,506,555 bytes,
THEN rewrite.**
🔴 **AND A SECOND ONE THE AUDIT FOUND THAT NOBODY WAS LOOKING FOR: TWO CHROME
USER PROFILES ARE IN HISTORY.** **857 files** under
`rig/moq/spike/logs/moq-4k-probe-udd/` and `.../moq-safari-pub-udd/`, added by
three commits (`469d237`, `880ceb8`, `d3f0cd0`), including `Default/Cookies`,
`Default/Login Data`, `Default/History`, `Default/Web Data`, `Default/Trust
Tokens` and `Local State`. **None of them is at HEAD** (`*-udd/` is gitignored
now), so this is history only, and history is what a clone gets. They are also
most of the repository's **191 MB**.
⚠️ Smaller findings, none of them a stop: `rig/moq/mtx/moq-key.pem` is a
committed PRIVATE KEY (a self-signed local cert for `moq-mtx-local`, so the
exposure is nil, but a scanner will flag it and it should not be in a public
tree); `research/SECRETS-ROTATION.md` publishes a map of past exposures, one of which it
said was still unrotated (`positron-demo`'s RTMPS key, ROTATED since, on
2026-09-24) and one in another repo it calls *"still public"*; there is **no LICENSE file**, so publishing
leaves everything all rights reserved by default; and the commits carry a WORK
email address on a personal repository.

✅ **EVERYTHING EXCEPT THE FLIP IS DONE 2026-09-24.**
- **`README.md`**, 142 lines, the first one this repo has had. It carries the
  paste block, the gate table in plain words, what is free and what is not with
  the numbers, why a domain is preferred in four reasons, and a map of the
  directories.
- **`.claude/skills/positron-start/SKILL.md`**, 240 lines, six gates and a
  worked decomposition of `/stage/` into the parts that are free and the one
  part that is not. Claude Code registered it on write, which is the proof it is
  discoverable in a clone.
- 🔴 **IT WORKS FOR CODEX TOO BECAUSE THE PASTE BLOCK NAMES THE PATH.** Asked
  as *"should work in claude and codex"*. Claude Code discovers
  `.claude/skills/` by itself; every other agent is told to read
  `positron/.claude/skills/positron-start/SKILL.md`. **One file, two doors**, so
  the two cannot drift apart, and the skill carries a line forbidding anything
  in it that depends on one agent's features.
- **The plan facts were re-read rather than remembered**, off Cloudflare's own
  pricing pages on 2026-09-24: Durable Objects ARE on the free plan (SQLite
  backend only), R2 free tier is 10 GB with free egress, **Stream has no free
  tier** ($5/1,000 minutes stored prepaid, $1/1,000 delivered) and
  **Containers are Workers Paid only**. So the honest answer to *"do I have to
  pay"* is no for most of the site and yes for live video.

### Done 2026-09-24: the title counts itself, and `instruments` changes hands

🔴 **ASKED, VERBATIM, TWO MESSAGES:** *"convert title to // positron: x media
art experiments // where x is num of demos in frontpage. html <title> stays
positron. deploy"*, then *"rename hardware to instruments, move knobs able
grains there. looper instrument  jam moves to ithers (timeline or messfgs or )"*

1. **The front page's `h1` carries the count.** `indexTitle()` in
   `demo/manifest.mjs`, counted off `byGroup()` rather than `DEMOS.length`,
   because the question is how many rows the PAGE shows: 58 against 59 in the
   array, `feedback` being `unlisted`. Baked by `workers/view/build.mjs` into a
   `<!--TITLE-->` marker in `menu.html` and set at load by `demo/index.html`,
   which is the same one-renderer-two-callers arrangement the rows already use.
2. **The tab stays `positron`.** Both index pages carried
   `<title>positron: media art experiments</title>`, so this is a change and not
   a no-op, and it is what the instruction says in words.
3. **`hardware` becomes `instruments`** and takes `knobs`, `able` and `grains`.
   ⚠️ That reverses the last line of the comment that created `hardware` on
   2026-09-21, which named those three as arguable and said they *"stay where
   they are rather than being swept in on an inference"*. This is not an
   inference, so the comment records the instruction instead.
4. **`looper`, `instrument` and `jam` leave**, which empties the old
   `instruments` group and frees the name for 3.

✅ **ALL FOUR DONE AND DEPLOYED 2026-09-24**, BUILD `e0158ba-130642-c980`,
version `069d9872-2d9c-422e-ac55-4f4cad16feff`. Read back off the live page
rather than off the build: `<title>positron</title>`, the `h1` reads
`positron: 58 media art experiments`, **58 cards**, **11 sections**
(`TH` `err` `instruments` `u:` `kurenniemi` `capture` `timeline` `streaming`
`messages` `technologies` `kit`).

✅ **MEASURED AT THREE WIDTHS BEFORE DEPLOYING**, because a longer name sits in
a flex row beside the Feedback button: 390 px wraps the name to TWO lines (h1
270 px, the button at x=296) and 756 and 1280 keep it on one. **Page overflow
0 px at all three**, which is the number that would have said this was a fault.

✅ **WHERE THE THREE WENT, AND ONE OF THEM IS ARGUABLE.** `jam` and `instrument`
to `messages`, `looper` to `technologies`. ⚠️ `instrument` breaks the wording
this file shipped an hour earlier, *"a relay carrying messages with no media in
it at all"*: the far machine's audio comes back over the same connection. It is
in `messages` because its readout is two LATENCIES and the audio is what makes a
late message audible, and `manifest.mjs` names it as the arguable row rather
than hiding it.

✅ **AND `stage` JOINED `TH` 2026-09-24** on *"move stage to th"*, out of
`capture`: it puts a church scene from a 2011 MIMproject performance in front of
an audience, so it sits beside `making`, that project's archive. 🔴 **THE GROUP
ID WENT `xr` -> `th` WITH IT**, because three of its six rows now have nothing to
do with a headset and the key was about to teach the next reader something
false. ⚠️ The `xr: true` FLAG on a row is a different thing and did not move:
`caps.mjs` reads it to offer a headset page, and `mirror`, `weight` and `floor`
still carry it, `floor` from another section entirely. Built at
`e0158ba-132955-eba3`, NOT deployed.

✅ **`workers/view/verify.mjs`'s TITLE ASSERT WAS ALREADY RED AND NOW IS NOT.**
It expected `POSITRON` while the tab read `positron: media art experiments`.
⚠️ **THAT FILE HAS OTHER STALE ASSERTS AND THEY WERE LEFT ALONE**: it counts
`li.pos-row` against `DEMOS.length + NOTES.length`, and the front page has drawn
`.pos-card` for weeks. It needs a real look rather than a line.

### Done 2026-09-24: the front page regrouped, and three demos retired

🔴 **ASKED, VERBATIM, IN ONE MESSAGE:** *"arvhice memento blocks and num demo.
move headset group first in index. rename to "TH". second group err, move floor
to err and the one what had err audio and video side by side. move making to TH.
rename vain to u:, move clic and vclick there. rname cvlick demo do ound. move
typist to th. timeline: leave ones who have timeline component. the rest merge
with technologies and split onto streamig (who steam smth) and messages (relyng
messages etc but not streaming) and rest is techologeis. show dev link asap"*

Every line below is one line of that, and almost all of it lands in ONE file,
`demo/manifest.mjs`: the `DEMOS` rows' `group`, and the `GROUPS` map that
decides both the order of the sections and what they are called. Two index
renderers read it (`demo/index.html` and `workers/view/build.mjs`), so there is
nothing to change in either.

1. **Archive `memento`, `blocks` and `num`.** `archive/demos/README.md` has the
   procedure: `git mv demo/<slug>/index.html archive/demos/<slug>-index.html`,
   drop the row from `demo/manifest.mjs`, write the section saying what it was.
   Each of the three is a single `index.html` with no other file beside it.
   ⚠️ All three are quoted by live code as the page that proved something:
   `/blocks/` by `xr-quit.mjs`, `xr-panel.mjs`, `xr-hands.mjs`, `seed.mjs`,
   `weight` and `tom`; `/num/` by `keyboard.mjs`, `numloop.mjs` and `nola`;
   `/memento/` by `cc-adapter.mjs` and `timeline/media-master.mjs`. Those are
   HISTORY and stay, but a live `href` to any of the three would now 404 the way
   `/kit/`'s card did after the `held` rename.
2. **Headset group first, renamed `TH`.** `GROUPS` order, `['xr', 'headset']`.
3. **A second group, `err`**, holding `floor` and `reel`.
   🔴 **THE FIRST ANSWER WAS `flipper` AND IT WAS WRONG.** `flipper` is the
   only page in the repository that holds ERR television and ERR radio at once,
   so a grep for `icecast.err.ee` beside a `<video>` finds exactly it and nothing
   else, and that is what I reported. Corrected in one line: *"it was not
   flipper"*, then *"what is demo where we had err video + radio (synced on not)
   and timeline?"*. It is `reel`, and the page says so at the top of its own
   stylesheet: *"ONE COLUMN PER MEDIUM: the newsreel on the left, the radio on
   the right"*, two lanes on one line, a day usually bringing a newsreel AND a
   radio programme. ⚠️ The lesson is that the search was for the SOURCE
   (a live ERR mount) when the ask was about the LAYOUT (two media side by side),
   and `reel` plays the archive rather than the live mounts, so it could not
   match. `flipper` stays where it is, `now` was not named either.
   🔴 **AND THIS REVERSES A 2026-09-16 INSTRUCTION THAT IS WRITTEN INTO
   `manifest.mjs` IN RED**: *"hide the ERR archive from frontpage"* and *"no err
   refs"*, said the evening ERR reported our connections corrupting their
   listener statistics. The pages never moved; the SECTION NAME did. Putting the
   name back is the thing that was deliberately removed, so the comment block
   above `GROUPS` has to record the reversal rather than be deleted.
4. **`making` to `TH`**, which empties the `mim` group.
5. **`vain` renamed `u:`**, with `click` and `vclick` moved into it.
6. **`vclick` renamed.** Slug rename, so directory + URL + every reference, the
   `radio1965` -> `radio` shape. The target name was not legible in the message.
7. **`typist` to `TH`.**
8. **`timeline` keeps the rows that have a timeline component; the rest merge
   into `technologies`, which then splits three ways**: `streaming` (streams
   something), `messages` (relays messages but does not stream), `technologies`
   (the rest).
   ⚠️ MEASURED before assuming: ALL NINE rows now in `timeline` call
   `createStripView` from `demo/shell/strip.mjs`, and after `click`, `vclick`
   and `typist` leave, the six that remain (`transport`, `lanes`, `loops`,
   `score`, `strip`, `draw`) all still do. So on the component test nothing
   merges, and the split of `transports` is the only part that moves.
9. **Dev link first.**

✅ **ALL NINE DONE 2026-09-24.** The front page is **12 sections over 58 listed
rows** (59 in `DEMOS`, `feedback` is `unlisted`), in the asked order:
`TH` `err` `hardware` `u:` `kurenniemi` `instruments` `capture` `timeline`
`streaming` `messages` `technologies` `kit`.

✅ **THE TWO AMBIGUOUS ASKS WERE ASKED ABOUT RATHER THAN GUESSED.** *"do ound"*
is `sound`, and the timeline split is the four pages whose SUBJECT is the
timeline. The measurement is why the second one had to be asked: the component
test separated nothing, because all nine rows mounted a strip.

✅ **`vclick` -> `sound`**, directory and URL and identity strings, plus
`manifest.mjs`, `shell/stack.mjs`, `shell.css`, `timeline/strip.mjs`,
`timeline/csound.mjs`, `timeline/lab/csound-test.mjs`, `workers/view/build.mjs`,
five plans, one research note and `positron-verify`. **`tarmoj/vclick` did NOT
move**: it is U:'s own repository, named in four files, and renaming it would
have pointed all four at nothing. MEASURED after: `node demo/verify.mjs sound`
is **23/23 with 11 page asserts**.

✅ **THREE PAGES ARCHIVED** to `archive/demos/<slug>-index.html` with a section
each in that README, and two claims they were carrying were repaired rather than
left to rot: `demo/weight/index.html` said `/blocks/` already graded the quit
badge the same way on load (it was weight's second opinion and is now its only
one), and `demo/tom/index.html` named `/blocks/` as the other `readout: null`
page, where twenty pages do that. `demo/verify-quest.mjs`'s usage example named
the slug too.

✅ **`CLAUDE.md` RECOUNTED** rather than remembered: **59 rows, 57 shelled**, and
`positron-history` had drifted to `54 of 56` and carries the rename now.

⚠️ **WHAT WAS NOT DONE, AND IT IS NOT FORGOTTEN:** nothing is deployed. The
build ran (`stamp e0158ba-120343-75bb`) so `workers/view/public/` matches, and
`positron.studio` still serves the old front page until somebody deploys.

### Open 2026-09-24: `/fau/`'s second round, and four wrong answers before the right one

🔴 **ASKED, VERBATIM, ACROSS SIX MESSAGES:** *"double border, rm"* with a crop,
*"add padding under nameplate"*, *"you ui skills are pathetic"*, *"its just
nonrounded bonbordered texateea between 2 glues"*, *"fau on off is missing
border"*, *"still double bottom border on fau textarea"*, *"add more left padding
to textarea in fau"*, *"can you have comments in fau file what lines do?"*

✅ **ALL DONE 2026-09-24. The record of the wrong answers is the useful half.**

🔴 **THE DOUBLE BORDER WAS NOT A BORDER AND IT TOOK THREE GUESSES.** Every
element in that subtree measured `0/0/0/0` or a control's own legitimate box, so
reading the CSS found nothing and I twice fixed something that was not broken:
first I removed the presence button's border, which is a real affordance and
came straight back as *"fau on off is missing border"*.
✅ **THE RECTS SAID IT IN ONE LINE ONCE I ASKED THE RIGHT PAIR.** The field
wrapper's bottom was **557.5** and the textarea's was **556.0**. A textarea is
`inline-block` and sits on a TEXT BASELINE, so its block parent reserves
descender space under it. That 1.5 px strip belongs to the wrapper, the wrapper
is transparent, and **a glue paints `--line` behind its children as the seam**,
so the page drew 1.5 px of seam colour, then the real 1 px seam. `display: block`
on the textarea. MEASURED after: both bottoms **563.0**.
⚠️ **AND THIS IS WHY IT SHOWED UP HERE AND NOWHERE ELSE.** Anywhere but a glue
the ground behind a child is the page's own background and invisible. Inside a
glue the ground is deliberately a line colour, so **every stray pixel of layout
becomes a visible line**.

✅ **THE NAMEPLATE, AND IT IS THE THIRD TIME THIS COMPONENT HAS BEEN REPORTED FOR
IT.** `shell.css` gives the plate `padding-block: var(--panel-pad) 0`, zero at
the bottom, which is correct while something FOLLOWS it because `.panel-strip`
brings its own. Emptying the strip exposed the zero: MEASURED `gap under plate
0.0px`. `/tom/` fixed the TOP half of this privately once, every later page
inherited the defect and not the fix, and it was re-reported on `/plai/` as
*"you failed afain on nameplate padding"*.
🔴 **SO BOTH FIXES WENT IN THE COMPONENT, NOT THE PAGE**, and the page-local
`:empty` rule written an hour earlier was deleted. `:has(> .panel-strip:empty)`
makes it provably narrow: MEASURED, the three pages that build an instrument add
**62** (`/kit/`), **5** (`/fau/`) and **4** (`/muta/`) blocks, so exactly one case
in the repository is empty and exactly one page changes. `/muta/` re-run to prove
it: **51/51 with 45 page asserts, unchanged**.

✅ **LEFT PADDING 16 px, TOP 14**, on `.pos-field.fau-src textarea`, which is a
`(0,2,1)` TIE with `shell.css`'s `.pos-field.tall textarea` and not an
escalation. The first attempt at `(0,1,1)` lost to that rule's `padding: 7px 9px`
shorthand and the computed value read 7 px while the source read as correct.

✅ **THE PATCHES CARRY COMMENTS NOW**, one per line that does something a reader
cannot guess: what `<:` splits, what `_` is, that `en.adsr`'s third number is a
level and not a time, that FM is the carrier being BENT rather than added to, and
that `3.51` is the whole bell.
⚠️ **AND THE BOX WAS RESIZED TO WHAT IT NOW HOLDS.** At `rows: 12` the longest
preset was cut through the middle of `process`, which is the one line a reader
most needs. MEASURED: the four presets are **14, 16, 6 and 13** lines with their
comments, so `rows: 16` is the longest of them rather than a number that looked
about right.

MEASURED throughout: `/fau/` **45/45 with 39 page asserts**, unchanged across
every state of this.

### Open 2026-09-24: `/fau/`'s panel, four asks and one of them is a repeat

🔴 **ASKED, VERBATIM:** *"fau: as i told you: input edge to edge of container w,
add paddign on top, add line in top. glued instrument feel like waveforms on
muta"*.

⚠️ **AND *"AS I TOLD YOU"* IS THE PART TO READ FIRST.** Edge to edge was already
asked on 2026-09-23, quoted in the page's own comment as *"create instument
panel, fau on top right, below the textarea (edge to edge), below it footer with
on/off"*. It was built and it is not edge to edge, so this is the second time of
asking and the first answer was wrong.

✅ **ALL FOUR DONE 2026-09-24, AND THEY WERE ONE CHANGE RATHER THAN FOUR.**
The last clause is the answer to the other three: `/muta/` passes its wave shape
as **`parts: [scope.el]`** and this page was calling **`inst.add(source.el)`**.
`instrument.mjs` already spells out the difference in its own words: `add()` puts
something INSIDE the case, where it scrolls with the panel and sits within the
case's inset, and a part is its own surface with the glue's seam either side of
it, *"the same edge the bar has, at the same width"*. So moving one line gave
edge to edge and the top line at once, and only the top padding was a rule.

🔴 **WHY `edge to edge` HAD TO BE ASKED TWICE: THERE WERE FOUR BOXES INSETTING
IT AND THE PAGE'S COMMENT COUNTED THREE.** The 2026-09-23 answer zeroed
`.panel-strip`'s padding on both axes and named the strip's gap, the strip's pad
and the field's label. The fourth is **`.panel-case` itself**, `padding: 0
var(--panel-pad)` with `--panel-pad: 20px`, on the case. **A child cannot reach
its way out of its parent's padding however many of its own rules say 0**, so the
text was 20 px short at both ends while every rule about it read as correct.
⚠️ AND THE REPAIR IS NOT A FIFTH OVERRIDE. It is a different slot: as a glue part
the text is a sibling of the case rather than a child, so there is no padding
left to fight.

✅ **MEASURED, NOT EYEBALLED.** Case, text and footer bar all span **107 to 793**
inside a glue of 106 to 794, which is the glue's own 1 px border. The field
carries `padding-top: 10px` and the glue's 1 px seam is the line above it.

🔴 **AND THE MOVE EXPOSED AN EMPTY BOX, WHICH IS WHY THIS IS FIVE THINGS AND NOT
FOUR.** With the text gone the case was a **71 px band holding one word**, with
an empty **40 px strip** inside it whose whole height was `padding-block:
var(--panel-pad)`. `.fau-panel .panel-strip:empty` collapses it and the case is
**31 px** now. The plate was measured rather than hoped for: it sits in the
case's top inset at 748.5 px and `FAU` is still top right, where the 2026-09-23
ask put it.
⚠️ **PAGE SCOPED ON PURPOSE.** Any case with a plate and no controls has this, so
it looks like a `shell.css` fix, and making it one would change every instrument
page from inside a task about one.
⚠️ **AND EVERY RULE ABOUT THE FIELD WAS RE-KEYED OFF ITS OWN CLASS**, `.fau-src`,
because they all named `.fau-panel` as an ancestor it no longer has. That is the
dead selector this stylesheet has now measured five times.

🔴 **AND IT SHIPPED WRONG ONCE, REPORTED AS *"its a mess"* WITH A CROP.** The top
padding was put on the PART, which also carried `background: var(--card)`, so the
page drew **case, seam, a second band of the same dark, then the well**: two
bands of one colour with a line between them, which is furniture rather than air
above the text. **Air inside a box belongs to the box.** The padding is the
textarea's own now and the part carries no background, so the input is one
unbroken surface from the seam down.
🔴 **AND THE CORRECTED RULE LOST ITS FIRST FIGHT, MEASURED RATHER THAN
REVIEWED.** `.fau-src textarea` is `(0,1,1)` against `shell.css`'s
`.pos-field.tall textarea` at `(0,2,1)` setting `padding: 7px 9px` as a
SHORTHAND. Weight decides before order does, so the computed value read **7 px**
while the source read as correct. The border on the same element DID win, because
the rule it beats is `(0,1,1)` and a tie goes to the later sheet.
✅ **`.pos-field.fau-src textarea` IS A TIE AND NOT AN ESCALATION**, which is the
smallest thing that can win. MEASURED after: `padding-top: 14px`.

MEASURED: **45/45 with 39 page asserts, identical across all three states of this
change**, so nothing went silent.

### Open 2026-09-24: the remote looper, and the distributed instrument behind it

🔴 **ASKED, VERBATIM:** *"in bg, plan the "remote looper" feature. I am in
desktop browser, midi keyb connected but i want mobile browser on same webpage
have 3x3 grid buttons to toggle the looper"*, and a message later *"think wider
of distributed instument (parts) like this"*.

**The shape.** The desktop browser holds the MIDI keyboard and the sound. The
phone, on the SAME page, shows a 3x3 grid that toggles the looper's slots. So
one instrument, two devices, and the phone is a control surface carrying no
audio.

**What already exists and is not to be rebuilt.**
- `demo/shell/numloop.mjs` is the state machine, 15 checks in `numloop-test.mjs`,
  no browser needed.
- `createKeyboard` in `demo/shell/keyboard.mjs` holds the ten takes and puts
  `Loop` left of `Sustain`. Playback calls `press(k, 'loop')`, so a looped note
  reaches a page's `onDown` exactly as a finger does.
- `/num/` is the bench with the telephone keypad, MIDI in and program change
  mapping. Ten slots exist; a 3x3 grid is nine of them, and which nine is a
  decision the plan has to make rather than assume.
- `workers/items` already gives every room its own Durable Object by
  `idFromName(room)`.

**What is open in it.** Whether the phone drives the desktop's `numloop` over a
relay or runs its own copy, what happens when the two disagree, what a press
costs in latency against a lap of 250 ms minimum, and whether the page is one
URL that decides its role or two.

⚠️ **AND THE SECOND ASK IS THE LARGER ONE.** *"think wider of distributed
instrument (parts)"* is not this one feature, it is the pattern: an instrument
split across devices, each part carrying what that device is good at. The plan
covers the pattern and this feature is its first instance.

✅ **PLANNED 2026-09-24, `plans/plan-remote-looper.md`, 1,055 lines. THE PLAN IS
DONE AND THE FEATURE IS NOT, SO THIS STAYS OPEN.** The recommendation, so the
decision is in this file and not only in that one: **one URL with
`?role=controls`**, following `/moq/`'s existing `?role=` rather than inventing a
spelling; **the phone sends a PRESS and never a state** and holds no copy of the
machine; the desktop **broadcasts all ten states on every change and every 2 s**;
the grid is **3x3 of slots 1 to 9 with slot 10 in a fourth row**, which is
`/num/`'s existing `createPadGrid` call with two disabled blanks; and the new
code is **one kit module, `demo/shell/part.mjs`**, which owns the seam and knows
nothing about loops.
🔴 **THE RULE THE WIDER ASK PRODUCED: NEVER SPLIT THE CLOCK.** The part that
makes the sound owns time and everything else sends gestures and receives
pictures. A seam is cheap in proportion to how much lateness it can absorb, and
a clock can absorb none because lateness IS the product.
⚠️ **AND THE NUMBER NOBODY HAS: no measurement in this repository describes a
phone's leg to the relay.** Every figure quoted is a laptop on this desk, and the
two recorded relay runs disagree six-fold on the hop. Section 3 of the plan is
inference until a phone posts its own round trip to the device log.

### Open, carried in from HANDOFF.md on 2026-09-24

🔴 **THESE SIX LIVED IN `HANDOFF.md` UNDER `Still open` AND NOT IN THIS FILE,
WHICH IS THE WRONG FILE BY THIS PROJECT'S OWN RULE.** `## Open` here held
nothing unfinished at all: every bullet above the 2026-09-18 audit divider is
struck. So a background agent reading the backlog to find out what was wanted
would have found an empty list and a wall of finished work, and the four live
asks were invisible to it. Moved rather than copied, and `HANDOFF.md` points
here now.

- ✅ **DONE 2026-09-24. `/fau/`: *"rm compile button next to fau on"*.** It was
  the only entry left in `.pos-controls` after the presets moved to the panel
  footer on 2026-09-23, so the page now declares no `controls` key at all and
  `shell.mjs` hides the empty row, which it has to: that row carries 14 px under
  it and a band of dead space reads as something that failed to render. `lanes`
  and `draw` were already in that shape.
  ✅ **THE PRESS IT REPLACED WAS NOT MISSING TO BEGIN WITH.** The page compiles
  `AUTO_IDLE_MS` after typing stops, which is what `ONE` and the index line both
  already said in the words a visitor reads, and the switch compiles what is in
  the box the moment it goes on. Neither string needed a word changed, which is
  the tell that the button was a fifth road to the same place.
  🔴 **WHAT IT COST WAS THREE ASSERTS READING `d.button('compile').disabled` AS
  EVIDENCE OF POWER STATE, AND DELETING A CONJUNCT IS COVERAGE LOST AT A COUNT
  THAT DOES NOT MOVE.** The claim those clauses carried, that nothing can start a
  compile on a page nobody switched on, is asserted on the autocompile now: the
  check arms one with the instrument off and measures `autos`, `runs` and
  `node`. It is the better instrument, because a `disabled` attribute is a
  statement about one control and this is a statement about the only road left.
  ⚠️ **AND IT IS TWO ASSERTS RATHER THAN ONE BECAUSE OF LESSONS #113**: the full
  idle wait plus a margin is longer than three quiet polls, so it is split at
  500 ms and each half says something true on its own.
  ✅ **A REAL GUARD MOVED WITH IT.** The deleted handler's own comment recorded
  that the guard belongs INSIDE the queued task and not on the button, because a
  press already on the queue when the switch goes off underneath it is exactly
  the order a check runs in. The autocompile had that hole: `fireAuto` tested
  `powered` before queueing and the queued task never tested it again. It does
  now, before `autos++` so a refused task does not move the counter every
  autocompile assert is written against.
  ⚠️ **TWO COMMENTS WENT STALE THE MOMENT THE ROW EMPTIED** and were rewritten
  rather than deleted: one explaining why `autos` is separate from `runs`, one
  explaining why the whole block is a single `serial`. Both named a harness
  COMPILE press that no longer happens, and both arrangements are still right
  for a reason that outlived it.
  MEASURED: baseline **43/43 with 37 page asserts**, after **45/45 with 39**,
  which is exactly the two added and nothing gone silent, stable across two runs,
  and the page's last assert still runs so nothing was truncated.

- ⚠️ **`/fau/`: *"secondary. should shimmer"*, and it names no subject.** There is
  no shimmer anywhere in `demo/fau/index.html`, MEASURED by grep on 2026-09-24,
  so there is nothing to change and nothing to point at. It needs one word from
  the person who asked: WHAT should shimmer. Blocked on that and not on work.

- ⚠️ **"move instrument to patch seletor below instrument on right, no
  randomizer"**, asked with no page named, and asking got no answer. Candidates
  are the pages that have both an instrument and a patch selector. Blocked.

- 🔴 **THE MK-425C IS DESCRIBED AS A SEMITONE FLAT IN 11 FILES, AND THE CLAIM IS
  NOT WRONG SO MUCH AS UNQUALIFIED.** MEASURED by grep 2026-09-24, excluding
  `archive/` and build output: `demo/evo/index.html`, `demo/bay/index.html` (2
  places), `demo/nola/index.html` (3), `demo/wish/index.html` (2),
  `demo/shell/bay.mjs`, `demo/shell/bay-test.mjs`, plus `PROGRESS.md`,
  `HANDOFF.md`, `research/measured-devices-2026-09-20.md`, `plans/plan-nola.md` and
  `plans/plan-patchbay.md`.
  ✅ **AND ONLY TWO OF THE 11 ARE TEXT A VISITOR READS**, which is the number
  that matters and which the handoff's "seven files" did not separate:
  `demo/wish/index.html:1354`, the `CHANNELS` entry reading *"Sends on channel 2,
  one semitone flat."*, and `demo/nola/index.html:3923`, a diagram box note
  reading *"The one on this desk also arrives a semitone flat, which is what the
  TRANSPOSE control is for."* The other nine are comments and documents.
  🔴 **THE FACT IS THAT THIS UNIT MEASURED 47 TO 71, NOT THAT THE MODEL IS
  FLAT.** `research/evo-mk425c-face-2026-09-21.md` looked for a starting note in
  all three manual PDFs and it is not there; the MIDI Implementation Chart leaves
  `True Voice` as asterisks, which is the chart declining to answer. **47 to 71
  is consistent with a factory 48 to 72 plus a stored transpose of minus one**,
  and the instrument has a transpose function with exactly that resolution.
  ✅ **AND IT IS TESTABLE FOR FREE, WHICH IS WHY THIS IS NOT A WORDING TASK
  YET.** The manual's non-volatile memory list names controller and channel
  assignments, drawbar mode, DATA LSB and MSB, global channel and last used
  preset. **Octave and transpose are absent from it.** So switch the keyboard off
  and on and play the bottom key. **48 means somebody left a live transpose set
  and the instrument is ordinary. 47 means transpose survives a power cycle and
  the manual's list is incomplete.** Either answer decides how those 11 files get
  worded, and neither costs anything.
  ⚠️ **A FACTORY RESET IS NOT THE FREE TEST.** It is hold `+/-` while switching
  on and it *"will erase all setups stored to memory"*.
  ⚠️ **AND NOBODY IS TO "FIX" THE DRAWING.** `createKeyboard` picks black or
  white from the OFFSET off the base note, so `/evo/`'s `base: 47` draws the
  right C-to-C shaped 25 key picture and only the printed NAMES carry the minus
  one. Changing the key pattern would draw an instrument that does not exist.

- ⚠️ **`/circuit/` reads 33/34 on a printed-names inset.** Pre-existing, and
  proved to be so rather than assumed.

- ⚠️ **`/nola/` timeline order has no assert.**

- 🔴 **NOT SETTLED: WHETHER THE LOOP REALLY KEEPS TIME, AND ONLY A PERSON CAN
  SETTLE IT.** The `/kit/` drift check is COARSE, measured rather than suspected:
  the same sabotage run twice gave **8 ms** of growth over five turns and then
  **1.5 ms**, and 1.5 passes. Separating drift from jitter properly needs about
  twenty turns, which is five seconds, and `verify.mjs` stops growing about two
  seconds after the last new assert. The instrument exists and is committed at
  `demo/resources/read-loop-take.mjs`:

  ```sh
  # open https://positron.studio/nola/?rec=1 , play, loop something, let it turn,
  # press SAVE TAKE, then
  node demo/resources/read-loop-take.mjs ~/Downloads/nola-take-*.json
  ```

  It reads `plays`, which is what SOUNDED with `how` saying finger or lap, and
  not `events`, which is the wire and can say nothing about a loop.

### Done 2026-09-23: the numpad looper, and the `Loop` that ended up on the KEYBOARD instead

🔴 **THE STATE MACHINE SHIPPED AND THE `/nola/` MODE DID NOT, AND BOTH WERE
INSTRUCTED.** Asked as *"Add second mode 'Looped' (move typed to third)"* with
`/evo/`'s numpad driving it, then *"forget about looped button for now"* and
*"lets get num right"*, and finally *"wait make it a keyboard funcion, a button in
bottom rihjt (left from sustain) called 'Loop'"*, closed with *"do not wire nola,
its gloabl keyboard fn. nola gets just chords as if i played htem"*.

✅ **`demo/shell/numloop.mjs` IS THE MACHINE, GRADED WITH NO BROWSER**, 15 checks
in `numloop-test.mjs`. `/num/` is the bench, 19/19, with the telephone keypad, MIDI
in and program change mapping so `/evo/`'s own number keys drive it.
⚠️ **ONE RULE CHANGED WHILE IT WAS BEING BUILT**, asked as *"when doubleclick on
empty slot, it stops others possible loops playing and starts rec"*, so the table
above is wrong in its last row: a double press on an EMPTY slot silences every
other looping slot and records, and only a slot with something in it is cleared.
It stops them rather than clearing them, because *start over* is about what you
can hear.
✅ **`/num/` EARNED ITS KEEP ON THE FIRST RUN** by catching that `onTouch` fired
BEFORE the press was booked, so a page painting its lamp from `pending()` read
false and the key never lit. The arithmetic was right and the handover was not,
which is not a thing grading the state machine would ever have shown.

✅ **AND THE LOOP IS A KEYBOARD FUNCTION, NOT A `/nola/` MODE.** `createKeyboard`
takes `loop: true` and puts a `Loop` toggle left of `Sustain`; the tape attaches at
the `press`/`release` funnel, whose own comment had already named that spot as
where a recorder would go. Playback calls `press(k, 'loop')`, so a looped note
reaches every page's `onDown`/`onUp` exactly as a finger does and `/nola/` hears
chords without knowing a loop exists.
⚠️ **`createToggle` IS TWO STATE AND THIS IS A THREE PRESS CYCLE.** Press two turns
the button off, which is what closes the take, and then quietly puts it back on
with `set(true, true)`. The first version called `set(true)` twice, which fires no
`onChange`, so four movements taped and ZERO notes ever came back.
🔴 **A LAP HAS A FLOOR OF 250 ms AND `/kit/` IS WHAT FOUND IT.** That check presses
four keys with no waiting between them, so the take was a few milliseconds long
and the loop turned **118 times in 260 ms**, which is a stuck note with extra
steps. A person cannot play a take that short but CAN arm the button and press it
again straight away, which is the same take. The floor is on the lap and never on
the events, so two quick notes still play where they fell.
⚠️ **THE `/nola/` PICKER KEPT ITS TWO OPTIONS**, so `modePick.buttons[1]` still
means `Typed` and no check moved by an index.

MEASURED: kit 205/205, nola 89/89, knobs and pack 79/79, num 19/19, numloop 15 ok.
Transport `LOOP` is `Loop` on the bar and in both pages that assert on it.

- ✅ **BOTH PAGES ASSERT THE REFUSAL BOUNDARY NOW, AND THE SABOTAGE IS THE
  PROOF.** 2026-09-18. `/flipper/` 8 page asserts to 11, `/now/` 20 to 23. With
  `fake-err.mjs`'s `serves()` forced to `return true`: **4 red, 2 on each page**,
  RE-RUN INDEPENDENTLY rather than taken on report, and the failure text is
  legible at a glance (`............` where a working run draws `#######.....`).
  The negative controls stay GREEN under the same sabotage, which is what they
  are for. The evidence comes from a survey of all three channels, because the
  one channel a page opens wears one of three shapes and a finder that always
  answered "nothing is blocked" would read exactly like a quiet day.
  ⚠️ **AN EXPIRED SEGMENT LOOKS LIKE A REFUSED ONE AND NEARLY BOUGHT A FLAKE.**
  The first run read `#.......#####`, two boundaries where there is one: the
  oldest probed point fell off the back of the window between the playlist read
  and the ask. `err-live.mjs` fact 2 says to probe only segments from the
  playlist just read, and that is necessary and NOT sufficient, because a
  thirteen point sweep takes seconds and the window slides while it runs.
  Membership has to be evaluated at PROBE time. Points no longer in the freshest
  playlist are dropped and the count is printed.

- ✅ **`/now/` PLAYS THROUGH A REFUSED LIVE EDGE.** `findServedEdge` came out of
  `/flipper/` into `demo/shell/err-live.mjs` and both pages call it, so the
  original is not the only caller. MEASURED against `fake-err.mjs`'s `/wall`:
  **7 page asserts red and a black picture before, 0 red of 23 after**, reading
  `53.1 min behind, and ERR refuses the newest 52.9 min`. LIVE now means the
  newest frame ERR will hand over rather than the newest it lists. Two asserts
  carry two bands, each naming which case it is in, because the page has two
  honest answers.
  ⚠️ **THE HARNESS STILL POINTS `/now/` AT THE DEFAULT ARRANGEMENT**, and this
  time that is a choice rather than a setting standing in for a fix: `/flipper/`
  at `/wall` grades a picture playing through a wall, `/now/` on the default
  grades one at a live edge, so both modes run every time and each page's finder
  is graded against all three shapes by its own survey. One line flips it.

- ✅ **`/flipper/` GOES RED AGAINST A BROADCASTER THAT IS NOT THERE.** MEASURED
  with `?base=` at a closed port: **4 page asserts red of 11**, where all 8 used
  to pass. `the selected channel is open or loading` was satisfied by `!!c.hls`,
  true the instant `new Hls()` returns. It is `the selected channel received
  picture, not just an object` now: `etv 238 fragments, 6542 KB, 165 frames
  decoded` when it works, `0 fragments, 0 KB, 0 frames decoded` when it does not.
  ⚠️ **THE FRAME COUNT IS CUMULATIVE AND THAT IS THE WHOLE TRICK.** `readyState`
  is an instant and the check runs one line after a seek, which empties the
  buffer, so a WORKING page read `readyState=1`. `totalVideoFrames` counts what
  the element has ever decoded and a seek does not reset it.

- ✅ **DONE 2026-09-18. THE CARET BUG, AND IT WAS NEVER THE FILE.** Reported as
  *"there is not caret in arvhice playback"* and diagnosed wrongly TWICE as
  MediaRecorder carrying no cues.
  🔴 **`mediaMaster` DOES NOT RUN ITSELF AND `/stage/` NEVER TICKED IT.** Its own
  docstring says to call it from the rAF loop you already run and `/crate/`
  carries the same warning; the page built the object and drove it zero times,
  so the archive's deck was never once driven by its element. MEASURED: the
  element went to 1.00s of a 3.45s recording, `ended` false, `seekable`
  0.00..3.45, while the deck sat at 3.45s. **`master ticks 0, backstop 0,
  driving false`** is the line that said it, and printing three counters settled
  in one run what guessing had not in three.
  ⚠️ **AND THE SEEK CHECK PASSED THROUGHOUT**, because it asks the ELEMENT where
  it went. Every assert about that archive was on the one side of the join that
  worked.
  ⚠️ **A SECOND, REAL GAP IN SHARED CODE FOUND ON THE WAY**: `mediaMaster`
  listened only for `timeupdate`, and a paused element fires none and produces
  no rvfc frames either. Seek a paused master and every sensor goes quiet at
  once. It listens for `seeked` too now. **`/stage/` is 38/38.**

- ✅ **DONE 2026-09-18. THE AUDIENCE'S WAITING CARD IS GONE.** It said in two
  sentences what the presence badge says in one word. The check that guarded it
  CHANGED rather than going: it read `.pos-card`, and the claim was never about
  a card, it is that the audience is shown no `<video>` before there is anything
  in one.

- ✅ **DONE 2026-09-18. `/stage/` GOT A BACKGROUND, AND IT IS NOT ERR.** Asked as
  *"turn on the err feed in the bg"* and settled a message later with *"i just
  need some video there. look for suitable PD sources? can be historic stuff or
  whatever"*, which dissolved the whole problem: the ask was a picture, not a
  broadcaster. **The Dickson Experimental Sound Film, 1894 or 1895**, the
  earliest known film with live-recorded sound, which is on subject as well as
  free: the first attempt to publish picture and sound together, behind a page
  that publishes picture and sound together.
  🔴 **CHOSEN ON TWO INDEPENDENT PUBLIC DOMAIN GROUNDS RATHER THAN ONE:**
  published 1894, so copyright has expired everywhere, AND the Internet Archive
  item carries an explicit dedication (`licenseurl`
  `creativecommons.org/licenses/publicdomain/`).
  ⚠️ **THE ON-THEME CANDIDATE WAS REJECTED AND THAT IS THE POINT.**
  `corpus.json` holds Kurenniemi's own `Computer Music (1966)`, perfect for this
  and marked `licenceConfidence: LOW`, `holder: uploaded by a member of the
  public`. A public domain mark self-asserted by an anonymous uploader on a 1966
  Finnish film is not a clearance. That field exists so the convenient answer
  does not win for being convenient.
  ⚠️ **FETCHED ONCE AND SERVED FROM OUR OWN ORIGIN.** `demo/resources/`, so
  `/resources/dickson-1894.mp4`, same origin, no CORS, no visitor request
  leaving this site. A public domain film on archive.org is still archive.org's
  server. Provenance in `dickson-1894.json` beside it.
  ⚠️ **11.4 MB to 2.33 MB, a 4.7x saving, SOUND KEPT.** It was stripped first on
  the reasoning that the page mutes the background, which was wrong: the
  live-recorded sound is the entire reason the film matters, and keeping it cost
  0.54 MiB. A file is an artefact, not only an input to one page.
  🔴 **AND THE BUILD SILENTLY DECLINED TO COPY IT.** `.mp4` was not on the
  allowlist, so it shipped the provenance JSON, dropped the film, and reported
  `copied 182 files`. The page would have carried a `<video>` pointing at a 404.
  Third time that allowlist has failed that way, after `.webmanifest` and the
  `dust` excerpts. `.mp4` and `.m4v` added.
  ⚠️ **THE ERR ROUTE IS UNTOUCHED**: still opt-in on `?bg=<slug>`, still
  unreachable by a harness, and the rights question it raises is still the
  user's rather than answered by default.

- ✅ **DONE 2026-09-18. `How it works` LIVES IN THE CONTROL ROOM AND THE
  ARCHIVE.** Two instances from one spec, `atEnd: false` because `atEnd`
  appends to `document.body` and ignores the host. The audience panel gets none.
  🔴 **AND THE CUTS CHECK WOULD HAVE PASSED BY NEVER LOOKING.**
  `getComputedTextLength()` answers 0 under a hidden ancestor, so a diagram in
  an unselected tab reports NO CUTS however badly it is cut. The check asserts
  `dg.measured` and selects each tab first. **MEASURED: both panels measured,
  nothing cut.**

- ✅ **DONE 2026-09-18. START AND STOP ARE A TRANSPORT BAR.** `live: true` so the
  clock is a LIVE chip, `scrub: false`, `loop: false`, and `showDeck` really
  runs, so the playhead is how long the show has been on air. **The check
  PRESSES the bar rather than calling `startShow()`**, because a bar wired to
  the wrong command would have left every assert below it green, measuring a
  show only the check knew how to start.
  🔴 **IT EXPOSED TWO REAL DEFECTS IN SHARED CODE.** `__demo.transport` was
  whichever bar was BUILT LAST, so a page with two bars published the wrong one:
  `publish: false` now lets a page say. And `verify.mjs` clicked
  `document.querySelector(".tbar-toggle")` while asserting about
  `__demo.transport`, which are the same element only on a one-bar page: it
  presses the graded bar's own toggle now, and `el` was added to the api for it.
  **MEASURED: `/stage/` 37/38, and 521/522 across the 21 demos that carry a
  bar**, the one red being the rewind defect above.

- ✅ **DONE 2026-09-18, FOUR SMALL ASKS ON `/stage/` IN ONE PASS.** **35/36**,
  the one red being the rewind defect above.
  - **The archive opens on a 15s window**, MEASURED at 15.0s on screen, and
    **zoom out is bounded at 4x it**. That bound did not exist to be raised:
    `capPps` floored at 1e-30 px/s, so a reader could wheel until a recording
    was a thousandth of a pixel. `maxSpan` is a new strip option, OFF by
    default so none of the other twelve strip pages move, and `/stage/` is its
    first caller. Proved by asking for a thousandfold zoom out and asserting
    where it stopped, with `S.zoom.by` naming `max-span` so a bound that fired
    is distinguishable from a wheel that did nothing.
    ⚠️ **THE BOUND TAKES THE RECORDING WHEN THE RECORDING IS LONGER**, because a
    bound that hides the thing a reader came to look at is a bug rather than a
    bound. And the expression lives in ONE place: it was written twice for one
    run, once in the option and once in the assert grading it, and they
    disagreed immediately.
  - **`diagram cuts: [object Object]` is gone.** A cut is `{ id, where, full,
    shown, width }` and the page joined the objects. `/kit/` had the formatting
    all along, so a page had invented its own way of printing a structure
    another page already printed properly. It is an ASSERT now, not a whispered
    log line, which is how six survived a deploy unread.
  - **And the six cuts were real, at PHONE width only.** Three subs were over
    the box's ~14 characters: `1280x720, 25fps`, `700k, 2s pieces` and `WHIP in,
    WHEP out`. One of the three had been added the same morning.
  - **Every button is secondary.** `Send` no longer carries `pos-pri`.
  - **The question defaults to "Kas Manfred MIM on olemas", Jah and Ei**, third
    option left empty as before.

- ✅ **DONE 2026-09-18. `/now/` AND `/flipper/` CONTACT NOBODY.**
  `demo/fake-err.mjs`, the third stand-in after `fake-station.mjs` and
  `fake-tapes.mjs`, and the last pair of pages still pointed at a broadcaster.
  **MEASURED, and re-run independently rather than taken on report: 52/52 with
  the only hosts contacted being the dev server and the stand-in.** Cold build
  **55.4 s and 105 MB**, cached in the system temporary directory; the media
  playlist is 126 KB over 3600 segments and 120.0 min.
  `demo/shell/err-live.mjs` gained `errUrl()` and a `?base=`, `/now/`'s schedule
  fetch routes through it (it is on `www.err.ee`, and was the one live URL left),
  and `/flipper/` now imports `CHANNELS` rather than holding a fourth copy.
  ⚠️ **IT REPRODUCES THE REFUSALS**: 403 with no `access-control-allow-origin`,
  on rights-blocked segments AND on ones off the back of the window, in the three
  shapes measured on 2026-09-06, verified by a 13-point sweep.
  ⚠️ **NO BURNED CLOCK IN THE PICTURE.** `ffmpegFilters()` needs `drawtext`,
  which needs libfreetype, and the ffmpeg on PATH reports zero of them.
  `src/publish.sh` pins `ffmpeg@7` for this and says so. Skipped rather than
  half-done.
  ⚠️ **AND IT LEFT THREE HOLES BEHIND IT, ALL IN `## Open` ABOVE**, which is the
  point of building the thing: a page nobody could run was a page nobody could
  find holes in.

- ✅ **AND ONE WAS FIXED ON THE SPOT: `/flipper/`'s CHECKS DID NOT RUN ON A
  WALLED CHANNEL.** The `live` handler jumped to the newest served frame and
  `return`ed past the `await d.run('check')` that is the only thing on the page
  that runs them. **2 asserts against 8, and the suite read GREEN having graded
  nothing.** It was invisible because which branch fires depends on what ERR
  happens to be blocking that day. The jump is a function now and the checks sit
  outside it, so none of its three exits can take them.

- ✅ **DONE, AND THE NUMBER IT WAS DECIDED AGAINST WAS NOT IN THE TABLE.** *"What
  we do with r2 save? Show can be 3hr"*, asked 2026-09-18. **THE PICTURE IS
  700 kbit/s AND THE SOUND IS 96, SO A THREE HOUR SHOW IS 1.07 GB**, set on
  `/stage/`'s recorder as `videoBitsPerSecond` and asserted.
  🔴 **WHAT WAS THERE BEFORE WAS THE BROWSER'S DEFAULT, AND IT MEASURES
  2,500 kbit/s.** The page passed no rate at all, so this was never a choice
  between the rows of the table: MEASURED by deleting the rate again and reading
  `videoBitsPerSecond` back off the recorder, three hours of the default is
  **3.38 GB**, worse than the 2 Mbit/s row somebody would have picked as the
  extravagant end, and **134x** the 24 MiB an `ingest` session may hold.
  ⚠️ **AND THE FIRST ANSWER TO THIS WAS 1.167 Mbit/s, WHICH IS A REAL
  MEASUREMENT OF THE WRONG THING.** That is the rate of
  `proto/selfrec/artifacts/a1-concat.webm` (13,134,293 bytes over 90s), and
  selfrec's own note says that file was recorded at a **request** of 1200 kbit/s.
  A rate somebody asked for is not a default. It was believed for an hour
  because it came off a real file with a real number beside it, and what
  corrected it was breaking the assert on purpose.
  **What decided the value, given that the file size is free:**
  - **Money is not an axis.** 1.08 GB in R2 is about 1.6 cents a month and 5,400
    writes about 2.4 cents a show. Every row from 691 MiB to 3.38 GB costs
    nothing worth arguing over, and reaching for cost first is how this sat
    undecided.
  - 🔴 **THE SCARCE THING IS THE UPLOAD, AND IT IS ROUND-TRIP BOUND RATHER THAN
    BANDWIDTH BOUND.** MEASURED in selfrec A2: 13 buffered pieces drained in
    6,816 ms, 524 ms each, against a p50 verify of 483 ms. So an interrupted
    show catches up at about **1.9 pieces a second whatever the bitrate is**,
    and the headroom is set by how many pieces it makes. **At a 2s piece a three
    hour show is 5,400 against 0.5/s of production: 3.8x. At 5s it is 2,160 and
    9.5x.** So the long-show timeslice is **5s**, and it is not 5s on `/stage/`,
    whose shows are seconds long and would produce no piece at all before being
    stopped.
  - ⚠️ **Seeking does not pay for the longer piece**: `proto/selfrec/indexer.mjs
    --blocks` indexes per SimpleBlock, not per cluster.
  - ⚠️ **Audio is not where a saving is and is not cut.** 96k over three hours is
    130 MB of the 1.07 GB, and it is the only track carrying the question and
    the answers. `/stage/` records one video track today, so `AUDIO_BPS` is
    declared and deliberately NOT passed: a rate for a track that is not there
    is a setting that reads as correct and does nothing, which this page has
    already paid for twice.
  ⚠️ **WHAT IS STILL OPEN IS THE PLAYBACK PATH, NOT THE NUMBER.** `fetchBack`
  builds ONE Blob and a gigabyte cannot go in memory; `indexer.mjs` plus Range
  and MSE is the answer and is written. `/stage/` uses the `ingest` open tier,
  which is 4.2 minutes at this rate, so the worker swap to `selfrec` is
  untouched by this entry.
  ⚠️ **THE PROTO'S OWN DEFAULTS WERE LEFT ALONE ON PURPOSE.**
  `proto/selfrec/participant.html` still defaults to `kbps=1200` and
  `timeslice=2000`, because those are the values its recorded baselines were
  measured at and changing them silently would invalidate its NOTES.

- ✅ **DONE. follow TRACKS THE NEWEST FACT ON THE STRIP, WHICH DURING A SHOW IS
  THE WRITE HEAD.** *"What to do with follow"*, asked 2026-09-18. The open half
  was never the control, it was the TARGET: during playback it follows the
  playhead, and a live show has no playhead at all.
  🔴 **`followTarget` ON `createStripView`, PLUS `setFollowTarget(fn)` AT
  RUNTIME.** Null means the playhead, which is what every page before `/stage/`
  did. `/stage/` calls `armWall(0)` when the recorder starts, which makes
  `wallPos()` the write head and draws it as the wall cursor, and passes
  `() => wallPos()`. The handover at the end of the show is `setFollowTarget(null)`
  plus the new `disarmWall()`, and it does NOT re-engage follow: somebody who
  dragged the strip during the show stays where they dragged it.
  🔴 **AND THE STRIP WOULD HAVE FROZEN, WHICH IS THE HALF THAT NEARLY SHIPPED
  INERT.** Its loop repainted on `S.dirty || p !== S.pos || (wallAnchor &&
  deck.playing())`. On this page nothing is playing while a show records, so
  every term was false, the strip never redrew, and `followTick` never ran: a
  live show's timeline would have stood still while its own rows arrived, with
  every line of the new code correct. **An armed wall is a real-time cursor, so
  it now repaints on `S.wallAnchor` alone** and the way out is `disarmWall()`.
  ⚠️ **THE WINDOW IS A CEILING, NOT A WIDTH.** `LIVE_WINDOW_MS` is ten minutes,
  and the view opens on `min(showLength, window)`: at 1280 px a three hour show
  is 8.3 s per pixel, where a two minute question is 14 px and an answer is
  sub-pixel, and ten minutes puts that question at about 240 px. A short show
  fits whole and the window changes nothing, which is every show `/stage/` has
  recorded.
  🔴 **AND THE FIRST TWO ASSERTS WERE BLIND AND PASSED THE SABOTAGE 32/32.**
  They checked `followsPlayhead === false`, a finite `followPos`, and a window
  that MOVED. With `followPos` made to ignore the target and return the
  playhead: `followsPlayhead` reports the SETTING rather than the behaviour so
  it stayed true; the harness had seeked the playhead to 90s so `followPos` was
  large and finite; and a window chasing a playhead 90s away moved **17,119 px**,
  which passes "it moved" with room to spare. They compare `followPos` against
  the WRITE HEAD now, and require the write head to be ON SCREEN at the end.
  **MEASURED: `/stage/` 32/32, up from 28. Three deliberate sabotages take it to
  30/32, 31/32 and 31/32**, and the failure text names the real symptom each
  time (`sits -16446 px into a 576 px window`; `moved 0 px`; `reports 2500
  kbit/s`). **404/404 across the other eighteen strip demos**, keep and take
  included, which are the other pages that arm a wall.
  ⚠️ `now` AND `flipper` WERE NOT RUN. They sweep ERR segments, and nothing
  about this change is worth a public broadcaster's listener figures.

- ✅ **DONE. `/tapes/` HAS A STAND-IN, AND `node demo/verify.mjs tapes` COSTS
  archive.org NOTHING.** Asked because that harness pulled twenty-four real
  recordings on every run, including the runs where somebody typed no arguments
  at all, against the 2026-09-16 instruction *"stil: super careful with external
  sources, better avoid"*. `demo/fake-tapes.mjs` is the same answer
  `fake-station.mjs` gave `/radio/`: real MP3 frames, real `content-length`,
  `accept-ranges: bytes`, working Range replies and archive.org's CORS headers,
  at the exact lengths `corpus.json` measured. `/tapes/` takes a `?base=` the way
  `/radio/` does and `verify.mjs` starts the server and points the page at it.
  **MEASURED: 38/38 green, 26 page asserts, and the only hosts the run touched
  were the dev server and the stand-in.** The instrument is new too:
  `DEMO_HOSTS=1 node demo/verify.mjs <slug>` prints the hosts each demo
  contacted, off `Network.requestWillBeSent`, so "no bytes left this machine" is
  checkable rather than claimed.
  ⚠️ **AND IT EXPOSED TWO VACUOUS PASSES IN THE PAGE'S OWN CHECKS, WHICH ARE NOT
  FIXED.** A stand-in serving every recording at HALF its corpus length reads
  38/38, because every geometry assert takes its lengths from the corpus and
  none of them ever compares that against the file the element loaded. And a
  stand-in serving SILENCE also reads 38/38: `the page makes no sound until
  somebody presses play` printed `ran 265 ms of tape at 0.000 and the speakers
  got 0.0000`, which cannot tell a shut gate from nothing to gate, and
  `backwards is the same samples mirrored` reported `4 of 4` zeros matching
  zeros. Both need a real measurement to sit behind, and the tolerance for the
  first one cannot be chosen here: the corpus durations came from ffprobe on a
  header, so what a browser reports for the same file is unmeasured and may not
  be measured without asking archive.org for the files.

- ✅ **THE PAGE IS A STACK OF BLOCKS AND THE STACK OWNS THE AIR BETWEEN THEM.**
  Asked twice on 2026-09-16, the second time as a diagnosis rather than a
  request: *"same vert space beween as we establised in knob (make a rule and
  uptada others in bg: make it easy to change later)"*, then *"you can not
  follow spacing tule. make reusable layout component?"*. `demo/shell/stack.mjs`
  plus `.pos-stack` in `shell.css`; the number is `--pos-gap` on `:root` and
  nothing else states it. MEASURED on 38 pages before and after: every gap
  between two blocks is now exactly 40 px, where before there were 0, 10, 12,
  14, 16, 18, 40 and 53.5. `/keys/` was the photograph (0.0 px between the
  transport bar and the keyboard) and `/knobs/` was the reference and did not
  move, gap for gap.

- ✅ **AN IDLE LOOP PAIR WEARS THE SAME EDGE AS THE BUTTONS BESIDE IT.** Asked
  2026-09-16 with a photograph: *"global: loop buton borders as rest of
  button"*, the fourth report about this pair. MEASURED on `/draw/` before the
  repair: the pair read `rgb(106, 114, 128)` (`--dim2`, text grey) while every
  rate button and every ordinary button read `rgb(43, 53, 70)` (`--line2`). The
  repair was to DELETE the declaration rather than restate a colour: both halves
  are `<button>` and the base rule already gives them the edge. `/draw/` now
  asserts it, and the assert goes red when the old declaration is put back.

- ✅ **`/keys/` OPENS ON `AddSynth Morph`.** Asked as *"addsynth morph as default
  patch"*. Bank 115, program 32, addressed by bank and program rather than by a
  position in a flattened list of 911. It is SENT as well as pointed at, and the
  page says in its log which patch it opened on, or says so when that bank and
  program are not in the board's library.

- ✅ **FLUIDSYNTH AND HEXTER ARE OFF THE BOARD AND OUT OF THE PAGE**, to
  `archive/box-fluidsynth-hexter/`. Asked as *"lets remove fluidynth and hexter
  code and move to arvhice (in browser and in board). update board."* There is
  ONE jackd, ONE capture and ONE room on that board, so an instrument picker was
  a control that took the sound away from somebody in another building: `/knobs/`
  was found refusing to start because somebody had pressed `sampled`. Board
  restarted 22:44:41 and yoshimi confirmed up, `jack: true`, `yoshimi:left`,
  50 frames/s. MEASURED that the deploy landed: `md5` of `board.mjs` and
  `jacksynth.mjs` identical board against local, and the board's own copy of
  that file answers `JACK_SYNTHS: yoshimi`.
  ⚠️ It found a real defect on the way past: `/grains/` asked the board for
  `fluidsynth` while waiting for a reply naming `yoshimi`, so `wantSource` was
  never cleared and the mark it gates stayed armed for a whole visit.

- ✅ **THE `box` DEMO IS `keys`.** Asked as *"rename box demo to keys"*. 119
  references in 30 files, swept on the URL form rather than the word, so
  `rig/board/` is untouched: the BOARD is still the box. The source file did not
  move and `LAYOUT.md` rule 2 is why. The deployed `/box/` is gone and no
  redirect was written, same as `radio1965`.

- ✅ **`demo/shell/board.mjs`: ONE MODULE FOR THE RASPBERRY PI.** Asked as
  *"share code with knobs"*. `/keys/` stopped hand-rolling its WebSocket, its
  12-byte frame header, its int16 conversion, its `pcm-playout` worklet, its
  cushion and its counters; it GAINED three things it never had, because the
  module is the better of the two halves rather than the average — a full room
  told apart from a dead relay, a frame checked against the shape the board
  publishes, and the board identified by the messages only it sends.

- ✅ **ONE DIAGRAM, TWO VARIATIONS.** Asked as *"current box diagram is so much
  nicer. unify the diagrams to look best and have knobs and keys variations of
  this"*. Both draw the same ring now: out along the top, down the board, back
  along the bottom. `/knobs/` gained the split relay that makes it read one way
  round, `/keys/` gained the JACK and ffmpeg split. Both report `cuts: 0`.

- ✅ **`/keys/` HAS A TRANSPORT BAR WITH NO PLAY BUTTON.** Asked as *"bring
  transport bar to keys but no play button, just online badge. plush
  readout+logs"*. `transport-bar.mjs` takes `toggle: false`, in the same family
  as `scrub: false` and `loop: false`, and `demo/verify.mjs` reads
  `api.toggles` before pressing a button that may not be there.

- ✅ **IDA AND RADIO 1965 ARE BACK, LAST IN THE LIST, ON THE TEE.** Asked as
  *"bring ida's back to radio (if single listener)"*, *"bring ida to videoradio
  too"* and *"bring back radio65 stream as last. we are single user connected?"*.
  The condition was checked off the code, not remembered. NEITHER OPERATOR HAS
  BEEN RE-ASKED: what changed is the size of the claim, not their permission.
  Both are LAST because being at the front is what did the damage.

- ✅ **THE `/videoradio/` HEADSET HALF AND ITS SEA ARE ARCHIVED**, to
  `archive/videoradio-xr/` with the plan and a README of what the three device
  runs bought. Stage B was never written and now never will be here.

- ✅ **A RATE LATTICE OF ONE DRAWS NOTHING.** `buildRates()` tested
  `lattice.length`, so a cue lane declaring `caps: { rates: [1] }` produced a
  single armed radio button with nothing to choose it against: *"what this
  disconnected 1 does here?"*. Checked before changing it that `jam` and `kit`
  are the only other single-rate declarations and neither asserts on the row.


- ✅ **`/seek/` IS RETIRED.** *"rm seek demo"*. `git mv` to
  `archive/demos/seek-index.html`, its row out of `DEMOS`, and 5 real slug
  references swept of 30 slug-shaped candidates: the manifest row, the manifest
  prose that paired it with `replay`, a `verify.mjs` comment citing its 700 ms
  sweep, and a plan pointer. The other 25 are `st.reason === 'seek'` in the
  transport and history in old plans, which an archive is allowed to keep.
  ⚠️ IT ORPHANED NO COVERAGE, checked rather than assumed: its comment claimed
  *"exactly one page has to prove it works"* about the shared loop check, and
  `replay`, `radio` and `tapes` all press `pressLoop()` and assert on the wrap.
  MEASURED after: 46 rows, 43 built, `seek` absent, scratch build passes with no
  missing import, and the archived page still parses.

- ✅ **`/replay/`, ALL SIX.** 18/18 before, 22/22 after; page asserts 6 to 10.
  The lone yellow `1` was a rate radio group with ONE option, from a cue lane
  declaring `caps: { rates: [1] }`. The loop bug was real: the bar wraps by
  seeking, the deck is a `mediaMaster` FOLLOWER of the video, so every wrap was
  undone by the master's next tick while the clock climbed. It passes
  `command: { play, pause, seek }` now, the way `/tapes/` already did. Load and
  Play are gone, the transport's play does it. `what` is the manifest's `one`
  line. A diagram, `cuts` asserted at 0. Sabotage: deleting the one line that
  writes `video.currentTime` takes it red at `1.99 s against a ceiling of 1.25`.
  ⚠️ THE LOOPER WAS REFUSED IN WRITING AND CORRECTLY: it owns a direction by
  holding the sound, and `/replay/` loops a `<video>` with no `AudioContext` on
  the page. It got the kit's BUTTON without the kit's mechanism, disabled with
  the reason on its face. The lift is in this file.

- ✅ **ISOLATED DEPLOYS, PLANNED AND ANSWERED NO.** `plans/plan-isolated-deploys.md`.
  46% of deployed bytes are shared and 45 of 46 pages import `shell.mjs`, so
  per-slug subdomains cost 44 Workers and about 179 MB a deploy to buy TIMING
  isolation over code that stays shared BY SOURCE. `wrangler versions upload
  --preview-alias` instead, which is wired as `workers/view/preview.mjs` and
  MEASURED at 11 s with production untouched.

⚠️ These stay. A struck line is how a repeat request is recognised as a
repeat, and several of these were asked for more than once.

- ✅ **DONE. `/replay/`, ALL SIX, ASKED 2026-09-16 WITH A SCREENSHOT.**
  MEASURED: **18/18 before, 22/22 after**, `node demo/verify.mjs replay`.
  1. *"transport loops but video does not, time keeps increasing"* was real and
     is fixed. The bar wraps a loop by SEEKING, and with no `command` a seek
     goes to the deck; the deck on that page is a FOLLOWER of the picture, so
     `mediaMaster` undid every wrap within a quarter of a second while the show
     ran on. The page now passes `command`, so play, pause and seek all drive
     the `<video>` and the deck follows, which is what `/tapes/` already did.
     GRADED: the check sets a loop through the real button, plays two laps and
     watches `video.currentTime`. Green it reads *the picture ran 0.81 s from
     the loop start and reached 95.81 s, against a ceiling of 96.25 s*; with the
     one line that seeks the element deleted it reads **1.99 s against a ceiling
     of 1.25 s** and goes red.
  2. *"what this disconnected 1 does here?"* was the rate radio group with ONE
     option in it, from the cue lane declaring `caps.rates: [1]`. The lane no
     longer declares a lattice, because a playhead that follows a picture has no
     speed to arm. The bar's half of it is open above.
  3. *"rm load and play, transport play should do it"*. Gone. ▸ attaches the
     manifest, starts the picture and starts the playhead; `play()` is fired and
     never awaited. The page now declares no controls at all.
  4. *"does not have global loop button with mode, just a single loop"*. The
     kit's `→` is on the bar in the kit's group, disabled with the reason on it.
     The refusal and what would lift it are open above.
  5. *"desc: single sentence only"*. The `what` is the index's own `one` line.
  6. *"add 'how it works' section"*. A `createDiagram` picture, last on the page,
     seven boxes in two machines, asserting its own `cuts` at 0.
  ⚠️ The manifest row grew `settleMs: 6000`: with no controls the page's checks
  hang off a press the harness makes BEFORE its control loop, and that number is
  what sizes the wait for a page's first assert.

- ✅ **DONE. THE L
- ✅ **SESSION 31 CLEARED THESE, ALL DEPLOYED AT `b2bddd2-092128-ad26`.**
  The full account, with what each one cost, is in `HANDOFF.md`.

- ✅ **`/videoradio/` VR IS TO BE ARCHIVED. ASKED 2026-09-16:** *"arvhice
  videoradio vr, it did not worked out"*. The headset half comes out of the live
  page and goes to `archive/`: the `Run in VR` control and its row, `makeXR`,
  `xrPreview`, the `createXRPanels` import, the session's own sea and the two
  asserts that go through `preview()`. The WINDOW sea stays, because the same
  message asks for it to be changed rather than removed.

- ✅ **MOVE `/videoradio/` TO THE `vain` GROUP. ASKED 2026-09-16:** *"move
  videoradio to vain group"*. Front-page grouping, in `demo/shell/manifest.mjs`.

- ✅ **REMOVE THE LEAVE-FULL-SCREEN BUTTON ON `/videoradio/`. ASKED 2026-09-16:**
  *"rm \"back from fullcreen\" button in videoraio"*. The `⤡` in the bottom
  left of the pane (`outBtn`).

- ✅ **THE LOOP PAIR IS TWO DIFFERENT BORDERS AND THE ARROW IS NOT SQUARE. ASKED
  2026-09-16 WITH A SCREENSHOT:** *"loop buttons should have same border color.
  arrow button square size"*. In the picture `LOOP` carries a dim border and the
  → glued to it carries a bright one, so one control reads as two, and the arrow
  half is wider than it is tall. `demo/shell/looper.mjs` owns both.

- ✅ **`dub` AS THE DEFAULT PRESET. ASKED 2026-09-16:** *"dub as default preset"*.

- ✅ **THE PLAY BUTTON CHANGES SIZE WHEN IT BECOMES PAUSE. ASKED 2026-09-16 WITH A
  SCREENSHOT:** *"play button is always square"*. `▶` and `❚❚` are different
  widths, so a button sized by its content resizes on every press.

- ✅ **`/videoradio/` SHOULD USE THE STANDARD TRANSPORT BAR. ASKED 2026-09-16 WITH
  A SCREENSHOT:** *"use standard transport bar here (LIVE badge as in radio).
  fullscreen button replaces loop"*. Today it has a hand-rolled `.vr-bar` of two
  buttons, which is the fourth-copy-of-a-component failure CLAUDE.md names.
  `createTransportBar` with `live: true` draws the LIVE chip `/radio/` uses, and
  the ⛶ goes in the slot the LOOP button occupies there.

- ✅ **`/tapes/` STILL LOADS AND PLAYS ON PAGE LOAD. REPORTED 2026-09-16 AGAINST
  THE DEPLOY**, <https://positron.studio/tapes/>: *"tapes still does some
  loading and playback on page load"*, and *"omg you still do not get it"*,
  which is the second half of the report and says this has been asked before.
  ⚠️ THE LAST SESSION FIXED A DIFFERENT THING AND CLAIMED THIS ONE. What it
  removed was twenty-four `preload = 'metadata'` requests to archive.org, and
  the handoff then wrote *"the page opens NO media elements at load"*. A visitor
  is still getting sound and still getting a fetch, so whatever is doing it was
  never the thing that was measured.

- ✅ **CHROME DROPS OUT OF FULL SCREEN WHEN THE RADIO SOURCE CHANGES. NAMED
  2026-09-16:** *"chrome drops out of fullscreen when radio source changes. just
  take it as a fact and try to work to avoid it. or do tests around to replicate
  and find solution."* This is almost certainly the same fault as the standing
  *"`/videoradio/` drops out of full screen after 22 to 25 seconds"* item, which
  has been open since session 28 and unexplained: the tour changes station on
  roughly that period, so the clock everyone was looking for was the station
  rotation rather than a timer.
  ⚠️ **THE TERMS OF THE WORK WERE SET WITH IT AND THEY ARE NOT OPTIONAL:** *"be
  very gentle make sure proxy tee work and no assersions on live items. this is
  very gentle r&d"*. So: no assert loops against live mounts, and whatever is
  built has to confirm the tee is still holding one upstream.

- ✅ **`/keys/`: A DIAGRAM, A LAG READOUT, AND DROP THE COLLECTION LINE. ASKED
  2026-09-16:** *"add diagram to box demo. i want lag readout. rm
  Will_Godfrey_Collection · 657 of 878"*, then *"add 'patch' label to patch
  selector"*.

- ✅ **`/crate/`: CLICKING A FILE PLAYS IT. ASKED 2026-09-16:** *"no table rework.
  just make clickin files playable"*. Narrows the older three-part ask to one
  part and explicitly refuses the rest: leave the table alone.

- ✅ **`/tapes/`: THE NO-WAVEFORM LINE IS UNREADABLE AND THE EMPTY BOX LOOKS
  BROKEN. ASKED 2026-09-16:** *"what does it mean. many kureniemis do not
  play"*, against `Computer Music: its host will not share this file with a
  page, so it plays with no waveform`, printed in the log's FAULT colour with a
  blank bordered box above it.

- ✅ **`/replay/` DOES NOT SAY WHERE THE CUES COME FROM. ASKED 2026-09-16:**
  *"https://positron.studio/replay/ does not say where from the cues come"*.
  The page draws eight operator cues on the strip and nothing on it says who
  made them or when.

ENGTHS ARE MEASURED AND THEY ARE IN THE CORPUS.** Asked as
  *"also do measure file lengths gently and write to corpus and use them"*.
  `demo/resources/measure-durations.mjs` asked all 26 time-based files with
  ffprobe, ONE AT A TIME, two seconds apart, at `-probesize 65536` so it reads a
  header rather than half a recording: **26 of 26 answered**, including a 990 MB
  AVI (52 min) and a 225 MB MPEG program stream (4 min). They live in
  `demo/resources/durations.json`, `build-corpus.mjs` merges them, and
  `corpus.json` now carries `durationMs` on those 26 rows and a `durations`
  block saying who measured them and when.
  ⚠️ MERGED THROUGH THE GENERATOR WITH `--offline`, which asks no source
  anything: MEASURED byte for byte identical to the committed file apart from
  its timestamp, then 26 rows changed and every change was the new field alone.
  ⚠️ AND `/tapes/` USES THEM: the run is drawn at its real length in the first
  frame and the page opens no media elements at load. It was twenty-four
  `preload = 'metadata'` requests to archive.org on every visit, correcting the
  picture over the following seconds. 24 of 24 measured, 1.2 to 13.8 minutes.

- ✅ **DONE. THE LOOPING UI IS GLOBAL AND `/tapes/` HAS IT.** Asked as *"make it
  use same looping ui as radio (make it global)"*. `demo/shell/looper.mjs` owns
  the ring, the kept buffer, the mirror, the voice, the head fraction and the
  button that cycles → ← ⇆; `/radio/` lost 222 lines to it and `/tapes/` gained
  the whole instrument. MEASURED: radio **48/48** against the stand-in and tapes
  **37/37**, with the tape's own check proving backwards is the same samples
  mirrored (4 of 4) and a sabotage of `reversedCopy` taking it red.
  ⚠️ `/tapes/` keeps the FIRST LAP off the tape and plays every lap after it off
  the ring, because a media element has no negative playback rate.

- ✅ **DONE. THE DRAWN TAPE HEIGHT IS GRADED, IN PIXELS.** The 2026-09-15 ask
  *"add 2x height to timeline (same tape h)"* was implemented and graded by
  nothing. The check scans the canvas for the tallest run of ink inside the lane
  rather than re-deriving `height - barPad * 2`, which would have been comparing
  an answer with itself: **22 px of tape over 122 columns in a 64 px lane**, and
  `barPad: 8` takes it to 48 px and red.

- ✅ **DONE. `/tapes/` SAYS IT IS LOADING, AND THE PICTURE MOVES ITSELF.** Asked
  as *"Loading on entry, selfmiving zoom"*. The name line says `finding the
  recordings` until there is something to name, the strip pulses until it has
  bars, and once the run is known the window opens on the WHOLE two and a half
  hours and closes onto an hour over 1.2 s, then slides along with the tape and
  stops at both ends of the run. MEASURED: **38 frames from 142 minutes wide
  down to 60, 16 of them in between**; a playhead at 118.5 min brings the window
  from -1.2 to 81.2 min. Both stop the instant a hand touches the strip, and
  both go red under sabotage.

- ✅ **DONE, AND IT UNBLOCKED A PAGE NOBODY WAS ALLOWED TO RUN.**
  `demo/fake-station.mjs` is an Icecast mount that is nobody's radio station:
  real MP3 frames, real ICY headers, a real text channel, a `/health` route in
  the relay's shape, paced at 128 kbit/s. `verify.mjs` starts it itself whenever
  `radio` is in the run. **48/48 green with zero bytes from ERR**, which is how
  the looper refactor was graded at all.

- ✅ **DONE. Space between the walk buttons and the scrub knob.** *"add space
  between"*, with a picture of them almost touching. `.tbar-head` is 10 px wide
  and centred on its position, so at 0 it hangs 5 px past the track's left edge
  and at the end 5 px past the right. The row's `gap: 8px` is measured to the
  TRACK, which is invisible, so what was actually between the button and the
  knob was **3 px**. The track now carries `margin: 0 5px`, the knob's own
  radius, so the ink you can see gets the 8 px every other member gets.
  ⚠️ Not a bigger row gap: that gap is shared by every member and was tuned to
  8 to stop the bar wrapping to two rows, so raising it to fix one edge would
  push the rate group onto a second line on the pages that only just fit.
- ✅ **DONE. `buffer` and `lost` are on screen, and they are a PAIR.**
  The readout went four cells to six rather than swapping one out: five is not
  available (`mount()` throws on an odd count) and `moving` was not the weakest
  cell, it just looked like it beside two counters nobody could see.
  `lost` is `underruns + dropped`, what went missing after the stream settled.
  ⚠️ `skipped` is deliberately NOT in it: that is the opening burst trim,
  windowed to four seconds, and it reads 53 on a perfectly healthy start. A
  number that alarms every time is a number nobody reads twice.
  🔴 And `buffer` is the cell that earns its place, because `lost` reads 0 on a
  healthy stream while `buffer` moves the whole time and falls FIRST. A new
  assert grades the distance the old one could not see: `no gap past a 1 s
  buffer` passes at 345 ms and at 990 ms alike. MEASURED on this desktop,
  **515 ms of sound in hand at the tightest against a 112 ms worst gap, 403 ms
  spare**, and 515 is under the 600 ms floor here too, so the iPhone was not
  special and the per-station `floorMs` item below is the right next move.
  It doubles as the plumbing check: `tightest` is written only where the two
  cells are written, so a finite value proves they were fed rather than left at
  one em dash.
- ✅ **FIXED, AND IT NEEDED A MASTER GAIN RATHER THAN ONE MORE WIRE.** `sink`
  was fed by the station's path and the loop's gain while the engine left the
  page by a route of its own, so with the fader hard over to the granulator the
  meter read **0.0000 over a signal that was playing perfectly** and every check
  standing on it passed by measuring nothing. `speakers` is now the one way out
  and the analyser hangs off it alone.
  ⚠️ Graded three ways at once, because each kills a different vacuous pass: the
  meter reads the grains, the station's gain is at zero so the grains are what
  it read, and the same window with the output muted reads under an eighth.
- ✅ **IDA STAYS ON THE RELAY. DECIDED, do not re-litigate.** The agent that
  wired it recommended fetching direct, since IDA has TLS and CORS and needs no
  proxy. Overruled for ONE PIPELINE: `srcOf(id)` is one path for every station
  and nothing branches on which, so a station fetched another way would be a
  second path only one station takes.
  ⚠️ And the hop is not a cost. MEASURED, time to first byte, three runs each:
  relayed 0.185 / 0.325 / 0.256 s against direct 0.397 / 0.447 / 0.444 s. The
  relay is FASTER every time, because Cloudflare's edge is nearer than their
  server. What it does cost is egress: 320 kbit/s is 144 MB per listener-hour.
  Written up in `workers/shout/NOTES.md`.
- ✅ **DONE. Varispeed with inertia on the walk buttons.** Playing: the rate eases
  to a 0.0625 floor over 260 ms, the reel changes at the bottom, and it climbs
  back over 420 ms. Measured from outside: floor at 255 to 265 ms, full speed at
  689 to 693 ms against 680 declared. `preservesPitch = false`, so the pitch
  follows and the speed buttons are varispeed too.
  ⚠️ PAUSED, THERE IS NO ARC AT ALL. Nothing standing still has momentum, and a
  ramp over silence is a control that visibly does nothing while costing two
  thirds of a second. Asserted either side.
  ⚠️ AND INERTIA IS TOLD APART FROM A STALL BY MEASUREMENT: the climb's rate
  curve has a known mean, so the tape it SHOULD have moved is known and compared
  with what `currentTime` actually moved. 0 ms of 289 on a cold reel, 290 to 294
  of 289 when the tape was there.
- ✅ **DONE, and the time was not where the comments assumed.** `await
  audio.play()` was the flake: it settles when the DECODER has started, not when
  playing is allowed, measured 1.1 s warm and **5.9 s cold**, and awaited twice.
  That is CLAUDE.md's "never let sound gate the work" inside this repo's own
  file. Also: the loop check was seeking 20% into a 200 MB archive.org file, so
  a range request stalled `readyState` for up to 12 s; its marks are at the head
  now, where the page has already buffered. Ready time median **3626 to 2472 ms**,
  worst **9189 to 5529**, ten runs each. No check was weakened.
- ✅ **CLEARED, and the diagnosis held.** MEASURED now: all EIGHT stations up,
  `radio` 200 included, plus both IDA channels. It was between Cloudflare's
  edge and ERR for three mounts, exactly as the two-mounts-still-200 control
  said, and it needed nothing from us.
  `/radio/` re-run against the REAL relay is **43/43 green**, naming Radio
  1965 itself rather than falling back, with the tempo lock reading
  `23.00000 whole laps, 0.000 thousandths out`. The presets had only ever been
  verified against a stand-in; they are now verified for real.
  ⚠️ And IDA plays on the DEPLOYED page: 816 frames in, 816 decoded, 0 errors,
  framing `adts`, codec `mp4a.40.2`.
- ✅ **FIXED, AND IT WAS FAR WORSE THAN 32 AND 30.** The shell's two asserts at t+0 disarmed `verify.mjs`'s first-assert wait on EVERY shelled page, so the page reported **2 of 43** and the suite said `13/13 green`. The shell publishes `shellAsserts` now and the harness asks the question it means. 43/43. LESSONS #95.
- ✅ **DONE, and without the clock**, which was cut on instruction (*"jsut back to back tapes"*). The 24 tapes run end to end from nought, each as wide as it really is, one lane declared the way `/loops/` declares its lanes. The `LANES` table, `buildLanes()` and the `packRows` packer are all gone.
- ✅ **DONE. The loop's three marks on the wave.**
- ✅ **DONE. The speed row is gone and replaced.** Not repurposed this time: the
  `0.0625 … 1` lattice came off the transport adapter and a four-cell `loop` row
  took its place, greyed until a loop runs. Each cell is a different MECHANISM,
  not a different number of one: `round` the kept seconds as they arrived,
  `back` the same samples mirrored, `half` the same lap an octave down and
  bit-exact at 768000 samples, `chop` a sixteenth of the lap with the grains
  retuned to it. Three of the four are things a live stream cannot do at all.
  ⚠️ `drift` was REFUSED: a wandering tape cannot be told from a broken clock by
  ear, and it would unpick the tempo lock.
- ✅ **FIXED. The push path was broken in BOTH directions by one missing value.**
  `FCM_TOPIC` was not in `workers/items/wrangler.jsonc` at all, so `announce()`
  threw on every publish AND `POST /subscribe` had no topic to join a device to.
  Nothing had ever been subscribed to a correctly named topic, which is why
  choosing one was safe. It is a `var` rather than a secret: a topic name is a
  public channel name every subscriber must know, and `FIREBASE_SA` beside it is
  the thing that must stay secret.
  MEASURED after: `has_topic: true`, and a probe published into the real room
  came back with **`announced_at=1789484181710`**, the first stamp that room has
  ever carried. Probes cleared; the room hands over empty.
  ⚠️ The name is `positron-items`. Changing it means every device re-subscribes.
- ✅ **Lane label. DONE.** The swatch is now as tall as the text beside it (9 px
  for a name alone, 14 where there is a sub-label under it), the name sits
  higher when it is alone, and it carries the lane's own colour mixed 42% into
  the ink. The name used to be `T.ink` on every lane, so on a strip of six the
  names were six identical greys beside six coloured ticks and joining them up
  was the reader's job.
- ✅ The 14 corpus corrections survive a rebuild. The values live in
  `proto/deck/ingest.mjs` (twelve) and `demo/resources/build-corpus.mjs` (two),
  both generators reproduce them, and three guards refuse rather than drop them.
  Every `proto/aikajana` reference is gone from the two generated files and from
  `proto/deck/verify.mjs`, which had been navigating to a 404.
- ✅ 🔴 And the rebuild found a second, larger defect: the `kurenniemi` ->
  `resources` rename matched BARE WORDS inside `build-corpus.mjs` and corrupted
  twelve string literals, including three record filters and two live host
  paths. A full rebuild returned **285 rows instead of 334**, with Zenodo
  keeping 0 of 28 and archive.org 0 of 15. Repaired; 334 again.
- ✅ `/resources/` reads `when.how` and `when.note`. The date cell says who the
  date comes from and how wide the bracket is, in two short lines; the row says
  what the record is and why its date is not narrower.
- ✅ `/tapes/`: playhead off the map, loaded tape ringed and the rest dimmed, press
  a mark to load, rate control fixed, load blip gated, loop freezes the wave
  instead of rescaling it, labels legible with real padding.
- ✅ `weight`: the sentence across four walls, size from word length, sentence case,
  textarea of three lines, live rebuild on every keystroke, readout removed.
- ✅ Live loop with a blinking button and no scrollbar; frozen waveform playhead;
  both joined on `/radio/` and `/tapes/`.
- ✅ `/radio/`: it now KEEPS the audio and plays it back, measured at the
  destination. Boxes fade in together on first sound. Scope window widened to
  the granulator's buffer, which had been silently dropping the oldest quarter.
- ✅ Diagrams: 1 px border on every kind, less saturated edges, centred ties,
  no hue on a name whose box paints none, no articles in labels, notes name the
  technology, service worker inside the phone, two phones for the fan-out.
- ✅ Tables: `/wire/` and `/items/` on `table.mjs`, no header fill, more padding,
  and the component added to `/kit/` with its negative control.
- ✅ `/kit/`: mounts the shell, 8 asserts, graded by the suite for the first time.
- ✅ `mirror`: hold-to-quit badge, and the LOOK control swapped to `createPicker`.
- ✅ Readouts removed from `items`, `weight`, `wire`.
- ✅ `shout` carries Radio 1965's recordings at `/rec/<name>.mp3`.
- ✅ `NOTES` emptied, both essays moved to `research/`, `/notes/` no longer built.
- ✅ `LESSONS.md` renumbering, and the rule about it.



## Moved out of Open by the audit of 2026-09-18

Struck because the work exists, with the evidence that showed it.

- ✅ **THE LIVE BADGE IS OFF THE ARCHIVE PANEL, 2026-09-18.** MEASURED across
  the three panels: audience `live`, control room `live`, archive empty.
  ⚠️ **NOT RE-WORDED TO `archive`, WHICH WAS THE TEMPTING FIX.** A presence
  badge answers whether the thing feeding the picture is ANSWERING. Nothing
  feeds this one: it is a recording of a show that finished, so there is no
  liveness to report and a re-worded badge would be the same lie in a better
  costume. `left: false` is the panel's own way of saying a slot has nothing to
  put in it, and the footer keeps its other two.

- ✅ **STAGE AND THEATRE OUT OF THE ERR ARCHIVES, 2026-09-18.**
  `research/err-stage-theatre-2026-09-18.md`, 498 lines. **161 requests, all to
  the catalogue, NO MEDIA OF ANY KIND**: no manifest, segment, mp3, mp4 or
  thumbnail, and `vod.err.ee` / `heli.err.ee` / `arhiiv-images.err.ee` were never
  contacted. Spaced 1.8 s, every response cached, and the API refused nothing.
  **10,185 rows harvested complete** in the archive's own `Lavastuslik`
  category (5,609 video, 4,576 audio), dated **1928-07-15 to 2026-09-14** over
  84 distinct years, plus 30,243 or more photos, which is a floor because the
  count saturates.
  ⚠️ **IT IS A DOCUMENT AND NOT A `stage.json`, AND THE REASON IS THE FINDING.**
  The rows were harvested and then measured: only **15.7%** say anything about a
  stage, and `content=etendus` finds MORE theatre in `Kultuur` (2,377) than in
  `Lavastuslik` (1,079), because one holds the productions and the other holds
  the writing about them. There is no honest membership rule, so a corpus file
  would have shipped a set already proved wrong. The recipe that regenerates the
  rows in 22 requests is in the document.
  🔴 **AND THE `keywords` PARAMETER IS INERT, WHICH IS A BROKEN COLLECTOR
  CAUGHT BY ITS OWN TIDINESS.** Ten different theatre terms returned exactly
  30,000 / 10,000 / 10,000 / 10,000. Identical numbers from ten different words
  is not a finding, and a year-bounded control proved it. `category` and
  `content` do work.
  ⚠️ **THE METADATA SHAPE HAS MOVED** since `research/err-archives-2026-08.md`:
  `metadata.technical[]` is now `metadata.data[]` with three groups, and
  `makers` is empty on every audio item.

- ✅ **THE ARCHIVE TIMELINE IS THREE TIMES HIGHER, AND IT IS NOT A RULE,
  2026-09-18.** Four messages settled it: *"Make archive timeline 3x higher"*,
  *"Make it a rule"*, *"Ita ok to have empty space in timelime, def min
  height"*, then *"No rule just min height"*. MEASURED at **50 px** before and
  **150 px** after, which is 3x to the pixel, and the floor is `STRIP_MIN_H` in
  `demo/shell/strip.mjs` rather than a number typed on a page.
  ⚠️ **A FLOOR, NEVER A HEIGHT.** Lanes needing more than 150 still get more, so
  a page cannot clip its own content by asking for it, and the empty space under
  the last lane was explicitly accepted rather than packed out.
  ⚠️ **AND IT IS OPT-IN, WHICH THE MEASUREMENT DECIDED BEFORE THE RETRACTION
  DID.** Every `auto` strip in the project was measured first: kit 44, stage 50,
  draw 68, lanes 72, instrument 100, click 104, loops 116. A blanket floor would
  have reshaped all seven, and `/kit/`'s 44 px specimen is 44 px on purpose.
  🔴 **IT ALSO BROKE A CHECK, AND THE CHECK WAS RIGHT TO COMPLAIN.** `/stage/`'s
  "no black rule between the lanes" assert sampled to the bottom of the canvas,
  found the new empty ground under the last lane and reported a drop of 21.
  `timeline/strip.mjs` now keeps `lanesH` (how far down anything was drawn)
  apart from `contentH` (how tall the canvas is); they were one number until a
  floor existed. The check bounds itself to `lanesH` and reads a drop of 0 over
  63 rows, with its three lanes still present so the subject has not gone
  missing.

- ✅ **LOOP AND RATE ARE OFF THE ARCHIVE TRANSPORT, 2026-09-18.** MEASURED: no
  loop button in the bar, 0 rate buttons. It is play and nothing else.
  ⚠️ **THE TWO CAME OFF IN DIFFERENT PLACES AND THAT IS NOT AN INCONSISTENCY.**
  `loop: false` is the bar's own option, beside `scrub: false` and `time:
  false`. The RATES are not the bar's to refuse: they are the intersection of
  every `caps.rates` its deck's kinds declare, and the bar already draws them
  only when that intersection holds more than one value. So the honest way to
  have none is for the DECK to stop claiming four, which is what its adapter now
  says. A `rates: false` option would have put one fact in two places and let
  them disagree.

- ✅ **THE LOG IS OFF `/stage/`'S AUDIENCE TAB, 2026-09-18.** MEASURED: on the
  audience tab the log reads `hidden: true, display: none`; on the archive tab
  it reads `display: grid`. The other two tabs keep it, because they are worked
  by the person running the show, who is who a log is for.
  🔴 **AND `hidden` ALONE DID NOTHING, WHICH IS THE PART WORTH KEEPING.**
  `.pos-log` sets `display: grid`, and ANY author rule beats the browser's own
  `[hidden]`, so setting the property would have left a log on screen and a flag
  that reads as set. `.pos-glue[hidden]` already existed three hundred lines up
  in the same stylesheet for exactly this reason. `.pos-log[hidden]` now does
  too, at (0,2,0) so it cannot lose to `.pos-log`.
  ⚠️ **THE FIRST `go()` IS QUIET, SO `onPick` DOES NOT FIRE ON LOAD.** The page
  opens on the audience tab, so leaving the initial state to the callback would
  have shown the log to exactly the reader it is being taken from until they
  touched a tab. It is applied once by hand.

- ✅ **GLUE IS OUT OF THE DOCS AND THE FOUR REAL ONES ARE GLUED, 2026-09-18.**
  Asked as *"i see no poiint in glue, it looks off and pointless in docs. just
  glue the 4 we have properly"*, and the four were CONFIRMED rather than guessed
  before any of it was written.
  The `/kit/` section is gone, along with its two grey specimen boxes reading
  `a block` and `and another` and the `.kit-glue-demo` rule that styled them. It
  demonstrated the mechanism and none of the reason for it, which is what made
  it read as furniture. `node demo/verify.mjs kit` is **45/45 before and after**,
  so removing it moved no button the harness presses by position.
  The four, each LOOKED AT rather than assumed, because the complaint was
  visual: `/stage/` archive (bar + strip, already done), `/radio/` (bar + scope),
  `/replay/` (bar + strip), `/tapes/` (scope + bar). 52/52, 60/60 and 45/45
  green across them.
  ⚠️ **`/tapes/` IS THE SCOPE AND THE BAR, NOT THE STRIP AND THE BAR.** Its
  strip runs edge to edge past the page margins while the scope and bar are
  inset, so a box round the strip and the bar would have to reconcile two widths
  and put its seam across a block the tape's own picture already crosses.
  ⚠️ **AND `createGlue` PUTS NOTHING ANYWHERE.** It re-parents its blocks into a
  box and hands the box back, so a page that only calls it loses both blocks off
  the page. Every one of these captures its anchor BEFORE the call, because a
  node read after it can already be detached and `insertBefore` throws on that.

- ✅ **THE FIVE BLACK KEYS ARE WHERE A PIANO PUTS THEM, AND THIS LINE OUTLIVED
  THE WORK BY A DAY.** The move landed in `8bdd489` on 2026-09-17 and was never
  struck off. VERIFIED BY MEASUREMENT 2026-09-18 rather than by reading the
  diff: `SHARP_OFF` keys off the PITCH CLASS as §4.1 asked, `--k-off` is
  consumed by `shell.css`, and `/kit/` reports the narrowest white strip at
  **27.0 px, 0.551 of a white key**, against 0.401 when the keys were centred
  and 0.439 in GarageBand. That is the predicted 27.00 to the digit.
  ⚠️ **THE STACKING ASSERT WAS RE-DERIVED TOO, AND BETTER THAN ASKED.** The
  worry was that it sampled symmetrically about the join and so could not see
  the change. What shipped does not measure a centre at all: it measures the
  STRIP a finger lands on between two black keys, which is the quantity the
  offsets exist to change. Its own comment records the old centred-on-join
  assert going red at 7.33 px, so it is a check proved against both states
  rather than against one.

- ✅ **`/stage/` IS BUILT AND THIS LINE OUTLIVED IT BY A DAY.** Every clause of
  the dictated spec is met and MEASURED: three tabs, three panels each showing
  the same generated test picture, `node demo/verify.mjs stage` at **21/21**
  including `three panels, one for each tab` and `the fullscreen button is
  square, 34.0 by 34.0 px`. The sentence that ENDED MID-WAY, *"Make a generic
  component with"*, was answered without being guessed at: it is
  `demo/shell/video-panel.mjs`, with l/c/r slots, `left` defaulting to presence,
  `right` to a square fullscreen button, an empty centre, and `FULL_MODES =
  ['hover', 'footer', 'bare']` covering the two modes the message did describe.
  ⚠️ And `tabs.mjs` finally has its first real use, which the entry correctly
  predicted was the test that component had never had.

- ✅ **THE GMAIL HTML HALF WAS ALREADY FIXED, AND THE REAL FINDING IS THAT
  NOTHING GRADED IT. SETTLED 2026-09-18 BY CAPTURING THE MESSAGE.** The raw of
  both real messages was pulled from the sender's own mailbox and they are now
  fixtures, byte for byte, at 542 and 539 bytes (Gmail's own size estimate for
  each). Run against the SHIPPED `firstText`, the 19:54:32 message returns
  exactly `hello!`. So the room entry was written by the build BEFORE the repair:
  the two messages are two minutes apart, the deploy went out between them, and
  the 19:56 message came out clean and labelled while the 19:54 one did not.
  ✅ **AND THAT IS NO LONGER AN INFERENCE.** `wrangler deployments list` on
  2026-09-18 reports the previous deployment created at **19:55:59.807Z**, which
  falls between the two messages (19:54:32 and 19:56:17). The reasoning from the
  fixtures and the deploy record agree, and they were arrived at independently.
  ⚠️ **THE LESSON WAS THE ONE THE ENTRY PREDICTED, IN A PLACE NOBODY LOOKED.**
  `firstText` lived inside `index.js` beside a `fetch` and a WebSocket, so
  nothing could import it and it had ZERO asserts, while `spam.mjs` next door had
  51. It is `workers/mail/src/body.mjs` now, graded by 8 body fixtures and a
  sweep asserting that no message hands back any part of its own envelope. The
  suite is **75/75**, up from 51.
  ⚠️ AND THREE REAL DEFECTS CAME OUT OF WRITING THE FIXTURES, none of which the
  room had shown: a nested `multipart/mixed` (an attachment) handed the whole
  inner structure back as the person's words, a message with no closing
  delimiter lost its only part to `slice(1, -1)`, and a message whose line
  endings had been normalised to LF matched no `\r\n\r\n` and returned its own
  headers as the body.

- ✅ **A SUBJECT FROM OUTSIDE ENGLISH IS DECODED AND DEPLOYED, 2026-09-18.**
  RFC 2047 in `workers/mail/src/body.mjs`: both encodings, adjacent words joined
  with no space added between them, and charsets that are not UTF-8. Graded on
  the exact string from the entry above this one, `=?utf-8?B?a8O1aWdlIGjDpHN0aQ==?=`,
  which now reads `kõige hästi`.
  ⚠️ **THE BODY WAS BROKEN THE SAME WAY AND THE ENTRY DID NOT SAY SO.** A subject
  is MIME-encoded because the alphabet forced it, and the same message's BODY
  arrives `quoted-printable` or `base64` for the same reason, so decoding only
  the subject would have left `K=C3=B5ige h=C3=A4sti` under a heading that now
  reads correctly. Both halves are decoded and both are fixtures.
  ⚠️ **AND A DECODED HEADER IS FLATTENED TO ONE LINE.** A subject is the first
  line of a note whose other lines are the body, so an encoded word carrying a
  newline could forge a line of our own output. That is the only place in this
  worker where a stranger's text reaches a structured format, and there is an
  assert that plants exactly that and requires it not to work.
  ✅ **DEPLOYED 2026-09-18** as version `50a78731` at 100%. This entry carried a
  red line saying it was in the repo and not on the edge, which was true for
  about an hour and then was not.

- ✅ **THE VERDICT SAYS WHICH SIGNAL DECIDED IT, DEPLOYED 2026-09-18.**
  `auth.via` already held the answer and went only to `console.log`, where nobody
  was looking. It is a chip now: `[ok · via Authentication-Results]` against
  `[ok · via ARC]`, so the four characters that could not tell the two apart have
  become a label that says which. Graded with the negative control that gives it
  meaning: a fixture with a real stamp and one with only a forwarded ARC set must
  come out DIFFERENT, and a message with no stamp at all must name no source
  rather than invent one.
  ⚠️ **IT IS EMITTED ON THE ORDINARY CASE TOO, BREAKING THIS FILE'S OWN RULE
  ABOUT CHIPS ONLY WHERE THEY BEAR ON THE VERDICT, AND THAT IS DELIBERATE.** A
  chip that appears only in the interesting case cannot be told apart from a
  build that does not have the chip yet, which is the identical argument that put
  `[ok]` on ordinary mail to begin with.
  ⚠️ **WHAT IS STILL NOT KNOWN IS WHAT DECIDED THE 19:56 MESSAGE.** That cannot
  be recovered from here: the room holds only the label, and the sender's copy
  carries no `Authentication-Results` because the receiving side adds it. The
  worker's own log for that delivery would answer it and observability is on.
  The next message answers it by itself.

- ✅ **INCOMING EMAIL AT `positron@positron.studio` IS BUILT, DEPLOYED AND
  RECEIVING. THE MOST STALE LINE IN THE FILE.** It said *"nothing is built and
  no DNS or zone setting has been touched"*. `workers/mail/` is a complete Email
  Worker routing mail into the feedback room over the relay, graded **75/75** on
  20 spam fixtures and 8 body fixtures, live as version `50a78731`. The proof it
  receives is elsewhere in this same file: the two real messages that arrived at
  19:54:32 and 19:56:17 on 2026-09-17, which three other entries reason about.
  ⚠️ **AND THE QUESTION THE ENTRY CALLED LOAD-BEARING WAS ANSWERED**, in
  `wrangler.jsonc`'s own header, quoting the ask: *"I just need an email address
  people can contact. That's it. And uh, the agent should be reading it"*. What
  it is for is the feedback room, and that is why there is no second store.

- ✅ **THE TWO VERBS ARE WRITTEN AND NEITHER HAS MET A JACK SERVER
  (2026-09-18).** `jack.graph` reports `jack_lsp -c` as structure, a `pgrep -cx`
  count of the five processes that make the sound, jackd's own command line,
  what the box BELIEVES is running, and the chain it should have against the one
  it has (`want`, `missing`, `extra`, `intact`). `jack.rebuild` patches the
  DIFFERENCE and nothing else. Both answer in their own names, because
  `audio.status` answering `audio.started` cost nine seconds and a false
  conclusion that no board was in the room.
  ⚠️ **THE SHARING DECISION, WRITTEN DOWN IN `rig/board/README.md`:** the board
  cannot see a listener (the relay forwards verbatim, `webSocketClose()` is
  empty, a page holding PCM says nothing), so the rebuild is a diff that runs
  zero commands on a healthy graph, kills no process, says out loud who else is
  in the room when it does cut a link, and refuses on `onlyIfIdle: true`. A
  SERVICE restart is deliberately still not a verb: `audio.stop` then
  `audio.start` already does that, at about thirteen seconds of silence for
  everybody.
  ⚠️ **UNVERIFIED.** No ssh from here, so nothing has been run against real
  `jack_lsp` output. `node rig/board/test.mjs` is 92/92 with 25 new checks on the
  parse and the chain against `fixtures/jack-lsp-c.txt`, and two deliberate
  sabotages take it to 88/92 and 90/92. What is still open: that this board's
  real `jack_lsp -c` parses as the fixture does, and that a real `jack_connect`
  repairs a real drift. Deploy with `rig/board/push.sh` and confirm with the md5s
  it prints, which now cover `jacksynth.mjs` as well as `board.mjs`.
