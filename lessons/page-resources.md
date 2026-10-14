# Page comments: resources

The full comments cut from the code under demo/ for resources, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="resources-1"></a>
## resources-1: demo/resources/build-icons.mjs, module, line 1

````js
// demo/resources/build-icons.mjs, writes demo/shell/icons.mjs from the Feather
// set as Iconify publishes it.
//
//   node demo/resources/build-icons.mjs                     # fetch the pinned package from npm, then write
//   node demo/resources/build-icons.mjs path/to/icons.json  # write from a copy already on disk
//
// NODE ONLY, AND IT IS THE ONLY THING THAT EVER ASKS NPM. Asked 2026-10-10:
// *"see ../eccm icon system. We need one from icones. Make a sample sheet in
// one of kit pages called icons."* eccm picked Feather on 2026-10-02 over six
// other sets (eccm `archive/icon-sets.md`) and vendors it into one sprite with
// `tools/feather.mjs`; positron uses the same set and vendors it too, as a
// plain ES module, because pages here import `/shell/*.mjs` with no bundler
// and a page must not ask the Iconify API, or anybody else's server, for a
// picture at visit time.
//
// ⚠️ TO ADD AN ICON: find its Feather name on https://icones.js.org/collection/feather,
// add `[positron name, feather name]` to a group below, run this, and add the
// name to nothing else. `/kit/icons/` draws every name in `NAMES`.
// ⚠️ WHAT CHANGES FROM THE PUBLISHED BODY, AND IT IS ONLY PAINT: every
// `fill`, `stroke`, `stroke-width`, `stroke-linecap` and `stroke-linejoin` is
// taken off the shapes and a `<g>` wrapper Iconify adds to carry them is
// unwrapped, so `icon()` sets them once on the `<svg>` and a caller can change
// the weight. The geometry is Feather's, untouched (eccm squares Feather's
// small corners for a site with no radius; positron's controls are rounded at
// 4 px, so the corners stay).
// ⚠️ TWO NAMES MAY NOT SHARE ONE FEATHER ICON. A second name for the same
// picture is a synonym the reader of the sheet cannot tell apart, so this
// throws, and `/kit/icons/` asserts the bodies are all different.
````

<a id="resources-2"></a>
## resources-2: demo/resources/chord-e2-position.mjs, module, line 1

````js
// EXPERIMENT 2. "Not moving anywhere": is position in the form real signal, and
// is it being discarded?
//
// `demo/resources/chord-corpus.mjs` reads a jazz chord with
// `/^[0-9.]+(.*)$/` and keeps only group 1's TAIL, so the Humdrum recip
// duration that starts every line is dropped at the first regex. Sections are
// read for the expansion order and then flattened. This re-parses keeping both.
````

<a id="resources-3"></a>
## resources-3: demo/resources/chord-e5-vibe.mjs, module, line 1

````js
// EXPERIMENT 5. "figure out my playing pattern ... move on with in my vibe".
// Two questions, both answerable off the cached corpus and neither of them
// answerable by reasoning.
//
//  A. Is a person's OWN harmonic habit a real, learnable thing, or noise?
//     iRb names a composer on every chart. 51 of them have 5 charts or more,
//     643 charts in all. Leave one chart out, and ask whether that composer's
//     OTHER charts predict it better than the world does.
//  B. How much playing is enough? Adapt on the first N chords of a piece and
//     predict the rest, sweeping N.
````

<a id="resources-4"></a>
## resources-4: demo/resources/chord-e5b-noexpand.mjs, module, line 1

````js
// EXPERIMENT 5. "figure out my playing pattern ... move on with in my vibe".
// Two questions, both answerable off the cached corpus and neither of them
// answerable by reasoning.
//
//  A. Is a person's OWN harmonic habit a real, learnable thing, or noise?
//     iRb names a composer on every chart. 51 of them have 5 charts or more,
//     643 charts in all. Leave one chart out, and ask whether that composer's
//     OTHER charts predict it better than the world does.
//  B. How much playing is enough? Adapt on the first N chords of a piece and
//     predict the rest, sweeping N.
````

<a id="resources-5"></a>
## resources-5: demo/resources/replay-nola-take.mjs, module, line 1

````js
// demo/resources/replay-nola-take.mjs. Play a recorded take back through the
// real recogniser, at every candidate setting, and see what would be learned.
//
//   node demo/resources/replay-nola-take.mjs ~/Downloads/nola-take-*.json
//
// 🔴 THE POINT IS THAT THE TAKE IS THE WIRE AND NOT A CONCLUSION. `read-nola-
// take.mjs` says what the hands did; this says what the PAGE would have made of
// it, using `demo/shell/name.mjs` itself rather than a copy of its arithmetic,
// so a setting can be chosen against real playing instead of a guess.
// ⚠️ AND IT SWEEPS RATHER THAN SCORES. There is no right answer to compare
// against, because nobody wrote down what they meant to play. What it can show
// is how violently the output moves with each knob, and a knob that changes
// everything is a knob nobody should be guessing.
````

<a id="resources-6"></a>
## resources-6: demo/resources/fetch-salamander.mjs, module, line 1

````js
// demo/resources/fetch-salamander.mjs. The Salamander Grand Piano for the sampler.
//
//   node demo/resources/fetch-salamander.mjs           # fetch what is missing, encode what is missing
//   node demo/resources/fetch-salamander.mjs --check   # print the state, touch nothing and nobody
//   node demo/resources/fetch-salamander.mjs --encode  # re-encode every output from tmp/, fetch nothing
//   node demo/resources/fetch-salamander.mjs --force   # re-encode even outputs that already exist
//
// Built from plans/plan-piano-samples.md (sections 1, 4, 5 and 7), which chose
// this set after measuring why the FluidR3 piano sounds metallic and thin.
//
// IT FETCHES ABOUT 185 MB FROM SOMEBODY ELSE'S GITHUB EXACTLY ONCE, AND EVERY
// LATER RUN ASKS THAT HOST FOR NOTHING. `CLAUDE.md`: *"super careful with
// external sources, better avoid"*. The sources land in `tmp/salamander/src/`,
// which is gitignored. A run that fetches says how many bytes it is about to
// ask for BEFORE it asks (the sizes are in GitHub's tree listing, cached as
// `tree.json` beside the sources), and waits a second between files.
//
// NO PAGE EVER FETCHES FROM THAT HOST. The outputs go to R2 by hand:
//   tmp/salamander/web/  -> positron-station/sampler/salamander/web/  (the browser)
//   tmp/salamander/pi/   -> positron-station/sampler/salamander/pi/   (the board)
//
// ── WHAT IT IS ──────────────────────────────────────────────────────────────
//
// Salamander Grand Piano V3 by Alexander Holm: a Yamaha C5, two AKG C414 about
// 12 cm over the strings, 16 velocity layers, 30 notes a minor third apart from
// A0 (21) to C8 (108), 48 kHz 24 bit stereo FLAC, plus 88 key-off release
// samples. The 30 notes are exactly the 30 MIDI numbers the sampler already
// uses, so the nearest-note rule does not change.
//
// FOUR OF THE SIXTEEN LAYERS, v1, v6, v11 AND v16, HARD SWITCHED. The plan's
// section 4.1: Salamander's own SFZ does not crossfade either (`Data/notes.txt`,
// 16 groups with lovel/hivel and no xfin), and four bands keep one voice per
// note.
//
// ── THE LICENCE ─────────────────────────────────────────────────────────────
//
// CC BY 3.0 in the mirror's LICENSE and on archive.org; the author's own page
// says public domain since 4.3.2022. Treated as CC BY 3.0 with credit to
// Alexander Holm, which satisfies both readings (plan section 6.1).
// `LICENSE-salamander` and `PROVENANCE-salamander.json` go in BOTH output
// folders, so each upload carries its own attribution.
//
// ── THE ENCODE ──────────────────────────────────────────────────────────────
//
// Notes: trimmed to 2 ms before the onset (the first 1 ms window reaching 1 per
// cent of the file's peak, measured on both channels), a 2 ms fade in, capped
// at 8 s with a 1.5 s fade out. A note that ends by itself before the cap gets
// an 8 ms fade at its real end instead, so the top notes keep their natural
// decay. Releases are NOT trimmed: Salamander's SFZ plays them from sample 0
// with no offset, and the key-off noise has no attack for a trim to find.
//
// Web: AAC in m4a, 96 kbps, 48 kHz, stereo, Apple's `aac_at` encoder (see
// fetch-jrhodes3d.mjs for the measured +4.1 dB overshoot of ffmpeg's own).
// Pi: FLAC 16 bit, 48 kHz, MONO, because the board's capture sums out_1 and
// out_2 anyway (`rig/board/norns/possampler-defs.scd`).
//
// Names carry the MIDI number and the band, never a `#`: `p060-v11.m4a`,
// `rel060.m4a`, `p060-v11.flac`, `rel060.flac`. Release `relN` in the source is
// key 20 + N (`Data/hammer.txt`: `key=21 sample=rel1`).
````

<a id="resources-7"></a>
## resources-7: demo/resources/chord-exp-lib.mjs, module, line 1

````js
// Shared loading for the chord experiments of 2026-09-25.
// It reuses demo/resources/chord-corpus.mjs verbatim and reproduces
// bench-chord-suggester.mjs's deterministic by-song split, so every number here
// is comparable with the ones already published in
// research/chord-suggester-benchmark-2026-09-23.md.
//
// It contacts nobody. tmp/chord-corpora/ is already on this disk.
````

<a id="resources-8"></a>
## resources-8: demo/resources/chord-exp-lib.mjs, module, line 103

````js
/**
 * 🔴 THE TABLE IN THE SHAPE THAT SHIPS, WHICH IS NOT THE SHAPE THE PLAN
 * MEASURED, AND THE DIFFERENCE IS THE WHOLE REASON THIS EXISTS.
 * `plans/plan-better-chords-2026-09-25.md` sampled over every row a context had
 * with a count of three or more. `demo/resources/chord-tables.json` keeps the
 * **top three rows only**, drops any context seen fewer than eight times, and
 * writes each probability as **one character in 89 steps**. A sampler graded on
 * the first shape and shipped against the second is a number about a table
 * nobody has.
 *
 * The three constants are read off `build-chord-tables.mjs` and are the same
 * three: `MIN_CTX 8`, `MIN_ROW 3`, `KEEP 5`, quantised over `ALPHA.length - 1`.
 * ⚠️ `KEEP` WAS 3 HERE UNTIL 2026-09-26 AND THIS DEFAULT IS THE ONE THING IN
 * THIS FILE THAT CAN GO STALE SILENTLY. It is a copy of a number that lives in
 * another file, so a prune changed there and not here would make every
 * experiment grade a shape nobody ships, which is the exact defect this function
 * was written to prevent. `chord-e6-keep.mjs` and `chord-e7-take.mjs` pass `keep`
 * explicitly for that reason; `chord-e4-generators.mjs` takes the default.
 *
 * @returns {{id, bi: Map, tri: Map, uni: Map, spell: Map, temp}} the object
 *   `useTables` hands a page, so the shipped `suggest.mjs` can be pointed
 *   straight at it.
 */
````

<a id="resources-9"></a>
## resources-9: demo/resources/chord-e7-take.mjs, module, line 1

````js
// EXPERIMENT 7. WITHIN TAKE ADAPTATION, THROUGH THE CODE THAT SHIPS.
//
//   node demo/resources/chord-e7-take.mjs
//
// 🔴 WHAT THIS IS FOR. `plans/plan-better-chords-2026-09-25.md` section 6.2
// measured the largest single gain in the whole document and nobody built it:
// adapting on the first N chords of a piece and predicting the rest is worth
// **+7.44 points of top 1 at N = 16**, where the entire step from a bigram to a
// trigram was 4.5 points and justified downloading two corpora.
//
// 🔴 AND THAT NUMBER WAS MEASURED ON FULL COUNTS, NOT ON THE TABLE THAT SHIPS.
// The same correction section 13 had to make for the temperature applies here:
// `demo/resources/chord-tables.json` keeps five rows a context, drops anything
// seen fewer than eight times and writes each probability as one character. A
// gain measured on the unpruned counts is a gain about a table nobody has. So
// every number below runs through `shipShape` and through `suggest.mjs`'s own
// `adaptRows`, `sampleRow` and `rowsFor`.
//
// 🔴 EXPANSION IS OFF, WHICH IS THE CONSERVATIVE READING AND THE ONE TO QUOTE.
// iRb writes a repeat as a repeat, and expanding it means the second half of a
// piece literally contains the first. The plan measured +10.1 with expansion on
// and +7.44 with it off, and said the difference is exactly the repetition the
// corpus adds rather than anything learned about a person.
//
// 🔴 THE SELF FEEDING ARM IS A NEGATIVE CONTROL AND NOT A VARIANT. `/nola/`
// carries a rule from a report reading *"you recorded a suggestion. why>"*, and
// a suggester that learns from its own output writes its own line and calls it
// yours. The arm named `SELF FED` below does exactly that on purpose, so the
// trap has a number instead of a warning.
//
// It contacts nobody. tmp/chord-corpora/ is already on this disk.
````

<a id="resources-10"></a>
## resources-10: demo/resources/chord-e7-take.mjs, module, line 91

````js
  /* 🔴 THREE ARMS, BECAUSE THE PLAN'S WORDS AND THE PAGE'S BEHAVIOUR ARE NOT THE
     SAME THING. The plan said *over the last sixteen to thirty two chords* and
     MEASURED the FIRST N of a piece, which is a different window, and what a page
     naturally does is neither: it accumulates everything since the take started.
     All three are here so the sentence can be checked against the number. */
````

<a id="resources-11"></a>
## resources-11: demo/resources/chord-e7-take.mjs, module, line 123

````js
  /* 🔴 THE SHIPPED DEFAULT, MEASURED AS ITS OWN ARM RATHER THAN INFERRED FROM
     THE THREE ABOVE. `mkTake` keeps the last 64 chords at weight 0.25, which is
     *everything so far* for any take shorter than 64 and a slow forget after
     that. Quoting the `all so far` column for a windowed take would be quoting an
     arm nobody runs. */
````

<a id="resources-12"></a>
## resources-12: demo/resources/chord-e7-take.mjs, module, line 191

````js
      /* 🔴 THE TAKE IS THE REAL CHORDS THAT CAME BEFORE, AND THE WALK'S OWN
         OUTPUT NEVER JOINS IT. That is both the rule and the only way this
         measurement means anything: a generator learning from itself is
         measuring its own echo. */
````

<a id="resources-13"></a>
## resources-13: demo/resources/chord-e4-generators.mjs, module, line 7

````js
/* 🔴 THE SHIPPED SAMPLER, IMPORTED RATHER THAN REPRODUCED. The four lines of a
   sampler are exactly the four lines somebody gets subtly wrong in a second
   copy, and a temperature measured here that is not the temperature the page
   draws with is a number about nothing. `rowsForShip` is `suggest.mjs`'s own
   lookup, backoff included. */
````

<a id="resources-14"></a>
## resources-14: demo/resources/chord-e4-generators.mjs, module, line 51

````js
/**
 * A path that has to ARRIVE. Beam search over the trigram for the most likely
 * sequence of `steps` chords ending on `target`. This is the only chooser here
 * that knows where it is going, which is the whole of the third complaint.
 */
````

<a id="resources-15"></a>
## resources-15: demo/resources/chord-e4-generators.mjs, module, line 153

````js
  /* ══ THE SHAPE THAT SHIPS, WHICH IS NOT THE SHAPE ABOVE ══════════════════ */
````

<a id="resources-16"></a>
## resources-16: demo/resources/chord-e4-generators.mjs, module, line 154

````js
  /* ⚠️ THE NUMBERS THIS SECTION PRINTS MOVED ON 2026-09-26 AND THE COMMENTS IN
     THIS FILE ARE FROM THE DAY BEFORE. `KEEP` went from 3 to 5 and the
     temperatures were refitted from 3.5 and 1.4 to 1.7 and 0.8, so the sweep
     below now finds its best fit in a different place. The prune sweep that
     decided it is `demo/resources/chord-e6-keep.mjs`, and the within take
     adaptation this file knows nothing about is `chord-e7-take.mjs`. */
````

<a id="resources-17"></a>
## resources-17: demo/resources/chord-e4-generators.mjs, module, line 165

````js
  /* 🔴 THE GLOBAL MAX RATE IS THE PLAN'S THIRD MEASURE AND IT IS THE ONE THAT
     SAYS *cliche* IN A NUMBER. It is how often a generator answers with the
     single commonest chord in the whole corpus, whatever was played. */
````

<a id="resources-18"></a>
## resources-18: demo/resources/chord-e4-generators.mjs, module, line 200

````js
  /* 🔴 THE SWEEP RUNS PAST 1.4 BECAUSE THE SHIPPED SHAPE NEEDS IT TO, WHICH IS
     THE FINDING RATHER THAN A SETTING. The plan swept 0.5 to 1.4 over every row
     a context had; three rows is a much narrower thing to draw from, so the same
     variety costs a much flatter dial, and a sweep that stopped at 1.4 would
     report its own last entry as the answer. `1e6` is uniform over the three and
     is the ceiling this shape has: nothing hotter can reach further. */
````

<a id="resources-19"></a>
## resources-19: demo/resources/read-nola-take.mjs, module, line 1

````js
// demo/resources/read-nola-take.mjs. What a pair of hands actually does, read
// off a take recorded on /nola/.
//
//   node demo/resources/read-nola-take.mjs ~/Downloads/nola-take-*.json
//
// 🔴 WHY THIS EXISTS. Every timing number on that page is a guess and
// `research/chord-learning-2026-09-23.md` says so in its own words: nobody
// played any of it, its session was generated, and it put a factor of ten
// between a chord held and a chord passed through BY CONSTRUCTION. Its own
// closing section names the three things only a person can settle, and this is
// the tool that settles them:
//
//   1. how long a rolled chord takes on this desk, assumed 30 to 120 ms
//   2. the gap between a chord MEANT and a chord PASSED THROUGH, assumed 10x
//   3. whether `LEARN_GATE` at 400 ms sits anywhere near that gap
//
// ⚠️ IT READS THE WIRE, NOT THE PAGE'S READING OF THE WIRE. The take is raw note
// numbers with timestamps, so a different gate can be tried against the same
// playing without anybody playing it twice. That is the whole point of keeping
// the recording rather than the page's conclusions.
// ⚠️ AND IT REPORTS DISTRIBUTIONS, NOT AVERAGES. A mean hold time over a take
// that contains both held chords and passing ones is a number describing
// neither, which is the trap the research already walked into once from the
// other side.
````

<a id="resources-20"></a>
## resources-20: demo/resources/read-nola-take.mjs, module, line 92

````js
/* 🔴 THE ONE THE RESEARCH COULD NOT SETTLE. Its synthetic session had passing
   chords under 250 ms and loop chords over 1,200, so every gate from 200 to 800
   worked. If a real take has no valley, the gate is a much harder choice and
   might not exist, and this is where that shows. */
````

<a id="resources-21"></a>
## resources-21: demo/resources/read-loop-take.mjs, module, line 1

````js
// demo/resources/read-loop-take.mjs. Does a loop keep time.
//
//   node demo/resources/read-loop-take.mjs ~/Downloads/nola-take-*.json
//
// 🔴 WHAT THE QUESTION IS. Asked 2026-09-23: *"tap. loops do not sound right
// (timings)"*. A loop is a list of movements and a lap, replayed with timers, and
// there are exactly three ways that can sound wrong:
//
//   DRIFT      every lap starts a little later than the one before, so the phrase
//              walks away from itself. The tell is that the error GROWS with the
//              lap number rather than scattering around zero.
//   JITTER     each lap starts on time but individual notes wander inside it. The
//              tell is a spread that does not grow.
//   THE WRONG LAP  the loop keeps perfect time at a length nobody played, usually
//              because the take was closed at a different moment than it felt.
//
// ⚠️ AND THEY NEED DIFFERENT REPAIRS, WHICH IS WHY THE SCRIPT SEPARATES THEM
// RATHER THAN PRINTING ONE NUMBER. Drift is a scheduling bug and is fixed in the
// code. Jitter is the platform and has a floor. A wrong lap is a capture
// question and no amount of scheduling will help it.
//
// ⚠️ IT READS `plays`, NOT `events`. `events` is what arrived on the WIRE, and a
// looped note never touches the wire, so a recording of what arrived says nothing
// about what came back. `plays` is what the page SOUNDED, with `how` saying
// whether a finger or a lap did it.
````

<a id="resources-22"></a>
## resources-22: demo/resources/read-loop-take.mjs, module, line 65

````js
/* 🔴 THE LAP IS MEASURED FROM THE SOUND, NOT READ OFF THE TAKE, or this would be
   grading the page against its own intention. Each note that came back more than
   twice gives an interval per turn; the median across all of them is what the
   loop actually ran at. */
````

<a id="resources-23"></a>
## resources-23: demo/resources/read-loop-take.mjs, module, line 108

````js
/* 🔴 THE TEST IS WHETHER THE ERROR GROWS, NOT WHETHER IT IS LARGE. A steady 6 ms
   is inaudible and a 6 ms that becomes 60 over ten turns is the phrase walking
   away. Compare the first half's mean against the last half's. */
````

<a id="resources-24"></a>
## resources-24: demo/resources/read-evo-take.mjs, module, line 1

````js
// demo/resources/read-evo-take.mjs. Is a rotary on the MK-425C smoothed.
//
//   node demo/resources/read-evo-take.mjs ~/Downloads/evo-take-*.json
//
// 🔴 WHAT THE QUESTION ACTUALLY IS. Asked 2026-09-23: *"can you detect cc
// smoothinng. tap and measure when i turn c1-c8 on evi"*. A knob is a
// potentiometer read by an ADC, and between the two there may be nothing, or a
// filter, or a rate limiter. None of the three manuals says which, because they
// describe what the knobs SEND and never how they are read.
//
// 🔴 AND IT IS ANSWERABLE OFF THE WIRE, WHICH IS THE WHOLE REASON FOR THE TAP.
// Each of the three leaves a different signature in a stream of CC messages,
// and the signatures do not overlap:
//
//   NOTHING          consecutive values jump by whatever the hand did. A fast
//                    turn skips values, and the same physical sweep produces
//                    FEWER messages when it is faster.
//   A FILTER         consecutive values step by one almost always, even on a
//                    fast turn, because the output is chasing the input rather
//                    than reporting it. The tell is that a fast sweep produces
//                    about as many messages as a slow one, and that the stream
//                    keeps arriving AFTER the hand has stopped.
//   A RATE LIMITER   messages arrive at a near constant interval whatever the
//                    hand is doing, and the step size is what varies.
//
// ⚠️ SO THE MEASUREMENT IS THREE HISTOGRAMS AND NOT ONE NUMBER: the step between
// consecutive values, the gap between consecutive messages, and how the two move
// together. A mean over a take containing both a slow sweep and a fast one
// describes neither, which is the trap this project has already paid for once on
// the chord takes.
// ⚠️ AND A TAKE WITH ONLY ONE SPEED IN IT CANNOT ANSWER THIS. The script says so
// rather than printing a confident number: what separates a filter from nothing
// is how the stream CHANGES between a slow turn and a fast one.
````

<a id="resources-25"></a>
## resources-25: demo/resources/read-evo-take.mjs, module, line 88

````js
  /* 🔴 THE READING THAT DECIDES IT: the same sweep at two speeds. A move's SPEED
     is how much value it covered per second; its DENSITY is how many messages it
     spent per unit of value. Unsmoothed, density falls as speed rises because
     the hand outruns the sampling. Filtered, density holds. */
````

<a id="resources-26"></a>
## resources-26: demo/resources/read-evo-take.mjs, module, line 111

````js
  /**
   * 🔴 A FILTER CAPS THE WIRE SPEED, AND THAT BREAKS THE OBVIOUS TEST. Found by
   * grading this script on a synthetic filtered knob before any real take
   * existed. The obvious reading is *density holds while the hand speeds up*,
   * and a filtered knob never lets the hand speed up ON THE WIRE at all: the
   * output chases the input at its own rate, so a frantic sweep and a slow one
   * arrive as the same stream and the comparison has nothing to compare.
   * ⚠️ SO A NARROW SPREAD IS THE INTERESTING CASE AND NOT THE USELESS ONE, and
   * this script cannot tell it from *you only turned at one speed*, because
   * nothing on the wire says what the hand did. Only the player knows, so it
   * says both readings and asks rather than picking one.
   */
````

<a id="resources-27"></a>
## resources-27: demo/resources/read-evo-take.mjs, module, line 144

````js
  /* ⚠️ THE OTHER TELL, AND IT IS THE ONE THAT CANNOT BE FAKED BY A FAST HAND: a
     filter goes on emitting after the hand stops, so the last messages of a move
     step by one and slow down. Nothing does that. */
````

<a id="resources-28"></a>
## resources-28: demo/resources/measure-durations.mjs, module, line 1

````js
// demo/resources/measure-durations.mjs — how long each recording actually is.
//
//   node demo/resources/measure-durations.mjs            # ask only the ones with no answer yet
//   node demo/resources/measure-durations.mjs --again    # ask every one again
//   node demo/resources/measure-durations.mjs --only ia:videoplayback-13_202304/...
//
// NODE ONLY. Writes `durations.json` beside the corpus; `build-corpus.mjs`
// reads that file and puts a `durationMs` on the matching row. It is a separate
// step for one reason: the corpus is built from seventeen catalogues and this
// asks twenty-six MEDIA FILES, which is a different kind of request to a
// different kind of host. Folding it into the build would mean re-asking
// archive.org for headers every time somebody wanted to change a date.
//
// 🔴 GENTLY, AND THAT IS THE WHOLE DESIGN OF THIS FILE RATHER THAN A SETTING IN
// IT. The ask was *"do measure file lengths gently"*, and what makes it gentle
// is measured rather than intended:
//
//   · ONE FILE AT A TIME, with `PAUSE_MS` between two of them. Nothing here is
//     in a hurry; twenty-six files at two seconds apart is under a minute.
//   · `-probesize 65536`. ffprobe reads 5 MB by default before it will say what
//     is in a container. MEASURED on the same mp3, 64 KB against the default:
//     the same duration to the microsecond, in 2.0 s rather than 2.9. For a
//     file 12 MB long that is the difference between reading a header and
//     reading half the recording.
//   · IT ASKS EACH FILE ONCE, EVER. The answer is written down and committed,
//     and a second run skips everything already in the file. A duration does
//     not change; a file that has one does not need asking again. `--again` is
//     there for a host that has replaced its media.
//
// ⚠️ A FILE THAT WOULD NOT ANSWER IS WRITTEN DOWN AS SUCH, with the reason. A
// dropped row and a row nobody asked about look identical in a finished list,
// and only one of them is a finding: `zenodo:5801697` is 225 MB of MPEG program
// stream, which carries no duration in a header at all.
````

<a id="resources-29"></a>
## resources-29: demo/resources/measure-durations.mjs, module, line 59

````js
/**
 * 🔴 WHAT COUNTS AS A RECORDING, AND IT IS THE FILENAME AS WELL AS THE HEADER.
 * `fileType` is the content-type the HOST sent, and archive.org serves an `.avi`
 * as `video/mp4` — the same trap `/tapes/` carries a comment about, which is
 * why both ends test the extension too. Here it only decides who gets ASKED, so
 * a wrong guess costs one request and no wrong data.
 */
````

<a id="resources-30"></a>
## resources-30: demo/resources/measure-durations.mjs, module, line 129

````js
    // ⚠️ WRITTEN DOWN, NOT DROPPED. `ms: null` with a reason is a measurement
    // that was made and came back empty, which is a different fact from a file
    // nobody asked about, and the page says so in its own gutter.
````

<a id="resources-31"></a>
## resources-31: demo/resources/chord-corpus.mjs, module, line 1

````js
// demo/resources/chord-corpus.mjs. Two corpora into one key-relative alphabet.
//
// Read by `demo/resources/bench-chord-suggester.mjs`, which grades suggesters,
// and by `demo/resources/build-chord-tables.mjs`, which writes the table that
// ships. It parses nothing at runtime on any page: the corpora live in
// `tmp/chord-corpora/`, gitignored, fetched once by
// `demo/resources/fetch-chord-corpora.mjs`.
//
// 🔴 THE ALPHABET IS `(DEGREE, CLASS)` AND NOT A ROMAN NUMERAL, AND THAT IS THE
// WHOLE REASON THIS CAN EXPRESS WHAT THE 173 BYTE RULE CANNOT. A diatonic
// numeral alphabet has seven slots and every one of them is in the key, so a
// tritone substitution, a secondary dominant, a backdoor cadence and a borrowed
// chord are all unsayable in it. A degree is 0 to 11 semitones above the tonic,
// so `bII7` and `V7/V` and `bVII7` all have somewhere to live.
//
// 🔴 AND THE MODE IS NOT A FIELD, WHICH IS DELIBERATE. McGill Billboard states a
// tonic and never states a mode, and inferring one would be a guess written into
// the data. It does not need to be inferred: `0maj` and `0min` are different
// symbols, so a context beginning on a minor tonic is already a different
// context from one beginning on a major tonic, and the table learns the two
// separately without anybody declaring which is which.
//
// ⚠️ CLASS IS FOR THE MODEL AND SPELLING IS FOR THE DISPLAY, and they are two
// fields rather than one. `7`, `7b9`, `7alt`, `13` and `7#11` are one functional
// class, because a suggester suggests a FUNCTION and the alteration is a
// voicing. But a page that answers `G7` where 1,966 standards wrote `G7b9` has
// thrown away the thing that makes the answer read as jazz. So every cell also
// carries the commonest surface spelling counted for it.
````

<a id="resources-32"></a>
## resources-32: demo/resources/chord-corpus.mjs, module, line 47

````js
/**
 * 🔴 SEVEN CLASSES, AND EVERY ONE OF THEM IS A DIFFERENT THING TO DO NEXT.
 * This is the list Open Studio's devices are built out of: a ii is `min`, its V
 * is `dom`, a minor ii is `hdim`, a tritone sub is a `dom` on another degree, a
 * backdoor is a `dom` on bVII, a passing chord is `dim`.
 * ⚠️ `sus` IS KEPT APART FROM `dom` RATHER THAN FOLDED INTO IT. It resolves the
 * same way and it is a different sound, and iRb writes 543 `7sus` and 115 `9sus`
 * against 13,211 plain `7`, which is enough to count separately.
 * ⚠️ AND `min6` AND `minmaj7` ARE FOLDED INTO `min`, WHICH LOSES SOMETHING REAL.
 * They are the tonic-minor colour and `min7` is the ii colour, and on degree 0
 * they mean different things. That is a known limitation of this alphabet and it
 * is named in the benchmark's report rather than hidden.
 */
````

<a id="resources-33"></a>
## resources-33: demo/resources/chord-corpus.mjs, module, line 94

````js
/**
 * A symbol as a reader sees it. `2min` -> `ii`, `7dom` -> `V7`, `1dom` -> `bII7`.
 * ⚠️ IT FOLLOWS `chords.mjs`'s `roman()` RATHER THAN INVENTING A SECOND
 * SPELLING: lower case is a minor third, a half diminished carries the slashed
 * circle, a diminished the circle, an augmented the plus.
 */
````

<a id="resources-34"></a>
## resources-34: demo/resources/chord-corpus.mjs, module, line 116

````js
/**
 * One `.jazz` file into a chord sequence.
 *
 * 🔴 THE EXPANSION LIST IS HONOURED, WHICH IS WHAT MAKES A TURNAROUND EXIST.
 * `*>[A,N1,A,N2,B,A2]` is the order the sections are played in, and the
 * transition from the last chord of A back to its first chord is the turnaround
 * this benchmark is asked to test for. A parser that read the file top to bottom
 * would never see one, because in the file A appears once.
 * ⚠️ IT ALSO REPEATS EVERY OTHER TRANSITION IN A SECTION AS MANY TIMES AS THE
 * SECTION IS PLAYED, which is a weighting decision rather than a neutral one.
 * The benchmark reports the counts both ways.
 */
````

<a id="resources-35"></a>
## resources-35: demo/resources/chord-corpus.mjs, module, line 175

````js
  /* ⚠️ THE SLASH IS A BASS AND IS DROPPED, WHICH IS THE RULE `chords.mjs`
     ALREADY MADE: *"A SLASH IS A BASS, NOT A CHORD TONE"*, and `roman()` in that
     file ignores it for exactly this reason. `Dmin7/G` is still a ii. */
````

<a id="resources-36"></a>
## resources-36: demo/resources/chord-corpus.mjs, module, line 187

````js
/**
 * One `salami_chords.txt` into a chord sequence.
 *
 * ⚠️ THE TONIC MOVES AND THE FILE SAYS SO. 83 of 890 files declare more than one
 * `# tonic:`, up to nine of them, so the tonic is tracked as the file is walked
 * rather than read once from the head. Reading it once would put every chord
 * after a modulation on the wrong degree.
 * ⚠️ `N` AND `X` BREAK THE SEQUENCE rather than being counted. A silence is not
 * a chord and a transition across one is not a transition.
 */
````

<a id="resources-37"></a>
## resources-37: demo/resources/chord-corpus.mjs, module, line 246

````js
/**
 * 🔴 AN IMMEDIATE REPEAT IS ONE HARMONIC EVENT AND IS COLLAPSED, AND THIS IS THE
 * SINGLE BIGGEST DECISION IN THIS FILE. `| A:min | A:min | C:maj |` is a chord
 * held for two bars, not a progression that goes to itself. Counted raw, a self
 * transition is the commonest transition in both corpora by a wide margin, and a
 * suggester trained on that learns to answer *the chord you are already playing*,
 * which is the most predictable answer there is and the least useful.
 * ⚠️ IT IS COLLAPSED ON `(DEGREE, CLASS)` RATHER THAN ON THE SPELLING, so
 * `Cmaj7` following `C6` is also one event. They are the same function.
 */
````

<a id="resources-38"></a>
## resources-38: demo/resources/chord-e6-keep.mjs, module, line 1

````js
// EXPERIMENT 6. THE PRUNE IS ITSELF A TEMPERATURE, SO SWEEP IT.
//
//   node demo/resources/chord-e6-keep.mjs
//
// 🔴 WHY THIS EXISTS. `plans/plan-better-chords-2026-09-25.md` section 13 ended
// on a ceiling rather than on a dial: uniform over the three kept rows is 40.5
// per cent cycling and 7.53 distinct chords in ten, so no temperature reaches
// the real songs' 52.7 and 7.42 at once while only three rows are kept.
// `build-chord-tables.mjs:123` says the same thing in its own comment:
// *"Raising `KEEP` is the only thing that would move it"*. Nobody had measured
// what raising it buys.
//
// 🔴 AND THE DIAL HAS TO BE REFITTED AT EVERY PRUNE, WHICH IS THE LESSON THAT
// ALREADY COST ONE NUMBER. The plan swept a temperature over every row a context
// had and landed on 1.0 for jazz; the shipped shape keeps three rows, which is
// already a sharpening, and the same variety cost 3.5. So a KEEP sweep that held
// the temperature still would be measuring two changes at once and reporting one.
// Every KEEP here gets its own temperature sweep and its own best fit, scored on
// the cycle rate and the vocabulary at once so neither can be traded away.
//
// ⚠️ `MIN_ROW = 3` IS THE COUNT FLOOR AND IT DOES NOT MOVE. The plan measured
// that sampling with no floor costs 9.5 points of attestation for 1.8 bits of
// surprisal. Raising KEEP is not lowering the floor: a context with no fourth
// row seen three times does not gain one, it keeps three rows, and the column
// `rows/ctx` below says how often the extra slots are filled at all.
//
// 🔴 THE BYTES ARE MEASURED BY THE REAL PACKER, NOT BY A COPY OF IT. This file
// spawns `build-chord-tables.mjs --check --keep=N` and reads the byte count it
// prints. A second implementation of the packing would be the one thing in this
// experiment nobody could check.
//
// It contacts nobody. tmp/chord-corpora/ is already on this disk.
````

<a id="resources-39"></a>
## resources-39: demo/resources/chord-e6-keep.mjs, module, line 42

````js
/* The grid runs to uniform-over-the-rows at each KEEP, because the ceiling moves
   with the prune and a sweep that stopped short would report its last entry as
   the answer. That is exactly how `chord-e4-generators.mjs` had to be extended.
   ⚠️ AND IT IS FINE RATHER THAN ROUND, WHICH WAS FOUND BY GETTING IT WRONG. A
   grid of 1, 1.5, 2, 2.5, 3, 3.5 made KEEP 5 look WORSE than KEEP 3, because the
   fit it wanted sat between two of its points. A coarse grid measures the grid. */
````

<a id="resources-40"></a>
## resources-40: demo/resources/chord-e6-keep.mjs, module, line 132

````js
    /* 🔴 HOW OFTEN THE EXTRA SLOTS ARE ACTUALLY FILLED, WHICH IS THE HONEST HALF
       OF RAISING A CEILING. `MIN_ROW = 3` does not move, so a context with no
       fourth row seen three times keeps three rows however high KEEP goes, and
       these columns say how much of the raise is real. */
````

<a id="resources-41"></a>
## resources-41: demo/resources/chord-e6-keep.mjs, module, line 150

````js
    /* 🔴 AND THE SECOND READING HOLDS ONE AXIS STILL, WHICH IS THE ONE THAT
       CANNOT BE ARGUED WITH. A joint fit trades a little cycle rate for a little
       vocabulary and back, so two KEEPs can swap places on the scoring rule
       rather than on the music. Pinning the cycle rate to the real songs' own
       and reading the vocabulary off there asks the prune one question: at the
       rate real music repeats itself, how many different chords does this shape
       have to offer. */
````

<a id="resources-42"></a>
## resources-42: demo/resources/chord-e6-keep.mjs, module, line 158

````js
      /* ⚠️ THE RANGE OPENS BELOW 1 AND THAT WAS A DEFECT BEFORE IT WAS A
         SETTING. A wider prune is a flatter draw at the same dial, so the
         temperature that matches a given cycle rate FALLS as KEEP rises, and a
         search floored at 1.0 answered `T 1.00` for every pop prune above three
         while missing the rate by up to sixteen points. */
````

<a id="resources-43"></a>
## resources-43: demo/resources/chord-e6-keep.mjs, module, line 199

````js
  /* ══ WHAT A PLAYER ACTUALLY SEES, WHICH THE WALK ABOVE CANNOT REACH ═══════ */
````

<a id="resources-44"></a>
## resources-44: demo/resources/chord-e6-keep.mjs, module, line 200

````js
  /* 🔴 THE WALK GRADES SLOT A AND `/nola/` DRAWS SLOT B. Slot B is the pointwise
     mutual information pick over the first `POOL` rows, and `POOL` is 4 while the
     shipped table keeps 3, so at KEEP 3 slot B is choosing between at most TWO
     candidates and the pool has never once been full. Every measure above can
     stand still while this one moves, and this one is the one on screen. */
````

<a id="resources-45"></a>
## resources-45: demo/resources/chord-e6-keep.mjs, module, line 205

````js
  /* 🔴 AND SLOT B IS ITSELF AN ARGMAX, WHICH IS WHY THE COLUMN `distinct B`
     BELOW READS EXACTLY 2.00 AT EVERY PRUNE. B is the highest pointwise mutual
     information row that A did not take, so it is the PMI top unless A collided
     with the PMI top, in which case it is the PMI second. **Two values, for any
     width of table.** The plan's whole lesson was applied to slot A and never to
     slot B, and slot B is the one on screen. `bTemp` draws it the same way. */
````

<a id="resources-46"></a>
## resources-46: demo/resources/chord-e6-keep.mjs, module, line 254

````js
      /* ⚠️ THE BEAM IS `keep**3 + 1`, WHICH IS A CEILING RATHER THAN A FILTER.
         A beam that pruned would be an argmax wearing a different name, and the
         shipped default of 64 starts pruning the moment KEEP passes 3. */
````

<a id="resources-47"></a>
## resources-47: demo/resources/chord-refused.mjs, module, line 1

````js
// demo/resources/chord-refused.mjs. What real charts write and `parseChord`
// refuses, counted rather than guessed.
//
//   node demo/resources/chord-refused.mjs
//   node demo/resources/chord-refused.mjs --all      every refused form, not the top 40
//
// Asked for 2026-09-26 after `/nola/` refused the typed line `Cmaj7 C2/E` with
// *"C2/E is not a chord, because 2 is not a chord quality"*, beside an Open
// Studio lesson playing exactly that chord with exactly that caption. The
// instruction with the report was the whole of why this file exists: **do not
// add one row and call it done, and do not guess at a second.**
//
// 🔴 IT CONTACTS NOBODY. Both corpora are already in gitignored
// `tmp/chord-corpora/`, put there once by `fetch-chord-corpora.mjs`, whose
// `--check` reports 0 requests. The standing rule about somebody else's server
// is the reason this reads a cache rather than a URL.
//
// 🔴 AND IT MEASURES THE QUALITY, NOT THE ROOT. Both corpora spell their roots
// in their own notation (Humdrum writes a flat `-`, Harte separates the quality
// with `:`), and a root spelling is a fact about the corpus rather than about
// this parser. So every quality is probed as `C#<quality>`: `C#` consumes the
// accidental slot, so a quality that begins with `b` is still read as a quality
// rather than as a flat. Probing with a bare `C` would have read `Cb9` as B
// flat with a 9 on it and reported a refusal that was this file's fault.
//
// ⚠️ THE FULL SYMBOL IS ALSO RUN, because a quality is not the whole of what a
// person types and the slash bass is the other half of the symbol that was
// asked about. The two answers are reported separately and they are different
// numbers for a reason that is notation rather than music: McGill Billboard
// writes its bass as a DEGREE (`C:maj/3`, `C:maj/b7`) where iRb and a person
// both write a NOTE (`C/E`), so every pop slash chord fails a test it was never
// spelled for. That is counted and named rather than folded into the total.
//
// ⚠️ AND THE COUNT IS OF WRITTEN TOKENS, NOT OF PLAYED ONES. `parseIrb` honours
// the `*>[A,N1,A,N2,B,A2]` expansion list and so counts a section once per
// playing, which is the right weighting for a transition table and the wrong
// one here: the question is what a person WRITES, so a chord written once is
// counted once.
````

<a id="resources-48"></a>
## resources-48: demo/resources/chord-refused.mjs, module, line 49

````js
/* ⚠️ A SKIP NAMES WHAT GOES UNMEASURED RATHER THAN PASSING QUIETLY, which is
   the convention every other check in this repository already keeps. */
````

<a id="resources-49"></a>
## resources-49: demo/resources/chord-refused.mjs, module, line 124

````js
/**
 * 🔴 THREE BUCKETS AND NOT TWO, AND THE THIRD ONE IS THE REASON THE LIST DOES
 * NOT INFLATE. The brief asked for two, a quality the table genuinely lacks
 * against a spelling of a quality it already has, and the corpora carry a third
 * that is neither: a CORPUS WRITING CONVENTION that nobody types into a text
 * box. `C:maj(9)` is Harte's way of writing `Cadd9`, `1` is Harte's way of
 * writing *the root and nothing else*, `6(F:min7)` is iRb parking an
 * alternative chord in brackets, and `min:maj7` is iRb's quality separator
 * turning up in the middle of a quality. Counting those as parser gaps would
 * say this parser refuses 14 per cent of pop when what it refuses is a file
 * format.
 * ⚠️ AND THE BUCKET IS A JUDGEMENT, SO IT IS WRITTEN DOWN HERE RATHER THAN
 * INFERRED. Everything not named below falls to the rules under it and the tail
 * is printed, so a form nobody classified is visible rather than absorbed.
 */
````

<a id="resources-50"></a>
## resources-50: demo/resources/chord-refused.mjs, module, line 200

````js
/**
 * ⚠️ THE ROOT IS TRANSLATED AND THE QUALITY IS NOT. Humdrum's `-` for a flat is
 * the same note in another hand, so writing it as `b` tests the parser rather
 * than the file format. Nothing else about the token is touched.
 */
````

<a id="resources-51"></a>
## resources-51: demo/resources/fetch-chord-corpora.mjs, module, line 1

````js
// demo/resources/fetch-chord-corpora.mjs. Two chord corpora, fetched once, ever.
//
//   node demo/resources/fetch-chord-corpora.mjs           # fetch what is missing, then print the numbers
//   node demo/resources/fetch-chord-corpora.mjs --check   # print the state, touch nothing and nobody
//
// 🔴 IT CONTACTS TWO HOSTS AND ONLY WHEN A FILE IS NOT ALREADY IN `tmp/`. Every
// later run asks nobody for anything. `CLAUDE.md`: *"super careful with external
// sources, better avoid"*, and the rule there is about whose server it is rather
// than about which harm has been named. The cache is `tmp/chord-corpora/`, which
// is gitignored, so neither corpus is in the repository and neither is in the
// deploy. `demo/resources/fetch-jrhodes3d.mjs` is the same shape and carries
// the same rule at the top of it.
//
// ⚠️ NO HARNESS EVER RUNS THIS AND NO PAGE EVER FETCHES FROM EITHER HOST. What
// ships is a TABLE counted out of these files, never the files.
//
// ── WHAT IT FETCHES, AND WHAT EACH LICENCE REQUIRES ─────────────────────────
//
// 1. THE iRealPro CORPUS OF JAZZ STANDARDS (iRb), Shanahan and Broze, 2019.
//    Zenodo, DOI 10.5281/zenodo.3546040. **CC BY 4.0.**
//    1,186 jazz standards as Humdrum `**harte` spines with a key designation.
//    🔴 CC BY REQUIRES ATTRIBUTION TO TRAVEL WITH THE WORK AND WITH ANY
//    DERIVATIVE. A counted table IS a derivative, so the attribution ships
//    beside the table rather than only in this comment. See
//    `demo/shell/LICENSE-chord-tables`.
//    ⚠️ Its original home at `musiccog.ohio-state.edu` is gone, so Zenodo is the
//    surviving copy. `research/chord-learning-2026-09-23.md` §4.3 read the
//    licence field off the Zenodo API record on 2026-09-23.
//    ⚠️ AND ITS TIDIER CHILD IS NOT USABLE: the Jazz Harmony Treebank selects
//    from this same corpus and relicenses to CC BY-NC-SA 4.0. The parent is
//    usable and the child is not, which is the trap worth naming because the
//    child is the more inviting file.
//
// 2. THE McGILL BILLBOARD PROJECT, Burgoyne, Wild and Fujinaga, 2011. **CC0.**
//    740 distinct songs across 890 sampled chart slots, Harte-syntax chord
//    symbols with onset times, metre and a stated tonic.
//    ✅ CC0 attaches no condition to anything derived from it. The citation the
//    DDMAL asks for is a scholarly norm rather than a licence condition, and it
//    is carried anyway in the same licence file, because a table nobody can
//    trace back is a table nobody can check.
//    🔴 THE URL EVERYBODY CITES IS DEAD. `ddmal.music.mcgill.ca` answers a
//    GitHub Pages 404. The live host is `ddmal.ca`.
//
// ── HOW MANY REQUESTS, AND WHAT HAPPENS WHEN ONE FAILS ──────────────────────
//
// 🔴 AT MOST FOUR REQUESTS IN A LIFETIME, AND IT SAYS HOW MANY IT MADE.
//   zenodo.org   1 API record read, then 1 file GET
//   ddmal.ca     1 landing page read to resolve the archive link, then 1 file GET
// ⚠️ A 404 IS REPORTED AND THE RUN STOPS FOR THAT CORPUS. It does not go hunting
// across the site for a file under another name, because a dozen requests
// looking for one file is the shape this repository refuses.
````

<a id="resources-52"></a>
## resources-52: demo/resources/fetch-chord-corpora.mjs, module, line 86

````js
  /* ⚠️ THE LICENCE IS READ BACK OFF THE RECORD RATHER THAN TRUSTED FROM A
     COMMENT, because a licence in a comment is a claim about a fetch somebody
     made once. If this ever stops saying cc-by-4.0 the run has to stop. */
````

<a id="resources-53"></a>
## resources-53: demo/resources/fetch-chord-corpora.mjs, module, line 110

````js
  /* 🔴 THE LINK IS RESOLVED OFF A PAGE RATHER THAN GUESSED, AND THE LIST OF
     PAGES TO TRY IS THREE LONG AND WRITTEN DOWN HERE. `ddmal.music.mcgill.ca`
     is the host everybody cites and it is dead, so the first version of this
     function asked a 404 and stopped, which is the behaviour that is wanted
     when a file is genuinely gone and the wrong behaviour when the project
     simply moved. Three is bounded, is printed, and is not a sweep. */
````

<a id="resources-54"></a>
## resources-54: demo/resources/fetch-fluidr3-piano.mjs, module, line 1

````js
// demo/resources/fetch-fluidr3-piano.mjs. The thirty notes `/nola/` plays.
//
//   node demo/resources/fetch-fluidr3-piano.mjs          # fetch what is missing
//   node demo/resources/fetch-fluidr3-piano.mjs --check  # print, fetch nothing
//
// 🔴 IT REFUSES TO RE-FETCH WHAT IT ALREADY HAS, AND THAT IS THE WHOLE POINT OF
// IT BEING A SCRIPT RATHER THAN A SHELL LOOP. CLAUDE.md: *"super careful with
// external sources, better avoid"*. These files are somebody else's GitHub
// Pages, they are in the repository now, and a second run of this asks that
// host for nothing at all. A run that DOES fetch waits a second between files
// and says how many it took.
//
// ⚠️ NO HARNESS EVER RUNS THIS AND NO PAGE EVER FETCHES FROM THAT HOST. The
// plan (`plans/plan-nola.md` §6.1) argued the alternative and refused it: a
// harness that runs dozens of times a day pulling files off a stranger's CDN is
// exactly the shape the rule is about, README endorsement or not.
//
// ── WHY THIRTY AND NOT EIGHTY-EIGHT ─────────────────────────────────────────
//
// 🔴 THE PLAN SAID EIGHTY-EIGHT AND THIRTY IS BETTER, FOR THE REASON THE PLAN
// ITSELF GIVES. `plans/plan-nola.md` §6.1 proposed copying the whole chromatic
// set (1,971,564 bytes) as a phase zero that *"proves the machinery"*. A
// chromatic set proves LESS machinery: with a recording of every note there is
// no nearest-neighbour to choose, no `playbackRate` to set, and §6.4's assert
// that *"the pitch shift of every note on the keyboard is within one semitone"*
// is true by construction and measures nothing.
//
// So this takes exactly the thirty notes Salamander samples: A0 and every
// minor third up to C8, which §2.3 measured as already being the spacing the
// arithmetic asked for. Phase zero then rehearses the pitch shifting that phase
// one will ship. It also costs a third of the bytes.
````

<a id="resources-55"></a>
## resources-55: demo/resources/fetch-fluidr3-piano.mjs, module, line 41

````js
// 🔴 MIT, AND IT IS THE SOUNDFONT'S LICENCE RATHER THAN THE CONVERTER'S.
// FluidR3_GM is Frank Wen's, released for redistribution; `midi-js-soundfonts`
// is Benjamin Gleitzman's conversion of it to one file per note. Both are named
// in `demo/nola/PROVENANCE.json`, which ships with the page.
````

<a id="resources-56"></a>
## resources-56: demo/resources/fetch-fluidr3-piano.mjs, module, line 47

````js
/**
 * 🔴 THE SOURCE NAMES ITS BLACK KEYS WITH FLATS, AND ASKING FOR A SHARP GETS A
 * 404. MEASURED 2026-09-22: `D%231.mp3` answers **404** and `Eb1.mp3` answers
 * **200, 25,585 bytes**, and the same is true of `Db`, `Gb`, `Ab` and `Bb`.
 * Fourteen of the thirty notes here are black keys, so a sharp table would have
 * fetched sixteen files and thrown on the third.
 * ⚠️ IT IS NOT THIS PROJECT'S OWN SPELLING. `demo/shell/midi-decode.mjs` and
 * `demo/shell/keyboard.mjs` both print sharps, and they are right to: a name on
 * screen is for a player. This table exists only to build a URL on somebody
 * else's host, which is why it is here and not in the kit.
 */
````

<a id="resources-57"></a>
## resources-57: demo/resources/fetch-fluidr3-piano.mjs, module, line 62

````js
/**
 * 🔴 A0 TO C8 IN MINOR THIRDS IS EXACTLY THIRTY NOTES, AND THAT IS ARITHMETIC
 * RATHER THAN A CHOICE. 21 to 108 inclusive, step 3: `(108 - 21) / 3 + 1`.
 * Every note on an 88 key piano is then at most one semitone from a recording.
 */
````

<a id="resources-58"></a>
## resources-58: demo/resources/fetch-fluidr3-piano.mjs, module, line 69

````js
/**
 * ⚠️ THE FILE ON DISK IS NAMED BY ITS MIDI NOTE NUMBER, NOT BY `A#0.mp3`.
 * Fourteen of the thirty carry a sharp, and `#` is a fragment separator in a
 * URL: `/nola/D#1.mp3` fetches `/nola/D` and the page gets an HTML 404 body
 * decoded as audio. The plan's §8 note to `encodeURIComponent` the name is a
 * repair somebody has to remember at every call site; a number needs no repair
 * at any of them. The original name is kept in `PROVENANCE.json`.
 */
````

<a id="resources-59"></a>
## resources-59: demo/resources/fetch-fluidr3-piano.mjs, module, line 104

````js
  // ⚠️ AN HTML 404 BODY IS A VALID FILE AND AN INVALID MP3. Check the frame
  // header rather than the status alone: `FF Ex` is an MPEG audio sync word,
  // `ID3` is a tag in front of one.
````

<a id="resources-60"></a>
## resources-60: demo/resources/build-faust-aot.mjs, module, line 1

````js
// demo/resources/build-faust-aot.mjs: Faust programs, compiled ahead of time.
//
//   node demo/resources/build-faust-aot.mjs          # compiles, writes demo/resources/faust/
//   node demo/resources/build-faust-aot.mjs --check  # compiles, compares, writes nothing
//
// 🔴 WHAT IT MAKES AND WHY. A Faust program compiled by the vendored libfaust
// in node and shipped as its compiled factory plays in a browser through
// `faustwasm.mjs` alone, with no compiler in the tab: 3.8 kB of instrument over
// brotli instead of 1 MB of libfaust (`plans/plan-live-slides.md` sections 1
// and 5). The page that loads it is `demo/shell/faust.mjs`'s `faustFactory()`.
// Per program, plus one mixer and one provenance record:
//
//   <id>.json          the voice and effect JSON, both `shaKey`s, and the file names
//   <id>.voice.wasm    one voice, which the runtime replicates
//   <id>.effect.wasm   the effect after the mixer, only when the program declares one
//   mixer32.wasm       libfaust's own voice mixer, the same for every instrument
//   PROVENANCE.json    what each was compiled from, by what, with what flags
//
// and for a MONO program (`mono: true` in `synth-steps.mjs`, since 2026-10-06):
//
//   <id>.json          the DSP JSON, its `shaKey`, `mono: true` and the one file name
//   <id>.wasm          the whole program, no voice and no mixer
//
// 🔴 A LIST OF PROGRAMS SINCE 2026-10-06, NOT THE ONE ORGAN. `PROGRAMS` below is
// the Organ from `demo/fau/presets.mjs` and every step of the `synths` deck
// from `demo/shell/synth-steps.mjs`, each named by the file and id it is read
// from. A program with no `effect` line has no effect file and its JSON says
// `effect: null`, which `factoryFromParts()` already takes.
// ⚠️ ONE MIXER FOR ALL OF THEM, AND THAT IS CHECKED RATHER THAN ASSUMED. Every
// program here is two channels out, so libfaust writes the same 502 bytes for
// each; a compile whose mixer differs from the first one's is refused, because
// a shared file that is right for one instrument and wrong for another would
// play quietly wrong.
//
// 🔴 ONE SOURCE. Every program is read from the module its page or deck
// imports, so the text compiled here is the text the page shows. Edit one and
// `workers/view/build.mjs` refuses to build until this script has been run
// again, because a stale artefact is silent in the worst direction: the slide
// would play last week's program and every number on it would still agree
// with itself. That is `checkCompiledDefs()`'s failure mode for `/grains/`,
// and `checkFaustAot()` is its twin.
//
// 🔴 `--check` RE-COMPILES AND GRADES TWO THINGS, AND IT IS THE STRONGER CHECK.
// The build only compares md5s, because it must not boot a compiler. Here:
//   1. the bytes a fresh compile produces are the bytes on disk, file by file;
//   2. each program rendered offline from the files ON DISK, rebuilt through
//      the same `factoryFromParts()` a page uses, has the same RMS as that
//      program rendered from a live compile of the current source, and both
//      match the figure PROVENANCE.json recorded for it.
// ⚠️ THE RMS IS AN OFFLINE RENDER IN NODE, NOT THE BROWSER FIGURE. The planning
// probe read 0.029763811585458978 off an analyser window in headless Chrome,
// both paths alike; that is a realtime window whose position depends on when
// it was read. This one is `createOfflineProcessor` with one `keyOn` and a
// fixed number of samples, so it is exactly reproducible and needs no browser,
// no audio device and no harness run.
````

<a id="resources-61"></a>
## resources-61: demo/resources/build-faust-aot.mjs, module, line 79

````js
/**
 * Every program this script compiles, as `{ id, source, code }`. `source` is
 * `<file>#<id>`, the key PROVENANCE.json and `checkFaustAot()` both use, and
 * the build resolves it by importing that file, so the two must name the same
 * export the same way: `PRESETS` in `demo/fau/presets.mjs`, `SYNTH_STEPS` in
 * `demo/shell/synth-steps.mjs`.
 */
````

<a id="resources-62"></a>
## resources-62: demo/resources/build-faust-aot.mjs, module, line 92

````js
/**
 * 🔴 AN ANSWER WRITTEN DOWN BEFORE THE RENDER, FOR THE PROGRAM SIMPLE ENOUGH TO
 * HAVE ONE. `process = os.osc(440) * 0.5;` is a sine of amplitude 0.5, whose RMS
 * is 0.5 over root two, and 24000 samples at 48 kHz are exactly 220 of its
 * cycles. A mono program has no key to leave up, so the poly programs' negative
 * control (no key, silence) has nothing to say about it; this is its control
 * instead, from arithmetic rather than from the compiler that made the file.
 */
````

<a id="resources-63"></a>
## resources-63: demo/resources/build-faust-aot.mjs, module, line 100

````js
// ⚠️ `volume` is the same sine with its 0.5 on a slider whose default is 0.5,
// so the render, which turns no slider, predicts the same figure; `pitch` is
// that with its 440 on a slider whose default is 440, so the same again.
````

<a id="resources-64"></a>
## resources-64: demo/resources/build-faust-aot.mjs, module, line 117

````js
  // the filter and the LFO, from the harmonic series rather than from the
  // compiler: a saw of amplitude 0.5 is harmonics of amplitude 1/(pi n) up to
  // Nyquist, and a two pole Butterworth low pass passes each at
  // 1/sqrt(1 + (f/fc)^4). At fc 2000 that sums to 0.26637 (rendered 0.26628);
  // the LFO's cutoff 2000 * (1 + 0.5 sin) averaged over its one 2 Hz cycle in
  // the half second render, 0.26275 (rendered 0.26266)
````

<a id="resources-65"></a>
## resources-65: demo/resources/build-faust-aot.mjs, module, line 137

````js
/* ⚠️ THE GLUE IS COPIED OUT OF THE REPOSITORY FIRST, because it is CommonJS
   shaped and the repository's own `package.json` scope would have node read it
   as a module. `code-lang-test.mjs` does the same for the same reason. */
````

<a id="resources-66"></a>
## resources-66: demo/resources/build-faust-aot.mjs, module, line 151

````js
/**
 * Compile one program polyphonically.
 * ⚠️ A PROGRAM WITH NO `effect` LINE PRINTS ONE `Aborted(...)` LINE, and that
 * is the expected absence rather than a failure: the poly generator tries to
 * compile the effect, libfaust aborts on a name that is not there, and the
 * generator carries on with no effect. It cannot be held back here, because
 * the glue bound `console.error` once when it was evaluated (`faust.mjs`
 * says why), so every polyphonic program with no effect prints it. A real failure is the
 * `did not compile` line below, with the compiler's own message.
 */
````

<a id="resources-67"></a>
## resources-67: demo/resources/build-mimproject-images.mjs, module, line 1

````js
// Builds `demo/resources/mimproject-images.json`, which is a THIRD corpus.
//
// 🔴 WHAT IT IS AND WHY IT IS NOT IN EITHER OF THE OTHER TWO. `corpus.json`
// holds pointers to things somebody else holds, so its rules are "never copy,
// never re-probe". `mimproject.json` holds the videos, which we hold. This file
// holds PICTURES recovered from a site that no longer exists: every one of the
// four mimproject.org hosts stopped resolving, so the Wayback Machine was the
// only remaining copy, and what came back is ours to hold in the same sense the
// videos are.
//
// 🔴 THE CLAIM THIS WORK REFUTED. The standing note said mimproject.org was
// down and *archive.org has nothing of it*, so the YouTube channel and the
// bucket were what survived. MEASURED 2026-09-19 from the CDX index: **2843
// captures, 778 unique URLs, 421 HTML pages, spanning 2009-10-30 to
// 2026-02-09.** The claim was wrong about pages and pictures. It was RIGHT
// about video: zero mp4, mov, webm, mp3, wav or pdf in the whole index, so the
// videos really do survive only on YouTube and Vimeo.
//
// ⚠️ MEASURED AND EDITORIAL ARE SPLIT, the same way `build-mimproject.mjs`
// splits them. `mimproject-images-measured.json` holds what was read off the
// bytes and off the index and nothing else. The prose, the site descriptions
// and the naming are here.
//
// 🔴 KEYED BY `id`, NEVER BY FILE NAME. The id is a hash of the picture's
// source URL after its crop suffix and its Drupal imagecache preset are taken
// off, so the 1024x1024 crop and the original are ONE picture with one id. A
// name is a thing a re-encode changes, which this project has already paid for
// once: a lookup keyed by file name silently re-credited somebody else's
// recording when a re-encode renamed it.
//
// ⚠️ A DATE IS STATED ONLY WHERE THE PATH CARRIES ONE. WordPress writes
// `/uploads/2017/09/`, which is the month somebody uploaded the file and is NOT
// the date of the work. It is carried as `uploadedPath` and never as `when`,
// for exactly the reason the video corpus keeps `uploaded` and `when` apart.
//
// ⚠️ THIRTY OF THE SIXTY-SEVEN ARE 145x145 THUMBNAILS and say so in
// `thumbnail`. The originals behind them were never captured. A thumbnail is
// worth holding because it is the only surviving picture of that work, and it
// must never be mistaken for a picture somebody can use.
//
//   node demo/resources/build-mimproject-images.mjs          # writes the json
//   node demo/resources/build-mimproject-images.mjs --check  # prints, writes nothing
````

<a id="resources-68"></a>
## resources-68: demo/resources/build-mimproject-images.mjs, module, line 52

````js
// The station worker serves any object in its bucket at `/media/<key>` with
// Range and `access-control-allow-origin: *`.
// ⚠️ It also serves them `immutable` for a year, so a replacement needs a NEW
// NAME rather than an overwrite. And its five-minute `sweep()` lists and
// deletes under `live/` ONLY, which is why this prefix is safe there.
````

<a id="resources-69"></a>
## resources-69: demo/resources/build-mimproject-images.mjs, module, line 68

````js
/**
 * 🔴 WHAT WAS TAKEN OUT AND WHY, CARRIED IN THE CORPUS RATHER THAN DELETED
 * QUIETLY. Four pictures were pulled on 2026-09-19: every one of them is
 * advertising for the same Thai online casino, uploaded to
 * `/wp-content/uploads/2025/01/` AFTER the domain had lapsed. They are what a
 * SQUATTER put on mimproject.org.
 *
 * ⚠️ THIS IS A FACT ABOUT THE SURVEY'S QUESTION, NOT A SLIP. The Wayback index
 * was asked what the DOMAIN had held, and a domain outlives the people who had
 * it. Captures from 2009 to 2023 are MIMproject's; the 2025 and 2026 ones are
 * somebody else's business on the same name. Nothing in a CDX row says which,
 * and a build that just counted images would have shipped all four for ever.
 *
 * ⚠️ AND THE ENTRY NEXT DOOR CALLED IT A `2025 revival`, WHICH IS EXACTLY THE
 * WRONG READING and was written here, in `mimproject-images.json` and in two
 * notes before anybody looked at the pictures. A site coming back and a site
 * being taken are the same shape in an index of URLs.
 */
````

<a id="resources-70"></a>
## resources-70: demo/resources/build-mimproject-images.mjs, module, line 114

````js
// 🔴 THE FILE NAMES HAVE TO BE UNIQUE AND THIS THROWS RATHER THAN WARNS. Two
// pictures landing on one bucket key would put one of them on top of the other,
// and the bucket serves `immutable`, so the loser would be unrecoverable
// without a rename nobody would know to make.
````

<a id="resources-71"></a>
## resources-71: demo/resources/build-mimproject-images.mjs, module, line 124

````js
/**
 * 🔴 AND THE BUILD REFUSES ANYTHING FROM AFTER THE DOMAIN LAPSED. The four
 * casino adverts all came from `/uploads/2025/01/`, and the only thing that
 * separated them from MIMproject's own pictures was somebody opening them. A
 * date cannot prove authorship, but it can carry the one fact that is known:
 * nothing on that domain after 2024 is MIMproject's.
 * ⚠️ IT THROWS RATHER THAN FILTERING. A build that silently dropped rows would
 * hide a real picture with a late upload path just as quietly as it hid these,
 * and the person re-running a survey is the one who should decide.
 */
````

<a id="resources-72"></a>
## resources-72: demo/resources/build-mimproject-images.mjs, module, line 163

````js
	// 🔴 WHAT IS GONE IS PART OF THE RECORD. 196 pictures are referenced by an
	// archived page and were never captured, and the biggest single loss is the
	// opera production photography. A corpus that listed only what it has would
	// read as though that were everything there was.
	// What was ingested and then taken out, so the next survey does not put it
	// back. Keyed by the source URL, which is the thing that identifies a
	// squatter's upload.
````

<a id="resources-73"></a>
## resources-73: demo/resources/build-mimproject.mjs, module, line 1

````js
// Builds `demo/resources/mimproject.json`, which is a SECOND corpus and not an
// addition to the first one.
//
// 🔴 IT IS THE OPPOSITE KIND OF THING FROM `corpus.json`, WHICH IS THE WHOLE
// REASON IT IS A SEPARATE FILE. Every row of `corpus.json` is a POINTER to
// something somebody else holds, and its rules follow from that: never copy,
// never re-probe, record what was observed on a date. Every row HERE points at
// a file we hold ourselves, in our own R2 bucket, because the material is
// MIMproject's own and mimproject.org has been down long enough that YouTube
// was the last copy anybody could reach. Merging the two would put "ask nobody
// else's server" and "this server is ours" under one set of rules, and the
// first rule would win by being written down.
//
// Two kinds of input, and the split is the same one `corpus.json` makes:
//   - MEASURED facts (duration, picture size, frame rate, bytes) come from
//     `mimproject-measured.json` (the YouTube channel) and
//     `mimproject-vimeo-measured.json` (Vimeo), read off the files themselves
//     with ffprobe when they were pulled. A duration is a fact about a file,
//     measured once and written down.
//   - EDITORIAL facts (when the work happened, and how we know) are the table
//     below, hand-checked against each video's own title and description and
//     against what is published about the productions.
//
// ⚠️ TWO ROWS ARE NOT OURS AND SAY SO. The opera interview and the Made in
// Estonia Maraton piece were filmed and uploaded by Kanuti Gildi SAAL; the
// productions are co-productions, the recordings are theirs. Their `holder`,
// `source` and `licenceBy` carry that rather than letting "MIMproject" stand
// over the whole file because most of the file is ours.
//
// ⚠️ A YOUTUBE UPLOAD DATE IS NOT A DATE OF WORK, and most of these were
// uploaded years after the thing they show. `uploaded` is carried on every row
// as the fact it is; `when` is filled only where the work's own date is
// stated somewhere, and two rows honestly have `precision: "none"`.
//
//   node demo/resources/build-mimproject.mjs            # writes mimproject.json
//   node demo/resources/build-mimproject.mjs --check    # prints, writes nothing
````

<a id="resources-74"></a>
## resources-74: demo/resources/build-mimproject.mjs, module, line 47

````js
// Where the files actually are. The station worker serves any object in its
// bucket at `/media/<key>` with Range and `access-control-allow-origin: *`.
// ⚠️ It also serves them `immutable` for a year, so a replacement file needs a
// new name rather than an overwrite.
````

<a id="resources-75"></a>
## resources-75: demo/resources/build-mimproject.mjs, module, line 53

````js
// The editorial table. Keyed by file name, because that is what a reader of the
// bucket sees. `how` says where the date came from, in the same spirit as
// `corpus.json`'s `when.how`: a date with no provenance is a guess in a
// confident typeface.
````

<a id="resources-76"></a>
## resources-76: demo/resources/build-mimproject.mjs, module, line 123

````js
	// ── from Vimeo. The five Karlsruhe rows are the oldest material here and
	// they push the corpus back to 2008, three years before anything on the
	// YouTube channel. ⚠️ The two clips that give a month disagree, March
	// against April, so only the two of them carry a month and the rest carry
	// the year. A workshop run twice is the obvious reading and nothing states
	// it, so nothing here says it.
````

<a id="resources-77"></a>
## resources-77: demo/resources/build-mimproject.mjs, module, line 171

````js
/**
 * 🔴 WHAT WAS PULLED AND THEN TAKEN OUT AGAIN, AND WHY THE ROW STAYS HERE.
 * A corpus that silently shrinks is one nobody can audit: the difference
 * between "this was never found" and "this was found and removed" is the whole
 * value of an archive's index, and the count is the only thing a reader would
 * have noticed. Each entry says where the original still is, so nothing here
 * is a dead end.
 *
 * ⚠️ IT IS A NOTE, NOT A TOMBSTONE WITH THE FILE STILL BEHIND IT. The object is
 * gone from the bucket and the URL answers 404.
 */
````

<a id="resources-78"></a>
## resources-78: demo/resources/build-mimproject.mjs, module, line 270

````js
/**
 * 🔴 A `NOT_OURS` KEY THAT MATCHES NOTHING IS A ROW SILENTLY CREDITED TO US,
 * AND THIS EXACT THING HAPPENED. The opera interview's file was renamed when
 * the 1080p re-encode replaced the 720p rendition; `WHEN` was updated and this
 * table was not. `item()` then read `NOT_OURS[v.file]` as undefined, handed the
 * row `source: 'MIMproject'` and a `holder` saying it is ours, and the build
 * printed nothing. A licence statement about somebody else's recording had
 * flipped and every file still looked right.
 *
 * ⚠️ AND THE PAGE'S OWN CHECK COULD NOT SEE IT, which is the more useful half.
 * It compared `theirs.length` against `counts.theirs`, and both are derived
 * from the same field, so the pair agreed perfectly while being wrong together.
 * That is CLAUDE.md's rule about a statistic that is constant by construction
 * over its subject: not a weak measurement, a blind one. What caught it was the
 * DETAIL line moving from `2 of 28` to `1 of 26`, read by a human.
 *
 * A key here is a claim that a specific file exists. Say so at build time.
 */
````

<a id="resources-79"></a>
## resources-79: demo/resources/build-moholy-partiturskizze.mjs, module, line 1

````js
// Builds `demo/resources/moholy-partiturskizze.json`, Moholy-Nagy's
// Partiturskizze zu einer mechanischen Exzentrik (1924, plate in Bauhausbuecher
// 4, 1925) read off the archive.org scan as data.
//
//   node demo/resources/build-moholy-partiturskizze.mjs          # writes the JSON
//   node demo/resources/build-moholy-partiturskizze.mjs --check  # prints the reading, writes nothing
//
// NODE ONLY. Never shipped to a browser, never imported by a page.
//
// THE SAME KIND OF THING AS `build-held-in-human.mjs`, WITH ONE DIFFERENCE.
// Held in Human is a text that a parser reads. This is a picture, so there is
// nothing to parse: every number below was MEASURED BY HAND on 2026-10-04, in
// pixels, on the one image the scan holds of the plate, and typed here. The
// JSON is generated from these tables so that the fractions, the checks and the
// summary are computed once and never typed.
//
// THE IMAGE. `Schlemmer et al. - 1925 - Die Buehne am Bauhaus.pdf` on
// archive.org, PDF page 47, its one embedded JPEG, 902 x 345 px, extracted with
// `pdfimages -f 47 -l 47 -j` and read pixel by pixel. That JPEG IS the best
// copy the item has: the item's original is that PDF (ABBYY FineReader 10,
// 2014) and every other format in it (the JP2 zip, the page images) is derived
// from it, so no request could have returned more detail (INFERRED from the
// item's file list, which was read: one PDF, then derivatives). The plate is
// photographed flat and SIDEWAYS in it, title on the left.
//
// ORIENTATION. Moholy prints it to be read vertically, title at the top, time
// running DOWN. The scan has time running RIGHT. Everything in the JSON is
// stated in the hung orientation:
//   - `at` / `from` / `to` are fractions of the scored length, 0 at the top of
//     the lanes, 1 at the bottom.
//   - `across` is a fraction of a column's width, 0 at its LEFT edge as hung
//     (which is the BOTTOM of the scan), 1 at its right edge.
//   - directions: scan right = down (with time), scan left = up (against
//     time), scan up = right, scan down = left. The columns run 1, 2, 3, 4
//     from left to right as hung.
//
// THE SCORED LENGTH. Pixel 177 to pixel 852 along the scan, which is where
// column 3 (light) starts and ends. Column 3 is the only one with a stated time
// scale (*"Die Breite der Streifen bedeutet die Dauer"*), so it defines 0 and 1.
// The other columns start and end within two pixels of it. 675 px, so one scan
// pixel is 0.0015 of the length and NOTHING HERE IS FINER THAN THAT.
//
// WHAT `how` MEANS ON EVERY ROW.
//   seen      the shape and its extent are in the pixels; anyone with the same
//             JPEG gets the same numbers within a pixel or two.
//   inferred  my reading: a meaning, a match to the FOLGE list, a label I could
//             not read in this scan. It says why in `note`.
// A hex is `sampled`: the mean RGB of the span's interior in the 2014 JPEG of a
// 1925 print, which is the colour of the scan and not of Moholy's ink.
````

<a id="resources-80"></a>
## resources-80: demo/resources/build-moholy-partiturskizze.mjs, module, line 73

````js
// ── column 3, light ─────────────────────────────────────────────────────────
//
// [x from, x to (exclusive), colour, sampled hex, note]. These TILE the column:
// the check below refuses a gap or an overlap. Read at y = 115, 130, 145, 160
// with a colour classifier and checked against a 5x enlargement by eye.
// White is unprinted paper; reading it as white light (rather than as nothing
// scored) is INFERRED, since the key defines only black.
````

<a id="resources-81"></a>
## resources-81: demo/resources/build-moholy-partiturskizze.mjs, module, line 150

````js
// Narrow stripes INSIDE a wide one, running along the time axis, which is what
// the key calls *"schmale vertikale Streifen"*: simultaneous partial lightings.
// [x from, x to, colour, hex, scan y top, scan y bottom, note]
````

<a id="resources-82"></a>
## resources-82: demo/resources/build-moholy-partiturskizze.mjs, module, line 163

````js
// ── column 4, music ─────────────────────────────────────────────────────────
//
// The sirens are the coloured bars running along time, read at scan y 86 to 90.
// [x from, x to, colour, hex, note]
````

<a id="resources-83"></a>
## resources-83: demo/resources/build-moholy-partiturskizze.mjs, module, line 180

````js
// Staff fragments: grey strips laid ACROSS the lane, with dark dots that are
// noteheads. [centre x, group, note]. A group is a set joined by a drawn
// bracket. NO NOTE, CLEF OR PITCH IS READABLE: a notehead is one or two dark
// pixels in this scan.
````

<a id="resources-84"></a>
## resources-84: demo/resources/build-moholy-partiturskizze.mjs, module, line 202

````js
// ── columns 1 and 2, form and movement ──────────────────────────────────────
//
// [id, x from, x to, label (hung orientation), folge item or null, how of the
// match, note]. The SHAPES are seen; every FOLGE match is inferred unless the
// glyph is the word itself.
````

<a id="resources-85"></a>
## resources-85: demo/resources/build-moholy-partiturskizze.mjs, module, line 242

````js
// The FOLGE list, from the page 44 image and the item's OCR, in the book's
// order. Columns 3 and 4 *"sind ohne Schlagworte deutlich"*.
````

<a id="resources-86"></a>
## resources-86: demo/resources/bench-chord-suggester.mjs, module, line 1

````js
// demo/resources/bench-chord-suggester.mjs. Does a chord suggester know any jazz.
//
//   node demo/resources/bench-chord-suggester.mjs           # every section, to stdout
//   node demo/resources/bench-chord-suggester.mjs --devices # only the named device tests
//
// 🔴 IT CONTACTS NOBODY. It reads `tmp/chord-corpora/`, which
// `demo/resources/fetch-chord-corpora.mjs` filled once and which is gitignored.
// Run that first if this says the cache is empty.
//
// ── THE TRAP THIS BENCHMARK EXISTS TO NOT FALL INTO ─────────────────────────
//
// 🔴 A SUGGESTER SCORED ONLY ON *DID IT PREDICT THE CHORD THAT CAME NEXT* IS
// MAXIMISED BY ALWAYS OFFERING THE COMMONEST CONTINUATION, AND THE COMMONEST
// CONTINUATION IS THE DEFINITION OF A CLICHE. So top 1 accuracy and the
// instruction *"no cliches"* are directly opposed, and a benchmark reporting
// accuracy alone would drive the build in exactly the wrong direction while
// looking rigorous. Three families of number are reported and they are allowed
// to disagree:
//   PREDICTIVE  did the real next chord turn up in what was offered
//   IDIOMATIC   does anybody ever actually play this here, measured on songs
//               the table has never seen. A suggestion with zero support is
//               WRONG rather than adventurous, and this is the floor.
//   PREDICTABLE how much of the time is the suggester just naming the global
//               maximum, how many different things does it ever say, and how
//               surprising is what it says
//
// ⚠️ AND A NEGATIVE CONTROL IS THE HALF THAT PROVES THE INSTRUMENT. Two things
// in here are SUPPOSED to score badly: `random`, which draws from the
// vocabulary, and `cross`, which is the other style's table. A benchmark that
// scored those well would be a broken benchmark and nothing else it says would
// mean anything.
//
// ⚠️ NOTHING IS TRAINED AND TESTED ON THE SAME DATA. The split is by SONG and
// not by transition, because two transitions from one song are not independent,
// and it is deterministic so two runs grade the same thing.
````

<a id="resources-87"></a>
## resources-87: demo/resources/bench-chord-suggester.mjs, module, line 82

````js
/**
 * ⚠️ THE SPLIT IS BY SONG. Splitting by transition would put a song's bars on
 * both sides, and a table that has read half of `Autumn Leaves` predicting the
 * other half is not predicting anything.
 */
````

<a id="resources-88"></a>
## resources-88: demo/resources/bench-chord-suggester.mjs, module, line 120

````js
/**
 * 🔴 THE 173 BYTE RULE FROM `research/chord-learning-2026-09-23.md`, VERBATIM.
 * Its whole alphabet is the seven diatonic triads of a major key, so it has no
 * row for a dominant seventh, a half diminished, a borrowed chord, a secondary
 * dominant or anything in a minor key. That is the point of grading it.
 */
````

<a id="resources-89"></a>
## resources-89: demo/resources/bench-chord-suggester.mjs, module, line 138

````js
// 🔴 nothing at all
````

<a id="resources-90"></a>
## resources-90: demo/resources/bench-chord-suggester.mjs, module, line 168

````js
/**
 * 🔴 THE TWO SLOT SUGGESTER, WHICH IS THE THING THE BRIEF ASKED TO HAVE
 * EVALUATED RATHER THAN ASSUMED. The original ask was already for a THIRD and a
 * FOURTH chord, which is two slots, so they are given two different jobs instead
 * of being a ranked pair of one job.
 *   SLOT A  the idiomatic continuation: argmax P(next | context).
 *   SLOT B  the one worth hearing: argmax POINTWISE MUTUAL INFORMATION among
 *           candidates the corpus actually attests at least `floor` times.
 * PMI is log P(next|context) minus log P(next), so it is high for a chord that
 * is SPECIFIC TO THIS CONTEXT and low for a chord that is common everywhere.
 * That is precisely the difference between an idiom and a cliche, and it is a
 * quantity rather than a taste.
 * ⚠️ THE FLOOR IS WHAT KEEPS SLOT B HONEST. Without a count floor, PMI is
 * maximised by whatever was seen once, which is noise wearing the costume of
 * daring.
 */
````

<a id="resources-91"></a>
## resources-91: demo/resources/bench-chord-suggester.mjs, module, line 193

````js
    /* 🔴 `pool` IS THE SECOND RAIL AND IT IS NOT THE SAME AS THE FLOOR. A count
       floor says *somebody played this here*; it does not say *this is one of
       the reasonable things to play here*. With no pool, PMI reaches past a dozen
       ordinary answers for whatever is most SPECIFIC to the context, and on a
       thin context that is an augmented triad seen four times. Restricting the
       search to the N commonest continuations and then re-ranking those by PMI
       asks a different and better question: OF THE THINGS THAT BELONG HERE,
       WHICH ONE IS LEAST GENERIC. The sweep below is what set N. */
````

<a id="resources-92"></a>
## resources-92: demo/resources/bench-chord-suggester.mjs, module, line 454

````js
  /* ⚠️ AND THE DIAL MOVES THE SPELLING AS WELL AS THE TABLE, WHICH IS A SECOND
     AND SEPARATE WAY IT IS VISIBLE. The function `0maj` is written `Cmaj7` by
     jazz players and `C` by pop players, and that difference is in the corpora
     rather than in anybody's taste. A page that changed its table and not its
     spelling would be half a dial. */
````

<a id="resources-93"></a>
## resources-93: demo/resources/bench-chord-suggester.mjs, module, line 477

````js
/**
 * 🔴 NAMED TESTS WITH EXPECTED ANSWERS ARE A STRONGER INSTRUMENT THAN AGGREGATE
 * ACCURACY, and they are the only thing here that can answer *"is this Open
 * Studio quality"*. An aggregate says a suggester is right 40 per cent of the
 * time and cannot say whether it has ever heard of a backdoor cadence.
 * Everything is written in C so it can be read, and it is converted to the
 * key-relative alphabet before it is looked up.
 */
````

<a id="resources-94"></a>
## resources-94: demo/resources/bench-chord-suggester.mjs, module, line 533

````js
/**
 * 🔴 AND THE OTHER DIRECTION, WHICH IS A DISCOVERY RATHER THAN A TEST. A named
 * test asks *does the table know where this chord goes*. This asks the table
 * *where does this chord actually live*, and it is the half that can correct the
 * person writing the tests. One of the expectations above was wrong and this is
 * how it was caught.
 */
````

<a id="resources-95"></a>
## resources-95: demo/resources/bench-chord-suggester.mjs, module, line 606

````js
  /**
   * 🔴 THE TIMING IS TAKEN ON THE SHAPE THAT WOULD SHIP, NOT ON THE BENCHMARK'S.
   * `makeNgram` re-sorts a Map and rebuilds the whole fallback list on every
   * call, because inside a benchmark that costs nothing and is easier to read.
   * A page would read a pre-sorted array out of a plain object. The prior
   * research already measured this exact gap on the recogniser and found a
   * factor of ninety, so timing the convenient version and calling it the cost
   * would be repeating a mistake this repository has already written down.
   */
````

<a id="resources-96"></a>
## resources-96: demo/resources/build-chord-tables.mjs, module, line 1

````js
// demo/resources/build-chord-tables.mjs. The table that ships, and nothing else.
//
//   node demo/resources/build-chord-tables.mjs           # count, pack, write, print the numbers
//   node demo/resources/build-chord-tables.mjs --check   # print the numbers, write nothing
//   node demo/resources/build-chord-tables.mjs --check --keep=5   # what another prune would cost
//
// 🔴 IT CONTACTS NOBODY. It reads the corpora
// `demo/resources/fetch-chord-corpora.mjs` cached once under `tmp/`, which is
// gitignored, and it writes ONE file: `demo/resources/chord-tables.json`, served
// at `/resources/chord-tables.json` the way `/tapes/` already reads
// `/resources/corpus.json`.
//
// 🔴 WHAT SHIPS IS A TABLE, NOT A CORPUS. 870 KB of other people's song data
// stays in `tmp/`. What crosses the wire is counts over a key-relative alphabet,
// which is a fact ABOUT the corpus rather than a copy of it.
//
// 🔴 AND THE LICENCE TRAVELS WITH IT. The iRb corpus is CC BY 4.0, and CC BY
// requires attribution on derivatives as well as on the work. A counted table is
// a derivative. `demo/resources/LICENSE-chord-tables` carries the attribution
// and is written by this script so it cannot drift from what was counted.
// McGill Billboard is CC0 and attaches no condition; its citation is carried
// anyway, because a table nobody can trace back is a table nobody can check.
//
// ── THE PACKING, AND WHY IT IS NOT JUST JSON ────────────────────────────────
//
// ⚠️ THE OBVIOUS JSON IS FIVE TIMES THE SIZE AND THE NUMBERS ARE PRINTED BOTH
// WAYS ON EVERY RUN, so the choice can be checked rather than taken on trust.
// `{"7dom|0maj":[["9dom",412],...]}` spends most of its bytes re-typing symbol
// names that are already in a 78 entry list. Packed, a symbol is ONE character,
// a probability is ONE character, and a record is a fixed width so there are no
// separators at all.
````

<a id="resources-97"></a>
## resources-97: demo/resources/build-chord-tables.mjs, module, line 45

````js
/**
 * 🔴 `--keep=N` IS FOR MEASURING WHAT ANOTHER PRUNE WOULD COST AND IT REFUSES TO
 * WRITE. `demo/resources/chord-e6-keep.mjs` sweeps the prune and needs the byte
 * count off THIS packer rather than off a second copy of it, and a flag that
 * could also write the table would mean the shipped file's shape was decided on
 * a command line somebody typed once. The shipped number is the constant below
 * and nothing else, so a table on this disk always matches the source.
 */
````

<a id="resources-98"></a>
## resources-98: demo/resources/build-chord-tables.mjs, module, line 64

````js
/* 🔴 KEEP `\\` AND `"` OUT OF THE ALPHABET. Both are legal in a JSON string and
   both cost a backslash to write, which would make one symbol twice the size of
   every other for no reason and would be invisible until somebody measured. */
````

<a id="resources-99"></a>
## resources-99: demo/resources/build-chord-tables.mjs, module, line 106

````js
/**
 * 🔴 THE PRUNE, AND THE THREE NUMBERS IN IT WERE MEASURED RATHER THAN CHOSEN.
 * `demo/resources/bench-chord-suggester.mjs` graded the table at four settings on
 * held-out songs: unpruned reads 48.5 per cent top 1 and 120,662 bytes of JSON,
 * and `ctx>=8 row>=3 keep 3` reads **48.6 per cent and 25,252**. Pruning to a
 * fifth of the size costs nothing measurable, because everything it removes was
 * seen once or twice and was never going to be the top answer anyway.
 *
 * 🔴 `KEEP` WAS 3 UNTIL 2026-09-26 AND THE COMMENT BELOW ASKED FOR THIS
 * MEASUREMENT BY NAME. `demo/resources/chord-e6-keep.mjs` swept it at 3, 4, 5, 6
 * and 8, refitting the temperature at every step because the prune is itself a
 * temperature, and read the byte count off THIS packer rather than off a copy.
 * Held at the real songs' own cycle rate, which is the one comparison a scoring
 * rule cannot tilt:
 *
 *   jazz   KEEP 3  7.15 distinct in ten   KEEP 5  7.32   KEEP 8  7.41   real 7.42
 *   pop    KEEP 3  4.56                   KEEP 5  4.55   KEEP 8  4.51   real 4.65
 *
 * 🔴 SO THE VOCABULARY GAIN IS A JAZZ GAIN AND POP DOES NOT HAVE ONE. Raising
 * the prune closes 63 per cent of jazz's remaining gap and moves pop the wrong
 * way by a hundredth of a chord. That is worth knowing before anybody reads
 * *"the ceiling is the prune"* as a fact about tables in general.
 * 🔴 AND THE GAIN THAT PAID FOR THIS IS THE WAY HOME, NOT THE WALK. MEASURED
 * over 4,000 held-out jazz contexts: a four chord route to the tonic exists on
 * **92.7 per cent** of them at KEEP 3 and **98.5** at KEEP 5, over **307**
 * distinct routes against 150, with attestation 95.4 against 98.3. Seven contexts
 * in a hundred had no way home at all and now have one.
 * ⚠️ `MIN_ROW = 3` DOES NOT MOVE AND IS NOT WHAT CHANGED. A context with no
 * fourth row seen three times still keeps three rows: MEASURED, 32.6 per cent of
 * jazz contexts fill a fourth slot and 26.4 per cent a fifth, so most of them
 * never reach the new ceiling. Sampling with no floor costs 9.5 points of
 * attestation, which is the trade pure PMI was refused for.
 * ⚠️ AND 6 AND 8 WERE REFUSED RATHER THAN MISSED. They buy 0.02 and 0.09 more
 * distinct chords in ten for another 2,724 and 8,172 bytes, and take the route's
 * attestation to 95.2 and 94.4 against a floor of about 94.
 */
````

<a id="resources-100"></a>
## resources-100: demo/resources/build-chord-tables.mjs, module, line 144

````js
/**
 * 🔴 THE TEMPERATURE THE PAGE DRAWS WITH, ONE NUMBER PER STYLE, AND IT IS IN THE
 * TABLE BECAUSE IT IS A FACT ABOUT THE STYLE RATHER THAN ABOUT THE CODE.
 * `plans/plan-better-chords-2026-09-25.md` measured that taking the most likely
 * chord ten times in a row falls into a repeating cycle **99.1 per cent** of the
 * time on jazz and **99.8** on pop, against **52.7** and **89.0** for the real
 * songs, and that sampling instead reproduces the real statistics.
 *
 * 🔴 AND THESE TWO NUMBERS ARE NOT THE PLAN'S TWO NUMBERS, WHICH IS THE
 * INTERESTING RESULT RATHER THAN A DISAGREEMENT. The plan swept temperatures
 * over EVERY row a context had and landed on 1.0 for jazz and 0.5 to 0.8 for
 * pop. **This table keeps three rows**, which is already a sharpening, so the
 * same variety costs a much flatter dial. MEASURED 2026-09-25 by
 * `demo/resources/chord-e4-generators.mjs`, which builds this exact shape from
 * the training split and walks ten steps through `suggest.mjs`'s own sampler:
 *
 *   jazz  T 1.0  81.6% cycle  5.92 distinct   T 3.5  53.1%  7.13   real 52.7%  7.42
 *   pop   T 1.0  92.1% cycle  4.30 distinct   T 1.4  87.3%  4.67   real 89.0%  4.65
 *
 * 🔴 AND THEY MOVED AGAIN ON 2026-09-26 BECAUSE `KEEP` MOVED, WHICH IS THE SAME
 * FINDING ARRIVING A SECOND TIME. Five rows is a flatter thing to draw from than
 * three, so the same variety costs a much COLDER dial: jazz fell from 3.5 to 1.7
 * and pop from 1.4 to 0.8. MEASURED by `demo/resources/chord-e6-keep.mjs`, which
 * refits the temperature at every prune for exactly this reason:
 *
 *   jazz  KEEP 5 T 1.7  52.5% cycle  7.33 distinct  97.0% attested   real 52.7%  7.42
 *   pop   KEEP 5 T 0.8  89.1% cycle  4.55 distinct  98.2% attested   real 89.0%  4.65
 *
 * ⚠️ A NUMBER BELOW 1 IS NOT A MISTAKE AND THE SEARCH HAD TO BE TAUGHT THAT. Pop
 * at five rows needs SHARPENING, not flattening, and a sweep floored at 1.0
 * answered 1.00 for every pop prune while missing the cycle rate by sixteen
 * points.
 * ⚠️ ATTESTATION IS THE FLOOR AND IT IS NOWHERE NEAR IT: 97.0 per cent on jazz
 * and 98.2 on pop, against the 94 nothing ships below.
 */
````

<a id="resources-101"></a>
## resources-101: demo/resources/build-chord-tables.mjs, module, line 181

````js
/**
 * 🔴 HOW MUCH OF THE MIXTURE IS THE PLAYER'S OWN TAKE, ONE NUMBER PER STYLE, AND
 * IT IS IN THE TABLE FOR THE THIRD TIME FOR THE THIRD REASON. The temperature is
 * here because the corpora differ; so is this, and the difference is larger.
 * `plans/plan-better-chords-2026-09-25.md` section 6.2 measured 0.2 to 0.3 on
 * iRb and never looked at pop, so its range is a JAZZ range that reads as a
 * general one.
 *
 * MEASURED 2026-09-26 by `demo/resources/chord-e7-take.mjs`, with expansion off,
 * through this table's own shape and through `suggest.mjs`'s `adaptRows`:
 *
 *   jazz  w 0.25  +6.32 top 1   50.2% cycle  7.44 distinct  98.0% attested   real 52.0%  7.44
 *   pop   w 0.10  +5.09 top 1   86.7% cycle  4.67 distinct  98.4% attested   real 89.0%  4.65
 *   pop   w 0.25 would read +17.77 top 1 and 83.6% cycle with 4.89 distinct
 *
 * 🔴 SO POP'S HUGE TOP 1 GAIN IS THE PLAN'S OWN CAVEAT AT FULL VOLUME AND IS NOT
 * A REASON TO TURN THE DIAL UP. A Billboard run is a verse or a chorus, which is
 * a loop, so adapting to it predicts it almost for free and drives the generator
 * FURTHER from how real pop repeats itself rather than closer. **The four
 * measures are what refuse the bigger number**, which is the whole reason this
 * project does not score on top 1 alone.
 * ⚠️ AND A TABLE WRITTEN BEFORE THIS FIELD EXISTED READS AS 0.25, which is jazz's
 * measured value rather than a neutral one, stated here rather than hidden.
 */
````

<a id="resources-102"></a>
## resources-102: demo/resources/build-chord-tables.mjs, module, line 226

````js
/**
 * 🔴 THE UNIGRAM ON A LOG SCALE, BECAUSE ON THE LINEAR ONE ABOVE HALF THE
 * ALPHABET IS ZERO. MEASURED 2026-09-30: `pch` steps at 1/89, about 1.1 per cent,
 * and **46 counted jazz symbols and 57 counted pop symbols** are rarer than half a
 * step, so `uni` stores them as exactly 0. Every diminished, augmented and
 * suspended chord is in that list, `8dim` among them at a real **70 of 52,924**.
 * `suggest.mjs` ranks slot B by `log2(p / u)`, so a zero read as `1e-6` gave
 * every one of those chords about **17 bits** of specificity and it won slot B
 * whenever it reached the pool: **10.9 per cent of jazz slot B answers and 18.7
 * of pop** landed on a symbol whose unigram the table had thrown away.
 * ✅ ONE CHARACTER, `round(-UL * log2(u))`, SO A STEP IS A FIFTH OF A BIT AND THE
 * WORST ERROR IS 2^(1/10), ABOUT 7 PER CENT, AT ANY FREQUENCY. 88 steps reach
 * 2^-17.6, which is below one chord in the larger corpus (1 of 82,321 is
 * 2^-16.3), so no counted symbol can clamp and the build refuses if one does.
 * ⚠️ `uni` IS KEPT BESIDE IT, UNCHANGED, because eleven measurement scripts and
 * any table already cached read that field. `ulog` is new and a reader that
 * does not know it simply never sees it.
 */
````

<a id="resources-103"></a>
## resources-103: demo/resources/build-chord-tables.mjs, module, line 282

````js
/* ⚠️ THE SPELLING IS A SECOND FIELD AND IT IS WHAT MAKES THE ANSWER READ AS
   JAZZ. `7dom` is the function; the commonest surface spelling of it in iRb is
   what a player expects to see written on the chart. A page that answers `G7`
   where 1,966 standards wrote `G7b9` has thrown the style away while being
   functionally correct. */
````

<a id="resources-104"></a>
## resources-104: demo/resources/build-chord-tables.mjs, module, line 325

````js
/**
 * 🔴 THE ROUND TRIP, AND THE SABOTAGE THAT PROVES IT IS NOT DECORATION. A packed
 * table is unreadable by eye, so the only thing standing between a packing bug
 * and a page that suggests the wrong chord confidently is this check. It decodes
 * what was just packed and asks nine named jazz questions of it.
 * ⚠️ AND IT IS RUN A SECOND TIME AGAINST A TRUNCATED TABLE. A check that stayed
 * green under that would be measuring nothing, which is this repository's most
 * repeated finding about its own instruments.
 */
````

<a id="resources-105"></a>
## resources-105: demo/resources/build-chord-tables.mjs, module, line 375

````js
/* 🔴 THE UNIGRAM ROUND TRIP, AND ITS SABOTAGE IS THE LINEAR COLUMN THIS FIELD
   EXISTS TO REPLACE. Every counted symbol decodes to within 8 per cent of its
   count, and the same check run over `uni` has to fail, or it is not looking. */
````

<a id="resources-106"></a>
## resources-106: demo/resources/fetch-jrhodes3d.mjs, module, line 1

````js
// demo/resources/fetch-jrhodes3d.mjs. A real 1977 Rhodes for `/nola/`.
//
//   node demo/resources/fetch-jrhodes3d.mjs           # fetch what is missing, encode what is missing
//   node demo/resources/fetch-jrhodes3d.mjs --check   # print the state, touch nothing and nobody
//   node demo/resources/fetch-jrhodes3d.mjs --encode  # re-encode every output from tmp/, fetch nothing
//   node demo/resources/fetch-jrhodes3d.mjs --force   # re-encode even outputs that already exist
//
// 🔴 IT FETCHES 22,884,538 BYTES FROM SOMEBODY ELSE'S GITHUB EXACTLY ONCE, AND
// EVERY LATER RUN ASKS THAT HOST FOR NOTHING AT ALL. `CLAUDE.md`: *"super
// careful with external sources, better avoid"*. The 67 source files land in
// `tmp/jrhodes3d-mono/`, which is gitignored, so they are not in the repository
// and are not in the deploy. A run that DOES fetch waits a second between files
// and says how many it took. `demo/resources/fetch-fluidr3-piano.mjs` is the
// same shape and has the same rule at the top of it.
//
// ⚠️ NO HARNESS EVER RUNS THIS AND NO PAGE EVER FETCHES FROM THAT HOST. The
// outputs are committed. Deleting all of them and running this once rebuilds
// every one, which is the only thing that makes the encode arguable later.
//
// ── WHAT IT IS ──────────────────────────────────────────────────────────────
//
// Jeff Learman's jRhodes3d, MONO set: his own 1977 Rhodes Mark I Stage 73,
// recorded around 2006 directly from the harp connector, 15 notes, five
// velocity layers about 3 dB apart, 44.1 kHz 16 bit FLAC.
// `research/rhodes-packs-2026-09-23.md` surveyed every free Rhodes there is and
// found this to be the only real one worth building on.
//
// 🔴 THE MONO SET IS THE RECORDING AND THE TWO STEREO SETS ARE NOT. DOCUMENTED,
// his own README: *"The stereo effect is a mild pitch-shift doubling to create a
// stereo image"*. That is an effect a browser can apply for nothing, and buying
// it in the bytes costs 1.66 times the mono set. So this takes the mono.
//
// ── THE LICENCE, WHICH IS SETTLED AND IS NOT A JUDGEMENT CALL HERE ──────────
//
// CC BY-NC-SA 4.0. positron.studio is a personal, non-commercial research site,
// which is what the NC term permits. What the licence REQUIRES is attribution
// and share-alike, and both ship beside the files: `demo/nola/LICENSE-jrhodes3d`
// carries his name, the source repository, the canonical licence URL and the
// fact that these outputs are TRIMMED AND RE-ENCODED derivatives rather than his
// originals, under the same licence.
// ⚠️ THE UPSTREAM LICENCE FILE CONTRADICTS ITSELF and that is recorded rather
// than smoothed over: `sfzinstruments.github.io/pianos/` lists jRhodes3d as
// `CC-BY-NC-4.0`, the repository LICENSE summary line says `CC BY-NC`, and
// `research/rhodes-packs-2026-09-23.md` §2 and §3 have the whole of it. The
// upstream text is copied verbatim into the licence file so a reader can check
// rather than take this comment's word for it.
//
// ── WHAT THE ENCODE DOES, AND WHY EACH PART OF IT ───────────────────────────
//
// 🔴 THE TRIM WAS ASKED FOR AND IT MOVED NOTHING, BECAUSE THE ONSET IS AT
// SAMPLE ZERO ON ALL 65 FILES. `plans/plan-nola.md` §3.4 MEASURED pre-echo on
// this machine and found it lives in the few milliseconds BEFORE an attack, so
// the repair is to trim to just before the onset and fade in over 2 to 5 ms.
// MEASURED here on every source: there is nothing in front of the attack to
// throw away. The author already did it.
// ⚠️ AND THE FADE IN HAD TO COME OFF WITH IT RATHER THAN BEING LEFT IN AS A
// HARMLESS EXTRA. MEASURED on `A_062__D4_5`, which reaches 85 per cent of its
// peak inside the first millisecond: a 3 ms fade from sample 0 took the first
// millisecond from 0.5985 to 0.1932, which is **9.8 dB off the attack of the
// hardest note in the set**. The code fades in over whatever lead it kept, and
// on this set that is zero.
//
// 🔴 AAC IN m4a AT 96 kbps, MONO, 44.1 kHz. Two independent reasons, both in
// `plans/plan-nola.md` §3.4: AAC is about 18 dB better than Opus on pre-echo at
// the same bitrate, and it is the only container with no Safari question mark
// (`smplr`'s own source: *"Safari reports it can play OGG but decodeAudioData
// fails on many samples"*).
// ⚠️ AND NOBODY HAS RUN `decodeAudioData` ON ANY OF IT. That claim is still
// somebody else's production bug rather than a measurement from this desk.
//
// 🔴 A 4 SECOND CAP, WITH AN 8 ms FADE OUT SO A CUT NOTE DOES NOT CLICK. The
// research file's §5.1 prices all five layers at 2.86 MiB there, against 10.20
// MiB uncapped. ⚠️ A cap is the crude version of the level trim
// `plans/plan-nola.md` §3.5 argues for, and it is what is shipped here because
// it can be reasoned about from one number. The fade out is applied at the real
// end of every output, capped or not, because a naturally decayed tail costs
// nothing to fade and a truncated one clicks without it.
//
// 🔴 THERE ARE NO LOOP POINTS IN THIS SET AND THAT WAS CHECKED RATHER THAN
// ASSUMED. `research/rhodes-packs-2026-09-23.md` §3.1 measured a `smpl` chunk
// with one loop in every file of the CC0 WAV subset, and that subset comes from
// jRhodes3**c**, the LOOPED set. This is 3**d**. MEASURED on all 65 sources:
// the metadata blocks are STREAMINFO, SEEKTABLE, VORBIS_COMMENT and PADDING,
// there is no APPLICATION block carrying a foreign `riff` chunk, and the bytes
// `smpl` appear nowhere in any file. `loopOf()` re-checks it on every run and
// the answer is recorded per file.
// ⚠️ SO THE CAPABILITY LEFT ON THE TABLE IS THE CHOICE OF SET, NOT THE CAP.
// jRhodes3c is looped, is the same instrument, and is **5,970,448 bytes of
// source against this set's 22,884,538**. A looped note sustains for as long as
// a key is held out of about five seconds of audio, and `AudioBufferSourceNode`
// already has `loop`, `loopStart` and `loopEnd` in seconds. Nothing here
// implements looping, and this script would not be the place: it would be a
// different fetch of a different set.
//
// ── WHERE THE OUTPUTS GO, AND THIS IS A 404 THIS REPOSITORY HAS SHIPPED ─────
//
// 🔴 FLAT IN `demo/nola/`, NEVER IN `demo/nola/rhodes/`. `workers/view/build.mjs`'s
// `demoFiles()` enumerates ONE directory level under `demo/<slug>/` and filters
// to a set of web extensions. `.m4a` is in that set; a SUBDIRECTORY IS NOT
// WALKED. A pack under `demo/nola/rhodes/` would be declined by the deploy in
// silence and 404 in production, which is the `manifest.webmanifest` failure
// that build file already records twice.
// The names are `rhodes-<midi zero padded to 3>-<layer>.m4a`, which cannot
// collide with the 30 FluidR3 piano files named `<midi>.mp3`.
````

<a id="resources-107"></a>
## resources-107: demo/resources/fetch-jrhodes3d.mjs, module, line 118

````js
/**
 * 🔴 THE 15 NOTES ARE THE AUTHOR'S, NOT A CHOICE MADE HERE. He calls it
 * *"sampling every 4th white key"*. The gaps are 6, 5, 5, 5, 5, 4, 3, 3, 6, 5,
 * 5, 5, 5, 5 semitones, so nearest-neighbour plus `playbackRate` gives a WORST
 * shift of 3 semitones and a typical 2, against Salamander's worst of 1.
 * `research/rhodes-packs-2026-09-23.md` §5.3 has what that costs.
 */
````

<a id="resources-108"></a>
## resources-108: demo/resources/fetch-jrhodes3d.mjs, module, line 127

````js
/**
 * 🔴 FIVE LAYERS, AND THEY ARE NOT FIVE EVERYWHERE. MEASURED in the research
 * file and re-checked here against what actually downloads: layer 3 stops after
 * MIDI 71 and layer 1 after 76, so 65 files rather than 75. The author's
 * reason, from the README: *"Not all layers are full-keyboard width, as higher
 * notes don't change timbre as much."* Layers 2, 4 and 5 are the only three
 * present on all 15 notes, which is what a page has to build its velocity
 * mapping around.
 */
````

<a id="resources-109"></a>
## resources-109: demo/resources/fetch-jrhodes3d.mjs, module, line 149

````js
// seconds kept in front of the onset, WHERE THERE ARE ANY
````

<a id="resources-110"></a>
## resources-110: demo/resources/fetch-jrhodes3d.mjs, module, line 155

````js
/**
 * 🔴 APPLE'S ENCODER, NOT ffmpeg's OWN, AND THE REASON IS A MEASURED +4.1 dB
 * OVERSHOOT. MEASURED 2026-09-23 on ten of these files, source peak against the
 * peak of the decoded output, both in float:
 *
 *   file           source    ffmpeg aac 96k        aac_at 96k
 *   A_062__D4_5    0.7036    1.1301  (+4.1 dB)     0.7047  (0.0 dB)
 *   A_029__F1_1    0.7931    1.0483  (+2.4 dB)     0.7949  (0.0 dB)
 *   A_029__F1_5    0.8549    1.0962  (+2.2 dB)     0.8543  (0.0 dB)
 *   A_065__F4_2    0.8114    0.9712  (+1.6 dB)     0.8068  (0.0 dB)
 *
 * Six of the ten went over with ffmpeg's native encoder and four went over by
 * more than a dB, and the overshoot sits 12 ms after the attack rather than at
 * it. `aac_at` tracked the source peak to within 0.1 dB on every one of the ten
 * for **1.05 per cent more bytes**. INFERRED cause: these files begin with a
 * full amplitude transient at SAMPLE ZERO, with no lead-in at all for the first
 * transform window to work with, which is the hardest thing a transform codec
 * can be handed.
 * ⚠️ `aac_at` IS AudioToolbox AND EXISTS ONLY ON macOS. A machine without it
 * still builds the pack with ffmpeg's own encoder; the run says so on the way
 * past and `PROVENANCE-rhodes.json` records which encoder made the bytes, the
 * same way `demo/grains/defs/PROVENANCE.json` records which machine compiled
 * the synth definitions.
 */
````

<a id="resources-111"></a>
## resources-111: demo/resources/fetch-jrhodes3d.mjs, module, line 199

````js
/**
 * Decode a whole file to mono 16 bit PCM in memory and hand back an Int16Array.
 * ⚠️ IT IS A PIPE AND NOT A TEMPORARY FILE on purpose: the longest source here
 * is 25.0 s, which is 2.2 MB of PCM, and nothing has to be cleaned up after a
 * run that throws.
 */
````

<a id="resources-112"></a>
## resources-112: demo/resources/fetch-jrhodes3d.mjs, module, line 206

````js
  // 🔴 FLOAT AND NOT 16 BIT, AND THE FIRST VERSION OF THIS WAS 16 BIT AND LIED.
  // An AAC decode can come back ABOVE full scale, which is fine in Web Audio and
  // is clamped to exactly 1.0 by an integer decode. Measuring the peak through
  // `s16le` reported `1` on twenty of these files and hid the real number.
````

<a id="resources-113"></a>
## resources-113: demo/resources/fetch-jrhodes3d.mjs, module, line 215

````js
/**
 * 🔴 THE ONSET IS FOUND AGAINST THE FILE'S OWN PEAK AND ITS OWN NOISE FLOOR,
 * NOT AGAINST A FIXED NUMBER. A direct pickup feed has hum and hiss in front of
 * the attack, and a fixed -40 dBFS gate would find the hiss on a loud file and
 * find nothing at all on `A_096__C7_2`, which is the quietest note in the set.
 * The gate is whichever is higher of 1 per cent of the file's peak and 8 times
 * the RMS of its first 20 ms, and a 1 ms moving maximum has to cross it.
 */
````

<a id="resources-114"></a>
## resources-114: demo/resources/fetch-jrhodes3d.mjs, module, line 241

````js
/**
 * 🔴 THERE IS NO LOOP IN THIS SET AND IT WAS CHECKED RATHER THAN ASSUMED.
 * `research/rhodes-packs-2026-09-23.md` §3.1 MEASURED a `smpl` chunk with one
 * loop in every WAV of the CC0 subset, which comes from jRhodes3**c**, the
 * LOOPED set. This is 3**d**, which the author's own index row calls unlooped,
 * and the check agrees: the metadata blocks of every source file here are
 * STREAMINFO, SEEKTABLE, VORBIS_COMMENT and PADDING, with no APPLICATION block
 * carrying foreign `riff` chunks and no `smpl` bytes anywhere in the file.
 * ⚠️ SO NO LOOP CAPABILITY IS BEING LEFT ON THE TABLE BY CAPPING THIS SET. It
 * is being left on the table by choosing 3d over 3c, which is a different
 * decision and is the one worth revisiting: `AudioBufferSourceNode` has `loop`,
 * `loopStart` and `loopEnd` in seconds, and the looped set is 5,970,448 bytes
 * of source against this one's 22,884,538.
 */
````

<a id="resources-115"></a>
## resources-115: demo/resources/fetch-jrhodes3d.mjs, module, line 280

````js
    // ⚠️ THE SOURCE SPELLS ITS BLACK KEYS WITHOUT AN ACCIDENTAL AT ALL, because
    // it samples every 4th white key and there are none among the fifteen. The
    // `replace` is a guard rather than a translation, so that changing NOTES
    // does not silently build a URL that 404s. `fetch-fluidr3-piano.mjs` hit
    // the same class of trap the other way round and its note is worth reading.
````

<a id="resources-116"></a>
## resources-116: demo/resources/fetch-jrhodes3d.mjs, module, line 309

````js
    // ⚠️ AN HTML 404 BODY IS A VALID FILE AND AN INVALID FLAC. Check the magic
    // rather than the status alone, exactly as the FluidR3 script checks for an
    // MPEG sync word.
````

<a id="resources-117"></a>
## resources-117: demo/resources/fetch-jrhodes3d.mjs, module, line 344

````js
  /**
   * 🔴 THE LENGTH IS ROUNDED DOWN TO A WHOLE AAC FRAME, WHICH IS WHAT MAKES
   * *"under the cap"* A FACT RATHER THAN AN ALMOST. An AAC frame is 1024
   * samples and an encoder emits whole ones, so a 4.000 s trim came back as
   * **4.017 s** on all 59 capped files, MEASURED: 176,400 samples of audio is
   * 172.27 frames and the encoder wrote 173. Aligning the trim to 172 frames,
   * 3.9938 s, makes the decoded length come back EXACTLY 176,128 samples.
   * ⚠️ IT COSTS AT MOST 23 ms OFF THE END OF A DECAYING TAIL, behind the 8 ms
   * fade out, and it buys a file whose reported duration needs no footnote.
   */
````

<a id="resources-118"></a>
## resources-118: demo/resources/fetch-jrhodes3d.mjs, module, line 359

````js
  /**
   * 🔴 THE FADE IN IS ONLY AS LONG AS THE LEAD THERE ACTUALLY IS, AND ON THIS
   * SET THAT IS ZERO. MEASURED on all 65 sources: the onset is at sample 0 on
   * every one of them, because the author already trimmed to the attack. So
   * `plans/plan-nola.md` §3.4's *"trim a few ms before the onset"* repair has
   * been done upstream and there is no pre-echo region left to discard.
   * ⚠️ AND APPLYING THE FADE ANYWAY WOULD HAVE BEEN A DEFECT RATHER THAN A
   * NO-OP. MEASURED on `A_062__D4_5`, which reaches 85 per cent of its peak
   * inside the first millisecond: a 3 ms fade from sample 0 took the first
   * millisecond from **0.5985 to 0.1932, which is 9.8 dB off the attack**, and
   * the first 5 ms from 0.7036 to 0.6004. A fade is protection for a lead-in.
   * With no lead-in it is just an envelope over the hardest part of the note.
   */
````

<a id="resources-119"></a>
## resources-119: demo/resources/fetch-jrhodes3d.mjs, module, line 380

````js
      // ⚠️ THE FADE OUT IS APPLIED WHETHER OR NOT THE CAP CUT ANYTHING. 59 of
      // the 65 are cut at 4 s and click without it; the other six end on a
      // decayed tail where 8 ms of ramp is inaudible and costs nothing. One
      // rule beats a conditional that has to be right about which file is which.
````

<a id="resources-120"></a>
## resources-120: demo/resources/fetch-jrhodes3d.mjs, module, line 394

````js
  // 🔴 EVERY OUTPUT IS PROBED AND DECODED BACK, ON EVERY RUN, INCLUDING THE
  // ONES THIS RUN DID NOT MAKE. An encode that went wrong is silent: the file
  // exists, the build copies it, and the page plays four seconds of nothing.
  // The peak here is the peak of the ENCODED audio, which is the number
  // `/nola/`'s `SAMPLE_PEAK` has to be set from.
````

<a id="resources-121"></a>
## resources-121: demo/resources/fetch-jrhodes3d.mjs, module, line 423

````js
    // 🔴 RMS OVER THE FIRST SECOND, WHICH IS THE NUMBER THE PEAK HIDES. These
    // files are roughly peak normalised, so the peak says almost nothing about
    // how loud a layer is. See `levelWarning`.
````

<a id="resources-122"></a>
## resources-122: demo/resources/fetch-jrhodes3d.mjs, module, line 449

````js
/**
 * 🔴 THE VELOCITY SPLIT IS THE ONE THING A PAGE CANNOT GUESS, AND THE AUTHOR
 * SHIPPED IT. Parsed out of `_jRhodes3d-mono-flac.sfz` rather than transcribed,
 * so it cannot drift from the file it came from.
 * 🔴 AND THE LAYER NUMBERS RUN BACKWARDS FROM WHAT THE NAME SUGGESTS: `_5` IS
 * THE SOFTEST AND `_1` IS THE HARDEST. The first `<group>` in his file is
 * `lovel=1 xfout_lovel=25 xfout_hivel=60` and every region in it is a `_5`.
 * Anybody who reads `layer 5` as `hardest` builds a keyboard that gets quieter
 * the harder it is hit, and nothing about the file names says otherwise.
 * ⚠️ HE ALSO SHIPS THE FALLBACK FOR THE LAYERS THAT STOP. In the `_3` group the
 * regions above MIDI 71 name `_4` files, and in the `_1` group the regions
 * above 76 name `_2` files. So where a layer is absent the author reuses the
 * nearest one that exists, which is DOCUMENTED rather than a policy invented
 * here. `regions` below is what he actually wrote, file by file.
 */
````

<a id="resources-123"></a>
## resources-123: demo/resources/fetch-jrhodes3d.mjs, module, line 465

````js
  // ⚠️ THE CANONICAL FILE AND NOT THE ONE BESIDE THE SAMPLES. Both were fetched.
  // `_jRhodes3d-mono-flac.sfz` maps C1 to F7 and this one maps **A0 to C8**, all
  // 88 keys, which is the author's own answer to what to do above his highest
  // sample. It also writes `lovel` AND `hivel` on every group rather than
  // leaving them implied.
````

<a id="resources-124"></a>
## resources-124: demo/resources/fetch-jrhodes3d.mjs, module, line 506

````js
    // 🔴 NO `volume`, NO `amp_velcurve` AND NO `amp_veltrack` ON ANY GROUP OR
    // REGION, checked by exhaustion. The only level opcode in the file is the
    // master's +6 dB. So the recordings carry TIMBRE and the player is expected
    // to supply the LEVEL from velocity, which is what `/nola/`'s `velGain`
    // already does. See `levelWarning` in the top level of this record.
````

<a id="resources-125"></a>
## resources-125: demo/resources/fetch-jrhodes3d.mjs, module, line 518

````js
/**
 * 🔴 THE THING THE PAGE WILL GET WRONG IF NOBODY TELLS IT, MEASURED RATHER THAN
 * ASSUMED. `plans/plan-nola.md` and `demo/nola/index.html` both carry the
 * FluidR3 finding that *"the recordings are 21 dB down and the page has to make
 * that up"*. THIS SET IS THE OPPOSITE: it sits at the top of the scale, median
 * peak 0.82 and 29 of 65 files within 1 dB of full scale.
 * 🔴 AND THE PEAK IS THE WRONG NUMBER HERE, WHICH IS THE PART THAT BITES. These
 * files are roughly peak normalised, so the five velocity layers of one note all
 * peak in the same 2 to 4 dB band while their RMS over the first second differs
 * by up to 10 dB IN THE WRONG DIRECTION: at MIDI 29 the HARDEST layer is 9.6 dB
 * QUIETER than the softest. A page that switches buffer on velocity and trusts
 * the file to be louder gets a keyboard that goes quiet when it is hit harder.
 * ✅ AND THE AUTHOR'S OWN SFZ SAYS THE SAME THING BY OMISSION, which is why this
 * is a reading of his design rather than a complaint about his files: there is
 * no `volume`, no `amp_velcurve` and no `amp_veltrack` on any group or region,
 * so the recordings carry TIMBRE and the player is expected to supply the LEVEL.
 * `demo/nola/index.html`'s `velGain` already does exactly that.
 * ⚠️ THE CROSSOVER STEP IS THE SECOND HALF OF IT. Switching layer at a velocity
 * boundary changes the RMS by a median of 1.5 dB and by as much as 4.4 dB, which
 * is why the author crossfades rather than switching. The ranges to crossfade
 * over are in `velocity.groups`.
 */
````

<a id="resources-126"></a>
## resources-126: demo/resources/build-held-in-human.mjs, module, line 1

````js
// Builds `demo/resources/held-in-human.json`, the machine readable form of the
// Held in Human score.
//
//   node demo/resources/build-held-in-human.mjs          # writes held-in-human.json
//   node demo/resources/build-held-in-human.mjs --check  # prints the running order, writes nothing
//
// NODE ONLY. Never shipped to a browser, never imported by a page.
//
// 🔴 IT IS A THIRD KIND OF THING AGAIN, AND THAT IS WHY IT IS ITS OWN FILE.
// Every row of `corpus.json` is a pointer to something somebody else holds.
// Every row of `mimproject.json` points at a file in our own bucket. This file
// holds no pointers and no files: it is ONE text document read and derived
// from, so a picture of the piece can be drawn without re-reading the score.
//
// ⚠️ THIS FILE OPENED WITH "THE PIECE IS SOMEBODY ELSE'S WORK" AND THAT WAS
// WRONG. Corrected 2026-09-20: *"they are in my team, attribution is ok"*, *"i
// mean no attribution"*, *"its a demo for them"*, and on what was asked for,
// *"they asked for parser"*. Held in Human is by Liis Vares and Taavet Jansen,
// produced by elektron.art, 2024, and they are on this team. **The page does
// not credit them**, because a demo built FOR somebody does not open by telling
// them who they are, and the attribution check that used to enforce it is gone.
//
// 🔴 WHAT IS STILL SOMEBODY ELSE'S: THE TEXT. The intro and the outro are Ene
// Mihkelson, translated by Miriam Anne McIlfarick-Ksenofontov, and neither is
// on the team. The texts are quoted and never rewritten, and the page names
// them in its log because it RENDERS that text rather than merely referring to
// it. That half of the old paragraph was right and it stays.
//
// 🔴 AND WHAT WAS ASKED FOR IS A PARSER, WHICH IS THIS FILE RATHER THAN THE
// PAGE. The score is one text document, and everything downstream is derived
// from it rather than typed: the scene order from its own three orderings, the
// durations from its parameters or from summing its content, the events from
// the names of its `time until ...` parameters, the credits from the credits
// block. **The page is a way to see whether the parse is right.** If a choice
// is ever between making the page nicer and making the parse more faithful,
// the parse wins.
//
// WHAT IS DERIVED AND WHAT IS NOT. Nothing that can be read out of the score is
// typed here. The scene order comes from the score's own three orderings, the
// durations from its parameters or from summing its own content, the events
// from the names of its `time until ...` parameters, the credits from the
// credits block. What this file adds is a LABEL on each of those: `stated`,
// `measured` or `absent` for a duration, and an `inference` object wherever the
// reading is ours rather than the score's. An inference is marked in the data,
// not only in prose, because a consumer drawing a picture cannot read prose.
//
// ⚠️ THREE SCENES HAVE NO LENGTH IN THE SCORE AND ONE OF THEM NEVER WILL.
// The intro is a keystroke recording and its length is the sum of its own
// delays. The dialogue is sixteen lines and its length is the sum of their
// times and pauses. The MAZE HAS NOTHING: no duration parameter, and the one
// QandA line with a negative time asks the visitor to walk somewhere. So
// `durationMs` is null there and `durationHow` is `absent`, and a consumer must
// draw "this scene has no length" differently from "this scene is 90 seconds".
// Filling it with a guess would put a number in this file that nobody measured.
//
// ⚠️ AND THE PLACES THE SCORE DOES NOT SETTLE ARE IN `ambiguities`, WITH THE
// ARITHMETIC OF EACH READING RATHER THAN A CHOICE BETWEEN THEM.
````

<a id="resources-127"></a>
## resources-127: demo/resources/build-held-in-human.mjs, module, line 111

````js
// ── the parameter header ────────────────────────────────────────────────────
//
// `name` on one line, its value on the next, comments on `//`, blank lines
// wherever the author felt like one. So the format is an ALTERNATION and
// nothing marks which line is which.
//
// ⚠️ A PARSER THAT CAN LOSE PHASE MUST BE ABLE TO SAY SO. If one value line
// ever goes missing, every pair after it is a name read as a value and a value
// read as a name, and the result is a full table of confident nonsense. The
// check below is cheap and it is the whole reason this is safe: a name has to
// contain a letter and must not parse as a number, a value has to parse as a
// number, a tuple of numbers, or one of the words the LUT parameters take.
````

<a id="resources-128"></a>
## resources-128: demo/resources/build-held-in-human.mjs, module, line 150

````js
// ── the running order, taken from the score's own three orderings ───────────
//
// The score never lists the scenes as an order. It lists them three times AS an
// order and all three agree, so the order is read off the first and the other
// two are used as a check. A check that is never run is a comment.
````

<a id="resources-129"></a>
## resources-129: demo/resources/build-held-in-human.mjs, module, line 174

````js
// ── durations ───────────────────────────────────────────────────────────────
//
// Five are stated. Two are measured out of the score's own content. One is
// absent, and stays absent.
````

<a id="resources-130"></a>
## resources-130: demo/resources/build-held-in-human.mjs, module, line 242

````js
		// Read back out of the parameter map rather than rebuilt from the id,
		// because the score spells `HoldMe` one way in the duration parameter
		// and another in the LUT block, and a reconstructed name would be a
		// string that looks like a citation and is not one.
````

<a id="resources-131"></a>
## resources-131: demo/resources/build-held-in-human.mjs, module, line 271

````js
// ── events ──────────────────────────────────────────────────────────────────
//
// Everything the score writes as `time until <what> in <scene> scene`, plus the
// three spellings it also uses: no `in`, no `scene`, and neither. The scene
// token is resolved against the ids read off the LUT block, so a parameter
// naming a scene that does not exist is a build failure rather than an orphan
// row.
````

<a id="resources-132"></a>
## resources-132: demo/resources/build-held-in-human.mjs, module, line 336

````js
// ── the two channels ────────────────────────────────────────────────────────
//
// Both run the whole piece and neither is a property of a scene: they are step
// data with a ramp into each step. A consumer draws them without knowing which
// scene is which, which is why every point carries its own `from` and `value`
// rather than a scene lookup.
//
// The previous value of the FIRST point is the LAST point's, because the score
// only satisfies its own LUT recommendation if the outro feeds back into the
// transition. That reading is in `ambiguities` and the flag is here.
````

<a id="resources-133"></a>
## resources-133: demo/resources/build-held-in-human.mjs, module, line 372

````js
// ── QandA ───────────────────────────────────────────────────────────────────
//
// `text:seconds:pause`, and an empty text is a SILENCE of a stated length
// rather than a blank to skip. Eight of the twenty four rows are silences and
// one of them is 46.5 seconds long, so dropping them would lose a minute and a
// half of the piece and the reason the last block lands where it does.
````

<a id="resources-134"></a>
## resources-134: demo/resources/build-held-in-human.mjs, module, line 389

````js
		// 🔴 A NEGATIVE TIME IS NOT A DURATION AND IS NOT WRITTEN AS ONE. The one
		// line that carries it is the one that asks the visitor to walk, so the
		// reading is that it holds until she does. `durationMs` is null and the
		// stated value is kept beside it.
````

<a id="resources-135"></a>
## resources-135: demo/resources/build-held-in-human.mjs, module, line 404

````js
// 🔴 MODEL A, AND IT IS AN INFERENCE. The cursor runs down the block once. The
// line with the negative time goes to the maze, which is the only scene with no
// duration and the only one that can wait; the rest fall to the scenes in the
// order the score asks for them. That assignment is OURS, not the score's, and
// every row it produces carries `how: "inferred"`.
````

<a id="resources-136"></a>
## resources-136: demo/resources/build-held-in-human.mjs, module, line 437

````js
		// 🔴 EVERY LINE'S SCENE IS AN INFERENCE, NOT ONLY THE SPARE ONE. The
		// score states how many lines each scene takes and never states WHICH,
		// so the whole assignment rests on the cursor reading in `qanda.model`.
		// Under the alternative every row here shifts by one and the last line
		// is never spoken. A consumer drawing this must be able to see that,
		// which is why the label is on the line rather than only in prose.
````

<a id="resources-137"></a>
## resources-137: demo/resources/build-held-in-human.mjs, module, line 480

````js
// ── keystrokes ──────────────────────────────────────────────────────────────
//
// 13 is Return, 127 is Backspace, everything else is the character typed.
// Replaying it is adding the delays and applying the codes to a buffer, which
// is what makes this the one text in the score that carries a person's timing
// rather than a string.
````

<a id="resources-138"></a>
## resources-138: demo/resources/build-held-in-human.mjs, module, line 551

````js
// ── the other texts ─────────────────────────────────────────────────────────
//
// 🔴 QUOTED, NEVER REWRITTEN. The markup is the author's, the trailing spaces
// are the author's, the `;n,n` suffixes are the author's, and the dash in the
// outro is the author's. Everything here is carried byte for byte and what this
// build adds sits in fields beside it.
````

<a id="resources-139"></a>
## resources-139: demo/resources/build-held-in-human.mjs, module, line 586

````js
// The credits block is one `<br>` separated run. A double break opens a group,
// the first line of a group is its heading and the rest are the entries. That
// is the whole format and it parses cleanly, which is why the names in `meta`
// below are read out of it rather than typed.
````

<a id="resources-140"></a>
## resources-140: demo/resources/build-held-in-human.mjs, module, line 841

````js
			// ⚠️ TWO BASES ARE POSSIBLE AND THEY DISAGREE IN THE FIRST DECIMAL.
			// 306 characters are left on screen and 307 keys were pressed,
			// because six backspaces removed six of the presses. This uses what
			// a reader ends up looking at, and says so, so a number quoted from
			// here cannot be silently compared against one built the other way.
````

<a id="resources-141"></a>
## resources-141: demo/resources/build-corpus.mjs, module, line 1

````js
// demo/resources/build-corpus.mjs — the corpus `/resources/` reads.
//
//   node demo/resources/build-corpus.mjs           # ask every source, write corpus.json
//   node demo/resources/build-corpus.mjs --offline # rebuild from the cache, ask nothing
//   node demo/resources/build-corpus.mjs --only zenodo,commons
//
// Steps, for `--only`: zenodo · fng · commons · musicbrainz · wikidata ·
// archive · europeana · digi · vandal · lahteilla · crossref · discogs ·
// openalex · byname.
//
// NODE ONLY. Never shipped to a browser, never imported by the page.
//
// 🔴 THE WORD `kurenniemi` IN THIS FILE IS A SUBJECT, A HOST PATH AND A FILTER,
// AND A RENAME ONCE TURNED TWELVE OF THEM INTO `resources`. MEASURED on
// e5a8ad9, which renamed the DEMO from `kurenniemi` to `resources` and matched
// bare words: three filters became `/resources/i.test(…)`, which no archive
// record on earth satisfies, and two live hosts became `lahteilla.fi/resources/`
// and `vandal.ist/kurenniemi/`, which do not exist. The corpus in git was built
// before the rename and looked perfect, so the damage was invisible until
// something re-ran the build: 285 rows instead of 334, with Zenodo keeping 0 of
// 28 and archive.org 0 of 15. LAYOUT.md's rule is the one that was broken here,
// a second time: match a class name or a path, never a bare identifier, and
// syntax-checking proves nothing about a string.
//
// 🔴 REFS, NOT CONTENT. Every row is a POINTER — a title, a date, who holds it,
// its identifier there, one URL, a licence and who asserts it. Nothing is
// mirrored: no audio, no images, no PDFs, no page text. Six of these sources
// send no `access-control-allow-origin` at all — including the Internet
// Archive, which is where a third of this corpus now lives, so the temptation
// to "just keep a copy so the page can read it" is real and is refused here on
// purpose. The page says where a thing lives; the institution keeps it.
//
// 🔴 AND WHERE THE DIARIES ARE IS THE QUESTION THIS FILE WAS ASKED SECOND.
// The first pass had 122 rows and not one of them was a diary, notebook,
// päiväkirja or dagbok, which is a hole in the middle of the subject: the
// whole "In 2048" project is built on them. They exist and they are these,
// in descending order of how much of them you can actually see:
//   · FIVE PAGES, PHOTOGRAPHED — 1975-01-09, 1975-06-30 twice (the original and
//     the version he typed up), and two from 1986. On `lahteilla.fi`, which is
//     DNS-dead; four thumbnails and one 2.6 MB readable page survive in the
//     Internet Archive.
//   · `Audio Diary C4008-1 (1971)` — printed in full as a chapter of the 2015
//     MIT Press volume, DOI 10.7551/mitpress/10014.003.0008. Paywalled.
//   · The PAPER VOLUMES, "from the early 1970s to 2005" — described by the
//     holder and NOT DIGITISED. The description is itself only in the Wayback
//     Machine now.
//   · 100 DIGITISED CASSETTES of his spoken diary, 1970–1975 — counted by
//     Constant for dOCUMENTA (13) and published by nobody.
//   · An APPLE NEWTON diary, each entry stamped with a date and time — read by
//     Constant's scripts, never published.
//   · 3986 timestamped photo files, which is the same project in pictures.
// The three National Gallery fonds records list `diaries / päiväkirjat /
// dagböcker` among their subjects and describe the contents in a sentence, and
// that was in the bulk dump from the first run — unread, because nothing
// printed the keywords. The item-level finding aid is behind the API key: the
// twenty child records the fonds point at are not in the open dump and
// `GET /api/v1/objects/{id}` answers 403 for every id including ones that are.
//
// ⚠️ EVERY STATUS IN THE OUTPUT WAS OBSERVED, NOT ASSUMED. `ask()` records the
// code and the `access-control-allow-origin` header of the request that
// actually produced each row, and a source that could not be reached is written
// into the file WITH ITS STATUS rather than dropped. A dropped source and a
// source with nothing in it look identical in a finished list, and only one of
// them is a finding. `httpFrom` says which request the code belongs to:
// `listing` (the query that returned this row among others) or `url` (this
// row's own address, asked for by name).
//
// ⚠️ AND A COUNT THAT IS TOO TIDY IS A BROKEN COLLECTOR. Five of these
// endpoints will answer 200 with a result that is silently wrong if you ask
// them slightly wrong — the National Library's search returns ALL 2.6 million
// bindings when `queryTargetsOcrText` is left out, Europeana's unquoted
// `Kurenniemi` returns a guitarist and a building, archive.org's search returns
// a bicycle bell, OpenAlex's returns a paper on fungi growing in a Karelian
// nature reserve that happens to be CALLED Kurenniemi, and the Wayback capture
// of the timeline page this whole archive was built around is an empty frame,
// because its contents load with JavaScript the crawler never ran. Each of
// those is filtered or worked around here BY A STATED RULE, and the rule is in
// a comment beside it, so a future run that returns a different number can be
// told apart from a future run that asked a different question.
//
// The cache lives OUTSIDE the repo (`$TMPDIR/positron-kurenniemi-cache`, or
// `$KUR_CACHE`): the National Gallery's dump is 29 MB gzipped and 275 MB
// expanded, and a 29 MB blob in git to save a one-second download is a bad
// trade. `--offline` re-reads it and asks nothing, which is how the shape of
// the output gets iterated on without hammering anybody's archive.
````

<a id="resources-142"></a>
## resources-142: demo/resources/build-corpus.mjs, module, line 110

````js
// 🔴 AND AN `Origin` HEADER, BECAUSE WITHOUT ONE THIS IS NOT A CORS TEST.
// MEASURED 2026-09-15, the same URL, one header apart: `api.europeana.eu`
// answers with NO `access-control-allow-origin` to a bare GET and with
// `access-control-allow-origin: *` when an Origin is sent — it says
// `vary: Access-Control-Request-Method` and means it. The first run of this
// script recorded Europeana as browser-unreadable, which is the exact shape of
// measuring the quantity next to the one in question: a browser ALWAYS sends
// Origin on a cross-origin fetch, so a probe that does not is answering a
// question nobody asked. Every request below carries it, and `cache-v2` in the
// keys exists to throw away the answers gathered before it did.
````

<a id="resources-143"></a>
## resources-143: demo/resources/build-corpus.mjs, module, line 124

````js
// 🔴 THE PAGE'S OWN CAP, TYPED HERE SO THE TWO CANNOT DISAGREE. `index.html`
// passes this number to `createTable` and this file refuses to write a corpus
// larger than it. A table drawing fewer rows than the file holds is a page
// reporting a smaller archive than was found, with nothing on screen saying so.
````

<a id="resources-144"></a>
## resources-144: demo/resources/build-corpus.mjs, module, line 133

````js
/**
 * One request, and a record of how it went.
 *
 * The status is a NUMBER when the host answered and a STRING when it did not
 * (`DNS ENOTFOUND`, `NETWORK ECONNRESET`). Both are written into the output as
 * they are: "the host does not exist" and "the host said 403" are different
 * facts, and flattening them to `null` loses the one that is interesting.
 */
````

<a id="resources-145"></a>
## resources-145: demo/resources/build-corpus.mjs, module, line 149

````js
        // ⚠️ A FAILURE IS CACHED TOO, AND ONLY ITS META. A host that does not
        // resolve returns no body, so a cache keyed on the body having arrived
        // would forget the one thing that happened — and the offline rebuild
        // would print `NOT CACHED` where the live run had measured
        // `DNS ENOTFOUND`. Not reached and not asked are different answers.
````

<a id="resources-146"></a>
## resources-146: demo/resources/build-corpus.mjs, module, line 161

````js
  // ⚠️ RETRY ONLY WHAT SAYS "COME BACK LATER". MusicBrainz answers 503 with a
  // plain `{"error":"…server is currently busy…"}` under load and 200 on the
  // third try, measured 503/503/200 today — so a single attempt reports "this
  // source has nothing" about a source that has five releases in it. A 403 or a
  // 404 is an answer, not a wobble, and is never retried.
````

<a id="resources-147"></a>
## resources-147: demo/resources/build-corpus.mjs, module, line 175

````js
      // ⚠️ `content-length` IS THE ONLY WAY TO SEE WHAT CROSSED THE WIRE.
      // `fetch` decompresses gzip and drops `content-encoding`, so
      // `body.length` is the EXPANDED size — which is how the first run of this
      // script recorded the National Gallery's dump as "274 MB gzipped", nine
      // times its actual 29 MB, from a number that was perfectly real and was
      // measuring the other end of the same pipe.
````

<a id="resources-148"></a>
## resources-148: demo/resources/build-corpus.mjs, module, line 211

````js
/**
 * A licence's NAME, and separately the string the source gave.
 *
 * ⚠️ THIS IS A LOOKUP, NOT A SHORTENING, and the difference matters enough to
 * say: `https://creativecommons.org/publicdomain/mark/1.0/` IS called Public
 * Domain Mark 1.0, so writing that is faithful, while cutting
 * `CC BY-NC-SA 4.0` down to fit a column would produce the name of a DIFFERENT
 * licence with different terms. Anything unrecognised is passed through
 * untouched rather than guessed at — `not stated` and `unknown` are answers.
 */
````

<a id="resources-149"></a>
## resources-149: demo/resources/build-corpus.mjs, module, line 236

````js
/**
 * ⚠️ A CATALOGUE THAT ALLOWS CORS AND A FILE HOST THAT DOES NOT ARE THE SAME
 * SOURCE AND DIFFERENT ANSWERS. Zenodo's API and Zenodo's file endpoint are
 * two hosts' worth of policy; archive.org serves audio with `ACAO: *` and
 * redirects video to a node that has none. A page that can read the LIST and
 * not the FILE looks broken in a way the catalogue's headers cannot predict, so
 * one file per source gets a real Range request and the answer is written into
 * the ledger beside the catalogue's.
 */
````

<a id="resources-150"></a>
## resources-150: demo/resources/build-corpus.mjs, module, line 257

````js
// ── dates ───────────────────────────────────────────────────────────────────
//
// ⚠️ THE DATE IS WRITTEN THE WAY THE SOURCE WROTE IT, AND THE BRACKET IS
// COMPUTED FROM IT. A bare `1966` becomes the whole of 1966, not 1 January
// 1966 — the difference between those two is the whole reason this corpus
// carries `precision` at all, and a source that pads a year to a day silently
// (ERR does; the National Library's `k` rows do, which is why its own flag is
// the only thing that saves them) is the failure this is written against.
//
// `latest` is EXCLUSIVE: the first instant the thing is already over. A year
// that runs to 1974-01-01T00:00 covers 1973, and a reader that wants the last
// year it touches subtracts a millisecond first.
````

<a id="resources-151"></a>
## resources-151: demo/resources/build-corpus.mjs, module, line 299

````js
/**
 * Wikimedia's date field carries a literal QuickStatements qualifier —
 * `+1971-01-00T00:00:00Z/10` — where the trailing integer is Wikidata's
 * precision ladder (11 day / 10 month / 9 year). It is the same ladder
 * `proto/deck/ingest.mjs` already decodes, arriving through a different
 * door, and it is DECLARED rather than inferred, which is the whole point.
 */
````

<a id="resources-152"></a>
## resources-152: demo/resources/build-corpus.mjs, module, line 320

````js
/**
 * A FINNISH ARCHIVIST'S DATE, WHICH IS NOT ISO AND IS NOT ALWAYS A POINT.
 *
 * The Central Art Archives' own catalogue text dates its Kurenniemi items in
 * eleven distinct written forms, counted rather than remembered: `1953`,
 * `1953-04-07`, `30-06-1975` (day first), `1976-11`, `1950-luku` (the 1950s),
 * `1950-luvun puoliväli` (mid-1950s), `1960-luvun alku` / `1970-luku,
 * alkupuoli` (early), `1960-luvun loppu` / `1960-luku, loppupuoli` (late),
 * `1975 jälkeen` (after 1975), `1963-2005` (a span) and `1992-00-00` — a zero
 * month and a zero day, which is an explicit "not known", the same honest-null
 * shape the Constant mirror uses.
 *
 * 🔴 THE QUALIFIER IS RECORDED AND THE BRACKET IS NOT NARROWED BY IT.
 * `1950-luvun puoliväli` really does say something `1950-luku` does not — but
 * "mid" has no defined width, and choosing one (1953–1957? 1954–1956?) would
 * put a number in the file that the archivist never wrote. The bracket stays
 * the whole decade, `precision` says `decade`, and the qualifier goes into the
 * note in the archivist's own words. A wider bracket is a weaker claim; a
 * narrower one made up here is a wrong claim that reads as a measurement.
 *
 * `jälkeen` ("after") closes at 2018 — the January after he died — because a
 * thing in his personal archive cannot be from after him. That IS an
 * inference, so it is stated in the note rather than hidden in the number.
 */
````

<a id="resources-153"></a>
## resources-153: demo/resources/build-corpus.mjs, module, line 362

````js
  // `1994, 2003-09-30` — two dates, which the archivist wrote because both are
  // true of the object. The bracket spans them.
````

<a id="resources-154"></a>
## resources-154: demo/resources/build-corpus.mjs, module, line 400

````js
// ── 0. what is already gathered: proto/deck/corpus.json ─────────────────
//
// ⚠️ ONE GATHERING, NOT TWO. The 22 rows the deck plays from are not
// re-researched here — their dates carry evidence this script has no way to
// re-derive (a filename year, a compilation's span, Wikidata's declared
// precision, a page of Ojanen's thesis) and a second opinion about them would be
// a second opinion that drifts. They are read in, converted to this file's
// shape, and their source file is recorded in `inputs` with ITS generation date,
// so a stale fold is visible in the output rather than invisible in it. The page
// checks the same thing from the other end: it fetches both files and asserts
// every id in the deck's list is in this one.
//
// 🔴 AND IT CARRIES THE TWO SENTENCES, WHICH IT DID NOT UNTIL 2026-09-15.
// `when.note` (why the bracket has this width) and the row's own `note` (what
// the record is) were both dropped on the way through, so eleven readings of a
// named source arrived here as bare numbers with a slug. That is how fourteen
// corrections ended up hand-written into this generated file: there was nowhere
// upstream for the prose to ride. Both fields fold now, and `/resources/` shows
// them.
````

<a id="resources-155"></a>
## resources-155: demo/resources/build-corpus.mjs, module, line 465

````js
// ── the thesis pass, and where its other half lives ─────────────────────────
//
// 🔴 FOURTEEN DATES IN THIS FILE REST ON A BOOK, AND A BOOK HAS NO API.
// Mikko Ojanen's PhD reads eleven of these tapes off named pages and corroborates
// three museum objects against its instrument table. Nothing above can harvest
// that: there is no field at archive.org, no statement at Wikidata and no
// literal at Europeana that carries a printed page number. The values were once
// hand-edited into this generated file and would have been erased by the next
// run of it.
//
// They arrive by TWO DOORS now, and each value lives in exactly one place.
// TWELVE fold in from the deck, where `proto/deck/ingest.mjs` holds them beside
// the rule that made every other bracket in that file. TWO are National Gallery
// rows, harvested here from a bulk dump with no hand-editable upstream at all,
// so they are here. The count is checked at the end: a build that assembles any
// other number than fourteen refuses to write.
//
// ⚠️ THESE TWO MOVE NO DATE. Table 3 (printed p. 81) agrees with the year the
// catalogue already states, and a value that did not change with a confidence
// that did is the only kind of corroboration worth recording.
````

<a id="resources-156"></a>
## resources-156: demo/resources/build-corpus.mjs, module, line 501

````js
  // ⚠️ ZENODO SEARCHES THE FULL TEXT, SO FOUR OF THE TWENTY-EIGHT HITS ARE NOT
  // ABOUT HIM — two copies of a paper called `Memory in the digital age`, one on
  // student sport in harsh weather, and one M.Sc thesis on train weighbridges.
  // The rule is that the record's own metadata has to name him; what it costs is
  // NAMED in the ledger rather than quietly dropped, because the thesis is by
  // Risto Rautee, who co-founded Digelius with him, and a reader may well want
  // it back.
````

<a id="resources-157"></a>
## resources-157: demo/resources/build-corpus.mjs, module, line 527

````js
      // A record with exactly one file gets a direct address for it; a record
      // with several gets its own page, because picking one of thirty-seven
      // TIFFs to be "the" file would be a choice nobody made. `count` says how
      // many are behind the row either way, so nothing is hidden by the rule.
````

<a id="resources-158"></a>
## resources-158: demo/resources/build-corpus.mjs, module, line 544

````js
        // The extension, not the header: Zenodo answers `application/octet-stream`
        // for every file it holds, which is honest about how it stores them and
        // useless for deciding whether a browser can play one. `mediaCheck`
        // records what the header actually said, once, in the ledger.
````

<a id="resources-159"></a>
## resources-159: demo/resources/build-corpus.mjs, module, line 578

````js
// ── 2. Finnish National Gallery ─────────────────────────────────────────────
//
// ⚠️ A BULK DUMP, NOT A QUERY ENDPOINT. `?limit=2` is ignored and the whole
// collection comes back — 89,072 records, 29 MB gzipped, 275 MB expanded — so
// the Kurenniemi rows are filtered HERE. That is also why this one is cached:
// asking a national museum for a quarter of a gigabyte to re-render a table is
// not a thing to do twice.
````

<a id="resources-160"></a>
## resources-160: demo/resources/build-corpus.mjs, module, line 601

````js
  // The rule: a record whose JSON mentions the name anywhere. It catches the
  // fonds, the films, the instruments, the concert recordings AND the portrait
  // of him painted by somebody else — which belongs here, because the question
  // is what the institution holds about him, not what he made.
````

<a id="resources-161"></a>
## resources-161: demo/resources/build-corpus.mjs, module, line 636

````js
             // ⚠️ WHAT THE FONDS SAYS IT CONTAINS IS THE ANSWER TO "ARE THE
             // DIARIES IN THIS?" — and it was in the dump all along, unread.
             // The keyword list on 101, 5690185 and 6092302 carries `diaries /
             // päiväkirjat / dagböcker` in three languages, and the description
             // spells it out. Naming the material groups here is what turns
             // three rows that stand for 33 shelf metres into rows a reader can
             // interrogate.
````

<a id="resources-162"></a>
## resources-162: demo/resources/build-corpus.mjs, module, line 652

````js
  // 🔴 THE HIERARCHY IS BROKEN IN BOTH DIRECTIONS, AND SAYING SO IS THE ROW.
  // `6092302` (AV materials, series 11 of the fonds) declares `parents:
  // [5690185]`; `5690185` does NOT list it among its eight children. So the
  // open dump disagrees with itself about what is inside the archive, and the
  // series numbering — `KG-ARK-THAA106-S-11` — says there are at least eleven
  // series of which exactly one is published. Counting the dangling ids is the
  // only measurement of how much is described and unreachable.
  //
  // ⚠️ THE TWO FONDS' CHILDREN, NOT EVERY DANGLING CHILD ON EVERY RECORD. The
  // first version of this row counted 28 and called them "series and item
  // records inside the two fonds" — but eight of those belong to the artwork
  // `Winterreise` and to `Dimi-O`, which are objects in Kiasma and not part of
  // the archive at all. A count that sweeps up whatever matches is a count that
  // describes something other than its own title.
````

<a id="resources-163"></a>
## resources-163: demo/resources/build-corpus.mjs, module, line 509

````js
// ── 3. Wikimedia Commons ────────────────────────────────────────────────────
//
// ⚠️ THE CATEGORY, NOT THE SEARCH. A free-text search for `Kurenniemi` in the
// file namespace returns eleven files, of which five are him: the others are
// his relative Marjatta, a guitarist called Mikko, a lighthouse, an 1878
// newspaper and a divisibility lattice. Filtering those out by reading the
// titles would be this script's editorial opinion; asking for the members of
// Commons' own `Category:Erkki Kurenniemi` is the institution's.
````

<a id="resources-164"></a>
## resources-164: demo/resources/build-corpus.mjs, module, line 618

````js
        // ⚠️ NOT THE RELEASE DATE. MusicBrainz reports 2002 for all eleven,
        // which is when the CD came out, not when the tape was made. Writing
        // 2002 here would be a confident wrong answer where none is a true one.
````

<a id="resources-165"></a>
## resources-165: demo/resources/build-corpus.mjs, module, line 632

````js
  // The WORK is the composition, which is a different thing from a recording of
  // it and from the disc it came out on — MusicBrainz keeps all three and only
  // the work has a stable identity across the eleven tapes, the 2002 CD and the
  // 2013 reissue. Three of them exist.
````

<a id="resources-166"></a>
## resources-166: demo/resources/build-corpus.mjs, module, line 660

````js
  // ⚠️ THE 60 RECORDINGS ARE NOT ENUMERATED, AND THE REASON IS IN THE NUMBERS.
  // `ws/2/recording?artist=` answers 60, of which 27 are `[Sähkö-shokki-ilta,
  // part N]` — one 2013 live set chopped into parts by whoever entered it — and
  // most of the rest are second and third catalogue entries for the same eleven
  // tapes already listed above from the compilation's tracklist. Enumerating
  // them would treble MusicBrainz's share of this file with duplicates. The
  // count is stated instead, which is the honest form of "there is more here".
````

<a id="resources-167"></a>
## resources-167: demo/resources/build-corpus.mjs, module, line 684

````js
// ── 5. Wikidata ─────────────────────────────────────────────────────────────
//
// The deck already carries six works and the two life events. This asks the
// query service for everything Wikidata attributes to him by any of seven
// properties, which finds three more — `Computer Music`, `On-Off` and the
// compilation album itself. Rows the deck already has are dropped by id later.
//
// ⚠️ THE PROPERTY LIST IS A CHOICE AND THE THINGS LEFT OUT ARE NAMED. A query
// for EVERY inbound direct claim returns 14 items rather than 10, and the four
// extra are `Madhar Abol Naga` (property: DIFFERENT FROM — a statement that
// something is not him), his mother, his father and his wife. People are not
// things an archive holds, and "different from" is the opposite of a link.
// `P710`, participant in, IS in the list, because dOCUMENTA (13) is where the
// archive project that produced half of this corpus happened.
````

<a id="resources-168"></a>
## resources-168: demo/resources/build-corpus.mjs, module, line 709

````js
  // 🔴 THE KEY CARRIES THE QUERY'S VERSION, BECAUSE THE URL DOES NOT.
  // `ask()` caches on `key` when one is given, and the key was a constant while
  // the SPARQL underneath it changed — so adding P710 to the property list
  // re-ran nothing and the output was byte-identical to the run before it. It
  // looked like Wikidata simply has no P710 statement about him; the same query
  // asked by hand returned dOCUMENTA (13) in one request. A cache key that does
  // not move when the question moves answers the old question forever.
````

<a id="resources-169"></a>
## resources-169: demo/resources/build-corpus.mjs, module, line 748

````js
  // 🔴 THE ITEM'S OUTBOUND STATEMENTS ARE WHERE THE NEXT DIG STARTS, AND THEY
  // ARE NOT ROWS. Wikidata carries 82 statements about him, and about forty of
  // them are external catalogue identifiers — each one a claim that some
  // institution has a record under that number. They are not holdings, so
  // putting them in the list would pad it with pointers to pointers; they are
  // a map of where to look next, so they go in the ledger where somebody
  // planning the next session will read them. Two of them are already load-
  // bearing here: `P1953` gave the Discogs artist id this file harvests from
  // rather than a name search, and `P2977` names Elonet record 117760 — which
  // is the Finnish film catalogue sitting behind the Finna 403 two rows down.
````

<a id="resources-170"></a>
## resources-170: demo/resources/build-corpus.mjs, module, line 785

````js
// ── 6. archive.org ──────────────────────────────────────────────────────────
//
// ⚠️ THE SEARCH RETURNS A BICYCLE BELL. `q=Kurenniemi` finds fifteen items and
// ten of them are other people's podcasts, because the word appears in a
// description somewhere. The rule: the identifier or the title must contain the
// name. It keeps exactly the five Kurenniemi items and no judgement of mine is
// involved in which five.
````

<a id="resources-171"></a>
## resources-171: demo/resources/build-corpus.mjs, module, line 798

````js
  // ⚠️ FIVE ITEMS IS THE WHOLE OF IT, AND THAT IS ASKED RATHER THAN ASSUMED.
  // The free-text query is the widest one there is; the four field queries are
  // the narrow ones. If the collection grew, the field queries would find it
  // first. Each returns its own count into the ledger.
````

<a id="resources-172"></a>
## resources-172: demo/resources/build-corpus.mjs, module, line 860

````js
// ── 7. Europeana ────────────────────────────────────────────────────────────
//
// ⚠️ QUOTE THE NAME. Unquoted, `Kurenniemi` returns eight records and seven are
// a guitarist, a building and a photographer's surname. The phrase query
// returns one, and it is the right one: the surviving DIMI-A in Stockholm.
//
// ⚠️ AND THE THINNESS IS A MEASUREMENT, NOT AN UNDER-QUERY. One row out of an
// aggregator of 50-odd million looks like a badly-asked question, so it was
// asked six ways: the quoted name (1), the bare surname (8), `DIMI Kurenniemi`
// (1), Europeana's own `who:` person field (1), `proxy_dc_creator:Kurenniemi`
// (1) and `Sähkökvartetti` (0). The most any form returns is eight, seven of
// which are a guitarist called Mikko and a Helsinki building. Europeana really
// does hold one Kurenniemi object. The counts are in the ledger so the next
// person does not have to re-run the sweep to believe it.
````

<a id="resources-173"></a>
## resources-173: demo/resources/build-corpus.mjs, module, line 919

````js
// ── 8. the National Library of Finland press index ──────────────────────────
//
// 🔴 THE FIELD THAT MAKES THIS WORK IS `queryTargetsOcrText`. Without it the
// endpoint answers 200 with `totalResults: 2621824` — every binding it has —
// and a collector that believed it would have written "2.6 million Kurenniemi
// mentions" into this file. Measured both ways on 2026-09-15.
//
// The counterpart measurement is the one that matters editorially:
// `includeUnauthorizedResults: false` returns ZERO. Every row is a citation
// with no readable page behind it, and the row says so.
````

<a id="resources-174"></a>
## resources-174: demo/resources/build-corpus.mjs, module, line 938

````js
  // 🔴 ONE WINDOW WAS NOT A MEASUREMENT, IT WAS A SAMPLE — AND IT HID THE
  // THING THAT MAKES THIS SOURCE HONEST. The old row asked 1960–1979 only,
  // reported 1279 citations and 0 readable, and read as "the press index is
  // shut". Asked across its whole range the same endpoint answers 7549, of
  // which 2640 CAN be read — and 2622 of those readable ones are from BEFORE
  // HE WAS BORN. That is not a bonus: it is the proof that this is a SURNAME
  // search over OCR text and not a person search, which no single window could
  // show. His mother Marjatta was a well-known children's author and his father
  // Tauno a physicist; the name is in the Finnish papers for a century before
  // him. One row per window, each with its own two numbers, is the only shape
  // in which that is visible rather than averaged away.
  //
  // ⚠️ THE FIRST WINDOW STARTS AT 1900 AND NOT AT THE INDEX'S OWN START. The
  // binding search goes back to 1771, the first Finnish newspaper, and asking
  // it that way is a true measurement — but the ROW would then bracket
  // 1771–1940, which is a claim about a corpus rather than about a person, on
  // a page whose other 334 rows are about one. The whole-range figure is asked
  // for separately and quoted in the ledger, where prose can say what it is.
````

<a id="resources-175"></a>
## resources-175: demo/resources/build-corpus.mjs, module, line 963

````js
  // ⚠️ A JSON POST NEEDS A PREFLIGHT, SO THE POST'S OWN HEADERS ARE NOT THE
  // ANSWER. A browser asks OPTIONS first and never sends the POST if that is
  // refused — measured 403 here — so this endpoint is unreachable from a page
  // even though the POST itself answers 200 to a script.
````

<a id="resources-176"></a>
## resources-176: demo/resources/build-corpus.mjs, module, line 1033

````js
// ── 9. the Constant / KURATOR mirror ────────────────────────────────────────
//
// 3986 rows of one file each, and the pixels are not in the mirror. One row
// here, with the count read off the page rather than remembered — the page
// prints `N total, starting on record 1` and that N is what goes in `count`.
````

<a id="resources-177"></a>
## resources-177: demo/resources/build-corpus.mjs, module, line 1050

````js
  // 🔴 THE PROJECT'S OWN PAGE ABOUT THE TAPES IS THE ONLY PLACE ANYBODY SAYS
  // HOW MANY AUDIO DIARIES THERE ARE. The mirror kept the sample data and
  // dropped the Data Radio — `vandal.ist/kurenniemi/dataradio/material.html`
  // answers 404, measured — so the page survives only on the dead
  // `kurenniemi.activearchives.org` in the Wayback Machine, where it reads:
  // "Kurenniemi's archive contains 100 digitized cassettes of a period that
  // ranges from 1970 to 1975." That sentence is a finding aid nobody else
  // publishes, and it is two rows below: the cassettes and the Newton diary.
````

<a id="resources-178"></a>
## resources-178: demo/resources/build-corpus.mjs, module, line 1135

````js
// ── 9b. lahteilla.fi, through the Internet Archive ──────────────────────────
//
// 🔴 THIS IS WHERE THE DIARIES ARE, AND THE SITE THAT HOLDS THEM IS DEAD.
// `lahteilla.fi/kurenniemi/` was the Finnish National Gallery's own public
// presentation of the fonds — *Erkki Kurenniemi, Mies tulevaisuudesta* — and it
// does not resolve (`DNS ENOTFOUND`, measured, and already a row in this file).
// The Wayback Machine holds 545 of its URLs, and inside them is the item-level
// digitisation nothing else publishes: photographs of the PAGES OF HIS DIARIES,
// scans of his manuscripts and drafts, his 2003 correspondence with Leena
// Krohn, and a hundred captioned photographs — each with a date an archivist
// typed.
//
// ⚠️ THE ITEMS ARE ON THE KEYWORD PAGES, NOT THE TIMELINE PAGES. The timeline
// the site was built around fills itself with JavaScript the crawler never ran,
// so a capture of `/timelinepage/8` is an empty frame and reads as "the content
// is gone". The 48 `/thing-tags/<keyword>` pages are server-rendered and
// complete, and every item is on at least one of them. Harvesting those and
// de-duplicating on the site's own `thingid` recovers the set.
//
// ⚠️ AND WEB.ARCHIVE.ORG SENDS NO `access-control-allow-origin`. Measured with
// an Origin header on both an HTML page and a JPEG: 200, and no ACAO on either.
// So these rows are `<img>`-able from a page and not readable by `fetch` — the
// same posture as the National Gallery's own API, reached from the other side.
````

<a id="resources-179"></a>
## resources-179: demo/resources/build-corpus.mjs, module, line 1168

````js
// The seven sections the site divides the archive into. Each carries the
// institution's own prose about that part of the fonds, and
// `muistiin-kirjoitettu-elämä` — "a life written down into notes" — is the
// diaries one.
````

<a id="resources-180"></a>
## resources-180: demo/resources/build-corpus.mjs, module, line 1183

````js
  // The CDX index says which of the site's images the crawler actually kept. It
  // is asked ONCE and matched against the img src on each tag page, because the
  // timestamp baked into a rewritten src belongs to the HTML capture and not to
  // the image — following one of those verbatim is a 404, measured.
````

<a id="resources-181"></a>
## resources-181: demo/resources/build-corpus.mjs, module, line 1191

````js
  //
  // 🔴 KEY ON THE FILE, NOT ON THE RENDERING — AND THE DIARIES ARE WHY. Drupal
  // serves one original through several image styles, and the tag pages all
  // link `styles/keyword_thumb/`, which is 150 px square. Matching that path
  // exactly found four of the five diary pages and missed the fifth, because
  // the crawler never took its thumbnail — while it DID take
  // `styles/very_big/public/EK0000056.jpg`, 2.6 MB, which is a diary page you
  // can actually read. Keying on everything after `public/` and keeping the
  // LARGEST capture of each file recovers it, and upgrades several photographs
  // from a thumbnail to the 400 kB rendering beside it.
````

<a id="resources-182"></a>
## resources-182: demo/resources/build-corpus.mjs, module, line 1227

````js
      // The name of the underlying file, which is what `caps` is keyed on. The
      // timestamp in a rewritten src belongs to the HTML capture and not to the
      // image — following one verbatim is a 404, measured — so only the file
      // part of it is used.
````

<a id="resources-183"></a>
## resources-183: demo/resources/build-corpus.mjs, module, line 1241

````js
    // The site's OWN tags decide what kind of object each is — no reading of
    // titles here. `tekstit` (texts), `päiväkirjat` (diaries) and
    // `kirjeenvaihto` (correspondence) are documents, `videot` is a video, and
    // everything else on this site is a photograph.
````

<a id="resources-184"></a>
## resources-184: demo/resources/build-corpus.mjs, module, line 1288

````js
    // ⚠️ THE PROSE IS ONE DIV, AND TAKING THE WHOLE PAGE GETS THE FURNITURE.
    // Stripping the tags off the document and cutting at the menu produced
    // `"Erkki Kurenniemi A documented life Erkki Kurenniemi Muistiin
    // kirjoitettu elämä A documented life Kurenniemen arkisto sisältää…"` —
    // the site name twice and the section title three times, in two languages,
    // ahead of the sentence that matters. Drupal wraps the description in
    // `.timeline-front-content` inside the `<article>`; that div, minus the
    // preview image, IS the description. The English section label opens it and
    // is already in this row's own title, so it comes off the front.
````

<a id="resources-185"></a>
## resources-185: demo/resources/build-corpus.mjs, module, line 1301

````js
    // ⚠️ THE LABEL TO STRIP IS THE PAGE'S OWN, NOT THE ONE IN THE TABLE ABOVE.
    // The site calls this section "Photographs from Erkki Kurenniemi's
    // archives" and the table above calls it "Photographs from his archives";
    // matching on the second left the first standing at the head of the quote.
    // Read it out of `.page-title` and take that off instead.
````

<a id="resources-186"></a>
## resources-186: demo/resources/build-corpus.mjs, module, line 1328

````js
      // 🔴 THE SPAN COMES OUT OF THE SENTENCE, NOT OUT OF A GUESS. The diaries
      // page says "1970-luvun alusta vuoteen 2005" — from the start of the
      // 1970s to 2005 — so that is the bracket, and `how` says where it was
      // read. The other six section pages describe material with no span in
      // them and get NO date rather than the fonds dates borrowed.
````

<a id="resources-187"></a>
## resources-187: demo/resources/build-corpus.mjs, module, line 1348

````js
        // ⚠️ AN EMPTY DESCRIPTION IS SAID IN WORDS, NEVER AS AN EMPTY QUOTE.
        // Two of the seven section pages carry a heading and no text at all,
        // and a bare `""` beside them reads as a collector that dropped
        // something rather than as a page that was always blank.
````

<a id="resources-188"></a>
## resources-188: demo/resources/build-corpus.mjs, module, line 1384

````js
      // 🔴 NO DATE, AND THE REASON IS THE RULE THIS FILE IS BUILT ON. The PDF
      // is not opened — this corpus points at files and never reads them — so
      // the only date available is the crawl timestamp, which dates the COPY
      // and not the publication. Writing that year here would be the
      // archive.org upload-date mistake in a second costume.
````

<a id="resources-189"></a>
## resources-189: demo/resources/build-corpus.mjs, module, line 1423

````js
// ── 9c. Crossref — the book that IS the documentary evidence ────────────────
//
// 🔴 THE MIT PRESS VOLUME WAS ONE ROW SAYING "PAYWALLED", AND INSIDE IT ARE
// TWENTY OF HIS OWN TEXTS, EACH DATED. *Writing and Unwriting (Media) Art
// History: Erkki Kurenniemi in 2048* prints his diaries, essays, drafts and
// interviews as chapters, and the editors put the year of the ORIGINAL document
// in each chapter title — `Audio Diary C4008-1 (1971)`, `Message Is Massage
// (1971)`, `Computer Eats Art (1972–1982)`, `Relative Life (2003)`. Crossref
// registers every one with a DOI and an author list, keyless, `ACAO: *`. So the
// book's table of contents is a dated list of primary sources and it is
// machine-readable — which is the opposite of what "paywalled" suggested.
//
// ⚠️ THE DATE IS THE ONE IN THE TITLE, NOT THE ONE CROSSREF GIVES. Crossref
// says 2015-09-11 for all 36 chapters, which is the day the book came out; a
// row that carried that would date a 1971 diary entry to 2015. The year in the
// parentheses is an editorial statement about the document, made by the
// editors who had the manuscript, and it is the better evidence. Where a title
// has no year the chapter is a modern essay ABOUT him, and it keeps the book's
// date, because for those two facts are the same.
//
// ⚠️ AND SIX ROWS ARE DROPPED BY A NAMED RULE. `Index`, `Contributors`,
// `[ Front Matter ]`, `[ Opening ]`, `Acknowledgments` and `Series Foreword`
// are the apparatus of a book rather than anything held anywhere. They are
// named in the ledger rather than quietly binned.
````

<a id="resources-190"></a>
## resources-190: demo/resources/build-corpus.mjs, module, line 1510

````js
// ── 9d. Discogs ─────────────────────────────────────────────────────────────
//
// MusicBrainz has five releases; Discogs has thirty-four credits on twenty-nine
// distinct releases, keyless and with `ACAO: *`. It is the discography the
// other one is a subset of — the 1967 `Information Explosion`, the 1970 `DIMI 1`
// on Musica, the bootlegs, and the compilations he turns up on.
//
// ⚠️ ONE RELEASE CAN CARRY THREE CREDITS AND IS STILL ONE OBJECT. `Perspectives
// '68` comes back as `Appearance` and as `TrackAppearance`; `Tombstone
// Valentine` as `Appearance` and as `UnofficialRelease`. De-duplicating on the
// release id and keeping the roles in the note is the difference between a
// discography and a padded one.
````

<a id="resources-191"></a>
## resources-191: demo/resources/build-corpus.mjs, module, line 1570

````js
// ── 9e. OpenAlex ────────────────────────────────────────────────────────────
//
// The scholarly literature, including the things neither Zenodo nor Crossref
// carries: the 2023 Hatje Cantz monograph, the Leonardo review, the Nordic
// journal pieces — and `Spontaneous Impulse Activity in Immature Rabbit Brain`
// (Acta Physiologica Scandinavica, 1966), which is the paper he wrote as a
// neurophysiologist and which nothing else in this corpus knew about.
//
// ⚠️ TWO NARROW QUERIES, NOT ONE WIDE ONE. `search=Kurenniemi` returns 243
// works, because it covers the full text of everything. The union of
// `title.search:Kurenniemi` (19) and `author.id:` his own OpenAlex id (16) is
// 33 — and two of those still are not his, for reasons worth reading below the
// filter.
//
// ⚠️ AND DE-DUPLICATED AGAINST WHAT IS ALREADY HERE, BY DOI. Seventeen of the
// 33 are MIT Press chapters Crossref already returned and four are Zenodo
// deposits; emitting them again would put the same text in this file three
// times under three ids. The DOI is the join key and the count of collisions
// goes in the ledger, because a de-duplication nobody is told about cannot be
// told apart from a source that found nothing.
````

<a id="resources-192"></a>
## resources-192: demo/resources/build-corpus.mjs, module, line 1605

````js
    // 🔴 KURENNIEMI IS ALSO A PLACE, AND THE FULL-TEXT INDEX WILL RETURN IT
    // FOREVER. One hit is `New data on aphyllophoroid fungi (Basidiomycota) of
    // the protected areas of the Leningrad Region. XI. Planned protected area
    // «Kurenniemi»` — a Karelian headland, which is where the surname comes
    // from, written in guillemets the way a Russian-language paper names a
    // nature reserve. It is part XI of a series, so parts XII and XIII are
    // coming. Filtering on the topic does not separate them: OpenAlex files the
    // Leonardo review of the Kurenniemi BOOK under Neuroscience, so "drop the
    // natural sciences" would drop a real row and keep the fungi. What DOES
    // separate them is the punctuation — a place is quoted, a person is not.
    // Strip the quoted form and require the name to survive somewhere else.
````

<a id="resources-193"></a>
## resources-193: demo/resources/build-corpus.mjs, module, line 1621

````js
    // ⚠️ AND A RECORD WITH NEITHER A DOI NOR A YEAR IS AN INDEX STUB. OpenAlex
    // holds a second, empty copy of the MIT Press volume with no identifier and
    // no date; a row for it would show the same book twice, once with a dash
    // where its date should be, which reads as a date this collector lost.
````

<a id="resources-194"></a>
## resources-194: demo/resources/build-corpus.mjs, module, line 1675

````js
// ── 10. one-by-one: pages that are their own row ────────────────────────────
//
// Each of these is asked for BY NAME, so its `http` is its own rather than a
// listing's. The four Yle articles are the reason this block exists: they are
// the only Kurenniemi broadcast material anywhere that is known to exist, they
// load, and their media cannot be fetched from outside Finland without a key —
// which is a fact worth a row each rather than a footnote.
````

<a id="resources-195"></a>
## resources-195: demo/resources/build-corpus.mjs, module, line 1715

````js
  // ⚠️ THE STATUS THAT BELONGS TO THIS ROW IS THE DEAD HOST'S, NOT THE WAYBACK
  // COPY'S. `url` is where you can still read it; `probe` is the thing whose
  // answer the row is about, and writing the cache's 200 here would have said
  // the opposite of what happened.
````

<a id="resources-196"></a>
## resources-196: demo/resources/build-corpus.mjs, module, line 1735

````js
  // 🔴 THE DOCUMENTED, KEYLESS REST API IS BLOCKED TOO, AND THAT IS WORTH ITS
  // OWN ROW. "Finna 403s" could have meant "the search page has a bot check and
  // the API is fine" — that is the obvious next thing to try and it is why this
  // was re-attacked. It is not fine. `api.finna.fi/v1/search` answers the same
  // Cloudflare managed challenge, and it does so with this script's user agent,
  // with a desktop Chrome one and with NO user agent at all — three forms, one
  // answer. `elonet.finna.fi` is the same edge and the same 403. So the whole
  // Finnish national discovery layer is shut to this machine, and nobody should
  // spend another hour finding out.
````

<a id="resources-197"></a>
## resources-197: demo/resources/build-corpus.mjs, module, line 1774

````js
  // These hosts are one row each rather than a harvest, so their ledger entries
  // are written from the rows themselves — with the code each one answered.
  //
  // 🔴 ONE LEDGER ENTRY PER SOURCE NAME, AND THIS IS WHERE THAT BROKE. When
  // `lahteilla()` was added, this loop kept writing a SECOND `lahteilla.fi`
  // entry from the dead-host probe, and the two disagreed: one said 200 and one
  // said `DNS ENOTFOUND`, both claiming the same 129 rows. The output looked
  // fine and the page's own check — every source's `items` summing to the row
  // count — would have gone red with the totals off by exactly one source's
  // worth. An entry that already exists is EXTENDED with what the probe found
  // rather than duplicated, because "the host is dead" and "the Internet
  // Archive still has it" are two halves of one fact about one place.
````

<a id="resources-198"></a>
## resources-198: demo/resources/build-corpus.mjs, module, line 1810

````js
// ── run ─────────────────────────────────────────────────────────────────────
//
// ⚠️ ORDER MATTERS FOR EXACTLY ONE STEP AND IT IS DECLARED HERE RATHER THAN
// IMPLIED. `openalex` de-duplicates against the DOIs already gathered, so it
// runs after `crossref` and `zenodo` and is handed the id set. Everything else
// is independent; a step is free to move.
````

<a id="resources-199"></a>
## resources-199: demo/resources/build-corpus.mjs, module, line 1840

````js
// 🔴 A DUPLICATE ID IS A ROW THAT SILENTLY REPLACES ANOTHER ONE IN EVERY MAP
// DOWNSTREAM, AND THE PAGE WOULD STILL READ GREEN. Two harvesters can reach the
// same object by different doors — Crossref and OpenAlex both key on the DOI —
// so the collision is checked for rather than assumed away, and it is a hard
// failure because there is no sensible thing to do with the second copy.
````

<a id="resources-200"></a>
## resources-200: demo/resources/build-corpus.mjs, module, line 1868

````js
// ONE PASS, ONE PLACE. Every harvester above writes the licence down exactly as
// its source stated it — a URL, a slug, a sentence — and the name is resolved
// here rather than in ten functions that would drift apart. `licenceRef` keeps
// what was actually said, so nothing is lost by naming it.
````

<a id="resources-201"></a>
## resources-201: demo/resources/build-corpus.mjs, module, line 1875

````js
  // ⚠️ THERE IS NO SUCH THING AS HIGH CONFIDENCE IN A LICENCE NOBODY STATED.
  // Four rows read `unknown · HIGH`, which is a confident measurement of
  // nothing — the same defect as a readout cell pre-set to 0.
````

<a id="resources-202"></a>
## resources-202: demo/resources/build-corpus.mjs, module, line 1882

````js
// 🔴 THE PAGE ASSERTS THAT THE LEDGER'S COUNTS ADD UP TO THE LIST, SO THE
// BUILDER PROVES IT BEFORE WRITING. Two ledger entries with the same name each
// count all of that source's rows, and the sum silently doubles — which is
// exactly what happened the first time `lahteilla` ran alongside the by-name
// probe of the same host. Failing here costs a rebuild; failing in the browser
// costs somebody's afternoon working out which of eighteen numbers is wrong.
````

<a id="resources-203"></a>
## resources-203: demo/resources/build-corpus.mjs, module, line 1896

````js
  // And the page's table is capped: over the cap it draws fewer rows than the
  // corpus holds and its own count check goes red on a file that is otherwise
  // correct. The cap is 400 and it lives in `index.html`; this is the only
  // place that can see the total before it is written.
````

<a id="resources-204"></a>
## resources-204: demo/resources/build-corpus.mjs, module, line 1905

````js
// ── the thesis pass ─────────────────────────────────────────────────────────
// The two rows with no upstream, then the count of all fourteen. See the block
// beside `CORROBORATED` for why this is a pass and not a harvester.
//
// ⚠️ `--only` BUILDS A PARTIAL CORPUS ON PURPOSE, so these refusals are for a
// full run. Under `--only` a missing row means the step that would have brought
// it was not asked for, which is not a defect and must not read as one.
````

<a id="resources-205"></a>
## resources-205: demo/resources/build-corpus.mjs, module, line 1924

````js
// 🔴 DERIVED FROM THE DECK, NOT RE-TYPED HERE. `ingest.mjs` marks every row its
// own thesis pass touched with `dateEvidence.replaces` — what the date used to
// rest on — so the twelve are counted off the file they came from. A stale deck
// makes this number fall and the build refuses, which is the alarm that did not
// exist when the corrections were sitting in a generated file.
````

<a id="resources-206"></a>
## resources-206: demo/resources/build-corpus.mjs, module, line 1945

````js
// ── how long each recording runs ────────────────────────────────────────────
//
// 🔴 MEASURED BY A SEPARATE SCRIPT AND MERGED HERE, WHICH IS THE ONLY WAY A
// LENGTH GETS INTO THIS FILE. Asked for as *"just measure file lengths"* and
// *"and write to corpus json"*. `demo/resources/measure-durations.mjs` asks each
// media file once, gently, and writes `durations.json`; this reads that file. It
// is not done inline because a length is a fact about a MEDIA HOST and the rest
// of this build is facts about catalogues: folding them together would mean
// re-asking archive.org for headers every time somebody wanted to change a date.
//
// ⚠️ A ROW THAT WAS ASKED AND WOULD NOT SAY GETS `durationMs: null` RATHER THAN
// NOTHING. A page can then tell "nobody has measured this" from "this file does
// not carry its length", which are different things to say in a gutter.
````

<a id="resources-207"></a>
## resources-207: demo/resources/build-corpus.mjs, module, line 1973

````js
  // ⚠️ NAMED, NOT COUNTED AWAY. A length written down for a row that is no
  // longer in the corpus means the two files have drifted, and the way that
  // shows up otherwise is a page quietly drawing one fewer tape.
````

<a id="resources-208"></a>
## resources-208: demo/resources/build-corpus.mjs, module, line 1993

````js
  // 🔴 THE ROWS THAT REST ON A BOOK, NAMED SO A REBUILD CAN BE CHECKED.
  // This used to be a hand-written warning saying that running the generator
  // would erase everything under it. It is generated now, and what it records is
  // the opposite: these values come out of the same run that writes this file.
  // `/resources/` reads it and goes red if a row named here has lost its bracket.
````

<a id="resources-209"></a>
## resources-209: demo/resources/build-corpus.mjs, module, line 2007

````js
  // 🔴 WHERE THE LENGTHS CAME FROM, BESIDE THE LENGTHS. `/tapes/` draws every
  // recording as wide as it is long, so a duration is load-bearing on a
  // picture: this says which program read them, when, and how many rows have
  // one. A page can print that instead of implying the numbers were always
  // there.
````

<a id="resources-210"></a>
## resources-210: demo/resources/index.html, style, line 10

````css
  /* The list IS this page, where in `wire` it is a side channel. The shared
     component caps itself at 300 px so a feed that keeps arriving cannot push
     the rest of the page down the screen; these rows arrive once and their
     count never changes, so there is nothing for that ceiling to hold back.
     Tall enough for a long look on a laptop, and it still scrolls inside its
     own box on a phone, where a long title wraps to two or three lines. */
````

<a id="resources-211"></a>
## resources-211: demo/resources/index.html, style, line 19

````css
  /* 🔴 AS TALL AS THE SCREEN, NOT A NUMBER I PICKED. 620 px showed
     twenty-three of 334 records on a laptop and rather fewer on anything
     smaller — REPORTED as *"page should fit more"*. What is above the table is
     the back link, the name and four lines of prose; `dvh` rather than `vh`
     because a phone's address bar comes and goes and `vh` measures the taller
     state, which puts the last rows under it. The floor keeps it a table rather
     than a slot on a short window. */
````

<a id="resources-212"></a>
## resources-212: demo/resources/index.html, style, line 27

````css
  /* 🔴 WIDER THAN THE PROSE, AND THE PAGE SAYS WHY RATHER THAN JUST DOING IT.
     The shell caps a page at 720 px, which is right for a paragraph — 62
     characters is a readable line and CLAUDE.md's one vertical rhythm assumes
     it. This page is not a paragraph. Six columns need 510 px of fixed track
     before the NAME gets a pixel, so inside 720 the titles were cut after about
     twenty characters — MEASURED on the first render: `Erkki Kurenniemi
     Archiv…`, `Coveted Beauty, Short F…`. The table breaks out to 1100 px and
     the prose above it does not, because they are answering different
     questions. Below that width it simply takes what there is. */
````

<a id="resources-213"></a>
## resources-213: demo/resources/index.html, inline script, line 41

````js
  // The shared list from the kit — the same renderer `wire`, `cues` and `patch`
  // draw their rows with, taken unchanged. It owns three fixed gutters and one
  // fluid column, and everything this page has to say is fitted to that shape
  // rather than laid out again here.
````

<a id="resources-214"></a>
## resources-214: demo/resources/index.html, inline script, line 56

````js
  // ⚠️ THREE BUTTONS THAT ARE REALLY ONE CHOICE. Only one ordering can be in
  // force, so only one of these may look chosen — and the shell paints the
  // `primary` one yellow once, at mount, which left `Oldest first` lit while
  // the list was sorted by something else. The class moves with the press
  // below. (The kit HAS a radio group, `choice.mjs`; it is not used here
  // because another session is editing that file today, and a component whose
  // behaviour may change under you is not a component you can assert on.)
````

<a id="resources-215"></a>
## resources-215: demo/resources/index.html, inline script, line 71

````js
    // 🔴 NO READOUT AND NO CONTROLS, AND BOTH WENT ON THE SAME INSTRUCTION.
    // The page carried four counters and five buttons above a list of 334 rows
    // — three orderings, two filters — which is more furniture than list before
    // a reader has read a single line. Every number in that row was a count of
    // the thing directly below it, and the orderings answered a question nobody
    // had asked yet.
    //
    // What the counters said is not lost: the log line under the list gives the
    // row count and the number of places, once, when the corpus loads. That is
    // the right shape for a figure that changes when something happens rather
    // than on a clock.
    //
    // ⚠️ THE FILTERS WENT WITH THEIR BUTTONS, AND SO DID THEIR TWO ASSERTS.
    // Keeping the filtering behind a check nobody can reach would be a test of
    // dead code, which reads as coverage and is not.
````

<a id="resources-216"></a>
## resources-216: demo/resources/index.html, inline script, line 90

````js
  // `newestFirst: false` — `set()` hands the rows over one at a time and the
  // default prepends, which would draw this list upside down. The cap is well
  // over the size of the corpus so no row is dropped in silence; the check
  // below counts the rows against the items anyway.
````

<a id="resources-217"></a>
## resources-217: demo/resources/index.html, inline script, line 94

````js
  /**
   * 🔴 THE COLUMNS ARE DECLARED, AND THAT IS THE WHOLE CHANGE. This page was
   * built on `messages.mjs`, whose columns are a relay message's — a direction,
   * a size, a marker word and wrapped text — and every need here arrived as
   * another option on it: a fourth column for the licence, a way to remove the
   * third, a size the caller formats, a switch to stop wrapping. Four options
   * to describe one table. REPORTED as *"just make reusable component that take
   * different types of cols"*; `shell/table.mjs` is that, and this is its first
   * caller.
   *
   * ⚠️ AND THE PADDED-MONOSPACE TRICK IS GONE WITH IT. The date and the source
   * used to be `padEnd()` fields inside one text cell, which lines up only
   * while every glyph is one width and cannot give a column its own colour,
   * alignment or link. They are tracks now.
   */
````

<a id="resources-218"></a>
## resources-218: demo/resources/index.html, inline script, line 110

````js
    // 🔴 THE CAP IS NOT DECORATION AND IT IS CHECKED AT BOTH ENDS. A table that
    // silently draws fewer rows than the corpus holds is a page reporting a
    // smaller archive than was found, which is the worst shape a cap can have.
    // `build-corpus.mjs` now refuses to WRITE a file over this, so the two
    // cannot disagree, and the assert below counts rows against items anyway.
````

<a id="resources-219"></a>
## resources-219: demo/resources/index.html, inline script, line 116

````js
    // The sentences a record carries and no column can hold — see `note` in
    // table.mjs. Several of the diary rows are only legible through it, and it
    // is where the argument for a bracket goes: `when.note` says why a date is
    // not narrower, which is a paragraph on the rows that have been read against
    // a source and has no business being squeezed into 84 px.
````

<a id="resources-220"></a>
## resources-220: demo/resources/index.html, inline script, line 128

````js
      // 🔴 A DATE IS A CLAIM AND THE CELL CANNOT HOLD ITS EVIDENCE. `1962–1963-07-11`
      // is eighteen months where a Wikidata title match had said `1963`, and
      // until now a visitor could see the bracket get WIDER with nowhere to find
      // out why. The two lines on hover are the two facts a reader cannot see:
      // who says so, and how wide this is. Everything longer than two lines is
      // on the row, which is the one surface in this component sized for prose.
````

<a id="resources-221"></a>
## resources-221: demo/resources/index.html, inline script, line 139

````js
      // ⚠️ CLIPPED, LIKE THE NAME. `public domain mark` is eighteen characters
      // and wrapped to a second line on about a third of the rows — MEASURED on
      // the first render — which made those rows double height and broke the
      // one thing a table is for, which is scanning down it. The full string is
      // on `title`, and there is nowhere to widen to: the name column is the
      // one that should get any spare pixel.
      // `licence` is the short form; `licenceFull` is what the holder actually
      // said, on hover. Narrow, because four characters is the point.
````

<a id="resources-222"></a>
## resources-222: demo/resources/index.html, inline script, line 154

````js
  // ── what goes in each column ────────────────────────────────────────────
  //
  // 🔴 THE SOURCE HAS A COLUMN, AND GETTING ONE IS WHY THIS PAGE CHANGED
  // COMPONENT. On the message list its three fixed gutters are 34, 40 and 52 px
  // of 11 px mono — five, six and eight characters — while the names here run
  // from `Yle` to `Wikimedia Commons`. Neither way out was acceptable:
  // abbreviating institutions invents names nobody can search for, and widening
  // a gutter in `shell.css` changes every other page that draws that list. A
  // declared column costs neither.
````

<a id="resources-223"></a>
## resources-223: demo/resources/index.html, inline script, line 176

````js
  /**
   * 🔴 WHERE A DATE COMES FROM, IN WORDS. `when.how` is a slug a machine wrote
   * for a machine — `ojanen-2020-thesis-p205-n402`, `edm-literal-length` — and
   * showing one to a visitor is showing them a field name and calling it an
   * answer. Most of them were already written as English with hyphens for
   * spaces, so the fallback is honest; the ones named here are the ones that
   * read as a database column, plus the citations, which become the form a
   * reader could look up in a library.
   *
   * ⚠️ NOT A COLUMN. Thirty-nine distinct values, some of them a full clause,
   * against a table that already has to cut the titles.
   */
````

<a id="resources-224"></a>
## resources-224: demo/resources/index.html, inline script, line 245

````js
  /**
   * The size column, and the page does the arithmetic because the page owns the
   * measurement — `messages.mjs` prints what it is handed.
   *
   * ⚠️ NOT RAW BYTES. The largest file here is 990,701,568 of them, which is
   * eleven characters in a column sized for six, and a byte count is not a
   * thing anybody reads at that magnitude anyway.
   * ⚠️ AND A ROW THAT STANDS FOR SEVERAL THINGS SAYS HOW MANY INSTEAD. A set of
   * 3,986 photographs has no single size; `3986×` is the honest answer and it
   * is the same question the column asks — how much is behind this row.
   */
````

<a id="resources-225"></a>
## resources-225: demo/resources/index.html, inline script, line 268

````js
  /**
   * The licence, short enough to be a column you can read DOWN.
   *
   * 🔴 THE POINT IS THE COLUMN, NOT THE SAVING. `CC BY-NC-SA 4.0` is fifteen
   * characters and `public domain mark` is eighteen, so the column was as wide
   * as the holder's name and still wrapped or clipped — and a licence you have
   * to read word by word on every row is a licence nobody reads at all.
   * Shortened, the whole column is scanned in one movement and the odd ones out
   * are the ones that are not four characters.
   *
   * ⚠️ THE FULL STRING IS ON HOVER AND THE EXACT ONE THE SOURCE GAVE IS IN THE
   * FILE. An abbreviation nobody can expand is worse than a long word, so the
   * cell carries `licenceFull` as its `title` and `corpus.json` keeps
   * `licenceRef` verbatim — this is a display, never the record.
   *
   * ⚠️ AND `not stated` / `unknown` PRINT NOTHING. 173 of 333 rows say one or
   * the other, which is a third of the table shouting a non-answer; nothing
   * unmeasured prints as a value here, the same rule the readout cells follow.
   * The blank IS the fact, and the column heading says what the blank means.
   * ⚠️ CC0 STAYS CC0 RATHER THAN BECOMING PD. A dedication and a statement of
   * fact are different claims about who could be wrong — collapsing them would
   * make this page say something the holder did not.
   */
````

<a id="resources-226"></a>
## resources-226: demo/resources/index.html, inline script, line 335

````js
    // 🔴 THE NAME IS A LINK TO THE THING. Every row here is a POINTER at
    // something held somewhere else, and until now there was no way to go there
    // — REPORTED as *"titles should be links"*. A row with no URL still shows
    // its name; it just does not lead anywhere, which is the truth about it and
    // not a reason to hide it.
````

<a id="resources-227"></a>
## resources-227: demo/resources/index.html, inline script, line 360

````js
    /**
     * 🔴 A ROW TAKEN OUT ON PURPOSE IS NOT A ROW THAT DRIFTED, AND THE TWO ARE
     * IDENTICAL TO EVERY CHECK BELOW: both leave an id that something else
     * names and this list does not hold. MEASURED 2026-09-25, when `Saharan uni
     * I` was removed on instruction and THREE asserts went red for it, two of
     * them reporting a gathering that had silently lost a row.
     *
     * `corpus.removed` is the ledger that tells them apart, written by whoever
     * takes a row out, and it is consulted rather than trusted: a row is only
     * excused if it is NAMED there. An unexplained absence still reads red,
     * which is the whole value of those two checks.
     *
     * ⚠️ AND IT IS SAID OUT LOUD IN THE LOG. A removal nobody is told about
     * cannot be told apart from a leak, which is this repository's own rule
     * about a sweep that reports nothing.
     */
````

<a id="resources-228"></a>
## resources-228: demo/resources/index.html, inline script, line 385

````js
    // The question this page exists to answer: is there something to put in
    // every column? A column blank on most rows is a column to drop, and the
    // only way to know is to COUNT the blanks rather than read a few rows.
    // The DATE is deliberately not in this list — 33 of these rows have no
    // date anywhere and saying so is the honest outcome, not a failure.
````

<a id="resources-229"></a>
## resources-229: demo/resources/index.html, inline script, line 415

````js
    // Every place that was asked has a row in the corpus's ledger, and the
    // ledger's counts add up to the list. A source that quietly stopped
    // returning anything would leave a ledger row reading 0 rather than
    // vanishing, which is the difference between a finding and a silent drop.
````

<a id="resources-230"></a>
## resources-230: demo/resources/index.html, inline script, line 426

````js
    // A place that refused is in the list WITH ITS REASON. This is the check
    // that keeps "we could not reach it" from decaying into "it does not
    // exist": every row whose source did not answer 200 has to say what it did
    // answer, in words a reader can act on.
````

<a id="resources-231"></a>
## resources-231: demo/resources/index.html, inline script, line 432

````js
    // ⚠️ THE DETAIL IS WRITTEN FOR THE FAILING CASE FIRST. Proved by breaking
    // it: with the pass-case string in both slots this read "4 refused:
    // lahteilla.fi DNS ENOTFOUND, …" beside a red FAIL — true, and no help at
    // all in finding the row that had gone quiet.
````

<a id="resources-232"></a>
## resources-232: demo/resources/index.html, inline script, line 441

````js
    // 🔴 ONE GATHERING, NOT TWO. The deck at `/proto/deck/` plays from its
    // own shorter list, and this corpus folds that list in rather than
    // re-researching it. That fold happens when the corpus is built, so it can
    // go stale in exactly the way nobody notices — both pages keep working and
    // quietly disagree about what exists. Checking it from this end costs one
    // fetch of a file that is already deployed, and turns a silent drift into
    // a red run.
    // ⚠️ AND THAT FETCH IS WHY IT IS THE ONE CHECK BEHIND THE GATE. It is a
    // second list, downloaded for nobody: a reader of this page never sees a
    // row of it. The drift it guards against happens when the corpus is BUILT,
    // so a harness run catches it at exactly the same moment a visit would.
````

<a id="resources-233"></a>
## resources-233: demo/resources/index.html, inline script, line 456

````js
      // ⚠️ A ROW THE LEDGER NAMES IS NOT A DRIFT. See `gone` above.
````

<a id="resources-234"></a>
## resources-234: demo/resources/index.html, inline script, line 467

````js
    // 🔴 FOURTEEN DATES HERE REST ON A BOOK, AND THEY WERE ONE BUILD AWAY FROM
    // BEING ERASED. They were hand-written into a generated file, so the next
    // run of `build-corpus.mjs` would have put every one of them back to a
    // filename year or the span of a compilation, with nothing on this page
    // saying anything had changed. The values live in code now, twelve in
    // `proto/deck/ingest.mjs` and two in `build-corpus.mjs`, and this is the
    // check that was missing: a rebuild that loses them reads red here.
````

<a id="resources-235"></a>
## resources-235: demo/resources/index.html, inline script, line 475

````js
    // ⚠️ AND A ROW REMOVED BY HAND IS EXCUSED HERE TOO, BY NAME. `rows.length`
    // is still 14 because the ledger of READINGS is a record of work that was
    // done, and deleting an entry from it to make a count come out would be
    // falsifying the thing this check exists to protect.
````

<a id="resources-236"></a>
## resources-236: demo/resources/index.html, inline script, line 484

````js
    // ⚠️ ONE VALUE TYPED HERE, AND IT HAS TO BE. Everything above compares the
    // document with itself, which cannot notice the document being rebuilt
    // without the readings in it — the ledger would simply be gone too. On-Off
    // is the row a plain rebuild puts back to a bare `1963` off a Wikidata title
    // match, so it is the one the page knows by heart.
````
