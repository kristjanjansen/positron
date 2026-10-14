# Kit lessons: suggest.mjs, suggest-test.mjs

The long comments cut from `demo/shell/suggest.mjs` and `demo/shell/suggest-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-suggest.md#<anchor>`.

<a id="header"></a>

## suggest.mjs, file header

demo/shell/suggest.mjs. What might come next, out of a counted table.

  node demo/shell/suggest-test.mjs

🔴 A SUGGESTER READS WHAT A RECOGNISER NAMED, WHICH IS WHY THIS IS BESIDE
`name.mjs` AND NOT INSIDE IT. That file turns notes into a name and has one
job with a measurable ceiling. This one turns a line of names into two
proposals and has no ceiling at all, because there is no right answer to what
somebody should play next.

── THE TABLE IS COUNTED AND THE RULE THAT PRECEDED IT IS A FALLBACK ────────

🔴 THE 173 BYTE DIATONIC RULE THIS SHIPPED WITH FIRST SCORES **1.4 PER CENT
TOP 1 ON JAZZ AND IS SILENT ON 65.3 PER CENT OF CASES**, MEASURED in
`research/chord-suggester-benchmark-2026-09-23.md` over 251 held-out jazz
standards and 176 held-out pop songs. It loses to a constant baseline that
offers the same two chords forever. 🔴 **AND ITS PROBLEM IS THE ALPHABET
RATHER THAN THE ORDERING**: only 34.9 per cent of real next chords are one of
its seven diatonic triads, so no amount of re-ordering seven rows reaches the
other two thirds. A tritone substitution is on `bII`, a backdoor dominant on
`bVII`, a secondary dominant is a major third on a degree the key says is
minor, and a borrowed `iv` is minor where the key says major. **None of the
four has a slot in a diatonic numeral.**

✅ **SO THE ALPHABET IS `(DEGREE 0..11, CLASS)`**, seven classes over twelve
degrees, and the table is a trigram counted over it. MEASURED: **48.5 per
cent top 1 and 67.4 per cent top 3** on held-out jazz, and 12 of 16 named
jazz devices in the top 2.

⚠️ THE RULE IS KEPT AS THE LAST RESORT AND NOT DELETED. The table backs off
trigram to bigram; on a context genuinely in neither, a diatonic rule is a
better answer than the globally commonest chord. ⚠️ **THAT IS UNVERIFIED**
and the benchmark says so: the table's own backoff never left a case
uncovered to measure it on.

── THE TWO SLOTS ARE TWO JOBS AND THE BENCHMARK PROVED IT ──────────────────

🔴 A SINGLE RANKED LIST SCORED ON ACCURACY IS THE SHAPE THAT MAKES *be right*
AND *no cliches* FIGHT OVER ONE CELL, and the constant baseline is the proof:
13.8 per cent top 1 with an entropy of 1.00 bits and **two distinct answers
in eleven thousand contexts**. A page built to maximise that number would
offer `V7` and `I` forever and would look like it was working.
MEASURED, held-out jazz:

  slot A, idiomatic     48.7% names the real next chord   16.2% global max
  slot B, worth hearing  9.9% names the real next chord    1.0% global max
                         90.7% of what it offers is ATTESTED after that chord

✅ **SLOT B NAMING THE REAL NEXT CHORD ONLY 9.9 PER CENT OF THE TIME IS THE
DESIGN WORKING, NOT FAILING.** It is not trying to. What it must not do is
stop being attested, and it does not.

⚠️ AND PURE PMI WITH NO POOL WAS REFUSED, which is the setting that looks
most adventurous. MEASURED: 9.5 points of attestation for 1.8 bits of
surprisal, and the suggestions it makes are visibly wrong. **Adventurous and
unattested are not the same thing.**

── SLOT A IS SAMPLED SINCE 2026-09-25, AND THE ARGMAX WAS THE COMPLAINT ────

🔴 ASKED AS *"they sound unimaginative and dry and not moving anywhere"*, AND
`plans/plan-better-chords-2026-09-25.md` MEASURED THAT THE SUGGESTIONS ARE NOT
BROKEN, THEY ARE THE ARGMAX, AND THE ARGMAX IS THE DEFINITION OF
UNSURPRISING. Taking slot A ten times in a row, on held-out jazz:

  slot A, always            99.1% of walks cycle   3.74 distinct chords in ten
  sampled, temperature 1    52.6%                  7.52
  THE REAL SONGS            52.7%                  7.42

✅ **SAMPLING FROM THE TABLE ALREADY SHIPPED REPRODUCES THE STATISTICS OF REAL
MUSIC ON EVERY AXIS MEASURED**, and 96.6 per cent of what it says is played
after that chord somewhere in songs the table has never seen.

🔴 THE TEMPERATURE IS A STYLE FACT AND LIVES IN THE TABLE, NOT HERE. Pop's
real songs cycle 89.0 per cent of the time with 4.65 distinct chords in ten,
which is nowhere near 1.0. **The same dial that makes jazz right makes pop
wrong**, so it is one number per style beside the spelling field.

⚠️ THE COUNT FLOOR IS WHAT KEEPS THIS ATTESTED AND IT IS ALREADY IN THE
SHIPPED TABLE. `build-chord-tables.mjs` prunes at `row>=3`, so there is no
tail here to draw from. Sampling without one costs 9.5 points of attestation,
MEASURED, which is the same trap pure PMI was refused for.

🔴 AND THE SAMPLER IS SEEDABLE, WHICH IS NOT A CONVENIENCE. Nothing about any
of the numbers above can be regression tested against a generator that cannot
be made to repeat itself, and `suggest-test.mjs` asserts BOTH halves: the same
seed twice is the same line, and two seeds are two lines. One half alone
passes on a sampler that always returns the same thing.

── AND SLOT B WAS STILL AN ARGMAX UNTIL 2026-09-26 ────────────────────────

🔴 REPORTED AS *"suggeston are better but still a bit meh"*. `/nola/` draws
the SECOND slot, and slot B is the highest pointwise mutual information row
that A did not take, so it is the PMI top unless A collided with it and the PMI
second when it did. MEASURED by `demo/resources/chord-e6-keep.mjs` while
sweeping the prune at 3, 4, 5, 6 and 8 rows: **exactly 2.00 distinct chords a
context at every one of them.** Two values, for any width of table.

✅ **SO THE FIX WAS THE SAME FIX ONE SLOT SIDEWAYS**, and it is `B_TEMP` below:
jazz, 2,000 held-out contexts, 40 draws each, 2.00 distinct becomes **3.53**
for two tenths of a point of attestation.

🔴 AND THE PRUNE MOVED IN THE SAME BREATH, BECAUSE IT WAS THE OTHER CEILING.
`KEEP` was 3 and is 5. The four chord way home now exists on **98.5 per cent**
of held-out jazz contexts against 92.7, over **307** distinct routes against
150. ⚠️ The walk gains much less: held at the real songs' own cycle rate, the
vocabulary goes 7.15 to 7.32 against the music's 7.42 on jazz, and pop does not
gain at all. The table costs **18,237 bytes** against 12,789 at the old prune,
which is 0.48 per cent of what `/nola/` already asks a visitor for, and
**18,435** since 2026-09-30, when it gained a log scale unigram column.

── A TAKE ADAPTS TO WHAT IS BEING PLAYED NOW, AND FORGETS ─────────────────

🔴 THE LARGEST SINGLE GAIN IN THE PLAN, AND THE ONLY ONE ABOUT A PERSON.
Section 6.2, expansion off, re-measured through THIS table's shape by
`demo/resources/chord-e7-take.mjs`: **+6.32 points of top 1 on held-out jazz**,
where the whole step from a bigram to a trigram was 4.5. It costs nothing on
the other three measures: distinct chords in ten go 7.29 to 7.44 against the
real songs' 7.44, surprisal 4.42 to 4.58 against 4.84, and the rate of
answering the corpus's single commonest chord falls 15.9 to 14.6 against 13.8.

🔴 `mkTake` TAKES A SOURCE AND COUNTS WHAT IT REFUSED, WHICH IS THE RULE MADE
ASSERTABLE. `/nola/` carries *"you recorded a suggestion. why>"*, and a
suggester that learns from its own output writes its own line and calls it
yours. MEASURED as a number rather than left as a warning: a generator fed its
own suggestions cycles **56.8 per cent** of the time against 50.2 and loses
vocabulary, moving away from real music on both axes at once.
⚠️ AND A PERSISTENT PROFILE IS STILL REFUSED, at +0.60 points from a composer's
entire body of work. Nothing here is stored and nothing here leaves.

── WHAT THIS MODULE WILL NOT CLAIM ────────────────────────────────────────

⚠️ THE ASK WAS *"want them to be openstudiojazz quality stuff"* AND THE
BENCHMARK REFUSED THAT WORDING ON THESE NUMBERS. 12 of 16 named devices in
the top 2 is a measurement about a table. A teacher explains WHY the chord
goes there, and nothing in a trigram explains anything. **The accurate claim
is that the table knows where the devices go. It does not know what they are
called or why.**

This file has no audio, no DOM and no browser in it. `suggest-test.mjs` is
beside it.

<a id="degrees"></a>

## suggest.mjs, DEGREES

🔴 THE SEVEN DEGREES OF EACH MODE, AND THEY ARE HERE FOR ONE JOB ONLY: to
work out where the music is centred. MEASURED: two chords fit 3.33 keys of 24
on average and never fewer than 2, and three chords never fit exactly one,
because a major key and its relative minor hold the same seven chords and can
never be told apart by which chords were played. So a key cannot be deduced,
it can only be decided, and `parseChords` already decides it the same way
with the right sentence attached.
⚠️ THE MINOR IS THE NATURAL MINOR, and its numerals carry no flats, because
the minor scale is its own reference.

🔴 AND THE MINOR CARRIES A MAJOR `V` AND A DIMINISHED `vii` AS WELL AS THE
NATURAL ONES, WHICH IS A FACT ABOUT MUSIC AND WAS ADDED BECAUSE IT WAS
MEASURED. A minor ii V is `Dm7b5 G7`, its dominant is MAJOR, and a natural
minor has a minor `v`, so a natural-minor-only table fits no key at all for
the commonest opening in jazz. MEASURED against the counted jazz table over
eight named device contexts: with these rows the tonic comes out right and
the table names the real next chord **6 times at slot A and 7 in either
slot**, against **4 and 6** for the other obvious rule, which is to take the
first chord's root as tonic whenever no key is rooted there.
⚠️ TWO ROWS AT DEGREE 7 IS NOT A DUPLICATE. `v` and `V` are different chords
on one degree, `numeralIn` matches on the QUALITY as well as the degree, and
each numeral still appears exactly once so a numeral still names one chord.

<a id="as-triad"></a>

## suggest.mjs, asTriad

A seventh is its triad for the purpose of finding a key, and a chord with no
third cannot place one. A chord this returns `null` for is SKIPPED rather
than counted against every key: an augmented triad is in no major or natural
minor key, so counting it would make every key fail and the page would say
`no key fits` about somebody playing in one.

<a id="numeral-in"></a>

## suggest.mjs, numeralIn

A chord's numeral in a key.

🔴 `chords.mjs`'s OWN `roman` CANNOT BE USED FOR A MINOR KEY, AND THIS WAS
FOUND BY BUILDING IT RATHER THAN BY READING IT. That function measures every
root against a MAJOR reference, so in A minor it calls F `bVI` and G `bVII`,
which is correct arithmetic and the wrong vocabulary. MEASURED as a live
failure: the diatonic minor table is keyed on `VI`, `roman` handed it `bVI`,
and the rule returned nothing at all for `Am then F`, which is the exact gap
the chord-learning research names, arriving by a second road.
⚠️ `roman` IS STILL THE ANSWER FOR ANYTHING OFF THE SCALE, because a chord in
no degree of the key has no diatonic numeral and a chromatic one beats an
empty string.

<a id="pick-key"></a>

## suggest.mjs, pickKey

🔴 ONE KEY DECISION FOR BOTH TABLES, WHICH IS WHAT KEEPS THE PAGE HONEST.
The counted table is key relative, so it needs a tonic; the diatonic rule
needs a tonic and a mode. Two different decisions in one module would be two
different sentences about where the key came from.
⚠️ AND IT CANNOT ALWAYS BE APPLIED. `Dm then G` fits C major and A minor and
neither is rooted on D, so the page falls back to the first fitting key and
`guessed` says so. A ii V is one of the commonest openings there is, so this
is not an edge case.
⚠️ WHEN NOTHING FITS AT ALL, the tonic is the first chord's root, which is
`parseChords`' own fiat with nothing else to lean on.

<a id="plain"></a>

## suggest.mjs, PLAIN, the 173 byte diatonic rule

The 173 byte rule, unchanged from the day it was the whole suggester.
MEASURED against 24 four chord loops written from memory: it names the real
third chord in its top 3 for 19 of 24. MEASURED against 251 held-out jazz
standards: **1.4 per cent top 1, silent on 65.3 per cent**. Both numbers are
true and the second one is why it is down here.
⚠️ THE MINOR HALF WAS NEVER MEASURED BY ANYBODY. It was written by analogy
with the major half because a major only rule returns nothing at all for
`Am then F`, and it is UNVERIFIED.

<a id="class-of"></a>

## suggest.mjs, CLASS_OF

🔴 THE CLASS A NAMED CHORD BELONGS TO. Seven classes, and the corpus share of
each is the entire style difference in seven rows: dominant chords are **40.6
per cent of jazz and 9.6 per cent of pop**, plain major chords are 64.8 per
cent of pop and 20.9 of jazz, and half diminished chords, the front door of
every minor ii V, are 4.4 per cent of jazz against 0.2 of pop, a factor of
twenty-two.
⚠️ `5` IS A GUESS AND IS THE ONLY ONE HERE. A bare fifth has no third, so it
belongs to no class the corpus counted, and it is read as major because that
is what a power chord usually stands in for. Nothing measured it.

🔴 IT HELD ELEVEN ROWS UNTIL 2026-09-30 AND `parseChord` RETURNS TWENTY SIX
QUALITIES, SO FIFTEEN FELL THROUGH `|| 'maj'` AND WERE READ AS MAJOR CHORDS.
`dim7` was one of them: MEASURED, `Cmaj7 C#dim7` asked the table about
`0maj|1maj`, a context of two major chords a semitone apart, instead of
`0maj|1dim`, which is the passing chord to Dm7 the build's own round trip
asks about by name. `9`, `11` and `13` were majors too, on a table where
dominants are 40.6 per cent of jazz.
✅ EVERY ROW NOW AGREES WITH `classOf` IN `demo/resources/chord-corpus.mjs`,
WHICH IS THE FUNCTION THE TABLE WAS COUNTED WITH, and `suggest-test.mjs` walks
every quality `parseChord` can return against it rather than against this
list. TWO ROWS DISAGREE ON PURPOSE AND ARE NAMED THERE: `2`, which that regex
would call a dominant because it starts with a digit, is the notes of `sus2`
and has no seventh at all; and `add9`, which it cannot class, is a major
triad with a ninth. Neither is written anywhere in either corpus, so neither
disagreement can move a count.

<a id="spell-alias"></a>

## suggest.mjs, SPELL_ALIAS

🔴 A SURFACE SPELLING THE PAGE CANNOT VOICE IS A LABEL THAT LIES ABOUT ITS OWN
DOTS. The table carries the commonest spelling of every symbol per style,
which is half the style dial: 59 of 75 shared symbols are written
differently, jazz writing `min7` and `maj7` where pop writes `min` and `maj`.
Some of those spellings are not things `chords.mjs` can read.
✅ SO A SPELLING IS TRIED THROUGH `parseChord` AND WHAT COMES BACK IS BOTH
THE LABEL AND THE NOTES. They agree by construction rather than by care, and
a spelling that will not parse falls back to its class rather than being
drawn over notes that are not it. `aug(b7,9)` becomes `aug` and says `aug`.

<a id="use-tables"></a>

## suggest.mjs, useTables

Install the benchmarked tables, as fetched from
`/resources/chord-tables.json`.

⚠️ IT IS A FUNCTION RATHER THAN AN IMPORT BECAUSE THE FILE IS FETCHED, and
this repository's rule is that a visit opens nothing. The page asks for it
when somebody presses the control that needs it, and until then the diatonic
rule answers.

<a id="unigram-log"></a>

## suggest.mjs, useTables, the unigram log column

🔴 THE UNIGRAM IS READ OFF THE LOG COLUMN WHEN THERE IS ONE, BECAUSE THE
      LINEAR ONE STORES HALF THE ALPHABET AS ZERO. MEASURED 2026-09-30: 46 counted
      jazz symbols and 57 pop ones sit below half a 1/89 step, `8dim` among them
      at 70 of 52,924, and slot B divided by that zero. It read the `1e-6` below
      as the chord's frequency and gave it about 17 bits of specificity, so
      `Fmaj Cmaj7` offered `C#dim7` three draws in four. `build-chord-tables.mjs`
      writes `ulog` at a fifth of a bit a step.
      ⚠️ A TABLE WITHOUT IT STILL LOADS, and a zero there is read as HALF A STEP,
      which is the most it can have been rounded down from, rather than as a
      millionth. That is an upper bound on the frequency and so a lower bound on
      how specific the chord is, which errs toward the ordinary answer.

<a id="style-temp"></a>

## suggest.mjs, useTables, the style temperature

🔴 THE TEMPERATURE TRAVELS WITH THE STYLE, and a table written before the
      field existed reads as 1, which is jazz's measured value rather than a
      neutral one. It is stated here rather than hidden, because a pop table
      silently sampled at 1.0 is the wrong dial and would show as a page that
      wanders. `build-chord-tables.mjs` writes the field.

<a id="style-mix"></a>

## suggest.mjs, useTables, the style mix

🔴 AND SO DOES THE MIX, FOR THE SAME REASON AND WITH A BIGGER GAP BETWEEN
      THE STYLES. How much of a suggestion is the player's own take is a fact
      about how much the music repeats itself: MEASURED, jazz wants 0.25 and pop
      0.1, and pop at 0.25 scores hugely better on top 1 while moving every one
      of the four measures away from real pop. A table written before this field
      existed reads as 0.25, which is jazz's measured value.

<a id="pool"></a>

## suggest.mjs, POOL

🔴 SLOT B IS POINTWISE MUTUAL INFORMATION OVER A POOL, AND THE POOL IS THE
SECOND RAIL RATHER THAN A DETAIL. PMI is high for a chord SPECIFIC to this
context and low for one that is common everywhere, which is exactly the
difference between an idiom and a cliche and is a quantity rather than a
taste. With no pool it reaches past a dozen ordinary answers for whatever is
most specific, which on a thin context is an augmented triad somebody played
four times. MEASURED as refused: 9.5 points of attestation for 1.8 bits of
surprisal, with suggestions that are visibly wrong.
⚠️ THE COUNT FLOOR IS ALREADY IN THE SHIPPED TABLE, pruned at three, so there
is nothing here to apply it with and nothing here that could get it wrong.
✅ AND THE POOL THE BENCHMARK SWEPT WAS FOUR, WHICH THE SHIPPED TABLE COULD NOT
FILL UNTIL 2026-09-26. `build-chord-tables.mjs` kept three rows a context, so
this number was a ceiling that never came down: the pool held at most three and
slot B was measured on a narrower thing than it was graded on. `KEEP` is 5 now,
MEASURED at a mean pool of **3.75** against 2.91 before, so the setting the
benchmark swept is finally the setting that runs.

<a id="b-temp"></a>

## suggest.mjs, B_TEMP

🔴 SLOT B IS DRAWN TOO SINCE 2026-09-26, AND THE MEASUREMENT THAT FOUND IT WAS
LOOKING FOR SOMETHING ELSE. `demo/resources/chord-e6-keep.mjs` swept the prune
at 3, 4, 5, 6 and 8 rows and slot B answered **exactly 2.00 distinct chords a
context at every one of them**. That number is not a coincidence and not a
table fact: B is the highest pointwise mutual information row that A did not
take, so it is the PMI top unless A collided with the PMI top, in which case it
is the PMI second. **Two values, for any width of table, forever.**

🔴 SO THE PLAN'S WHOLE LESSON HAD BEEN APPLIED TO SLOT A AND NEVER TO SLOT B,
AND SLOT B IS THE ONE ON SCREEN. `/nola/` draws the second pick. Sampling slot
A widened what a walk looks like and could not widen what a player is offered,
which is the shape of the report that followed: *"suggeston are better but
still a bit meh"*.

✅ MEASURED at `KEEP 5` over 2,000 held-out jazz contexts, 40 draws each:

 argmax, as shipped   2.00 distinct   92.98% attested   4.2% globally commonest
 drawn at 1           3.53            92.79%            5.0%
 drawn at 2           3.64            92.53%            5.8%
 drawn at 4           3.73            92.50%            6.7%

**1 buys 77 per cent of the available width for two tenths of a point of
attestation**, and 2 and 4 buy the rest by answering the corpus's commonest
chord more often, which is the quantity the complaint is about.
⚠️ AND 1 IS A DEFINITION RATHER THAN A FIT, WHICH IS WHY IT IS NOT IN THE
TABLE BESIDE THE STYLE TEMPERATURE. `2^(pmi/1)` is `p/u` exactly, so a row is
drawn in proportion to how specific it is to this context. There is no corpus
fact in it to be different per style, and nothing was tuned against a target.
⚠️ SLOT B'S ATTESTATION HAS ALWAYS SAT BELOW THE 94 PER CENT FLOOR AND THE
FLOOR IS NOT ABOUT IT. The benchmark measured slot B at **90.7 per cent** and
shipped it; the floor is about the ten step walk, which is slot A's. What
matters here is that the draw moved it by 0.2 points rather than by nine.

<a id="mk-random"></a>

## suggest.mjs, mkRandom

🔴 A SEEDED RANDOM SOURCE, AND IT IS THE SAME ONE THE MEASUREMENTS USE.
`demo/resources/chord-e4-generators.mjs` imports this rather than carrying a
generator of its own, so a number measured there and a chord offered here come
off one stream. A sampler that cannot be made to repeat itself makes every
claim in `plans/plan-better-chords-2026-09-25.md` unrepeatable.
⚠️ IT IS A PLAIN LINEAR CONGRUENTIAL GENERATOR AND THAT IS ENOUGH. Nothing
here is cryptography and nothing here is a simulation; what is needed is that
two runs with one seed agree and two seeds do not.

<a id="rows-for"></a>

## suggest.mjs, rowsFor

The rows the table holds for a context, with the backoff that is the whole of
how a thin context is answered.
⚠️ EXPORTED SO THE MEASUREMENTS GRADE THIS LOOKUP RATHER THAN A COPY OF IT.
`demo/resources/chord-e4-generators.mjs` walks ten steps through this function
and `sampleRow`, which is the only way the number it prints is about the code
that ships.
@returns {{rows: Array<[string, number]>, how: string}}

<a id="sample-row"></a>

## suggest.mjs, sampleRow

🔴 ONE ROW OUT OF THE TABLE'S OWN DISTRIBUTION, FLATTENED BY A TEMPERATURE.
The weight is `p^(1/T)` over the kept rows: `T` under 1 sharpens toward the
commonest answer, `T` at 1 is the distribution the corpus was counted with,
and `T` above 1 flattens it.
⚠️ `temp` OF 0 IS THE ARGMAX, ON PURPOSE AND NOT AS AN ERROR CASE. It is what
this file did before 2026-09-25, and `suggest-test.mjs` uses it as the
negative control that says the sampler is sampling: at 0 a context answers one
chord over two hundred seeds, and at the shipped temperature it answers
several.
⚠️ THE ROWS ARE ALREADY FLOORED AT A COUNT OF THREE by the build, so there is
no tail here and nothing here that could get a floor wrong.

<a id="mk-take"></a>

## suggest.mjs, twoSlots and mkTake

The two slots over one context, in table symbols.
⚠️ EXPORTED FOR THE SAME REASON `rowsFor` AND `sampleRow` ARE: what `/nola/`
draws is slot B, so a measurement of slot B has to be of THIS function rather
than of a copy of it. `demo/resources/chord-e6-keep.mjs` sweeps the prune
through it, and slot B is the half a prune moves that a walk cannot see.
🔴 A TAKE ADAPTS THE TABLE TO WHAT IS BEING PLAYED NOW, AND IT IS THE LARGEST
SINGLE GAIN IN `plans/plan-better-chords-2026-09-25.md`. Section 6.2, MEASURED
with section expansion OFF so a repeated A section cannot inflate it:

  8 chords seen   54.70% top 1 against 49.35% world only   +5.35
 16 chords seen   57.21% against 49.77%                    +7.44
 32 chords seen   58.89% against 50.59%                    +8.30

For comparison, the whole step from a bigram to a trigram was 4.5 points and
justified downloading two corpora.
⚠️ AND PART OF THAT GAIN IS THAT MUSIC REPEATS ITSELF RATHER THAN THAT
ANYTHING WAS LEARNED ABOUT A PERSON. With expansion ON the same sweep reads
+10.1, and the difference between the two numbers is exactly the repetition
the corpus adds. **+7.44 is the conservative reading and is the one to quote.**

🔴 A PERSISTENT PROFILE IS REFUSED AND THE REFUSAL IS MEASURED, NOT CAUTIOUS.
Section 6.1: a composer's ENTIRE body of work, leave one chart out over 27
composers and 461 charts, is worth **+0.60 points** at its best weight, and a
stranger's work at the same weight reads 0.76 points BELOW the baseline. Thirty
charts of somebody's life buys six tenths of a point. **This object holds the
current take and forgets.** Nothing is stored, nothing is sent, and there is no
`localStorage` anywhere in this file.

🔴 AND `heard` IS A COUNTED WRAPPER RATHER THAN A SETTER, WHICH IS THE ONLY
WAY THE RULE CAN BE ASSERTED INSTEAD OF CLAIMED. `/nola/` carries a rule from
a report reading *"you recorded a suggestion. why>"*, and it matters twice over
once a log feeds anything: **a suggester that learns from its own suggestions
writes its own line and calls it yours.** So every chord that can reach the
adaptation goes through one function, that function takes a SOURCE and counts
what it refused, and `refused` is a number a check can read. This repository
already owns that shape: `/reel/` proved *a visit opens nothing* by routing
every URL through one counted function rather than by reading the file.
⚠️ THERE IS NO DEFAULT SOURCE, ON PURPOSE. `heard(c)` with no second argument
is REFUSED, because a default of `'played'` would make the careless call the
dangerous one, and the whole point is that the dangerous call is the loud one.

🔴 THE WINDOW IS 64 AND IT IS NOT THE PLAN'S SIXTEEN, WHICH WAS FOUND BY
MEASURING THE THREE WINDOWS THE PLAN'S SENTENCE COULD HAVE MEANT. It says
*over the last sixteen to thirty two chords* and what section 6.2 actually
measured was the FIRST sixteen of a piece. Those are different windows and they
do not score alike. MEASURED on held-out jazz at weight 0.25, expansion off:

 the last 16 chords    +1.98 points of top 1
 the first 16 chords   +5.91
 everything so far     +6.32

**A sliding window of sixteen is worth a third of what keeping the take is
worth**, because sixteen chords ago is the section you just left. 64 is
everything so far for any take shorter than that and a slow forget after it,
and it reads +6.32 on the same contexts.
⚠️ AND IT IS STILL NOT A PROFILE. A window that forgets nothing WITHIN a take
is not a thing that persists BETWEEN takes, which is what section 6.1 refused
at +0.60 points. This object dies with the tab.

⚠️ THE MIXING WEIGHT IS NOT HERE, IT IS IN THE TABLE, beside the temperature
and for the same measured reason: jazz wants 0.25 and pop 0.1.

@param {{window?: number}} [o]  how many recent chords count.
@returns {{heard, chords, counted, refused, clear, window}}

<a id="adapt-rows"></a>

## suggest.mjs, adaptRows

The table's rows for this context with the take's own counts mixed in.

🔴 THE MIX IS `(1 - w) * world + w * yours`, WHICH IS THE PLAN'S OWN RECIPE
AND NOT A NEW ONE. The take backs off exactly as the table does, trigram first
and bigram when the trigram has fewer than `floor` sightings, because sixteen
chords hold almost no trigram twice and a take with no backoff would contribute
nothing at all on most contexts.
⚠️ IT RE-SORTS, SO THE MIXTURE DECIDES BOTH SLOTS. Slot A draws from these rows
and slot B takes its pool off the top of them, which is what makes the
adaptation reach the chord the page actually shows.
⚠️ EXPORTED SO THE MEASUREMENTS GRADE THIS FUNCTION RATHER THAN A COPY OF IT,
the same reason `rowsFor` and `sampleRow` are.

@param {Array<[string, number]>} rows  what the table holds
@param {string[]} take  the take's chords as table symbols, oldest first
@param {string[]} ctx  the context being asked about, as table symbols

<a id="passing"></a>

## suggest.mjs, twoSlots, diminished never slot B

🔴 A DIMINISHED CHORD IS NEVER SLOT B, BECAUSE IT IS A STEP ON THE WAY AND
    SLOT B IS OFFERED ALONE. Reported 2026-09-30 as *"still not a good sounding
    suggestion"* over `Fmaj`, `Cmaj7` and a proposal of `C#dim7`. That chord is
    right: it is the corpus's own passing move from V to vi, and `8dim` goes on
    to `9min` **54 per cent** of the time in jazz and **86** in pop. Heard on its
    own after a major seventh it is a question with no answer, which is the
    complaint.
    ⚠️ AND PMI PICKS IT FOR THE SAME REASON IT IS A PASSING CHORD. Diminished
    chords are **2.3 per cent** of jazz and **0.35** of pop, so wherever one
    reaches the pool it is the most specific row in it. MEASURED over the 623
    jazz trigram contexts at the argmax: a dim sits in the pool of 29, and slot
    B took it in **22**, and in **21** with the unigram repaired. So the repair
    above is right and is not this fix.
    ✅ SO THE POOL LEAVES IT OUT AND SLOT A DOES NOT. It stays in the table, in
    the walk and in the way home, where the chord after it is there too; what is
    refused is offering the middle of a move as if it were a place to go.
    `chord-corpus.mjs` already names the class this way: *"a passing chord is
    `dim`"*.

<a id="b-argmax"></a>

## suggest.mjs, twoSlots, the argmax

The argmax, which is what this shipped before 2026-09-26 and is still what
      `bTemp: 0` means. `suggest-test.mjs` uses it as the negative control.

<a id="b-draw"></a>

## suggest.mjs, twoSlots, slot B draw

🔴 THE SAME DRAW AS SLOT A, OVER THE SAME QUANTITY SLOT B WAS ALREADY
      RANKED BY. `2^(pmi/T)` is `(p/u)^(1/T)`, so the weight is the specificity
      itself raised to `1/T` and one dial means the same thing in both slots.

<a id="route-over"></a>

## suggest.mjs, routeOver

🔴 A PATH THAT HAS TO ARRIVE, WHICH IS A DIFFERENT QUESTION FROM A CHORD THAT
COMES NEXT, AND THE TABLE ALREADY ANSWERS IT. A beam search over the same
trigram for a run of `steps` chords whose last one is `target`.
MEASURED over 4,000 held-out jazz contexts in
`plans/plan-better-chords-2026-09-25.md`: a route exists on **99.6 per cent**
of them and its transitions are attested in held-out songs **98.2 per cent**
of the time.

🔴 AND THE ARGMAX PROBLEM RETURNS ONE LEVEL UP, WHICH IS THE PROOF THE LESSON
IS GENERAL RATHER THAN A PATCH. MEASURED: **60.4 per cent of the six commonest
best paths end in ii V I**. A best path is as cliched as a best chord, so the
path is sampled too, and the repair is the same repair.
⚠️ THE WEIGHT IS PER STEP RATHER THAN PER PATH, which is a choice and was
measured rather than argued: `2^(lp/steps/T)` is the geometric mean
probability of a step raised to `1/T`, so one dial means the same thing to a
chord and to a route. Weighting by the whole path's probability instead is the
same code with `temp` divided by `steps`, which is how both were graded.
⚠️ `beam` OF 256 PRUNES NOTHING AT FOUR STEPS, because the shipped table keeps
five rows a context and `5^3` is 125. It is a ceiling for a longer route rather
than a filter on this one, and a beam that pruned would be an argmax wearing a
different name.
🔴 IT READ 64 UNTIL 2026-09-26 AND THAT NUMBER WAS DERIVED FROM `KEEP`, SO
RAISING THE PRUNE WOULD HAVE TURNED THIS BACK INTO AN ARGMAX SILENTLY. At
`KEEP 5` the live set is 125 paths and a beam of 64 would have thrown the
lower half away by probability before the draw ever saw it, which is the
failure this whole plan is about arriving through a constant nobody re-read.

✅ MEASURED at `KEEP 5` over 4,000 held-out jazz contexts: a route is found on
**98.5 per cent** of them against 92.7 at `KEEP 3`, over **307** distinct
routes against 150, attested **95.4 per cent** against 98.3.

@returns {{path: string[], lp: number, tried: number}|null}

<a id="route-take"></a>

## suggest.mjs, routeOver, the take at every step

⚠️ THE TAKE IS MIXED IN AT EVERY STEP RATHER THAN ONLY THE FIRST,
        because the context moves as the route is built and a way home that
        sounded like this player at step one and like nobody at step three would
        be the adaptation switching itself off half way.

<a id="suggest"></a>

## suggest.mjs, suggest

What might come next.

🔴 TWO SLOTS, TWO JOBS. `usual` is the idiomatic continuation and `other` is
the one worth hearing. They are not a ranked pair of one job and the
benchmark is what settles that.

🔴 AND SLOT A IS A SAMPLE RATHER THAN THE MAXIMUM SINCE 2026-09-25. The
header carries the measurement. `temp` overrides the style's own number and
`temp: 0` is the argmax this file shipped before, which is what the checks use
as their negative control.

@param {{chords: Array<{root:number, quality:string}>}} context
@param {{style?: string, temp?: number, rnd?: function}} [o]  a style name
 from `styleNames()`, or `plain`; a temperature, or the style's own; and a
 random source, so a caller that needs to repeat itself can.
@returns {{ok, style, source, key, keyName, tonic, guessed, from, picks, says}}

<a id="take-tonic"></a>

## suggest.mjs, suggest, the take's tonic

⚠️ THE TAKE IS TURNED INTO SYMBOLS WITH **THIS CALL'S** TONIC AND NOT WITH
      ONE IT REMEMBERED. The key is a fiat that a third chord can change, and a
      take holding symbols from an older tonic would quietly be a take of a
      different piece. It holds chords, and the arithmetic happens here.

<a id="temp-zero"></a>

## suggest.mjs, suggest, temp 0 is both slots

🔴 `temp: 0` MEANS THE ARGMAX AND THE ARGMAX OF A TWO SLOT ANSWER IS BOTH
      SLOTS, WHICH WAS FOUND BY BREAKING IT. Drawing slot B made
      `suggest(ctx, { temp: 0 })` fall through to `Math.random`, so a call that
      had been deterministic since the day this file was written silently was
      not, and two checks went red in one run and green in the next with no code
      between them. That is the shape of flake this repository spends whole
      sessions on. A caller wanting a fixed A with a drawn B passes both dials.

<a id="wording"></a>

## suggest.mjs, suggest, the wording

⚠️ THE WORDING MOVED WITH THE CODE. It read *what jazz players most
        often go to from here*, which was true of an argmax and is a lie about a
        draw: the commonest answer is now the likeliest one to come up rather
        than the only one that can. CLAUDE.md's rule is that a change in what a
        page does is a change in what it says, in the same edit.

<a id="last-resort"></a>

## suggest.mjs, suggest, the last resort

🔴 THE LAST RESORT, AND IT IS THE RULE THAT USED TO BE THE WHOLE THING.
    UNVERIFIED as better than the globally commonest chord: the table's own
    backoff never left a case uncovered to measure it on.

<a id="boundary"></a>

## suggest.mjs, suggest, the honest boundary

🔴 THE HONEST BOUNDARY. Two chords from two keys, or a context nothing has
    seen. A fifth either side of the first chord always exists and is never
    absurd, and the page says that is what it did. UNVERIFIED as a good
    musical answer.

<a id="route-to"></a>

## suggest.mjs, routeTo

A four chord way home.

🔴 THIS IS THE ONE PROPOSAL IN `plans/plan-better-chords-2026-09-25.md` THAT
CHANGES WHAT A PAGE OFFERS RATHER THAN HOW IT RANKS: not *here is the next
chord* but *here is a four chord way home, and here is another one*. The third
word of the complaint was *"not moving anywhere"*, and MEASURED literally:
taking the old suggestion ten times in a row fell into a repeating cycle
**99.1 per cent** of the time, 77.3 per cent of them the three rotations of
ii V I. Nothing on this page had a destination, so nothing could arrive.

⚠️ THE TARGET IS THE TONIC AND THAT IS THE ONE UNDECIDED DESIGN QUESTION,
section 12.4 of the plan, written down rather than answered here: a real
player aims at all sorts of places, and whether a person picks the target or
the page infers it is not settled. The tonic is the default because it is the
one destination a key already names. A caller may pass `target` as a table
symbol, and nothing in this repository does yet.

@param {{chords: Array<{root:number, quality:string}>}} context
@param {{style?, steps?, target?, temp?, rnd?}} [o]
@returns {{ok, style, source, key, keyName, tonic, guessed, target, targetName,
 steps: Array<{root, quality, name, numeral}>, says}}

<a id="tonic-class"></a>

## suggest.mjs, routeTo, the tonic's class

⚠️ THE TONIC'S CLASS COMES FROM THE MODE AND NOT FROM THE FIRST CHORD. A
    line that opens on a dominant is still going home to a major or a minor
    chord, and `0maj` in a minor key is a chord the table has barely counted.

<a id="test-header"></a>

## suggest-test.mjs, file header

demo/shell/suggest-test.mjs. The chord suggester, with no browser at all.

  node demo/shell/suggest-test.mjs

🔴 A PACKED TABLE IS UNREADABLE BY EYE, so the only thing between a decoding
bug and a page proposing the wrong chord confidently is this file. It reads
the real `demo/resources/chord-tables.json` off the disk, decodes it through
the same `useTables` a page calls, and asks it the named jazz devices that
`research/chord-suggester-benchmark-2026-09-23.md` graded.

⚠️ AND IT ASKS THEM THROUGH `suggest()` RATHER THAN THROUGH THE DECODER. The
build script already round trips its own packing. What is untested until here
is everything between a chord somebody played and a chord on a roll: the
tonic, the two slots, the spelling, and whether the name that comes out can
be turned back into notes at all.

⚠️ SIXTEEN OF THESE ARE NEGATIVE CONTROLS, including a truncated table, a
sabotaged unigram, a style that does not exist, a sampler held at the argmax,
a way home to a chord nothing reaches, a beam narrowed until it is an argmax
again, a take of somebody else's chords and a take fed nothing but the page's
own suggestions. Two more since 2026-09-30: the two named places the build's
own classifier is wrong, and a passing chord that must stay in the table while
slot B stops offering it alone.

🔴 AND THE SAMPLER'S CHECK IS TWO HALVES OR IT IS NOTHING. `suggest.mjs` draws
slot A rather than taking the maximum since 2026-09-25, so every number in
`plans/plan-better-chords-2026-09-25.md` rests on a generator that can be made
to repeat itself. A check that only asserted *the same seed gives the same
line* passes on a sampler that always returns the same thing, and a check that
only asserted *two seeds differ* passes on one nothing can reproduce. Both are
below, next to each other, for that reason.

<a id="test-minor-key"></a>

## suggest-test.mjs, check 2, a minor key table

2. 🔴 A MINOR KEY TABLE IS NOT OPTIONAL, and this was a live gap: `Am then F`
   reads as `i then VI` and a major-only rule returns nothing at all.

<a id="test-ii-v-guess"></a>

## suggest-test.mjs, check 3, ii V is a guess

3. NEGATIVE CONTROL, AND IT IS NOT AN EDGE CASE. `Dm then G` fits C major and
   A minor and neither is rooted on D, so the fiat cannot be applied and the
   page must say the key is a guess. A ii V is one of the commonest openings
   there is.

<a id="test-no-key"></a>

## suggest-test.mjs, check 4, chords from no key

4. NEGATIVE CONTROL: two chords from no key at all fall back to something
   that always exists, and say that is what happened.
   ⚠️ THE RESEARCH'S OWN EXAMPLE FOR THIS WAS `C then Eb` AND IT NO LONGER
   FITS NOTHING, which is the harmonic minor's `V` row earning its keep
   rather than a regression: in F minor those two are `V` and `III`, and a
   player going C to Eb really might be in F minor. A tritone pair is the
   honest replacement, because a major triad a tritone from another major
   triad is in no key of either mode.

<a id="test-one-chord"></a>

## suggest-test.mjs, check 5, fewer than two chords

5. Fewer than two chords is refused rather than guessed at, which is the
   owner's own condition: *"when have at least 2, suggest 3rd and 4th"*.

<a id="test-keys-fit"></a>

## suggest-test.mjs, check 6, how many keys fit

6. MEASURED: two chords fit 3.33 keys of 24 on average and never fewer than
   2, and three chords never fit exactly 1, because a major key and its
   relative minor hold the same seven chords.
   ⚠️ THE NUMBERS MOVED WHEN THE HARMONIC MINOR'S OWN `V` AND `vii` WERE
   ADDED, which is honest: a minor key with a major dominant fits MORE
   progressions, so the average rises from 3.33 to 3.38. The floor of 2 is what the argument
   rests on and it does not move.

<a id="test-minor-ii-v"></a>

## suggest-test.mjs, check 7, the minor ii V

7. 🔴 THE MINOR ii V IS WHY THE HARMONIC MINOR'S MAJOR `V` IS IN THE DEGREE
   TABLE. `Dm7b5 G7` has a MAJOR dominant, a natural minor has a minor one,
   and without that row no key fits the commonest opening in jazz at all.

<a id="test-devices"></a>

## suggest-test.mjs, `DEVICES`

🔴 THE NAMED DEVICES, ASKED THROUGH THE WHOLE PATH. Each row is two chords
somebody could really play and the chord the benchmark says the table knows
follows them. MEASURED there at 12 of 16 named devices in the top 2; these
seven are the ones this page's own recogniser can reach, since it has no
`dim7` in its vocabulary by design.

<a id="test-measurement"></a>

## suggest-test.mjs, check 9, the measurement

9. 🔴 THE MEASUREMENT THE WHOLE TABLE IS FOR. Not *does it decode* but *does
   a chord somebody played come back with the chord that really follows it*.

<a id="test-three-claims"></a>

## suggest-test.mjs, check 9, three asserts

🔴 THIS CHECK WAS ONE ASSERT AND IS THREE SINCE 2026-09-26, BECAUSE RAISING
    `KEEP` TO 5 TOOK THE OLD ONE RED FOR A REASON THAT IS NOT A DEFECT. Slot B
    is the pointwise mutual information pick over a pool of four, and the pool
    could not be filled while the table kept three rows. With five rows,
    `A7 Dm7` offers `Bmin7b5` where it used to offer `G7`: a rarer and more
    specific chord, which is what slot B is FOR and which is exactly why it
    names the real next chord only 9.9 per cent of the time by design.
    ⚠️ SO THE CLAIM IS SPLIT INTO THE THREE THINGS IT WAS CONFLATING: what the
    table KNOWS, what the drawn page OFFERS, and what the argmax pair alone
    happens to show. Losing one of seven at the third is recorded rather than
    tuned away.

<a id="test-from-table"></a>

## suggest-test.mjs, check 10, from the table

10. 🔴 AND EVERY ONE OF THEM READ THE TABLE RATHER THAN FALLING THROUGH TO
    THE RULE, which is the half that says the number above is about the
    table. A suggester silently backing off would score the same and mean
    something else entirely.

<a id="test-two-slots"></a>

## suggest-test.mjs, check 11, two slots

11. 🔴 TWO SLOTS, TWO JOBS, AND SLOT B IS NOT SLOT A'S RUNNER UP BY
    PROBABILITY. It is the continuation most SPECIFIC to this context, which
    is what separates an idiom from a cliche and is a quantity rather than a
    taste. MEASURED in the benchmark: slot A names the real next chord 48.7
    per cent of the time and is the globally commonest chord 16.2 per cent of
    the time; slot B names it 9.9 per cent and is the global maximum 1.0 per
    cent, with 90.7 per cent of what it offers still attested.

<a id="test-slot-b-pmi"></a>

## suggest-test.mjs, check 12, slot B ranking

12. NEGATIVE CONTROL for slot B's ranking. It is chosen by pointwise mutual
    information against the unigram, so a unigram forced flat must be able to
    change it. A slot B that never moved would be the second most probable
    row wearing a different name.

<a id="test-argmax-both"></a>

## suggest-test.mjs, check 12, at the argmax

⚠️ AT THE ARGMAX ON BOTH SIDES, WHICH IS WHAT MAKES THIS A TEST OF THE PMI
    AND NOT OF THE DRAW. Slot B is chosen from the rows slot A did not take, so
    a sampled A moving would move B for a reason that has nothing to do with
    what is common everywhere. Hold A still and only the unigram can move it.

<a id="test-style-dial"></a>

## suggest-test.mjs, check 13, the style dial

13. 🔴 THE STYLE DIAL IS A CONTROL THAT DOES SOMETHING, AND HALF OF IT IS THE
    SPELLING. MEASURED in the benchmark: the two tables disagree on the first
    suggestion for 71.2 per cent of shared bigram contexts, AND 59 of 75
    shared symbols are written differently, jazz writing `min7` and `maj7`
    where pop writes `min` and `maj`. A dial that swapped the table and kept
    one spelling would be half a dial.

<a id="test-voiceable"></a>

## suggest-test.mjs, check 14, every name can be voiced

14. 🔴 A NAME THE PAGE CANNOT VOICE IS A LABEL THAT LIES ABOUT ITS OWN DOTS.
    Every suggestion has to go back through `parseChord`, because the roll
    draws the notes and the label side by side and they must be the same
    chord. `aug(b7,9)` is a real spelling in that table and nothing here can
    play it, so it falls back to its class rather than being drawn over notes
    that are not it.

<a id="test-seeded-sweep"></a>

## suggest-test.mjs, check 14, one seeded stream

⚠️ SEEDED, AND ONE STREAM ACROSS ALL 1,080, so the sweep covers the second
    and third rows of every context it touches rather than only the first. The
    argmax version of this check could never have reached them.

<a id="test-temperature"></a>

## suggest-test.mjs, check 16, temperature per style

16. 🔴 THE TEMPERATURE IS A STYLE FACT AND IT TRAVELS IN THE TABLE. MEASURED
    by `demo/resources/chord-e4-generators.mjs` against this exact shape:
    jazz at 3.5 walks ten steps with 53.1 per cent of walks cycling and 7.13
    distinct chords, against the real songs' 52.7 and 7.42, and pop at 1.4
    reads 87.3 and 4.67 against 89.0 and 4.65. **The same dial that makes jazz
    right makes pop wrong**, so a single constant in the module would be the
    defect rather than the fix.

<a id="test-repeatable"></a>

## suggest-test.mjs, check 17, same seed same line

17. 🔴 THE HALF THAT MAKES EVERY OTHER NUMBER REPEATABLE. Two runs on one
    seed have to be the same line.

<a id="test-argmax"></a>

## suggest-test.mjs, check 19, the argmax still reachable

19. 🔴 AND THE ARGMAX IS STILL REACHABLE, WHICH IS THE CONTROL THE WHOLE PLAN
    IS SCORED AGAINST. `temp: 0` is what this file did before 2026-09-25: one
    context, one answer, two hundred draws.

<a id="test-slot-b-moves"></a>

## suggest-test.mjs, check 20, slot B moves

20. 🔴 WHAT THE PAGE ACTUALLY DRAWS IS SLOT B, SO THE FIX HAS TO REACH IT.
    `/nola/` shows the pointwise-mutual-information pick and not the likeliest
    chord, and slot B is chosen from the rows slot A did not take, so a drawn
    A moves it. MEASURED over every trigram context in the shipped jazz table:
    slot B answers 1.69 different chords a context and moves at all in 68.7
    per cent of them, where before it was one chord, always.

<a id="test-count-floor"></a>

## suggest-test.mjs, check 21, the count floor

21. 🔴 THE COUNT FLOOR IS WHAT HOLDS ATTESTATION AT 96.6 PER CENT AND IT IS IN
    THE TABLE RATHER THAN IN THE SAMPLER. `build-chord-tables.mjs` prunes at
    `row>=3` and keeps three rows, so there is no tail here to draw from.
    MEASURED in the plan: sampling without a floor costs 9.5 points of
    attestation for 1.8 bits, which is the same trade pure PMI was refused for.

<a id="test-floor-cuts"></a>

## suggest-test.mjs, check 21, the floor still cuts

🔴 AND THE FLOOR IS STILL DOING THE CUTTING, WHICH IS THE HALF THAT RAISING
    `KEEP` COULD HAVE QUIETLY UNDONE. `MIN_ROW = 3` means a context with no
    fourth row seen three times keeps three however high the ceiling goes. If the
    floor had been dropped instead of the ceiling raised, nearly every context
    would fill all five slots and this number would collapse.

<a id="test-route"></a>

## suggest-test.mjs, check 22, a way home

22. 🔴 THE THIRD WORD OF THE COMPLAINT WAS *"not moving anywhere"*, AND THIS
    IS THE ONLY PART OF THE ANSWER THAT CHANGES WHAT IS OFFERED RATHER THAN
    HOW IT RANKS. MEASURED over 4,000 held-out jazz contexts against this
    table's shape: a route exists on 92.7 per cent of them and its transitions
    are attested in held-out songs 98.3 per cent of the time.

<a id="test-route-rows"></a>

## suggest-test.mjs, check 23, every step is a table row

23. 🔴 AND EVERY STEP OF IT IS A ROW THE TABLE HOLDS, which is the half that
    says the route is read rather than invented. A beam search over a table
    it did not actually consult would look identical from outside.

<a id="test-route-sampled"></a>

## suggest-test.mjs, check 24, the route is sampled

24. 🔴 THE ARGMAX PROBLEM RETURNS ONE LEVEL UP, WHICH IS THE PROOF THE LESSON
    IS GENERAL RATHER THAN A PATCH. MEASURED on the shipped shape: the best
    path alone puts **72.6 per cent** of its six commonest routes into ii V I
    and finds 76 distinct routes, and sampling the path per step drops that to
    **18.5 per cent** over 151 routes with attestation unmoved at 98.3.

<a id="test-sabotage"></a>

## suggest-test.mjs, check 27, the sabotage

27. 🔴 THE SABOTAGE, BECAUSE A DECODER THAT READ GARBAGE WOULD STILL ANSWER.
    A table truncated to one record must take the device check red. If it
    does not, this whole file is decoration, which is the finding this
    repository has recorded four times about its own instruments.

<a id="test-slot-b-two"></a>

## suggest-test.mjs, slot B is drawn

🔴 THE FINDING THAT PAID FOR THIS SECTION. `chord-e6-keep.mjs` swept the prune
   at 3, 4, 5, 6 and 8 rows and slot B answered EXACTLY 2.00 distinct chords a
   context at every one of them, because B is the highest pointwise mutual
   information row that A did not take: the PMI top unless A collided with it,
   the PMI second when it did. Two values, for any width of table. The plan's
   whole lesson had been applied to slot A and slot B is the one on screen.

<a id="test-beam"></a>

## suggest-test.mjs, the beam is a ceiling

🔴 THE BEAM IS A CEILING AND NOT A FILTER, AND RAISING `KEEP` IS WHAT MADE
   THAT WORTH ASSERTING. It read 64 while the table kept three rows, where
   `3^3` is 27; at five rows the live set is 125, so the old constant would
   have thrown the lower half away by probability before the draw saw it and
   turned the route quietly back into an argmax.

<a id="test-take-line"></a>

## suggest-test.mjs, `TAKE_LINE`

🔴 A TAKE THAT MEETS THE CONTEXT BEING ASKED ABOUT, AND THE FIRST ONE DID NOT.
  A line in a different corner of the key changes nothing, correctly, and a check
  written on one reads as the adaptation never having been wired up at all. This
  is somebody vamping a ii V and going somewhere the table does not expect, three
  times over, which is the whole case the adaptation exists for.

<a id="test-take"></a>

## suggest-test.mjs, the take moves the answer

🔴 THE LARGEST SINGLE GAIN IN `plans/plan-better-chords-2026-09-25.md`, section
   6.2, MEASURED at +7.44 points of top 1 on full counts and re-measured at
   **+6.32 through this table's shape** by `demo/resources/chord-e7-take.mjs`,
   against a whole bigram-to-trigram step worth 4.5. It has to actually move
   what comes back or none of that reached the page.

<a id="test-take-source"></a>

## suggest-test.mjs, the take refuses suggestions

🔴 THE RULE THIS PAGE ALREADY PAID FOR, AS A COUNTER RATHER THAN AS A CLAIM.
   Reported on `/nola/`: *"you recorded a suggestion. why>"*. A suggester that
   learns from its own suggestions writes its own line and calls it yours, so
   every chord that can reach the adaptation goes through ONE function that
   takes a source and counts what it refused.

<a id="test-mix-none"></a>

## suggest-test.mjs, mixing, no match

NEGATIVE CONTROL: the mixing itself, asked directly. A take that never matches
the context must hand back exactly the rows it was given, or the adaptation is
adding chords nobody played.

<a id="test-mix-climbs"></a>

## suggest-test.mjs, mixing, enters and climbs

⚠️ IT ENTERS AND CLIMBS, IT DOES NOT TAKE OVER, WHICH IS WHAT A WEIGHT OF
    0.25 MEANS AND WAS WRITTEN OUT WRONG THE FIRST TIME. At 0.3 against a world
    row holding 0.5 the take's chord cannot reach the top, and asserting that it
    would have been doing the machine's arithmetic a second time and getting it
    wrong. What is promised is that a chord the table never offered here is now
    on the list and above rows it was not in.

<a id="test-nothing-stored"></a>

## suggest-test.mjs, nothing is stored

🔴 NOTHING IS STORED, AND SECTION 6.1 REFUSED A PERSISTENT PROFILE ON A
   MEASUREMENT: a composer's ENTIRE body of work is worth +0.60 points, and a
   stranger's at the same weight reads 0.76 BELOW the baseline. This is
   asserted over the module's own source with its comments stripped, because
   an absence asserted over raw source grades the prose, which this repository
   has already been caught doing twice.

<a id="test-mix-style"></a>

## suggest-test.mjs, the mix per style

🔴 THE MIX IS A STYLE FACT AND TRAVELS IN THE TABLE, WHICH IS THE THIRD TIME
   THIS PROJECT HAS FOUND THAT. MEASURED: jazz wants 0.25 and pop 0.1, and pop
   at 0.25 scores hugely better on top 1 while moving every one of the four
   measures AWAY from real pop, which is the plan's own caveat that part of the
   gain is music repeating itself rather than anything about a person.

<a id="test-take-route"></a>

## suggest-test.mjs, the take reaches the route

⚠️ THIS TAKE OVERLAPS THE ROUTE'S OWN CONTEXT ON PURPOSE, AND THE FIRST ONE
    DID NOT. A take of chords the route never passes through changes nothing,
    correctly, and a check written on one would have read as the adaptation
    never reaching `routeOver` at all. `Dm7 G7 Em7` round and round makes the
    trigram the route starts on one the take has met twice.

<a id="test-report-0930"></a>

## suggest-test.mjs, the `still not a good sounding suggestion` report

🔴 REPORTED 2026-09-30 AS *"still not a good sounding suggestion"*, over the
   lanes `Fmaj`, `Cmaj7` and a proposal of `C#dim7`. Three defects were found
   under it and every check below was run against the code before the repair
   and went red there, except the two marked as controls that must stay green
   on both sides. The counts are in `BACKLOG.md` under the entry that asked.

<a id="test-classes"></a>

## suggest-test.mjs, check 29, classes

29. 🔴 EVERY QUALITY IS COUNTED UNDER THE CLASS THE TABLE WAS BUILT WITH, AND
    THE SOURCE IT IS GRADED AGAINST IS THE BUILD'S OWN `classOf`, NOT
    `suggest.mjs`'s MAP. That map held eleven rows for the twenty six qualities
    `parseChord` returns, and the other fifteen fell through to major. Read off
    `suggest().from`, which is the symbol the table was actually asked about,
    so it grades the path a played or typed chord takes rather than a lookup.

<a id="test-class-exceptions"></a>

## suggest-test.mjs, check 30, classifier exceptions

30. NEGATIVE CONTROL for the exceptions above: they are exceptions because the
    build's classifier really does get them wrong, not because a row is missing
    here. `2` starts with a digit and that regex calls every such quality a
    dominant; `add9` it cannot class at all. And this file reads them as the
    chords they are.

<a id="test-passing-dim"></a>

## suggest-test.mjs, check 31, the passing diminished

31. And the device the build's own round trip asks about by name reaches the
    table as that device. `C#dim7` after `Cmaj7` is the passing chord to Dm7,
    91 per cent of the time in the jazz table, and it was asked about as a
    second major chord a semitone up.

<a id="test-zero-freq"></a>

## suggest-test.mjs, check 32, no zero frequency

32. 🔴 NO CHORD THE TABLE COUNTED HAS A FREQUENCY OF ZERO. Slot B divides by
    it. The linear column stores 46 jazz and 57 pop symbols as exactly 0, every
    diminished chord among them, and a zero read as a millionth gave each of
    them about 17 bits of specificity.

<a id="test-counted-freq"></a>

## suggest-test.mjs, check 33, the counted frequency

33. And the frequency it has is the counted one, which a floor would not give.
    `8dim` is 70 of 52,924 jazz chords, MEASURED 2026-09-30 off the cached iRb
    corpus; the log column holds it to a fifth of a bit.

<a id="test-the-report"></a>

## suggest-test.mjs, check 34, the report

34. 🔴 THE REPORT ITSELF. After `Fmaj Cmaj7` the page shows slot B, and it was
    `C#dim7` in 75 of 100 draws: a passing chord offered alone, which is the
    middle of a move and sounds like a question with no answer.

<a id="test-narrow"></a>

## suggest-test.mjs, check 36, the fix is narrow

36. NEGATIVE CONTROL, AND IT IS WHAT KEEPS THE FIX NARROW. The chord is still
    in the table and slot A still draws it, so a walk and a way home can pass
    through it with the chord after it. A repair that deleted diminished rows
    would pass 34 and 35 and fail this.
