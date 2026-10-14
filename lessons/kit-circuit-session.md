# Kit lessons: circuit-session

The longer comments cut from `demo/shell/circuit-session.mjs` and `demo/shell/circuit-session-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-circuit-session.md#<anchor>`.

<a id="header"></a>

## `circuit-session.mjs` module header

```text
demo/shell/circuit-session.mjs
The container of a Novation Circuit session: the fifty regions a
`.circuitsession` is made of, and a rebuild that has to come back byte
identical.

🔴 NOTHING HERE SENDS ANYTHING ANYWHERE. There is no Web MIDI, no
`requestMIDIAccess`, no output port, no SysEx frame and no network call, and
that is a safety property rather than an omission. Putting a session back on
the Circuit is one of the three operations that replace an instrument with no
factory reset, and `New Pack.circuitpack` is the backup of that instrument.
`rebuild()` returns an array in memory and the only thing that can be done
with it here is to compare it against the array that came in.
`circuit-session-test.mjs` asserts the absence twice: once over the exported
names, the way `circuit-patch-test.mjs` does, and once over this file's own
source text, because a name test cannot see a call inside a function.

🔴 THE MODEL IS A FIXED GRID, NOT A RUN LENGTH SCAN, AND THAT IS A CORRECTION.
`research/circuit-session-format-2026-09-21.md` §1 maps the file by finding
every run of `0xFF` sixteen bytes or longer and calling what is between them a
data block. That is a true description of `session_0` and it gives **49 blocks
of 1 x 528, 15 x 452, 32 x 32 and 1 x 848**. MEASURED here: it gives 49 blocks
in **21 of the 32 sessions** and anything from 50 to 332 in the other eleven,
because a scan keyed on the absence of data moves when there is more data.
✅ The grid below does not move. It is the same fifty regions at the same
offsets in all 32, and in all 64 sessions of the two purchased packs as well.
`runs()` still exists, because the published figures are reproduced against it.

🔴 AND THE ROUND TRIP PROVES LESS THAN IT LOOKS LIKE IT PROVES. Any partition
of a file into regions, where each region is stored as its leading data plus a
count of trailing erasure, rebuilds byte identically whatever the boundaries
are. So a green round trip says the partition is COMPLETE and the rebuild is
FAITHFUL. It says nothing about whether these boundaries are the format's
boundaries. The evidence for the boundaries is separate and is in the test:
the offsets are constant across all 32, two independent derivations of the
stride agree, the last region's length is the same in all 32, and the two
synth patch payloads land exactly where the grid says they do.

⚖️ WHAT A FIELD MEANS IS NOT KNOWN AND IS NOT GUESSED HERE. Two things are
decoded by name and both are corroborated against a second source: the four
byte tag and the 32 byte session name, which agrees with `index.json` in
32 of 32. Everything else is offered as bytes at an offset. The experiment
that would settle a field is one export, one change on the Circuit, a second
export and a diff, and it needs a person at the instrument.
```

<a id="grid"></a>

## `circuit-session.mjs` the grid

```text
The fixed grid, measured across all 32 of the owner's sessions.

🔴 THE NAMES `SYNTH` AND `DRUM` ARE A READING AND THEY WERE PUBLISHED AS A
FACT, CORRECTED 2026-09-21. A page showed the sixteen 1,508 byte regions as
`synth 1` through `synth 16` and the owner asked **"five synths??"**, which is
the right question: **a Circuit has TWO synth parts.** Nothing in this module
corroborates the names. What IS corroborated is the opposite: the two real
synth patches are decoded out of the TAIL region by `patchPayloads`, and even
those are marked as a reading at `PATCH_AT`.
⚠️ **IT IS THE FOURTH TIME IN TWO DAYS THAT A LABEL WAS READ AS CONTENT.**
First a name in an index (`User Session`), then a four byte head (`INIT`),
then a unique hash, and now a name this module typed itself. The pattern is
the same each time and the repair is the same each time: say what was
measured, and let the thing that was not measured be visibly absent.
⚖️ **A CANDIDATE READING, MARKED AS ONE.** The counts fit `2 synth parts x 8
patterns` and `4 drum parts x 8 patterns`, which is probably where the names
came from. That is arithmetic that happens to land, not evidence. The
experiment that would settle it is one change on the instrument, one export
and a diff, and it needs a person at the Circuit.
✅ **SO THE KINDS ARE NAMED FOR THEIR STRIDE AND FOR NOTHING ELSE.** `wide`
is the 1,508 byte stride and `narrow` is the 720 byte one. Both names are
true by construction and neither can be mistaken for a part of an
instrument.
```

<a id="narrow-at"></a>

## `circuit-session.mjs` NARROW_AT

```text
⚖️ THE 76 IS DERIVED, NOT CHOSEN. The first data block of a clean session is
528 bytes and every other one is 452, and 528 less 452 is 76. That is the only
offset which makes the first record the same length as all the others, and
76 + 16 x 1508 lands on 24204, which is exactly where the 720 stride begins.
⚠️ It is still a place to draw a line rather than a documented header length.
The same bytes partition identically if you call the first region 1584 long
and have fifteen records after it. Nothing here depends on which reading is
right, because the bytes are the same either way.
```

<a id="tag-at"></a>

## `circuit-session.mjs` TAG_AT

```text
🔴 A TAG DOES NOT TELL A BACKUP FROM A BLANK AND IT WAS PUBLISHED AS IF IT
DID. `INIT` is on both sides: three of the owner's own sessions say `INIT`
and so do all 64 purchased blanks. `circuit-patch-test.mjs` already carries
that correction and this module inherits it.
```

<a id="magic-at"></a>

## `circuit-session.mjs` MAGIC_AT

```text
⚖️ TWO BYTES THAT ARE `DC BB` IN ALL 32 OF THE OWNER'S SESSIONS AND `00 00`
IN ALL 64 BLANKS. MEASURED, on 96 files. Calling it a signature or a format
version is a reading, and what is a fact is that it separates the two sets
cleanly where the tag does not.
```

<a id="name-at"></a>

## `circuit-session.mjs` NAME_AT

```text
The session name, 32 bytes of space padded ASCII.
✅ CORROBORATED AGAINST A SECOND SOURCE: decoded from the bytes it agrees with
the name `index.json` gives for the same file in 32 of 32.
```

<a id="patch-at"></a>

## `circuit-session.mjs` PATCH_AT

```text
The final region holds two synth patch payloads in the same 340 byte layout
`circuit-patch.mjs` decodes, at these offsets inside it.
✅ MEASURED rather than assumed: the two names sit 340 apart, every one of the
64 payloads has its reserved block 18 to 31 zero and not one byte above 0x7F,
and **10 of the 64 are byte identical to a `patches/patch_*.syx` payload in
the same pack**.
⚖️ That they are synth 1 and synth 2 in that order is a reading. What is
measured is that there are two of them and that they decode.
```

<a id="rebuild"></a>

## `circuit-session.mjs` rebuild

```text
Put a session back together out of the model.

🔴 IT REBUILDS RATHER THAN COPIES, WHICH IS THE WHOLE POINT. Nothing in here
reads the buffer that was parsed: the output is each region's `data` followed
by `pad` bytes of erasure, in the order the model holds them. A region moved,
a `pad` wrong by one or a byte changed in `data` all come out as a different
file, and the test proves each of those three by doing it.

@param {{slots:{data:Uint8Array, pad:number}[]}} session
@returns {Uint8Array}
```

<a id="census"></a>

## `circuit-session.mjs` census

```text
The byte census, over the WHOLE file.
⚠️ AND THAT IS THE TRAP THIS FILE WAS CAUGHT BY ONCE. Four fifths of a session
is erased flash, so any share taken over `length` measures the erasure and not
the session. `payload` is the denominator for a statement about content.
```

<a id="runs"></a>

## `circuit-session.mjs` runs

```text
The run length reading the research published: every run of `ERASED` at least
`min` long is padding, everything between two of them is a block.
⚠️ IT IS DATA DEPENDENT. 49 blocks in 21 of the owner's 32 sessions, one block
in a purchased blank, 332 in the busiest one. Kept so the published figures
can be reproduced, and not used as the model.
```

<a id="wideslots"></a>

## `circuit-session.mjs` summarise: wideSlots

```text
⚠️ NAMED FOR THE STRIDE, NOT FOR A PART OF AN INSTRUMENT. See the note on
the grid above: these were `synthSlots` and `drumSlots` and a page printed
sixteen synths on a machine that has two.
```

<a id="note-data"></a>

## `circuit-session.mjs` STEPS: note data

```text
🔴 A `wide` REGION HOLDS SEQUENCER NOTE DATA, AND THIS IS THE FIRST THING
THIS MODULE HAS EVER BEEN ABLE TO SAY ABOUT WHAT A REGION HOLDS. Asked
2026-09-21: *"can we get note data out of regions?"*, and then, against a
page still printing *"what they hold is not known"*, *"where is note data?"*.

✅ TWO INDEPENDENT IMPLEMENTATIONS AGREE TO THE EVENT: **5,095 note events**
across the owner's 32 sessions, **0** across all 64 purchased blanks, and
`session_0`'s first event is note 55 with gate 2 and velocity 41 in both.
`research/circuit-session-notes-2026-09-21.md` has the whole derivation.

⚠️ THE 28 WAS FOUND BLIND, BEFORE ANY RECORD WAS READ. Matching byte `i`
against byte `i + L` over all 512 of the owner's wide regions puts the top
four lags at 56, 112, 84 and 28, which are the four multiples of 28, against
a 68.03 per cent baseline over all 128 lags.

🔴 AND A CONSISTENCY SCORE ON ITS OWN IS A LIAR, WHICH IS WHY NOTHING HERE
RESTS ON ONE. Strides 56, 112, 224 and 448 all BEAT 28 and are multiples of
it that read one record in two, four, eight or sixteen: **they score better
by finding less.** Four origins at stride 28 score a perfect 100 per cent
with zero events, because they land on bytes that are always zero. What
carries the claim is the YIELD against the controls: random bytes score
11.08 per cent on the mask test, and the owner's own sessions with every
non-erasure byte SHUFFLED score 18.99, against 99.62.
```

<a id="velocity-at"></a>

## `circuit-session.mjs` VELOCITY_AT

```text
⚖️ WHERE VELOCITY LIVES, SELECTED BY HEADER BYTE 8, AND THE SECOND SOURCE IS
A GENUINE ROSETTA STONE THAT WAS SITTING ON THIS DISK.
`purchased/Ghostly Intro.circuitsession` is **byte identical** to the owner's
`session_17`, and `Ghostly Intro (2)` is a different file with the same name.
Byte 8 is `0x07` in the first and `0xFF` in the second, and **the two decode
to the same music**: 31 note events each, note number and velocity agreeing
on 31 of 31, read out of different bytes.
⚠️ MEASURED ACROSS BOTH PACKS: the owner's 32 are `0xFF` 24 and `0x07` 8, and
all 64 blanks are `0x00`. So it is a third byte that separates the two packs,
after the marker and the yield.
⚠️ AND IT IS A READING OF WHAT THE BYTE SELECTS, not of what it MEANS. No
firmware was consulted and no instrument was in the loop.
```

<a id="notesin"></a>

## `circuit-session.mjs` notesIn

```text
Every note event in a session, in region then step then slot order.

🔴 IT READS THE MASK AND NEVER THE NOTE BYTES, AND THAT IS NOT A STYLE
CHOICE. 31 records of 8,192 carry a popcount ONE BELOW their filled slot
count, and the popcount is never greater, 8,192 of 8,192. The reading is a
stale note byte left in a freed slot, and a decoder that counted non-zero
note bytes instead would invent those 31 events.

⚠️ IT DECODES AND IT CANNOT WRITE. Like everything else in this file: no
message is built, nothing is sent, and a writer is deliberately absent,
because one that emitted only what it understands would destroy everything
else in the file.

@param {ArrayBuffer|Uint8Array} buf  a whole session
@returns {{region:number, step:number, slot:number, at:number,
           note:number, gate:number, velocity:number}[]}
```

<a id="stepgrid"></a>

## `circuit-session.mjs` stepGridLooksRight

```text
⚠️ THE SHAPE CLAIM, SO A CALLER CAN REFUSE A FILE RATHER THAN READ NOISE OUT
OF IT. Bytes 2 and 3 of every step record are zero in 8,192 of 8,192 of the
owner's records and in 16,384 of 16,384 blanks, and in **0 of 2,048** records
of random bytes. It is the cheapest thing that tells a session from a file
that merely happens to be 53,248 bytes long.
```

<a id="test-header"></a>

## `circuit-session-test.mjs` test header

```text
demo/shell/circuit-session-test.mjs
The session container, against the real pack, with no browser.

  CIRCUIT_PACK=<path> node demo/shell/circuit-session-test.mjs

🔴 IT IS GRADED AGAINST AN IMPLEMENTATION THAT NO LONGER EXISTS, WHICH IS THE
ONLY GRADING WORTH HAVING HERE. Every figure in the first section was measured
in Python on a different day and published in
`research/circuit-session-format-2026-09-21.md` §1 before this module existed,
so reproducing one is two independent implementations agreeing about one real
artefact. Where they DISAGREE the disagreement is kept and named rather than
tuned away, and there is one of those: the 49 block map is true of `session_0`
and of 21 of the 32 sessions, not of all of them.

🔴 AND THE ROUND TRIP IS THE DELIVERABLE, SO IT IS SABOTAGED FOUR WAYS. A
`rebuild()` written as `return bytes` passes a round trip trivially and proves
nothing, so this file breaks the writer on purpose and counts what goes red.
One of those sabotages leaves the round trip GREEN, which is the honest answer
to what it can and cannot prove, and it is reported rather than hidden.

🔴 AND IT READS THE OWNER'S CIRCUIT PACK (CIRCUIT_PACK=<path>, from
the owner's private pack repository), THE ONLY BACKUP OF THEIR SESSIONS. Reading is free
and nothing here writes, sends or touches a port.
```

<a id="test-76"></a>

## `circuit-session-test.mjs` test: the 76

```text
🔴 THE TWO ARITHMETIC FACTS THE 76 RESTS ON. 528 less 452 is 76, and 76 plus
sixteen strides of 1508 lands exactly on the offset where the 720 stride
begins. If either were off by one the grid would not close on 53,248.
```

<a id="test-9180"></a>

## `circuit-session-test.mjs` test: 9,180 and 9,179

```text
🔴 THE FIGURE THAT LOOKED LIKE A DISAGREEMENT AND IS TWO DEFINITIONS OF ONE
WORD, WHICH IS THE SAME SHAPE AS THE `slot 15` ONE IN `circuit-patch-test.mjs`.
The research says "of the 9,180 non-0xFF bytes, 2 are above 0x7F". 9,180 is
the BLOCK TOTAL and the non-0xFF count is 9,179, because exactly one 0xFF byte
sits inside a block in a run too short to be padding. Both numbers are right
and they are not the same number, so both are asserted here.
```

<a id="test-whole-file"></a>

## `circuit-session-test.mjs` test: whole file count

```text
⚠️ THE CORRECTION THE RESEARCH OPENS WITH, REPRODUCED, BECAUSE IT IS THE
DENOMINATOR LESSON AND NOT A DETAIL. Over the whole file the same count is
44,071 and it measures the erasure.
```

<a id="test-49-blocks"></a>

## `circuit-session-test.mjs` test: 49 blocks

```text
🔴 THE ONE PUBLISHED FIGURE THAT DOES NOT HOLD FOR ALL 32, AND IT IS A FINDING
RATHER THAN SOMETHING TO TUNE. The 49 block map is presented under a heading
about the container. It is a description of ONE file.
```

<a id="test-pooled"></a>

## `circuit-session-test.mjs` test: pooled strides

```text
🔴 AN INDEPENDENT DERIVATION OF THE SAME STRIDES, POOLED OVER ALL 32 RATHER
THAN READ OFF ONE FILE. Take every offset where a run of 0xFF ends and data
begins, keep only the offsets where that is true in ALL 32, and look at the
gaps. If the grid were an artefact of `session_0` this would disagree.
```

<a id="test-model"></a>

## `circuit-session-test.mjs` test: model not copy

```text
🔴 THE PROOF THAT IT IS A MODEL AND NOT A COPY. Parse, then scribble over
the ORIGINAL buffer, then rebuild. If `rebuild` read the buffer at all the
output would carry the scribble. It does not, because the model holds
copies.
```

<a id="test-name"></a>

## `circuit-session-test.mjs` test: session name

```text
✅ TWO INDEPENDENT SOURCES, WHICH IS THE ONLY REASON THIS ONE IS A FACT AND
NOT A READING. The name in the bytes was decoded here; the name in
`index.json` was written by Novation Components. They can disagree.
```

<a id="test-tempo"></a>

## `circuit-session-test.mjs` test: tempo and swing

```text
⚖️ INFERRED AND SAID TO BE, IN THE SAME BREATH AS THE MEASUREMENT. What is
MEASURED is that byte 48 takes ten values across the 32 sessions, all between
69 and 158, with 120 in 23 of them, and byte 49 takes seven values between 50
and 60 with 50 in 25. What is INFERRED is that these are the tempo and the
swing: the Circuit's tempo runs 40 to 240 with 120 as its default and its
swing runs 20 to 80 with 50 as its default, both readings fit every value, and
the mode of each is its default. NOTHING CONFIRMS IT. The experiment that
would is one export, one tempo change on the instrument, a second export and a
diff, and it needs a person at the Circuit.
```

<a id="test-reserved"></a>

## `circuit-session-test.mjs` test: patch reserved block

```text
🔴 THE CHECK THAT SAYS THESE REALLY ARE PATCHES AND NOT A COINCIDENCE OF
ASCII. `circuit-patch-test.mjs` asserts of the 64 `.syx` payloads that
addresses 18 to 31 are zero and that no byte is above 0x7F. Both hold here
too, on bytes this module found by arithmetic rather than by looking.
```

<a id="test-identical"></a>

## `circuit-session-test.mjs` test: identical patches

```text
✅ AND THE STRONGEST ONE: TEN OF THEM ARE BYTE IDENTICAL TO A PATCH FILE IN
THE SAME PACK. That is the container model and the patch module agreeing about
bytes neither of them was pointed at.
```

<a id="test-init"></a>

## `circuit-session-test.mjs` test: INIT slots

```text
🔴 `CLAUDE.md` SAYS `32 DISTINCT FINGERPRINTS OF 32, NOT ONE A COPY OF
ANOTHER` AND USES THAT TO SAY ALL 32 ARE REAL WORK. The count is true and the
conclusion does not follow, because a ONE BYTE delta produces a distinct
fingerprint. It is the third time this lesson has arrived: a name was not
evidence, then a four byte head was not evidence, and now a unique hash is not
evidence either.
✅ AND `circuit-patch-test.mjs` SAYS THIS CANNOT BE SETTLED WITHOUT THE STOCK
TEMPLATE, WHICH IS NOT IN THIS REPOSITORY. IT CAN. Comparing the three INIT
slots against EACH OTHER needs no template at all, and the separation is
enormous: one byte between them, 415 bytes between the closest pair of the
other 29.
```

<a id="test-closest"></a>

## `circuit-session-test.mjs` test: closest pair

```text
🔴 THE FLOOR, WHICH IS THE HALF THAT MAKES ONE BYTE MEAN ANYTHING. Without
it, "one byte apart" is a number with nothing to be small compared to.
```

<a id="test-29"></a>

## `circuit-session-test.mjs` test: 29 of 32

```text
🔴 AND THE CONCLUSION THAT MUST TRAVEL WITH IT. The correction is 32 to 29.
It is not `some of these are disposable`. The owner said `user sessions are
mine. very important` and this pack is still the only backup of 29 of them.
```

<a id="test-blanks"></a>

## `circuit-session-test.mjs` test: blanks

```text
🔴 AND THEY ARE PADDED WITH 0x00, NOT 0xFF, WHICH IS A FACT THE MODEL HAS TO
SURVIVE RATHER THAN ASSUME. A blank holds 36 non-zero bytes: the four byte
tag and 32 spaces where the name goes. Nothing else.
```

<a id="test-dcbb"></a>

## `circuit-session-test.mjs` test: DC BB

```text
🔴 A NEW DISCRIMINATOR, AND IT IS STRONGER THAN THE ONE THAT WAS PUBLISHED.
`CLAUDE.md` and the research both offered the first four bytes, and
`circuit-patch-test.mjs` already corrected that: INIT is on both sides.
DC BB at offset 4 is on one side only, measured over 96 files.
```

<a id="test-guard"></a>

## `circuit-session-test.mjs` test: erasure start guard

```text
⚠️ THE LENGTH GUARD IS NOT DECORATION. Without it this check reads GREEN on
a truncated file, because `every` over an empty array is true. It was
written without the guard, the truncation sabotage took 9 red instead of 10,
and the missing one was this.
```

<a id="test-sabotage-1"></a>

## `circuit-session-test.mjs` test: sabotage 1

```text
🔴 SABOTAGE 1: A TRUNCATED FILE.
⚠️ IT TAKES 9 OF 11 AND NOT 11, AND BOTH SURVIVORS ARE CORRECT TO SURVIVE,
WHICH IS WHY THEY ARE NAMED HERE RATHER THAN QUIETLY COUNTED. The 1,024 bytes
cut off the end were erasure, so the erasure still starts at 48,092 and four
fifths of what is left is still erasure. Both statements are true of the
truncated file. A check that went red on either would be measuring the length
and calling it a share.
```

<a id="test-sabotage-2"></a>

## `circuit-session-test.mjs` test: sabotage 2

```text
🔴 SABOTAGE 2: THE 0xFF RUNS REMOVED. Two readings of "removed" and both are
worth doing, because they take different things red.
```

<a id="test-erasure-replaced"></a>

## `circuit-session-test.mjs` test: erasure replaced

```text
🔴 AND THIS IS THE ONE THAT MATTERS. Replacing the erasure rather than
deleting it leaves the length, the grid, the header and THE ROUND TRIP
green. It is not a hole to fix: any partition that stores data plus a count
of regenerated padding rebuilds whatever it is given. It is the boundary of
what a round trip can prove, and it is why the structural claims above exist.
```

<a id="test-sabotage-3"></a>

## `circuit-session-test.mjs` test: sabotage 3

```text
🔴 SABOTAGE 3: A BLOCK MUTATED. First in the model, which is the one that
grades the writer, then in the file, which grades the battery.
```

<a id="test-sabotage-4"></a>

## `circuit-session-test.mjs` test: sabotage 4

```text
🔴 SABOTAGE 4: THE WRITER BROKEN FOUR WAYS. Each one is a different thing the
model could get wrong, and each has to come out as a different file.
```

<a id="test-region-moved"></a>

## `circuit-session-test.mjs` test: region moved

```text
🔴 A REGION MOVED, AND THE FIRST ATTEMPT AT THIS WAS NOT A SABOTAGE AT ALL.
It swapped drum regions 20 and 21 and the output came back IDENTICAL, which
read as a broken writer and was nothing of the kind: most drum regions in
`session_0` hold 32 zero bytes, so swapping two of them changes nothing.
The pair is chosen by looking now, and the fact that they differ is asserted
before the swap, which is the half that makes the result mean anything.
```

<a id="test-sabotage-control"></a>

## `circuit-session-test.mjs` test: sabotage control

```text
🔴 AND THE CONTROL ON THE CONTROLS. A `rebuild` written as `return bytes`
would pass every round trip above and fail every line in this block, so the
block is only worth anything if a correct rebuild still passes.
```

<a id="test-exports"></a>

## `circuit-session-test.mjs` test: exports

```text
🔴 THE EXPORT TEST, THE SAME ONE `circuit-patch-test.mjs` RUNS.
```

<a id="test-source"></a>

## `circuit-session-test.mjs` test: source

```text
🔴 AND THE SOURCE TEST, BECAUSE A NAME TEST CANNOT SEE A CALL INSIDE A
FUNCTION. `rebuild()` returns bytes on purpose, so the export test alone would
not notice a line that handed those bytes to a port.
```

<a id="test-strip"></a>

## `circuit-session-test.mjs` test: strip comments

```text
🔴 THE COMMENTS COME OUT FIRST, AND THAT IS NOT TIDINESS. Written without
this the check went RED on a correct file, because the module's own header
says the words `requestMIDIAccess` and `MIDIAccess` in the sentence
promising it does not call them. That is `CLAUDE.md`'s
`s.includes(<substring>)` rule arriving in a new costume, where `BUILD`
matched inside `REBUILD`. A guard that cannot tell code from prose about
code is not guarding anything.
```

<a id="test-notes"></a>

## `circuit-session-test.mjs` test: note data

```text
── the note data, which is the first thing this module can say a region HOLDS

🔴 EVERY FIGURE HERE IS REPRODUCED FROM A SECOND IMPLEMENTATION. The
derivation is in `research/circuit-session-notes-2026-09-21.md`; this file
grades the decoder that shipped from it, against the real pack and against
the blanks, which is the only pairing that means anything.
```

<a id="test-yield"></a>

## `circuit-session-test.mjs` test: blanks yield zero

```text
🔴 THE CONTROL, AND IT IS THE ROW THAT SEPARATES THE TWO PACKS. The blanks
pass the shape tests trivially because they are zero filled; the yield is
the one number that cannot be faked by emptiness.
```

<a id="test-above-127"></a>

## `circuit-session-test.mjs` test: notes above 127

```text
⚠️ AND 105 NOTE BYTES ARE ABOVE THE MIDI RANGE AND ARE NOT EXPLAINED. Said
out loud rather than filtered away: a decoder that clamped them would hide
the one thing about this format nobody understands.
```

<a id="test-velocity"></a>

## `circuit-session-test.mjs` test: velocity mode

```text
🔴 THE VELOCITY MODE, AND THE SECOND SOURCE IS A FILE ON THIS DISK.
```

<a id="test-note-sabotages"></a>

## `circuit-session-test.mjs` test: note sabotages

```text
⚠️ THE SABOTAGES. A decoder that found notes in anything would pass every
line above, so each of these has to move exactly what it should.
```

<a id="test-planted"></a>

## `circuit-session-test.mjs` test: planted record

```text
🔴 THE NEGATIVE CONTROL THAT MATTERS MOST: a blank with one hand written
record in it must read back exactly what was written, or the decoder is
finding structure that is not there.
⚠️ GUARDED, BECAUSE EVERY OTHER USE OF `blanks` IN THIS FILE ALREADY WAS.
The soundbank is optional and this file says so in three places and then
indexed `blanks[0]` unconditionally here: moving that directory turned a
clean skip into `Cannot read properties of undefined`, which reads as a
broken decoder rather than as an absent file.
```
