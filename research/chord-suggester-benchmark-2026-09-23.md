# Benchmarking a chord suggester against 1,182 jazz standards and 890 pop chart entries

Asked 2026-09-23, three messages in a row:

> *"can you benchmark yr suggestions. want them to be openstudiojazz quality
> stuff"*, then *"no cliches"*, then *"perhaps a setting to toggle jazzyness /
> style?"*

🔴 **THIS SUPERSEDES ONE CONCLUSION OF `research/chord-learning-2026-09-23.md`
AND RESTS ON EVERYTHING ELSE IN IT.** That document recommended shipping a 173
byte diatonic rule and downloading no corpus, and the recommendation was correct
under the requirement it was given, which was four diatonic chords in a major
key. It said so itself: *"It would not hold for a jazz page wanting tritone
substitutions, for a modal page, or for anything asking what would an actual song
do next. The scope of the finding is the scope of the request."* The request
changed. **The 173 byte rule scores 1.4 per cent top 1 on real jazz and returns
nothing at all 65.3 per cent of the time**, and this document is the measurement
of exactly how badly and of what to build instead.

🔴 **NOTHING HAS BEEN PLAYED AND NO PAGE HAS BEEN CHANGED.** Every number below
came off two corpora of written chord symbols, counted by scripts in this
repository, on held-out songs. **No MIDI keyboard was plugged in, nobody
listened to any suggestion, and no `demo/*/index.html` or `demo/shell/*` file
was touched.** Section 10 is the list of what a person has to play before any of
this is known to be pleasant rather than merely correct.

| mark | means |
| --- | --- |
| **MEASURED** | a number taken off something run on this desk, with the script that took it |
| **DOCUMENTED** | a licence field or page fetched 2026-09-23 and quoted |
| **INFERRED** | a conclusion drawn from two of the above and stated by neither |
| **UNVERIFIED** | written from reasoning, nothing run to check it |

**The instruments**, all new, all in this repository, all contacting nobody
after the one fetch:

| file | what it does |
| --- | --- |
| `demo/resources/fetch-chord-corpora.mjs` | fetches both corpora once into gitignored `tmp/`, reads the licence back off the record |
| `demo/resources/chord-corpus.mjs` | both corpus formats into one key-relative alphabet |
| `demo/resources/bench-chord-suggester.mjs` | grades eight suggesters, sweeps the cliche trade-off, runs sixteen named jazz device tests |
| `demo/resources/build-chord-tables.mjs` | writes the table that would ship, and its licence file |
| `demo/resources/chord-tables.json` | **12,746 bytes**, both styles, the only thing a visitor would load |
| `demo/resources/LICENSE-chord-tables` | the CC BY attribution that has to travel with a derivative |

---

## The short answer

**Build it. The corpus is worth the download this time, and it was not last
time.** In one table, MEASURED on held-out songs neither table had seen:

| suggester | jazz top 1 | jazz silent | pop top 1 | pop silent |
| --- | --- | --- | --- | --- |
| the 173 byte rule, as written | **1.4%** | **65.3%** | 13.4% | 44.0% |
| the 173 byte rule, read generously | 9.2% | 44.5% | 16.3% | 33.0% |
| always offer the same two chords | **13.8%** | 0.0% | **20.0%** | 0.0% |
| a bigram learned from the corpus | 44.0% | 0.0% | 32.3% | 0.0% |
| a trigram learned from the corpus | **48.5%** | 0.0% | **40.7%** | 0.0% |
| NEGATIVE CONTROL, random from the vocabulary | 1.1% | 0.0% | 1.1% | 0.0% |
| NEGATIVE CONTROL, the other style's table | 31.2% | 0.0% | 28.9% | 0.0% |

🔴 **THE RULE LOSES TO A CONSTANT, AND IT LOSES TO A CONSTANT ON BOTH CORPORA.**
Always offering `V7` and `I` and never looking at what was played scores 13.8 per
cent on jazz. The rule scores 1.4. **A rule that cannot beat *always offer these
two* is not a rule**, and on jazz it also scores within half a point of drawing
chords out of a hat, which is the other control.

🔴 **AND THE RULE'S PROBLEM IS NOT ITS ORDERING, IT IS ITS ALPHABET, WHICH MEANS
NO AMOUNT OF TUNING REACHES THIS.** MEASURED: the rule can only ever answer with
one of seven diatonic triads, and **only 34.9 per cent of the chords that
actually come next in a jazz standard are one of those seven**. That is its
ceiling with a perfect ordering. The prior research measured that re-ordering the
rule from data is worth about one loop in twenty-four, and that is still true; it
is just that one loop in twenty-four of a 34.9 per cent ceiling is not the
question any more.

✅ **A TRIGRAM OVER A CHROMATIC ALPHABET REACHES 48.5 PER CENT TOP 1 AND 67.4 PER
CENT TOP 3 ON JAZZ**, and it gets **12 of 16 named jazz devices into its top 2**,
including the minor ii-V, the backdoor, both secondary dominants, two thirds of
the turnaround and the chromatic passing diminished.

✅ **THE STYLE DIAL IS REAL AND THE NUMBER IS 60 TO 71 PER CENT.** MEASURED: on
contexts both corpora have seen ten or more times, the jazz table and the pop
table name a **different** first suggestion for **42 of 59 bigram contexts
(71.2 per cent)** and **123 of 204 trigram contexts (60.3 per cent)**, at a mean
Jensen-Shannon divergence of **0.391 and 0.400 bits**. And **59 of 75 symbols are
SPELLED differently by the two styles**, jazz writing `min7` where pop writes
`min`. The dial moves the answer most of the time it is turned.

✅ **AND `no cliches` IS MEASURABLE RATHER THAN A MATTER OF TASTE.** The two-slot
design scores, MEASURED: slot A names the real next chord **48.7 per cent** of
the time and is the corpus's global maximum **16.2 per cent** of the time; slot B
is the global maximum **1.0 per cent** of the time, is **1.7 bits more
surprising**, and is still attested in held-out songs **90.7 per cent** of the
time. **A factor of sixteen less cliche for 2.3 points of attestation.**

**What it costs a visitor: 12,746 bytes and 67 nanoseconds.** That is **0.33 per
cent** of the 3,824,981 bytes of recordings `/nola/` already ships.

🔴 **AND ONE THING I WOULD REFUSE TO BUILD IS IN SECTION 8.** A single ranked
list of suggestions scored on accuracy is the thing to refuse, because it is the
shape that makes the two asks fight.

---

## 1. What was fetched, from whom, and how many times

🔴 **FIVE REQUESTS IN TOTAL, ACROSS FOUR HOSTS, AND THE CACHE MEANS THERE WILL
NEVER BE ANOTHER.** `CLAUDE.md`: *"super careful with external sources, better
avoid"*, and the rule there is about whose server it is rather than about which
harm has been named yet.

| host | requests | what for |
| --- | --- | --- |
| `zenodo.org` | 2 | the iRb API record, then the 530,984 byte file |
| `ddmal.music.mcgill.ca` | 1 | a 404. **This is the dead host everybody cites** |
| `ddmal.ca` | 1 | the live landing page, to resolve the archive link |
| `www.dropbox.com` | 1 | the 219,100 byte Billboard archive the link pointed at |

⚠️ **THE 404 WAS MY MISTAKE AND IT IS RECORDED RATHER THAN TIDIED AWAY.** The
brief said the live host is `ddmal.ca` and the first version of the recipe asked
`ddmal.music.mcgill.ca` anyway, because that is the URL in every paper. It
answered 404 and the script stopped rather than hunting, which is the behaviour
that is wanted. The fix was to name three candidate pages explicitly in the
script, bounded and printed, and the first one answered.

⚠️ **AND BILLBOARD CAME DOWN AT 219,100 BYTES WHERE THE PRIOR RESEARCH RECORDED
340,263.** That earlier figure came from a one byte ranged GET against the dead
host's `billboard-2.0-salami_chords.tar.gz`. What is served today is a different
archive at a different size. **It is the right data**: MEASURED, it unpacks to
**890 `salami_chords.txt` files**, which is the documented count of 890 sampled
chart slots. The size is different, the content is what it says it is, and the
discrepancy is named here rather than left for somebody to trip over.

✅ **THE LICENCE IS READ BACK OFF THE RECORD RATHER THAN QUOTED FROM A COMMENT.**
DOCUMENTED, printed by the recipe on the run that fetched:
`zenodo record 3546040 licence: "cc-by-4.0"`. If that ever stops saying so, the
script stops.

🔴 **AND WHAT SHIPS IS A TABLE, NOT A CORPUS.** 750,084 bytes of other people's
song data sit in `tmp/chord-corpora/`, which is gitignored, and stay there. The
12,746 bytes that would reach a visitor are counts over a key-relative alphabet,
which is a fact about the corpus rather than a copy of it.

🔴 **CC BY 4.0 REQUIRES ATTRIBUTION ON DERIVATIVES AND A COUNTED TABLE IS A
DERIVATIVE.** `demo/resources/LICENSE-chord-tables` is written by the build
script, so it cannot drift from what was counted, and it carries the iRb DOI, the
licence URL, both papers and the note that the dead McGill host is dead. McGill
Billboard is CC0 and attaches no condition; its citation is carried anyway,
because a table nobody can trace back is a table nobody can check.

---

## 2. The alphabet, which is the decision everything else rests on

🔴 **A DIATONIC ROMAN NUMERAL CANNOT SAY ANY OF THE THINGS OPEN STUDIO TEACHES,
AND THAT IS A FACT ABOUT THE ALPHABET RATHER THAN ABOUT THE TABLE.** Seven slots,
all of them in the key. A tritone substitution is on `bII`, a backdoor dominant
on `bVII`, a secondary dominant is a major-third-bearing chord on a degree the
key says should be minor, and a borrowed `iv` is minor where the key says major.
**None of the four has a slot.**

✅ **SO THE ALPHABET IS `(DEGREE 0..11, CLASS)`**, which is 12 roots times seven
classes and has somewhere to put all of them. MEASURED, the classes and the
corpus share of each:

| class | what is in it | share of jazz | share of pop |
| --- | --- | --- | --- |
| `dom` | 7, 9, 13, 7b9, 7#5, 7#9, 7#11, 7b13, 7alt | **40.6%** | **9.6%** |
| `min` | triad, min7, min9, min11, min6, minmaj7 | 30.2% | 20.8% |
| `maj` | triad, 6, maj7, maj9, 69, maj7#11 | **20.9%** | **64.8%** |
| `hdim` | h7, min7b5, hdim7 | 4.4% | 0.2% |
| `dim` | o, o7, dim, dim7 | 2.3% | 0.4% |
| `sus` | 7sus, 9sus, sus4(b7), sus2 | 1.4% | 3.9% |
| `aug` | +, aug | 0.1% | 0.2% |

🔴 **THOSE TWO COLUMNS ARE THE WHOLE STYLE DIFFERENCE IN SEVEN ROWS, AND THE TOP
THREE ARE A FACTOR OF FOUR IN BOTH DIRECTIONS.** Dominant chords are **40.6 per
cent of jazz and 9.6 per cent of pop**; plain major chords are **64.8 per cent of
pop and 20.9 per cent of jazz**; and half diminished chords, which are the front
door of every minor ii-V, are **4.4 per cent of jazz against 0.2 per cent of
pop**, a factor of twenty-two. ⚠️ **AND A DIATONIC MAJOR-KEY RULE HAS A ROW FOR
EXACTLY ONE OF THESE SEVEN CLASSES**, which is section 3 arriving early.

🔴 **AND THE MODE IS NOT A FIELD, WHICH IS DELIBERATE AND WHICH SOLVED A PROBLEM
RATHER THAN DUCKING ONE.** McGill Billboard states a tonic (`# tonic: Ab`) and
**never states a mode**. Inferring one would be a guess written into the data and
then counted as if it were data. It does not need inferring: `0maj` and `0min`
are different symbols, so a passage on a minor tonic is already a different
context from one on a major tonic, and the table learns the two separately
without anybody declaring which is which. MEASURED as working: the minor ii-V-i
device test passes at **#1 with 54.8 per cent** and nothing anywhere declares a
minor key.

🔴 **AN IMMEDIATE REPEAT IS ONE HARMONIC EVENT AND IS COLLAPSED, AND THIS IS THE
SINGLE BIGGEST PARSING DECISION.** MEASURED on the raw sequences before
collapsing: **12.4 per cent of jazz transitions and 26.7 per cent of pop
transitions are a chord going to itself**, because `| A:min | A:min | C:maj |` is
a chord held for two bars. Counted raw, the commonest continuation in pop by a
wide margin is *the chord you are already playing*, and a suggester trained on
that learns to answer *keep going*. **That is the most predictable answer there
is and the least useful**, and it would have arrived wearing a 27 per cent
accuracy improvement.

⚠️ **THE EXPANSION LIST IS HONOURED, WHICH IS WHAT MAKES A TURNAROUND EXIST AT
ALL.** iRb writes the form as `*>[A,N1,A,N2,B,A2]` and the sections once each. A
parser reading the file top to bottom never sees the last chord of A followed by
the first chord of A, **which is the turnaround the benchmark is asked to test
for**. MEASURED: 1,053 of 1,186 standards carry an expansion list. ⚠️ It also
repeats every other transition in a section as many times as the section is
played, which is a weighting decision and not a neutral one.

⚠️ **AND ONE FOLD LOSES SOMETHING REAL, NAMED HERE RATHER THAN HIDDEN.** `min6`
and `minmaj7` are folded into `min` alongside `min7`. On degree 0 those are the
tonic-minor colour and `min7` is the ii colour, and they are not the same thing.
614 `min6` and 150 `min:maj7` in iRb are counted as ordinary minor. **A page that
wanted to teach the minor-tonic line would need this split back.**

---

## 3. How badly the 173 byte rule does, and exactly where it goes silent

**Question 1 of the brief, answered with the number it asked for.**

MEASURED on **251 held-out jazz standards, 11,182 test cases**:

| | as written, diatonic triads only | read generously, sevenths folded to triads |
| --- | --- | --- |
| **returns nothing at all** | **65.3%** | 44.5% |
| top 1 | **1.4%** | 9.2% |
| top 2 | 3.0% | 13.2% |
| top 3 | 3.9% | 14.1% |
| top 1 about the ROOT, ignoring quality | 14.2% | 24.3% |

⚠️ **THE GENEROUS READING IS REPORTED BECAUSE THE STRICT ONE ALONE WOULD BE
UNFAIR TO THE RULE'S IDEA.** The rule has no row for a dominant seventh, so on a
corpus where `V7` is 13.6 per cent of every chord it is silent on `V7` by
spelling rather than by reasoning. The generous reading folds `dom` onto the
major triad of its degree and `min7` onto `min` before looking the rule up.
**Both readings lose to the constant baseline.**

🔴 **THE CEILING IS 34.9 PER CENT AND NOTHING CAN MOVE IT.** MEASURED: the rule's
only possible answers are seven diatonic triads, and **34.9 per cent of the
chords that actually come next in a jazz standard are one of those seven**
(56.3 per cent in pop). A perfect re-ordering of the rule's lists would score at
most that, and it scores 1.4.

🔴 **WHERE IT RETURNS NOTHING, JAZZ, THE TEN COMMONEST SILENT CONTEXTS**,
MEASURED, with how many test cases each accounts for:

```
V7 1468   VI7 650   I7 434   II7 424   bVII7 337
iv 317    i 274     IV7 270  v 242     III7 238
```

🔴 **THE COMMONEST CHORD IN JAZZ IS THE COMMONEST THING THE RULE HAS NOTHING TO
SAY ABOUT.** `V7` is 13.6 per cent of every chord in the corpus and the rule is
silent on every one of them, because its `V` row is a major triad. The prior
research found one hole by hand, *"`Am then F` returns nothing, because it has no
minor table"*, and that is in here too (`i` 274, `iv` 317, `v` 242). **The corpus
says the hole is far larger than the minor table**: those ten contexts are 4,654
silent cases and **the seven dominant sevenths among them are 3,821 of the
4,654**, which is 82 per cent. The minor chords in that list are 833.

⚠️ **ONE NUMBER IN THE RULE'S FAVOUR, AND IT IS CONDITIONAL.** Its `attest` reads
83.8 per cent on jazz, which looks respectable. **It is computed only over the
34.7 per cent of cases where it speaks.** A suggester that is silent two thirds
of the time and reasonable the rest is still a suggester that is silent two
thirds of the time. `silent` and `attest` have to be read together or the second
one flatters.

---

## 4. The named jazz devices, which is the strongest instrument here

🔴 **AN AGGREGATE SAYS A SUGGESTER IS RIGHT 48 PER CENT OF THE TIME AND CANNOT
SAY WHETHER IT HAS EVER HEARD OF A BACKDOOR CADENCE.** Sixteen contexts written
in C, each with the answer it is supposed to give, run against the jazz table and
the pop table. MEASURED. `P` is the probability that table gives the named answer
in that context.

| device | context | expects | jazz rank | jazz P | pop rank | pop P |
| --- | --- | --- | --- | --- | --- | --- |
| ii-V | `Dm7` | `G7` | **#1** | 74.2% | #4 | 13.7% |
| ii-V-I | `Dm7 G7` | `Cmaj7` | **#1** | 66.1% | #1 | 70.3% |
| minor ii, half diminished | `Dm7b5` | `G7` | **#1** | 88.3% | #1 | 38.3% |
| minor ii-V-i | `Dm7b5 G7alt` | `Cm` | **#1** | 54.8% | #1 | 39.1% |
| secondary dominant V7/ii | `A7` | `Dm7` | **#1** | 59.4% | #1 | 47.4% |
| secondary dominant V7/V | `D7` | `G7` | **#1** | 36.5% | #1 | 26.8% |
| tritone sub resolving | `Dm7 Db7` | `Cmaj7` | **#1** | 75.0% | #14 | 0.0% |
| backdoor cadence | `Fm7 Bb7` | `Cmaj7` | **#2** | 18.5% | #2 | 28.0% |
| backdoor, first half | `Fm7` | `Bb7` | **#1** | 39.4% | #10 | 2.3% |
| turnaround step 1 | `Cmaj7` | `A7` | #3 | 7.7% | #20 | 0.6% |
| turnaround step 2 | `Cmaj7 A7` | `Dm7` | **#1** | 73.0% | #2 | 32.5% |
| turnaround step 3 | `A7 Dm7` | `G7` | **#1** | 71.1% | #1 | 38.3% |
| modal interchange iv | `Cmaj7` | `Fm7` | #16 | 1.8% | #14 | 1.1% |
| modal interchange bVII7 | `Cmaj7` | `Bb7` | #15 | 1.8% | #28 | 0.1% |
| chromatic passing diminished | `Cmaj7 C#dim7` | `Dm7` | **#1** | 91.9% | #3 | 15.4% |
| the tritone sub as the OFFER | `Dm7` | `Db7` | #10 | 1.2% | #52 | 0.0% |

✅ **12 OF 16 IN THE TOP 2, AND 11 OF 16 WOULD ACTUALLY REACH THE PAGE** under
the two-slot design of section 6.

🔴 **ONE OF MY EXPECTATIONS WAS WRONG AND THE CORPUS CORRECTED IT, WHICH IS THE
BENCHMARK EARNING ITS KEEP.** I wrote `Fm7 Bb7 wants Cmaj7` expecting #1.
MEASURED: the jazz table's first answer is `Ebmaj7` at 170 observations and
`Cmaj7` is second at 82. **`Fm7 Bb7` is a ii-V in Eb before it is a backdoor into
C**, and the corpus puts the ordinary reading first two times in three. The
corroborating measurement, taken the other way round: **`bVII7` resolves to
`bIII` 20 per cent of the time and to `I` 19 per cent**, which is as near a tie
as makes no difference. **The device test did not fail. My expectation did**, and
a benchmark where every test passes would not have told me.

🔴 **AND THE FOUR MISSES ARE FOUR DIFFERENT THINGS, ONLY TWO OF WHICH ARE THE
TABLE'S FAULT.**

1. **Turnaround step 1, `Cmaj7` wanting `A7`, at #3 with 7.7 per cent.** The
   context is ONE chord, which is the least informative context that exists, and
   the two answers ahead of it (`ii` 12.2 per cent, `vi` 12.2 per cent) are not
   wrong. ⚠️ **On the page the context is two chords**, because the feature
   suggests a third after two have been played, so this test is harder than the
   real case.
2. **Modal interchange `iv` and `bVII7` from a bare `Cmaj7`, at #16 and #15.**
   Same problem, worse. MEASURED the other way round, these chords have contexts
   where they are the obvious answer and `Cmaj7` alone is not one of them:
   `bVII7` is offered at **67 to 82 per cent** after `bIII iv`, `VI7 iv` or
   `I7 VII7`, and `iv` at **67 to 93 per cent** after anything containing `I7`.
   **The device is in the table. The one-chord context is not enough to find it.**
3. **The tritone sub as an OFFER after `Dm7`, at #10 with 1.2 per cent.** This
   is the real miss and it is the interesting one. MEASURED: `bII7` is 1.04 per
   cent of all jazz chords, it resolves to `I` 24 per cent and `i` 20 per cent of
   the time exactly as theory says, **and its best contexts are all minor**:
   87 per cent after `i bvi`, 59 per cent after `bIII7 bvi`. **In this corpus the
   tritone sub lives in minor keys, not after a major ii.** That is a finding
   rather than a defect, and it means a page that wants to offer `Db7` after
   `Dm7` has to do it with a rule on top of the table, which section 8 refuses
   for now and section 10 says how to settle.

✅ **THE POP COLUMN IS THE NEGATIVE CONTROL FOR THIS WHOLE TABLE AND IT BEHAVES.**
The jazz-specific devices collapse in pop and the shared ones do not: the tritone
sub resolution goes **#1 at 75.0 per cent to #14 at 0.0**, the backdoor's first
half **#1 at 39.4 to #10 at 2.3**, and `ii-V` **#1 at 74.2 to #4 at 13.7**, while
`ii-V-I` stays #1 in both because a ii-V-I is not a jazz invention. **If the pop
column had scored like the jazz column the device tests would be measuring
nothing.**

---

## 5. The cliche dimension, and the trade-off it exposes

🔴 **TOP 1 ACCURACY AND `no cliches` ARE THE SAME AXIS POINTING IN OPPOSITE
DIRECTIONS, AND THE CONSTANT BASELINE IS THE PROOF.** MEASURED: the suggester
that always offers `V7` and `I` and never looks at anything scores **13.8 per
cent top 1 on jazz**, offers **2 distinct chords ever**, has an entropy of
**1.00 bits**, and **50 per cent of everything it says is the single commonest
chord in the corpus**. It beats the 173 byte rule at accuracy while being the
purest possible cliche. **Any benchmark that ranked these two on accuracy alone
would have told you to ship the constant.**

Four numbers separate them, MEASURED on jazz:

| suggester | top 1 | attested | global max | surprisal | types | entropy |
| --- | --- | --- | --- | --- | --- | --- |
| constant two | 13.8% | 76.0% | **50.0%** | 2.96 bits | **2** | 1.00 |
| trigram | 48.5% | 94.8% | 10.7% | 4.51 bits | 68 | 4.39 |
| two slot, A and B | 48.7% | 94.5% | **8.6%** | 5.02 bits | 61 | 4.84 |
| NEG random | 1.1% | **37.7%** | 1.3% | 8.68 bits | 78 | 6.28 |

🔴 **`random` IS WHAT PROVES `attested` IS DOING WORK.** It has the lowest global
max rate and the highest surprisal of anything here, which are the two numbers a
naive anti-cliche score would reward, **and its attestation is 37.7 per cent
against the trigram's 94.8**. That is the floor working: a suggestion nobody ever
plays in this context is wrong, not adventurous, and without that floor the way
to win an anti-cliche benchmark is to say nonsense.

⚠️ **AND `random`'s 37.7 PER CENT IS NOT ZERO, WHICH IS WORTH UNDERSTANDING
RATHER THAN EXPLAINING AWAY.** Attestation is measured with a BIGRAM context on
held-out songs, and after a common chord like `I` the held-out set contains dozens
of distinct continuations, so a random draw lands on one of them a third of the
time. **The measure is a floor, not a score.** It separates 37.7 from 90 to 98
and it would not separate 90 from 94.

### The trade-off curve

Slot B swept from ranking by probability (`lambda 0`) to ranking by pointwise
mutual information (`lambda 1`), MEASURED on held-out jazz. `pool` is how many of
the commonest continuations PMI is allowed to choose among. Slot A never moves.

| lambda | floor | pool | B names the real next | attested | global max | surprisal | types |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 3 | any | 12.7% | **93.0%** | 5.2% | 4.79 | 54 |
| 0.5 | 3 | all | 11.0% | 90.4% | 1.3% | 5.89 | 63 |
| **1** | 3 | **all** | 6.9% | **83.5%** | 0.9% | **7.65** | 66 |
| 1 | 3 | 6 | 8.2% | 88.7% | 1.0% | 6.44 | 61 |
| **1** | **3** | **4** | **9.9%** | **90.7%** | **1.0%** | **5.89** | **59** |
| 1 | 8 | 6 | 9.4% | 91.6% | 2.6% | 6.02 | 57 |

🔴 **PURE PMI WITH NO POOL IS THE TRAP AND IT LOOKS LIKE THE MOST INTERESTING
SETTING.** It has the highest surprisal in the table, 7.65 bits, and **it costs
9.5 points of attestation**. What it is doing is reaching past a dozen ordinary
answers for whatever is most SPECIFIC to a thin context, which on a context seen
twelve times is an augmented triad seen four. The suggestions it produced were
visibly wrong on the device contexts: `V+` after `Dm7 G7`, `bvi°` after a minor
ii-V, `I+` after `Cmaj7`. ⚠️ **A setting that raises surprisal and lowers
attestation is not a tuning improvement. It is the page changing what it is
willing to make up**, which is the same shape the prior research found in the
recogniser's bass weight, arriving in a different feature.

✅ **THE ANSWER IS A POOL OF 4 AND A COUNT FLOOR OF 3.** It asks a different and
better question: **of the things that belong here, which is least generic**.
MEASURED against ranking by plain probability, it costs **2.3 points of
attestation, 93.0 to 90.7**, and buys **a factor of five off the global max rate,
5.2 to 1.0** and **1.1 bits of surprisal**. Against slot A it is a factor of
sixteen (16.2 to 1.0).

⚠️ **THE POOL IS THE SECOND RAIL AND IT IS NOT THE SAME AS THE FLOOR.** A count
floor says *somebody played this here*. It does not say *this is one of the
reasonable things to play here*. Both are needed and they catch different things.

---

## 6. The two slots, graded as two jobs

🔴 **THE ORIGINAL ASK WAS ALREADY FOR A THIRD AND A FOURTH CHORD, WHICH IS TWO
SLOTS.** Making them a ranked pair of one job is what forces accuracy and *no
cliches* to fight over the same cell. Making them two jobs lets each be scored on
its own terms. MEASURED, held-out:

| | names the real next chord | attested | global max | surprisal | types | entropy |
| --- | --- | --- | --- | --- | --- | --- |
| jazz slot A, idiomatic | **48.7%** | **98.2%** | 16.2% | 4.15 | 44 | 3.92 |
| jazz slot B, worth hearing | 9.9% | 90.7% | **1.0%** | **5.89** | 59 | 4.97 |
| pop slot A, idiomatic | 40.0% | 97.3% | 28.8% | 3.53 | 44 | 3.29 |
| pop slot B, worth hearing | 12.6% | 91.7% | 2.5% | 5.15 | 54 | 4.54 |

✅ **SLOT B NAMING THE REAL NEXT CHORD ONLY 9.9 PER CENT OF THE TIME IS THE
DESIGN WORKING, NOT FAILING.** It is not trying to. What it must not do is drop
its attestation, and it does not: **90.7 per cent of what it offers is played
after that chord somewhere in songs the table has never seen.**

✅ **AND THE PAIR TOGETHER COSTS ALMOST NOTHING AGAINST THE PLAIN TRIGRAM.** Top
2 goes from 61.0 to 58.1 on jazz, 2.9 points, and the pair's global max rate
falls from 10.7 to 8.6 while its surprisal rises from 4.51 to 5.02. **Three
points of top 2 for a genuinely different second suggestion.**

What the two slots actually say, MEASURED on the device contexts, jazz table:

```
after Dm7            A  G7        B  G7sus
after Dm7 G7         A  Cmaj7     B  Em7
after Dm7b5          A  G7        B  Ab7            <- the tritone sub of the ii-V
after Dm7b5 G7alt    A  Cm        B  Dm7b5
after A7             A  Dm7       B  D7             <- the chain of secondary dominants
after Cmaj7 A7       A  Dm7       B  D7
after A7 Dm7         A  G7        B  G7sus
after Fm7            A  Bb7       B  Em7
after Cmaj7 C#dim7   A  Dm7       B  Bm7b5
```

⚠️ **`A7` THEN `D7` IS THE RHYTHM CHANGES BRIDGE AND NOBODY TOLD THE TABLE
ABOUT IT.** It fell out of asking which continuation is most specific to that
context. So did `Ab7` after `Dm7b5`, which is the tritone sub of the minor ii-V's
dominant. ⚠️ **This is an OBSERVATION ABOUT NINE CONTEXTS and not a
measurement.** The measurement is the 90.7 per cent attestation. Whether these
are good suggestions to a player is section 10.

---

## 7. Is the style dial a control that does anything

🔴 **A DIAL THAT DOES NOT MOVE THE ANSWER IS A LIE, SO IT IS MEASURED RATHER THAN
ASSERTED.** MEASURED on contexts both corpora have seen ten or more times:

| | shared contexts | with 10+ both sides | top 1 DIFFERS | mean Jensen-Shannon |
| --- | --- | --- | --- | --- |
| bigram contexts | 75 | 59 | **42 (71.2%)** | **0.391 bits** |
| trigram contexts | 801 | 204 | **123 (60.3%)** | **0.400 bits** |

**Turning the dial changes the first suggestion on three contexts in five.**

✅ **AND THE SECOND HALF OF THE DIAL IS THE SPELLING, WHICH IS EASY TO FORGET AND
IS HALF OF WHAT MAKES AN ANSWER READ AS JAZZ.** MEASURED: **59 of 75 shared
symbols are written differently by the two styles.**

```
I    maj7 / maj        ii   min7 / min       vi   min7 / min
IV   maj7 / maj        iv   min7 / min       i    min7 / min
bIII maj7 / maj        bVI  maj7 / maj       iiø  h7 / hdim7
```

🔴 **JAZZ PUTS A SEVENTH ON EVERYTHING AND POP DOES NOT, AND THAT IS IN THE
CORPORA RATHER THAN IN ANYBODY'S TASTE.** A page that swapped the table and kept
one spelling would be half a dial: functionally correct and writing `C` where a
jazz player expects `Cmaj7`. The shipped table carries a commonest-spelling field
per symbol per style for exactly this, at a cost of about 600 bytes a style.

The vocabularies themselves barely differ, MEASURED: jazz 78 symbols, pop 79,
**75 shared, Jaccard 0.915**, unigram Jensen-Shannon **0.249 bits**. ⚠️ **SO THE
DIAL IS NOT ABOUT WHICH CHORDS EXIST. IT IS ABOUT WHERE THEY GO AND HOW OFTEN.**
Both styles use nearly the same alphabet:

```
jazz   V7 13.6   I 12.2   ii 10.7   VI7 5.4   iii 4.1   vi 4.0   I7 3.8   II7 3.7
pop    I 20.8    IV 16.5  V 10.2    bVII 6.2  vi 4.8    i 4.5    ii 4.4   V7 3.7
```

🔴 **`ii` IS 10.7 PER CENT OF JAZZ AND 4.4 PER CENT OF POP, AND `IV` IS 16.5 PER
CENT OF POP AND 3.3 PER CENT OF JAZZ.** That is the ii-V world against the
I-IV-V-vi world in two numbers, and it is why the cross-style negative control
loses 17 points (48.5 to 31.2 on jazz) without collapsing: the two styles agree
about cadences and disagree about everything on the way to one.

---

## 8. What to build, what to refuse, and why

### Build

1. ✅ **A CORPUS-COUNTED TRIGRAM OVER `(DEGREE, CLASS)`, TWO STYLES, ONE FILE.**
   MEASURED at 48.5 per cent top 1 and 67.4 per cent top 3 on held-out jazz,
   against 1.4 per cent for the rule this replaces and 13.8 for a constant.
2. ✅ **TWO SLOTS WITH TWO JOBS**, slot A by probability and slot B by PMI over a
   pool of 4 with a count floor of 3. MEASURED: a factor of sixteen less cliche
   for 2.3 points of attestation.
3. ✅ **A COMMONEST-SPELLING FIELD PER SYMBOL PER STYLE**, because 59 of 75
   symbols are written differently and half the dial lives there.
4. ✅ **THE STYLE DIAL AS TWO TABLES IN ONE FILE.** It is literally which packed
   string is read. MEASURED: 60 to 71 per cent of contexts change their first
   answer.
5. ✅ **KEEP THE 173 BYTE RULE AS THE FALLBACK AND SAY SO.** The table is silent
   0.0 per cent of the time only because it backs off to the unigram. On a
   context genuinely unseen, a diatonic rule is a better last resort than the
   globally commonest chord, and it costs 173 bytes. ⚠️ This is UNVERIFIED as
   better: it was not measured, because the table's backoff never left a case
   uncovered to measure it on.

### Refuse

1. 🔴 **I WOULD REFUSE TO SHIP A SINGLE RANKED LIST SCORED ON ACCURACY.** It is
   the shape that makes the two asks fight over one cell, and the constant
   baseline is the proof it goes wrong: 13.8 per cent top 1 with an entropy of
   1.00 bits and two distinct answers in eleven thousand contexts. **A page built
   to maximise that number would offer `V7` and `I` forever and would look like
   it was working.**
2. 🔴 **I WOULD REFUSE TO SHIP SLOT B RANKED BY PMI WITH NO POOL**, which is the
   setting that looks most adventurous. MEASURED: 9.5 points of attestation for
   1.8 bits of surprisal, and the suggestions it makes on the device contexts are
   visibly wrong. **Adventurous and unattested are not the same thing and the
   brief said so first.**
3. 🔴 **I WOULD REFUSE TO ADD A HAND-WRITTEN TRITONE SUBSTITUTION RULE ON TOP OF
   THE TABLE UNTIL SOMEBODY PLAYS IT.** It is the obvious repair for the one real
   device miss and it is one line: *offer the dominant a tritone from the one you
   were going to offer*. It is also a rule that would fire on contexts where the
   corpus says it does not belong, and the corpus is emphatic: MEASURED, `bII7`
   lives in minor keys in this corpus (87 per cent after `i bvi`) and is 1.2 per
   cent after a major ii. **A rule that overrides a measurement because the
   measurement is inconvenient is how this project has been wrong before.**
4. 🔴 **I WOULD REFUSE TO SHIP THE CORPORA.** 750,084 bytes of somebody else's
   song data against 12,746 bytes of counts, for no gain a visitor can hear.
5. ⚠️ **AND I WOULD REFUSE TO CALL THIS `Open Studio quality` ON THESE NUMBERS.**
   12 of 16 named devices in the top 2 is a measurement about a table. Open
   Studio is a teacher explaining WHY the chord goes there, and nothing in a
   trigram explains anything. **The accurate claim is that the table knows where
   the devices go. It does not know what they are called or why.**

### Where the files should live

⚠️ **PROPOSED, NOT DECIDED, BECAUSE TWO OTHER AGENTS OWN `demo/shell/` RIGHT
NOW.** The four scripts and the table are written and are in `demo/resources/`,
which is where this repository already keeps derived data beside the recipe that
makes it (`corpus.json`, `durations.json`, `held-in-human.json`).

- `demo/resources/chord-tables.json`, served at `/resources/chord-tables.json`,
  which is how `/tapes/` already reads `/resources/corpus.json` and `/held/`
  reads `/resources/held-in-human.json`. **Written and measured at 12,746 bytes.**
- **The page-facing module is NOT written**, and it should be
  `demo/shell/suggest.mjs` with `demo/shell/suggest-test.mjs` beside it, the
  shape `chords-test.mjs` and `looper-test.mjs` already have. It belongs to
  whoever owns `demo/shell/name.mjs`, because a suggester reads what a recogniser
  named and the two want one owner.
- ⚠️ **`demo/resources/index.html` LISTS THE DERIVED FILES AND HAS NOT BEEN
  UPDATED**, because that is a page and this was not a `positron-ui` task.

---

## 9. What it costs, measured

| | |
| --- | --- |
| the packed table, both styles, one file | **12,746 bytes** |
| the same tables as ordinary JSON | 58,590 bytes, **4.6 times larger** |
| unpruned, as ordinary JSON | 120,662 jazz plus 83,396 pop |
| one lookup, shipped shape | **67.1 nanoseconds** |
| one lookup, the benchmark's own re-sorting shape | 9,543 nanoseconds |
| the two corpora, which stay in `tmp/` | 750,084 bytes |
| `/nola/`'s recordings, already shipped | 3,824,981 bytes across 95 files |
| **the table as a share of what that page already loads** | **0.33 per cent** |

🔴 **PRUNING TO A FIFTH OF THE SIZE COSTS NOTHING MEASURABLE**, MEASURED on
held-out jazz:

| table | contexts | bytes JSON | top 1 | top 2 |
| --- | --- | --- | --- | --- |
| unpruned | 1,753 | 120,662 | 48.5% | 61.0% |
| ctx>=4 row>=2 keep 4 | 908 | 41,168 | 48.7% | 61.0% |
| **ctx>=8 row>=3 keep 3** | **611** | **25,252** | **48.6%** | **60.9%** |
| ctx>=16 row>=4 keep 3 | 377 | 16,255 | 48.3% | 60.6% |

Everything pruning removes was seen once or twice and was never going to be a top
answer. ⚠️ **It does remove tail suggestions slot B might have wanted**, which is
why the floor of 3 in slot B and the row floor of 3 in the prune are the same
number and should stay that way.

⚠️ **THE 67 NANOSECOND FIGURE IS THE SHAPE THAT WOULD SHIP AND NOT THE SHAPE THE
BENCHMARK USES**, which is 142 times slower because it re-sorts a Map on every
call. The prior research measured exactly this gap on the recogniser, 27.14
microseconds against 0.30, and timing the convenient version would be repeating a
mistake already written down here.

✅ **THE PACKED TABLE ROUND-TRIPS AND THE CHECK IS NOT DECORATION.** MEASURED: a
decoder reading `chord-tables.json` answers 9 of 9 device contexts with the named
chord in its kept three, and **the same decoder against a table truncated to one
record answers 0 of 9**. A check that had stayed at 9 under that sabotage would
have been measuring nothing.

---

## 10. What could not be settled

🔴 **NOBODY HAS PLAYED ANY OF THIS AND THAT IS THE ONLY QUESTION THAT MATTERS
NOW.** Everything above is a fact about written chord symbols.

1. 🔴 **WHETHER SLOT B IS DELIGHTFUL OR ANNOYING.** MEASURED that it is 90.7 per
   cent attested and 1.7 bits more surprising than slot A. **Neither number is a
   feeling.** `Ab7` after `Dm7b5` is a tritone sub and it is also a chord that
   might sound like a mistake to somebody learning. **To settle it**: put both
   slots behind `?learn=1` on `/nola/`, play twenty progressions, and record which
   suggestion was taken. One session, one log line.
2. 🔴 **WHETHER THE EXPANSION LIST SHOULD BE HONOURED.** It creates the
   turnarounds, and it weights a repeated A section three times. MEASURED only
   with expansion on. **To settle it**: rebuild with `expand: false` and diff the
   device table. It is one flag in `parseIrb` and it was not run.
3. 🔴 **WHETHER FOLDING `min6` AND `minmaj7` INTO `min` COSTS ANYTHING THAT
   MATTERS.** 764 chords in iRb. On degree 0 they are the tonic-minor colour and
   the fold makes them ordinary. INFERRED that it hurts a minor-key page and
   MEASURED nowhere.
4. ⚠️ **WHETHER `7alt` SHOULD BE ITS OWN CLASS.** 127 in iRb, folded into `dom`.
   The brief's example was `iiø7 V7alt i` and this table can say the function but
   not the alteration. The spelling field carries the commonest surface spelling,
   which for `7dom` is plain `7`, so **the page would write `G7` where Open Studio
   writes `G7alt`.** Splitting it is a one-line change to `classOf` and was not
   measured.
5. ⚠️ **THE BILLBOARD ARCHIVE IS 219,100 BYTES AND THE PRIOR RESEARCH RECORDED
   340,263.** It unpacks to the documented 890 files. **Whether it is the same
   revision of the annotations is UNVERIFIED** and one more request to check would
   be one more request.
6. ⚠️ **ATTESTATION IS MEASURED WITH A BIGRAM CONTEXT** because trigram contexts
   on 251 held-out songs are too sparse to score against. It is a floor that
   separates 37.7 from 90, and **it would not separate 90 from 94**.
7. ⚠️ **1,186 JAZZ STANDARDS IS ONE CORPUS WITH ONE EDITOR'S CONVENTIONS**, and
   iRealPro charts are simplified by design. A real recording has more chords than
   its chart. **What is measured here is what people WRITE, not what they play.**
8. ⚠️ **THE `Leila` KEY FIELD IS WRONG IN THE CORPUS.** Its chords are a ii-V-I in
   F and it is labelled `*C:`. MEASURED as one file; the systemic check passed
   (degree histograms are textbook, and `allthethingsyouare` is `Ab`,
   `autumnleaves` is `g`, `autumninnewyork` is `F`, all correct). **How many other
   key fields are wrong is unknown and would move every number here a little.**
9. ⚠️ **NOTHING HERE MEASURES RHYTHM, PHRASE LENGTH OR CADENCE POSITION**, which
   is the prior research's complaint about the 173 byte rule and is equally true
   of a trigram. The fourth chord of a four bar phrase is under pressure the third
   one is not, and the table has no idea which chord it is looking at.
