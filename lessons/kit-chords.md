# Kit lessons: chords

The longer comments cut from `demo/shell/chords.mjs` and `demo/shell/chords-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-chords.md#<anchor>`.

<a id="header"></a>

## `chords.mjs` module header

```text
demo/shell/chords.mjs. Chord symbols into note numbers, and nothing else.

Asked for on `/nola/` 2026-09-23: *"i need a parser that shows hilited keys
(muted gray) on keyboard. just strings like c5 cmaj, can be separated by
anyhing"*, then given four examples that decided the whole grammar:
**`Cmaj C9 F/C Fm6/C`**.

🔴 EVERY TOKEN IS A CHORD. THERE IS NO OCTAVE IN THIS GRAMMAR, AND THE FIRST
READING HERE HAD ONE. `c5` looks like *note C, octave 5*, and beside `cmaj`
that reads as a note and a chord. `C9` kills it: a bare number after a root
is an EXTENSION, so `c5` is the POWER CHORD, root and fifth, and the whole
input is chord symbols. The wrong reading would have lit one key where four
belong and nothing would have looked broken.

🔴 A SLASH IS A BASS, NOT A CHORD TONE. `F/C` is F major with a C underneath
it, and the C is not a member of the chord: it sits BELOW the root rather
than being folded into the stack. Returning it as part of `notes` would make
`F/C` and `Fadd4` indistinguishable, and they are different chords.

⚠️ THE SEPARATOR IS NOT A LIST, IT IS EVERYTHING ELSE. *"can be separated by
anyhing"*, so this cannot split on a set of characters. It splits on anything
that is not a chord character, which makes `Cmaj C9`, `Cmaj, C9`,
`Cmaj | C9` and `Cmaj->C9` all the same input.

⚠️ AND A TOKEN THAT DOES NOT PARSE IS REPORTED, NEVER DROPPED. `createDiagram`
already set this habit with `cuts`: an author who cannot see what was refused
has no way to know where it went. A page shows the bad token back.

This file has no audio, no DOM and no browser in it, which is the bargain
`looper-test.mjs` and `pedal-test.mjs` already make. `chords-test.mjs` is
beside it.
```

<a id="qualities"></a>

## `chords.mjs` QUALITIES

```text
🔴 THE TABLE IS ORDERED LONGEST FIRST AND THAT IS LOAD BEARING. `m` is a
prefix of `maj`, `maj` of `maj7`, `m7` of `m7b5`, so a table walked in any
other order reads `Cmaj7` as `C` + `maj` and loses the seventh, or reads
`Cm7b5` as a minor seventh and loses the flattened fifth. `chords-test.mjs`
asserts the ordering rather than trusting it.
⚠️ AND THE NAMES ARE THE ONES PEOPLE TYPE, not one canonical spelling each.
A parser that takes `min` and refuses `m` is a parser nobody can use.
```

<a id="glyph-spellings"></a>

## `chords.mjs` QUALITIES: h7, o7, hdim7

```text
🔴 FIVE SPELLINGS OF THREE CHORDS THAT ARE ALREADY IN THIS TABLE, AND THEY
ARE HERE BECAUSE THEY WERE COUNTED. MEASURED 2026-09-26 by
`demo/resources/chord-refused.mjs` over 2,076 charts and 159,644 written
chords: `h7` **1,754**, `o7` **882**, `hdim7` **200**, `h` **105** and `o`
**85**, which is **3,026 occurrences** of five ways of writing a half
diminished seventh, a diminished seventh and a diminished triad.
⚠️ THEY ADD NO QUALITY, WHICH IS THE WHOLE REASON THEY COULD BE ADDED ON
THEIR OWN. Every one maps through `QUALITY_SAYS` onto a name this parser
already returns, so nothing downstream sees a string it has not seen
before: not `RECOGNISED` in `name.mjs`, which reserves the chord cell's
width, and not `CLASS_OF` in `suggest.mjs`, which turns a quality into a
class the counted table knows.
🔴 AND THE GLYPH SPELLINGS ARE DELIBERATELY NOT HERE, THOUGH THEY WERE
COUNTED TOO. `^` for a major seventh (62), `^9` (60) and `+` for an
augmented triad (48) cannot be reached from a typed line at all, because
`parseChords` splits on everything that is not a chord character and those
three ARE the separator. MEASURED: `parseChords('C+')` returns **C major
and no bad token**, so the plus is eaten before this table is consulted. A
row for it would be a row that cannot be reached, which is the exact thing
the missing `M` row below is a note about. Widening the splitter is a
change to the GRAMMAR rather than to this table, so it was reported and
deliberately not made here.
✅ `+` WAS MADE ON 2026-09-30, grammar and row together, and its row sits
beside `aug`. ⚠️ `^` IS STILL A SEPARATOR, so `C^` still reads as C major
with nothing refused. That is the same lie and it is left for its own
decision, because `^` is a major seventh in iRb and nothing else.
```

<a id="plus"></a>

## `chords.mjs` QUALITIES: +

```text
🔴 `+` IS AN AUGMENTED TRIAD AND UNTIL 2026-09-30 IT WAS A SEPARATOR, SO
   `C+` READ AS C MAJOR WITH NOTHING REFUSED. A wrong chord is worse than a
   refused one. It is READ rather than refused because it is the ordinary way
   to write the chord: the corpora write it 48 times, `chord-corpus.mjs`'s
   `classOf` and `suggest.mjs`'s `SPELL_ALIAS` already fold it onto `aug`, and
   `aug` is already a row, so it adds no quality anywhere downstream. The
   splitter keeps `+` as a chord character for exactly this row.
```

<a id="two"></a>

## `chords.mjs` QUALITIES: 2

```text
🔴 `2` IS A CHORD AND THIS TABLE SAID IT WAS NOT. Reported 2026-09-26 as
*"chord or no chord"*, with `/nola/` refusing the typed line `Cmaj7 C2/E`
beside an Open Studio lesson, *Getting From I to IV*, playing `C2/E` with
that caption over the keys.
🔴 THE INTERVALS ARE `[0, 2, 7]` AND NOT `[0, 2, 4, 7]`, AND THE SYMBOL
THAT WAS ASKED ABOUT IS THE ARGUMENT. `C2/E` puts the THIRD in the bass,
which is only a thing to do if the third is not already in the chord: with
a third in the stack the slash would be saying nothing, and `C2/E` and `C2`
would hold the same pitch classes. So the second and the fifth, no third,
and the third arrives underneath when the symbol asks for it. **`C2/E` is
E3 C4 D4 G4, note numbers 52 60 62 67.**
⚠️ AND THE OTHER READING IS `add9` ALREADY. `[0, 2, 4, 7]` is a major triad
with a ninth folded down into the same octave, and this table has `add9` at
`[0, 4, 7, 14]`, which is the same chord voiced the way people play it.
Adding a second row for it would have been two names for one chord with the
second one sounding worse.
🔴 SO THIS ROW IS THE SAME THREE NOTES AS `sus2`, AND THAT IS SAID HERE
RATHER THAN HIDDEN. Two names for one sound, both of them real: `sus2` says
a suspension, which is a claim about what happens NEXT, and `2` says a
colour the chord simply has. A page shows back the name that was typed, so
a person who wrote `C2` reads `C2`.
⚠️ NEITHER CORPUS SETTLES IT, WHICH IS WORTH SAYING BECAUSE EVERY OTHER ROW
ADDED TODAY WAS COUNTED. MEASURED: `2` is written **0 times** in 159,644
chords, against `sus2` 264 and `add9` 23. It is contemporary teaching
vocabulary and both corpora predate it. **The screenshot is the evidence
here, not the measurement.**
```

<a id="h-and-o"></a>

## `chords.mjs` QUALITIES: h and o

```text
⚠️ THE TWO BARE GLYPH SPELLINGS SIT DOWN HERE WITH `m` RATHER THAN BESIDE
   `h7` AND `o7`, FOR THE REASON THIS TABLE IS ORDERED THE WAY IT IS. `h` is a
   prefix of `h7` and `hdim7` and `o` of `o7`, so a single character row above
   a longer one carrying it is exactly the shadowing `chords-test.mjs` walks
   the table to refuse. Same rule that put `m` after `maj` and `min`.
```

<a id="no-m-row"></a>

## `chords.mjs` QUALITIES: no M row

```text
🔴 THERE IS NO `M` ROW, AND THERE WAS ONE UNTIL `chords-test.mjs` REPORTED
   IT. A capital `M` is normalised to `maj` before this table is consulted, so
   a row for it could never be reached: the lookup is case blind and would
   find `m` first anyway, which is the bug the normalisation exists to stop.
   A row that cannot be reached reads as the thing handling the case.
```

<a id="quality-says"></a>

## `chords.mjs` QUALITY_SAYS

```text
What a quality is CALLED once it is parsed, so two spellings read as one.

⚠️ `2` IS DELIBERATELY ABSENT FROM THIS MAP AND IT IS THE ONE ROW ADDED
TODAY THAT IS. Every other new spelling is folded onto a name the page
already shows, because `h7` and `hdim7` are two ways of writing one thing
nobody calls `h7` out loud. `2` is what the lesson captions and what the
person typed, so it comes back as `2` and `C2` reads `C2`. Folding it onto
`sus2` would show a visitor a chord they did not write.
```

<a id="capital-m"></a>

## `chords.mjs` parseChord: M

```text
🔴 `M` IS THE ONE NAME WHOSE CASE CARRIES MEANING, AND EVERYTHING ELSE'S
DOES NOT. `CM` is C major and `Cm` is C minor, while `CMAJ`, `Cmaj` and
`cMaJ` are all the same chord. MEASURED as a real bug here: a
case-insensitive pass over the table reached `m` first and parsed `CM` as
**C minor**, which is a wrong chord rather than a refused one, and the four
examples that were given would never have caught it.
⚠️ IT IS NORMALISED RATHER THAN SPECIAL CASED, so `M7` and `M9` come out as
`maj7` and `maj9` instead of needing a row each.
```

<a id="bass"></a>

## `chords.mjs` parseChord: bass

```text
🔴 THE BASS SITS BELOW THE ROOT, AT THE NEAREST OCTAVE UNDER IT, WHICH IS
   WHAT MAKES IT A BASS. Folding it into the stack would put the C of `F/C`
   between the F and the A and make the chord an `Fadd4` with a different
   name. `- 1` on an exact match pushes `C/C` an octave down rather than
   doubling the root in unison, which is inaudible and reads as a bug.
```

<a id="flat-b"></a>

## `chords.mjs` parseChord: b

```text
⚠️ `b` IS A NOTE AND A FLAT, AND ONLY THE POSITION TELLS THEM APART. `Bb`
   is B flat and `bb` is the same chord typed in lower case, because the FIRST
   character is the root and a `b` after it can only be an accidental.
```

<a id="degree"></a>

## `chords.mjs` DEGREE

```text
🔴 THE SEVEN DEGREES, AND THE FIVE THAT ARE NOT IN THE SCALE. A numeral is a
chord's place in a key, so a root a semitone above the key is a flattened
second and not a sharpened first: `bII` is the spelling everybody writes and
`#I` is the one nobody does.
```

<a id="roman"></a>

## `chords.mjs` roman

```text
A chord's numeral in a key.

🔴 THE CASE IS THE WHOLE REASON THIS SAYS MORE THAN THE NAME DOES, and the
four frames that were given settle it: `F` is **IV** and `Fm6` is **iv** on
the same root in the same key. Upper case is a major third, lower case a
minor one.
⚠️ A DOMINANT STAYS UPPER CASE. `C9` is **I** and not `i`, because its third
is major even though its seventh is not, and a numeral describes the third.
⚠️ AND THE BASS IS IGNORED. `F/C` is **IV**: a slash says which note is at the
bottom, not which degree the chord is. Folding the bass in would have made it
a numeral about C, which is the key itself.

@param {object} chord  a parsed chord from `parseChord`
@param {number} keyPc  the key's pitch class, 0 for C
```

<a id="roman-marks"></a>

## `chords.mjs` roman: marks

```text
⚠️ THE TWO THAT TAKE A MARK RATHER THAN A CASE. A diminished chord is
   lower case AND carries a circle, an augmented one is upper case AND a
   plus, because neither of them is told apart from an ordinary minor or
   major by case alone.
```

<a id="parsechords"></a>

## `chords.mjs` parseChords

```text
A whole line of chord symbols.

⚠️ IT SPLITS ON WHAT IS NOT A CHORD RATHER THAN ON A LIST OF SEPARATORS, so
a comma, a bar, an arrow and four spaces are all the same thing. `/` and `#`
are chord characters and survive; everything else is a gap.

@returns {{chords: object[], bad: object[]}} both halves, because a token that
  did not parse has to be shown back rather than silently missing.
```

<a id="lone-plus"></a>

## `chords.mjs` parseChords: lone plus

```text
⚠️ `+` IS A CHORD CHARACTER SINCE 2026-09-30, FOR `C+`, AND A `+` STANDING
   ON ITS OWN IS STILL A GAP, so `C + G` is two chords rather than a refusal.
```

<a id="key"></a>

## `chords.mjs` parseChords: key

```text
🔴 THE KEY IS THE FIRST CHORD'S ROOT, WHICH IS AN INFERENCE AND IS SAID ON
   THE PAGE. Nothing in a line of chord symbols declares a key, and the four
   frames that bought this feature are all in C with `Cmaj` first. A page
   that showed numerals without saying where the key came from would be
   stating a fact it had guessed.
```

<a id="voicings"></a>

## `chords.mjs` VOICINGS

```text
🔴 THE VOICINGS, ASKED FOR THREE TIMES AND EACH TIME FOR THE SAME REASON:
*"can there be voicing selector to make it easier to play on 25 keys"*.

⚠️ A SPELLING IS NOT A VOICING, WHICH IS THE WHOLE OF WHY THIS EXISTS.
`parseChord` returns ROOT POSITION from one octave: root, third, fifth,
stacked upward, with a slash bass under it. That says WHICH NOTES the chord
has and nothing about where a hand goes. On two octaves of keys it is the
worst answer available: `Fm6/C` spans thirteen semitones from its bass, four
chords in a row jump the hand up and down the keyboard, and a seventh chord
with a slash bass can simply not fit.

Four modes, and each one is a real way people play:
  `root`  what the parser said. Kept because it is the SPELLING, and a chart
          that shows a shape nobody asked for is lying about the symbol.
  `close` every note folded into one octave above the lowest, which is the
          smallest span a chord has. This is what makes a chord fit.
  `lead`  the inversion whose notes move least from the chord before it,
          which is what makes a PROGRESSION playable: the hand stays put and
          the notes change under it. `near` is the previous chord's notes.
  `split` the root alone underneath and the rest of the chord above it,
          placed where it moves least from the chord before. Two hands.

🔴 `split` WAS ASKED FOR WITH A PICTURE, 2026-09-25: *"what voicing?
wanna this"*, beside a piano tutorial of `Cmaj7 Dm7 Em7 Fmaj7` notated on two
staves, ONE BASS NOTE PER CHORD IN THE LEFT HAND (C, D, E, F) AND THREE NOTES
IN THE RIGHT THAT BARELY MOVE. A musician calls it a rootless voicing over a
bass root, and that name is written here once so a reader who knows it can
find this, and nowhere a visitor looks: `positron-ui` bans a private
vocabulary on a control, and this exact page has already paid for it, with
`SPELLED CLOSE LEADING` and the report *"i do not know what spelled close
leading means"*.
🔴 THE ROOT LEAVES THE RIGHT HAND, WHICH IS THE WHOLE OF IT. The note
underneath already has it, so the hand above spends its notes on the ones
that carry the harmony, and it is then free to sit still while the bass
walks. That is why the tutorial's treble barely moves under four different
chords.
⚠️ AND NOTHING IS LOST WHEN THE ROOT GOES, WHICH IS WHY THIS IS SAFE ON
EVERY CHORD SIZE INCLUDING A TRIAD. A split voicing holds exactly the pitch
classes of the spelling, every chord and every time, because the note that
left the right hand is the note that arrived in the left. A triad gets a TWO NOTE
right hand and that is the answer rather than a shortfall: the alternative,
dropping the fifth instead so that three notes are left, puts the root back
above a bass that already has it, which is the one thing this mode exists to
take away. `c5` becomes one note over its own root, which is a power chord
with the hands apart and is still every note the symbol names.
🔴 A SLASH CHORD KEEPS ITS ROOT, BECAUSE THE PREMISE OF THIS MODE STOPS
BEING TRUE ABOUT IT. `Fm6/C` names C as the note underneath, so the note
underneath does NOT have the root, and taking F out of the hand would delete
a note the symbol says is in the chord rather than move it. `Fm6/C` in this
mode is C3 D3 F3 G#3 C4: the named bass below, the whole of Fm6 above it,
placed to move least, which is what `lead` already does with it. The `bass`
option below is UNCHANGED and still means only *the first note is a named
slash bass*: it decides WHICH note goes underneath, and this mode only
decides whether the root is spent on that job. Nothing about `Fm6/C` in the
other three modes moves.
⚠️ THE ROOT IS READ AS THE LOWEST NOTE OF THE CHORD, once a named bass
has been taken off it. That is exactly what `parseChord` returns, and it is
what every caller in this repository passes, `/nola/`'s learned rows
included, because `name.mjs`'s `notesOf` is a `parseChord` of the name. A
caller handing this mode an INVERTED chord would have its lowest note taken
for a root, so hand it the spelling and let this decide where it goes.

⚠️ AND THE BASS IS NOT INVERTED, IN ANY MODE. A slash chord names a bass and
folding it up is a different chord with the same letters, which is the same
mistake `parseChord` already refuses when it puts the bass below the root.
It is kept at the bottom and only moved by whole octaves to fit the window.
```

<a id="split"></a>

## `chords.mjs` voiceChord: split

```text
🔴 `split` TAKES THE ROOT OUT OF THE HAND AND PUTS IT UNDERNEATH, AND
THAT IS THE ONLY THING IT CHANGES HERE. Everything below is the machinery
the other three modes already use: `bassUnder` pins a pitch class under the
body wherever the body ends up, `places` fits the body at every inversion
and octave, and the `near` rule chooses. So this mode is a different BODY
and a different note underneath it, not a second voicing routine.
⚠️ A CHORD WITH FEWER THAN TWO NOTES ABOVE ITS BASS IS LEFT WHOLE, because
taking the root off a one note chord leaves a hand with nothing in it.
```

<a id="droproot"></a>

## `chords.mjs` voiceChord: dropRoot

```text
🔴 THE ROOT LEAVES THE HAND ONLY WHEN THE ROOT IS THE NOTE GOING
UNDERNEATH, WHICH IS THE WHOLE ANSWER TO WHAT A SLASH CHORD DOES HERE. This
mode's one argument is that the bass already has the root, so the hand above
need not spend a note on it. `Fm6/C` NAMES a different bass, the argument
stops being true, and dropping the F would delete a note the symbol says is
in the chord. So a slash chord in this mode is the chord over its named
bass, placed to move least, which is what `lead` already does with it.
⚠️ AND THAT IS WHAT KEEPS THE INVARIANT UNIVERSAL: a split voicing holds
exactly the pitch classes of the spelling, every chord, every time, because
the note that leaves the hand is the note that arrives underneath.
```

<a id="bass-follows"></a>

## `chords.mjs` voiceChord: bass follows

```text
🔴 THE BASS FOLLOWS THE CHORD AND STAYS UNDER IT, AND IT KEEPS ITS PITCH
CLASS. With the bass pinned to one octave while the body was free to move,
a body placed low ended up BELOW it: MEASURED as `60,53,57,60` for `F/C`,
a slash chord whose named bass is no longer the bass. `parseChord` already
makes exactly this decision when it writes the bass in, and this is the
same rule applied again after the body has moved.
```

<a id="places"></a>

## `chords.mjs` voiceChord: places

```text
🔴 EVERY PLACE THIS CHORD COULD GO: each inversion, at each octave that
lands on the keys. THE FIRST VERSION BUILT INVERSIONS ONLY AND THEN MOVED
THE WINNER INTO THE WINDOW AFTERWARDS, which is why leading came out WORSE
than closing over a line of chords: MEASURED at 46 semitones of hand
movement against 43, on the mode whose whole job is to move least. The
nearest inversion was chosen and then shoved an octave by a step that knew
nothing about what it was near.
⚠️ SO THE FITTING IS PART OF THE CHOICE RATHER THAN A CORRECTION TO IT.
```

<a id="nothing-fits"></a>

## `chords.mjs` voiceChord: nothing fits

```text
⚠️ AND IF NOTHING FITS, THE CHORD IS STILL DRAWN. A window too small for a
   chord is a fact about the window; refusing to answer would leave a row with
   no dots and nothing saying why, and `outside` already reports it.
```

<a id="byspan"></a>

## `chords.mjs` voiceChord: bySpan

```text
⚠️ THE TWO WAYS OF CHOOSING, NAMED ONCE, because `split` needs both of
   them and the first version of it wrote the span rule out a second time.
```

<a id="close"></a>

## `chords.mjs` voiceChord: close

```text
🔴 THE SPAN IS MEASURED WITH THE BASS IN IT, AND THE FIRST VERSION
MEASURED THE BODY ALONE AND MADE CHORDS WIDER. MEASURED by this module's
own test: `Fm6/C` went from fourteen semitones in root position to
TWENTY, because packing the body tight pulled it away from a bass that
cannot move with it. The body really was narrower and the chord really
was worse, which is what a statistic measured over the wrong subject
does.
⚠️ A tie goes to the lowest, so two equal answers do not depend on the
order of the list.
```

<a id="split-distance"></a>

## `chords.mjs` voiceChord: split distance

```text
🔴 THE HAND IS WHAT HAS TO STAY STILL, SO THE DISTANCE IS MEASURED OVER
THE BODY AND NOT OVER THE WHOLE VOICING. The bass is SUPPOSED to move: it
walks C D E F under the four chords in the picture that asked for this.
Including it makes the thing being minimised partly the movement of the
one voice nobody wants held still, and the bass moves with the body
anyway, so a body placed an octave up takes its bass with it and the two
terms are not independent. MEASURED over five lines and thirty chords: the
hand above travels **114 semitones when the body is what is compared and
132 when the whole voicing is**, over an identical 185 for the voicing as
a whole, and the two choose differently on 10 of the 30.
⚠️ AND ON THE FOUR CHORDS IN THE PICTURE THEY AGREE EXACTLY, which is
worth saying because those four are the only evidence that was supplied
and they would have settled nothing. `Cmaj7 Dm7 Em7 Fmaj7` comes out
note for note the same either way.
⚠️ AND THE PREVIOUS CHORD'S HAND IS ITS NOTES WITHOUT THE LOWEST ONE,
which is an inference this mode is entitled to make about its OWN output:
in a split voicing the lowest note is the bass, by construction. A caller
redraws a whole line in one mode, so `near` came from here.
```

<a id="split-first"></a>

## `chords.mjs` voiceChord: split first chord

```text
⚠️ WITH NOTHING TO MOVE FROM IT IS THE CLOSE ONE, which is the answer
   `lead` already gives to a first chord and for the same reason: root
   position for it would make the second chord jump to meet it.
```

<a id="root-lead"></a>

## `chords.mjs` voiceChord: root and first lead

```text
`root` keeps the spelling and only moves it onto the keys, and a `lead`
   with nothing to lead from is a `close`: a first chord has no previous
   hand position, and root position for it would make the second chord jump
   to meet it.
```

<a id="test-header"></a>

## `chords-test.mjs` chords-test module header

```text
demo/shell/chords-test.mjs. The chord parser, with no browser at all.

  node demo/shell/chords-test.mjs

`parseChord` is a grammar and a table, and every bug it has had so far lived
in one of them: a case insensitive pass that read `CM` as C MINOR, a bare
number read as an octave rather than an extension, and a slash bass folded
into the chord so that `F/C` and `Fadd4` came out the same. None of those
needs a browser and none of them looks wrong from the outside, because every
one of them returns a perfectly good chord that is the wrong chord.

THESE ARE MOSTLY NEGATIVE CONTROLS: written so that the bug they name would
fail them, rather than so that today's code passes. The count is not written
down here, because three comments in two files carried three different counts
for one command on 2026-09-23 and all three were true when written. Count it:

  grep -c 'NEGATIVE CONTROL' demo/shell/chords-test.mjs
```

<a id="t2"></a>

## `chords-test.mjs` test 2: c5

```text
2. NEGATIVE CONTROL, AND IT IS THE READING THIS PARSER ALMOST SHIPPED. `c5`
   beside `cmaj` looks like a NOTE with an octave. `C9` proves it is not, so
   `c5` is the power chord and lighting one key here would be wrong.
```

<a id="t3"></a>

## `chords-test.mjs` test 3: CM

```text
3. NEGATIVE CONTROL. MEASURED as a real bug: a case insensitive walk of the
   table reaches `m` before `M` and returns C MINOR for `CM`. A wrong chord,
   not a refused one, and none of the four examples would have caught it.
```

<a id="t5"></a>

## `chords-test.mjs` test 5: case blind

```text
5. NEGATIVE CONTROL, THE OTHER WAY. Everything that is NOT `M` is case blind,
   or a parser that takes `Cmaj` and refuses `CMAJ` is one nobody can use.
```

<a id="t-c2e"></a>

## `chords-test.mjs` tests: C2/E

```text
── `C2/E`, the chord this table refused ────────────────────────────────────

Reported 2026-09-26 as *"chord or no chord"*, with `/nola/` refusing the
typed line `Cmaj7 C2/E` beside an Open Studio lesson playing that exact
chord with that exact caption. `demo/resources/chord-refused.mjs` measured
what else was being refused, over 2,076 charts and 159,644 written chords.
```

<a id="t7a"></a>

## `chords-test.mjs` test 7a

```text
7a. 🔴 THE NOTE NUMBERS ARE WRITTEN OUT RATHER THAN DERIVED, so this can be
    checked against the video by ear rather than against a rule. E3 under
    C4 D4 G4: the second and the fifth, and the third underneath.
```

<a id="t7b"></a>

## `chords-test.mjs` test 7b

```text
7b. NEGATIVE CONTROL, AND IT IS THE WHOLE INTERVAL DECISION. `[0, 2, 4, 7]`
    is the other defensible reading of the symbol and it makes the slash say
    nothing, because the third would already be in the stack. Give `2` a
    third and this goes red.
```

<a id="t7c"></a>

## `chords-test.mjs` test 7c

```text
7c. And the name that comes back is the name that was typed, which is why
    `2` is the one row of 2026-09-26 with no `QUALITY_SAYS` entry.
```

<a id="t7d"></a>

## `chords-test.mjs` test 7d

```text
7d. 🔴 AND THE DUPLICATE IS ASSERTED RATHER THAN HIDDEN. `2` and `sus2` are
    the same three notes under two real names, and a check that pretended
    otherwise would be the file lying about its own table.
```

<a id="t7f"></a>

## `chords-test.mjs` test 7f

```text
7f. 🔴 NEGATIVE CONTROL, AND IT IS ABOUT THREE ROWS THAT ARE NOT THERE. `^`,
    `^9` and `+` were counted too (62, 60 and 48 occurrences) and were left
    out, because `parseChords` splits a line on everything that is not a
    chord character and those three ARE the separator. So a row for one of
    them could never be reached from a typed line, which is the same defect
    as the `M` row `chords.mjs` removed: a row that cannot be reached reads
    as the thing handling the case. This walks the table against the
    splitter's own character class rather than against a list, so it refuses
    the next unreachable row too.
```

<a id="t7g"></a>

## `chords-test.mjs` test 7g

```text
7g. 🔴 NEGATIVE CONTROL, AND IT IS THE DEFECT ITSELF: `C+` IS AN AUGMENTED
    TRIAD. Until 2026-09-30 the plus was the separator and `C+` came back as C
    major with nothing refused, a wrong chord a visitor could not see was wrong.
    Against that code this is red.
```

<a id="t7h"></a>

## `chords-test.mjs` test 7h

```text
7h. And a plus standing on its own is still a gap, so a line typed with one
    between chords is not suddenly a refusal. `C+7` is refused in words,
    because it is not a spelling this table holds, rather than read as
    something it is not.
```

<a id="t7i"></a>

## `chords-test.mjs` test 7i

```text
7i. ⚠️ `^` IS STILL THE SEPARATOR AND THIS SAYS SO, so that widening it cannot
    happen quietly: `C^` is C major with nothing refused, the same lie `C+`
    told, left for its own decision because `^` means a major seventh in iRb.
```

<a id="t8"></a>

## `chords-test.mjs` test 8

```text
8. NEGATIVE CONTROL, AND IT IS WHY THE BASS IS NOT FOLDED INTO THE STACK.
   Folding the C of F/C between the F and the A makes it an Fadd4, which is
   a different chord with the same notes in a different order.
```

<a id="t15"></a>

## `chords-test.mjs` test 15

```text
15. NEGATIVE CONTROL. Asked for as *"can be separated by anyhing"*, so this
    cannot be a list of separators. A parser that split on spaces would take
    `Cmaj,C9` as one token and refuse it.
```

<a id="t25"></a>

## `chords-test.mjs` test 25

```text
25. The reference was four frames of a piano video with no words on them:
    `Cmaj` I, `C9` I, `F/C` IV, `Fm6/C` iv. Between them they fix the key,
    the case, the dominant and the bass, which is more than a sentence would
    have.
```

<a id="t26"></a>

## `chords-test.mjs` test 26

```text
26. NEGATIVE CONTROL, AND IT IS THE WHOLE REASON A NUMERAL SAYS MORE THAN A
    NAME. The same root in the same key is IV or iv depending on its third.
```

<a id="t-voicings"></a>

## `chords-test.mjs` tests: voicings

```text
── the voicings, which are what makes a chord playable on 25 keys ─────────

🔴 EVERY ONE OF THESE IS A NEGATIVE CONTROL FOR ROOT POSITION, which is the
answer this module gave for a week and which `/nola/` could not fit: a chord
spelled upward from one octave is a SPELLING, and a hand needs a voicing.
```

<a id="t-line"></a>

## `chords-test.mjs` tests: lead over a line

```text
🔴 MEASURED OVER A LINE RATHER THAN OVER ONE PAIR, because one chord
   after another can tie by luck: `Cmaj` to `F` is 8 semitones of movement
   either way. What leading is FOR is a progression, so the claim is about
   the whole line and the number is the total the hand travels.
```

<a id="t-span"></a>

## `chords-test.mjs` test 5: span

```text
5. 🔴 WHAT A VOICING ACTUALLY BUYS, AND THE FIRST VERSION OF THIS CHECK
      CLAIMED THE WRONG THING AND WENT RED SAYING SO. It asserted that root
      position does not FIT two octaves. It does: the widest of these is
      fourteen semitones and the window is twenty four, so every one of them
      fits and the negative control found nothing to report.
      ✅ THE REAL CLAIM IS THE SPAN, AND IT IS ABOUT A HAND. A chord inside one
      octave is a chord one hand can hold; `Fm6/C` in root position spans
      FOURTEEN semitones, which is a stretch nobody makes. Fitting the screen
      was never the problem. Reaching it was.
```

<a id="t-never-widens"></a>

## `chords-test.mjs` tests: close never widens

```text
🔴 THE INVARIANT IS THAT IT NEVER WIDENS ONE, and stating it that way is
   what caught the defect. `every close voicing is inside one octave` was
   the first claim, it went red at twenty semitones, and the cause was real:
   packing the BODY tight pulled it away from a slash bass that cannot move
   with it. A chord with a bass under it cannot be one octave wide and
   should not pretend to be.
```

<a id="t-split"></a>

## `chords-test.mjs` test 6: split

```text
6. \u{1F534} THE SPLIT VOICING, AND THE ONLY EVIDENCE THAT EXISTS FOR IT IS FOUR
      CHORDS IN A PICTURE. Asked 2026-09-25 as *"what voicing? wanna this"*
      beside a piano tutorial of `Cmaj7 Dm7 Em7 Fmaj7` on two staves: one bass
      note per chord in the left hand, C D E F, and three notes in the right
      that barely move. So the note numbers are WRITTEN OUT here rather than
      computed from the same rule the module uses, because a reader with the
      picture in front of them can check these four lines by eye and cannot
      check a formula. That is the `csound.mjs` lesson: a check derived from
      the code it grades catches a typo and can never catch a misreading.
      \u2705 AND THE SABOTAGE COUNTS ARE MEASURED RATHER THAN CLAIMED, 2026-09-25,
      which is the only reason to believe any of this grades anything. Leaving
      the root in the hand takes 4 red, dropping it from a slash chord as well
      takes 2, placing the hand by span instead of leading it takes 1, and
      dropping the fifth instead of the root takes 5.
```

<a id="t-split-hand"></a>

## `chords-test.mjs` tests: split hand

```text
\u{1F534} THE CLAIM IS ABOUT THE HAND ABOVE, SO THE HAND ABOVE IS WHAT IS
   MEASURED. Every note of the right hand moves by a step and none of them
   jumps, which is what *barely move* means on a stave and what a total in
   semitones can say.
```

<a id="t-rootless"></a>

## `chords-test.mjs` tests: rootless

```text
\u{1F534} ROOTLESS IS THE WHOLE POINT AND IT IS ASSERTED AS AN ABSENCE. A
   mode that claimed to take the root out of the hand and left it there
   would pass every structural check above: the notes would still be a
   chord, still fit, still move little.
```

<a id="t-nothing-lost"></a>

## `chords-test.mjs` tests: nothing lost

```text
\u{1F534} NOTHING IS LOST, WHICH IS WHY DROPPING A NOTE IS SAFE AT ALL. The
   note that left the hand arrived underneath, so a split voicing holds
   exactly the pitch classes of the spelling. This is the claim that has to
   survive a triad, a power chord and a slash chord, and it is the one that
   caught the first reading of what a slash chord should do.
```

<a id="t-triad"></a>

## `chords-test.mjs` tests: triad

```text
\u{1F534} A TRIAD HAS NOTHING TO SPARE AND STILL LOSES ITS ROOT, WHICH IS A
   DECISION RATHER THAN A CONSEQUENCE. Two notes in the right hand is the
   answer: the alternative, dropping the fifth so that three are left, puts
   the root back above a bass that already has it, which is the one thing
   this mode exists to take away. The screenshots are all seventh chords, so
   this case was unasked and is decided here.
```

<a id="t-slash-root"></a>

## `chords-test.mjs` tests: slash keeps root

```text
\u{1F534} A SLASH CHORD KEEPS ITS ROOT, AND THE REASON IS THE PREMISE RATHER
   THAN THE SHAPE. This mode's argument is that the note underneath already
   has the root. `Fm6/C` names a different note underneath, the argument
   stops being true about it, and taking the F out would delete a note the
   symbol names. The first version of this dropped it and the check above
   went red.
```

<a id="t-placement"></a>

## `chords-test.mjs` tests: placement

```text
\u{1F534} NEGATIVE CONTROL FOR THE PLACEMENT, WHICH IS THE HALF A STRUCTURAL
   CHECK CANNOT SEE. Every assert above would pass on a mode that dropped the
   root and then put the hand wherever it liked. What says the hand is being
   LED is that it moves less over a line than the same mode with nothing to
   lead from, which is the span rule this falls back to on a first chord.
```
