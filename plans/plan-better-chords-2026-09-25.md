# Better sounding chords: the complaint is three complaints, and two of them are the argmax

Asked 2026-09-25, verbatim, with three screenshots of `/nola/`'s suggestion lanes:

> *"better soudning chords. labme soundin susggestion, recording my played
> suggestions. they sound unimaginative and dry and not moving anywhere. do
> resraerch, perhaps you let me just play some, you record and hand it over to
> llm and chord dbs and figure out my playing pattern and creativity inputs to
> move on with in my vibe"*

The three progressions in the screenshots were `Dmaj / Emin7 / Fdim7 / Ddim`,
`Dmin7 / Gmin / C7` and `D#maj7 / Amin7b5 / D7`. The second is a plain ii V i and
the third a plain minor ii V, so the evidence supplied with the complaint is the
complaint.

🔴 **THIS SUPERSEDES NOTHING IN
`research/chord-suggester-benchmark-2026-09-23.md` AND RESTS ON ALL OF IT.** That
document built the table that ships and was right about the question it was
asked, which was *does this suggester know any jazz*. This one asks a different
question, *why is what it knows so dull*, and the answer turns out to be in the
same file: its own section 10 lists nine things it could not settle, and the
first of them is this.

| mark | means |
| --- | --- |
| **MEASURED** | a number taken off something run on this desk on 2026-09-25, with the script that took it |
| **INFERRED** | a conclusion drawn from two measurements and stated by neither |
| **UNVERIFIED** | written from reasoning, nothing run to check it |

**Every number below was measured with no network and no browser**, against the
two corpora already cached in gitignored `tmp/chord-corpora/` (iRb 530,984 bytes,
McGill Billboard 219,100 bytes). `node demo/resources/fetch-chord-corpora.mjs
--check` reports **0 requests**. Nothing was fetched, no page was changed, and no
module under `demo/shell/` was touched.

---

## The short answer

🔴 **THE SUGGESTIONS ARE NOT BROKEN. THEY ARE THE ARGMAX, AND THE ARGMAX IS THE
DEFINITION OF UNSURPRISING.** The fix is not a better table, a bigger corpus or a
language model. It is to stop taking the most likely answer.

MEASURED on held-out jazz, taking the suggestion ten times in a row:

| | falls into a cycle | distinct chords in ten | attested | surprisal |
| --- | --- | --- | --- | --- |
| **slot A, always** | **99.1%** | **3.74** | 99.3% | 3.60 bits |
| slot B, always | 5.0% | 8.99 | 72.3% | 6.42 bits |
| **sampled, temperature 1** | **52.6%** | **7.52** | 96.6% | 4.55 bits |
| **THE REAL SONGS** | **52.7%** | **7.42** | 100% | 4.84 bits |

✅ **SAMPLING FROM THE TABLE ALREADY SHIPPED REPRODUCES THE STATISTICS OF REAL
MUSIC ON EVERY AXIS MEASURED**, while 96.6% of what it says is played after that
chord somewhere in songs the table has never seen. It is a one line change to
`twoSlots` and it needs no new data.

---

## 1. The complaint is three complaints with three different fixes

Separating them first is the whole reason this document is not a list of
tunings. Nothing in the third is reachable by fixing the first.

| the word | what it is about | where it lives |
| --- | --- | --- |
| **unimaginative** | the CHOICE | `suggest.mjs`, the argmax |
| **dry** | the SOUND | `voiceChord`, the voicing and the sampled piano |
| **not moving anywhere** | the SHAPE | nothing, because nothing on this page has a destination |

⚠️ **AND ONLY THE FIRST IS A CHORD PROBLEM.** A perfect chord suggester played as
close root position triads with no bass and no rhythm still sounds dry, and a
sequence of individually excellent next chords still goes nowhere. This is worth
stating because the ask names one subject and the research keeps finding that two
thirds of it is somewhere else.

---

## 2. Is it a bug or is it the objective working

🔴 **IT IS THE OBJECTIVE, AND THE NUMBERS ARE NOT CLOSE.** MEASURED on 11,171
held-out jazz contexts, 1,182 charts split by song, 931 train and 251 test:

- **the mean probability mass on the top answer is 51.5%**
- **the top answer holds over half the mass in 54.3% of contexts** and over 70%
  in **26.9%**

So on a quarter of all contexts the table is close to certain, and there is
nothing for a cleverer ranking to reach.

🔴 **SLOT A SAYS 44 DIFFERENT THINGS IN ELEVEN THOUSAND CONTEXTS, AND FIVE OF
THEM ARE 62.7% OF EVERYTHING IT EVER SAYS.**

    IImin 19.2%   Vdom 16.2%   I 15.7%   VIdom 6.5%   bVIIdom 5.1%
    top 10 share 79.2%

**ii, V and I together are 51.1% of every suggestion slot A makes.** Whatever you
play, one time in two you are offered one of three chords.

Pop is worse: slot A's top five are **77.1%** of everything it says, and `I`, `IV`
and `V` alone are **63.4%**.

### The decisive comparison: the suggester against the music it was counted from

🔴 **THE TABLE IS MORE CLICHED THAN THE CORPUS.** MEASURED, same contexts:

| | distinct | top 5 share | top 10 share | entropy |
| --- | --- | --- | --- | --- |
| **what the music actually played next** | 76 | **46.9%** | 64.3% | **4.75 bits** |
| **slot A** | 44 | **62.7%** | 79.2% | **3.93 bits** |
| slot B | 59 | 38.0% | 54.1% | 4.97 bits |

**Slot A is 0.82 bits less varied than the music it was learned from.** That is
not a defect in the data, the alphabet or the counting. It is what maximum
likelihood does, and it is exactly what the benchmark warned about in writing
before any of this was built: *"top 1 accuracy and the instruction no cliches are
directly opposed"*.

⚠️ **AND THE CORPUS IS NOT THE CLICHE.** MEASURED: ii to V is **8.1%** of all
jazz transitions and ii V I is **5.2%** of all trigrams. The music is not mostly
ii V I. The suggester is.

### The one answer this kills

🔴 **THE VOCABULARY IS NOT THE PROBLEM, WHICH MATTERS BECAUSE IT WAS THE PROBLEM
LAST TIME.** When neither slot names the real next chord, which is **41.8%** of
contexts, the music spreads over 76 chords at 5.32 bits, and **only 2.2% of those
are chords the suggester never offers anywhere in eleven thousand contexts.**

In 2026-09-23 the alphabet WAS the bottleneck: only 34.9% of real next chords
were among the seven diatonic triads, so no re-ordering could reach the other two
thirds, and the repair was to widen the alphabet to `(degree, class)`. **That
repair worked and the same repair is not available twice.** The table can already
say almost everything the music does. It just says it rarely.

---

## 3. "Not moving anywhere", taken literally

🔴 **TAKE THE SUGGESTION TEN TIMES AND YOU ARE IN A LOOP. MEASURED: 99.1% OF
WALKS FALL INTO A REPEATING CYCLE**, 90.7% of them three chords long, with
**3.74 distinct chords in a walk of ten**.

**77.3% of all walks end in the same three chord cycle**, which is the three
rotations of ii V I:

    26.6%   IImin Vdom I IImin
    26.3%   I IImin Vdom I
    24.4%   Vdom I IImin Vdom

Pop: **99.8% cycle, 98.7% of them two chords, 2.42 distinct chords in ten**, and
**65.7% of walks end in I IV I IV**.

✅ **THE CONTROL SAYS THIS IS NOT JUST WHAT MUSIC DOES.** Real held-out songs over
the same ten chords: **52.7% contain a repeating cycle, 7.42 distinct chords, and
723 distinct four chord endings in 1,013 stretches.** Real music repeats. It
repeats with twice the vocabulary and it arrives in hundreds of different places.

⚠️ **AND SLOT B ALONE IS NOT THE ANSWER EITHER.** Chained, it cycles only 5.0% of
the time and uses **8.99** distinct chords in ten, which is MORE than real music,
and its attestation falls to **72.3%**. Its endings are chromatic wanderings like
`VIImin bVdom VIIdom III`. **The truth is between the two slots and neither of
them is it.**

---

## 4. What actually fixes it

### 4.1 Sample, do not maximise

MEASURED, held-out jazz, ten step walks, against the real songs as the target:

| generator | cycles | distinct/10 | attested | surprisal |
| --- | --- | --- | --- | --- |
| slot A, always | 99.1% | 3.74 | 99.3% | 3.60 |
| slot B, always | 5.0% | 8.99 | 72.3% | 6.42 |
| A then B, alternating | 56.8% | 6.72 | 96.2% | 5.11 |
| sampled, temperature 0.5 | 79.0% | 6.33 | 99.0% | 4.00 |
| sampled, temperature 0.8 | 63.0% | 7.17 | 97.7% | 4.34 |
| **sampled, temperature 1.0** | **52.6%** | **7.52** | **96.6%** | 4.55 |
| sampled, temperature 1.4 | 39.5% | 7.87 | 94.2% | **4.84** |
| **THE REAL SONGS** | **52.7%** | **7.42** | 100% | **4.84** |

✅ **TEMPERATURE 1 MATCHES THE REAL MUSIC'S CYCLE RATE TO A TENTH OF A POINT AND
ITS VOCABULARY TO ONE TENTH OF A CHORD.** Temperature 1.4 matches its surprisal
exactly. Both keep attestation above 94%.

🔴 **AND THE RIGHT TEMPERATURE IS A STYLE FACT, MEASURED RATHER THAN CHOSEN.**
Pop's real songs cycle **89.0%** of the time with **4.65** distinct chords in ten,
which sits between temperature 0.5 and 0.8, not at 1.0. **The same dial that
makes jazz right makes pop wrong.** That is one number per style in the table,
beside the spelling field that is already there.

⚠️ **A COUNT FLOOR IS STILL REQUIRED AND IS ALREADY IN THE SHIPPED TABLE.**
Sampling without one draws from the tail, which is the same trap the benchmark
measured for pure PMI: 9.5 points of attestation for 1.8 bits. The floor of 3 is
what keeps the 96.6%.

### 4.2 Give it somewhere to go

🔴 **A PATH THAT HAS TO ARRIVE IS A DIFFERENT QUESTION FROM A CHORD THAT COMES
NEXT, AND THE TABLE CAN ALREADY ANSWER IT.** A beam search for the most likely
four chords ending on the tonic, MEASURED over 4,000 held-out jazz contexts:

- **a route exists and was found on 99.6% of them**
- **its transitions are attested in held-out songs 98.2% of the time**
- **85 distinct four chord routes**

The commonest are recognisable devices that nobody wrote a rule for:

    13.2%   Vdom IImin Vdom I
    12.2%   Imin IIhdim Vdom I      the minor ii V i
     4.1%   bVIIdom IImin Vdom I    the backdoor into a ii V

⚠️ **AND THE ARGMAX PROBLEM RETURNS ONE LEVEL UP, WHICH IS THE PROOF THAT THE
LESSON IS GENERAL RATHER THAN A PATCH.** MEASURED: **60.4% of the six commonest
routes end in ii V I**. A best path is as clichéd as a best chord. **The repair
is the same repair: sample the path.**

✅ **THIS IS WHAT "MOVING SOMEWHERE" MEANS IN CODE**, and it is the one proposal
here that changes what the page OFFERS rather than how it ranks: not *here is the
next chord* but *here is a four chord way home, and here is another one*.

---

## 5. Harmonic rhythm and position: real structure, and not a prediction win

🔴 **BOTH CORPORA STATE WHERE EVERY CHORD SITS IN TIME AND IN THE FORM, AND THE
PIPELINE THROWS ALL OF IT AWAY AT THE FIRST REGEX.** `chord-corpus.mjs` reads a
jazz chord with `/^[0-9.]+(.*)$/` and keeps only the tail, and the digits it
discards are the Humdrum duration. Billboard's bars, beats, timestamps, metre and
section labels are parsed and dropped the same way.

MEASURED, re-parsing 1,049 charts keeping duration, section and position:

- **the harmonic rhythm is not constant**: 2 beats **52.5%**, 4 beats **29.9%**,
  8 beats 5.4%, 3 beats 4.4%, 1 beat 4.3%
- **position changes the distribution a great deal**:

      after a chord that ENDS a section   I 38.0%, IImin 9.4%, Imin 6.9%
      after a mid-section chord           Vdom 15.1%, IImin 11.0%, I 9.1%

  **entropy 3.79 bits at a section end against 4.76 mid-section**

🔴 **AND KNOWING IT BARELY PREDICTS ANYTHING. MEASURED: 47.5% to 47.8% top 1, a
gain of 0.3 points**, with the position key covering 95.1% of contexts.

⚠️ **SO THE OBVIOUS PROPOSAL IS REFUSED BY ITS OWN MEASUREMENT.** Adding position
to improve prediction is not worth the work. What position is FOR is knowing when
a cadence is due, which is an input to section 4.2's target search and not to the
ranking. **It tells you where to aim, not what comes next.** That distinction is
the finding.

---

## 6. Can it learn my vibe

The ask has two halves that read as one and measure completely differently.

### 6.1 A persistent profile of a player: real, and nearly worthless

iRb names a composer on every chart, so the question is answerable with real
data. Leave one chart out and ask whether the same composer's OTHER charts
predict it better than the world does. MEASURED over 27 composers with 8 charts
or more, 461 charts, 16,564 contexts, with section expansion off:

| personal weight | top 1 | against world only |
| --- | --- | --- |
| 0 | 49.46% | baseline |
| 0.1 | 49.85% | +0.39 |
| **0.2** | **50.07%** | **+0.60** |
| 0.3 | 49.86% | +0.39 |
| 0.5 | 49.28% | -0.18 |
| 1.0 | 45.11% | -4.35 |

✅ **THE NEGATIVE CONTROL WORKS, WHICH IS WHAT MAKES THE +0.60 WORTH ANYTHING.**
The same amount of somebody ELSE's music at the same weight reads **48.70%**,
which is **0.76 points BELOW the baseline**. So a composer's own habit is a real,
measurable thing and a stranger's habit actively hurts. **It is also worth six
tenths of one point.**

🔴 **SO "FIGURE OUT MY PLAYING PATTERN AND MOVE ON IN MY VIBE", BUILT AS A
PERSISTENT PROFILE, IS NOT WORTH BUILDING.** Thirty charts of somebody's
life's work buys 0.6 points. A person playing for an evening will have less than
that.

### 6.2 What you are doing RIGHT NOW: worth ten times as much

Adapt on the first N chords of a piece and predict the rest of the same piece.
MEASURED, expansion off so a repeated A section cannot inflate it:

| N chords seen | top 1 on the rest | world only, same contexts | gain |
| --- | --- | --- | --- |
| 8 | 54.70% | 49.35% | **+5.35** |
| **16** | **57.21%** | 49.77% | **+7.44** |
| **32** | **58.89%** | 50.59% | **+8.30** |

🔴 **SIXTEEN CHORDS OF WHAT SOMEBODY IS PLAYING NOW IS WORTH MORE THAN EVERYTHING
ELSE MEASURED IN THIS DOCUMENT.** For comparison, the whole step from a bigram to
a trigram was 4.5 points (44.0 to 48.5), and it justified downloading two corpora.

⚠️ **AND THE HONEST CAVEAT IS THAT MUSIC REPEATS ITSELF.** Part of this gain is
that the second half of a piece reuses the first half's chords rather than that
anything was learned about a person. **Running it with section expansion ON gives
+10.1 points instead of +7.4**, and the difference between those two numbers is
exactly the repetition that the corpus's own expansion adds. The +7.44 is the
conservative reading and it is the one to quote. ⚠️ This also answers section
10.2 of the 2026-09-23 benchmark, which listed the `expand: false` rebuild as
never run.

🔴 **SO THE ANSWER TO "SHOULD I JUST PLAY AND WE ANALYSE" IS YES, AND THE REASON
IS NOT THE ONE IN THE QUESTION.** Playing is worth doing because a take adapts to
itself within about sixteen chords, not because twenty minutes builds a profile
of you. A profile is the part that does not pay.

---

## 7. The recording half

`/nola/` already takes real MIDI through `demo/shell/midi.mjs`, already names
chords through `name.mjs`, and already keeps `learned[]`. **What it does not do
is keep any of it past the tab.** Nothing is stored, so playing today produces
nothing to analyse.

What a minute of playing should produce, and it is small:

- **one line per chord event**: the time, the notes as they were actually played
  with velocity, the settled name, the key the page decided and whether it was
  guessed
- **one line per suggestion**: which two chords were offered, from which context,
  by which slot and which style
- **one line per outcome**: what was played next, and whether it was a suggestion
  (this is the `?learn=1` log the 2026-09-23 benchmark asked for and nobody ran)

🔴 **THE OUTCOME LINE IS THE ONLY ONE THAT ANSWERS ANYTHING NEW.** The first two
describe playing, which the corpus already has a thousand times over. **Whether a
suggestion was taken is the one fact no corpus in the world contains**, and it is
the only measurement that can tell delightful from annoying.

⚠️ **A SUGGESTION MUST NOT BE COUNTED AS PLAYING.** `/nola/` already carries this
rule in writing, from a report reading *"you recorded a suggestion. why>"*, and it
matters twice as much once the log feeds anything: a suggester that learns from
its own suggestions writes its own line and calls it yours.

---

## 8. What a language model can and cannot do here

This project has already paid for this answer and the measurements are in
`positron-verify` and on `/wish/`.

- **A schema constrains shape and cannot constrain meaning.** `llama-3.3-70b`
  returned `{"op": "transpose", "to": 1}` on every run, valid against its schema,
  where `transpose` takes `by`. Validate meaning in ordinary code.
- **A tighter schema was much worse**, not better: an `anyOf` per operation took
  the same model from **1.6 s to 10.2 s** and made it repeat itself.
- **A model proposes and a person presses.** It produced well formed patches
  aimed at the wrong instrument, which no validator can catch.

✅ **SO THE JOB AN LLM IS ACTUALLY GOOD FOR HERE IS THE ONE THE TABLE CANNOT DO AT
ALL: SAYING WHY.** The benchmark refused the phrase *Open Studio quality* on
exactly this ground: *"the table knows where the devices go. It does not know
what they are called or why."* A model that reads a logged take and answers *you
keep resolving to the relative minor and never to the tonic, and bar 8 is where
you could* is adding the thing that is missing.

🔴 **AND IT MUST NOT BE IN THE PLAYING LOOP.** A suggestion has to arrive in the
time between two chords. Anything that takes 1.6 seconds is not a suggester, and
the 10.2 second version is not anything. **Offline on the log, between takes, as
text a person reads.** UNVERIFIED as useful: no model has been shown a take,
because no take has ever been recorded.

---

## 9. The evaluation, which is where this lives or dies

🔴 **EVERY STANDARD MEASURE OF A SEQUENCE MODEL REWARDS THE THING BEING
COMPLAINED ABOUT.** `bench-chord-suggester.mjs` scoring the proposal here would
rank the dry one higher: sampling at temperature 1 has LOWER top 1 than the
argmax by construction. **A benchmark that ranked these two on accuracy would
tell you to ship what you already have.**

What to measure instead, and all four already exist in this repository:

1. **cycle rate and distinct chords over a ten step walk**, against the real
   songs as the target rather than as a ceiling. This is the number that moved
   99.1% to 52.6%.
2. **attestation on held-out songs**, which is the floor that stops adventurous
   becoming wrong. Nothing ships below about 94%.
3. **surprisal and global max rate**, which the benchmark already reports.
4. **the taken rate**, from section 7, which is the only one that is about a
   person.

⚠️ **AND A PREFERENCE TEST THE PLAYER CAN SEE THROUGH IS NOT A MEASUREMENT.** If
a take is graded by ear, the arm that produced each suggestion must be hidden
from the person judging it, and there must be a control arm that can lose. The
obvious control is today's argmax. **Without a losing arm, "the new one is
better" is a sentence rather than a result.**

---

## 10. What to build, what to refuse

### Build

1. ✅ **SAMPLING, WITH A PER STYLE TEMPERATURE IN THE TABLE.** One number per
   style beside the spelling field. MEASURED as matching real music at 1.0 for
   jazz and between 0.5 and 0.8 for pop. This is the whole of the fix for
   *unimaginative* and most of the fix for *not moving anywhere*.
2. ✅ **A FOUR CHORD ROUTE TO A TARGET, SAMPLED RATHER THAN MAXIMISED.** MEASURED
   at 99.6% coverage and 98.2% attestation. This is what *moving somewhere*
   means, and it changes what the page offers rather than how it ranks.
3. ✅ **WITHIN TAKE ADAPTATION AT WEIGHT 0.2 TO 0.3**, over the last sixteen to
   thirty two chords. MEASURED at +7.44 points, the largest single gain in this
   document.
4. ✅ **THE LOG, AND THE TAKEN RATE.** It is the only instrument that can answer
   whether any of this is pleasant, and it is three line types.

### Refuse

1. 🔴 **A PERSISTENT PLAYER PROFILE.** MEASURED at +0.60 points from a composer's
   entire body of work. It is real and it is not worth the storage, the privacy
   question or the code.
2. 🔴 **A LANGUAGE MODEL IN THE SUGGESTION LOOP.** 1.6 s at best on this desk,
   against a gap between two chords. Offline on the log, or not at all.
3. 🔴 **ADDING POSITION OR HARMONIC RHYTHM TO THE RANKING.** MEASURED at +0.3
   points. Keep the parse, use it for the target search, do not put it in the
   table.
4. 🔴 **FETCHING ANOTHER CORPUS.** Nothing measured here was limited by data.
   The alphabet already covers 97.8% of what the music does.
5. 🔴 **RAISING `keep` FROM 3 AND CALLING IT THE FIX.** It was the first thing
   this investigation proposed and the measurement refused it: it widens slot B's
   choice from a mean of 1.78 candidates to 2.57, and it reaches **no new
   contexts at all**, because the contexts where slot B has no choice are
   identical under both. Worth doing beside the real fix, worth nothing alone.

---

## 11. What it costs

| | |
| --- | --- |
| sampling instead of argmax | one function in `demo/shell/suggest.mjs` |
| a temperature per style | one number per style in `chord-tables.json` |
| the target route | about forty lines, a beam search over the table already loaded |
| within take adaptation | a counts object in the page, no storage, no server |
| the log | three line types, and a decision about where it goes |
| anybody else's server | **nothing** |
| new data | **nothing** |

⚠️ **THE ONE REAL COST IS THAT `demo/shell/suggest.mjs` IS SHARED**, so this is
done once, by one agent, with `suggest-test.mjs` extended and `/kit/` re-run.
`suggest-test.mjs` carries six negative controls today and sampling needs its own:
**a sampler seeded the same way must be reproducible, or nothing in this document
can be regression tested.**

---

## 12. What could not be settled

1. 🔴 **WHETHER ANY OF IT SOUNDS BETTER. NOBODY HAS PLAYED A NOTE.** Every number
   here is about written chord symbols, exactly as it was on 2026-09-23. The
   statistics of the generated line now match real music; **that is not the same
   claim as a person enjoying it**, and no amount of this kind of measurement
   will ever make it one.
2. 🔴 **THE WHOLE OF "DRY", WHICH IS A THIRD OF THE COMPLAINT AND IS NOT
   ADDRESSED HERE AT ALL.** `/nola/` voices a suggestion with `voiceChord(...
   near, bass: false)`, which is close position, no bass and no inner voice
   motion, into a sampled piano. **Nothing in this document changes one thing a
   listener hears about the SOUND of a chord.** Guide tone voicings, a bass note
   of its own and a rhythm are a separate piece of work with a separate
   evaluation, and it is probably the larger half of the complaint.
3. ⚠️ **THE TEMPERATURE WAS FITTED TO A CORPUS, NOT TO A PLAYER.** 1.0 matches
   iRb's statistics. Whether it matches what this desk wants to hear is a taste
   question with a dial on it, and the dial should be reachable.
4. ⚠️ **THE TARGET IS ASSUMED TO BE THE TONIC.** A real player aims at all sorts
   of places. What the target should be, and whether a person picks it or the
   page infers it, is undecided and is the main design question in section 4.2.
5. ⚠️ **THE WITHIN TAKE GAIN IS MEASURED ON PIECES, NOT ON PLAYERS.** A chart is
   a proxy for a take and it is a good one, but a person improvising is not a
   lead sheet and the +7.44 could move either way. **One recorded take settles
   it**, which is the same recording section 7 asks for.
6. ⚠️ **ATTESTATION IS A FLOOR AND NOT A SCORE.** It separates 37.7% from 94%.
   It would not separate 94% from 96%, and this document leans on it in exactly
   one place where the difference is 96.6 against 99.3.
7. ⚠️ **1,186 CHARTS IS ONE CORPUS WITH ONE EDITOR'S CONVENTIONS**, and what is
   measured is what people WRITE, not what they play. Unchanged from 2026-09-23
   and still true.

---

## 13. What was built on 2026-09-25, and the one number that did not survive

Items 1 and 2 of section 10 are built. Items 3 and 4 are not.

🔴 **THE TEMPERATURES IN SECTION 4.1 ARE NOT THE TEMPERATURES THAT SHIPPED, AND
THE REASON IS THE TABLE RATHER THAN THE DIAL.** Section 4.1 swept a temperature
over EVERY row a context had with a count of three or more.
`demo/resources/chord-tables.json` keeps the **top three rows only**, which is
already a sharpening, so the same variety costs a much flatter dial. MEASURED
2026-09-25 by `demo/resources/chord-e4-generators.mjs`, which builds that exact
shape out of the training split and walks ten steps through `suggest.mjs`'s own
sampler:

| | cycles | distinct/10 | attested | surprisal |
| --- | --- | --- | --- | --- |
| jazz, the argmax | 99.1% | 3.73 | 99.3% | 3.60 |
| jazz, **T 1.0**, the plan's number | 81.6% | 5.92 | 99.0% | 3.91 |
| jazz, **T 3.5**, what ships | **53.1%** | **7.13** | **97.2%** | 4.45 |
| jazz, uniform over the three | 40.5% | 7.53 | 95.8% | 4.70 |
| **THE REAL JAZZ SONGS** | **52.7%** | **7.42** | 100% | 4.84 |
| pop, the argmax | 99.8% | 2.42 | 99.3% | 3.31 |
| pop, **T 0.8**, the plan's range | 94.9% | 4.03 | 98.6% | 3.42 |
| pop, **T 1.4**, what ships | **87.3%** | **4.67** | **98.3%** | 3.55 |
| **THE REAL POP SONGS** | **89.0%** | **4.65** | 100% | 4.22 |

✅ **AND THE THIRD MEASURE MOVES THE SAME WAY, WHICH IS THE ONE THAT SAYS
*CLICHE* IN A NUMBER.** The global max rate, how often a generator answers with
the single commonest chord in the corpus whatever was played: jazz **27.4 per
cent at the argmax, 15.3 at T 3.5, and 13.5 in the real songs**; pop **34.9, 24.4
and 20.3**. Nothing was tuned against it and both styles land beside the music.

✅ **THE CONCLUSION IS UNCHANGED AND THE ARITHMETIC IS NOT.** Sampling still
reproduces the statistics of real music on the two axes the complaint is about,
and attestation is nowhere near the 94 per cent floor. What moved is the number
in the table, and it moved because the prune is itself a temperature.
⚠️ **AND THE CEILING IS THE PRUNE.** Uniform over three rows is 7.53 distinct
chords in ten at a 40.5 per cent cycle rate, so no temperature reaches the real
songs' 7.42 with their cycle rate as well. Raising `KEEP` from 3 is the only
thing that would, and it costs bytes rather than accuracy. Nobody has asked.

🔴 **THE ROUTE'S SAMPLING CONVENTION WAS DECIDED BY MEASUREMENT AND THE OBVIOUS
ONE LOSES.** Weighting a whole path by its own probability, which is the exact
analogue of sampling one chord, barely touches the cliche: MEASURED on jazz, the
best path alone puts **72.6 per cent** of its six commonest routes into ii V I,
per-path sampling **73.6 per cent**, and weighting **per step**, which is the
geometric mean probability of a step raised to `1/T`, drops it to **18.5 per
cent**. Coverage is identical at 92.7 per cent and attestation moves from 98.8 to
98.3. So `routeOver` weights per step.
⚠️ **AND COVERAGE IS 92.7 PER CENT, NOT THE 99.6 IN SECTION 4.2**, for the same
reason as the temperature: three rows a context is a narrower graph to find a
path through. 98.3 per cent attestation is unchanged from the 98.2 measured
there.

✅ **WHAT A PLAYER SEES.** `/nola/` draws the SECOND slot, not the first, so the
fix had to reach it. Slot B is chosen from the rows slot A did not take, so a
drawn A moves it: MEASURED over every trigram context in the shipped jazz table,
the second slot now answers **1.69 different chords a context and moves at all in
68.7 per cent of them** (pop 1.76 and 75.8), where before it was one chord,
always. And the page gained a four chord way home in a block of its own.

⚠️ **THE TARGET IS STILL THE TONIC AND SECTION 12.4 IS STILL OPEN.** It is the
key's own tonic, major or minor by the mode, named in the block's heading.
Nothing infers a destination and nobody picks one.
⚠️ **THE SEED IS FIXED AND THAT IS A DECISION, NOT A DEFAULT.** `/nola/` draws
from one seeded stream, `?seed=` changes it, and the stream ADVANCES, so the same
two chords played four times over are four different draws. A draw off the clock
would have made every check on that page flake.


## The scripts

✅ **THEY MOVED INTO `demo/resources/` ON 2026-09-25, WHEN ITEMS 1 AND 2 WERE
BUILT**, beside `bench-chord-suggester.mjs`, because a measurement nobody can
re-run is a number that goes stale silently. Every one of them reuses
`demo/resources/chord-corpus.mjs` verbatim so nothing is re-implemented, and
every one of them still contacts nobody.

| script | what it measured |
| --- | --- |
| `demo/resources/chord-exp-lib.mjs` | the shared loading and the split, plus `shipShape`, which is new |
| `demo/resources/chord-e1-modal.mjs` | probability mass, slot concentration, how much choice slot B has |
| `demo/resources/chord-e1b-vsmusic.mjs` | the suggester's spread against the music's |
| `demo/resources/chord-e2-position.mjs` | duration and section position, re-parsed and graded |
| `demo/resources/chord-e3-cycles.mjs` | where ten accepted suggestions lead |
| `demo/resources/chord-e4-generators.mjs` | four generators and the arriving path, against the real songs, and since 2026-09-25 the SHIPPED sampler and the SHIPPED route as well |
| `demo/resources/chord-e5-vibe.mjs` | composer adaptation and the within take curve, with and without expansion |
| `demo/resources/chord-e5b-noexpand.mjs` | the same curve with section expansion off |

🔴 **AND `chord-e4-generators.mjs` NOW GRADES THE CODE THAT SHIPS RATHER THAN A
COPY OF IT.** It imports `sampleRow`, `rowsFor` and `routeOver` from
`demo/shell/suggest.mjs` and points them at `shipShape`, which is the training
split pruned and quantised exactly the way `build-chord-tables.mjs` prunes and
quantises: `ctx>=8`, `row>=3`, **three rows a context**, one character of
probability. **That shape is not the shape section 4.1 swept**, and section 4.1's
temperatures do not survive the difference. See the section above.

## 14. What was built on 2026-09-26, and the ceiling that was not where this document said it was

Asked after playing with what section 13 shipped, verbatim: *"suggeston are
better but still a bit meh"*. Two jobs were set from this document: raise `KEEP`,
and build item 3. Both are done. A third thing was found on the way and it is the
one that explains the report.

🔴 **THE CEILING SECTION 13 NAMED IS REAL AND IT IS SMALL, AND THE ONE IT DID NOT
NAME IS WHAT A PLAYER MEETS.** MEASURED by `demo/resources/chord-e6-keep.mjs`,
which sweeps the prune at 3, 4, 5, 6 and 8 rows and **refits the temperature at
every step**, because the prune is itself a temperature and a sweep that held the
dial still would be measuring two changes and reporting one.

Held at the real songs' own cycle rate, which is the one comparison a scoring
rule cannot tilt:

| KEEP | bytes | jazz distinct/10 | jazz attested | pop distinct/10 | route found | routes |
| --- | --- | --- | --- | --- | --- | --- |
| **3** | 12,789 | 7.15 | 97.2% | 4.56 | 92.7% | 150 |
| 4 | 15,513 | 7.18 | 96.6% | 4.55 | 98.1% | 239 |
| **5** | **18,237** | **7.32** | **97.0%** | **4.55** | **98.5%** | **307** |
| 6 | 20,961 | 7.34 | 97.3% | 4.53 | 98.5% | 383 |
| 8 | 26,409 | 7.41 | 97.2% | 4.51 | 98.5% | 503 |
| **THE REAL SONGS** | | **7.42** | 100% | **4.65** | | |

🔴 **SO THE VOCABULARY GAIN IS 0.27 DISTINCT CHORDS IN TEN AT MOST, IT IS A JAZZ
GAIN ONLY, AND POP MOVES THE WRONG WAY.** *"Raising `KEEP` is the only thing that
would move it"* was true and reads as a bigger promise than it pays. Surprisal
does not move at all across the sweep (4.46 to 4.47 against the music's 4.84) and
neither does the rate of answering the corpus's commonest chord (15.2 to 15.0
against 13.5). **The prune closes the vocabulary gap and closes nothing else.**

✅ **WHAT PAID FOR `KEEP 5` IS THE WAY HOME, NOT THE WALK.** A four chord route to
the tonic existed on 92.7 per cent of held-out jazz contexts and now exists on
98.5, over 307 distinct routes against 150. **Seven contexts in a hundred had no
way home at all.** 6 and 8 buy 0.02 and 0.09 more distinct chords for another
2,724 and 8,172 bytes and take the route's attestation to 95.2 and 94.4 against a
floor of about 94, so they are refused rather than missed.

⚠️ **AND THE DIAL MOVED AGAIN, WHICH IS SECTION 13'S LESSON ARRIVING A SECOND
TIME.** Five rows is a flatter thing to draw from than three, so the same variety
costs a COLDER dial: jazz **3.5 to 1.7**, pop **1.4 to 0.8**. A search floored at
1.0 answered `T 1.00` for every pop prune above three while missing the cycle rate
by sixteen points, so a number below 1 is not a mistake.
⚠️ **AND A COARSE GRID MEASURES THE GRID.** A sweep at 1, 1.5, 2, 2.5 made KEEP 5
look WORSE than KEEP 3, because the fit it wanted sat between two of its points.

### 14.1 Slot B was still an argmax, and slot B is the one on screen

🔴 **SLOT B ANSWERS EXACTLY 2.00 DISTINCT CHORDS A CONTEXT, AT EVERY PRUNE FROM
THREE ROWS TO EIGHT.** That number is not a table fact. B is the highest pointwise
mutual information row that A did not take, so it is the PMI top unless A collided
with the PMI top, in which case it is the PMI second. **Two values, for any width
of table, forever.** No prune and no temperature can reach it.

🔴 **SO THIS DOCUMENT'S WHOLE LESSON HAD BEEN APPLIED TO SLOT A AND NEVER TO SLOT
B, AND `/nola/` DRAWS SLOT B.** Section 13 said the fix *"had to reach it"* and
measured that a drawn A moves B in 68.7 per cent of contexts, which is true and is
about WHETHER it moves rather than about how far. It moves between two chords.

✅ **THE REPAIR IS THE SAME REPAIR, ONE SLOT SIDEWAYS**, which is now the third
time: chord, then path, then the other slot. `2^(pmi/T)` is `(p/u)^(1/T)`, so a
row is drawn in proportion to how specific it is and one dial means the same thing
everywhere. MEASURED on jazz, 2,000 held-out contexts, 40 draws each:

| | distinct B | attested | globally commonest |
| --- | --- | --- | --- |
| **argmax, as shipped** | **2.00** | 92.98% | 4.2% |
| **drawn at 1** | **3.53** | 92.79% | 5.0% |
| drawn at 2 | 3.64 | 92.53% | 5.8% |
| drawn at 4 | 3.73 | 92.50% | 6.7% |

**1 buys 77 per cent of the available width for two tenths of a point of
attestation**, and it is a definition rather than a fit, so it is a constant in
`suggest.mjs` and not a field in the table.
⚠️ **AND IT COST ONE OF THE SEVEN NAMED DEVICES, RECORDED RATHER THAN TUNED
AWAY.** With a pool of four finally full, `A7 Dm7` offers `Bmin7b5` where it used
to offer `G7`. The table still HOLDS the real next chord for 7 of 7 and the drawn
page reaches it within 24 draws for 7 of 7; what lost one is the argmax pair.
⚠️ **AND `temp: 0` STOPPED BEING DETERMINISTIC FOR HALF AN HOUR.** Drawing B made
`suggest(ctx, { temp: 0 })` fall through to `Math.random`, and two checks went red
in one run and green in the next with no code between them. `temp: 0` now means
the argmax of BOTH slots.
⚠️ **AND `beam` OF 64 WOULD HAVE TURNED THE ROUTE BACK INTO AN ARGMAX SILENTLY.**
It was derived from `KEEP 3`, where `3^3` is 27; at five rows the live set is 125.
It is 256.

### 14.2 Within take adaptation, which survives the prune where the temperature did not

🔴 **+6.32 POINTS OF TOP 1 ON HELD-OUT JAZZ, THROUGH THE TABLE THAT SHIPS.**
MEASURED by `demo/resources/chord-e7-take.mjs` with expansion OFF, which is the
conservative reading section 6.2 asked for. Section 6.2's +7.44 was measured on
full counts; this is the same gain through five pruned rows and one character of
probability, and unlike the temperature **it very nearly survives the difference**.

🔴 **AND THE PLAN'S SENTENCE AND THE PLAN'S MEASUREMENT ARE TWO DIFFERENT
WINDOWS.** Section 6.2 says *over the last sixteen to thirty two chords* and what
it measured was the FIRST sixteen of a piece. They do not score alike. MEASURED at
weight 0.25 on the same 4,351 held-out contexts:

    the last 16 chords    +1.98 points
    the first 16 chords   +5.91
    everything so far     +6.32

**A sliding window of sixteen is worth a third of what keeping the take is
worth**, because sixteen chords ago is the section you have just left. `mkTake`
keeps 64, which is everything so far for any realistic take.

✅ **AND IT COSTS NOTHING ON THE OTHER THREE MEASURES, WHICH IS THE CONDITION THIS
DOCUMENT'S SECTION 9 SETS.** Jazz, ten step walks from 755 held-out positions:

| | cycles | distinct/10 | attested | surprisal | commonest |
| --- | --- | --- | --- | --- | --- |
| world only | 53.3% | 7.29 | 98.2% | 4.42 | 15.9% |
| **adapted, 0.25** | **50.2%** | **7.44** | **98.0%** | **4.58** | **14.6%** |
| **THE REAL SONGS** | **52.0%** | **7.44** | 100% | **4.84** | **13.8%** |

Three of the four move toward the music and the fourth moves 1.3 points past it.

🔴 **AND THE MIXING WEIGHT IS A STYLE FACT, WHICH IS THE THIRD DIAL TO TURN OUT TO
BE ONE.** Section 6.2 measured iRb only, so its 0.2 to 0.3 is a JAZZ range that
reads as a general one. **Pop wants 0.1.** At 0.25 pop reads **+17.77 points of
top 1** and drives every one of the four measures AWAY from real pop: 83.6 per
cent cycling against the music's 89.0, and 4.89 distinct against 4.65. **That
enormous number is this document's own caveat at full volume**, because a
Billboard run is a verse or a chorus, which is a loop. The four measures are what
refuse it, which is the whole reason this project does not score on top 1 alone.

🔴 **A SUGGESTION MUST NOT FEED THE ADAPTATION, AND IT IS A COUNTER NOW RATHER
THAN A RULE.** Every chord that can reach a take goes through `heard(chord,
source)`, only `'played'` counts, **there is no default source** so a careless
call is the refused one, and `refused` is a number a check reads. MEASURED as the
shape of the trap rather than left as a warning: a generator fed its own output
cycles **56.8 per cent** of the time against 50.2 and drops to 7.23 distinct
chords from 7.44, **moving away from real music on both axes at once**.
✅ **THE NEGATIVE CONTROL WORKS, WHICH IS WHAT MAKES THE +6.32 WORTH ANYTHING.**
Somebody else's take at the same weight reads **-1.24 points** on jazz and -3.03
on pop, the same sign and the same size as section 6.1's composer control.
🔴 **AND A PERSISTENT PROFILE IS STILL REFUSED.** Nothing is stored, nothing is
sent, and `suggest-test.mjs` asserts the absence over the module's own source with
the comments stripped.

### 14.3 What this could not settle

1. 🔴 **STILL NOBODY HAS PLAYED A NOTE.** Section 12.1 is unchanged and every
   number above is about written chord symbols.
2. 🔴 **THE FOUR MEASURES CANNOT TELL A REAL TAKE FROM A STRANGER'S.** On the ten
   step walks, somebody else's take reads 49.8 per cent cycling and 7.50 distinct
   against a real take's 50.2 and 7.44, which is a tie. **Only top 1 separates
   them**, and it does, at +6.32 against -1.24. So the four measures say the
   adaptation costs nothing and cannot say it is adapting to the right person.
   An A/B where both arms share the property returns identical, and this is that.
3. ⚠️ **THE WINDOW OF 64 IS FITTED TO PIECES, NOT TO AN EVENING.** A chart is 30
   to 80 chords with expansion off, so *everything so far* and *the last 64* are
   the same arm on most of the corpus. Whether a take should forget when somebody
   changes tune is not measurable on a lead sheet.
4. ⚠️ **THE TAKE'S OWN BACKOFF FLOOR OF 2 WAS NOT SWEPT.** A trigram the take has
   met twice is used and once is not, and that number was reasoned rather than
   measured.
5. ⚠️ **`MIN_CTX` AND `MIN_ROW` WERE NOT SWEPT EITHER**, only `KEEP`. The gain
   from a wider prune might be larger if fewer contexts were dropped whole.
6. ⚠️ **AND THE WHOLE OF "DRY" IS STILL UNTOUCHED**, which section 12.2 calls
   probably the larger half of the complaint.
