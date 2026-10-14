# Kit lessons: circuit-patch

The longer comments cut from `demo/shell/circuit-patch.mjs` and `demo/shell/circuit-patch-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-circuit-patch.md#<anchor>`.

<a id="header"></a>

## `circuit-patch.mjs` module header

```text
demo/shell/circuit-patch.mjs — what is inside a Novation Circuit pack: the
340 address synth patch, and the four numbers that tell a backup from a blank.

🔴 THIS EXISTED ONCE AND WAS NOT KEPT, WHICH IS WHY IT IS HERE.
`research/circuit-soundbank-2026-09-21.md` built a decoder, graded it against
the published `patch_0` at 246 varying fields of 324 exactly, and it lived in
a scratchpad that is gone. `plans/plan-pack-page.md` §4 makes rebuilding it
step one, because a page that decodes inline is the third place in this
repository that knows the format and the first one nothing grades.

🔴 NOTHING HERE PRODUCES BYTES. There is no encoder, no writer and no sender,
and that is a safety property rather than an omission. `Replace Current Patch`
and `Replace Patch` differ by ONE byte at offset 6; the second overwrites a
patch in FLASH on an instrument with no factory reset, and
`New Pack.circuitpack` is the only backup of that flash. The function that
turns an intention into a message does not exist, so it cannot be called by
mistake. `circuit-patch-test.mjs` asserts the absence.

🔴 THE ADDRESS TABLE IS GENERATED, NOT TYPED. Parsed out of 📄 the Circuit
Programmer's Reference Guide v1.1 (Paul Whittington and Jonathan Page,
Novation / Focusrite) read with `pdftotext -layout`, the same method
`circuit-cc.mjs` used, and checked to be 340 contiguous addresses 0..339 with
no duplicates before it was written out. Two rows wrap across two lines in
that document and truncate mid-word, so addresses 91 and 99 are written out by
hand as bitfields and are marked as such below.

⚠️ A `d` HERE IS THE DOCUMENT'S DEFAULT, NOT A MEASUREMENT OF THIS DESK. It is
what tells a parameter somebody moved from one nobody touched, which is the
only thing the detail panel can honestly shade.
```

<a id="commands"></a>

## `circuit-patch.mjs` COMMANDS

```text
🔴 BYTE 6 IS THE WHOLE SAFETY QUESTION ABOUT A `.syx` ON DISK. `00` is a
message that lands in RAM and is forgotten at the next patch change; `01`
overwrites one of the 64 patches in flash. Every one of the 128 loose `.syx`
files in this repository's archive is `00`, measured.
```

<a id="categories"></a>

## `circuit-patch.mjs` CATEGORIES

```text
🔴 SEVEN OF FIFTEEN CATEGORY VALUES HAVE A WORD AND EIGHT DO NOT, AND THE
SEVEN ARE DERIVED RATHER THAN PUBLISHED. 📄 The reference gives
`Patch_Category` a range of 0..14 and no label table at all.
`research/circuit-soundbank-2026-09-21.md` §4.3 recovered these by correlating
the byte against a vendor's own spreadsheet column across 128 patches, with
the agreement counts kept beside each one. The owner's factory bank also uses
5, 10, 11, 12 and 14, and there is no evidence anywhere on this machine of
what those five mean.
⚠️ SO AN UNKNOWN CATEGORY GETS NO INVENTED WORD. `categoryName` returns `''`,
which is `instruments.mjs`'s rule about an unrecognised port arriving here.
```

<a id="macro-destinations"></a>

## `circuit-patch.mjs` MACRO_DESTINATIONS

```text
📄 The 71 macro knob destinations. The Programmer's Reference gives this
parameter a range of 0..70 and NO table at all, and
`research/circuit-soundbank-2026-09-21.md` §8 lists these names as
unobtainable from this machine. They were read off the live DOM of Novation's
own Circuit editor on 2026-09-21.
✅ THE STRUCTURAL FIT IS WHAT MAKES THEM CREDIBLE RATHER THAN PLAUSIBLE:
values 51 to 70 are `Mod Matrix 1` to `Mod Matrix 20`, twenty consecutive
entries landing exactly on the twenty slots this format has, and ending
precisely at the documented maximum of 70.
🔴 AND HOW THEY WERE OBTAINED WAS NOT AUTHORISED. The instrument was
CONNECTED while that page was driven by a script, with `Send to Circuit` in
the header. `plans/plan-circuit-synth-editor.md` opens with the whole account.
The data was re-verified here index by index; the reading was not the problem.
```

<a id="addressof"></a>

## `circuit-patch.mjs` addressOf

```text
The address of a parameter, by the reference's own name.
⚠️ IT THROWS ON A NAME THAT IS NOT THERE. A lookup that answered `undefined`
would be read as byte 0, which is the first letter of the patch name, and a
wrong reading that looks like a reading is this repository's costliest shape.
```

<a id="writesflash"></a>

## `circuit-patch.mjs` writesFlash

```text
🔴 The one fact worth reading before anything else about a `.syx`.
```

<a id="readpatchdata"></a>

## `circuit-patch.mjs` readPatchData

```text
The 340 address payload on its own, with no message wrapped round it.

🔴 THIS EXISTS BECAUSE A SESSION CARRIES TWO PATCHES AND THEY ARE NOT
MESSAGES. `demo/shell/circuit-session.mjs` finds them at offsets 47,300 and
47,640 of a `.circuitsession`, as bare 340 byte payloads, and MEASURED, 10 of
64 are byte identical to a `patch_*.syx` payload in the same pack. Before
this, the only way to decode one was to build a SysEx frame around it, and
**building a message is the first half of sending one**, so that function
deliberately does not exist anywhere in this repository.
⚠️ IT READS, IT DOES NOT MAKE. Everything `summarise`, `patchFields` and
`modSlots` need is `data`, so they all work on a payload unchanged.
⚠️ AND THE MESSAGE FIELDS ARE NOT GUESSED, THEY ARE REPORTED ABSENT. A
payload has no command byte and no destination, so `commandName` is empty and
`writesFlash` is false because a payload cannot write anything: it is not a
message. That is different from a message that happens to be safe.
```

<a id="categoryname"></a>

## `circuit-patch.mjs` categoryName

```text
⚠️ LOWERCASED, because every other word this module returns is a value read
off a table and reads in running prose.  is a category the instrument
offers and is not the same as "we do not know", which is still .
```

<a id="patchfields"></a>

## `circuit-patch.mjs` patchFields

```text
All 340 addresses decoded, for a detail panel.
`changed` is against the document's default, which is what separates a
parameter somebody moved from one nobody touched.
```

<a id="named"></a>

## `circuit-patch.mjs` named

```text
The word for a value where a table exists for it, otherwise ''.
⚠️ KEYED ON THE PARAMETER NAME, NEVER ON THE VALUE'S RANGE. Two parameters
with the same 0..29 range can mean different things, which is the trap
`circuit-cc.mjs` already records about controller numbers on two channels.
```

<a id="summarise"></a>

## `circuit-patch.mjs` summarise

```text
The one row a table shows for a patch.
⚠️ `lfo` IS A FLOOR AND NOT A TOTAL, and the reason is published rather than
hidden: it counts an LFO that reaches something through a mod matrix slot,
and 📄 the reference gives macro destinations a range of 0..70 with NO table,
so an LFO routed only through a macro knob is invisible here. That is
`research/circuit-soundbank-2026-09-21.md` §4.4's own caveat about its
126 of 128.
```

<a id="sessionstats"></a>

## `circuit-patch.mjs` sessionStats

```text
---------------------------------------------------------------------------
The four numbers that tell a backup from a blank.

🔴 THIS IS THE FEATURE THAT EARNS THE PAGE AND IT IS A SAFETY CHECK.
There are three packs on this machine that all display as `*New Pack` in
Novation Components: the owner's own backup, and two purchased ones whose 32
sessions are blanks. MEASURED HERE 2026-09-21, both sides, from the files:

  owner's `New Pack.circuitpack`   32 distinct fingerprints of 32
                                   entropy 0.827 to 1.462 bits a byte
                                   84.57 to 89.58 per cent non-zero
  the two purchased packs          1 distinct fingerprint of 32, each
                                   entropy 0.009, flat
                                   0.07 per cent non-zero

The vendor's install note says to press `Send to Circuit`, which is one of the
three operations that replace the instrument's contents on a box with no
factory reset.

🔴 AND THE FIRST FOUR BYTES ARE NOT THE FOURTH DISCRIMINATOR. THEY WERE
PUBLISHED AS ONE AND THE PACK DISAGREES. `CLAUDE.md`, `plans/plan-pack-page.md`
§2.1 and `research/circuit-soundbank-2026-09-21.md` all said `INIT` against the
owner's `DEMO`. The owner's 32 sessions are **`USER` 22, `DEMO` 7 and `INIT`
3**, so three of somebody's real sessions carry the exact head published as the
blank signature, and all three are ordinary work: entropy 0.87, 86.5 per cent
non-zero, 2,016 payload bytes, distinct fingerprints. **A head of `INIT` would
have condemned three real sessions.** The other three numbers separate the two
packs by two orders of magnitude and are what the check rests on. `head` is
still reported, because it is a fact about the file and a reader should see
that it is the same on both sides.
⚠️ A NAME IS NOT EVIDENCE, and this project got that wrong about these very
sessions once: the ones still called `User Session` were implied to be blanks
and measurement said 32 distinct of 32 with none empty. The head is the same
mistake one layer down, in a field that looks like content.

⚠️ AND ASK WHAT THE DENOMINATOR IS, which is why two size readings are here
rather than one. A session file is four fifths `0xFF` erasure, and a statistic
over the whole artefact measures the erasure: 44,071 high bytes of 53,248 was
published here as *not seven bit* when the real payload was 9,180 bytes of
which two were above 0x7F. `notErased` is that published reading, the bytes
that are not `0xFF`; `payload` is the stricter one, the bytes that are neither
`0xFF` nor `0x00`. MEASURED on session_0: 9,179 and 2,238.
```

<a id="test-header"></a>

## `circuit-patch-test.mjs` circuit-patch-test module header

```text
demo/shell/circuit-patch-test.mjs — the patch decoder, against the real pack.

  CIRCUIT_PACK=<path> node demo/shell/circuit-patch-test.mjs

🔴 IT IS GRADED AGAINST AN IMPLEMENTATION THAT NO LONGER EXISTS, WHICH IS THE
ONLY GRADING WORTH HAVING HERE. `research/circuit-soundbank-2026-09-21.md` and
`plans/plan-circuit-editor.md` published a census of this exact file, computed
by a decoder that lived in a scratchpad and is gone. Every figure below was
written down before this module existed, so reproducing one is two independent
implementations agreeing about one real artefact. That is the `csound.mjs`
lesson applied in advance: a test comparing a decoder against a number derived
from the same formula the decoder implements catches a typo and can never
catch a misreading.

🔴 AND IT READS THE OWNER'S CIRCUIT PACK (CIRCUIT_PACK=<path>, from
the owner's private pack repository), THE ONLY BACKUP OF THEIR SESSIONS. Reading is free
and nothing here writes.
```

<a id="varying"></a>

## `circuit-patch-test.mjs` 324 varying fields

```text
🔴 324 IS 340 DATA BYTES LESS THE 16 THE NAME TAKES. If the module's DATA_AT
or NAME_LEN were wrong by one this number moves, which is why it is here
rather than just the decoded fields.
```

<a id="byte-6"></a>

## `circuit-patch-test.mjs` byte 6

```text
🔴 THE SAFETY READING, AND IT IS THE FIRST THING TO KNOW ABOUT ANY .syx.
```

<a id="eq"></a>

## `circuit-patch-test.mjs` EQ levels

```text
⚠️ "EQ MOVED OFF CENTRE" IS THE RESEARCH'S PHRASE AND IT HAS TWO READINGS.
The three LEVEL bytes off their default gives 21, which is the published
figure; counting the frequency bytes too gives 23. The ambiguity was resolved
by the number matching, so this one assert is weaker evidence than the rest
and says so rather than being quoted as if it were not.
```

<a id="slots"></a>

## `circuit-patch-test.mjs` used and touched slots

```text
🔴 THE ONE FIGURE THAT LOOKED LIKE A DISAGREEMENT, AND IS NOT.
Research §4.2 says "the factory bank reaches slot 15". Under `used`, which is
a depth other than 64, the highest slot this bank reaches is 11. Both are
right: slot 15 carries a destination somebody set and a depth of 64, so it is
ADDRESSED and reaches nothing. The two definitions are kept apart here because
merging them is how a reader gets told an LFO is modulating something when its
depth is zero.
```

<a id="heads"></a>

## `circuit-patch-test.mjs` heads

```text
🔴 THE CORRECTION. `CLAUDE.md`, `plans/plan-pack-page.md` §2.1 and
`research/circuit-soundbank-2026-09-21.md` all published the first four bytes
as a discriminator: `INIT` for a blank against the owner's `DEMO`. This file
says otherwise and it is the file.
```

<a id="init"></a>

## `circuit-patch-test.mjs` INIT sessions

```text
🔴 THIS ASSERT'S CONDITION WAS RIGHT AND ITS SENTENCE WAS WRONG, WHICH IS THE
WORST COMBINATION THERE IS: it read `the three that say INIT are ordinary work
rather than blanks` and passed every time. They are not blanks, and they are
not work either. MEASURED 2026-09-21 against a stranger's pack off the public
archive: one of the three is BYTE IDENTICAL to a stock template that appears
ten times in that pack, and the other two differ from it at exactly one
byte, 0xBBAC. The owner's other 29 differ from it by 262 to 5,412
bytes, a median of 1,524. `index.json` names all three `Initial Session`.
⚠️ SO THE CLAIM HERE IS NARROWED TO WHAT THIS FILE MEASURES: they are not
empty. Which one they are is graded in `circuit-session-test.mjs`.
🔴 AND THE SENTENCE THAT USED TO SIT HERE WAS WRONG IN AN INSTRUCTIVE WAY. It
said the comparison needs the stock template and so could not be made from
this repository. **It needs no template.** MEASURED from the pack alone: the
three `Initial Session` slots differ FROM EACH OTHER by exactly one byte, all
three pairs; the closest pair among the other 29 is **415 bytes** apart; and
no INIT comes within **262 bytes** of any non-INIT. One against a floor of 262
is not ambiguous, and **the floor is the half that makes the one byte mean
anything**. Reaching for an outside source was the expensive answer to a
question the file in hand could settle.
```

<a id="blank-heads"></a>

## `circuit-patch-test.mjs` blank heads

```text
🔴 THE NEGATIVE CONTROL ON THE SAFETY CHECK ITSELF. A check that said the
head separates them would pass every day the blanks happened to differ. It
does not separate them: `INIT` is on BOTH sides. The three numbers that do
separate them are two orders of magnitude apart, which is what the page
rests on.
```

<a id="flip"></a>

## `circuit-patch-test.mjs` byte 6 flipped

```text
🔴 THE ONE THAT MATTERS MOST. Flip byte 6 from 00 to 01 and the same 350 bytes
stop being a message that lands in RAM and become one that overwrites a patch
in flash. A reader that did not say so would let somebody open a file, see a
patch, and never learn that sending it is destructive.
```

<a id="no-encoder"></a>

## `circuit-patch-test.mjs` no encoder

```text
🔴 AND THE ABSENCE IS ASSERTED RATHER THAN INTENDED. `plans/plan-pack-page.md`
§2: the function that turns an intention into bytes does not exist at all, so
it cannot be called by mistake. This is the assert that keeps it that way when
somebody adds a convenience helper six months from now.
```
