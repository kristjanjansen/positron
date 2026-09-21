# Finding this desk's instruments in what a speech model actually heard

> **The ask**, 2026-09-21: *"do a comprehensive rig testing on get good
> lookups"*, about `demo/shell/instruments.mjs`'s `resolve(text)`.
>
> 🔴 **WHY IT WAS ASKED: THE MODULE WORKED ON THE HANDFUL OF CASES ITS AUTHOR
> INVENTED, AND NOBODY HAD SHOWN IT WHAT A SPEECH MODEL REALLY PRODUCES.** Its
> positives were made up and so were its negative controls. 23 asserts, all of
> them graded against strings somebody typed while imagining a microphone.
>
> ✅ **NOW MEASURED AGAINST 144 REAL TRANSCRIPTS.** 48 spoken instructions, six
> voices, three Whisper models on Workers AI, one call each. **Final: recall
> 141 of 144, precision 168 of 168, and all 48 of the instructions that name
> nothing resolve to nothing on all three models.** Six changes, each with a
> negative control, each broken on purpose to prove the control fires.

---

## 1. Why this exists at all, in one paragraph

`/wish/` was told *"connect evolution to circuit"* and answered *the model
proposed nothing*. **It was right.** CoreMIDI calls that port `MK-425C USB MIDI
Keyboard`, and the maker, **Evolution**, was in none of the strings anything had
been given. The taxonomy in `demo/shell/instruments.mjs` fixed the vocabulary.
`resolve()` is the second half: it is meant to survive the transcription being
imperfect on top of a vocabulary that is now right.

⚠️ **THE COSTS ARE NOT SYMMETRIC AND THAT DECIDES EVERY TRADE BELOW.** A false
negative makes the model answer *nothing on this desk*, which a person fixes by
editing one word in a box. A false positive puts words in somebody's mouth and
routes an instrument they never named. **Where precision and recall traded,
precision was kept**, and two loosenings that would have bought recall were
refused on measured evidence rather than on caution.

---

## 2. The corpus, designed before any model was called

🔴 **THE PHRASE LIST WAS WRITTEN AND FROZEN BEFORE THE FIRST CALL**, so it is not
tuned to what the models happened to get right. 48 instructions, every one a
thing a person could say at this desk.

| group | how many | what it covers |
|---|---|---|
| by brand | 4 | `evolution`, `novation`, `tascam`, `m audio`, `apple` |
| by model | 5 | `mk four twenty five c` said out loud, `model twelve`, `fast track pro`, `i a c driver`, and the Circuit Tracks which is NOT on the desk |
| by kind | 7 | `keyboard`, `synth`, `drum machine`, `mixer`, `soundcard`, `groovebox`, `controller`, `virtual bus`, `desk` |
| by the full name | 6 | `evolution m k four twenty five c`, `tascam model twelve`, `m audio fast track pro`, `novation circuit`, `apple i a c driver`, `tascam model twelve daw control` |
| two or three instruments in one sentence | 6 | including one three way, and one routed through the IAC bus |
| a bare name with no sentence round it | 4 | `circuit`, `tascam`, `fast track`, `m k four twenty five c` |
| 🔴 **names NO instrument** | **16** | `make it louder`, `stop everything`, `put the mod wheel on the filter`, `transpose it up one octave`, `set the tempo to one hundred and twenty`, `play a chord and hold it down`, `route it to the thing and then send it back`, and nine more |

🔴 **SIXTEEN OF FORTY EIGHT NAME NOTHING, WHICH IS A THIRD OF THE CORPUS ON
PURPOSE.** Precision is what this matcher is calibrated for, so the silences
have to outnumber any single positive category.

### 2.1 Six voices, because one accent flatters or damns for the wrong reason

⚠️ **SEVERAL VOICES MATTER MORE THAN MANY PHRASINGS OF ONE SENTENCE.** The
voices were assigned round robin by corpus index rather than chosen per phrase,
so no phrase got a voice that suited it.

| voice | accent | recall pooled over the three models |
|---|---|---|
| Daniel | en_GB | 29/30 |
| Samantha | en_US | 24/24 |
| Karen | en_AU | 20/21 |
| Moira | en_IE | 21/21 |
| Tessa | en_ZA | 27/27 |
| Rishi | en_IN | 20/21 |

🔴 **AND THERE IS NO ESTONIAN VOICE ON THIS MACHINE, WHICH IS MEASURED RATHER
THAN ASSUMED.** `say -v '?'` lists **zero** `et_` voices, so the Estonian
question `research/cf-models-speech-to-patch-2026-09-21.md` §7.1 left open is
still open and cannot be closed from this laptop. It needs a person saying a
patch instruction out loud.

⚠️ **SYNTHETIC SPEECH IS NOT A VOICE IN A ROOM.** Nothing here says what happens
when somebody talks over a synth. What it does say is what a clean utterance
turns into, which is the floor rather than the ceiling of the difficulty.

### 2.2 How the audio was made and why webm/opus

`say -v <voice> -o x.aiff "<text>"`, then ffmpeg to **48 kHz mono libopus in
webm at 32 kbit/s**, which is what `MediaRecorder` produces in a browser and
what §7.1 of the earlier document measured going straight into the turbo model.
**48 recordings, 102.4 s of speech, 459 KiB, shortest 0.63 s, longest 4.83 s.**
None came out suspiciously short or silent, which was checked before a single
paid call was made.

---

## 3. What it cost

| | |
|---|---|
| calls made | **144**, being 48 phrases by 3 models, **one call each** |
| duplicates paid for | **0**. Three shape probes were seeded into the cache and reused |
| failures | **0** |
| audio sent | 102.4 s per model, **307.2 s** in total |
| priced share | `whisper-large-v3-turbo` at $0.000513 an audio minute is **$0.00088** |
| unpriced share | `@cf/openai/whisper` and `@cf/openai/whisper-tiny-en` publish no per minute price on their model pages, so the other two thirds of the audio cannot be costed from Cloudflare's own figures |

🔴 **EVERY TRANSCRIPT IS CACHED TO A FILE KEYED BY MODEL AND PHRASE**, written
after each call, so a crash loses nothing and re-running the scorer costs
nothing. The tuning below was run seven times against the same 144 transcripts
and spent nothing after the first pass.

⚠️ **THE STALE MODULE TRAP DID NOT APPLY HERE AND IT IS WORTH SAYING WHY.**
`demo/wish-local.mjs` imports `workers/wish/src/wish.mjs` once at startup, and
it has served a stale copy twice in one day. `POST /hear` touches neither the
taxonomy nor `resolve()`: it shapes a payload and calls Whisper. So the agent
being stale could not have coloured a transcript, and all three model shapes
were confirmed working with one call each before the run.

---

## 4. The measurement, and how it is scored

- **A required instrument is a GROUP**, because a brand can name two rows
  honestly. `tascam` names both the Model 12 and its DAW control surface, so
  either satisfies the group. 48 phrases carry **48 required instruments**.
- **A hit inside a required group is a true positive.** A hit on an explicitly
  tolerated reading is neither right nor wrong and is excluded from both. Two
  such readings exist in the whole corpus, both on `is the circuit tracks
  plugged in`, which is genuinely ambiguous: the Circuit Tracks is not on this
  desk, and the word `circuit` really is in the sentence.
- **Everything else a hit lands on is a false positive**, quoted in full in §5.
- **recall** = required instruments found. **precision** = true positives over
  true positives plus false positives.

### 4.1 Before, which is the state the module was in this morning

| model | recall | precision | of the 16 that name nothing |
|---|---|---|---|
| `whisper-large-v3-turbo` | 44/48, **91.7%** | 53/58, **91.4%** | **15 of 16 silent** |
| `@cf/openai/whisper` | 43/48, **89.6%** | 53/58, **91.4%** | **15 of 16 silent** |
| `@cf/openai/whisper-tiny-en` | 46/48, **95.8%** | 56/59, **94.9%** | 16 of 16 silent |
| **pooled** | **133/144** | **162/175, 13 false positives** | **46 of 48** |

### 4.2 After

| model | recall | precision | of the 16 that name nothing |
|---|---|---|---|
| `whisper-large-v3-turbo` | 47/48, **97.9%** | 56/56, **100%** | **16 of 16 silent** |
| `@cf/openai/whisper` | 47/48, **97.9%** | 57/57, **100%** | **16 of 16 silent** |
| `@cf/openai/whisper-tiny-en` | 47/48, **97.9%** | 56/56, **100%** | **16 of 16 silent** |
| **pooled** | **141/144, 97.9%** | **168/168, zero false positives** | **48 of 48** |

🟢 **ALL THREE MODELS LAND ON THE SAME RECALL, WHICH IS NOT WHAT I EXPECTED.**
The three transcribe very differently and the matcher flattens the difference:
what survives is three residual failures, one per model, and no two are the same
failure.

### 4.3 How much work the sound branch is actually doing

| model | median latency | p95 | transcripts word for word | instruments found EXACTLY | instruments found by SOUND |
|---|---|---|---|---|---|
| `whisper-large-v3-turbo` | **1241 ms** | 3107 ms | **30/48** | 50 | **8** |
| `@cf/openai/whisper` | **1111 ms** | 5706 ms | 23/48 | 46 | **13** |
| `@cf/openai/whisper-tiny-en` | **952 ms** | 1763 ms | 22/48 | 45 | **13** |

🔴 **THIS IS THE NUMBER THAT SAYS WHETHER `resolve()` EARNS ITS PLACE: BETWEEN
14 AND 22 PER CENT OF EVERY INSTRUMENT FOUND ARRIVED THROUGH A MIS-HEARING.**
Without the sound branch, one instrument in five or six is lost on the two
smaller models and one in seven on the best of them. That is not an edge case,
it is a fifth of the traffic.

⚠️ **AND THE BEST TRANSCRIBER IS NOT THE FASTEST.** `tiny-en` has the lowest
median and by far the tightest p95, and gets the fewest sentences word for word.
`whisper` has the worst tail by a factor of three. On this evidence the turbo
model is the right default and the matcher is what makes the cheap ones usable.

---

## 5. Every false positive, quoted with the transcript that caused it

🔴 **A TABLE OF COUNTS WITH NO EXAMPLES IS NOT A REPORT.** All 13 of the
baseline false positives, in full. Every one is a real string a real model
returned.

### 5.1 `card` and `chord` both reduce to `krt`, four instances

| heard | resolved to | how |
|---|---|---|
| `"The sound card is on channel 1."` (turbo, whisper, tiny-en) | **Evolution MK-425C** | sound, 1 edit, `card` against `keyboard` |
| `"The sound card is on channel 1."` (turbo, whisper, tiny-en) | **Novation Circuit** | sound, 1 edit, `card` against `Circuit` |
| `"Play a chord and hold it down."` (turbo, whisper) | **Evolution MK-425C** | sound, 1 edit, `chord` against `keyboard` |
| `"Play a chord and hold it down."` (turbo, whisper) | **Novation Circuit** | sound, 1 edit, `chord` against `Circuit` |

`keyboard` reduces to `kprt` and `circuit` to `krkt`, and `card` and `chord` both
reduce to the three character `krt`, one edit from each. So the instruction
*"play a chord and hold it down"*, which names nothing whatsoever, named two
instruments. ⚠️ And `the soundcard is on channel one` is a sentence that DOES
name one: the M-Audio, correctly, alongside two it does not.

### 5.2 `control` against `controller`, three instances and one per model

| heard | resolved to | how |
|---|---|---|
| `"The Tascam Model 12 door control does nothing at all."` (turbo) | **Evolution MK-425C** | sound, 1 edit, `control` against `controller` |
| `"The Tuscan Model 12 door control does nothing at all."` (whisper) | **Evolution MK-425C** | sound, 1 edit, `control` against `controller` |
| `" The task and model 12 dock control does nothing at all."` (tiny-en) | **Evolution MK-425C** | sound, 1 edit, `control` against `controller` |

🔴 **A SENTENCE ABOUT THE MIXER'S CONTROL SURFACE NAMED THE KEYBOARD, ON ALL
THREE MODELS.** `control` is in this desk's vocabulary twice: it is the tail of
the TASCAM Model 12 DAW control's name and the head of the Evolution's alias
`controller`. That is what makes it dangerous rather than merely common.

### 5.3 Three more that no recording in the corpus could have found

⚠️ **THESE WERE FOUND BY SWEEPING 132 ORDINARY STUDIO PHRASES, NOT BY A
TRANSCRIPT, AND THAT DISTINCTION IS THE POINT.** A corpus of 48 sentences cannot
detect a false positive for a word it does not contain, so the recorded
measurement was followed by an adversarial half over vocabulary nobody spoke.
These are not transcripts and are not presented as any.

| phrase | resolved to | how |
|---|---|---|
| `the master bus` | **Apple IAC Driver** | exact, on `bus` |
| `a bus compressor` | **Apple IAC Driver** | exact, on `bus` |
| `a controlled sound` | **Evolution MK-425C** | sound, 1 edit, `controlled` against `controller` |

🔴 **THE `bus` PAIR IS THE WORST SHAPE OF THE THREE, BECAUSE IT IS EXACT.** No
threshold, no phonetic key and no floor can reach an exact match. `bus` is the
IAC Driver's kind and it is also the commonest noun in mixing. The sound floor
had already refused it (`ps`, two characters), so the module's own comment naming
`bus` as ordinary English was true of one branch and not of the other.

⚠️ **AND `a controlled sound` IS THIS PROJECT'S SUBSTRING LESSON ARRIVING FROM
THE OPPOSITE END.** `control` and `controls` had just been added to the stop
list, which felt like enumerating the word. There are four inflections.

---

## 6. The six changes, and the negative control each one bought

Each row was applied on its own and the whole corpus re-scored before the next.

| step | change | direction | pooled recall | pooled precision |
|---|---|---|---|---|
| 0 | as it was this morning | | 133/144 | 162/175, **13 FP** |
| 1 | the `sounds()` floor applies to what was SAID, not only to the key | tighten | 129/144 | 158/161, **3 FP** |
| 2 | the comparison window runs from one token to two past the key | **loosen** | 136/144 | 164/167, **3 FP** |
| 3 | `control` and its inflections join the stop list | tighten | 136/144 | 164/164, **0 FP** |
| 4 | `Fast Track` joins the M-Audio's aliases | data | 140/144 | 168/168, **0 FP** |
| 5 | `bus` joins the stop list, and the EXACT branch now reads that list | tighten | 140/144 | 168/168, **0 FP** |
| 6 | a stop word vetoes a span only when it changed the sound key | **loosen** | **141/144** | **168/168, 0 FP** |

### 6.1 The floor applies to what was said, not only to the key

`MIN_SOUND_LEN` was checked against the entry's key and never against the spoken
span. A three character sound key is too little information for one edit to mean
anything whichever side of the comparison it sits on.

- **Kills**: all four of §5.1.
- **Negative control added**: *"card" and "chord" reach neither the keyboard nor
  the Circuit*, which requires `The sound card is on channel 1.` to resolve to
  **exactly one** instrument and that one to be the M-Audio, and requires `Play a
  chord and hold it down.` to be silent. Both halves matter: a matcher that had
  simply stopped matching would pass the second and fail the first.
- **Cost, stated rather than hidden**: it took recall from 133 to 129 before the
  next step recovered it. Two of the four losses were the window bug below and
  two were real. It is why steps 1 and 2 belong together.

### 6.2 The window runs from one token, and this is a loosening

🔴 **THE WINDOW WIDTH WAS DERIVED FROM THE KEY'S TOKEN COUNT, AND A SPEECH MODEL
JOINS AND SPLITS IN BOTH DIRECTIONS BY MORE THAN ONE.**

- `m k four twenty five c`, six spoken tokens, came back as **`MK425C`**, one
  token, from all three models. The key `mk 425 c` is three tokens, so no window
  of three or four could ever contain it. **The keyboard was missed on every
  model, twice each.**
- `groovebox`, one token, came back from turbo as **`Groover box`** and from
  whisper as **`groove a box`**, three tokens. The same arithmetic missed it from
  the other side.

- **Buys**: `MK425C` on three models, `MK425 C` on one, `Groover box` on one.
- **Negative control added**: *a one token window opens none of the near
  misses*, over seven ordinary phrases chosen because they are exactly where a
  wider window would show up if it opened anything: `grab the fader`, `group the
  channels`, `the disk is full`, `copper wire on the jack`, `a task for later`,
  `a grip on it`, `the tusk`.
- **Priced**: it changed the answer on **0 of 132** ordinary studio phrases.

### 6.3 The whole `control` family in the stop list

- **Kills**: all three of §5.2 and `a controlled sound` from §5.3.
- **Negative control added**: *no form of "control" reaches the keyboard, and
  "controller" still does*, over four inflected phrases plus the positive half.
  🔴 **THE POSITIVE HALF IS WHAT MAKES IT A CONTROL RATHER THAN A DELETION**:
  `The controller has 25 keys on it` still finds the Evolution, because the exact
  branch never consults the stop list, so stopping the word costs nothing.

### 6.4 `Fast Track` on the desk, which is a data change

🔴 **THE WORD `Pro` IS THE ONE A SPEECH MODEL DROPS.** Four misses across three
models, all the same syllable:

| said | heard | model |
|---|---|---|
| `fast track` | `"Fast Track"` | turbo and whisper |
| `fast track` | `" Fast-trap."` | tiny-en |
| `the fast track pro is the recording input` | `"The fast track row is the recording input."` | whisper |

`Fast Track` is also what M-Audio calls the line, and there is exactly one of
them on this desk, so somebody saying it means this box. **This is data, not a
threshold**, which is the module's own rule about itself.

- **Negative control added**: *"fast track" names the soundcard and "fast" and
  "track" alone do not*, over `fast forward`, `the first take`, `the track is
  long`, `a fast one`, `arm the track`, `a click track`.

### 6.5 `bus`, and the exact branch reading the stop list

Two changes in one step because neither works alone. `bus` goes on the stop list,
and the exact branch now refuses an alias **whose whole normalised form is a
single stop word**.

⚠️ **THE TEST IS THE WHOLE ALIAS AND NOT A TOKEN INSIDE IT**, which is what keeps
`virtual bus`, `mackie control` and `Model 12 DAW control` untouched. Only the
bare word goes.

- **Kills**: `the master bus` and `a bus compressor` from §5.3.
- **Negative control added**: *a bare "bus" names nothing, and "virtual bus"
  still names the IAC Driver*, over four mixing phrases plus the positive.
- ⚠️ **TWO SABOTAGES FIRE ON THIS ONE ASSERT**, removing `bus` from the list and
  removing the exact branch's guard, which is correct: either half alone does
  nothing and the assert is about the effect rather than about the mechanism.

### 6.6 A stop word vetoes a span only when it changed the sound key

🔴 **THIS IS THE ONE WORTH READING, BECAUSE THE OBVIOUS REPAIR IS WRONG AND THE
MEASUREMENT SAYS SO.**

`groove a box` is a perfect match for `groovebox`: both reduce to `jrpx`, because
`sounds()` deletes a vowel anywhere but the first character, so the inserted `a`
is **not in the key being compared at all**. The whole span veto was refusing a
distance zero match on the strength of a letter nothing was looking at.

The obvious fix is to drop the stop words and compare what is left. **Measured,
that resolves `crack the gate open` to the Novation Circuit at distance zero**,
because `crack gate` reduces to `krkt` and so does `circuit`. A noise gate is
ordinary studio English and distance zero is the strongest evidence this matcher
can produce, so the obvious fix trades one recovered instrument for a confident
false positive on a real phrase.

✅ **THE SHIPPED FORM IS A TEST RATHER THAN A HEURISTIC.** Take the stop words
out: if the key is the **same string**, they added nothing and cannot be what
matched, so the veto has nothing to protect. If the key **changes**, they were
part of it and the span goes. `groove a box` and `groove box` are both `jrpx`, so
it passes. `crack the gate` is `krktkt` and `crack gate` is `krkt`, so it is
refused.

| | recovers | ordinary phrases it changes the answer on |
|---|---|---|
| drop the stop words and compare the rest | 1 | **1 of 132, and wrongly** |
| **require the key to be unchanged** | **1** | **0 of 132** |

- **Negative control added**: *an ignored stop word must change nothing, so
  "crack the gate" stays silent*, asserting all three of `crack the gate open`
  silent, `machine from` silent (a historical false positive the module's own
  comment records) and `groove a box` finding the Circuit.

---

## 7. Two loosenings that were refused, and why the refusal is a measurement

🔴 **BOTH READ AS FREE AGAINST 48 REAL TRANSCRIPTS AND BOTH ARE EXPENSIVE.**
This is the *ask what defect this comparison could NOT detect* rule arriving in
a new place: a corpus cannot price a word it does not contain.

### 7.1 A prefix exemption to the floor. REFUSED

The idea: allow a said key under the floor when it is a **prefix** of the entry
key, on the theory that a model cutting a word short leaves a prefix (`task` for
`tascam`) where a word that merely rhymes does not (`card` and `chord`).

**On the corpus it is free and good**: recall 142/144 against 140/144, precision
171/171, zero false positives, and it recovers both `task` for `tascam` and
`groove` for `groovebox`.

🔴 **ON 95 ORDINARY PHRASES IT PUTS AN INSTRUMENT INTO 18 OF THEM.**

| phrase | it would resolve to |
|---|---|
| `grab the fader` | **Novation Circuit** (`grab` against `groovebox`) |
| `group the channels` | **Novation Circuit** |
| `a grip on it` | **Novation Circuit** |
| `groove on that` | **Novation Circuit** |
| `a groovy sound` | **Novation Circuit** |
| `the gravy train` | **Novation Circuit** |
| `a grape` | **Novation Circuit** |
| `crack the gate open` | **Novation Circuit** (`crack` against `Circuit`) |
| `take a crack at it` | **Novation Circuit** |
| `the disk is full` | **both TASCAM rows** (`disk` against `TASCAM`) |
| `put it on disk` | **both TASCAM rows** |
| `a task for later` | **both TASCAM rows** |
| `a task manager` | **both TASCAM rows** |
| `the tusk` | **both TASCAM rows** |
| `the keeper take` | **Evolution MK-425C** (`keeper` against `keyboard`) |
| `copper wire on the jack` | **Evolution MK-425C** |
| `a caper` | **Evolution MK-425C** |
| `group` | **Novation Circuit** |

⚖️ **`grab the fader` IS A SENTENCE SOMEBODY SAYS AT THIS DESK.** One recovered
instrument is not worth that, by the asymmetry in §1.

### 7.2 Dropping stop words and comparing the rest. REFUSED

Priced in §6.6. It buys the same single instrument the shipped form buys and
adds `crack the gate open` at distance zero. Strictly worse than the test that
shipped.

---

## 8. The ceiling: three transcripts no honest matcher can recover

⚠️ **A DOCUMENT THAT REPORTS THE CEILING IS WORTH MORE THAN A MATCHER TUNED
UNTIL A TABLE LOOKS GOOD.** These three are what is left of the 144, and none of
them is a defect.

| said | heard | model | why it stays unmatched |
|---|---|---|---|
| `tascam` | **`"Ask them."`** | turbo | The first consonant is gone. `ask them` reduces to `asktm` and `tascam` to `tskm`, so the first sound disagrees, and the first sound guard is bought by measured false matches. Removing it to reach this would open the whole list in §7.1 |
| `circuit` | **`"So good."`** | whisper | The word is not in the transcript in any form. `so good` reduces to `sjt`. **There is nothing to recover** |
| `the evolution plays the circuit and the tascam records it` | **`" The evolution plays the circuit and the task can record it."`** | tiny-en | `task can` reduces to `tskn`, one edit from `tskm`, and it would match. It is refused because `can` is a stop word and taking it out changes the key from `tskn` to `tsk`, which the §6.6 test correctly reads as *the stop word was part of this*. The other two instruments in the sentence are found |

🟢 **THE FIRST TWO ARE BARE ONE WORD UTTERANCES OF UNDER A SECOND**, which is
the hardest thing to give a speech model and not a shape a patch instruction
takes. The same words inside a sentence were transcribed correctly by all three
models every time.

### 8.1 And a residual class that is not about thresholds at all

The adversarial sweep leaves **12 of 132** ordinary phrases finding an
instrument, and after §6 they are all one of two shapes.

**One phonetic collision, and it is unfixable without a dictionary:**

| phrase | resolves to |
|---|---|
| `the cricket outside` | **Novation Circuit**, sound, distance **0** |

`cricket` and `circuit` both reduce to `krkt`. No threshold reaches a distance of
zero, and the module records that a **stronger** phonetic key was measured to be
worse rather than better, because `tascam` arrives as `task am` and `has come`
and a key that keeps the first letter loses those.

**Eleven exact matches on words that really are in the sentence:**

| phrase | resolves to | and it is |
|---|---|---|
| `a short circuit`, `the circuit breaker tripped`, `a printed circuit board`, `the circuit is broken`, `circuit training` | **Novation Circuit** | exact on `circuit` |
| `a computer keyboard`, `the qwerty keyboard`, `type on the keyboard` | **Evolution MK-425C** | exact on `keyboard` |
| `the desk is fine`, `a mixing desk`, `clear the desk` | **both TASCAM rows** | exact on `desk` |

🔴 **`resolve()`'S RESIDUAL ERROR IS NOT IN ITS THRESHOLDS, IT IS IN THE DESK'S
OWN VOCABULARY.** Three things here are named after ordinary English words:
Novation named a synth `Circuit`, the Evolution's kind is `keyboard`, and `desk`
was asked for as an alias for the mixer. **No name lookup without meaning can
tell `a short circuit` from `the circuit`**, and a collocation list would be a
dictionary arriving by the back door.

✅ **WHAT COVERS IT IS ALREADY THE RULE**: a model proposes and a person presses,
and `resolve()` returns `said`, `word`, `how` and `cost` on every hit so a page
can show *heard `cricket`, read as Novation Circuit* rather than silently routing
it. ⚠️ Two of the three are arguably not errors at all: `a mixing desk` at this
desk IS the Model 12.

---

## 9. What the suite says, and what breaking it on purpose says

**`node demo/shell/instruments-test.mjs`: 23 asserts before, 32 after.** Nine
new, one per change plus the two real transcript tables and the ceiling.

✅ **THE TEST NOW CARRIES 40 REAL TRANSCRIPTS**, quoted exactly, including the
leading space `whisper-tiny-en` puts on everything. 20 where a name arrived
broken and had to be recovered, 20 of instructions naming nothing which must all
stay silent. That is what replaces the invented cases.

🔴 **AND EVERY ONE OF THE SEVEN SABOTAGES GOES RED, WHICH IS THE HALF THAT MAKES
ANY OF THIS WORTH READING.** Each undoes exactly one change, on a copy, and
nothing is written to the repository.

| sabotage | result | what noticed |
|---|---|---|
| as shipped | **32 ok, 0 failed** | |
| remove the floor on what was said | **28 ok, 4 failed** | the card and chord control, the quiet transcripts (`Play a chord` finds two instruments), the near misses (**seven of seven** light up), and the stop exemption control |
| remove the `control` family from the stop list | 31 ok, **1 failed** | the control assert, naming the Evolution in the DAW sentence and three live inflections |
| remove `bus` from the stop list | 31 ok, **1 failed** | the bus assert, with all four mixing phrases resolving |
| remove the exact branch's stop check | 31 ok, **1 failed** | the same assert, same four phrases. Either half alone does nothing |
| narrow the window back to the key's own width | 30 ok, **2 failed** | the real transcript table, naming `MK425C` twice and `groove a box`; and the stop exemption control |
| remove the `Fast Track` alias | 30 ok, **2 failed** | the real transcript table, naming `fast track row` and `Fast-trap`; and the fast track assert |
| replace the stop exemption with the obvious looser form | 29 ok, **3 failed** | the stop exemption control (`crack the gate` resolving), the near misses (four of seven), and the control assert (`the control room`) |

⚠️ **ONE ASSERT'S FAILURE MESSAGE WAS WRONG AND THE SABOTAGE IS WHAT FOUND IT.**
Under the window sabotage the stop exemption assert failed on its `groove a box`
half while printing only the two silent halves, which sends a reader to the wrong
change. The detail names all three now. **A check whose failure message does not
say what failed is a check that costs time.**

### 9.1 The one page that reads this module

`demo/bay/index.html` is the only live importer and it imports `describe()`
only. **`node demo/verify.mjs bay` is 44/44 green**, unchanged. No page uses
`resolve()` yet.

---

## 10. What could not be settled

- 🔴 **ESTONIAN.** There is no `et_` voice on this machine, measured. Whisper is
  multilingual and takes a `language` parameter and **nothing here has heard it
  speak Estonian**. The failure mode is not a refusal, it is a plausible English
  sentence that means something else, and this desk is in Tallinn.
- 🔴 **A VOICE IN A ROOM.** Every one of the 144 transcripts is clean synthetic
  speech with no synth playing behind it. `vad_filter` is on for the turbo model
  and off for the other two, because those take no options at all, and what that
  is worth is unmeasured. This is the floor of the difficulty, not the ceiling.
- ⚠️ **THE TWO TASCAM ROWS CANNOT BE TOLD APART WHEN `daw` IS MANGLED, AND ALL
  THREE MODELS MANGLED IT.** `daw` came back as **`DOM`**, **`download`**,
  **`door`** and **`dock`**. `the tascam model twelve daw control does nothing at
  all` is scored as found only because `TASCAM` and `Model 12` are shared by both
  rows, so both are returned and the page cannot say which was meant. Whether
  that matters depends on what `/wish/` does with two hits, which is not this
  module's decision.
- ⚠️ **`is the circuit tracks plugged in` HAS NO RIGHT ANSWER HERE.** The Circuit
  Tracks is `present: false` and is correctly never offered, and `circuit` really
  is in the sentence, so the Circuit is returned. Scored as tolerated on all
  three models. A page could say *the Circuit Tracks is not on this desk*, which
  is a `/wish/` decision and not a matcher one.
- ⚠️ **THE 132 PHRASE ADVERSARIAL SWEEP IS WRITTEN BY HAND AND IS NOT A CORPUS.**
  It priced two loosenings and found three false positives, and the next word
  nobody thought of is the next false positive. The recorded 144 are the
  measurement; the sweep is a net, and a net has holes in exactly the shape of
  what its author did not imagine.
- ⚖️ **NOTHING HERE MEASURES WHAT HAPPENS AFTER `resolve()`.** The language model
  turning a sentence into a patch was measured on 2026-09-21 in
  `research/cf-models-speech-to-patch-2026-09-21.md` §7 and its finding stands:
  well formed patches aimed at the wrong instrument, which no validator can
  catch. A better lookup makes that failure more likely to be about the right
  instruments and does not remove it.

## 11. How to reproduce it without paying again

The 144 transcripts are cached as JSON keyed by model and phrase id, alongside
the corpus, the synthesiser, the scorer, the variant prices, the 132 phrase
sweep and the sabotage runner, in this session's scratchpad. **The full table is
§12 below, so the evidence survives without the cache.** Re-scoring, re-tuning
and re-sabotaging all read the transcripts and cost nothing; only a change to
the phrase list or the voices spends anything.

---

## 12. All 144 transcripts

`Evo` is the Evolution MK-425C, `Circuit` the Novation Circuit, `M12` the TASCAM
Model 12, `M12-DAW` its DAW control surface, `FTP` the M-Audio Fast Track Pro and
`IAC` the Apple IAC Driver. **`~n` marks a hit the SOUND branch made and its
distance**; everything else is an exact hearing. Resolved as of the six changes
in §6.

| said (voice) | model | transcript | resolved |
|---|---|---|---|
| connect the evolution to the circuit (Daniel) | turbo | Connect the evolution to the circuit. | Evo Circuit |
|  | whisper | Connect the evolution to the circuit. | Evo Circuit |
|  | tiny-en | Connect the evolution to the circuit. | Evo Circuit |
| send the novation to the tascam (Samantha) | turbo | Send the Novation to the Tascam. | Circuit M12-DAW M12 |
|  | whisper | Send the novation to the taskam. | Circuit M12-DAW~0 M12~0 |
|  | tiny-en | Send the Novation to the taskome. | Circuit M12-DAW~0 M12~0 |
| record the circuit through the m audio (Karen) | turbo | Record the circuit through the M-Audio. | Circuit FTP |
|  | whisper | Record the circuit through the M-Audio. | Circuit FTP |
|  | tiny-en | Record the circuit through the M-audio. | Circuit FTP |
| the apple bus is echoing everything back (Moira) | turbo | The Apple bus is echoing everything back. | IAC |
|  | whisper | Apple Boss is echoing everything back. | IAC |
|  | tiny-en | the apple bosses echoing everything back. | IAC |
| play the m k four twenty five c into the circuit (Tessa) | turbo | Play the MK425C into the circuit. | Evo~0 Circuit |
|  | whisper | Play the MK425C into the circuit. | Evo~0 Circuit |
|  | tiny-en | Play the MK425 C into the circuit. | Evo~0 Circuit |
| put the model twelve faders on the circuit filter (Rishi) | turbo | Put the model 12 faders on the circuit filter. | Circuit M12-DAW M12 |
|  | whisper | put the model 12 faders on the circuit filter. | Circuit M12-DAW M12 |
|  | tiny-en | put the model 12 feeders on the circuit filter. | Circuit M12-DAW M12 |
| the fast track pro is the recording input (Daniel) | turbo | The Fast Track Pro is the recording input. | FTP |
|  | whisper | The fast track row is the recording input. | FTP |
|  | tiny-en | The fast track pro is the reporting input. | FTP |
| open the i a c driver (Samantha) | turbo | Open the IOC driver. | IAC~0 |
|  | whisper | Open the IAC driver. | IAC |
|  | tiny-en | Open the ISC driver | IAC~1 |
| is the circuit tracks plugged in (Karen) | turbo | Is the circuit tracks plugged in? | Circuit |
|  | whisper | is the circuit tracks plugged in. | Circuit |
|  | tiny-en | is the circuit tracks plugged in. | Circuit |
| connect the keyboard to the synth (Moira) | turbo | Connect the keyboard to the synth. | Evo Circuit |
|  | whisper | Connect the keyboard to the synth. | Evo Circuit |
|  | tiny-en | Connect the keyboard to the synth. | Evo Circuit |
| send the drum machine to the mixer (Tessa) | turbo | Send the drum machine to the mixer. | Circuit M12-DAW M12 |
|  | whisper | Send the drum machine to the mixer. | Circuit M12-DAW M12 |
|  | tiny-en | Send the drum machine to the mixer. | Circuit M12-DAW M12 |
| the soundcard is on channel one (Rishi) | turbo | The sound card is on channel 1. | FTP~0 |
|  | whisper | The sound card is on channel 1. | FTP~0 |
|  | tiny-en | The sound card is on channel 1. | FTP~0 |
| put the groovebox through the audio interface (Daniel) | turbo | Put the Groover box through the audio interface. | M12 FTP Circuit~1 |
|  | whisper | put the groove a box through the audio interface. | Circuit~0 M12 FTP |
|  | tiny-en | put the groovabox through the audio interface. | Circuit~0 M12 FTP |
| the controller has twenty five keys on it (Samantha) | turbo | The controller has 25 keys on it | Evo |
|  | whisper | The controller has 25 keys on it. | Evo |
|  | tiny-en | The controller has 25 keys on it. | Evo |
| route the virtual bus to the loopback (Karen) | turbo | Route the Virtual Bus to the Loopback. | IAC |
|  | whisper | Route the virtual bus to the loop back. | IAC |
|  | tiny-en | route the virtual bus to the loop back. | IAC |
| the desk needs daw mode switched on (Moira) | turbo | The desk needs DOM mode switched on. | M12-DAW M12 |
|  | whisper | The desk needs download switched on. | M12-DAW M12 |
|  | tiny-en | The desk needs download switched on. | M12-DAW M12 |
| connect the evolution m k four twenty five c to the novation circuit (Tessa) | turbo | Connect the Evolution MK425C to the Novation circuit. | Evo~0 Circuit |
|  | whisper | Connect the evolution MK425C to the novation circuit. | Evo~0 Circuit |
|  | tiny-en | Connect the evolution MK425c to the Novation circuit. | Evo~0 Circuit |
| the tascam model twelve is the mixer here (Rishi) | turbo | the Tascam model 12 is the mixer here | M12-DAW M12 |
|  | whisper | the tasker model 12 is the mixer here. | M12-DAW M12 |
|  | tiny-en | The task model 12 is the mix of here. | M12-DAW M12~0 |
| use the m audio fast track pro for the recording (Daniel) | turbo | Use the M-Audio Fast Track Pro for the recording. | FTP |
|  | whisper | Use the Mordio Fast Track Pro for the recording. | FTP |
|  | tiny-en | Use the M audio fast track pro for the recording. | FTP |
| the novation circuit needs a patch change (Samantha) | turbo | The novation circuit needs a patch change. | Circuit |
|  | whisper | The novation circuit needs a patch change. | Circuit |
|  | tiny-en | The Novation circuit needs a patch change. | Circuit |
| apple i a c driver bus one please (Karen) | turbo | Apple IOC Driver Bus 1 please. | IAC~0 |
|  | whisper | Apple IOC driver bus one please. | IAC~0 |
|  | tiny-en | Apple IRC Drive-A-Buss One Please | IAC |
| the tascam model twelve daw control does nothing at all (Moira) | turbo | The Tascam Model 12 door control does nothing at all. | M12-DAW M12 |
|  | whisper | The Tuscan Model 12 door control does nothing at all. | M12-DAW M12 |
|  | tiny-en | The task and model 12 dock control does nothing at all. | M12-DAW M12 |
| connect the evolution keyboard to the novation circuit (Tessa) | turbo | Connect the Evolution keyboard to the Novation circuit. | Evo Circuit |
|  | whisper | Connect the evolution keyboard to the Novation circuit. | Evo Circuit |
|  | tiny-en | Connect the Evolution keyboard to the Notation circuit. | Evo Circuit |
| route the circuit into the fast track pro and record it (Rishi) | turbo | Route the circuit into the Fast Track Pro and record it. | Circuit FTP |
|  | whisper | route the circuit into the fast track pro and record it. | Circuit FTP |
|  | tiny-en | route the circuit into the fast track pro and record it. | Circuit FTP |
| send the keyboard through the i a c driver to the circuit (Daniel) | turbo | Send the keyboard through the IRC driver to the circuit. | Evo Circuit IAC~1 |
|  | whisper | Send the keyboard through the IOC driver to the circuit. | Evo Circuit IAC~0 |
|  | tiny-en | Send the keyboard through the ILC driver to the circuit. | Evo Circuit IAC~1 |
| put the model twelve and the fast track pro on separate channels (Samantha) | turbo | Put the Model 12 and the Fast Track Pro on separate channels. | M12-DAW M12 FTP |
|  | whisper | Put the Model 12 in the Fast Track Pro on separate channels. | M12-DAW M12 FTP |
|  | tiny-en | put the Model 12 in the Fast Track Pro on separate channels. | M12-DAW M12 FTP |
| the evolution plays the circuit and the tascam records it (Karen) | turbo | The evolution plays the circuit and the TASCAM records it. | Evo Circuit M12-DAW M12 |
|  | whisper | The evolution plays the circuit and the taskham records it. | Evo Circuit M12-DAW~0 M12~0 |
|  | tiny-en | The evolution plays the circuit and the task can record it. | Evo Circuit |
| take the drum machine off the mixer (Moira) | turbo | Take the drum machine off the mixer. | Circuit M12-DAW M12 |
|  | whisper | Take the drum machine off the mixer. | Circuit M12-DAW M12 |
|  | tiny-en | Take the drum machine off the mixer. | Circuit M12-DAW M12 |
| m k four twenty five c (Tessa) | turbo | MK425C | Evo~0 |
|  | whisper | MK425C | Evo~0 |
|  | tiny-en | MK425C | Evo~0 |
| circuit (Rishi) | turbo | circuit | Circuit |
|  | whisper | So good. | nothing |
|  | tiny-en | Circuit | Circuit |
| tascam (Daniel) | turbo | Ask them. | nothing |
|  | whisper | test them. | M12-DAW~1 M12~1 |
|  | tiny-en | Taspim | M12-DAW~1 M12~1 |
| fast track (Samantha) | turbo | Fast Track | FTP |
|  | whisper | Fast Track | FTP |
|  | tiny-en | Fast-trap. | FTP~1 |
| make it louder (Karen) | turbo | Make it louder. | nothing |
|  | whisper | Make it louder. | nothing |
|  | tiny-en | Make it louder. | nothing |
| stop everything (Moira) | turbo | Stop everything. | nothing |
|  | whisper | Stop everything. | nothing |
|  | tiny-en | Stop Everything. | nothing |
| put the mod wheel on the filter (Tessa) | turbo | Put the mod wheel on the filter | nothing |
|  | whisper | Put the mod wheel on the filter. | nothing |
|  | tiny-en | put the mod wheel on the filter. | nothing |
| can you make it a bit louder please (Rishi) | turbo | Can you make it a bit louder please? | nothing |
|  | whisper | Can you make it a bit louder please? | nothing |
|  | tiny-en | Can you make it a bit louder, please? | nothing |
| turn the reverb down a little (Daniel) | turbo | Turn the reverb down a little. | nothing |
|  | whisper | Turn the reverb down a little. | nothing |
|  | tiny-en | Turn the river down a little. | nothing |
| start the recording now (Samantha) | turbo | Start the recording now. | nothing |
|  | whisper | Start the recording now. | nothing |
|  | tiny-en | Start the recording now. | nothing |
| clear all the connections (Karen) | turbo | Clear all the connections. | nothing |
|  | whisper | Clear all the connections. | nothing |
|  | tiny-en | Clear all the connections. | nothing |
| transpose it up one octave (Moira) | turbo | Transpose it up one octave. | nothing |
|  | whisper | transpose it up one octave. | nothing |
|  | tiny-en | transpose it up one octave | nothing |
| what is connected right now (Tessa) | turbo | What is connected right now? | nothing |
|  | whisper | What is connected right now? | nothing |
|  | tiny-en | What is connected right now? | nothing |
| mute the second channel (Rishi) | turbo | Mute the second channel | nothing |
|  | whisper | mute the second channel. | nothing |
|  | tiny-en | Mute the second channel. | nothing |
| set the tempo to one hundred and twenty (Daniel) | turbo | Set the tempo to 120. | nothing |
|  | whisper | Set the tempo to 120. | nothing |
|  | tiny-en | Set the tempo to 120. | nothing |
| play a chord and hold it down (Samantha) | turbo | Play a chord and hold it down. | nothing |
|  | whisper | Play a chord and hold it down. | nothing |
|  | tiny-en | Play Accord and hold it down. | nothing |
| route it to the thing and then send it back (Karen) | turbo | Root it to the thing and then send it back. | nothing |
|  | whisper | route it to the thing and then send it back. | nothing |
|  | tiny-en | route it to the thing and then send it back. | nothing |
| give me a bit more bass in the monitors (Moira) | turbo | Give me a bit more bass in the monitors. | nothing |
|  | whisper | Give me a bit more base in the monitors. | nothing |
|  | tiny-en | Give me a bit more bass in the monitors. | nothing |
| disconnect everything and start again (Tessa) | turbo | disconnect everything and start again | nothing |
|  | whisper | disconnect everything and start again. | nothing |
|  | tiny-en | disconnect everything and start again. | nothing |
| send a program change on channel ten (Rishi) | turbo | Send a program change on channel 10. | nothing |
|  | whisper | Send a program change on Channel 10. | nothing |
|  | tiny-en | Send a program change on channel 10. | nothing |
