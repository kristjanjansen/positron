# Kit lessons: instruments

The longer comments cut from `demo/shell/instruments.mjs` and `demo/shell/instruments-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-instruments.md#<anchor>`.

<a id="header"></a>

## `instruments.mjs` module header

```text
demo/shell/instruments.mjs — what the things on this desk are actually called.

  node demo/shell/instruments-test.mjs

🔴 WHY THIS EXISTS, AND IT IS A MEASURED FAILURE RATHER THAN TIDINESS. Asked
2026-09-21 after `/wish/` was told *"connect evolution to circuit"* and
answered *the model proposed nothing, which is the right answer to an
instruction that names nothing on this desk*. THE MODEL WAS RIGHT. CoreMIDI
calls that port `MK-425C USB MIDI Keyboard`, and the instrument is an
**Evolution** MK-425C: the maker's name is printed on the box, on the rear
lip and in every sentence a person says about it, and it was in NONE of the
strings anything here was given. Asked for as *"can you not enrich the names
with brands etc"*, *"also keyboard drum machine mixer soundcard"*, and
*"have a taxononomy"*.

🔴 A PORT NAME IS WHAT AN OPERATING SYSTEM CALLS A CABLE. It is not what the
object is called, it is not what its maker is, and it does not say what kind
of thing it is. Three different facts, none of them in the string, and every
page here had been guessing at all three separately: `/bay/` stripped a
trailing direction word, `/wish/` carried a hand-written `sub` per diagram
box, and `/circuit/`, `/twelve/` and `/evo/` each typed their own nameplate.

⚠️ IT IS DATA, NEVER A DERIVATION. No regular expression turns `MK-425C` into
`Evolution`: that happens to be right here and would be wrong on the next
device. A maker is a fact somebody knows, so it is written down, and a port
nothing recognises gets NO invented brand. That is the same rule that makes
the patch bay's port list an `enum` rather than a suggestion: a Moog and a
Prophet which are not on the desk came back as no links in 496 ms rather
than as an invention.

⚠️ AND THE RAW NAME IS NEVER THROWN AWAY. It is the only thing that ties a
row back to the cable, it is what a reader needs when two devices are named
alike, and `/bay/` already prints it on a row whenever it differs from the
label. Enriching a name must not lose it.
```

<a id="desk"></a>

## `instruments.mjs` DESK

```text
🔴 THE DESK, WRITTEN DOWN. Every entry is a thing somebody can point at,
except the last, which is the one that is not.

`match`  what the operating system is likely to call its port.
`maker`  the brand on the box.
`model`  what the maker calls it.
`kind`   one of `KINDS`, the primary one.
`also`   other words a person might reach for, in order of likelihood.
`plays`  false for a thing nobody presses a key on. See `/bay/`.
`note`   one sentence, for a hover or a prompt, never furniture.
```

<a id="evolution"></a>

## `instruments.mjs` DESK: Evolution MK-425C

```text
MEASURED on this unit and recorded in `research/evo-mk425c-face-2026-09-21.md`:
   25 keys, notes 47 to 71 where a 25 key controller sits at 48 to 72, and a
   global channel of 2. It has no sound engine, which is why `/bay/` gives
   its input an empty `accepts` list.
```

<a id="tracks"></a>

## `instruments.mjs` DESK: Novation Circuit Tracks

```text
🔴 `present: false` AND IT IS NOT DECORATION. It is here because a
   purchased soundbank ships patches for it, and its patch header differs
   from the Circuit's at exactly one byte: offset 5 is 0x60 for the Circuit
   and 0x64 for the Tracks, so anything naming it should be able to say it
   is the wrong instrument. But it is NOT PLUGGED IN, and `resolve()` skips
   it, because every alias it shares with the Circuit (`Novation`, `drum
   machine`, `groovebox`) made it a second hit on every sentence that named
   the Circuit. An instrument nobody can patch must not be offered as one.
```

<a id="daw-control"></a>

## `instruments.mjs` DESK: TASCAM Model 12 DAW control

```text
🔴 THE DAW CONTROL PORT IS ITS OWN ENTRY AND IT MUST COME FIRST, BECAUSE
`find` STOPS AT THE FIRST MATCH. MEASURED in a real browser the minute the
taxonomy landed: the Model 12 offers `Model 12 MIDI IN/OUT` **and**
`Model 12 DAW Control IN/OUT`, and enriching both to `TASCAM Model 12` gave
`/bay/` two rows with the same name and nothing to tell them apart. The
enrichment had made the desk LESS legible, which is the opposite of the
point.
⚠️ AND THEY REALLY ARE TWO DIFFERENT THINGS, so this is not a label patch.
The MIDI pair carries notes and controllers; the DAW Control pair speaks
Mackie Control, which is a mixer protocol, and `/twelve/` records that it
sends nothing at all unless DAW control mode is switched on at the desk.
```

<a id="fast-track"></a>

## `instruments.mjs` DESK: M-Audio Fast Track Pro

```text
🔴 `Fast Track` IS IN THIS LIST ON EVIDENCE AND IT IS A FACT RATHER THAN A
   CONVENIENCE. MEASURED 2026-09-21: the word `Pro` is the one a speech model
   drops or replaces. *"fast track"* came back as itself from two models and
   as *"Fast-trap"* from the third, and *"the fast track pro is the recording
   input"* came back as *"The fast track row is the recording input."* Four
   misses across three models, all of them the same syllable. `Fast Track` is
   also what M-Audio calls the line, and there is exactly one of them on this
   desk, so somebody saying it means this box.
```

<a id="fast-track-capture"></a>

## `instruments.mjs` DESK: Fast Track capture

```text
MEASURED in `research/fasttrack-capture-2026-09-21.md`: the Circuit's
   left output is on capture channel 1 at 48 kHz 16 bit.
```

<a id="iac"></a>

## `instruments.mjs` DESK: Apple IAC Driver

```text
🔴 `plays: false` IS A BEHAVIOUR AND NOT A LABEL. `/bay/` links two
   instruments by having them PLAYED, and a loopback returns everything sent
   to it, so within a minute of MIDI first flowing it echoed a panic and the
   bay linked a keyboard to the bus. It keeps its row, because a port that
   vanished says it does not exist, and routing to the IAC bus is how you
   reach another application on this machine. It is pressed, never played.
```

<a id="describe"></a>

## `instruments.mjs` describe

```text
What is this, as far as anybody here knows?

⚠️ A NAME NOTHING RECOGNISES IS ANSWERED HONESTLY RATHER THAN GUESSED. There
is no maker, no kind and no invented brand: the raw name comes back as the
label with its direction word trimmed, which is what `/bay/` already did, and
`known` is false so a caller can say so.

@param {string} raw the port name the operating system gave
@returns {{raw:string, label:string, full:string, maker:string|null,
           model:string|null, kind:string|null, words:string[],
           plays:boolean, note:string, known:boolean}}
```

<a id="words"></a>

## `instruments.mjs` describe: words

```text
🔴 EVERY WORD A PERSON MIGHT SAY, MOST SPECIFIC FIRST, AND DEDUPLICATED.
This is what makes *"connect evolution to circuit"* work: the list holds
`Evolution MK-425C`, `Evolution`, `MK-425C`, `keyboard`, `controller`, and
the raw port name as well, because somebody reading the row may type what
they see. Order matters where a caller truncates.
```

<a id="hearing"></a>

## `instruments.mjs` hearing a name wrong

```text
── hearing a name wrong ───────────────────────────────────────────────────

🔴 A SPEECH MODEL HEARS `tascam` AS `task am`, AND NOTHING DOWNSTREAM CAN
RECOVER FROM THAT. Asked 2026-09-21: *"can you patch wish thinkg or
transcding with simular-sounding lookups"*.

🔴 THE TRANSCRIPTION IS THE RIGHT STAGE AND THE THINKING IS THE WRONG ONE,
which is worth stating because the ask offered both. The language model's
`from` and `to` are an `enum` of REAL PORT IDS, so it physically cannot
return a fuzzy name: handed a sentence naming nothing it recognises, it
returns an empty list, which is what it did. MEASURED earlier: two synths
that are not on this desk came back as no links in 496 ms rather than as an
invention, and that is the schema working. So there is nothing to repair
downstream; the repair belongs where the words are still words.

⚠️ AND IT SHOWS ITS WORK, WHICH IS NOT OPTIONAL HERE. Rewriting what somebody
SAID is a larger liberty than repairing a model's key name, and that one is
already printed in words. The transcript is an editable box, so a correction
must be visible in it and reported beside it, or the page is putting words in
a person's mouth.
```

<a id="normalise"></a>

## `instruments.mjs` normalise

```text
Down to the letters and digits that carry meaning.
⚠️ `four twenty five` BECOMES `425` RATHER THAN `4205`, because a spoken model
number is a run of digits and not arithmetic. That is a deliberate narrowing:
this is for `MK-425C`, never for a quantity.
```

<a id="tokenise"></a>

## `instruments.mjs` tokenise

```text
The same words `normalise()` produces, each one still knowing where in the
raw string it came from.

🔴 IT EXISTS BECAUSE A CORRECTION HAS TO LAND IN THE BOX A PERSON READS, AND
`normalise()` THROWS AWAY EVERYTHING NEEDED TO PUT IT THERE. `resolve()`
matches against lowercased, punctuation-free, digit-joined words; the
transcript on `/wish/` is a textarea holding what the speech model actually
returned, capital letters, full stops and all. Without an offset there is no
way back from *"the span `groove a box` matched"* to *"characters 8 to 20 of
what you are looking at"*, and a page that cannot say WHERE it changed
something is a page that changed it silently.

⚠️ **IT MUST PRODUCE EXACTLY WHAT `normalise()` PRODUCED, WHICH IS WHY
`normalise()` IS NOW WRITTEN IN TERMS OF IT RATHER THAN BESIDE IT.** Two
functions doing one string transform is this repository's most repeated
defect: `bay.mjs` derived one port list twice and the two could disagree with
nothing to catch it. One implementation cannot drift from itself.

⚠️ A JOINED DIGIT RUN KEEPS THE WHOLE SPAN. `four twenty five` is three words
in the raw text and one token here, so its range runs from the `f` to the
last `e`, separators included. That is what has to be replaced to replace the
number.

@param {string} s
@returns {{word:string, at:number, to:number}[]} `at` and `to` index the RAW
  string, so `s.slice(at, to)` is the words as they were said.
```

<a id="sounds"></a>

## `instruments.mjs` sounds

```text
A crude sound of a word, and crude is the point.

⚠️ NOT SOUNDEX AND NOT METAPHONE. Both are built for surnames and both keep
the first letter, which is the letter a speech model is most likely to get
wrong at a word boundary: `tascam` arrives as `task am` and `has come`. This
drops vowels after the first character, folds the consonants that a
microphone confuses, and collapses runs, which is enough to bring those three
together and little enough to explain in one comment.
🔴 IT IS DELIBERATELY WEAK, because the cost of a false match here is putting
a word in somebody's mouth. Strength comes from the THRESHOLD below, never
from a cleverer key.
```

<a id="threshold"></a>

## `instruments.mjs` MIN_SOUND_LEN

```text
🔴 THE THRESHOLD IS WHERE ALL THE SAFETY LIVES, AND IT IS PER LENGTH. One
edit in a three letter key is a different claim from one edit in ten. A flat
distance matches `bass` to `bus`; a flat ratio matches nothing short at all.
⚠️ AND A KEY UNDER FOUR CHARACTERS IS NEVER MATCHED BY SOUND. `bus`, `desk`
and `pad` are ordinary English that appears in ordinary instructions, and the
whole failure mode being guarded against is a page hearing an instrument in a
sentence that did not name one.
🔴 AND THE FLOOR APPLIES TO WHAT WAS SAID AS WELL AS TO THE KEY, WHICH IT DID
NOT UNTIL 2026-09-21 AND WHICH COST FOUR OF THE THIRTEEN FALSE POSITIVES
MEASURED AGAINST REAL WHISPER TRANSCRIPTS. `card` and `chord` both reduce to
`krt`, three characters, which is one edit from `kprt` (**keyboard**) and one
from `krkt` (**Novation Circuit**). So *"The sound card is on channel 1."*
found the keyboard and the Circuit, and *"Play a chord and hold it down."*,
which names nothing at all, found both of them too. The key was already
floored and the span was not, and a three character key is too little
information for one edit to mean anything whichever side of the comparison it
sits on. `research/name-lookups-2026-09-21.md` has all thirteen.
```

<a id="stop"></a>

## `instruments.mjs` STOP

```text
🔴 THE WORDS AN INSTRUCTION IS MADE OF, AND THIS LIST IS THE REASON THE
MATCHER IS SAFE AT ALL. MEASURED, and every one of these was a real false
match from the first build: `connect` matched **Novation Circuit** at one
edit, because `circuit` reduces to `krkt` and `connect` to `knkt`; `machine
from` matched the Model 12's DAW control; and `keyboard` matched the
**M-Audio Fast Track Pro**. Reported from the other side in the same minute:
*"circuit gets mistaken for secury"*.
⚠️ A CLEVERER PHONETIC KEY CANNOT FIX THIS AND MAKES IT WORSE. `connect` and
`circuit` genuinely do sound alike by any reduction that folds `k` and `c`,
and they share a first letter, so no threshold separates them. What separates
them is that ONE OF THEM IS A VERB. The sentences this page hears are
instructions, their verbs and prepositions are a small closed set, and none
of them is ever an instrument.
🔴 AND A SPAN CONTAINING ONE IS REFUSED WHOLE, not just a token equal to one,
because the window slides: `machine from` is two tokens and only the second
is a verb.
🔴 `control` JOINED THE LIST ON EVIDENCE, 2026-09-21, AND IT IS NOT A VERB.
It was the last false positive standing against real Whisper transcripts and
it stood on all three models: *"the tascam model twelve daw control does
nothing at all"* found the **Evolution MK-425C**, because `control` reduces to
`kntrl` and the keyboard's own alias `controller` reduces to `kntrlr`, one
edit apart. So a sentence about the mixer's control surface named the
keyboard. ⚠️ THE WORD IS IN THE DESK'S OWN VOCABULARY TWICE, which is what
makes it dangerous rather than merely common: it is the tail of one
instrument's name and the head of another's alias. Stopping it costs nothing,
because `controller` said properly is found by the EXACT branch, which never
consults this list.
⚠️ The cost of a false NEGATIVE is that the model answers *nothing on this
desk*, which is honest and which a person fixes by editing one word in a box.
The cost of a false POSITIVE is a page putting words in somebody's mouth and
routing an instrument they never named. They are not the same size.
```

<a id="stop-control"></a>

## `instruments.mjs` STOP: control

```text
🔴 ALL FOUR INFLECTIONS, BECAUSE TWO OF THEM WERE NOT ENOUGH AND A SWEEP
   SAID SO. `control` and `controls` went in first, and *"a controlled
   sound"* still found the keyboard. That is this project's substring lesson
   from the other end: a list of forms is as wrong as a substring test until
   somebody enumerates it.
```

<a id="stop-bus"></a>

## `instruments.mjs` STOP: bus

```text
🔴 `bus` IS HERE FOR THE EXACT BRANCH, NOT FOR THE SOUND ONE, AND IT IS
   THE ONLY WORD ON THIS LIST THAT IS ALSO A REAL ALIAS ON THE DESK. The
   `sounds()` floor already refused it (`ps`, two characters), so no
   mis-hearing could ever reach the IAC Driver through it. An exact hearing
   could and did: **`the master bus`** and **`a bus compressor`** both
   resolved to the **Apple IAC Driver**, and both are ordinary mixing, not
   MIDI. `virtual bus` and `loopback` still reach it, and so does `Apple`.
```

<a id="resolve"></a>

## `instruments.mjs` resolve

```text
Which instruments does this sentence name, including badly?

⚠️ **A HIT CARRIES WHERE IT WAS FOUND, `at` AND `to`, AND THEY INDEX THE RAW
STRING RATHER THAN THE NORMALISED ONE.** `text.slice(at, to)` is the words as
the speech model wrote them, which is what a reader is looking at and the
only thing a correction can replace. `said` is still the normalised span, so
every assert written before this stands.

@param {string} text what was heard
@returns {{said:string, word:string, full:string, kind:string|null,
           how:'exact'|'sound', at:number, to:number, i:number, n:number,
           entry:object}[]} one hit per instrument,
  best first, never two hits for one instrument.
```

<a id="findwhole"></a>

## `instruments.mjs` resolve: findWhole

```text
Where a whole alias sits in the sentence, as a token index, or -1.
🔴 IT REPLACES FOUR STRING TESTS THAT SAID THE SAME THING AND COULD NOT SAY
WHERE. `flat === w || flat.includes(' w ') || flat.startsWith('w ') ||
flat.endsWith(' w')` is exactly *"w appears as a whole run of tokens"*, and
a token scan answers the same question while knowing the index. Measured
identical over the whole corpus rather than argued.
```

<a id="stop-alias"></a>

## `instruments.mjs` resolve: stop word alias

```text
🔴 AN ALIAS THAT IS ONE STOP WORD NAMES NOTHING ON EITHER BRANCH, AND
   UNTIL 2026-09-21 THE STOP LIST GOVERNED ONLY THE SOUND ONE. MEASURED
   over ordinary studio vocabulary: `the master bus` and `a bus
   compressor` both resolved to the **Apple IAC Driver** at exact
   strength, where no threshold and no phonetic key can reach them. The
   test is the WHOLE alias rather than a token inside it, so `virtual
   bus` and `mackie control` are untouched and only the bare word goes.
```

<a id="window"></a>

## `instruments.mjs` resolve: window

```text
🔴 THE WINDOW IS NOT THE KEY'S OWN WIDTH, AND WRITING IT AS `span` AND
   `span + 1` LOST TWO REAL INSTRUMENTS. MEASURED 2026-09-21 against real
   Whisper transcripts: a speech model JOINS tokens and SPLITS them, in
   both directions and by more than one.
   - `m k four twenty five c`, six spoken tokens, came back as **`MK425C`**,
     one token, from all three models. The key `mk 425 c` is three, so no
     window of three or four could ever contain it and the keyboard was
     missed on every model.
   - `groovebox`, one token, came back as **`groove a box`**, three. The
     key is one, so the same arithmetic missed it from the other side.
   So the range runs from one token to two past the key, and what keeps it
   safe is the three guards below rather than the width.
```

<a id="veto"></a>

## `instruments.mjs` resolve: stop word veto

```text
🔴 A STOP WORD VETOES A SPAN UNLESS IT PROVABLY DID NOT CONTRIBUTE
TO THE SOUND, AND THAT IS A TEST RATHER THAN A FEELING. Take the
stop words out: if the key is the SAME string, they added nothing
to it and cannot be what matched, so the veto has nothing to
protect. If the key CHANGES, they were part of it and the span goes.
MEASURED 2026-09-21, and the two halves are both real:
- *"put the groovebox through the audio interface"* came back from
  `@cf/openai/whisper` as **"put the groove a box through the audio
  interface."** The model split one word into three by inserting an
  article. `groove a box` and `groove box` both reduce to `jrpx`,
  because `sounds()` deletes a vowel anywhere but the first
  character, so the `a` is not in the key at all. The whole span
  veto was refusing a perfect match on the strength of a letter
  that was not being compared.
- *"crack the gate open"* is the negative control and it is not
  hypothetical: the OBVIOUS form of this repair, dropping stop
  words and comparing what is left, resolves it to the **Novation
  Circuit at distance 0**, because `crack gate` reduces to `krkt`
  and so does `circuit`. With the `the` left in, the span reduces
  to `krktkt`, which is a different string, so this test refuses it
  and the looser one does not.
⚠️ MEASURED BOTH WAYS: this recovers one instrument across the
corpus and changes the answer on NONE of 132 ordinary studio
phrases. The looser form changes one of them, and changes it wrong.
```

<a id="guards"></a>

## `instruments.mjs` resolve: three guards

```text
🔴 THREE GUARDS, AND EACH ONE WAS BOUGHT BY A MEASURED FALSE MATCH.
   The first sound has to agree, because a speech model mishears a
   vowel far more readily than the consonant a word opens on. The
   lengths have to be close, or a short word matches inside a long
   key. And only then does the distance get a say.
```

<a id="reword"></a>

## `instruments.mjs` reword

```text
🔴 WHAT A PAGE DOES WITH WHAT `resolve()` FOUND, AND THE PART THAT WAS OPEN
IS THE PART WHERE IT FOUND TWO THINGS.

`HANDOFF.md` carried this as an unanswered design question: all three speech
models mangle `daw` four different ways, so *"the desk needs daw mode
switched on"* comes back naming the **TASCAM Model 12** and its **DAW control
surface** at once, and *"what a page does with two hits for one instruction
is a `/wish/` decision nobody has taken"*. Taken here, and taken as three
rules rather than one, because the measured corpus has three different shapes
in it and only one of them is really an ambiguity.

🔴 **1. A MORE SPECIFIC NAME BEATS A NAME INSIDE IT.** MEASURED: *"The tascam
model twelve daw control does nothing at all."* matches `tascam model 12 daw
control` over five tokens AND `tascam model 12` over three, and the second
span sits entirely inside the first. That is not two instruments being named,
it is one name containing another, and the longer one is the one somebody
said. A hit whose span is strictly inside another hit's span goes.

🔴 **2. AN INSTRUMENT THE CALLER DOES NOT HAVE IS REPORTED AND NEVER
SUBSTITUTED.** `DESK` describes this room; a page describes what is plugged
into it, and they are not the same list. MEASURED: *"Send the Novation to the
taskam."* names `TASCAM Model 12` and `TASCAM Model 12 DAW control` on one
span at the same cost, and `/wish/` has only the first, so for that page the
span is not ambiguous at all. Rewriting a name the caller cannot patch would
put a word in somebody's mouth AND still answer *nothing on this desk*, which
is both failures at once.

🔴 **3. TWO INSTRUMENTS THE CALLER REALLY HAS, ON ONE SPAN, IS NOT REPAIRED.
EVER.** MEASURED: `audio interface` is an alias of the TASCAM Model 12 and of
the M-Audio Fast Track Pro, at exact strength and distance 0, where no
threshold and no cleverer phonetic key can separate them. Picking one is a
coin toss printed as a fact. Both names are reported and the words are left
exactly as they were, and the person fixes it by typing one word, which is
the cheapest correction on the page and the reason the box is editable.

⚠️ **AND AN EXACT HEARING IS NEVER REWRITTEN**, which is `resolve()`'s own
rule arriving one layer up. A sentence that named the thing properly has
nothing to correct, so only `how: 'sound'` produces a replacement.

⚠️ **NOTHING HERE IS SILENT.** Every replacement comes back in `fixed` with
the words that were there before it, and the caller is expected to say so:
this is the same shape as `relabel()` in `workers/wish/src/wish.mjs`, which
repairs the one key a model always gets wrong and RETURNS the repair so the
page can print it. *A model proposes and a person presses* survives only if
the person can see what was actually said.

@param {string} text what was heard
@param {{has?: (full:string) => boolean}} [opts] `has` answers whether an
  instrument is one the caller can actually patch. The default is that
  everything on `DESK` counts, which is the right answer for a caller with no
  opinion and the wrong one for a page with a port list.
@returns {{text:string, fixed:{was:string, full:string, at:number, to:number}[],
           unsure:{was:string, names:string[]}[],
           absent:{was:string, names:string[]}[], hits:object[]}}
```

<a id="test-header"></a>

## `instruments-test.mjs` instruments-test module header

```text
demo/shell/instruments-test.mjs — the desk's taxonomy, with no browser.

  node demo/shell/instruments-test.mjs

🔴 A LOOKUP TABLE IS THE SHAPE OF CODE THAT PASSES A NAIVE TEST BY ACCIDENT.
A `describe()` that returned the raw name for everything would satisfy any
check that only asks whether something came back, so the asserts below name
the exact maker, and the ones marked NEGATIVE CONTROL are written so that a
specific wrong implementation fails them.
```

<a id="t3-kinds"></a>

## `instruments-test.mjs` test 3: four kinds

```text
3. Each of the four kinds the owner named is actually on the desk.
   Asked as *"also keyboard drum machine mixer soundcard"*.
```

<a id="t8b"></a>

## `instruments-test.mjs` test 8b: Model 12 pairs

```text
8b. NEGATIVE CONTROL, AND IT IS THE ONE THE REAL DESK FOUND. Enriching both
    of the Model 12's port pairs to `TASCAM Model 12` gave `/bay/` two rows
    with the same name and nothing to tell them apart. A more specific entry
    has to win, which means order matters and `find` is order dependent.
```

<a id="t-hearing"></a>

## `instruments-test.mjs` tests: hearing a name wrong

```text
── hearing a name wrong ──────────────────────────────────────────────────

🔴 EVERY NEGATIVE CONTROL BELOW IS A REAL FALSE MATCH FROM THE FIRST BUILD,
not an invented worry. `connect` matched Novation Circuit at one edit,
`machine from` matched the Model 12's DAW control, and `keyboard` matched the
M-Audio Fast Track Pro. Reported from the other side in the same minute:
*"circuit gets mistaken for secury"*. A matcher like this fails by being too
helpful, so the asserts that matter are the ones about silence.
```

<a id="t20"></a>

## `instruments-test.mjs` test 20: connect

```text
20. NEGATIVE CONTROL, AND THE SHARPEST ONE. `connect` is one edit from
    `circuit` by sound and shares its first letter, so no threshold separates
    them. The stop list does, and this is the assert that says so.
```

<a id="t-heard"></a>

## `instruments-test.mjs` tests: real transcripts

```text
── what the real speech models actually said ─────────────────────────────

🔴 EVERYTHING ABOVE THIS LINE WAS GRADED ON MIS-HEARINGS SOMEBODY INVENTED,
AND THAT IS WHAT THESE ROWS REPLACE. Asked 2026-09-21: *"do a comprehensive
rig testing on get good lookups"*, on the grounds that the positives and the
negative controls were both made up. **48 instructions were synthesised with
`say` across six voices** (Daniel en_GB, Samantha en_US, Karen en_AU, Moira
en_IE, Tessa en_ZA, Rishi en_IN), converted to webm/opus, and put through
**three real Whisper models on Workers AI, once each, 144 calls**. Every
transcript below is a string a model returned, quoted exactly, including the
leading space `whisper-tiny-en` puts on everything.
`research/name-lookups-2026-09-21.md` has all 144 and the arithmetic.

⚠️ THE SUBSET HERE IS THE SOUND BRANCH'S WORK AND THE SILENCES. A transcript
the models got word for word is graded by the asserts above; what is worth
keeping is every row where the name arrived broken and every row where a
person named nothing.
```

<a id="t-silences"></a>

## `instruments-test.mjs` tests: silences

```text
🔴 THE OTHER HALF, AND IT IS THE HALF THIS MATCHER IS CALIBRATED FOR. Sixteen
of the forty eight instructions name nothing on this desk, and all three
models transcribed all sixteen. **48 of 48 resolve to nothing**, which is the
number that has to stay where it is.
```

<a id="t-floor"></a>

## `instruments-test.mjs` tests: said-side floor

```text
🔴 NEGATIVE CONTROL FOR THE FLOOR ON WHAT WAS SAID, WHICH IS A CHANGE MADE ON
THIS EVIDENCE. `card` and `chord` both reduce to `krt`, one edit from `kprt`
(keyboard) and one from `krkt` (Circuit). Before the floor applied to the
spoken side, *"The sound card is on channel 1."* found the keyboard and the
Circuit as well as the soundcard, and *"Play a chord and hold it down."* found
both of them having named nothing. Four of the thirteen measured false
positives, and it is the soundcard that must survive.
```

<a id="t-control"></a>

## `instruments-test.mjs` tests: control

```text
🔴 NEGATIVE CONTROL FOR `control` IN THE STOP LIST, ALL FOUR INFLECTIONS. It
was the last false positive standing against the real transcripts and it
stood on all three models. The positive half matters as much: `controller`
said properly still finds the keyboard, because the exact branch never reads
the stop list.
```

<a id="t-bus"></a>

## `instruments-test.mjs` tests: bus

```text
🔴 NEGATIVE CONTROL FOR THE EXACT BRANCH READING THE STOP LIST. `bus` is the
IAC Driver's kind and it is ordinary mixing English. The sound floor already
refused it, so only an exact hearing could reach it, and two did: `the master
bus` and `a bus compressor` both resolved to the Apple IAC Driver. The test is
the WHOLE alias, so `virtual bus` is untouched, and that is the positive half.
```

<a id="t-window"></a>

## `instruments-test.mjs` tests: window

```text
🔴 NEGATIVE CONTROL FOR THE WINDOW RUNNING FROM ONE TOKEN. Widening it is the
one LOOSENING in this round, bought by `MK425C` arriving as a single token
from all three models. These five are the words that a narrower said-side
floor would have let in, so they are exactly where a wider window would show
up if it had opened anything. It changed the answer on none of 132 ordinary
studio phrases and these are five of them.
```

<a id="t-exemption"></a>

## `instruments-test.mjs` tests: stop token exemption

```text
🔴 NEGATIVE CONTROL FOR THE STOP TOKEN EXEMPTION, AND IT IS THE ONE THAT
PRICED THE OBVIOUS REPAIR. A stop word is ignored only when taking it out
leaves the sound key the SAME string, which proves it did not contribute. The
obvious version, dropping stop words and comparing the rest, resolves *"crack
the gate open"* to the Novation Circuit at distance 0, because `crack gate`
reduces to `krkt` and so does `circuit`. With the `the` in, the span reduces
to `krktkt`, a different string, and this refuses it.
```

<a id="t-exemption-detail"></a>

## `instruments-test.mjs` tests: exemption detail

```text
⚠️ THE DETAIL NAMES ALL THREE HALVES, because this assert failed under the
   window sabotage for the SPLIT half while its message showed only the two
   silent ones, which sends a reader to the wrong change.
```

<a id="t-fast-track"></a>

## `instruments-test.mjs` tests: Fast Track

```text
🔴 NEGATIVE CONTROL FOR `Fast Track` ON THE DESK. The word `Pro` is the one a
speech model drops, four times across three models, so the line name is an
alias. The negative half is that the two ordinary words it is made of do not
reach it on their own or in the wrong company.
```

<a id="t-ceiling"></a>

## `instruments-test.mjs` tests: ceiling

```text
🔴 THE CEILING, AND IT IS AN ASSERT RATHER THAN A PARAGRAPH. Three of the 144
transcripts lost the name entirely, and a matcher tuned until its table looked
good would have found something in them. An honest one finds nothing. If any
of these three ever starts resolving, something has been loosened too far.
```

<a id="t-tokenise"></a>

## `instruments-test.mjs` tests: tokenise agrees

```text
── where a name sits in the sentence, and what a page may do about it ──────

🔴 `tokenise()` AND `normalise()` MUST AGREE, AND THE WAY TO BE SURE IS NOT
TO READ THEM. A correction that lands in a textarea is placed by a character
offset, and an offset that is one token out rewrites the wrong word while
looking entirely plausible on screen. `normalise()` is written in terms of
`tokenise()` for that reason, so this asserts the property rather than the
two implementations: every token's own slice of the RAW string has to reduce
back to that token.
```

<a id="t-spans"></a>

## `instruments-test.mjs` tests: spans

```text
🔴 THE SPANS ARE WHAT MAKES A CORRECTION PLACEABLE, so a hit has to point at
the words that matched and not merely report that something matched.
```

<a id="t-exact"></a>

## `instruments-test.mjs` tests: exact never rewritten

```text
🔴 NEGATIVE CONTROL: AN EXACT HEARING IS NEVER REWRITTEN. This is the assert
that fails an implementation which simply replaces every hit with its full
name: `circuit` and `keyboard` are correct English for those instruments and
`Novation Circuit` is not an improvement on them, it is a page editing
somebody's sentence for nothing.
```

<a id="t-unchanged"></a>

## `instruments-test.mjs` tests: nothing changed

```text
🔴 NEGATIVE CONTROL: NOTHING NAMED, NOTHING CHANGED. The twenty transcripts
above that resolve to nothing must also come back character for character,
because `reword` is the half a page hands to a person.
```

<a id="t-absent"></a>

## `instruments-test.mjs` tests: absent

```text
🔴 NEGATIVE CONTROL: AN INSTRUMENT THE CALLER DOES NOT HAVE IS REPORTED AND
NEVER SUBSTITUTED. `/wish/` has no Fast Track Pro and no IAC Driver, so a
sentence naming one is a fact worth saying and never a word worth changing.
An implementation that rewrote on `resolve()` alone would fail this, and the
page would then answer *nothing on this desk* about a name it wrote itself.
```

<a id="t-inside"></a>

## `instruments-test.mjs` tests: name inside a name

```text
🔴 THE DECISION THAT WAS OPEN, AND IT IS GRADED HERE BECAUSE `/wish/` CANNOT
REACH IT. `HANDOFF.md` asked what a page does with two hits for one
instruction. Two shapes look alike and only one is an ambiguity.

**A name inside a longer name is not two instruments.** `tascam model twelve
daw control` contains `tascam model twelve`, and somebody who said the long
one said the long one.
```

<a id="t-ambiguous"></a>

## `instruments-test.mjs` tests: ambiguous exact

```text
🔴 NEGATIVE CONTROL: TWO INSTRUMENTS THE CALLER REALLY HAS, ON ONE SPAN, IS
NEVER REPAIRED. `audio interface` is an alias of the TASCAM Model 12 AND of
the M-Audio Fast Track Pro, both exact, both at distance 0, and no threshold
and no cleverer phonetic key can separate them. A page that picked one would
be printing a coin toss as a fact. Both names are reported, the words stand,
and a person fixes it by typing one of them.
⚠️ IT IS GRADED WITH A DESK THAT HAS BOTH, on purpose: `/wish/` carries three
instruments and the ambiguity cannot arise there, so a check written against
that page would pass while measuring nothing.
```

<a id="t-ambiguous-sound"></a>

## `instruments-test.mjs` tests: ambiguous sound

```text
🔴 AND THE SAME REFUSAL ON A MIS-HEARD SPAN, WHICH IS THE ONLY VERSION OF IT
THAT CAN BE GOT WRONG. FOUND BY SABOTAGE: dropping the `continue` after an
ambiguity is reported left the check above FULLY GREEN, because
`audio interface` is an exact hearing and nothing was ever going to be
rewritten there. The branch that matters is a span that WOULD have been
repaired had it named one thing, and there is a real transcript of it:
`whisper` returned *"Send the Novation to the taskam."*, and `taskam` reaches
the TASCAM Model 12 and its DAW control surface at the same distance.
```

<a id="t-vocabulary"></a>

## `instruments-test.mjs` tests: reword vocabulary

```text
🔴 AND A REPAIR MUST NOT BE ABLE TO PRODUCE A NAME NOTHING DOWNSTREAM KNOWS.
Whatever `reword` writes into the box is read next by a language model whose
vocabulary is the caller's own alias list, so the two lists have to hold the
same strings. This is the two-derivations-of-one-fact rule: the check is that
a name `reword` can write is a name `describe()` gives for a port on the
desk, which is where the page builds its aliases from.
```
