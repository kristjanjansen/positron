# Learning chords off the keys on `/nola/`, and suggesting the next two

Answers, in the owner's words, asked 2026-09-23:

> *"do bg research of learn/suggest chords. idea is to have alt mode in nola
> where i play chords and the ones i keep returning to add them to piano roll.
> then when have at least 2, suggest 3rd and 4th somehow"*

A mode on **https://positron.studio/nola/** where nobody types a chord line. You
play, the page works out WHICH chords you played, notices the ones you keep
coming back to, puts those into the piano roll above the keys, and once there
are two it proposes a third and a fourth.

🔴 **NOTHING HAS BEEN PLAYED AND NOBODY HAS HEARD ANY OF THIS.** Every number
below came off arithmetic run in a scratch directory on this desk against the
repository's own `demo/shell/chords.mjs` table, or out of a synthetic session of
chord events I generated. **No MIDI keyboard was plugged in, no browser ran any
of it, and no human play was recorded.** Section 8 is the list of what has to be
measured with somebody's hands on the keys before any of the timing numbers here
are worth anything.

🔴 **AND NO PAGE CODE WAS WRITTEN OR CHANGED.** `demo/nola/index.html`,
`demo/shell/chords.mjs`, `demo/shell/roll.mjs`, `demo/shell/keyboard.mjs` and
`demo/shell/shell.css` were read and not touched. The prototypes live in this
session's scratchpad at
`/private/tmp/claude-501/-Users-s32863-personal-positron/8aa92fb5-6f69-4e25-8221-038b95849dcd/scratchpad/`
as fourteen small `.mjs` files, they import the repository's chord table read
only, and they are disposable.

| mark | means |
| --- | --- |
| **MEASURED** | a number taken off something run on this desk, with the command that took it |
| **DOCUMENTED** | a page, licence file or repository fetched today, 2026-09-23, and quoted |
| **REPORTED** | second hand, from somebody else's write-up, not confirmed at the source |
| **INFERRED** | a conclusion drawn from two of the above and stated by neither |
| **UNVERIFIED** | written from memory, nothing fetched or run to check it |

---

## The short answer

**Build it, and build the suggester with no data in it at all.**

🔴 **THE HARD HALF IS NAMING THE CHORD, AND THE HARDNESS IS NOT ENGINEERING, IT
IS THAT SOME CHORDS DO NOT HAVE ONE NAME.** MEASURED against this repository's
own `QUALITIES` table: it can spell **288 chords** across 12 roots, those chords
occupy **223 distinct pitch class sets**, and **120 of the 288, which is 41.7
per cent, sit in a set that names more than one chord**. `C6` and `Am7` are the
same four notes. `Csus2` and `Gsus4` are the same three. A diminished seventh is
**four** chords at once and an augmented triad is three. No recogniser fixes
that, because there is nothing there to fix.

✅ **BUT A RECOGNISER THAT KNOWS WHEN TO SHUT UP IS 100 PER CENT RIGHT.**
MEASURED over 600 generated voicings of the eleven qualities people actually
play: template matching over 12 roots gets **88.0 per cent** right outright, and
if it refuses to answer whenever the best reading beats the second best by less
than one point, it is **100.0 per cent right on the 72.0 per cent of cases it
speaks about**. The remaining 28 per cent are the genuinely undecidable ones,
and every single one of them is an inversion of an augmented triad, a
sus2/sus4 pair, or a seventh missing its fifth. 🔴 **So the page should have a
margin, and when the margin is thin it should show TWO names and no confident
one.**

🔴 **ADDING SIXTHS AND DIMINISHED SEVENTHS TO THE VOCABULARY COSTS MORE THAN
THEY ARE WORTH, AND THE NUMBER IS LARGE.** MEASURED: with `maj6`, `min6` and
`dim7` in the template list, the same confident-only recogniser drops from
speaking about **72.0 per cent** of chords to **32.8 per cent**, because
`C6 = Am7` and `Cm6 = Am7b5` and every `dim7` inversion poisons the margin for
its neighbours. **Leave them out.** A page that never says `C6` and always says
`Am7` is making one arbitrary choice out loud, which is better than a page that
goes quiet two thirds of the time.

🔴 **THE TALLY MUST COUNT TIME HELD, NOT NOTES PLAYED, AND THIS IS THE ONE
PLACE THE OBVIOUS IMPLEMENTATION IS SIMPLY WRONG.** MEASURED on a synthetic
session of 66 chord events over 63.8 s, four loop chords held 1.2 to 1.8 s each
and passing chords held 0.09 to 0.25 s: **by raw event count the top four are
`C(10) G(10) C7(10) Am(10)`, and `C7` is a passing chord.** By time held they
are `Am 15.4s G 15.0s F 14.9s C 14.0s`, with every passing chord under 1.6 s.
**Time held separates them by a factor of ten. Raw count does not separate them
at all.**

🔴 **A SHORTLIST THAT RE-SORTS ITSELF IS UNREADABLE, AND THE NUMBER IS 29
AGAINST 4.** MEASURED on a 100 event session where the player changes loop
halfway: a top-four-by-count list that re-sorts on every chord **changes 29
times, 22 of which are pure re-sorts** with the same four rows swapping places
under the reader's eye. The same session with rows **admitted once and never
reordered or evicted** changes **4 times, all of them appends**. `positron-ui`
already has the governing rule: *"NOTHING THAT REDRAWS EVERY FRAME MAY CHANGE
HOW MUCH ROOM IT TAKES"*, and *"The test is not 'is it short', it is can this
change its own height while somebody is looking at it."*

🔴 **AND THE SUGGESTER NEEDS NO CORPUS, WHICH IS THE FINDING THAT SAVES THE
MOST WORK.** MEASURED: the whole functional rule for a major key, written as
which degrees usually follow which, is **173 bytes of JSON**. Against 24 common
four-chord loops written from memory, that rule names the real third chord in
its **top 3 for 19 of 24** and the real fourth for **22 of 24**. Then I
re-ordered the rule's lists using the counts from those same 24 loops, which is
training on the test set and therefore an upper bound rather than a score, and
the top 3 went from **19 of 24 to 20 of 24**. 🔴 **A corpus buys ORDERING, not
COVERAGE, and the ordering is worth about one loop in twenty-four.** Section 4
is the licence work anyway, because it had to be done to say this, and it found
that the one corpus shaped exactly like this feature is the one corpus that may
not be shipped.

**What it costs in a tab: essentially nothing.** MEASURED: the recogniser
written the way it would ship, one 12 bit mask per quality and a popcount table,
names a chord in **0.30 microseconds** and its whole table is **148 bytes of
source**. The suggester's table is **173 bytes**, or about **350** once minor
keys get their own. Against the **3.6 MB of recordings `/nola/` already ships**,
this is free. Nothing here needs a download, a model, or a megabyte.

---

## 1. Naming a chord from notes, and why it is the opposite of what this repo has

### 1.1 The direction that exists

`demo/shell/chords.mjs` goes SYMBOL to NOTES. `parseChord('Cmaj')` returns
`60,64,67` and `chords-test.mjs` grades it with **49 checks** of pure arithmetic
and no browser, MEASURED by running `node demo/shell/chords-test.mjs` today:
`49 ok, 0 failed`. ⚠️ **AND THREE COMMENTS IN TWO FILES GIVE THREE DIFFERENT
NUMBERS FOR IT**, MEASURED today: `demo/shell/roll.mjs:32` says **36**,
`demo/nola/index.html:890` says **27**, and `demo/nola/index.html:1165` and
`:1485` say **49**. All three were true when written. This is the stale-standing-
number failure `CLAUDE.md` names in capitals, arriving in a code comment instead
of a standing file. **49 is what it prints today.** The whole of it is a table
walk, one
regex for the root letter, one normalisation for the capital `M`, and a bass
placed below the root. Every branch is decidable. There is no case in that
direction where two answers are equally right.

🔴 **THE REVERSE IS NOT THE SAME PROBLEM WITH THE ARROW TURNED ROUND. IT IS A
DIFFERENT PROBLEM, AND THE DIFFERENCE IS THAT IT HAS NO ANSWER SOMETIMES.**

### 1.2 How ambiguous, exactly

MEASURED, running against this repository's own `QUALITIES` table, deduped from
34 rows to **24 distinct interval sets** because several qualities are two
spellings of one chord (`m7` and `min7`, `sus` and `sus4`, `m7b5` and `min7b5`):

| fact | number |
| --- | --- |
| chords the table can spell, 12 roots x 24 qualities | **288** |
| distinct pitch class sets among them | **223** |
| sets that name more than one chord | **55 of 223** |
| chords caught in such a set | **120 of 288, 41.7 per cent** |

And the shape of the collisions, MEASURED:

| names per pitch class set | how many sets |
| --- | --- |
| 1 | 168 |
| 2 | 48 |
| 3 | 4 |
| 4 | 3 |

Every collision with a C in it, MEASURED and listed in full because the list is
the argument:

```
{C D E G A B}    = Cmaj13 = Amin11
{C E G A}        = Cmaj6  = Amin7
{C D D# F G A#}  = Cmin11 = D#maj13
{C D# F# A#}     = Cmin7b5 = D#min6
{C D# G A#}      = Cmin7  = D#maj6
{C D# G A}       = Cmin6  = Amin7b5
{C D# F# A}      = Cdim7  = D#dim7 = F#dim7 = Adim7
{C D G}          = Csus2  = Gsus4
{C F G}          = Csus4  = Fsus2
{C E G#}         = Caug   = Eaug  = G#aug
```

🔴 **THREE OF THESE ARE STRUCTURAL AND WILL NEVER BE SOLVED BY ANY AMOUNT OF
CLEVERNESS.** The diminished seventh divides the octave into four equal minor
thirds, so it is its own inversion four times over. The augmented triad divides
it into three equal major thirds, so it is its own inversion three times over.
`sus2` and `sus4` are the same three notes read from two ends. **A recogniser
that names one of these with confidence is guessing and calling it a fact.**

### 1.3 The four ways a recogniser can decide a root, graded

I wrote three recognisers and graded them on **1,704 generated voicings**: every
root position, every inversion, a doubled root, and a fifth omitted where there
is one, across all 24 qualities and 12 roots. MEASURED:

| recogniser | overall | root position | inversion | doubled root | no fifth |
| --- | --- | --- | --- | --- | --- |
| A, the lowest note is the root | **33.8%** | 100.0% | 0.0% | 100.0% | 0.0% |
| B, template match over 12 roots, bass ignored | **76.8%** | 77.4% | 79.0% | 77.4% | 62.8% |
| C, template match with the bass worth 0.5 | **82.4%** | 100.0% | 72.2% | 100.0% | 80.0% |

🔴 **A IS THE OBVIOUS IMPLEMENTATION AND IT IS THE WORST ONE BY A LONG WAY.**
Taking the lowest sounding note as the root is right on root position and on a
doubled root, and it is **0.0 per cent right on every inversion**, which is most
of how people actually play. A page that did this would work perfectly while
somebody played root position triads with one hand and then be wrong about
everything the moment they voiced anything.

⚠️ **AND B AGAINST C IS A REAL TRADE-OFF RATHER THAN AN IMPROVEMENT.** Giving
the bass a bonus lifts root position from 77.4 to 100 per cent and **drops
inversions from 79.0 to 72.2 per cent**, because the bonus is exactly the thing
that makes a first inversion look like a chord rooted on its third. Section 1.5
sweeps the weight.

⚠️ **B TIES FOR FIRST PLACE ON 39.4 PER CENT OF CASES**, MEASURED, with a tie
width histogram of `{1: 1032, 2: 528, 3: 48, 4: 84, 5: 12}`. **A tie broken by
the order of a table is an arbitrary decision wearing a confident face.** That
is what the margin in section 2 exists to stop.

### 1.4 The vocabulary is the biggest single lever, and smaller is better

MEASURED on **one** test set, the 600 voicings of the eleven qualities people
actually play (`maj min 7 min7 maj7 dim aug sus2 sus4 min7b5 5`), recognised
with three different template lists. This is apples to apples: the same chords
in, three different sets of candidate answers:

| vocabulary offered to the recogniser | qualities | top 1 | with a margin of 1.0 |
| --- | --- | --- | --- |
| triads only | 7 | 44.0% | 100.0% correct on 28.0% of cases |
| core | 11 | **88.0%** | **100.0% correct on 72.0% of cases** |
| the whole `QUALITIES` table | 24 | 82.0% | 100.0% correct on 46.0% of cases |

🔴 **OFFERING MORE NAMES MAKES THE PAGE WORSE AT NAMING.** Going from 11
candidate qualities to 24 costs six points of accuracy outright and **26 points
of coverage** at the confident threshold, and it buys the ability to say
`Cmaj13`, which nobody is going to play by accident.

⚠️ **AND TRIADS-ONLY IS WORSE STILL, WHICH IS THE OTHER DIRECTION AND IS LESS
OBVIOUS.** At 7 qualities it cannot name a seventh chord at all, so every
seventh gets forced into a triad and the answer is wrong 56 per cent of the
time. There is a floor as well as a ceiling.

### 1.5 The two weights that decide everything, swept

The score I used throughout is
`matched template tones - (missing template tones) - (notes the template cannot
explain) + (a bonus if the template's root is the lowest note)`.
Two numbers in that are free parameters. MEASURED, sweeping both over 768
voicings of a 13 quality vocabulary that includes the sixths:

| bass bonus | missing penalty | top 1 | precision at margin 1.0 | coverage |
| --- | --- | --- | --- | --- |
| 0 | 1.0 | 63.4% | 92.3% | 40.6% |
| 0.25 | 1.0 | **70.3%** | **100.0%** | 32.8% |
| 0.5 | 1.0 | **70.3%** | **100.0%** | 32.8% |
| 0.75 | 1.5 | 70.3% | 100.0% | 32.8% |
| 1.0 | 1.0 | 69.5% | 77.1% | 75.0% |
| 1.5 | 2.0 | 70.3% | 76.1% | 71.9% |

🔴 **A BASS BONUS OF 1.0 IS THE TRAP AND IT LOOKS LIKE THE BEST OPTION.** It
raises coverage from 32.8 to 75.0 per cent, which reads as the recogniser
becoming more useful, and **it drops precision from 100 per cent to 77.1**. What
it is actually doing is manufacturing a margin out of a fact the margin has no
business trusting, so the page answers more often and is wrong a quarter of the
time it does. ⚠️ **A weight that raises coverage and lowers precision is not a
tuning improvement, it is the page changing what it is willing to lie about.**

✅ **THE ANSWER IS A SMALL BASS WEIGHT, 0.25 TO 0.5, AND A MARGIN.** MEASURED at
that setting on the 13 quality vocabulary the recogniser is never wrong when it
speaks. At 11 qualities it is never wrong and speaks about 72 per cent of the
time.

### 1.6 What is left wrong, and it is exactly what should be

MEASURED at the best setting on the 11 quality vocabulary, the complete list of
errors:

```
  24x  aug inversion   -> a different aug
  19x  sus2 inversion  -> the sus4 a fifth up
  17x  sus4 inversion  -> the sus2 a fourth up
  12x  min7 no fifth   -> min7b5
```

✅ **THREE OF THE FOUR ARE THE STRUCTURAL COLLISIONS FROM 1.2 AND ARE NOT
BUGS.** `C E G#` really is `Caug` and `Eaug` and `G#aug`. Reporting any one of
them is a coin toss with a name on it. **These are the cases where the page must
say it is unsure.**

⚠️ **THE FOURTH ONE IS A BUG AND IT IS FIXABLE IN ONE LINE.** `Cm7` with the
fifth left out is `C Eb Bb`. Against `Cmin7` it matches 3 and misses 1. Against
`Cmin7b5` it matches 3 and misses 1. **A dead tie**, broken by whichever comes
first in the table, and `min7b5` sits above `min7` in `QUALITIES` because that
table is ordered longest-name-first for the PARSER's benefit. 🔴 **THE
RECOGNISER MUST NOT INHERIT THE PARSER'S ORDERING.** `QUALITIES` is ordered so
that `m7b5` is not read as `m7` plus a stray `b5`, which is a fact about
strings. A recogniser needs an ordering by how likely a chord is, which is a
fact about music, and the two are unrelated. **Two tables, or one table with two
orders.**

### 1.7 Inversions, omitted fifths, added ninths and slash basses, each decided

**Inversions.** Handled for free by template matching, because the score works
on pitch classes and an inversion does not change the pitch class set.
⚠️ The cost is that inversion is the thing the bass bonus fights, section 1.5.

**Omitted fifths.** MEASURED: the recogniser gets 80.0 per cent of them with the
bass bonus and 62.8 per cent without. The missing tone costs one point, and as
long as the missing penalty is at or below 1.0 a four note chord with three
tones present still beats a three note chord with three tones present and one
unexplained note. ✅ It works. ⚠️ It is also exactly where the `min7` / `min7b5`
tie above comes from, so the tie break matters more here than anywhere.

**Added ninths, elevenths, thirteenths.** 🔴 **LEAVE THEM OUT OF THE
VOCABULARY.** A ninth is a note the template does not explain, so with a 11
quality list `C E G D` scores `C` at 3 matched minus 1 unexplained, which is 2,
and that is still the top answer. **The page says `C` and shows the D as a note
that is not in the chord, which is true and useful.** Putting `add9` and `9` and
`11` and `13` in the list instead buys the ability to name them and costs the
coverage in 1.4. ⚠️ **AND THERE IS A HALFWAY HOUSE WORTH CONSIDERING**: name the
triad or seventh, and report extra notes separately as a count. That is the same
shape `voiceChord` already uses when it hands back `outside`, and the roll
already renders that as `2 above` in a label.

**Slash basses.** ✅ **Free and exact.** The recogniser already computes the
lowest note. If its pitch class is not the root it just named, the chord is
`root/bass`. MEASURED: `[55 60 64 67]` names as `C` with a margin of 1.0 and the
bass is G, so the label is `C/G`. ⚠️ **AND THIS IS WHERE THE REPO'S OWN RULE
CARRIES OVER UNCHANGED.** `chords.mjs` already refuses to fold a bass into the
chord because that would make `F/C` and `Fadd4` the same thing. Reading
backwards, the bass is what you did NOT fold in, and it is reported beside the
name rather than inside it.

**Two notes.** 🔴 **A DYAD DOES NOT NAME A CHORD AND THE PAGE MUST NOT PRETEND
IT DOES.** MEASURED, over the 132 chords the 11 quality vocabulary can spell,
how many contain a given interval:

| interval, semitones | chords containing it, of 132 |
| --- | --- |
| 1 | 1 |
| 2 | 5 |
| 3 | 11 |
| 4 | 10 |
| 5 | 13 |
| 6 | 6 |
| 7 | 13 |
| 8 | 10 |
| 9 | 11 |
| 10 | 5 |
| 11 | 1 |

A perfect fifth is in **13** of them. A major third is in **10**. ⚠️ **The two
intervals that DO pin a chord down are the minor second and the major seventh,
at one chord each, and nobody plays those as a chord.** ✅ **So two notes get
named only when they are a bare fifth, which the repo's table already calls `5`
and which `c5` in the four founding examples already is. Everything else says
two notes and nothing more.**

### 1.8 What the page should DO when it cannot tell, which is the real question

🔴 **A CONTROL THAT NAMES A CHORD WRONGLY WITH CONFIDENCE IS WORSE THAN ONE
THAT SAYS IT IS UNSURE**, and this page has a particularly bad version of that
failure available to it: the roll's `setHeld` already lights a row when the
player's notes exactly match it. If the recogniser writes a wrong name into a
row, the player plays the chord, the row lights up, and the page has now
CONFIRMED its own error to somebody who was trusting it to teach them.

MEASURED, the margin at every prefix of a rolled `Cmaj7`, one note at a time:

```
after 1 note  [C4]           best C5     margin 0.5   unsure
after 2 notes [C4 E4]        best C      margin 0.0   unsure, ties with 1 other
after 3 notes [C4 E4 G4]     best C      margin 1.0   ANSWERS
after 4 notes [C4 E4 G4 B4]  best Cmaj7  margin 2.0   ANSWERS
```

⚠️ **THE ANSWER AT THREE NOTES IS CORRECT AND IT IS ALSO ABOUT TO BE REPLACED.**
`C` is genuinely the best reading of `C E G`. The player was in the middle of a
`Cmaj7`. **A recogniser with a margin is right at every instant and still
changes its mind**, which is why the settling window in section 2 is a separate
mechanism from the margin and not a substitute for it.

✅ **THREE THINGS THE PAGE SHOULD DO, IN ORDER:**

1. **Below the margin, show two names and no verdict.** `Caug or Eaug`. That is
   not a failure state, it is the truth, and it is more interesting than a
   wrong single answer.
2. **Never write an unsure chord into the roll.** The roll is the record of what
   you meant. A row that has to be relabelled later is a row that moves, and the
   flicker rule in section 3 forbids that.
3. **For the three structural collisions, choose one spelling by fiat and say
   so in the log.** The repo already has this exact move, and the comment beside
   it is the model: *"THE KEY IS THE FIRST CHORD'S ROOT, WHICH IS AN INFERENCE
   AND IS SAID ON THE PAGE."* ⚠️ The fiat that costs least is **to drop the
   sixths entirely**, because then `C6` is simply `Am7` and there is no choice
   to make.

---

## 2. Which chords somebody keeps returning to

### 2.1 What counts as playing a chord rather than passing through one

🔴 **THIS IS THE SECTION WITH THE LEAST EVIDENCE BEHIND IT, AND THAT IS NOT
FIXABLE WITHOUT A PLAYER.** Every number here comes off a session I generated
with parameters I chose. Section 8 says what to measure instead.

MEASURED on a synthetic session, 66 events over 63.8 s, where I made loop chords
1.2 to 1.8 s long and passing chords 0.09 to 0.25 s long:

| scoring | top four | loop chords in the top four |
| --- | --- | --- |
| raw event count | `C(10) G(10) C7(10) Am(10)` | **3 of 4** |
| total time held | `Am(15.4s) G(15.0s) F(14.9s) C(14.0s)` | **4 of 4** |
| visits, a return after leaving | `C(10) G(10) C7(10) Am(10)` | **3 of 4** |
| count of events held longer than 200 ms | `C(10) G(10) Am(10) F(10)` | **4 of 4** |

🔴 **RAW COUNT AND VISIT COUNT ARE THE SAME NUMBER HERE AND BOTH ARE WRONG.** A
chord you pass through on the way somewhere is, by construction, a chord you
keep returning to. The owner's phrase is *"the ones i keep returning to"*, and
the thing that separates a chord you return to from a chord you pass through is
**how long you stay when you get there**, not how often you arrive.

✅ **EITHER TOTAL TIME HELD OR A HOLD GATE WORKS, AND THEY WORK EQUALLY WELL
HERE.** MEASURED: a gate anywhere from 200 ms to 800 ms puts all four loop
chords in the top four. ⚠️ **The gate's exact value is UNVERIFIED and the sweep
above cannot settle it**, because I generated passing chords at under 250 ms and
loop chords at over 1,200 ms, so any threshold in between works by construction.
**That gap is an assumption, not a measurement.**

⚠️ **A NOTE COUNT IS A SEPARATE GATE AND IT IS NOT OPTIONAL.** Two notes do not
name a chord, section 1.7, so the minimum is three notes held together. On a
piano with a sustain pedal that is not the same as three notes SOUNDING.
✅ **The page already has the right set for this**: `demo/nola/index.html` keeps
`heldNotes`, and its comment says why, MEASURED by reading it: *"IT IS FINGERS,
NOT VOICES. A pedalled chord goes on sounding long after the hands moved on, and
a row that stayed lit through it would be telling a player they are still
holding something they let go of."* **The learning mode reads `heldNotes` and
nothing else.**

### 2.2 The settling window

A player rolling a chord gives you its notes at four different instants, and
section 1.8 shows the recogniser's answer changing at each one. ✅ **The standard
answer is a debounce: when a note goes down or comes up, start or restart a
timer, and only when it fires do you name what is held.**

🔴 **THE WINDOW HAS TO BE LONGER THAN A ROLL AND SHORTER THAN A CHORD CHANGE,
AND NOBODY HERE KNOWS EITHER NUMBER.** UNVERIFIED, and stated as a starting
point to be measured rather than as a finding: a rolled chord spreads its notes
over something like 30 to 120 ms, and a chord change at 100 bpm is 600 ms apart.
A window of **150 to 250 ms** sits in that gap. **Both ends of that gap are
guesses.** Section 8.

⚠️ **AND A DEBOUNCE ON NOTE-DOWN IS NOT THE SAME AS ONE ON NOTE-UP.** Lifting
three fingers unevenly walks the recogniser back down through `C E G`, `C E`,
`C` on the way to silence, and each of those is a legitimate reading of what is
held. ✅ **The fix is to name on the LARGEST set held during the window rather
than on the set held when the timer fires**, which costs one extra variable and
removes the entire class.

### 2.3 What counts as the same chord twice when the voicing differs

✅ **THIS ONE IS EASY AND THE RECOGNISER HAS ALREADY SOLVED IT.** The tally is
keyed on the recognised `(root, quality)` pair, not on the notes. Every inversion
of `Cmaj` names as `C`, so they are one entry. A doubled root is one entry. The
voicing is thrown away at the moment of naming, which is what naming is for.

⚠️ **WHICH MEANS THE TALLY IS EXACTLY AS RELIABLE AS THE RECOGNISER AND NO
MORE.** If `C6` sometimes names as `Am7` and sometimes as `C6`, the player's one
chord becomes two rows. **That is a second reason to drop the sixths** rather
than an independent argument.

⚠️ **AND THE VOICING STILL HAS TO COME BACK FOR THE ROLL.** A row in the roll
needs notes, not a name, and the honest choice is between the voicing the player
actually used and the voicing `voiceChord` would produce. 🔴 **Use
`voiceChord`.** The roll's whole function is carrying a shape down the page to
the keys, `roll.mjs` says so in capitals, and `/nola/` already voices every row
into the instrument's reachable window with `lo: base, hi: base + REACH`. A
learned row that ignored that would be the one row on the page the player cannot
reach. ⚠️ **Store the played voicing too**, because *"show me how I played it"*
is the obvious next request and throwing it away is cheap now and expensive
later.

### 2.4 How a count becomes a shortlist without the roll flickering

🔴 **THE GOVERNING RULE IS `positron-ui`'s AND IT IS QUOTED HERE IN FULL BECAUSE
THIS FEATURE IS THE EXACT SHAPE IT WAS WRITTEN ABOUT:**

> 🔴 **NOTHING THAT REDRAWS EVERY FRAME MAY CHANGE HOW MUCH ROOM IT TAKES.**
> A live picture is fine. A live SENTENCE under it is not [...] reported as *"a
> horrible jump of content each time it updates"*. The words were accurate and
> it did not matter. [...] **The test is not "is it short", it is can this
> change its own height while somebody is looking at it.**

MEASURED on a 100 event session: 32 bars of `C G Am F`, then 32 bars of
`Dm G C Am`, with `Em` and `Fmaj7` thrown in on about half the bars. This is the
hard case, a player who changes their mind with two rivals competing:

| policy | list changes | of which pure re-sorts | row count changes | rows evicted |
| --- | --- | --- | --- | --- |
| top 4 by count, re-sorted every chord | **29** | **22** | 4 | 3 |
| played 3 or more times, top 4, re-sorted | 26 | 19 | 4 | 3 |
| played 3 or more, **admitted and pinned** | **4** | **0** | 4 | **0** |
| played 6 or more, admitted and pinned | 4 | 0 | 4 | 0 |
| played 3 or more, 6 slots, admitted and pinned | 6 | 0 | 6 | 0 |

🔴 **22 PURE RE-SORTS IS THE WHOLE PROBLEM IN ONE NUMBER.** A pure re-sort is
the same four chords in a different order: nothing new happened, the reader
learned nothing, and every row they were looking at moved. ✅ **Admit and pin
brings it to zero**, and every one of the 4 remaining changes is a row being
appended at the bottom, which is the one kind of change that does not move
anything already on screen.

⚠️ **AND THE RAW TALLY IN THAT RUN IS STILL WRONG, WHICH IS SECTION 2.1 AGAIN.**
MEASURED: `Fmaj7x19 Emx17 Cx16 Gx16 Amx16 Fx8 Dmx8`. The two passing chords WIN
on count. Any policy built on event count picks them. Time held fixes it and
admission order does not.

✅ **THE POLICY, THEN, IN FOUR LINES:**

1. Score by total time held, not by count.
2. A chord is admitted to the roll when its score crosses a threshold.
3. **Once admitted, a row never moves and never leaves.** New rows append below.
4. **Cap the slots**, four to six, and when they are full the roll stops growing
   rather than evicting. ⚠️ A full roll that refuses a new chord has to say so,
   or the page silently stops learning and looks broken.

🔴 **AND THERE IS A FIFTH THING THAT IS ABOUT THIS COMPONENT SPECIFICALLY AND
IS NOT OBVIOUS FROM OUTSIDE IT.** MEASURED by reading `demo/shell/roll.mjs`:
`setRows` does `current = next; picked = -1; focused = 0; draw()`. **Replacing
the rows throws away which row the player had selected and resets the keyboard
landing row to the top.** In the typed-chords mode that is correct and the
comment says why: *"The rows are new rows, so a remembered index would point at
a chord nobody typed."* 🔴 **In a learning mode the rows are NOT new rows, they
are the old rows plus one**, so `setRows` would cancel the player's selection
every time they held a new chord long enough. **The roll needs an append that
keeps the selection, or the page has to restore `pick()` and `focus()` after
every `setRows`.** Either is small. Neither is free, and neither happens by
accident.

---

## 3. Suggesting a third and a fourth

### 3.1 How much two chords pin down, which is less than it feels like

MEASURED over the 42 ordered pairs of distinct diatonic triads of C major,
against all 24 major and minor keys:

| keys consistent with the pair | how many pairs |
| --- | --- |
| 2 | 20 |
| 4 | 16 |
| 6 | 6 |

**Average 3.33 keys of 24 fit a pair. The minimum is 2 and it is never 1.**

🔴 **AND A THIRD CHORD DOES NOT GET TO 1 EITHER.** MEASURED over all triples of
distinct diatonic triads: **162 triples fit exactly 2 keys and 48 fit 4. Not one
fits exactly 1.** The floor of 2 is the relative major and its relative minor,
which share all seven chords and can never be told apart by chord membership.
`C maj` and `A min` hold the same triads. **No amount of listening to which
chords were played will separate them, ever.**

✅ **WHICH MEANS THE KEY IS A FIAT AND MUST BE SAID OUT LOUD, AND THE REPOSITORY
HAS ALREADY MADE EXACTLY THIS DECISION ONCE.** `parseChords` picks the first
chord's root as the key and its comment says: *"A page that showed numerals
without saying where the key came from would be stating a fact it had guessed."*
✅ **Use the same fiat and the same sentence.** MEASURED, with first-chord-is-
tonic as the tie break, on worked pairs:

```
C then G     4 keys fit (C maj, E min, G maj, A min)  -> key of C maj, read as I then V
Am then F    4 keys fit (C maj, D min, F maj, A min)  -> key of A min, read as i then VI
Dm then G    2 keys fit (C maj, A min)                -> key of C maj, read as ii then V  [a guess]
C then Am    6 keys fit (C maj, D min, E min, F maj, G maj, A min) -> C maj, I then vi
F then C     4 keys fit                               -> key of F maj, read as I then V
C then Eb    0 keys fit                               -> the rule has nothing to say
```

⚠️ **TWO OF THOSE CARRY A WARNING AND THEY ARE THE INTERESTING ONES.** `Dm then
G` and `Em then A` have no fitting key in which the first chord is the tonic, so
the fiat cannot be applied and the page falls back to the first fitting key,
which is a guess about a guess. 🔴 **`ii V` is one of the commonest openings
there is**, so this is not an edge case. **The page must be able to say `taking C
as the key, which is a guess` rather than silently picking one.**

🔴 **AND `C then Eb` FITS NO KEY AT ALL.** A player who plays two chords from
different keys gets nothing from a diatonic rule. That is not a defect to
engineer away, it is the rule's honest boundary, and the page should say the key
is unknown and fall back to something that always has an answer: the fifth above
and the fifth below the first chord. UNVERIFIED as a good musical answer, but it
always exists and it is never absurd.

### 3.2 A rule with no data in it

The whole functional rule for a major key, MEASURED at **173 bytes of JSON**:

```json
{"I":["vi","IV","V","ii","iii"],"ii":["V","vii","I","IV"],"iii":["vi","IV","ii"],
 "IV":["V","I","ii","vi"],"V":["I","vi","IV"],"vi":["IV","ii","V","I"],"vii":["I","iii"]}
```

Graded against **24 four-chord loops written from memory** (UNVERIFIED as a
corpus, and used here only to grade the RULE, never to claim anything about what
people play). Given the first two chords, does the rule offer the real third,
and given the real third, does it offer the real fourth:

| what the rule offers | top 1 | top 2 | top 3 | top 4 |
| --- | --- | --- | --- | --- |
| the third | 9/24 | 15/24 | **19/24** | 22/24 |
| the fourth | 14/24 | 18/24 | **22/24** | 23/24 |
| both | 5/24 | 11/24 | 18/24 | 21/24 |

And a baseline with no rule at all, always offering `I V IV vi` in that order:

| | top 1 | top 2 | top 3 | top 4 |
| --- | --- | --- | --- | --- |
| the third | 4/24 | 9/24 | 16/24 | 19/24 |
| the fourth | 5/24 | 16/24 | 20/24 | 23/24 |

✅ **THE RULE BEATS THE CONSTANT, AND NOT BY AS MUCH AS YOU WOULD HOPE.** At top
3 the rule gets 19 and the constant gets 16. 🔴 **This matters for the page's
design**: if the suggester offers **two** chords rather than one, it is right
about the third 15 times in 24 with the rule and 9 with the constant. **Offering
two is worth more than any amount of cleverness about which one to offer.**

### 3.3 The rule's SET is right and its ORDER is wrong

MEASURED, what each degree actually did in those 24 loops against what the rule
offers:

| degree | what the loops did | what the rule offers, in order |
| --- | --- | --- |
| `I` | V x7, IV x6, vi x3, ii x2, iii x1 | **vi** IV V ii iii |
| `ii` | V x6, IV x2 | V vii I IV |
| `iii` | vi x2, IV x1 | vi IV ii |
| `IV` | V x9, I x6, vi x1, ii x1 | V I ii vi |
| `V` | I x5, vi x4, IV x3, iii x1, ii x1 | I vi IV |
| `vi` | IV x6, ii x2, V x2, iii x1 | IV ii V I |

🔴 **THE RULE PUTS `vi` FIRST AFTER `I` AND THE LOOPS PUT `V` FIRST, AND THAT
ONE ROW IS MOST OF THE TOP-1 ERROR.** Everywhere else the rule's first choice is
the loops' first choice. **The sets agree almost perfectly. The ordering of one
row does not.**

### 3.4 What a corpus would buy, measured as an upper bound

I re-ordered the rule's lists using the transition counts from those same 24
loops, keeping the rule's set as the tail for anything the loops never showed.
🔴 **THIS TRAINS AND TESTS ON THE SAME DATA, SO IT IS AN UPPER BOUND ON WHAT
RE-ORDERING CAN POSSIBLY BUY, NOT A SCORE.** MEASURED:

| table | top 1 third | top 2 third | top 3 third | top 3 fourth |
| --- | --- | --- | --- | --- |
| the 173-byte rule | 9/24 | 15/24 | 19/24 | 22/24 |
| **re-ordered by the loops themselves** | **10/24** | **17/24** | **20/24** | **23/24** |

🔴 **ONE LOOP IN TWENTY-FOUR AT TOP 1, TWO AT TOP 2, ONE AT TOP 3. AND THAT IS
THE CEILING.** A real corpus, evaluated honestly on data it had not seen, does
worse than this. **The download is not worth it for four chords in a key.**

⚠️ **THE RE-ORDERED TABLE IS 186 BYTES AND THE COUNTS BEHIND IT ARE 22 NUMBERS.**
So if somebody ever does want the ordering, what crosses the wire is 22 numbers,
not a corpus. **The corpus question is entirely about where those 22 numbers come
from, and the licence work in section 4 is about whether they may be copied out
of somebody else's file.**

### 3.5 What the rule cannot do, stated plainly

- 🔴 **MINOR KEYS ARE A SECOND TABLE AND THE RULE ABOVE HAS ONLY THE MAJOR ONE.**
  MEASURED as a live gap in the prototype: `Am then F` reads as `i then VI` and
  the rule has no `VI` row, so **it returned nothing at all**. That doubles the
  table to about 350 bytes and it is not optional, because half of everything
  anybody plays on a piano is in a minor key.
- 🔴 **IT IS DIATONIC AND NOTHING ELSE.** No secondary dominants, no borrowed
  chords, no modal interchange, no `bVII`. `C then Eb` gets nothing. A blues
  player gets nothing useful at all, because `C7 F7 G7` in C is three chords the
  rule regards as belonging to three different keys.
- ⚠️ **IT KNOWS NOTHING ABOUT RHYTHM, PHRASE LENGTH OR CADENCE POSITION**, which
  is most of why a real progression goes where it goes. The fourth chord of a
  four bar loop is under pressure to return home that the third one is not, and
  a bigram table has no idea which chord it is looking at.
- ⚠️ **AND IT CANNOT TELL A GOOD SUGGESTION FROM A PLAUSIBLE ONE.** Everything
  in the table is plausible. That is what makes it a 173 byte file.

---

## 4. Every corpus, and what its licence actually says

🔴 **NOTHING WAS DOWNLOADED.** Licence files, READMEs and host API metadata only:
roughly **50 HTTP requests, well under 1 MB total**, the largest single body a
260 KB HTML page. Every size below came from a GitHub trees call, a HuggingFace
datasets-server call, a Zenodo API record, a `HEAD`, or a one byte ranged GET
that reports `Content-Range`. This is the technique
`research/rhodes-packs-2026-09-23.md` used on the Rhodes packs, and its rule
applies here too: **positron.studio serves what it uses, so a dataset that
cannot be redistributed is not usable here.**

### 4.1 The table

DOCUMENTED, all fetched 2026-09-23.

| source | licence | verdict | size | what it holds |
| --- | --- | --- | --- | --- |
| Hooktheory TheoryTab DB, the site | site terms, anti-scraping clause | 🔴 **REFUSED** | n/a | the next-chord tables themselves |
| Hooktheory user contributions, forum terms | CC BY-NC-SA 3.0 | 🔴 **REFUSED** | n/a | all TheoryTab content |
| Hooktheory dataset via `chrisdonahue/sheetsage` | CC BY-NC-SA 3.0 | 🔴 **REFUSED** | 20,075,896 B | 50 h of aligned melody and harmony, roman numerals |
| **McGill Billboard** | **CC0** | ✅ **USABLE** | 340,263 B | 890 slots, 740 songs, timed chord symbols |
| **iRealPro Corpus of Jazz Standards, the iRb corpus** | **CC BY 4.0** | ✅ **USABLE** | 530,984 B | 1,186 jazz standards, kern, chord symbols |
| Isophonics Beatles, Queen, Zweieck | **none stated anywhere** | 🔴 **REFUSED** | 2,779,640 B | timed chord, key, beat, segment labels |
| Chordonomicon, HuggingFace | CC BY-NC 4.0 | 🔴 **REFUSED** | 264,198,044 B, 679,807 rows | chord sequences, section, genre, decade |
| `spyroskantarelis/chordonomicon`, GitHub | Apache-2.0 | ⚠️ UNCLEAR | 268,508 B | code and a chord mapping, not the corpus |
| Jazz Harmony Treebank | CC BY-NC-SA 4.0 | 🔴 **REFUSED** | 4,826,895 B | 150-odd standards, chords and harmonic trees |
| `ohollo/lmd_chords`, HuggingFace | CC BY-SA 4.0 | ✅ usable, share-alike | 8,563,052 B, 31,032 rows | timed chord symbols out of Lakh MIDI |
| SALAMI | CC0 | ✅ usable, wrong data | 5,699 KB | structural segmentation, not chords |
| BPS-FH, `Tsung-Ping/functional-harmony` | GPL-3.0 on the repo | ⚠️ UNCLEAR | 2,612 KB | 32 Beethoven first movements, roman numerals |
| DCMLab Annotated Beethoven Corpus | CC BY-NC-SA 4.0 | 🔴 **REFUSED** | 170,885 KB | harmonic analyses |
| When in Rome | CC BY-SA 4.0 for new content only | ⚠️ usable with care | 193,452 KB | functional analyses, mixed provenance |
| music21 | BSD-3-Clause code, corpus separate | ✅ code usable | 540,457 KB | an analysis library, not a table |
| `DataStrategist/Musical-chord-progressions` | **"License for data unknown"** | 🔴 **REFUSED** | 1,273 B and 36,635 B | Hooktheory transition probabilities, 1st to 4th chord |
| `Music::Dataset::ChordProgressions`, CPAN | Artistic 2.0 / Perl 5 | ⚠️ usable, provenance disclaimed | 41,015 B | named progressions, 5 genres, chords and roman numerals |

### 4.2 Hooktheory is exactly what this page wants and is exactly what it cannot have

Three documents, DOCUMENTED and quoted. `https://www.hooktheory.com/terms`, the
Anti-Scraping Policy clause:

> "Anti-Scraping Policy. Public Display and Use. Except as expressly authorized
> by Hooktheory (e.g., via a written data license or API terms), no third party
> may copy, scrape, bulk-download, text-and-data mine, or redistribute the
> website including the TheoryTab database or any substantial portion of it
> (including using it to train, fine-tune, or evaluate models)."

`https://forum.hooktheory.com/tos`:

> "User Content License User contributions are licensed under a Creative Commons
> Attribution-NonCommercial-ShareAlike 3.0 Unported License."

`https://raw.githubusercontent.com/chrisdonahue/sheetsage/main/LICENSE`:

> "IMPORTANT NOTE: All *code* in this repository is MIT-licensed, but dataset and
> trained models are distributed under CC BY-NC-SA 3.0, as they are derived from
> user contributions on HookTheory."

🔴 **AND THE OBJECT THIS PAGE WANTS ALREADY EXISTS, PACKAGED, AT 1 KB TO 36 KB,
AND IT IS THE CLEAREST REFUSAL IN THE WHOLE SURVEY.**
`DataStrategist/Musical-chord-progressions` holds `chord.1stL.csv` at **1,273
bytes** and `chord.2ndL.csv` at **36,635 bytes**, reading `"I","1","0.154"` and
`"1,5","V","5","0.265"`. First, second, third and fourth chord probabilities by
roman numeral, ready to paste into a page. Its `LICENSE.txt` opens, DOCUMENTED
and verbatim:

> "License for data unknown. Please contact HookTheory.com directly."

**The data is Hooktheory's, restated by somebody who did not have it to give.**
⚠️ There is also a Trends API at `www.hooktheory.com/api/trends/stats` that
returns next-chord probabilities legitimately. Two things rule it out here: its
docs page answered **HTTP 404** today so the current terms are UNVERIFIED, and
an API is a per-visitor call to somebody else's server on every page load, which
is the shape this repository already refuses in capitals for ERR mounts.

### 4.3 The two that are clean

✅ **McGill Billboard, CC0.** DOCUMENTED from `https://ddmal.ca/research/...`.
⚠️ Note the URL everybody cites, `ddmal.music.mcgill.ca`, is dead and answers a
GitHub Pages 404 today. The live host is `ddmal.ca`. Verbatim:

> "In order to facilitate the best possible use of these data in the future, we
> have made them available legally under a CC0 license, but we ask that users
> follow scholarly norms in any public-facing work based on upon these data by
> citing the following ISMIR paper"

> "To the extent possible under law, the DDMAL has waived all copyright and
> related or neighbouring rights to the McGill Billboard annotations."

> "The set includes annotations and features for 890 slots [...] and comprises
> 740 distinct songs"

**340,263 bytes** for `billboard-2.0-salami_chords.tar.gz`, MEASURED by a one
byte ranged GET. Harte-syntax chord symbols with onset times, section labels,
metre and a stated tonic. **The citation request is a scholarly norm, not a
licence condition. CC0 attaches no condition to anything derived from it.**

✅ **The iRealPro Corpus of Jazz Standards, CC BY 4.0.** DOCUMENTED from the
Zenodo API record, DOI `10.5281/zenodo.3546040`, Shanahan and Broze, 2019,
`license: cc-by-4.0`. **530,984 bytes** for 1,186 kern files. ⚠️ Its original
home at `musiccog.ohio-state.edu` is gone and 301s to `music.osu.edu`, so Zenodo
is the surviving copy.

🔴 **AND ITS DERIVATIVE RELICENSES DOWNWARD, WHICH IS A TRAP WORTH NAMING.** The
Jazz Harmony Treebank selects from that same CC BY 4.0 corpus and its
`LICENSE.md` opens "Attribution-NonCommercial-ShareAlike 4.0 International".
**The parent is usable and the child is not.** Reaching for the tidier, richer,
tree-annotated version is the obvious move and it is the wrong one.

### 4.4 Isophonics is refused for the opposite reason

🔴 **NOBODY SAID NO, AND THAT IS NOT THE SAME AS YES.** DOCUMENTED: the full
text of `isophonics.net/datasets`, `/content/reference-annotations.html` and
`/content/reference-annotations-beatles.html` was searched for any sentence
containing "licen", "copyright", "Creative Commons", "non-commercial",
"permission", "terms of use" or "attribut". **Zero matches on both annotation
pages.** The only Creative Commons sentence on the whole index is about the room
impulse responses, a different dataset.

`mirdata`, which is the reference loader for these things, reached the same
conclusion and says so in its source, DOCUMENTED and verbatim:

> "Unfortunately we couldn't find the license information for the Beatles
> dataset."

**Absence of a licence is all rights reserved.** 2,779,640 bytes, MEASURED by
`HEAD`, that this repository may not serve.

### 4.5 Is there a small, redistributable, packaged table

**One, and its author disclaims knowing where it came from.**
`Music::Dataset::ChordProgressions` on CPAN, Artistic 2.0 per the GitHub API and
`license = Perl_5` in its `dist.ini`. One file, `Chord-Progressions.csv`,
**41,015 bytes**, five columns reading `"blues","major","12 bar form",
"C7-C7-C7-C","I-I-I-I"`. Chord names and roman numerals side by side,
transposable, shippable today. DOCUMENTED, the author's own documentation:

> "I stumbled across this list, saved it on my hard-drive for a long time, and
> then forgot where it came from! Also the documentation in the original list
> said nothing about who made it or how."

> "Each of these is divided into a named `type` of progression. Take these types
> with a grain of salt. They may or may not be meaningful..."

🔴 **A LICENCE IS A CLAIM BY THE PERSON GRANTING IT, AND THIS ONE IS GRANTED BY
SOMEBODY WHO SAYS HE DOES NOT KNOW WHAT HE IS GRANTING.** That is a different
failure from a licence that says no: **it looks permissive and may not be.** It
is the same shape `research/rhodes-packs-2026-09-23.md` found on jRhodes3, where
one hand wrote CC BY-NC and the same hand wrote CC0 three minutes later, and the
answer there was *neither, ask him*.

⚠️ **AND IT IS THE WRONG SHAPE ANYWAY.** It is a list of named progressions, not
a transition table. It can answer *here are four-chord shapes containing I then
vi*. It cannot answer *given I and vi, what is third and how likely*.

✅ **SO THE ACCURATE SENTENCE IS THE OPTIMISTIC HALF OF THE ONE THE BRIEF
GUESSED AT.** No packaged, permissively licensed, corpus-derived next-chord
probability table exists. **But the counts are derivable from corpora that MAY
be redistributed**, which is a different situation from the pessimistic version:
McGill Billboard is CC0 at 340 KB, the iRealPro corpus is CC BY 4.0 at 531 KB,
and `lmd_chords` is CC BY-SA 4.0 at 8.5 MB. **A trigram count over 890 annotated
slots compresses to a few kilobytes, and CC0 attaches no obligation to the
result at all.** ⚠️ **That is a path, not a recommendation.** Section 6 argues
it is not worth walking.

### 4.6 music21, since it is the classic rule-based reference

DOCUMENTED: `license.spdx_id: BSD-3-Clause` from the GitHub API, and the README
settles the LGPL question verbatim:

> "(For historical reasons, music21 before v2 can also be used under the LGPL
> license. Between v1 and 2, all prior contributors were contacted [...] and all
> agreed to relicense their contributions under the BSD license)."

Its corpus is separate and is not clean, `music21/corpus/license.txt` verbatim:

> "Some encodings included in the corpus may not be used for commercial uses or
> have other restrictions"

and `essenFolksong/license.txt`:

> "The legal status of the Essen folksong database is unclear, as the data has
> been input by many people."

⚠️ **ITS VALUE HERE IS AS A REFERENCE TO PORT A RULE FROM, NOT AS A
DEPENDENCY.** It is Python, this page runs in a tab, and its corpus is encoded
scores rather than a transition table. The BSD code is genuinely free to read.

---

## 5. What it costs in a tab

`/nola/` already ships **3,824,981 bytes across 95 recordings**, MEASURED on
this disk today, so the brief's bar is that anything over a few tens of
kilobytes needs an argument. **Nothing here comes close to needing one.**

### 5.1 The recogniser

MEASURED, written the way it would ship: one 12 bit pitch class mask per
quality, a 4,096 entry `Uint8Array` popcount table, a rotate for each of 12
roots, no allocation and no sort.

| | |
| --- | --- |
| the quality table, as source | **148 bytes** |
| the popcount table, built at load | 4,096 bytes of RAM, 0 bytes of source |
| comparisons per naming | 12 roots x 11 qualities = **132** |
| **time per naming** | **0.30 microseconds** |

MEASURED: **2,000,000 namings in 594 ms**, node v25.9.0 on this laptop. The
table in full, which is the whole of the data this feature needs:

```js
const M = [['maj',145],['min',137],['7',1169],['min7',1161],['maj7',2193],
           ['dim',73],['aug',273],['sus2',133],['sus4',161],['min7b5',1097],['5',129]];
```

⚠️ **THE FIRST VERSION I WROTE TOOK 27.14 MICROSECONDS, NINETY TIMES LONGER**,
because it built 132 objects and sorted them on every call. MEASURED both ways.
Neither number matters at human pace, and the gap is worth recording because the
obvious implementation is the slow one and somebody will reach for it.

🔴 **AND 0.30 MICROSECONDS SETTLES A DESIGN QUESTION RATHER THAN A PERFORMANCE
ONE.** At that cost the page can name the held chord on **every note-down and
every note-up**, which means the settling window in section 2.2 exists purely to
decide when to BELIEVE an answer, never to decide when to compute one. **There
is no reason to throttle it and no reason to put it in a worker.**

### 5.2 The suggester

MEASURED:

| | bytes |
| --- | --- |
| the functional rule, major keys, as JSON | **173** |
| the same re-ordered from data | 186 |
| the counts behind that re-ordering, 22 numbers | 193 |
| with a minor-key table beside it | about **350**, INFERRED by doubling |

Against the alternatives, MEASURED or DOCUMENTED:

| what you would ship | bytes |
| --- | --- |
| the 173 byte rule | **173** |
| a bigram over 7 diatonic degrees, 1 byte a cell | 49 |
| a bigram over 14, adding sevenths | 196 |
| a trigram over 14 | 2,744 |
| a bigram over 12 roots x 4 qualities, absolute rather than key relative | 2,304 |
| a trigram over the same | **110,592** |
| a bigram over 12 roots x 11 qualities | 17,424 |
| the CPAN progression list | 41,015 |
| the McGill Billboard archive it would be counted from | 340,263 |
| the Hooktheory dataset, which may not be shipped at all | 20,075,896 |

🔴 **THE ONE ARCHITECTURAL DECISION THAT MATTERS IS KEY RELATIVE AGAINST
ABSOLUTE, AND IT IS A FACTOR OF 48.** A trigram over roman numerals is **2,744
cells**. The same trigram over absolute chord names is **110,592**. ✅ **Work in
roman numerals and transpose at the point of display**, which is what
`chords.mjs`'s `roman()` already does in the other direction and what the page
already shows on every row.

### 5.3 The arithmetic per chord, end to end

INFERRED from the measurements above, for one chord recognised and one
suggestion produced:

1. **Name the held notes**: 132 rotate-and-popcount, **0.30 microseconds**.
2. **Update the tally**: one map lookup and one addition.
3. **Decide admission**: one comparison against a threshold.
4. **Infer the key**: 24 keys x 2 chords x a 7 entry lookup = 336 comparisons,
   the same order as one naming.
5. **Look up the suggestions**: one object property read.

**Under a microsecond, once per settled chord, at most a few times a second.**
Nothing on this page needs a budget.

---

## 6. What the idea is worth

### 6.1 The recogniser is worth building and its honest ceiling is about 88 per cent

✅ **The mode is real and the arithmetic is small.** A player holds `C E G`, the
page writes `C` into the roll, and the roll already knows how to light that row
back when the chord is played again. Every part of that except the naming
already exists in this repository.

🔴 **AND IT HAS A CEILING THAT NO WORK WILL RAISE.** MEASURED: 88.0 per cent
top-1 on the eleven qualities people play, and the residue is four collision
classes that are facts about music rather than about code. **A page that
promises to name what you played will be wrong about `Caug` forever.**

### 6.2 The suggester is worth building with no data, and a corpus is not worth downloading

🔴 **SAY IT PLAINLY, BECAUSE THE BRIEF ASKED FOR IT PLAINLY: A RULE BASED
SUGGESTER WITH NO DATA IS AS GOOD AS A CORPUS FOR FOUR CHORDS IN A KEY, AND THE
DOWNLOAD SHOULD BE SKIPPED.** The evidence, MEASURED and stated with its
weakness attached:

- The 173 byte rule names the real third chord in its top 3 for **19 of 24**
  loops and the real fourth for **22 of 24**.
- Re-ordering that rule from data, **training and testing on the same 24 loops
  so the number is an upper bound**, moves top 3 from 19 to **20 of 24**.
- What a corpus improves is the ORDER of a list whose CONTENTS the rule already
  has right. MEASURED per degree: the rule's first choice matches the loops'
  first choice on every degree except `I`, where the rule says `vi` and the
  loops say `V`.
- ⚠️ **THE 24 LOOPS ARE MINE, FROM MEMORY, AND THEY ARE NOT A CORPUS.** They
  cannot establish what people play. They can and do establish that the rule and
  a re-ordering of the rule score within one or two of each other, which is the
  only claim made here.

⚠️ **THE HONEST CAVEAT ON THAT CONCLUSION.** It holds for **four diatonic chords
in one key**, which is what was asked for. It would not hold for a jazz page
wanting tritone substitutions, for a modal page, or for anything asking *what
would an actual song do next*. **The scope of the finding is the scope of the
request.**

### 6.3 What the page should do about `C6` and `Am7`, which it will never tell apart

🔴 **THE BRIEF'S QUESTION, ANSWERED DIRECTLY: IT CANNOT, AND IT NEVER WILL, AND
THE PAGE SHOULD NOT TRY.** MEASURED at a bass weight of 1.0, with sixths in the
vocabulary:

```
C6 with C in the bass, 60 64 67 69   -> Cmaj6 5, Amin7 4, C 3, Cmaj7 2
Am7 with A in the bass, 57 60 64 67  -> Amin7 5, Cmaj6 4, Amin 3, C 2
the same four notes with G lowest    -> Cmaj6 4, Amin7 4     A DEAD TIE
```

✅ **The bass settles it when the bass is one of the two roots. It settles
nothing otherwise**, and a heavy enough bass weight to force it does damage
elsewhere: MEASURED, at 1.0 a first inversion `Am` (`C E A`) ties with a `Cmaj6`
missing its fifth, so **every first inversion minor triad becomes a sixth
chord.**

✅ **THE ANSWER IS TO DROP THE SIXTHS FROM THE VOCABULARY AND SAY SO ONCE IN THE
LOG.** `C6` then always names as `Am7`, which is one arbitrary decision stated
out loud, and the confident-answer rate more than doubles from 32.8 to 72.0 per
cent. 🔴 **A page that is quiet two thirds of the time to avoid one arbitrary
choice has made a worse choice.** ⚠️ And the roll must never be given a chord
the recogniser was unsure about, because `setHeld` will light that row when the
player plays it and the page will have confirmed its own mistake to somebody who
trusted it.

### 6.4 One thing that would be worth more than any of this

⚠️ **UNVERIFIED and offered as an opinion, not a finding.** The most interesting
thing this feature could show is not a name at all. It is **the fact that four
notes have two names**, drawn on the roll as two labels on one row. That is a
real property of music, it is measurable, it is visible in the picture the page
already draws, and no other page here says it. **The recogniser's weakness is
the page's subject.**

---

## 7. The recommendation

**Build the learning mode. Build the suggester from the 173 byte rule. Do not
download a corpus.** In order:

1. 🔴 **A NEW MODULE BESIDE `chords.mjs`, NOT INSIDE IT.** `chords.mjs` goes
   symbol to notes and is 49 checks of decidable arithmetic. Naming is a
   different problem with a different failure mode, and folding it in would put
   a scorer with tunable weights inside a file whose whole value is that it has
   none. ⚠️ It shares the `QUALITIES` table and nothing else, and even that needs
   its own ORDER, section 1.6.
2. ✅ **ELEVEN QUALITIES, NOT TWENTY-FOUR.** `maj min 7 min7 maj7 dim aug sus2
   sus4 min7b5 5`. No sixths, no diminished sevenths, no ninths.
3. ✅ **BASS WEIGHT 0.5, MISSING PENALTY 1.0, MARGIN 1.0.** MEASURED as never
   wrong when it speaks, speaking about 72 per cent of the time.
4. ✅ **BELOW THE MARGIN, TWO NAMES AND NO VERDICT**, and nothing written to the
   roll.
5. ✅ **SETTLE ON THE LARGEST SET HELD DURING A WINDOW**, not on the set held
   when the timer fires. 150 to 250 ms as a starting guess, marked as a guess.
6. ✅ **SCORE BY TIME HELD.** Not by count, which MEASURED puts two passing
   chords at the top of a four chord loop.
7. ✅ **ADMIT AND PIN.** A row never moves and never leaves. Four to six slots,
   and a full roll says it is full rather than evicting. MEASURED: 4 changes
   against 29, and 0 re-sorts against 22.
8. 🔴 **THE ROLL NEEDS AN APPEND THAT KEEPS THE SELECTION.** MEASURED by reading
   `roll.mjs`: `setRows` resets `picked` to -1 and `focused` to 0, which is
   correct for typed chords and wrong for learned ones.
9. ✅ **VOICE EVERY LEARNED ROW WITH `voiceChord` INTO `lo: base, hi: base +
   REACH`**, exactly as `drawChords` already does, or the page will show a row
   the player cannot reach.
10. ✅ **THE KEY IS A FIAT AND IS SAID IN THE LOG**, in the sentence
    `parseChords` already uses. MEASURED: two chords never pin the key to fewer
    than 2 of 24, and three chords do not either.
11. ✅ **SUGGEST TWO CHORDS, NOT ONE.** MEASURED: top 1 gets the third right 9
    times in 24 and top 2 gets it 15 times. **Offering two is worth more than
    any cleverness about which one.**
12. 🔴 **A MINOR KEY TABLE IS NOT OPTIONAL.** MEASURED as a live gap: `Am then
    F` reads as `i then VI` and a major-only rule returns nothing at all.

⚠️ **AND THE THINGS NOT TO DO**, each of which looked reasonable at some point
during this work:

- Do not take the lowest note as the root. MEASURED at **0.0 per cent on every
  inversion**.
- Do not raise the bass weight to buy coverage. MEASURED: it buys 42 points of
  coverage and costs 23 points of precision.
- Do not put the whole `QUALITIES` table in the recogniser. MEASURED: 26 points
  of coverage for the ability to name `Cmaj13`.
- Do not re-sort the roll. MEASURED: 22 pure re-sorts in 100 chords.
- Do not call the Hooktheory Trends API from the page. It is somebody else's
  server on every visit, which this repository refuses in capitals, and its
  terms could not be read today.
- Do not ship the 41 KB CPAN progression list without asking its author where it
  came from. The licence is clean and the provenance is disclaimed in the same
  document.

---

## 8. What could not be settled, and what has to be measured

🔴 **EVERY TIMING NUMBER IN THIS DOCUMENT IS A GUESS OR A SYNTHETIC, AND THEY
ARE THE NUMBERS THE FEATURE ACTUALLY TURNS ON.**

1. 🔴 **HOW LONG A ROLLED CHORD TAKES ON THIS DESK.** UNVERIFIED. I assumed 30
   to 120 ms. **Measure it**: play twenty chords on the MK-425C, log every
   note-on timestamp through the path `/nola/` already has, and read the spread
   between the first and last note of each. One session, no new code beyond a
   log line.
2. 🔴 **HOW LONG A CHORD IS HELD WHEN IT IS MEANT, AGAINST WHEN IT IS PASSED
   THROUGH.** UNVERIFIED, and my synthetic session put a factor of ten between
   them BY CONSTRUCTION, which is why every gate from 200 to 800 ms worked. **If
   the real gap is a factor of two, the gate is a much harder choice and might
   not exist.** Measure the same session: histogram of hold times.
3. ⚠️ **WHETHER A PLAYER PLAYS ROOT POSITION.** All 1,704 test cases are
   generated, weighting every inversion equally. If real playing is 80 per cent
   root position the recogniser does better than 88 per cent; if it is mostly
   rootless voicings it does much worse. **Nothing here can tell.**
4. ⚠️ **WHETHER THE SUSTAIN PEDAL BREAKS THE TALLY.** `heldNotes` is fingers
   rather than voices, which is right, but a player who pedals through a change
   holds nothing for a moment and the window may fire on a fragment. Untested.
5. ⚠️ **THE 24 LOOPS ARE MINE AND FROM MEMORY.** They grade the rule against a
   re-ordering of itself, which is all they are used for. **They establish
   nothing about what anybody plays.**
6. ⚠️ **THE HOOKTHEORY TRENDS API TERMS.** `/api/trends/docs` answered **HTTP
   404** behind a Next.js shell today, so what is currently permitted through
   the API is UNVERIFIED. Only the scraping ban and the CC BY-NC-SA on
   contributions were read.
7. ⚠️ **WHETHER BPS-FH's GPL-3.0 IS MEANT TO COVER ITS DATA.** Nothing in that
   repository says either way. GPL on a data file is unusual enough that the
   intent is not readable from the field.
8. ⚠️ **THE CPAN LIST'S PROVENANCE**, disclaimed by its own author in its own
   documentation.
9. ⚠️ **HOW THIS FEELS.** Nobody has played it. A suggester that is right 15
   times in 24 might be delightful or might be annoying, and that is not a
   number.

---

## 9. The smallest thing that would prove or kill it

🔴 **ONE FILE, NO PAGE CHANGES, NO BROWSER: `demo/shell/name-test.mjs` BESIDE
`chords-test.mjs`, GRADING A RECOGNISER IN `demo/shell/name.mjs`.**

That is the shape this repository already trusts for exactly this kind of
arithmetic. `chords-test.mjs`, `looper-test.mjs`, `pedal-test.mjs` and
`xr-quit-test.mjs` are all a module and a test with no DOM in them, and
`chords-test.mjs`'s own header says why: *"every bug it has had so far lived in
one of them [...] none of those needs a browser and none of them looks wrong
from the outside, because every one of them returns a perfectly good chord that
is the wrong chord."*

**What it would contain**, all of which exists as scratch arithmetic already:

1. The 148 byte mask table and a scorer with two named weights.
2. The generator: every root position, inversion, doubled root and omitted fifth
   across 11 qualities and 12 roots, **600 cases**, with the expected name.
3. **The assert that decides everything: with a margin of 1.0 the recogniser is
   never wrong.** If that goes red the idea is dead, because a page that names
   chords wrongly with confidence is worse than one that says nothing.
4. The four negative controls that name the collisions rather than hiding them:
   `Caug` must come back unsure, `Csus2` must come back unsure, `C E G B` must
   come back `Cmaj7` confidently, and `C E G A` must come back `Amin7`.
5. A round trip against `parseChord`: **for every chord `parseChord` spells,
   naming its root position notes must return the same name**, on the 11 quality
   subset. That is a check the two directions agree, and it is the one assert
   that would catch a table drifting apart later.

**What it costs**: one module, one test, one command, no browser, no fetch, no
change to any page, and nothing for a visitor to load. **What it settles**:
whether the confident-answer rate survives contact with real weights and a real
tie break, which is the only claim in this document that the whole feature rests
on.

⚠️ **AND THE SECOND SMALLEST THING, IF THE FIRST ONE GOES GREEN, IS A LOG LINE
RATHER THAN A FEATURE.** Put the recogniser behind `?learn=1` on
**https://positron.studio/nola/**, have it do nothing but write
`held C E G, reading C, margin 1.0` to the page's log, and play for five
minutes. That produces the two histograms section 8 asks for, it writes nothing
to the roll, it changes no control, and it answers the question no amount of
generated test data can: **does the thing name what a person meant.**
