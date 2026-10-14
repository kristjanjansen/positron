# Page comments: nola

The full comments cut from the code under demo/ for nola, verbatim. Each heading is the id a pointer in the code names, then the file, the block and the line it stood on before the cut.

<a id="nola-1"></a>
## nola-1: demo/nola/index.html, inline script, line 11

````js
  /**
   * nola. A piano and a Rhodes you play from a MIDI keyboard, and the pedal
   * works.
   *
   * `plans/plan-nola.md` argued the whole of this and answered *"what drives
   * it, sc? plain webmidi?"* with: plain Web Audio, one `AudioBufferSourceNode`
   * per note, `demo/shell/midi.mjs` for the keyboard and a new
   * `demo/shell/pedal.mjs` for the foot. Not scsynth, not an AudioWorklet, not
   * a physical model.
   *
   * ── WHAT THIS IS AND WHAT IT IS NOT YET ────────────────────────────────────
   *
   * 🔴 THIS IS THE PLAN'S PHASE ZERO, AND IT IS FINISHED RATHER THAN PARTIAL.
   * The plan's §6.1 asks for a page that gets MIDI, the pedal, the voice
   * manager, the damper, the readout and every assert working against a REAL
   * sound before anything is encoded, *"and only then build the Salamander
   * pack"*. Everything on this page is the shipping machinery. What is phase
   * zero is the PIANO's RECORDINGS: 30 notes at ONE velocity layer out of
   * FluidR3, where the pack will be 30 notes at THREE with key-off releases
   * beside them.
   *
   * 🔴 THE RHODES IS NOT PHASE ZERO AND IS THE FIRST REAL PACK ON THIS PAGE.
   * Asked 2026-09-23 as *"get that rhodes"*. It is Jeff Learman's jRhodes3d,
   * the mono set, 15 notes and five velocity layers of his own 1977 Rhodes Mark
   * I Stage 73, 65 files and 3,153,007 bytes committed beside this page.
   * `research/rhodes-packs-2026-09-23.md` surveyed every free Rhodes there is
   * and found this to be the only real instrument among them;
   * `demo/resources/fetch-jrhodes3d.mjs` fetched and encoded it and
   * `demo/nola/PROVENANCE-rhodes.json` carries a peak, an RMS and a duration
   * per file along with the author's own velocity crossfade table.
   * 🔴 THE LICENCE IS CC BY-NC-SA 4.0 AND ATTRIBUTION IS A REQUIREMENT RATHER
   * THAN A COURTESY. His name, the source repository and the licence are on the
   * face of the page under the keys, not only in `LICENSE-jrhodes3d`.
   *
   * ⚠️ SO VELOCITY IS VOLUME ON THE PIANO AND IS TIMBRE AS WELL ON THE RHODES,
   * WHICH IS THE WHOLE POINT OF A LAYERED PACK. A piano played hard is not a
   * piano played softly and turned up: the hammer hits harder, the string goes
   * brighter, and one recording cannot know that. The Rhodes has five
   * recordings of every note and MEASURED, from the survey, its hardest layer
   * carries 19 dB more high frequency content relative to its own level than
   * its softest. That difference is the thing the piano's pack will buy.
   *
   * 🔴 AND A SECOND INSTRUMENT IS NOT A SECOND ENGINE. THE PLAN'S §6.1 ITEM 6
   * IS STILL OPEN AND NOTHING BELOW HAS BEEN ANSWERED BY THE RHODES LANDING.
   * What it asks for is ARITHMETIC opposite RECORDINGS, and both instruments on
   * this page are recordings played by one sampler. `demo/shell/rhodes.mjs` is
   * 60 lines of per-sample arithmetic already in the kit, and the reason to put
   * it opposite the samples is the NUMBER: megabytes of recording against
   * kilobytes of arithmetic, both audible from one keyboard. ⚠️ AND THE NAME
   * COLLISION IS REAL AND IS WORTH READING TWICE: `rhodes.mjs` is the SYNTHESISED
   * Rhodes and the files beside this page are a RECORDED one. Three things
   * stopped the synthesised one landing and all three are recorded in
   * `BACKLOG.md` rather than discovered again:
   *   - MEASURED here: rendering one `rhodesVoice` to its own end costs
   *     **38.3 ms at note 21**, 25.8 at note 60 and 11.3 at note 108. This page
   *     REPORTS press to sound, so a 38 ms render at press time would be the
   *     biggest number in its own readout, and it would be a fact about the
   *     renderer rather than about the instrument.
   *   - A worklet is the right home for it and `rhodes.mjs` was written to be
   *     one. But `demo/muta/muta-worklet.js` already records that an
   *     `AudioWorkletGlobalScope` has no module loader at all, so a worklet
   *     cannot import the kit's copy of the arithmetic. A second copy of it is
   *     the drift `/kit/` exists to catch.
   *   - And the number it is FOR is only half available: the recording side of
   *     the comparison is now 3,153,007 bytes of a real Rhodes, which is the
   *     right order of magnitude to argue with, but it is a DIFFERENT Rhodes
   *     from the one the arithmetic makes and nobody here has heard them
   *     against each other.
   *
   * ── WHAT THE KEYBOARD ON THIS DESK SENDS, MEASURED 2026-09-23 ──────────────
   *
   * ✅ **IT DOES SEND CONTROLLER 64.** MEASURED in front of `/evo/`: `B1 40 00`
   * and `B1 40 7F`, on channel 2. So the default is right on this unit, and
   * `?pedal=<n>` stays for the next one, because the MK-425C's footswitch is
   * *"fully MIDI assignable"* and which number it sends is a setting held in
   * the instrument rather than a fact about the model.
   *
   * 🔴 **AND ITS POLARITY IS UPSIDE DOWN THIS SESSION.** Two press and release
   * gestures both arrived as `00` followed 0.40 s later by `7F`, which reads as
   * PRESSING SENDING 0 and releasing sending 127, the opposite way round from
   * the specification. The manual says where that comes from: the polarity is
   * sensed at power up, so a pedal held down while the keyboard boots is
   * inverted for the whole session and nothing on any screen would say so.
   * ⚠️ **`?flip=1` READS IT THE RIGHT WAY UP**, and the better fix is on the
   * instrument: power the keyboard up with the pedal unpressed. The option
   * exists because the fault expires at the next power cycle, and nobody should
   * have to restart an instrument to play a page.
   * ⚠️ **AND IT IS AN OPTION RATHER THAN A DETECTION, ON PURPOSE.** A page
   * cannot tell an inverted pedal from a pedal somebody is holding, and one
   * that guessed would hold the first note of every session for a player whose
   * foot happened to be down.
   *
   * 🔴 AND THE KEYBOARD ON THIS DESK IS A SEMITONE FLAT. MEASURED and recorded
   * in `demo/evo/index.html`: the MK-425C's 25 keys arrive as notes 47 to 71,
   * where a C-to-C 25-key controller sits at 48 to 72. `/evo/` deliberately
   * does not correct it, because it is a page ABOUT that keyboard. This is a
   * page about a piano, and a piano a semitone flat against every other
   * instrument is the kind of fault that gets blamed on the sample pack. Hence
   * TRANSPOSE, defaulting to 0, and a log line the first time a note below 48
   * arrives.
   */
````

<a id="nola-2"></a>
## nola-2: demo/nola/index.html, inline script, line 125

````js
  /* ⚠️ `routeTo` LEFT THIS LINE WITH THE WAY HOME ON 2026-09-29 AND THE KIT
     FUNCTION STAYED. It is still exported by `suggest.mjs` and still graded by
     `suggest-test.mjs`, so it keeps its test and has no page calling it. */
````

<a id="nola-3"></a>
## nola-3: demo/nola/index.html, inline script, line 130

````js
  /* ⚠️ AND `table.mjs` WENT WITH IT, because the way home's four rows were this
     page's only table. An import that matches nothing reads as correct forever,
     which is the dead rule this project keeps measuring. The roll is
     `roll.mjs` and draws its own rows. */
````

<a id="nola-4"></a>
## nola-4: demo/nola/index.html, inline script, line 141

````js
  /**
   * 🔴 THIRTY NOTES AT MINOR THIRDS, A0 TO C8, WHICH IS ARITHMETIC AND NOT A
   * CHOICE. 21 to 108 inclusive at step 3 is exactly 30, so every one of an 88
   * key piano's notes is at most ONE SEMITONE from a recording. The Salamander
   * pack the plan sizes samples exactly these thirty, so nothing about this
   * page's voice manager changes when the recordings are replaced.
   * ⚠️ AND IT IS WHY THE PHASE ZERO SET IS 30 FILES RATHER THAN THE PLAN'S 88.
   * A chromatic soundfont would leave `playbackRate` at 1 on every note and the
   * shift assert true by construction, which proves less machinery rather than
   * more. `demo/resources/fetch-fluidr3-piano.mjs` has the argument.
   */
````

<a id="nola-5"></a>
## nola-5: demo/nola/index.html, inline script, line 154

````js
  /**
   * 🔴 THE RHODES IS FIFTEEN NOTES AT UNEVEN STEPS, AND THAT IS WHY THE MAP
   * BECAME A SEARCH. The piano's thirty sit exactly three apart, so the
   * recording a key plays was arithmetic: round to the nearest multiple of
   * three. MEASURED off `PROVENANCE-rhodes.json`, the Rhodes gaps are 6, 5, 5,
   * 5, 5, 4, 3, 3, 6, 5, 5, 5, 5 and 5, so nothing rounds and the worst bend
   * inside the set is THREE semitones rather than one.
   * ⚠️ AND A TIE GOES DOWN, WHICH IS NOT A COIN TOSS. Three keys sit exactly
   * between two recordings (32, 57 and 68), and the author's own SFZ answers
   * all three: his `hikey` for F1 is Ab1, for G3 is A3 and for F4 is Ab4, so
   * each of them plays the recording BELOW it. The check below grades this
   * search against his fifteen key regions on all 88 keys, which is two
   * independent sources rather than the page reading its own arithmetic back.
   */
````

<a id="nola-6"></a>
## nola-6: demo/nola/index.html, inline script, line 178

````js
  /**
   * ⚠️ 64 VOICES, AND THE NUMBER IS A GUESS WITH A REASON RATHER THAN A
   * MEASUREMENT. A pedalled glissando up the keyboard is over a hundred
   * simultaneous buffer sources, and `plans/plan-nola.md` §7 item 10 names this
   * as the one place the plain Web Audio choice could be wrong and says nobody
   * has measured it on a phone. `sounding` in the readout is where the answer
   * will first be visible.
   */
````

<a id="nola-7"></a>
## nola-7: demo/nola/index.html, inline script, line 188

````js
  /**
   * 🔴 THE RECORDINGS ARE 21 dB DOWN AND THE PAGE HAS TO MAKE THAT UP.
   * MEASURED 2026-09-22 by decoding all thirty: they peak between **0.068 and
   * 0.097 of full scale**, median **0.0894**, which is a spread of only 3.1 dB
   * across the whole keyboard and about 21 dB under where a sample set would
   * normally sit. Without this the page plays correctly and READS AS BROKEN:
   * the first run measured a held note at **0.0057** and took two asserts red
   * on thresholds that were right for the instrument and wrong for the files.
   * ⚠️ AND THE HEADROOM IS SPENT ON PURPOSE, WHICH IS WHY THE TARGET IS A THIRD
   * OF FULL SCALE AND NOT ALL OF IT. This is a page about holding a pedalled
   * chord: six notes at once really do add up, nothing here compresses them,
   * and one fortissimo note at full scale would mean every chord clipping. A
   * compressor would fix the arithmetic and change the dynamics, which is the
   * one thing a piano page may not quietly do.
   * ⚠️ IT IS A CONSTANT HERE AND A TRIM IN THE BUILD LATER.
   * `plans/plan-nola.md` §3.5 wants a peak and an envelope per file when the
   * Salamander pack is encoded, which is the right place for it. This is one
   * number standing in for that, measured rather than guessed.
   */
````

<a id="nola-8"></a>
## nola-8: demo/nola/index.html, inline script, line 210

````js
  /**
   * 🔴 AND THE RHODES IS THE OTHER WAY UP, WHICH IS A 20 dB MISTAKE WAITING FOR
   * ANYBODY WHO INHERITS THE PIANO'S NUMBER. MEASURED across all 65 files and
   * written into `PROVENANCE-rhodes.json`: they peak between **0.2744 and
   * 0.9981**, median 0.8186, with 18 of the 65 inside 1 dB of full scale. The
   * piano's constant is 0.097 and the Rhodes' is ten times that, so two engines
   * on one page means TWO constants rather than one that changes meaning.
   * Taking the piano's here would multiply an already loud file by 3.09 and
   * clip every chord.
   * ⚠️ IT IS THE LOUDEST FILE AND NOT THE MEDIAN, AND THE SPREAD IS LEFT IN ON
   * PURPOSE. MEASURED: the top four sampled notes peak at 0.27 to 0.58 while
   * everything below note 81 sits between 0.60 and 1.00, which is a real Rhodes
   * getting quieter at the top rather than a mastering error. Normalising per
   * file would flatten the instrument's own top octave, so one number is used
   * and the falloff survives.
   */
````

<a id="nola-9"></a>
## nola-9: demo/nola/index.html, inline script, line 228

````js
  /**
   * What one press is worth, before the damper.
   *
   * 🔴 THE PLAYER SUPPLIES THE LEVEL AND THE FILES SUPPLY THE TIMBRE, AND THE
   * AUTHOR'S OWN SFZ SAYS THE SAME THING BY CARRYING NO LEVEL OPCODE AT ALL.
   * MEASURED and recorded in the provenance: the Rhodes files are roughly PEAK
   * normalised, so their RMS runs BACKWARDS against velocity. The step from one
   * layer to the next harder one has a median of **-1.53 dB** and reaches
   * **-4.4 dB**, and 38 of 44 steps are negative. A page that switched buffer on
   * velocity and trusted the harder file to be louder would ship a keyboard
   * that goes quieter when you hit it harder.
   * ⚠️ SO THIS CURVE STAYS EXACTLY AS IT WAS AND LAYER CHOICE SITS ON TOP OF
   * IT. Over the whole velocity range this is 18.8 dB, against 5.5 dB of layer
   * to layer RMS wander, so the foot of the curve never loses to the files.
   */
````

<a id="nola-10"></a>
## nola-10: demo/nola/index.html, inline script, line 246

````js
  /**
   * 🔴 LAYER 1 IS THE HARDEST HIT AND LAYER 5 IS THE SOFTEST, WHICH IS THE
   * OPPOSITE OF WHAT THE FILE NAMES SUGGEST TO ANYBODY READING 5 AS MOST.
   * MEASURED in the survey: layer 1 carries 19 dB more high frequency content
   * relative to its own level than layer 5, and the author's own crossfade
   * table below says the same thing from the other side, because it is layer 5
   * that owns velocity 1.
   *
   * This is that table, parsed out of `jRhodes3d-mono.sfz` and copied into
   * `PROVENANCE-rhodes.json` under `velocity.groups`. `in` is his
   * `xfin_lovel`/`xfin_hivel` and `out` is his `xfout_lovel`/`xfout_hivel`.
   * ⚠️ IT IS HIS ANSWER RATHER THAN A SET OF RANGES INVENTED HERE. The page
   * plays one layer at a time rather than crossfading two, so what it needs out
   * of the table is which layer is LOUDEST at a velocity, and that is computed
   * from his numbers rather than typed as five bands somebody eyeballed.
   */
````

<a id="nola-11"></a>
## nola-11: demo/nola/index.html, inline script, line 278

````js
  /* ⚠️ THE TABLE IS READ SOFTEST FIRST AND A TIE GOES TO THE SOFTER LAYER, so
     the answer at the exact middle of a crossfade is decided rather than left
     to whichever way the comparison happens to be written. */
````

<a id="nola-12"></a>
## nola-12: demo/nola/index.html, inline script, line 287

````js
  /**
   * 🔴 TWO OF THE FIVE LAYERS HAVE HOLES IN THEM, AND THE AUTHOR ALREADY SAID
   * WHAT TO PLAY INSTEAD. MEASURED: layer 3 stops at note 71 and layer 1 at 76,
   * while layers 2, 4 and 5 exist on all fifteen notes, which is 65 files where
   * a full set would be 75. Above those points his own regions name the nearest
   * layer that IS there: his layer 1 group plays the `_2` file from A5 up and
   * his layer 3 group plays the `_4` file from B4 up.
   * ⚠️ SO THE FALLBACK IS HIS AND NOT A RULE INVENTED HERE. Guessing would have
   * meant picking between a softer file and a harder one on a keyboard where
   * the numbering already runs backwards, which is exactly the place to use
   * somebody else's answer.
   */
````

<a id="nola-13"></a>
## nola-13: demo/nola/index.html, inline script, line 312

````js
  /**
   * 🔴 TWO INSTRUMENTS, AND EVERYTHING THAT DIFFERS BETWEEN THEM IS IN ONE
   * OBJECT EACH. A note table, a level constant, a file name and a layer: those
   * four are the whole of the difference, and holding them apart is what stops
   * the piano's 21 dB correction reaching a set of files that are already at
   * full scale. Everything downstream of `press` is shared, so a voice, a
   * damper, a pedal and a steal cannot tell the two apart.
   */
````

<a id="nola-14"></a>
## nola-14: demo/nola/index.html, inline script, line 320

````js
  /* ⚠️ `name` IS WHAT THE SELECTOR DRAWS AND IS TITLE CASE SINCE 2026-09-25.
     It was `PIANO` and `RHODES` and was read by nothing at all, because the
     control that named the two instruments carried its own option labels. The
     standard patch selector reads its names off the list it is handed, and a
     shouted name in a cell that elsewhere holds `Vibraphone Soft 2` would be
     this page drawing the component differently from every other caller. */
````

<a id="nola-15"></a>
## nola-15: demo/nola/index.html, inline script, line 344

````js
  /* 🔴 REWRITTEN AGAIN WHEN THE PAGE GREW A SECOND INSTRUMENT, IN THE SAME
     CHANGE. It said *a piano you play from a MIDI keyboard*, which stopped
     being true the moment a control appeared saying which of two is playing.
     A description that has drifted is worse than a missing one, because a
     visitor believes it.
     ⚠️ AND IT IS STILL ONE SENTENCE. `and a 1977 Rhodes` names the second half
     of one instrument row rather than bolting a second fact on, and the chord
     line stays because it is the first thing on the page.
     🔴 REWRITTEN A THIRD TIME FOR THE LEARNING MODE, because a control appeared
     that changes where the roll's rows come from, and that is the trigger: not
     *did I rewrite the page* but *did a control appear and did the way you work
     it change*. `you either type in or teach it by playing` is ONE clause about
     ONE thing, the roll, rather than a second fact bolted on with an `and`.
     ⚠️ AND IT IS WHAT DEFINES THE WORD `roll` ON THE PAGE, which is what lets
     the control above the keys be labelled with it.
     🔴 AND A CLAUSE CAME OFF ON 2026-09-29, WHICH IS THE FIRST TIME THIS LINE
     GOT SHORTER RATHER THAN LONGER. `and a four chord way home it works out from
     them` described a block that was removed that day, and a description that
     names a block a visitor cannot find is worse than a missing one. The whole
     sentence was re-read rather than truncated: what is left is the instrument
     row and the roll, which is what the page is, and it ends where the page
     ends rather than trailing off where the cut was made. */
````

<a id="nola-16"></a>
## nola-16: demo/nola/index.html, inline script, line 371

````js
    // 🔴 THE INDEX'S OWN LINE, VERBATIM. A page with a diagram gets a one line
    // `what`, because a paragraph and a picture of the machinery are two
    // explanations of one thing and the paragraph is the weaker of them.
````

<a id="nola-17"></a>
## nola-17: demo/nola/index.html, inline script, line 375

````js
    /**
     * 🔴 `null`, WHICH IS A PAGE SAYING IT HAS NO READOUT RATHER THAN ONE THAT
     * NEVER FILLED. Asked 2026-09-23: *"rm readout"*. `mount()` keeps those two
     * apart on purpose and a harness reads the declaration, so `{}` here would
     * be the page claiming six cells and delivering none.
     * ⚠️ AND WHAT THE SIX CELLS SAID IS REHOMED RATHER THAN DELETED, which is
     * the rule for taking a display away: press to sound, its worst, the voice
     * count, what the foot is holding, the bytes fetched and the pitch shift
     * are all still MEASURED, and all six are still reported, in the asserts
     * that already carried every one of those numbers. Deleting the display
     * without the facts is how a page quietly stops reporting something.
     * ⚠️ THE ONE THAT HAD NOWHERE ELSE TO GO IS `press to sound` for a VISITOR,
     * who runs no checks. It is a number nobody could read without a MIDI
     * keyboard anyway, which is what made the cell the weakest of the six.
     */
````

<a id="nola-18"></a>
## nola-18: demo/nola/index.html, inline script, line 391

````js
    /**
     * 🔴 NO CONTROL ROW AT ALL, AND THAT MOVED EVERY CHECK ON THIS PAGE.
     * Asked 2026-09-23: *"rm 'play a phrase'"*. `demo/verify.mjs` drives a page
     * by clicking `.pos-controls button`, and this page's whole check block
     * hung off that one handler, so deleting it would have taken all of them
     * out of the run while the suite stayed green. `positron-verify` records
     * exactly that loss twice, on `/mirror/` and `/blocks/`, where ten and six
     * asserts would have gone silent.
     * ✅ THE CHECKS RUN AT LOAD BEHIND `SELFCHECK` NOW, which is what `/muta/`
     * and `/archive/radio/` already do, and the per page assert count was diffed either
     * side of the change rather than assumed.
     * ⚠️ AND THE PAGE IS BETTER FOR IT. The thing to press was always the
     * keyboard.
     */
````

<a id="nola-19"></a>
## nola-19: demo/nola/index.html, inline script, line 409

````js
  // ── nothing is opened on a visit ───────────────────────────────────────────
  //
  // 🔴 EVERY URL THAT CAN LEAVE THIS PAGE GOES THROUGH ONE COUNTED FUNCTION, so
  // "a visit fetches nothing" is an ASSERT OVER A COUNTER rather than a claim
  // about a file. That is the `/reel/` repair: six of that page's nine outward
  // requests were media source assignments rather than `fetch`, so a grep would
  // have missed them.
````

<a id="nola-20"></a>
## nola-20: demo/nola/index.html, inline script, line 416

````js
  /* ⚠️ THE URLS ARE KEPT, NOT JUST COUNTED, AND THAT IS WHAT MAKES THE LAYER
     CHECK WORTH ANYTHING. A check reading the layer this page just computed
     would be the page grading its own arithmetic, which is the trap that let a
     `playbackRate` of 1 read green on this page once already. What was really
     asked for is the only evidence there is. */
````

<a id="nola-21"></a>
## nola-21: demo/nola/index.html, inline script, line 434

````js
  /* ⚠️ KEYED BY URL RATHER THAN BY NOTE, SINCE THE RHODES HAS FIVE RECORDINGS
     OF EVERY NOTE AND THE PIANO HAS ONE. A note number was the key while a note
     number identified a file, and it stopped doing that the day a second
     instrument landed. */
````

<a id="nola-22"></a>
## nola-22: demo/nola/index.html, inline script, line 445

````js
    // ⚠️ Fire and move on. `resume()` waits on a gesture in a real browser and
    // NEVER rejects, so awaiting it is a hang rather than an error.
````

<a id="nola-23"></a>
## nola-23: demo/nola/index.html, inline script, line 451

````js
    /**
     * 🔴 512 SAMPLES, NOT 2048, AND 2048 MADE A CHECK BLIND. An analyser hands
     * back the most recent `fftSize` samples, so at 2048 the window is **46 ms
     * at 44.1 kHz** and a reading taken 40 ms after a key was released is still
     * mostly made of samples from BEFORE it was released. MEASURED by sabotage:
     * replacing the damper ramp with an instant `setValueAtTime(0)` left this
     * page **24/24 green**, because the window the damper was being graded
     * through was wider than the damper. 512 is 11.6 ms.
     * ⚠️ AND IT IS A FLOOR ON WHAT CAN BE MEASURED, NOT A FREE CHOICE. 11.6 ms
     * is one and a half cycles of note 60 and half a cycle of note 33, so a
     * level reading on a bass note under-reports. Every check here plays notes
     * 60 to 67 for that reason.
     */
````

<a id="nola-24"></a>
## nola-24: demo/nola/index.html, inline script, line 467

````js
    /**
     * 🔴 A SECOND ANALYSER, BECAUSE LEVEL AND PITCH WANT OPPOSITE WINDOWS. The
     * one above has to be SHORT so that a reading taken 45 ms after a key was
     * released contains no samples from before it. This one has to be LONG or
     * it cannot tell two neighbouring semitones apart at all: at 512 samples a
     * bin is 86 Hz wide and notes 60 and 61 are 15.6 Hz apart, so they land in
     * the same bin. At 16384 a bin is 2.7 Hz.
     * ⚠️ IT EXISTS BECAUSE A SABOTAGE STAYED GREEN. `playbackRate` forced to 1
     * on every note left this page 24/24, because the shift check was reading
     * the number the page had COMPUTED rather than the pitch it had played.
     * That is measuring the quantity next to the one in question, which is the
     * trap this project has already paid for on `/mirror/` and on the MIM
     * corpus.
     */
````

<a id="nola-25"></a>
## nola-25: demo/nola/index.html, inline script, line 485

````js
    /**
     * ⚠️ `outputLatency` IS THE ONE TO READ AND `baseLatency` IS THE FALLBACK.
     * The first is how long after `start()` a sample reaches the speaker, which
     * is the half of press to sound that happens after this page is finished.
     * It is Baseline since March 2025; where it is missing, `baseLatency` is
     * the graph's own buffer and is smaller, so the number is optimistic and
     * the log says which one it came from.
     */
````

<a id="nola-26"></a>
## nola-26: demo/nola/index.html, inline script, line 502

````js
  /**
   * 🔴 ONE OCTAVE AT A TIME, ON THE FIRST PRESS OF A KEY IN IT, AND NEVER ON A
   * VISIT. Two to four files and about 60 KB, rather than 656 KB for a visitor
   * who pressed one key. The promise is kept in `wanted` so a chord in one
   * octave fetches it once rather than four times.
   */
````

<a id="nola-27"></a>
## nola-27: demo/nola/index.html, inline script, line 508

````js
  /**
   * What one press has to have in hand, and how much else is worth taking while
   * the connection is open.
   *
   * 🔴 THE TWO INSTRUMENTS BATCH DIFFERENTLY AND NEITHER IS AN OVERSIGHT. The
   * piano has one recording a note, so an octave is two to four files and about
   * 60 KB and the next key in it costs nothing. The Rhodes has FIVE recordings
   * a note, so the same octave would be up to fifteen files and 750 KB, and
   * four in five of them are a press nobody made. It takes the one file the
   * velocity asked for, 50 KB, and asks again if the next press is harder.
   */
````

<a id="nola-28"></a>
## nola-28: demo/nola/index.html, inline script, line 525

````js
    /* 🔴 EVERY LAYER OF THIS NOTE, NOT THE ONE VELOCITY THAT ASKED. This used to
       fetch a single file, and that is the asymmetry that made the Rhodes feel
       broken while the piano felt fine: the piano's plan above takes a whole
       OCTAVE, so one press warms its neighbours, and the Rhodes took one file,
       so the SAME KEY at a different velocity was another cold fetch. A real
       keyboard sends a different velocity on almost every note, so almost every
       note a player struck was a first fetch, and a first fetch is the thing
       that arrives after the key is already up.
       ⚠️ MEASURED: 65 files over 15 notes, about 47 KB each, so this is roughly
       200 KB for a note and everything you can play it with, against 3.1 MB for
       the pack. The piano already spends an octave this way.
       ⚠️ AND IT IS STILL BEHIND A PRESS. Nothing here is fetched on a visit. */
````

<a id="nola-29"></a>
## nola-29: demo/nola/index.html, inline script, line 563

````js
  /* ⚠️ IT STILL RUNS WITH NO READOUT TO WRITE TO. The counts are what the
     checks read, and `voices` and the pedal's own sets are where they live, so
     this is now the one place that keeps the two in step at every event rather
     than a painter. */
````

<a id="nola-30"></a>
## nola-30: demo/nola/index.html, inline script, line 570

````js
  /**
   * 🔴 THE DAMPER IS A RAMP AND NOT A `stop()`. A real damper takes 50 to
   * 150 ms to silence a string and longer in the bass, and a page that calls
   * `stop()` on a key release makes a click instead of a note ending.
   * `setTargetAtTime` reaches within 5 per cent of its target in three time
   * constants, so the constant is a third of the time asked for and the source
   * is stopped at one and a half times it, by which point it is at about 1 per
   * cent. `rig/board/synth.mjs` picked the same 0.12 s floor for the same
   * reason, and `demo/shell/pedal.mjs` owns the number.
   */
````

<a id="nola-31"></a>
## nola-31: demo/nola/index.html, inline script, line 595

````js
  /**
   * A key went down, by any route.
   *
   * 🔴 ONE PATH, NOT TWO. A tapped key and a played key call this and nothing
   * else, which is `midi.mjs`'s own first rule: a note number is a note number,
   * and a page that grows a second route for MIDI has two things to keep in
   * step for ever.
   */
````

<a id="nola-32"></a>
## nola-32: demo/nola/index.html, inline script, line 603

````js
  /**
   * 🔴 WHAT IS UNDER A FINGER, KEPT HERE BECAUSE THE ROLL ASKS. Playing the
   * notes of a chord lights that chord's row, which is the chord charts' job
   * read backwards. `pedal.mjs` has two sets of its own and publishes only
   * their SIZES, and the notes still ringing under a foot are not what is being
   * PLAYED, so neither answers this.
   * ⚠️ IT IS FINGERS, NOT VOICES. A pedalled chord goes on sounding long after
   * the hands moved on, and a row that stayed lit through it would be telling a
   * player they are still holding something they let go of.
   */
````

<a id="nola-33"></a>
## nola-33: demo/nola/index.html, inline script, line 614

````js
  /* ⚠️ AND THE LEARNING MODE HANGS OFF THE SAME LINE, so there is one place
     that knows what is under a finger rather than two that have to agree.
     `heardChange` does nothing at all unless the roll is in `Played`. */
````

<a id="nola-34"></a>
## nola-34: demo/nola/index.html, inline script, line 620

````js
    /* 🔴 EVERY NOTE THIS PAGE SOUNDS, WITH WHERE IT CAME FROM, UNDER `?rec=1`.
       Asked 2026-09-23: *"tap. loops do not sound right (timings)"*. The take
       recorder beside this one records the WIRE, which is the right stream for a
       chord question and the wrong one for a timing question: a looped note never
       touches the wire, so a recording of what arrived says nothing at all about
       what came back. This records what SOUNDED, and `how` is what separates a
       finger from a lap. */
````

<a id="nola-35"></a>
## nola-35: demo/nola/index.html, inline script, line 635

````js
    /* 🔴 THE INSTRUMENT IS READ ONCE, HERE, AND IS CARRIED THROUGH THE REST OF
       THIS FUNCTION AS A LOCAL. There is an await under this line, so reading
       `inst` again afterwards would let a switch that happened during a fetch
       decide the level of a note that started before it. */
````

<a id="nola-36"></a>
## nola-36: demo/nola/index.html, inline script, line 645

````js
    /* ⚠️ A LOCAL, NOT A FLAG ON THE MODULE. Two keys pressed in the same
       millisecond are two overlapping runs of this function, and one shared
       boolean between them means whichever finishes second reads the other's
       answer. A chord is the ordinary case here, not the edge one. */
````

<a id="nola-37"></a>
## nola-37: demo/nola/index.html, inline script, line 652

````js
    /* 🔴 THIS WAS A SILENT `return` AND IT IS THE SHAPE THE TAP WAS BUILT TO
       FIND. A recording that did not arrive drops the note with no sound, no
       log line and nothing in any counter, which from the keys is
       indistinguishable from a key that was never pressed. */
````

<a id="nola-38"></a>
## nola-38: demo/nola/index.html, inline script, line 657

````js
    /* 🔴 THE KEY MAY ALREADY BE UP BY NOW, AND THIS IS THE FAULT THE TAP WAS
       BUILT TO FIND. Reported from the deploy as *"you seem to lose keys i
       play"*. There are two awaits above this line and one is a network fetch,
       so a quick note is routinely released before its sample exists. `release`
       damps the voices it can find and at that moment there were none, so the
       voice started afterwards with nothing left to stop it: a note that begins
       AFTER the key is up and runs to the end of the recording. On a quick
       passage that is heard as the page losing what you played and inventing
       what you did not, which is exactly the report.
       ⚠️ AND REFUSING IT IS THE WRONG REPAIR, WHICH WAS BUILT AND MEASURED
       FIRST. The harness dropped FOUR real notes that way in one run. A key you
       pressed made a sound on every instrument ever built, and a page that
       silently declines it is losing your playing for a second reason.
       ✅ SO IT SOUNDS, AND IT STOPS. The voice is built and the damper is put on
       it straight away, which is what a real quick note is. */
````

<a id="nola-39"></a>
## nola-39: demo/nola/index.html, inline script, line 674

````js
    /* 🔴 A KEY STRUCK AGAIN DAMPS THE STRING IT IS ABOUT TO STRIKE. One key is
       one string: re-pressing it does not add a second voice on a real piano,
       it re-excites the one that is ringing. The old one goes quickly, which is
       also what stops a repeated key stacking into a wall. */
````

<a id="nola-40"></a>
## nola-40: demo/nola/index.html, inline script, line 680

````js
    /* ⚠️ OLDEST FIRST PAST THE CAP, and the oldest is index 0 because voices are
       pushed in order. A steal is a real event, so it goes in the log rather
       than being silent. */
````

<a id="nola-41"></a>
## nola-41: demo/nola/index.html, inline script, line 711

````js
    /* 🔴 MEASURED FROM THE MESSAGE, NOT FROM THIS FUNCTION, AND ONLY WHEN THE
       RECORDING WAS ALREADY IN HAND. A first press in an octave waits on a
       network fetch and a decode, and folding that into `worst` would leave one
       number standing at a few hundred milliseconds for the rest of the page's
       life, which is exactly what `worst` exists to make visible about
       something else. The fetch has its own line in the log. */
````

<a id="nola-42"></a>
## nola-42: demo/nola/index.html, inline script, line 742

````js
  /**
   * 🔴 SWITCHING INSTRUMENT DAMPS EVERYTHING THAT IS SOUNDING, AND THE REASON
   * IS THAT THE CONTROL SAYS WHICH ONE IS PLAYING. A pedalled chord left ringing
   * across a switch would mean a page reading RHODES with a piano in it, and
   * a note whose key is still down when the switch happens is the shape that
   * strands a voice: its release goes through `pedal`, which knows a note number
   * and nothing about which instrument made it.
   * ✅ ONE VOICE LIST FOR BOTH IS WHAT MAKES THAT SAFE. `damp`, `release` and
   * `panic` reach every voice whatever made it, so nothing can be orphaned by
   * being the wrong instrument's.
   * ⚠️ AND THE FOOT IS LEFT ALONE. The pedal is where somebody's foot is, which
   * a change of instrument does not move, so this is not a `panic`.
   */
````

<a id="nola-43"></a>
## nola-43: demo/nola/index.html, inline script, line 767

````js
  /**
   * 🔴 AN INSTRUMENT YOU SWITCHED TO SHOULD BE READY BEFORE YOU PLAY IT, AND
   * THIS IS THE REAL REPAIR FOR THE RHODES. Reported twice off the deploy:
   * *"turing rjodes on and pressing midi does not enable rhodes sound"*, then
   * *"could not head rhodes with midi presses"* after the first repair.
   *
   * ⚠️ THE FIRST REPAIR WAS RIGHT AND WAS NOT ENOUGH. A note let go before its
   * recording arrives now sounds and is damped, so it is a 120 ms note rather
   * than a missing one or an endless one. On the Rhodes that made almost every
   * note a 120 ms note, because almost every note was a cold fetch: the pack is
   * 65 files against the piano's 30, and it is indexed by velocity as well as
   * by pitch, so a real keyboard asks for something new nearly every time.
   * ✅ SO THE FETCH MOVES TO THE PRESS THAT SWITCHED INSTRUMENT. That press is a
   * deliberate gesture, it is the moment a player is not yet playing, and it is
   * the only moment where waiting costs nothing.
   * ⚠️ IT IS STILL NOT A VISIT. Nothing here runs on load: the page opens on the
   * piano and `warmUp` is reached only from `setInstrument`, which only a press
   * calls.
   * 🔴 AND IT WARMED THE WRONG WINDOW, WHICH IS WHY THE REPORT CAME BACK A THIRD
   * TIME AS *"midi does not play rhodes, sceen keyb does?!"*. That sentence is
   * the whole diagnosis: this warmed `keys.base + REACH`, which is 48 to 62, the
   * fourteen semitones the LETTER keys cover. A screen press lands inside it and
   * sounds. A MIDI keyboard plays wherever the hands are, which on the reported
   * take was A3 to A4, entirely above it, so every MIDI note was a cold fetch
   * and every cold fetch is a note that arrives after the key is up.
   * ⚠️ THIRD TIME FOR THIS EXACT CONFUSION IN ONE DAY. `REACH` is what a laptop
   * can play and `SHOWN()` is what the keyboard draws, and they are 14 against
   * 24 semitones. It has now been the wrong one in the fit test for a learned
   * row, in the voicing of a proposal, and here. When two windows differ by an
   * octave, the one a PERSON can see is almost always the right one.
   * ✅ AND IT WARMS IN TWO WAVES. The keys on screen first, because that is what
   * makes it playable in the next second, then the rest of the pack behind it,
   * because a MIDI keyboard is not limited to the keys this page happens to
   * draw and the second wave costs nothing anybody is waiting on.
   */
````

<a id="nola-44"></a>
## nola-44: demo/nola/index.html, inline script, line 813

````js
      /* ⚠️ THE SECOND WAVE IS NOT AWAITED AND SAYS SO ONLY WHEN IT LANDS. A MIDI
         keyboard reaches past the drawn keys, and a note out there would
         otherwise be the one cold fetch left. */
````

<a id="nola-45"></a>
## nola-45: demo/nola/index.html, inline script, line 824

````js
  /**
   * 🔴 THE CONTROLLER NUMBER IS AN OPTION BECAUSE NOBODY HAS READ WHAT THE
   * PEDAL ON THIS DESK SENDS. `?pedal=67` points this at another one, and the
   * page says in its log which number it is listening to, so a reader never has
   * to guess whether a silent pedal is unplugged or on the wrong controller.
   */
````

<a id="nola-46"></a>
## nola-46: demo/nola/index.html, inline script, line 840

````js
      /* 🔴 THE RAW VALUE, BESIDE THE READING, AND THIS IS THE INVERTED PEDAL
         MADE VISIBLE. The MK-425C senses its footswitch's polarity at POWER UP,
         so a pedal held down while the keyboard boots is inverted for the whole
         session and nothing on any screen would otherwise say so. A page cannot
         tell that from somebody holding the pedal and must not pretend to. What
         it can do is print the number, so a player whose foot is nowhere near
         it can see the instrument lying. */
````

<a id="nola-47"></a>
## nola-47: demo/nola/index.html, inline script, line 861

````js
  /**
   * 🔴 TWENTY FIVE KEYS, WHICH IS FIFTEEN WHITE ONES AND A DECISION ABOUT
   * TOUCH. Asked for as *"scale keys so 25 keys fit in"*. `shell.css` floors a
   * white column at `--k-min`, default **49 px**, and `keyboard.mjs` argues at
   * length that 49 is already only one pixel above Android's 48 dp minimum and
   * five above Apple's 44 pt: *"the next request to make the keys smaller is a
   * request to make them too small to hit"*. Fifteen at 49 plus fourteen 3 px
   * gaps is 777 px and this page is 688.
   * ✅ SO THE FLOOR MOVES TO 44 HERE AND NOWHERE ELSE, which is Apple's minimum
   * exactly rather than under it, and it is a page level custom property
   * because `.keys` already reads `minmax(var(--k-min, 49px), 1fr)`. Nothing
   * shared changes and no other keyboard on the site moves.
   * ⚠️ AND ON A PHONE IT STILL SCROLLS, which is correct rather than a
   * shortfall: fifteen keys at any touchable size do not fit 390 px, the row
   * hands the gesture to the platform with `touch-action: pan-x`, and a swipe
   * scrolls while a drag plays.
   */
````

<a id="nola-48"></a>
## nola-48: demo/nola/index.html, inline script, line 878

````js
  /**
   * 🔴 42 px, SO ALL TWENTY FIVE KEYS ARE ON SCREEN AT ONCE. Asked 2026-09-23
   * with a picture of the row cut off at C5: *"make keyboard 25 keys shown by
   * default (biit narrower)"*. The arithmetic, MEASURED: the keyboard's box
   * gives 668 px of content, fourteen 2 px gaps take 28, and 640 over fifteen
   * white keys is 42.7.
   * ⚠️ IT IS UNDER THE 44 px TOUCH FLOOR `keyboard.mjs` ARGUES FOR, AND THAT IS
   * A DECISION RATHER THAN AN OVERSIGHT. That floor is Apple's 44 pt minimum,
   * and the trade here is the one this page exists for: a chord chart above a
   * keyboard is useless if the keyboard it names does not fit beside it, and
   * two octaves is what the charts are voiced into. On a phone the row scrolls
   * either way, which is where the floor actually protects a finger.
   */
````

<a id="nola-49"></a>
## nola-49: demo/nola/index.html, inline script, line 893

````js
  /**
   * 🔴 THE LETTERS COVER THE MIDDLE OCTAVE AND NOTHING ELSE, BECAUSE THERE ARE
   * NOT TWENTY FIVE OF THEM. The computer keyboard has one octave's worth in
   * `QWERTY_CHROMATIC`, and `z` and `x` are already the octave pair inside
   * `keyboard.mjs`. So the twelve keys below middle C carry note names only and
   * the thirteen from C4 up keep their letter, which is the component's own
   * rule applied per key: a key labelled `a` that does nothing when you press
   * `a` is worse than a key with no letter on it.
   */
````

<a id="nola-50"></a>
## nola-50: demo/nola/index.html, inline script, line 902

````js
  /**
   * 🔴 THE LETTERS ARE ON THE BOTTOM OCTAVE, WHICH IS C3 HERE. Asked
   * 2026-09-23: *"default asd keyboard to c3"*. They sat on the middle octave,
   * so `a` played C4 while the keyboard started at C3 and the two octaves below
   * your fingers were reachable only with a mouse.
   * ⚠️ AND THERE ARE STILL ONLY THIRTEEN OF THEM, which is the component's own
   * rule rather than a choice: `QWERTY_CHROMATIC` is one octave plus its top C,
   * `z` and `x` are already the octave pair, and a key labelled with a letter
   * that does nothing is worse than a key with no letter on it. What moved is
   * WHICH octave has them, not how many.
   */
````

<a id="nola-51"></a>
## nola-51: demo/nola/index.html, inline script, line 917

````js
  /**
   * 🔴 HOW FAR THE KEYBOARD ON SCREEN REACHES, WHICH IS NOT `REACH`. `REACH` is
   * the LETTER keys, fourteen semitones, and it is the right window for putting
   * a chord somewhere a laptop can play it. It is the wrong window for asking
   * whether a chord you PLAYED fits the picture: MEASURED 2026-09-23, a chord
   * played at A3 C#4 E4 has notes above 62 and would be re-voiced as not
   * fitting, on a keyboard that is drawing those very keys.
   */
````

<a id="nola-52"></a>
## nola-52: demo/nola/index.html, inline script, line 926

````js
  /* 🔴 TWENTY-FIVE KEYS OFF THE KIT SINCE 2026-09-25, AND THE ARITHMETIC
     CAME FROM HERE. This page built the map inline and `/knobs/` was about to
     write it a second time, which is this project's rule about a control that
     exists in one page being a component nobody has noticed yet.
     ⚠️ WHAT THE COMPONENT KEPT IS THE BUG THIS PAGE FOUND. `keyRange` reads the
     letters off `QWERTY_CHROMATIC`'s VALUES rather than off its order, because
     `l` is a D at 14 with nothing at 13, so a positional read puts a white
     letter on a black key. It keeps the `hi<n>` ids too, so the two builds
     produce identical keys and nothing that reads one has to learn the other. */
````

<a id="nola-53"></a>
## nola-53: demo/nola/index.html, inline script, line 946

````js
    /* 🔴 THE INSTRUMENT ROW IS THE COMPONENT'S FOOTER SINCE 2026-09-25, AND
       THIS PAGE NO LONGER DRAWS ITS OWN. Reported off a crop of that row: *"the
       border on top of footer goes edge to edge. in the life of me i don ot
       understand why you do not see it and build a soliutiojn that stays (glued
       panels) not invent custom css with measurements each time"*. This page
       had `.nola-foot` with a `--foot-air: 10px`, a `margin-top`, a
       `padding-top` and a `border-top`, inside a `.kbd` that pads by
       `--kbd-pad`, so the line stopped 9 px short of the box at both ends.
       `keyboard.mjs` owns the row, the line and the air now, for all ten pages
       that import it. */
````

<a id="nola-54"></a>
## nola-54: demo/nola/index.html, inline script, line 573

````js
    /* ⚠️ `vel` IS WHAT THE LOOP GIVES BACK AND `100` IS WHAT A CLICK IS WORTH. A
       key on screen has no velocity, so the flat value stands for it; a looped
       note carries the one it was played with. */
````

<a id="nola-55"></a>
## nola-55: demo/nola/index.html, inline script, line 578

````js
    /* 🔴 AND THE CHARTS MOVE WITH IT. They are drawn in the instrument's window
       so a shape can be carried down the page; an octave press that moved the
       keys and left the charts behind would break exactly that. */
````

<a id="nola-56"></a>
## nola-56: demo/nola/index.html, inline script, line 590

````js
    /* 🔴 THE DAMPER IS PART OF THE KEYBOARD SINCE 2026-09-23, asked for as
       *"integrate sustain to footer"*. It was a `createSwitch` in a row of its
       own under the keys, which is where this page had already decided a pedal
       belongs; the component draws it now, so `/fau/` gets the same control
       without a second page inventing it.
       ⚠️ WHAT STAYS HERE IS WHAT A FOOT MEANS, and `set` rather than `control`
       is still the whole of it: this button is somebody saying the dampers are
       up, not a keyboard with a backwards footswitch, so `?flip=1` must not
       reverse it. MEASURED when it was routed through `control`: four asserts
       red under that flag, and a SUSTAIN button that turned sustain off. */
````

<a id="nola-57"></a>
## nola-57: demo/nola/index.html, inline script, line 602

````js
    /* 🔴 THE KEYBOARD'S OWN `Loop`, AND THE COMPONENT DOES THE LOOPING. Asked
       2026-09-23: *"do not wire nola, its gloabl keyboard fn. nola gets just
       chords as if i played htem"*. The first build put a tape on this page, and
       that is one page solving a problem every page with keys has. The keyboard
       records what it emits and replays it through its own press path, so this
       page sees looped notes as ordinary ones and needs no code at all.
       ⚠️ `log` IS THE ONE LINE THIS PAGE DOES OWE IT, asked for as *"can you tell
       in log what is goin on with loopr"* after a take recorded over MIDI came
       back silent. The component knows what its loop is doing and this page owns
       the log, so it lends it one rather than reporting on the loop itself.
       ⚠️ `'evolution'` RATHER THAN `true` SINCE 2026-09-30: built, and withdrawn
       until `createMidi({ loop: keys })` below sees the Evolution. */
````

<a id="nola-58"></a>
## nola-58: demo/nola/index.html, inline script, line 615

````js
    /* 🔴 TEN TAKES, DRIVEN BY THE NUMBER PAD ON THE MIDI KEYBOARD. Asked
       2026-09-23: *"num works. how come you can not add it to keyboard"*. The
       button is slot 1 and the pad reaches the other nine, so a take per number
       is the same gesture `/num/` was built to get right. */
````

<a id="nola-59"></a>
## nola-59: demo/nola/index.html, inline script, line 623

````js
  /**
   * 🔴 THE `Loop` CONTROL IS OFFERED ONLY WHILE THE EVOLUTION IS PLUGGED IN.
   * Asked 2026-09-28: *"rm loop button when evolution keyboad is not
   * connected"*. `keyboard.mjs` owns the control and this page owns what
   * *connected* means, which is `midi.mjs`'s own division: a page owns MIDI.
   *
   * 🔴 IT STARTS WITHDRAWN, AND THAT IS A DECISION RATHER THAN A DETAIL. The
   * component's default is offered, because `/kit/` is a gallery with no MIDI
   * at all and a gallery that hid this component's newest control would be
   * unreadable. Here the answer is not known until `requestMIDIAccess` resolves,
   * and a button that is on screen for half a second and then vanishes is a
   * control disappearing under somebody's hand. Absent, then offered, is a
   * control ARRIVING, which is the honest direction.
   * ⚠️ SO A BROWSER WITH NO WEB MIDI NEVER SHOWS IT. Safari has none, and the
   * answer there is the true one: this keyboard is not connected and cannot be.
   *
   * 🔴 THE TEST LIVES IN `midi.mjs` SINCE 2026-09-30, when every keyboard page
   * was asked for the same control. This page carried it as its own regular
   * expression, `/evo/` as a second copy, and `instruments.mjs` as the third;
   * `midi.mjs` now reads the one in `instruments.mjs`, which also records why a
   * name test cannot just look for the word `Evolution`: CoreMIDI calls this
   * port `MK-425C USB MIDI Keyboard`. `loop: 'evolution'` above is what starts
   * the control withdrawn, and `createMidi({ loop: keys })` below offers it.
   */
````

<a id="nola-60"></a>
## nola-60: demo/nola/index.html, inline script, line 648

````js
  /**
   * 🔴 TRANSPOSE MOVES WHAT ARRIVES OVER MIDI AND NOTHING ELSE, AND THAT IS THE
   * WHOLE POINT OF IT. It exists to correct a keyboard that is a semitone flat,
   * which is a fact about a box on this desk rather than about the piano. An
   * on-screen key plays the note printed on it at every setting, or a page
   * would be shipping a piano whose middle C is not middle C.
   * ⚠️ AND THE KEY THAT LIGHTS IS THE ONE THAT SOUNDS. `keyboard.mjs`'s own rule
   * is that a key is lit by a NOTE, and after a correction the note you hear is
   * the note you meant.
   */
````

<a id="nola-61"></a>
## nola-61: demo/nola/index.html, inline script, line 658

````js
  /**
   * 🔴 AND IT HAS NO CONTROL ANY MORE, BECAUSE THE INSTRUMENT WAS FIXED.
   * Reported 2026-09-23 as *"fixed transpose"*: the correction now lives on the
   * keyboard, where it belongs, so a stepper on this page would be a second
   * place to get it wrong. `?transpose=<n>` keeps the capability for the
   * session after a power cycle puts the fault back, and the check below still
   * drives it, so the behaviour stays graded with nothing on screen.
   */
````

<a id="nola-62"></a>
## nola-62: demo/nola/index.html, inline script, line 677

````js
  /**
   * 🔴 A SUSTAIN SWITCH, AND IT GOES DOWN THE SAME PATH A PEDAL DOES. Most
   * people opening this page have no pedal, and one of them is holding a phone
   * with no Web MIDI at all, so without this the thing the page is about is
   * unreachable for them. It sends the pedal a real controller message rather
   * than reaching past it, which is `midi.mjs`'s one path rule again: a switch
   * with its own route into the voice manager would be a second implementation
   * of the pedal that nothing grades.
   */
````

<a id="nola-63"></a>
## nola-63: demo/nola/index.html, inline script, line 686

````js
  /**
   * 🔴 A TOGGLE BUTTON UNDER THE KEYS, WHICH IS WHERE A PEDAL IS. Asked for
   * 2026-09-23: *"make sustain a toggle button under the keyboard, std
   * component. rm top component buttons"*. `createPresenceButton` is the kit's
   * toggle button and `/muta/` already drives its MIDI switch with it, so this
   * is the component rather than a fourth thing that looks like one.
   * ⚠️ AND IT SITS WITH THE OCTAVE PAD RATHER THAN IN `.pos-controls`, for the
   * reason `keyboard.mjs` gives about the pad itself: these are controls ABOUT
   * the keys, and a hand's width away at the top of the page is the wrong place
   * for all of them.
   * 🔴 `set`, NOT `control`, AND THE DIFFERENCE IS A CONTROL THAT LIED. This
   * button is somebody saying the dampers are up. It is not a keyboard with a
   * backwards footswitch, so `?flip=1` must not reverse it as well. MEASURED:
   * routing it through `control` took four asserts red under `?flip=1` and
   * would have shipped a SUSTAIN button that turns sustain off.
   */
````

<a id="nola-64"></a>
## nola-64: demo/nola/index.html, inline script, line 703

````js
  /**
   * 🔴 A LINE OF CHORDS, AND A PICTURE OF EACH ONE UNDER IT. Asked for as
   * *"just strings like c5 cmaj, can be separated by anyhing ... render list of
   * pianokeys with chords based on these parsings"*. `demo/shell/chords.mjs`
   * does the reading, and `node demo/shell/chords-test.mjs` grades it with no
   * browser in it. ⚠️ THE COUNT IS DELIBERATELY NOT REPEATED HERE: it was
   * written into three comments in two files and had gone stale in two of them
   * by 2026-09-23, which is `CLAUDE.md`s count-them-never-remember-them rule
   * arriving in a code comment instead of a standing file.
   * ⚠️ IT IS AT THE TOP BECAUSE IT IS AN INPUT, and the keys under it are what
   * it acts on. The row that used to be here held a SUSTAIN switch and a
   * TRANSPOSE stepper, and both are gone: one moved under the keys where a
   * pedal belongs, and the other went with the instrument being fixed.
   * 🔴 NO LABEL, AND IT IS A LAYOUT FACT RATHER THAN A TIDY-UP. Asked
   * 2026-09-29 as *"nola: rm label from chord input field tpo avoid content
   * jump"*. A `.pos-field` is a column of label over box at `gap: 7px`, and the
   * label line measured 9.5 px, so the caption was worth exactly 16.5 px of row
   * height. `.nola-top` is `align-items: flex-end`, the mode chooser is 34 px,
   * and the box on its own is 34 px too, so with the caption on the field was
   * the tallest child of the row and the row was 50.5 px. MEASURED at 1280
   * before this change, switching to `Suggested` and back: the row went 50.5 to
   * 34 and everything under it moved 16.5 px up the page, which is the jump.
   * ⚠️ AND THE ACCESSIBLE NAME GOES ON THE BOX IN THE SAME BREATH. `.pos-field`
   * is a `<label>` with the input inside it, so the name a screen reader hears
   * was the span that just left, and the placeholder cannot stand in for it
   * because it is character for character the value.
   * ⚠️ NO `grow` EITHER, AND IT WAS NEVER DOING ANYTHING. `field.mjs` documents
   * `wide` or nothing, every other caller passes `wide`, and there is no `.grow`
   * rule in `shell.css` or in this page. What sizes this box is `.nola-top
   * .pos-field` at the foot of this sheet, which is why the class going changes
   * no width: MEASURED, the box is 485.58 px at 1280 with it and without it.
   */
````

<a id="nola-65"></a>
## nola-65: demo/nola/index.html, inline script, line 743

````js
  /**
   * 🔴 THE ORDER OF THE PAGE, GIVEN AS FOUR LINES: `desc / textield / exaple
   * keyboar rows / play keyboard`. The instrument goes LAST, under the charts,
   * which is the opposite of where a page usually puts the thing you press.
   * It is right here: the field is what you change, the charts are what it
   * produced, and the keyboard is where you go to hear any of it. Reading down
   * the page is reading the sentence.
   */
````

<a id="nola-66"></a>
## nola-66: demo/nola/index.html, inline script, line 751

````js
  /**
   * 🔴 WHICH INSTRUMENT THE KEYS PLAY, AS THE STANDARD PATCH SELECTOR. Asked
   * 2026-09-25: *"in nolda demo convert instrument radiobutton to std patch
   * selector"*.
   * ⚠️ THE COMMENT THAT STOOD HERE ARGUED AGAINST THIS ASK IN WRITING, that two
   * mutually exclusive named options is `createChoice` and nothing else and
   * that `picker.mjs` is a stepper for a list too long to show. An instruction
   * supersedes a rule and `LAYOUT.md` already says so; what a superseded rule
   * must not do is stay here contradicting the page it sits in. One half of it
   * is kept below and is the reason the arrows WRAP: over a list of two, a
   * clamping arrow is a control that does nothing half the time, which is the
   * shape this project calls a lie.
   * 🔴 AND IT CARRIES NO LABEL, BECAUSE THE ROW IT IS IN IS NOW AN INSTRUMENT
   * FOOTER. `createInstrument`'s header is a name at one end and a patch
   * selector at the other, and this row became that row in the same change:
   * `nola` on the plate at the left, the sound on the right. An `INSTRUMENT`
   * label beside the plate would be two pieces of small caps at one end of one
   * row. `/kit/` and `/fau/` both call this component with no label either.
   * ⚠️ `what` IS `sound` RATHER THAN `patch`, AND THAT IS A DECISION ABOUT WORDS
   * A VISITOR READS. It is the noun in both arrows' hovers and in the
   * dropdown's accessible name, and *the patch before this one* over a choice
   * between a sampled grand and a 1977 Rhodes is a description drifted from the
   * thing it points at. The COMPONENT is the standard patch selector; `what` is
   * what this one really steps.
   * 🔴 IT IS NOT IN `.pos-controls`, AND THAT IS ABOUT THE HARNESS RATHER THAN
   * ABOUT TASTE. `demo/verify.mjs` clicks every button in that row, 650 ms
   * apart, while this page's own checks are already running at load, so a
   * picker there would switch instrument in the middle of the damper check and
   * the level check with nothing in either of them expecting it. The page's own
   * check presses it instead, which grades more than a harness click would.
   * ⚠️ AND IT SITS WITH THE KEYS RATHER THAN A STACK GAP AWAY. `stack.mjs`:
   * a pair that belongs tight is one block. What the keys play and the keys are
   * one thing, the way the sustain button under them already is.
   */
````

<a id="nola-67"></a>
## nola-67: demo/nola/index.html, inline script, line 791

````js
  /* 🔴 THE TWO ARROWS ARE NAMED ONCE, HERE, AND NEVER INDEXED AGAIN. This is
     the whole reason the conversion was not mechanical: `createChoice` returned
     one button PER OPTION, so `buttons[0]` was Piano and `buttons[1]` was
     Rhodes, and ten call sites in this file said so in a trailing comment.
     `createPicker` returns `buttons = [back, fwd]`, so the same two indexes
     become *previous* and *next*.
     ⚠️ AND THE FAILURE WOULD HAVE BEEN SILENT IN THE ONE DIRECTION THAT
     MATTERS. `buttons[1]` meaning RHODES still lands on the Rhodes, because
     *next* from the piano is the Rhodes; `buttons[0]` meaning PIANO becomes
     *previous*, which is a direction rather than a name. A blind swap stays
     green and drives the wrong thing. */
````

<a id="nola-68"></a>
## nola-68: demo/nola/index.html, inline script, line 805

````js
  /* 🔴 THE LICENCE LIVES ON THE VALUE CELL AND IS WRITTEN BACK AFTER EVERY
     DRAW, WHICH IS THE ONE PART OF THIS CHANGE THAT COULD BREAK SOMETHING
     OUTSIDE THIS PAGE. The Rhodes is used under CC BY-NC-SA 4.0 and attribution
     has to travel with the work. A picker has no slot built for it: the two
     arrows carry *the sound before this one* and *the sound after this one*,
     and the cell OVERWRITES its own title on every draw, at `picker.mjs:103`
     and again at `:160`, so anything written there is gone the next time the
     name is drawn.
     ✅ SO THE CREDIT IS WRITTEN BY THE ONE FUNCTION THAT DRAWS. Every draw on
     this page goes through `drawInst`, which is the only caller of `show()`
     here, so there is no path that leaves the credit off.
     ⚠️ AND IT FOLLOWS THE SELECTION RATHER THAN NAMING BOTH AT ONCE, which is
     the real difference from the control it replaces. `createChoice` gave every
     option its own button and so its own hover; a picker shows one name at a
     time. The credit is reachable exactly while the work it credits is the one
     in use, and the reader who never chooses the Rhodes never plays it either.
     ⚠️ THE CELL'S OWN TITLE IS NOT BEING THROWN AWAY BY THIS. `picker.mjs` puts
     the whole name there because the cell ellipsizes at a fixed width; `Piano`
     and `Rhodes` are five and six characters in a cell reserved for eight, so
     nothing here is ever cut and there is no name to lose. On a page with long
     patch names this would be the wrong home.
     ⚠️ AND THE LOG LINE IS THE SECOND CHANNEL AND IS UNTOUCHED: `setInstrument`
     still says which instrument the keys play, on every switch. */
````

<a id="nola-69"></a>
## nola-69: demo/nola/index.html, inline script, line 838

````js
  /* ⚠️ IT WRAPS. See the head of this block: over a list of two, an arrow that
     clamps is dead at one end and there is nothing on the face to say so. */
````

<a id="nola-70"></a>
## nola-70: demo/nola/index.html, inline script, line 847

````js
  /* 🔴 THE PAGE'S OWN CHECKS PRESS THIS CONTROL BY NAME, NEVER BY INDEX. Ten
     call sites below used to click an index and write the instrument in a
     trailing comment, which is exactly the arrangement the block above says
     goes quietly wrong.
     ⚠️ IT PRESSES, IT DOES NOT SET. `setInstrument` is one call away and
     reaching for it would leave the control this change replaces graded by
     nothing, which is the loss `positron-verify` records on `/mirror/` and
     `/blocks/`, where ten and six asserts went silent behind a control nobody
     could press. */
````

<a id="nola-71"></a>
## nola-71: demo/nola/index.html, inline script, line 861

````js
  /**
   * 🔴 WHERE THE CHORD IS PUT, WHICH IS A DIFFERENT QUESTION FROM WHAT IT IS.
   * Asked three times, and the last time with the reason: *"can there be
   * voicing selector to make it easier to play on 25 keys"*.
   * ⚠️ `root` IS FIRST AND IS NOT THE DEFAULT. The spelling is what the SYMBOL
   * says, so it has to be available or the chart is lying about `Fm6/C`; it is
   * also the hardest of the three to play, spanning up to fourteen semitones.
   * `lead` opens, because a line of chords is a progression and that is the
   * mode that makes one playable: MEASURED in `chords-test.mjs` over seven
   * chords, 27 semitones of hand movement against 57 for close and 46 for root.
   */
````

<a id="nola-72"></a>
## nola-72: demo/nola/index.html, inline script, line 872

````js
  /* 🔴 `Exact` OPENS SINCE 2026-09-23, ASKED AS *"exact should default"*, and
     that reverses what the block below argues. `lead` opened because a typed
     line is a progression and that is the mode that makes one playable, which
     is still true and is still measured. What changed is what this page is
     mostly FOR: it opens on `Played` now, where the rows are a record of chords
     somebody really put their hands on, and the honest drawing of those is the
     one that matches the hands. A learned row is drawn as played whatever this
     is set to; this decides the typed line and the proposal. */
````

<a id="nola-73"></a>
## nola-73: demo/nola/index.html, inline script, line 881

````js
  /* 🔴 THE LABELS SAY WHAT EACH ONE DOES, NOT WHAT IT IS CALLED. They read
     `SPELLED`, `CLOSE` and `LEADING` for ten minutes and the report was *"i do
     not know what spelled close leading means"*, which is fair: those are the
     words a musician uses about voicings and `positron-ui` bans exactly that,
     a private vocabulary on a control a visitor has to be told about. What is
     left is three plain words and a sentence on hover. */
````

<a id="nola-74"></a>
## nola-74: demo/nola/index.html, inline script, line 894

````js
    /* ⚠️ `VOICING` IS THE TERM AND A TERM IS NOT JARGON. It was `CHORDS` for
       an hour, to avoid a word a visitor might not know, and the name of a
       thing is exactly what this project's rule says to keep: `Yoshimi`,
       `SuperCollider` and `Pappus` are all on these pages. What the rule bans
       is a PRIVATE vocabulary, and what a visitor needed was for the three
       OPTIONS to say what they do, which they now do.
       ⚠️ AND THE OPTIONS ARE NOT SHOUTED. `.pos-choice button` never uppercased
       anything: these were literal capitals typed into the page, which made two
       ordinary words look like an abbreviation. */
````

<a id="nola-75"></a>
## nola-75: demo/nola/index.html, inline script, line 904

````js
    /* \u{1F534} `Split` IS A FOURTH OPTION SINCE 2026-09-25, ASKED FOR WITH A PICTURE
       RATHER THAN A WORD: *"what voicing? wanna this"*, beside a piano tutorial
       of `Cmaj7 Dm7 Em7 Fmaj7` on two staves with one bass note per chord in the
       left hand and three notes in the right that barely move.
       \u{1F534} AND THE LABEL IS A PLAIN WORD BECAUSE THIS EXACT CONTROL HAS ALREADY
       PAID FOR THE OTHER KIND. These read `SPELLED`, `CLOSE` and `LEADING` for
       ten minutes and the report was *"i do not know what spelled close leading
       means"*. A musician calls this one a rootless voicing over a bass root,
       and `chords.mjs` writes that name down once for a reader who knows it.
       `Split` is what a visitor SEES: the chord split into a note underneath
       and a handful above it. */
````

<a id="nola-76"></a>
## nola-76: demo/nola/index.html, inline script, line 917

````js
    /* 🔴 A VOICING PRESS RE-VOICES EVERYTHING, LEARNED ROWS INCLUDED, AND THAT
       IS THE ANSWER TO *"you can revoice if i choose so?"*. A row lands where
       your hands were, because that is a record of what you did; pressing one of
       these is you asking for it to be moved, so it moves. */
````

<a id="nola-77"></a>
## nola-77: demo/nola/index.html, inline script, line 925

````js
  /**
   * 🔴 THE CREDIT IS ON THE FACE OF THE PAGE BECAUSE THE LICENCE REQUIRES IT,
   * NOT BECAUSE IT IS POLITE. The Rhodes is CC BY-NC-SA 4.0, the BY term is
   * attribution, and a name in a file beside the recordings is not attribution
   * to anybody who opens the page. `LICENSE-jrhodes3d` carries the whole of it
   * including the three things the upstream licence says; this is the line a
   * visitor reads.
   * ⚠️ IT NAMES BOTH INSTRUMENTS, because a page that credits one recording and
   * not the other reads as though the other one came from nowhere.
   */
````

<a id="nola-78"></a>
## nola-78: demo/nola/index.html, inline script, line 935

````js
  /* ⚠️ BUILT AND NOT DRAWN, which is deliberate rather than dead code: the
     sentence is the licence's own wording and the hover above quotes it, so the
     two must not drift. Appending it is one line if the face ever wants it back.
     ⚠️ AND THE ATTRIBUTION IS CHECKED WHERE IT NOW LIVES, on the picker's hover,
     because that is the thing the licence needs and the thing a reader can
     reach. */
````

<a id="nola-79"></a>
## nola-79: demo/nola/index.html, inline script, line 951

````js
  /* 🔴 DECLARED HERE AND NOT BESIDE THE HANDLERS THAT FILL IT, because the SAVE
     control below is built before them and a `const` shadows its whole block
     from the top. Written down there it read `Cannot access 'RECORDING' before
     initialization` and took the page to 0/1. That is the fourth temporal dead
     zone in this session and the symptom is never near the cause. */
````

<a id="nola-80"></a>
## nola-80: demo/nola/index.html, inline script, line 963

````js
  /* 🔴 THE VOICING PICKER IS PUT AWAY, ASKED FOR IN THESE WORDS: *"it feels
     'exact' does not have role in played mode except savign my position. i am
     lost in this setting"*, then *"can we archive it and pick one for now so i
     can enjoy playing without travelline too much"*.
     ⚠️ IT IS BUILT AND NOT DRAWN, RATHER THAN DELETED. Everything it does still
     works and `chords.mjs` still grades all three modes with no browser in it,
     so bringing it back is one line. What is gone is a control that had stopped
     meaning anything where the page now opens: a learned row is drawn where the
     hands were, so `Exact` only ever meant *leave my playing alone*, and the
     other two were a way to scramble a record of what somebody did.
     ✅ AND THE ONE IT IS FIXED AT IS THE ONE THAT MOVES YOUR HAND LEAST, which
     is measured rather than chosen: `chords-test.mjs` reads 27 semitones of
     movement over seven chords for `lead` against 57 for close and 46 for root.
     *"without travelline too much"* is exactly what that number is. */
````

<a id="nola-81"></a>
## nola-81: demo/nola/index.html, inline script, line 977

````js
  /* 🔴 THE INSTRUMENT SWITCH IS A FOOTER INSIDE THE KEYBOARD'S OWN BOX SINCE
     2026-09-25, ASKED AS *"add piano / rhodes into a isntrument footer to the
     right glued under keyboaed"*. It was a labelled row a block ABOVE the keys,
     which is the same complaint `roll.mjs` already answers from the other side:
     a thing that belongs to the instrument goes inside the instrument's box,
     and that is what makes it line up with it.
     ⚠️ INSIDE `.kbd`, NOT UNDER IT, WHICH IS WHAT `glued` CAN MEAN HERE. The
     keyboard's box is `width: fit-content`, so a sibling below it would either
     be a different width or force the box to stretch, and stretching it is the
     one thing that box's own rule refuses. Appended to `keys.el` it shares the
     border, the ground and the padding, and there is no seam to get wrong.
     ⚠️ AND IT DOES NOT TOUCH THE COMPONENT'S OWN FOOTER. The octave pair, the
     displacement, the chord name, `Loop`, `Sustain` and `Panic` are
     controls ABOUT THE KEYS and belong to `keyboard.mjs`; which instrument the
     keys play is this page's, so it gets a row of its own under theirs.
     ⚠️ THE ATTRIBUTION TRAVELS WITH THE CONTROL AND IS NOT RE-HOMED. The
     Rhodes' licence needs a name a reader can reach, and since 2026-09-23 that
     is this control's own hover plus the log line on the first press. Which
     ELEMENT of the control holds it changed when the control did, on
     2026-09-25, and the block above the picker carries that whole argument.
     🔴 AND IT IS A TWO ENDED ROW SINCE 2026-09-25, WITH A LINE ABOVE IT. Asked
     as *"add top border to that footer. add nola nameplace to the left of
     footer"*, so `hard right` below is now one end of it rather than the whole
     of it, and the line is the first thing drawn across the inside of this box.
     The stylesheet carries why it is a line here and spacing everywhere else. */
````

<a id="nola-82"></a>
## nola-82: demo/nola/index.html, inline script, line 1003

````js
  /* 🔴 THE PAGE'S OWN NAMEPLATE AT THE OTHER END OF THAT ROW, ASKED 2026-09-25
     AS *"add nola nameplace to the left of footer"*. This page had no plate at
     all until today, measured: zero occurrences of `nameplate` or `pos-plate`.
     With the selector at the right it makes the row an instrument header laid
     on its back, which is the same pairing `createInstrument` already draws.
     🔴 `place: 'ends'`, NOT WHAT `plateSpec` RETURNS, AND THIS IS THE ONE THING
     HERE THAT WOULD HAVE PUT BOTH CHILDREN ON THE RIGHT WHILE EVERY RULE ABOUT
     THE ROW READ AS CORRECT. `plateSpec('', 'nola')` downgrades a single line to
     `end`, and it is right to: `ends` is `space-between`, which parks a lone
     child on the LEFT of a plate that SPANS its container, and that is a bug
     everywhere except here. Left is the placement this row was asked for, and
     `.panel-plate[data-place="end"]` carries `margin-left: auto`, which absorbs
     the row's free space before `justify-content` ever runs and drags the plate
     across to sit beside the selector.
     ⚠️ SO `createNameplate` IS CALLED DIRECTLY RATHER THAN THROUGH `plateSpec`.
     `plateSpec` keeps one line only for `side`, which is a vertical plate glued
     down a case, and reaching into `demo/shell/` to widen that list would be a
     change to a shared module for one page's benefit.
     ⚠️ AND IT IS UPPERCASE, WHICH IS THE COMPONENT'S DEFAULT RATHER THAN A
     CHOICE MADE HERE. `caps: false` exists for `/shape/`, whose ask named a
     lower case word in a sentence about nothing else; nothing was said about
     the case of this one, so it takes the project's rule. */
````

<a id="nola-83"></a>
## nola-83: demo/nola/index.html, inline script, line 1027

````js
  /* 🔴 ON THE PATCHBAY, AFTER A PRESS (plans/plan-routing-migration.md §2.1):
     an engine node with a MIDI in and a sound that stays on this machine.
     Building it opens nothing; Join beside the plate does, in `?room=` when the
     page has one and in the run's own room under the harness. A keyboard linked
     to it on /patchbay/ plays it alone, and the badge beside Join says whether
     its notes are arriving: *"perhaps just visual indication"*, not a patch
     view. With no link open every MIDI input plays it, which is this page as it
     was. The handlers are the four below, by name, so no third copy exists. */
````

<a id="nola-84"></a>
## nola-84: demo/nola/index.html, inline script, line 1042

````js
  /* 🔴 THE CREDIT COMES OFF THE FACE AND DOES NOT LEAVE THE PAGE, because the
     licence is not a preference. Asked 2026-09-23 to remove the sentence, and
     CC BY-NC-SA 4.0 requires attribution to travel with the work: what it does
     NOT require is a paragraph under the keys. It is on the sound selector's
     hover, where this page already keeps a fact a reader may want and does not
     need on the face, and in the log when the Rhodes is first chosen.
     ⚠️ WHICH ELEMENT OF THAT CONTROL HOLDS IT IS NOT A DETAIL AND MOVED WITH
     THE CONTROL ON 2026-09-25: a selector draws ONE name at a time and
     overwrites its own hover every time it draws. The block beside
     `createPicker` carries the whole argument and the check reads it there.
     ⚠️ AND THE SHIPPED FILES ARE THE OTHER HALF: `demo/nola/LICENSE-jrhodes3d`
     and `PROVENANCE-rhodes.json` go out with the recordings and `build.mjs`
     carries the line that keeps them there. Deleting the sentence outright would
     have left the attribution in nothing a visitor can reach. */
````

<a id="nola-85"></a>
## nola-85: demo/nola/index.html, inline script, line 1058

````js
  /* 🔴 THE ONE CONTROL THAT ONLY EXISTS UNDER `?rec=1`, so no visitor meets it
     and no harness press moves. It writes the take to a file and says how much
     is in it, because a recorder with no readout is a recorder nobody can tell
     is running. */
````

<a id="nola-86"></a>
## nola-86: demo/nola/index.html, inline script, line 1102

````js
  /* 🔴 THE MODE SITS BESIDE THE FIELD IT TURNS OFF, not down with the keys.
     `Suggested` takes the chord field out of the document, and a control that
     removes something three blocks away is a page asking a reader to work out
     what happened. The two pickers under the keys are about the instrument;
     this one is about where the roll's rows come from, which is what the field
     is. ⚠️ AND THE FIELD HAS NO CAPTION TO NAME IT SINCE 2026-09-29, which is
     the other half of sitting beside the control that owns it. */
````

<a id="nola-87"></a>
## nola-87: demo/nola/index.html, inline script, line 1112

````js
  /* 🔴 A FOUR CHORD WAY HOME STOOD HERE AND WAS REMOVED WHOLE ON 2026-09-29, ON
     *"rm A WAY HOME"*. It was a heading, a two column table of four rows and
     `routeTo`, and everything that existed only to serve it went in the same
     pass: the wrapper, `drawHome` and its three pieces of state, its four
     callers, the `.nola-home-h` rule, the height measurement that graded its
     reserve, and the `createTable` import, which this page had for that one
     table and nothing else. What it measured is not lost: the route search is
     still `suggest.mjs`'s `routeTo` and is still graded by `suggest-test.mjs`,
     and `plans/plan-better-chords-2026-09-25.md` keeps the numbers that bought
     it, because a plan records what was decided when it was decided.
     ⚠️ AND IT SAT BELOW THE KEYBOARD RATHER THAN ABOVE IT, MEASURED BEFORE THE
     CUT rather than read off this comment: `.kbd` at y 239.5 and the block at
     y 743.8 at 1280 px. So its `minRows: 4` reserve was never holding the
     keyboard still, whatever the note beside it claimed, and taking the block
     out moved nothing a hand is on. */
````

<a id="nola-88"></a>
## nola-88: demo/nola/index.html, inline script, line 1131

````js
  /**
   * 🔴 THE THREE MIDI HANDLERS ARE NAMED FUNCTIONS RATHER THAN LITERALS INSIDE
   * `createMidi`, SO THE PAGE'S OWN CHECKS CAN DRIVE THEM. This machine has no
   * MIDI under a harness, so they are the only part of that path a check can
   * ever reach, and a check that reached past them to `press` would grade this
   * page's arithmetic against itself.
   * ⚠️ AND IT WAS EXACTLY THAT, AND SABOTAGE CAUGHT IT. The transpose check
   * used to call `press(60 + transpose)` by hand, which is the correction
   * written out a second time in the check, so a transpose that leaked into the
   * on-screen keys left the page 24/24 green.
   */
````

<a id="nola-89"></a>
## nola-89: demo/nola/index.html, inline script, line 1142

````js
  /**
   * 🔴 THE TAP, AND IT EXISTS BECAUSE A PAGE CANNOT BE TRUSTED TO REPORT ON
   * ITSELF. Asked 2026-09-23: *"do tap and compare what i play in midi and what
   * you save. you seem to lose keys i play"*. Every check on this page presses
   * SCREEN keys, so the whole MIDI path is graded by nothing, and the page was
   * reading 72/72 green while a real keyboard was being lost somewhere.
   *
   * ⚠️ IT KEEPS ITS OWN MODEL OF WHAT IS DOWN, BUILT FROM THE RAW MESSAGES,
   * and compares that against `heldNotes`, which is what the page believes. Two
   * independent sources, which is this repository's rule after a build silently
   * re-credited a recording because two numbers came off one field. A counter
   * the page derives from its own state could only ever agree with itself.
   * ⚠️ AND IT COMPARES THROUGH `transpose`, because the raw note and the note
   * the page holds are deliberately different by that much. Comparing the two
   * without it would report a divergence on every single key.
   */
````

<a id="nola-90"></a>
## nola-90: demo/nola/index.html, inline script, line 1170

````js
  /**
   * Does the page hold exactly what the wire says it holds? Called after every
   * message, because a divergence that heals is still a divergence and the
   * moment it appears is the only moment it names a cause.
   */
````

<a id="nola-91"></a>
## nola-91: demo/nola/index.html, inline script, line 1195

````js
  /**
   * 🔴 THE TAPE, AND IT EXISTS BECAUSE EVERY TIMING NUMBER ON THIS PAGE IS A
   * GUESS. Asked 2026-09-23: *"should i play and you measure?"*, *"save sample
   * for testing?"*, *"real human data"*.
   * `research/chord-learning-2026-09-23.md` says it in its own words: nobody
   * played any of it, its session was synthetic, and it put a factor of ten
   * between a chord held and a chord passed through BY CONSTRUCTION. So
   * `LEARN_GATE`, `LEARN_WINDOW` and `LEARN_TIMES` are three numbers nothing has
   * ever checked against a pair of hands.
   * ⚠️ IT RECORDS THE WIRE, NOT THIS PAGE'S READING OF IT. What is wanted is the
   * playing, so that a different gate can be tried against the same take without
   * anybody playing it twice. Raw note numbers, before transpose.
   * ⚠️ AND IT IS BEHIND `?rec=1`, so no control appears for anybody else and no
   * harness press moves. Nothing is recorded, offered or sent unless somebody
   * opened the page asking for it.
   */
````

<a id="nola-92"></a>
## nola-92: demo/nola/index.html, inline script, line 1237

````js
  /**
   * 🔴 THE NUMBER PAD DRIVES THE KEYBOARD'S OWN LOOPS, AND THAT IS THE WHOLE OF
   * WHAT THIS PAGE OWES THEM. Asked 2026-09-23: *"num works. how come you can not
   * add it to keyboard"*. A page owns MIDI, by `midi.mjs`'s one path rule, and
   * the keyboard owns looping, so the wiring is a program number becoming a slot
   * number and nothing else. No tape, no lap and no scheduling on this page,
   * which is what *"do not wire nola, its gloabl keyboard fn"* asks for.
   * 🔴 MEASURED OFF THE WIRE 2026-09-23, not read from a manual. One press of a
   * pad button on the MK-425C is three messages on MIDI CHANNEL 2: bank select
   * LSB, bank select MSB, both zero every time, then a program change carrying
   * the number printed on the key. All ten were pressed and all ten arrived.
   * ⚠️ AND THE PAD'S `0` IS PROGRAM 0, WHICH IS SLOT 10. The printed number is
   * the program number, so the mapping is the panel's own printing rather than an
   * order this page invented.
   */
````

<a id="nola-93"></a>
## nola-93: demo/nola/index.html, inline script, line 1258

````js
  /* 🔴 EVERY INPUT PLAYS THIS PAGE UNTIL A LINK ON /patchbay/ SAYS WHICH ONE.
     `createMidi` cannot say which keyboard a message came from, so while a link
     is open its path is shut here and the linked keyboard arrives through
     `engine`, into the same four functions. */
````

<a id="nola-94"></a>
## nola-94: demo/nola/index.html, inline script, line 1271

````js
    /* ⚠️ THE NAMES DECIDE THE `Loop` CONTROL AND THE COUNT DECIDES THE LOG
       LINE, and they are two different questions. Something being plugged in is
       not the Evolution being plugged in, which is why `midi.mjs` passes both.
       ⚠️ AND IT RUNS ON EVERY CHANGE RATHER THAN ONCE. `onstatechange` is what
       makes a keyboard plugged in after this page opened bring the control back
       and one unplugged take it away; a page that only looks once is a page you
       have to reload, which that module already says in those words. */
````

<a id="nola-95"></a>
## nola-95: demo/nola/index.html, inline script, line 1287

````js
  /* 🔴 THE TAP IS READABLE FROM OUTSIDE THE PAGE, so a check can compare the two
     sides without the page summarising itself first, and so a person can read it
     in the console after playing. `drops` is a Map, which does not survive
     being copied out of the page, so it goes as an object. */
````

<a id="nola-96"></a>
## nola-96: demo/nola/index.html, inline script, line 1312

````js
  /**
   * The loudest partial in whatever is sounding, in Hz.
   *
   * ⚠️ WHICH PARTIAL IT IS DOES NOT MATTER AND THAT IS THE POINT. Two notes a
   * semitone apart played from the SAME recording are the same samples at two
   * rates, so their spectra are one shape scaled: whichever partial is loudest
   * in one is loudest in the other, and the ratio of the two readings is the
   * ratio of the two rates whether that partial is the first or the fifth.
   * Measuring both at the same age after the key went down is what makes that
   * true, because a piano's partials decay at different speeds.
   */
````

<a id="nola-97"></a>
## nola-97: demo/nola/index.html, inline script, line 1331

````js
  /**
   * 🔴 THE CHORDS ON SCREEN, ONE SMALL KEYBOARD EACH.
   *
   * ⚠️ `pad: false` AND `letters: false`, WHICH IS WHAT MAKES THIS A PICTURE
   * RATHER THAN AN INSTRUMENT. An octave pair and a `Panic` under each of
   * twelve chords is a screen of controls belonging to nothing, and the letters
   * would claim a computer key plays a chord chart.
   * ⚠️ AND PRESSING ONE STILL SOUNDS, because a chord you can hear is the whole
   * reason to draw it. That is the one thing it keeps from being an instrument.
   * 🔴 EVERY CHART IS 25 KEYS BASED AT THE C AT OR BELOW THE CHORD'S LOWEST
   * NOTE. A window sized to each chord would make a ragged list, and 13 keys is
   * not enough: `Bmaj7` spans eleven semitones from B and a slash bass puts
   * another octave under it, so a fixed 13 would cut notes off the end without
   * saying so.
   */
````

<a id="nola-98"></a>
## nola-98: demo/nola/index.html, inline script, line 1348

````js
  /* Declared here so `onOctave` above can reach it before `drawChords` is
     defined. A function declaration would hoist; this is a page saying the
     order of its own definitions out loud.
     🔴 AND IT HAS TO ASK WHICH MODE THE ROLL IS IN, OR A VOICING PRESS WOULD
     DELETE EVERYTHING THE PAGE HAD LEARNED. `drawChords` ends in
     `roll.setRows(rows)` built from the typed line, so in `Played` that is not
     a re-voicing, it is the roll being replaced by an empty one. */
````

<a id="nola-99"></a>
## nola-99: demo/nola/index.html, inline script, line 1019

````js
  /**
   * 🔴 ONE ROLL, NOT A KEYBOARD PER CHORD. Asked 2026-09-23 as *"rm these
   * keyboards"* with the four chart headings quoted back, after *"rm exta
   * keyboards from nola, replace with vert pianoroll"*. Four keyboards drawn to
   * say four chords is four instruments on a page that has one, and every one
   * of them carried the octave pad argument, the letters argument and the
   * lining-up argument again.
   * ⚠️ WHAT SURVIVES IS THE PARSER AND THE VOICING. `chords.mjs` still reads
   * the line and the chord is still moved into the instrument's own window
   * rather than the window being moved to the chord, which is the correction a
   * screenshot forced the first time.
   */
````

<a id="nola-100"></a>
## nola-100: demo/nola/index.html, inline script, line 1031

````js
  /* ⚠️ THE HOST IS THE KEYBOARD ITSELF, first inside its own box. See
     `roll.mjs`: a roll drawn beside the instrument had neither its width nor
     its `--k-min` and missed every column by a few pixels. */
````

<a id="nola-101"></a>
## nola-101: demo/nola/index.html, inline script, line 1034

````js
  /**
   * 🔴 PICKING A ROW PUTS THE CHORD ON THE KEYS. Asked 2026-09-23: *"make
   * pianoroll rows selectable. selecting puttign gray dots on the keyboard"*.
   * That is the chord charts' whole function arriving in one line: a shape you
   * read above, shown on the instrument you play.
   * ⚠️ THE COMPONENT REPORTS AND THIS PAGE PAINTS. `roll.mjs` knows nothing
   * about a keyboard, which is why the same roll can sit over anything.
   * ⚠️ AND THE OLD HINT IS CLEARED FIRST, EVERY TIME. A hint is a class on a
   * key rather than a property of the roll, so a second pick with the first
   * one's notes still lit would draw a chord nobody chose.
   */
````

<a id="nola-102"></a>
## nola-102: demo/nola/index.html, inline script, line 1051

````js
  /* 🔴 FIVE ROWS OF ROOM WHETHER OR NOT THERE IS ANYTHING IN THEM. Asked
     2026-09-23: *"make piano roll h fixed to 5 items even when no data"*. The
     learning mode opens on an empty roll by design, so with no floor this page
     grows the first time a chord lands and again on every row after it, which
     is the thing that must not happen while somebody is looking at it.
     ⚠️ EIGHT SINCE 2026-09-23, ASKED AS *"fix heigth to 8 rows"*. It was five,
     which was the typed line's four chords plus a proposal, and that is the
     shape of the SMALLER of the two modes. The learning mode admits up to six
     and draws a proposal under them, so five meant the roll still grew while
     somebody played, which is the one thing reserving the room exists to
     prevent. */
````

<a id="nola-103"></a>
## nola-103: demo/nola/index.html, inline script, line 1074

````js
      /**
       * 🔴 THE CHORD IS VOICED INTO THE INSTRUMENT'S WINDOW, AND THIS IS THE
       * ARITHMETIC A SCREENSHOT BOUGHT. The charts were based at the C below
       * each chord and the keyboard below them at C3, so the same key sat in a
       * different COLUMN above and below: the one thing a chart is for is
       * carrying a shape down the page to your hands, and it could not be
       * carried. `chords.mjs` voices from middle C because it has to pick
       * something; which octave a chord is played in is the player's, so
       * shifting it by octaves to land under the keys is free and moving the
       * window is not.
       */
````

<a id="nola-104"></a>
## nola-104: demo/nola/index.html, inline script, line 1085

````js
      /**
       * 🔴 THE VOICING IS `chords.mjs`'s ARITHMETIC, NOT THIS PAGE'S. What was
       * here was four lines that moved a chord by whole octaves until its
       * lowest note was in the window, which is a placement and not a voicing:
       * it never changed the SHAPE, so `Fm6/C` stayed fourteen semitones wide
       * and every chord in a line started wherever its own root happened to
       * fall. The module does it now, with 49 checks and no browser, and three
       * modes rather than one.
       * ⚠️ `near` IS THE CHORD BEFORE IT, which is the whole of what leading
       * means, and it is the row already voiced rather than the one parsed.
       */
````

<a id="nola-105"></a>
## nola-105: demo/nola/index.html, inline script, line 1097

````js
      /**
       * 🔴 THE WINDOW IS WHAT THE COMPUTER KEYBOARD CAN REACH, NOT WHAT THE
       * SCREEN DRAWS. Asked 2026-09-23: *"any good voicing for ads keyboard?"*.
       * The keys on screen are two octaves and the letter row is fifteen
       * semitones of them, so a chord voiced into the whole picture can be one
       * nobody without a MIDI keyboard can play. MEASURED across seven real
       * chords: every one of them fits inside the letter row in all three
       * modes, the widest being `F/C` and `Fm6/C` at twelve semitones.
       * ⚠️ AND THE REACH IS READ OFF THE LETTER MAP rather than typed, so
       * adding a letter to `QWERTY_CHROMATIC` widens it by itself. `l` was
       * added this afternoon and moved it from twelve to fourteen.
       * ⚠️ IT COSTS THE TOP OCTAVE, ON PURPOSE. Chords sit in the lower half
       * and the keys above them are where a melody goes, which is the hand
       * position anybody playing chords and a tune already uses.
       */
````

<a id="nola-106"></a>
## nola-106: demo/nola/index.html, inline script, line 1112

````js
      /**
       * \u{1F534} `split` GETS THE WHOLE DRAWN KEYBOARD AND NOT THE LETTER ROW, AND
       * THAT IS ARITHMETIC RATHER THAN A PREFERENCE. The letter row is fourteen
       * semitones, which is one hand, and this voicing is two: a note
       * underneath plus three above it needs more room than a hand has.
       * MEASURED on the four chords that asked for it, into 48 to 62: three of
       * them fit and `Fmaj7` comes out F3 A3 C4 E4, whose E4 is 64, TWO
       * SEMITONES ABOVE the top letter key. One chord of four would have been
       * drawn with a note nobody can reach and `outside` would have said so on
       * every redraw.
       * \u26a0\ufe0f AND THE PROMISE THE LETTER ROW MAKES IS NOT BEING BROKEN, it is
       * being declined by a mode that never made it. The three other voicings
       * still fit under the letters, which is what the control was asked for;
       * this one is for two hands and says so in its own hover.
       */
````

<a id="nola-107"></a>
## nola-107: demo/nola/index.html, inline script, line 1139

````js
    /* 🔴 A TOKEN THAT DID NOT PARSE IS SHOWN BACK, NEVER DROPPED. A line with
       four words and three rows under it, and nothing saying which word went
       missing, is the shape `createDiagram`'s `cuts` already refuses. */
````

<a id="nola-108"></a>
## nola-108: demo/nola/index.html, inline script, line 1147

````js
    /* 🔴 WHERE THE KEY CAME FROM, SAID OUT LOUD. Nothing in a line of chord
       symbols declares one, so the numerals are read against the FIRST chord's
       root. That is an inference, and a page showing `bVII` without saying what
       it is flat OF would be stating a fact it had guessed. */
````

<a id="nola-109"></a>
## nola-109: demo/nola/index.html, inline script, line 1159

````js
  // ── the roll listening instead of reading ─────────────────────────────────
  //
  // 🔴 ASKED FOR 2026-09-23: *"implement nola learning mode"*, after *"idea is
  // to have alt mode in nola where i play chords and the ones i keep returning
  // to add them to piano roll. then when have at least 2, suggest 3rd and 4th
  // somehow"*. `research/chord-learning-2026-09-23.md` is 1,174 lines of
  // specification for exactly this and it settles the questions that would
  // otherwise be guessed at. `demo/shell/name.mjs` is the arithmetic and
  // `name-test.mjs` grades it with no browser in it.
  //
  // 🔴 EVERY NUMBER BELOW IS A GUESS AND NOT ONE OF THEM HAS BEEN PLAYED. The
  // research's own section 8 says so in capitals: its timing numbers come off a
  // synthetic session it generated with a factor of ten between a passing chord
  // and a held one BY CONSTRUCTION, so every gate between them worked. What has
  // to be measured, with hands on the MK-425C, is the spread between the first
  // and last note of a rolled chord and the histogram of how long a chord is
  // held when it is meant against when it is passed through. **If the real gap
  // is a factor of two rather than ten, `LEARN_GATE` is a much harder choice and
  // might not exist at all.**
````

<a id="nola-110"></a>
## nola-110: demo/nola/index.html, inline script, line 1182

````js
  /* 🔴 MEASURED 2026-09-23 ON A REAL TAKE, AND IT WAS 200. Asked *"should i
     play and you measure?"*, and 894 messages over 63.1 s answered it.
     `demo/resources/read-nola-take.mjs` on that take: the gaps between one note
     on and the next are two clean populations with an EMPTY VALLEY between
     them. Inside a chord, 239 of 246 gaps are under 60 ms. Between chords, the
     next gap is 120 ms and there are 206 of them above it. One single gap in
     the whole minute lands between 60 and 120.
     ✅ SO 90 ms IS THE MIDDLE OF AN EMPTY VALLEY, not a compromise, and it is
     the one number in this file that is now measured rather than guessed.
     🔴 AND 200 WAS NOT A ROUNDING ERROR, IT WAS DESTROYING THE FEATURE.
     Replayed through the real recogniser by `replay-nola-take.mjs`, the same
     take yields 32 confident readings at 200 ms and 128 at 90. It was merging
     chords played 120 to 200 ms apart into one unreadable set, which is a page
     losing three quarters of what somebody played. */
````

<a id="nola-111"></a>
## nola-111: demo/nola/index.html, inline script, line 1197

````js
  /**
   * 🔴 AND THIS ONE IS A RETREAT, NOT A TUNING. 400 ms LEARNED NOTHING AT ALL.
   * The research assumed a factor of TEN between a chord meant and a chord
   * passed through, said so, and swept 200 to 800 ms finding every value
   * working. MEASURED on a real take: the quartiles are 269 and 506 ms, a
   * spread of **1.9x**, and the hold time distribution is one broad hump with
   * no valley in it anywhere. **There is no floor that separates the two,
   * because on a real keyboard they are not two populations.**
   * ⚠️ 400 ms DISCARDED 55 PER CENT OF EVERY NOTE PLAYED and admitted **zero**
   * chords in a 63 second take. 120 ms keeps about 95 per cent.
   * ✅ SO THE FLOOR STOPS PRETENDING TO DO THE WORK AND ONLY REJECTS AN
   * ACCIDENTAL BRUSH, AND REPETITION DOES THE REST. Which is what was asked for
   * in the same breath: *"i can held way less, go for mode repetitions"*.
   */
````

<a id="nola-112"></a>
## nola-112: demo/nola/index.html, inline script, line 1212

````js
  /** 🔴 HOW MANY TIMES YOU COME BACK TO A CHORD BEFORE IT IS KEPT. Asked
   *  2026-09-23: *"just monitor what i play and save repeating ones"*, then
   *  *"i can held way less, go for mode repetitions"* and *"3?"*. This was a
   *  TOTAL of time held until then, which admits a chord you rested on once
   *  while thinking, and that is the opposite of a chord you returned to.
   *  ✅ THREE IS MEASURED RATHER THAN CHOSEN. Replayed against a real 63 second
   *  take at the measured window and floor, two arrivals learn `Dmaj Cmaj
   *  Emin7` and three learn `Dmaj Cmaj`, which are the two chords that take
   *  2,698 and 2,521 ms of that minute between them. The third was an
   *  eight-note-long passing chord. */
````

<a id="nola-113"></a>
## nola-113: demo/nola/index.html, inline script, line 1225

````js
  /**
   * 🔴 WHICH COUNTED TABLE THE SUGGESTER READS. Asked 2026-09-23, after the
   * research: *"can you benchmark yr suggestions. want them to be
   * openstudiojazz quality stuff"*, *"no cliches"*, *"perhaps a setting to
   * toggle jazzyness / style?"*. It is `?style=pop` today and not a control,
   * because a control in `.pos-controls` would move every other page's harness
   * press and a control anywhere else is a decision about layout nobody has
   * asked for yet. The dial is real: MEASURED, the two tables disagree on the
   * first suggestion for 71.2 per cent of shared contexts AND spell 59 of 75
   * shared symbols differently.
   * ⚠️ NOTHING ON THIS PAGE READS A TABLE. It asks `suggest()` for a pair and
   * draws what comes back, so a third style is one more string here.
   */
````

<a id="nola-114"></a>
## nola-114: demo/nola/index.html, inline script, line 1239

````js
  /**
   * 🔴 ONE SEEDED STREAM FOR EVERY DRAW THIS PAGE MAKES, AND THE SEED IS FIXED
   * RATHER THAN TAKEN OFF THE CLOCK. `suggest.mjs` draws its first slot out of
   * the table since 2026-09-25 instead of taking the most likely row, which is
   * the whole of the fix for *"they sound unimaginative"*, and a draw off
   * `Math.random` would make every check on this page flake for a living.
   * ✅ AND A FIXED SEED IS NOT A PAGE THAT REPEATS ITSELF, because the stream
   * ADVANCES. Play the same two chords four times over and the four answers are
   * four different draws; what a fixed seed buys is that the same session played
   * the same way twice is the same session, which is the only condition under
   * which any of the plan's numbers can be checked against this page.
   * ⚠️ `?seed=` IS THE WAY TO A DIFFERENT LINE, and it is a query a person can
   * use rather than a switch the harness flips. A page that drew one way for
   * `?selfcheck=1` and another way for a visitor is a page nothing grades.
   */
````

<a id="nola-115"></a>
## nola-115: demo/nola/index.html, inline script, line 1256

````js
  /**
   * 🔴 THE TABLE IS FETCHED, SO IT IS FETCHED ON A PRESS AND NEVER ON A VISIT.
   * 12,746 bytes against the 3,824,981 this page already ships in recordings,
   * which is 0.33 per cent, and it is still not loaded until somebody asks the
   * roll to listen. It goes through `pull` like every other URL that leaves
   * here, so `a visit fetches nothing` stays an assert over a counter.
   * ⚠️ AND THE PAGE WORKS WITHOUT IT. `suggest` falls back to the 173 byte
   * diatonic rule, which MEASURED **1.4 per cent top 1 on held-out jazz against
   * the table's 48.5**, so the fallback is a page that still answers rather
   * than a page that is as good.
   */
````

<a id="nola-116"></a>
## nola-116: demo/nola/index.html, inline script, line 1285

````js
  /* 🔴 `Played` IS WHERE THE PAGE OPENS. Asked *"move played to left and make it
     default"*. `?learn=0` is the way back to the typed line, which is the shape
     `?flip=1` and `?pedal=` already have on this page: a query names the setting
     that is NOT the default. */
````

<a id="nola-117"></a>
## nola-117: demo/nola/index.html, inline script, line 1308

````js
  /**
   * 🔴 TWO WINDOWS, AND WHICH ONE IS THE DIFFERENCE BETWEEN A SUGGESTION THAT
   * READS AND ONE THAT LOOKS LIKE NONSENSE. Reported 2026-09-23 with a
   * screenshot: chords played at A3 to A4 and a proposal drawn at C3 to A3,
   * *"suggeston does no make sense, tis way down"*.
   * ⚠️ `REACH` IS THE LETTER KEYS, fourteen semitones from the bottom, and it is
   * the right window for the TYPED line, which exists so a line of chords can be
   * played on a laptop with no keyboard plugged in. That is what the voicing
   * control was asked for in the first place.
   * ✅ IT IS THE WRONG WINDOW FOR A PROPOSAL, because a proposal answers chords
   * somebody just played and they played them wherever their hands were. Given
   * the whole keyboard to work in, `near` can put it beside the last chord
   * instead of at the bottom of the picture.
   */
````

<a id="nola-118"></a>
## nola-118: demo/nola/index.html, inline script, line 1322

````js
  /* \u26a0\ufe0f AND `split` IS WIDE WHEREVER IT IS ASKED FOR, for the reason written
     over `drawChords`: a voicing with a hand either side of it does not fit
     inside one hand's letter row, and a learned row or a proposal drawn in it
     would carry a note above the letters exactly as a typed one would. */
````

<a id="nola-119"></a>
## nola-119: demo/nola/index.html, inline script, line 1330

````js
  /**
   * 🔴 THE CHORD CAME OFF THE ROLL'S TOP LEFT ON 2026-09-25, ASKED AS *"rm
   * chord from top left (as it moves to keyb compoentn)"*. `keyboard.mjs` draws
   * a chord name in its own footer now, so a second name an inch above it is
   * one fact in two places, and two places can disagree.
   *
   * 🔴 AND THE READING STAYS, BECAUSE IT IS NOT THE SAME QUANTITY. The
   * component's footer is a readout of what is UNDER THE HANDS: it has no
   * clock, on purpose, and its own header says a debounce would make its answer
   * depend on a timer nothing can grade. This page's reading is SETTLED, over
   * `LEARN_WINDOW`, past the subset window that tells a lifted finger from a
   * chord change, and it is the quantity the tally, the roll and five of this
   * page's own checks are about. A footer cannot carry it and this page must
   * not ask it to.
   * ✅ SO WHAT WAS GIVEN UP IS THE DISPLAY AND NOT THE FACT, which is
   * `positron-ui`'s rule about deleting a block: rehome what it said. It is
   * state now, the checks read it, and the one name a visitor sees is the
   * component's.
   * ⚠️ NULL RATHER THAN AN EMPTY LABEL, so *nothing has been named* and *a
   * name with no confidence behind it* stay two different answers. That is the
   * same trap `[data-sure]` had when this was an element.
   */
````

<a id="nola-120"></a>
## nola-120: demo/nola/index.html, inline script, line 1354

````js
    /* 🔴 ONE NAME, ALWAYS. *"just forget about or...rec it, interpet it"*. The
       margin decides how sure it looks rather than the words. */
````

<a id="nola-121"></a>
## nola-121: demo/nola/index.html, inline script, line 1359

````js
  /**
   * 🔴 THE TWO CHORDS THE PAGE PROPOSES ARE TWO DIFFERENT JOBS, NOT A RANKED
   * PAIR OF ONE. The first is what usually follows where you are, which is what
   * a functional rule is for. The second is the best candidate this line has
   * not used yet, because a suggester whose two offers are both chords you have
   * already played has told you nothing.
   * ⚠️ AND OFFERING TWO IS WORTH MORE THAN ANY CLEVERNESS ABOUT WHICH ONE.
   * MEASURED over 24 four chord loops: the rule names the real third chord at
   * top 1 nine times in 24 and at top 2 fifteen times.
   */
````

<a id="nola-122"></a>
## nola-122: demo/nola/index.html, inline script, line 1381

````js
  /**
   * 🔴 WHAT IS BEING PLAYED RIGHT NOW, MIXED INTO THE COUNTED TABLE, AND IT IS
   * THE LARGEST SINGLE GAIN IN `plans/plan-better-chords-2026-09-25.md`.
   * Section 14.2, MEASURED over 4,351 held-out jazz contexts through the table
   * that ships: **+6.32 points of top 1**, where the whole step from a bigram to
   * a trigram was 4.5 and justified downloading two corpora.
   * ✅ AND IT COSTS NOTHING ON THE OTHER THREE MEASURES, which is the condition
   * that plan sets: 50.2 per cent cycling against the real songs' 52.0, 7.44
   * distinct chords in ten against 7.44, and 98.0 per cent attested against 100.
   * ⚠️ IT IS NOT A PROFILE AND NOTHING IS STORED. The window is 64 chords, the
   * object dies with the tab, and section 6.1 measured what a persistent one
   * would buy: +0.60 points from a composer's entire body of work, against
   * -0.76 from a stranger's. There is no `localStorage` on this page and this
   * does not add one.
   */
````

<a id="nola-123"></a>
## nola-123: demo/nola/index.html, inline script, line 1397

````js
  /**
   * 🔴 HOW LONG A PROPOSAL IS LEFT ALONE. Asked 2026-09-23: *"do not offer new
   * when i hae not played old suggestion for a while"*. A proposal is a thing to
   * TRY, and one that is replaced before you have got round to it is not an
   * offer, it is a page talking over you: every chord admitted redrew the row,
   * so the thing you were reaching for could change while your hands were
   * moving toward it.
   * ⚠️ IT IS A JUDGEMENT AND NOT A MEASUREMENT, unlike the window and the floor,
   * and it is written here so it can be argued with. On the takes from this desk
   * a chord lands every one to three seconds, so twenty seconds is several
   * chords of thinking time and still short enough that a proposal cannot go
   * stale for a whole minute.
   * ✅ AND PLAYING IT ENDS THE HOLD AT ONCE, which is the half that makes the
   * number matter less: the timer is the fallback for a proposal nobody wanted,
   * not the thing deciding when you are finished with one.
   */
````

<a id="nola-124"></a>
## nola-124: demo/nola/index.html, inline script, line 1421

````js
    /* ✅ KEEPING IS NOW DOING NOTHING AT ALL, which is the log model paying for
       itself. The row is already on screen at the moment it was offered, so
       there is nothing to re-add and nothing to put back in order. */
````

<a id="nola-125"></a>
## nola-125: demo/nola/index.html, inline script, line 1440

````js
    /* 🔴 WHERE THE KEY CAME FROM, SAID OUT LOUD, WHICH IS THE DECISION THIS
       REPOSITORY HAS ALREADY MADE ONCE. MEASURED: two chords fit 3.33 keys of
       24 on average and never fewer than 2, and three chords never fit exactly
       one, because a major key and its relative minor hold the same seven
       chords and can never be told apart by which chords were played. So the
       key is a fiat and `parseChords` already carries the sentence for it. */
````

<a id="nola-126"></a>
## nola-126: demo/nola/index.html, inline script, line 1448

````js
    /* 🔴 ONE PROPOSAL, AND WHICH ONE IS A DECISION TAKEN ON A MEASUREMENT.
       Asked 2026-09-23: *"add suggestions to piano roll. just one"*, against a
       standing *"no cliches"*. `suggest.mjs` returns two, ranked two ways, and
       the benchmark measured exactly the difference between them on 251
       held-out jazz standards: the probability pick names the globally
       commonest chord **16.2 per cent** of the time, the pointwise mutual
       information pick **1.0 per cent**, and the second is still **90.7 per
       cent attested**. So `other` is idiomatic without being the obvious move,
       which is the same sentence as the *"openstudiojazz quality"* ask, and it
       is the one that ships.
       ⚠️ NOBODY HAS PLAYED IT. This is a reading, not an ear, and the line
       below is the whole of changing its mind. */
````

<a id="nola-127"></a>
## nola-127: demo/nola/index.html, inline script, line 1460

````js
    /**
     * 🔴 NEVER PROPOSE A CHORD THAT IS ALREADY IN THE ROLL. Reported 2026-09-23
     * with a screenshot of `C#min7`, `F#min7` and a proposal reading `C#min7`:
     * *"you suggested what i played"*.
     * The table answers *what follows these chords*, and the commonest answer to
     * a two chord vamp is one of those two chords, which is true and useless: a
     * proposal is a thing to TRY, and one you are already playing is nothing to
     * try. It also makes the roll say the same chord twice in one picture, which
     * reads as the page having lost track.
     * ⚠️ IT IS FILTERED RATHER THAN RE-RANKED. `suggest.mjs` decides what is
     * idiomatic and what is obvious, and this page has no business reordering
     * that; what it can say is that one of the answers is not available here.
     * ⚠️ AND IF EVERY ANSWER IS ALREADY LEARNED, NOTHING IS PROPOSED. An empty
     * row is honest and a repeat is not.
     */
````

<a id="nola-128"></a>
## nola-128: demo/nola/index.html, inline script, line 1489

````js
      /* 🔴 MARKED AS NEW HERE AND NOWHERE ELSE, because this is the one path
         that computed a proposal rather than re-drawing the one already on
         screen. The attribute is taken off once the arrival is over, so a row
         that is still there later is just a row. */
````

<a id="nola-129"></a>
## nola-129: demo/nola/index.html, inline script, line 1503

````js
      /* 🔴 AND IT IS ON THE KEYS AS WELL AS IN THE ROLL, asked for as *"fade
         them also in keyboard so smaller are on top of larger"*. The roll says
         WHAT to play and the keyboard says WHERE, and a proposal you have to
         read off one picture and find on another is a proposal you travel to. */
````

<a id="nola-130"></a>
## nola-130: demo/nola/index.html, inline script, line 1512

````js
    /* 🔴 THE ONE THING THIS MODE FETCHES, AND IT IS BEHIND A CHORD SOMEBODY
       REALLY PLAYED RATHER THAN BEHIND THE MODE BUTTON. `?learn=1` is still a
       visit, and a visit opens nothing; a chord held for two seconds is not.
       It also lands a whole chord before the second one is admitted, which is
       when the first suggestion is drawn, so the counted table is in hand by
       then and no row is relabelled under the reader. */
````

<a id="nola-131"></a>
## nola-131: demo/nola/index.html, inline script, line 1520

````js
    /* 🔴 THE ROLL IS A LOG READ DOWNWARD, SO A NEW CHORD LANDS AT THE BOTTOM AND
       MOVES NOTHING. Asked 2026-09-23: *"do not push suggested row down when new
       recoded one appears, rec one apears below suggestion (timeline loging
       downwards)"*. It used to trim the proposal off, add the chord, and put the
       proposal back underneath, so every chord you played shoved the thing you
       were reaching for one row further down the picture.
       ⚠️ AND THIS REVERSES *"played is first choice"* FROM EARLIER THE SAME DAY,
       which put every learned row above every proposal. That was an ordering
       rule; this is a TIME rule, and time is the stronger one: a proposal was
       offered at a moment, and what you played after it comes after it. */
````

<a id="nola-132"></a>
## nola-132: demo/nola/index.html, inline script, line 1530

````js
    /* ✅ AS PLAYED, IF IT FITS THE KEYS ON SCREEN. A chord somebody really
       played is a fact about their hands and the roll should agree with it. The
       voicing control still governs the typed line and the proposal, because
       nobody played those and something has to decide where they go. */
````

<a id="nola-133"></a>
## nola-133: demo/nola/index.html, inline script, line 1541

````js
    /* 🔴 NO NUMERAL ON A LEARNED ROW, AND THAT IS THE FLICKER RULE RATHER THAN
       AN OMISSION. A numeral needs a key, a key needs two chords, and the key
       can change when a third arrives, so a numeral here would be a label that
       gets rewritten under the reader. The key is in the log instead, where a
       thing that changed belongs. */
````

<a id="nola-134"></a>
## nola-134: demo/nola/index.html, inline script, line 1566

````js
  /** 🔴 HOW LONG A SMALLER CHORD HAS TO STAND BEFORE IT IS BELIEVED. Longer than
   *  a settle, because a settle is about a chord arriving and this is about one
   *  that may be a finger on its way back. MEASURED on a take from this desk:
   *  the gap between chords is 120 ms at its shortest and the median hold is
   *  292 ms, so 250 ms is inside a real chord and well past a lift. */
````

<a id="nola-135"></a>
## nola-135: demo/nola/index.html, inline script, line 1575

````js
    /**
     * 🔴 A FINGER LIFTED IS NOT A NEW CHORD, AND THIS IS THE FAULT BEHIND
     * *"my scond chord is not proerly recorded"*. MEASURED on a 46 second take
     * recorded on this desk: of 181 transitions between readings, **55 were the
     * new set being a SUBSET of the one before it** and 38 were a superset, so
     * **51 per cent of everything the page read was one chord with a finger
     * moving in it**. Holding `C3 F3 A3 C4 E4` and letting the E4 go for a
     * moment produced `Fmaj7/C`, then `Fmaj/C`, then `Fmaj7/C` again, and every
     * one of those went into the tally as a different chord. That is how a
     * chord nobody meant to play gets admitted and a chord somebody did play
     * never reaches three arrivals.
     * ✅ A READING THAT IS A SUBSET OF THE ONE BEFORE IT IS THE SAME CHORD, LESS
     * COMPLETELY STATED, so the fuller reading stands and nothing is re-tallied.
     * ⚠️ A SUPERSET IS NOT SUPPRESSED, because that is the chord arriving more
     * completely and the fuller reading is the better one. The floor protects
     * the partial that preceded it: under 120 ms it banks nothing at all.
     * ⚠️ AND IT RESETS WHEN THE HANDS COME OFF, or playing the same chord again
     * after a rest would be read as a finger lift and ignored.
     */
````

<a id="nola-136"></a>
## nola-136: demo/nola/index.html, inline script, line 1596

````js
      /* 🔴 SUPPRESSED FOR NOW, NOT FOREVER, AND THE FIRST VERSION OF THIS DID
         DROP IT FOREVER. Reported within the hour: *"rec got worse, my 2nd and
         3rd chord is not picked up"*. A smaller chord really can follow a bigger
         one, and it is routinely a subset of it: `Fmaj7` is C F A C E and an
         `Amin` after it is A C E, three of those same notes. Refusing every
         subset threw those away.
         ✅ WHAT SEPARATES A FINGER LIFTED FROM A CHORD CHANGE IS TIME, NOT
         SHAPE. A lift is momentary and the finger comes back; a smaller chord
         is held. So a subset is given a second window to prove it, and it is
         read only if it is still exactly what is under the hands when that one
         is up. A finger coming back cancels it, because `heardChange` clears
         this timer the way it clears the others. */
````

<a id="nola-137"></a>
## nola-137: demo/nola/index.html, inline script, line 1623

````js
    /* 🔴 TWO NOTES DO NOT NAME A CHORD AND THE ONE EXCEPTION IS A BARE FIFTH,
       which the recogniser reaches on its own rather than by a special case:
       MEASURED over the 132 chords it can spell, a perfect fifth is in 13 of
       them and a major third is in 10, so nothing but a fifth pins anything
       down and nothing but a fifth comes back sure from two notes. That is why
       the note count gates the COMPLAINT and the margin gates the answer. A
       page that said `C5 or F5` every time somebody rested a finger on a key
       would be chattering about nothing. */
````

<a id="nola-138"></a>
## nola-138: demo/nola/index.html, inline script, line 1632

````js
    /* 🔴 BELOW THE MARGIN, TWO NAMES AND NOTHING WRITTEN DOWN. MEASURED: at a
       margin of 1.0 the recogniser is never wrong about the 66.7 per cent of
       voicings it speaks about, and what is left is augmented triads, sus2
       against sus4, and a seventh missing its fifth. Those are facts about
       music rather than bugs, and naming one of them confidently is a coin toss
       with a name on it. */
````

<a id="nola-139"></a>
## nola-139: demo/nola/index.html, inline script, line 1638

````js
    /**
     * 🔴 IT COMMITS. Asked 2026-09-23 in those words: *"just forget about
     * or...rec it, interpet it"*, after *"when x or y, just pick what makes
     * sense"*. This used to stop here whenever the margin was short, print
     * `Caug or Eaug`, and leave the roll alone, and the reasoning written beside
     * it was that two names are the truth about three notes that really are two
     * chords.
     * ⚠️ THAT REASONING IS STILL CORRECT AND IT WAS STILL THE WRONG BEHAVIOUR.
     * MEASURED on three takes from this desk: 40 to 108 readings a minute came
     * back as a pair, so the page spent a good part of every minute refusing to
     * write down chords somebody had plainly played. A page that goes quiet a
     * third of the time is not being careful, it is being useless, and the
     * player can see the keys they pressed.
     * ✅ THE MARGIN IS NOT DELETED, IT IS DEMOTED. It no longer decides whether
     * to act, only how loudly to say it: a close reading still loses the
     * confident ink, so a name that was a coin toss looks different from one
     * that was not, and `alts` still carries the other name for anything that
     * wants it.
     */
````

<a id="nola-140"></a>
## nola-140: demo/nola/index.html, inline script, line 1659

````js
    /**
     * 🔴 THE TAKE IS FED HERE, AND `addLearned` WOULD HAVE WASTED MOST OF THE
     * GAIN. `learned[]` is the DISTINCT chords somebody keeps coming back to,
     * capped at `LEARN_SLOTS` of 6, and the adaptation wants the STREAM: every
     * chord event as it settles, repeats included. This line is the one place
     * that knows a chord has really been played, and it sits ABOVE every early
     * return below it, because a chord the learning rules refuse to write into
     * the roll is still a chord somebody played.
     * 🔴 AND THE SOURCE IS THE RULE THIS PAGE ALREADY CARRIES, MADE COUNTABLE.
     * *"you recorded a suggestion. why>"*. A suggester fed its own output writes
     * its own line and calls it yours, MEASURED as a number rather than left as
     * a warning: a generator taking its own suggestions cycles 56.8 per cent of
     * the time against 50.2 and drops to 7.23 distinct chords from 7.44, moving
     * away from real music on both axes at once.
     * ⚠️ `heard` HAS NO DEFAULT SOURCE, so this call has to say which it is, and
     * `take.refused` is the number the negative control below reads.
     */
````

<a id="nola-141"></a>
## nola-141: demo/nola/index.html, inline script, line 1677

````js
    /* 🔴 REMEMBER WHERE THE HANDS WERE, NOT ONLY WHAT THEY SPELLED. Reported
       2026-09-23 with a screenshot: A major was played as A3 C#4 E4 and drawn as
       C#3 E3 A3, and the question was *"why it suggest someting i do not play"*.
       It was not suggesting anything, it was the same chord re-voiced, and a
       roll that disagrees with the fingers that fed it reads as the page making
       something up. `chordKey` throws voicing away on purpose, which is what
       naming is FOR, so the voicing has to be kept beside it rather than
       recovered from it. The LAST way a chord was played is the one kept: come
       back to it in a better place and the roll follows you. */
````

<a id="nola-142"></a>
## nola-142: demo/nola/index.html, inline script, line 1686

````js
    /* 🔴 PLAYING THE PROPOSAL IS WHAT ENDS ITS HOLD, and it is read off the
       chord KEY rather than off the exact notes, because taking up an offer in
       your own voicing is still taking it up. */
````

<a id="nola-143"></a>
## nola-143: demo/nola/index.html, inline script, line 1689

````js
    /**
     * 🔴 AND TRYING THE PROPOSAL DOES NOT TEACH IT. Asked 2026-09-23: *"when i
     * trying to get suggestion right do not store"*.
     * A chord you played because this page put it in front of you is not a chord
     * you keep coming back to, and counting it would make the suggester feed
     * itself: offer a chord, watch somebody try it three times to hear whether
     * they like it, admit it as one of theirs, and then propose from a line that
     * the page wrote. The roll is supposed to be a record of what a player does.
     * ⚠️ IT IS ONLY WHILE THE PROPOSAL IS ON SCREEN. Once it has been replaced,
     * the same chord counts like any other, because by then it is a chord
     * somebody chose to go on playing rather than one they were handed.
     */
````

<a id="nola-144"></a>
## nola-144: demo/nola/index.html, inline script, line 1705

````js
    /**
     * 🔴 AND IT IS EVERY CHORD THIS PAGE HAS EVER PROPOSED, NOT ONLY THE ONE ON
     * SCREEN. The first version of this guarded the CURRENT proposal, on the
     * reasoning that once it had been replaced, going on playing the chord was
     * somebody choosing it rather than being handed it. Reported with a
     * screenshot an hour later: *"you recorded a suggestion. why>"*, with a
     * learned row holding a chord the page had put in front of them earlier.
     * ⚠️ THE REASONING WAS TOO CLEVER AND THE ANSWER IS SIMPLER. A player cannot
     * see when a proposal stopped being protected, so from their side the rule
     * was *sometimes it records my practising and sometimes it does not*, which
     * is worse than either rule on its own. The roll is a record of chords
     * somebody arrived at, and a chord this page named first is not one of them.
     * ⚠️ AND IT COSTS SOMETHING REAL, SAID HERE RATHER THAN HIDDEN: a suggestion
     * you genuinely adopt can never be learned. If that turns out to matter, the
     * repair is a second threshold rather than deleting this.
     */
````

<a id="nola-145"></a>
## nola-145: demo/nola/index.html, inline script, line 1722

````js
    /**
     * 🔴 AND NEITHER IS WHAT YOU PLAY ON THE WAY TO IT. Reported twice, the
     * second time with a screenshot of three learned rows: *"recording my
     * learning again..."*.
     * Matching the exact chord was not enough, because practising a proposal is
     * not playing it correctly. Reaching for a suggested `Gmaj7` produces `Gmaj`,
     * then `G5`, then `Gmaj7` with a wrong finger, and every one of those is a
     * DIFFERENT chord that sailed past a guard looking for the right one. The
     * roll then filled with the shape of somebody practising rather than the
     * shape of their playing, which is the exact opposite of what it is for.
     * ✅ SO WHILE A PROPOSAL IS UP AND UNPLAYED, NOTHING SHARING ITS ROOT IS
     * LEARNED. A root is the thing that does not change while a hand hunts for
     * the rest of a chord, so it is what separates hunting from playing.
     * ⚠️ AND IT IS ONLY WHILE THAT PROPOSAL IS WAITING. Once it has been played
     * or has gone stale, its root is ordinary again and chords built on it are
     * learned like any other, so a key centre is not blocked for the session.
     */
````

<a id="nola-146"></a>
## nola-146: demo/nola/index.html, inline script, line 1751

````js
  /**
   * 🔴 CALLED FROM `tellRoll`, WHICH IS THE ONE PLACE THAT ALREADY KNOWS WHAT
   * IS UNDER A FINGER. `heldNotes` is FINGERS rather than voices, and its own
   * comment says why: a pedalled chord goes on sounding long after the hands
   * moved on. The learning mode reads that set and nothing else, so the pedal
   * cannot teach the page a chord nobody is holding.
   * ⚠️ AND IT IS A FUNCTION DECLARATION REACHED FROM A CONST ARROW DEFINED
   * HUNDREDS OF LINES ABOVE IT, the same arrangement `redrawCharts` already
   * has. Nothing calls either until a key is pressed, which is after the whole
   * module has run.
   */
````

<a id="nola-147"></a>
## nola-147: demo/nola/index.html, inline script, line 1776

````js
  /**
   * Re-voice every learned row, for a voicing change or an octave press.
   *
   * 🔴 `revoice` IS THE DIFFERENCE BETWEEN THE TWO CALLERS AND IT IS NOT A
   * TIDINESS FLAG. Reported 2026-09-23 with a screenshot: A major played as
   * A3 C#4 E4 was drawn as C#3 E3 A3 and read as the page proposing something
   * nobody played. A learned row is a record of what your hands did, so it
   * lands where they were. But a VOICING press is somebody ASKING for the
   * chords to be moved, and a control that leaves them where they are is the
   * inert control this project keeps finding. So an octave press keeps the
   * playing and a voicing press overrides it.
   */
````

<a id="nola-148"></a>
## nola-148: demo/nola/index.html, inline script, line 1792

````js
      /* ⚠️ AS PLAYED FIRST HERE TOO, or a voicing press would scramble the rows
         that are a record of what somebody did. An octave press can move the
         window out from under them, which is the one case where the played
         voicing no longer fits and the chord has to be put somewhere. */
````

<a id="nola-149"></a>
## nola-149: demo/nola/index.html, inline script, line 1492

````js
    /* ⚠️ `setRows` IS RIGHT TO CANCEL THE SELECTION AND THIS PUTS IT BACK,
       because a re-voicing really does replace every row and the player still
       chose one of them. `pick` TOGGLES, so it is only called when there was
       something picked and the list is still that long. */
````

<a id="nola-150"></a>
## nola-150: demo/nola/index.html, inline script, line 1500

````js
  /**
   * ⚠️ `say` IS FALSE ON A TYPED LOAD AND TRUE EVERYWHERE ELSE, which is one
   * flag rather than two functions. A page opened at `?learn=1` has to explain
   * itself exactly as much as one somebody switched by hand, and a page opened
   * in the typed mode has nothing to announce because that is where it has
   * always started.
   */
````

<a id="nola-151"></a>
## nola-151: demo/nola/index.html, inline script, line 1512

````js
    /* ⚠️ THE READING IS DROPPED ON EVERY MODE CHANGE, because `heardChange`
       returns early outside the learning mode, so a reading left standing here
       would be the last chord of the previous mode sitting in the state a check
       reads. It used to be hidden rather than cleared, which is the same
       mistake one element along. */
````

<a id="nola-152"></a>
## nola-152: demo/nola/index.html, inline script, line 1518

````js
    /* 🔴 HIDDEN IN `Played`, NOT GREYED. Asked 2026-09-23: *"when played, hide
       chords input"*. A disabled field is a control saying *you could type here
       but not now*, and in this mode you never can: the roll's rows come from
       your hands and the field has nothing to do with them. It was disabled
       rather than hidden because disabling was the smaller change at the time,
       and a greyed box holding four chords you cannot reach is furniture.
       🔴 AND `hidden` WAS SETTING AN ATTRIBUTE AND CHANGING NOTHING ON SCREEN
       FOR AS LONG AS IT HAD BEEN THERE. Asked again 2026-09-25: *"only show
       chords textfield when typed is selected"*, which reads as a new request
       and is the old one reporting that it never landed. `shell.css` gives
       `.pos-field` an explicit `display: inline-flex`, and ANY author rule beats
       the browser's own `[hidden] { display: none }`, so the field stayed drawn
       and the property read as set. This project has measured that exact defect
       on the readout, the control row, the log, the glue and a table heading,
       and `.pos-field` is the sixth component to want the one line patch that
       fixes it. That line belongs in `shell.css` and is not this page's to
       write.
       ✅ SO THE FIELD LEAVES THE DOCUMENT RATHER THAN ASKING A STYLESHEET TO
       HIDE IT. It is a page deciding what is in its own row, it needs no CSS at
       all, and `isConnected` is a fact about the document rather than about an
       attribute, which is the only kind of fact the check below can trust.
       ⚠️ AND IT IS STILL DISABLED, because a detached field is still typed into
       by anything holding a reference to it. */
````

<a id="nola-153"></a>
## nola-153: demo/nola/index.html, inline script, line 1552

````js
      /* 🔴 THE ONE ARBITRARY CHOICE, SAID OUT LOUD ONCE. `C6` and `Am7` are the
         same four notes and no weighting separates them: MEASURED, a bass heavy
         enough to force it turns every first inversion minor triad into a sixth
         chord. Dropping the sixths entirely takes the confident answer rate
         from 32.8 per cent to 72.0, and a page quiet two thirds of the time to
         avoid one arbitrary choice has made a worse choice. */
````

<a id="nola-154"></a>
## nola-154: demo/nola/index.html, inline script, line 1578

````js
  /**
   * 🔴 IT IS NOT IN `.pos-controls`, FOR THE REASON THIS PAGE ALREADY GIVES
   * ABOUT THE INSTRUMENT PICKER. `demo/verify.mjs` clicks every button in that
   * row 650 ms apart while this page's own checks are already running at load,
   * so a mode switch there would change what the roll holds in the middle of
   * the damper check. The page's own check presses it instead, which grades
   * more than a harness click would.
   * ⚠️ TWO NAMED MODES IS `createChoice`, AND THE INSTRUMENT ROW IS NO LONGER
   * THE PRECEDENT FOR THAT. It made the same argument in writing until
   * 2026-09-25, when it was asked to become the standard patch selector and
   * the argument was superseded by an instruction. What is left here is the
   * argument on its own merits, which is unchanged and is `choice.mjs`'s own:
   * two mutually exclusive named modes are one segmented object with the armed
   * one lit, and both names are readable without pressing anything. The row
   * below the keys had a reason to change that this one does not: it sits at
   * the right hand end of an instrument footer, opposite a nameplate, which is
   * a shape a segmented row cannot take.
   */
````

<a id="nola-155"></a>
## nola-155: demo/nola/index.html, inline script, line 1598

````js
    /* 🔴 `Played` FIRST AND OPENING, ASKED FOR IN THOSE WORDS: *"move played to
       left and make it default"*. It is what the page is about now, and the
       typed line is the thing you reach for when you already know what you
       want. ⚠️ AND IT MOVES EVERY CHECK THAT PRESSES THIS BY INDEX, because
       `buttons[0]` was `Typed` and is `Played`. */
````

<a id="nola-156"></a>
## nola-156: demo/nola/index.html, inline script, line 1603

````js
    /* ⚠️ `Suggested`, ASKED 2026-09-23 AS *"played: Suggested"*, in the same
       shape as *"As written: Exact"* earlier the same day. The value stays
       `learn`, which is what every check and every query presses. */
````

<a id="nola-157"></a>
## nola-157: demo/nola/index.html, inline script, line 1616

````js
  // ── what only this page can say ───────────────────────────────────────────
  //
  // 🔴 THESE RUN FOR EVERYBODY, because they are gradable from data already in
  // hand and cost a visitor nothing. `selfcheck.mjs`: a visit asserts a STRICT
  // SUBSET, and what moves behind the gate is anything that opens a file, makes
  // a sound, presses a control or moves the picture.
````

<a id="nola-158"></a>
## nola-158: demo/nola/index.html, inline script, line 1628

````js
  /* 🔴 THE SHIFT ASSERT, AND IT IS ONLY WORTH ANYTHING BECAUSE THE SET IS
     SPARSE. Against a chromatic soundfont every note is its own recording and
     this is true by construction, which is a check that cannot fail and so
     cannot report. Here 58 of the 88 keys really are bent. */
````

<a id="nola-159"></a>
## nola-159: demo/nola/index.html, inline script, line 1644

````js
  /* 🔴 AND THE RHODES IS THREE TIMES WORSE INSIDE ITS OWN RANGE, WHICH IS A
     FACT ABOUT THE PACK RATHER THAN A FAULT IN IT. Fifteen notes at gaps of 3
     to 6 semitones cannot do better, and the survey priced the length and
     formant error at 18.9 per cent at the worst of it. ⚠️ ABOVE NOTE 96 IT IS
     WORSE STILL and the assert says so in its own detail rather than quietly
     measuring the easy part: a Rhodes Mark I Stage 73 has 73 keys and stops at
     MIDI 100, so everything above that is a key the real instrument never had. */
````

<a id="nola-160"></a>
## nola-160: demo/nola/index.html, inline script, line 1665

````js
  /* 🔴 TWO INDEPENDENT SOURCES, WHICH IS THE ONLY KIND OF AGREEMENT WORTH
     ASSERTING. The search is this page's arithmetic and `RHODES_KEYS` is the
     author's own `lokey`/`hikey` out of his SFZ, so the two can disagree, and
     they would have on the three keys that sit exactly between two recordings
     if the tie had gone the other way. Comparing the search against itself is
     the trap this project has paid for twice. */
````

<a id="nola-161"></a>
## nola-161: demo/nola/index.html, inline script, line 1684

````js
  /* 🔴 THE LAYER TABLE, GRADED WITH NO SOUND IN IT. What this catches is the
     numbering running backwards: layer 1 is the HARDEST file and layer 5 the
     softest, so a page that read 5 as most would have velocity 1 playing the
     hardest recording there is and nothing about it would look wrong. */
````

<a id="nola-162"></a>
## nola-162: demo/nola/index.html, inline script, line 1699

````js
  /* 🔴 THE HOLES, AND THE FALLBACK IS HIS. Layer 3 stops at note 71 and layer 1
     at 76. Without this the top four notes of a hard press would ask for a file
     that is not there, which is a 404 on a page whose own check says nothing
     failed. */
````

<a id="nola-163"></a>
## nola-163: demo/nola/index.html, inline script, line 1715

````js
  /* ⚠️ `__demo.logs`, NOT `d.logs`. The lines live on the machine contract the
     shell publishes, and the object a page is handed carries `log` to write one
     and no way to read them back. */
````

<a id="nola-164"></a>
## nola-164: demo/nola/index.html, inline script, line 1724

````js
  /* 🔴 THE NEGATIVE CONTROL FOR `?flip=1` BEING WIRED AT ALL. Without one, the
     option could be read off the query, logged, and then ignored, and this page
     would assert exactly the same things either way. Two pedals and one byte:
     they must not agree.
     ⚠️ AND THE SWITCH ON THE PAGE IS NEVER FLIPPED, WHICH IS NOT AN OVERSIGHT.
     `?flip=1` corrects a fault in one instrument on one desk this session, and
     the switch is not that instrument: it sends the value the specification
     asks for. A page that flipped its own control to match a keyboard would
     ship a SUSTAIN switch that turns sustain off. */
````

<a id="nola-165"></a>
## nola-165: demo/nola/index.html, inline script, line 1745

````js
    /**
     * 🔴 DRIVEN THROUGH THE REAL HANDLERS, WHICH IS THE PATTERN `/muta/` SET.
     * This machine has no MIDI under a harness, so `press`, `lift` and
     * `pedal.control` are the only part of that path a check can reach, and
     * reaching past them to a buffer source would grade Web Audio and say
     * nothing about the keyboard.
     */
````

<a id="nola-166"></a>
## nola-166: demo/nola/index.html, inline script, line 1756

````js
    /* 🔴 THE CHECKS START FROM THE MODE A VISITOR ARRIVES IN, AND `?learn=1`
       IS NOT IT. MEASURED the moment the query landed: `DEMO_QUERY=learn=1 node
       demo/verify.mjs nola` took **two asserts red** on a page doing exactly
       what it promises, because the whole chord-line block grades the roll and
       the roll was empty by design. Both read as nonsense (`the same  dots
       either way`, an empty tab index list), which is what an assert about
       something that is not there looks like.
       ⚠️ SO THE BLOCK PUTS THE PAGE WHERE IT EXPECTS IT AND PUTS IT BACK AFTER,
       rather than the query deciding which half of the page is graded. A
       harness that measures different things depending on how it was opened is
       a harness whose count means nothing. */
````

<a id="nola-167"></a>
## nola-167: demo/nola/index.html, inline script, line 1770

````js
    /**
     * 🔴 THE CHEAP ONES GO FIRST, AND THAT IS ABOUT THE HARNESS RATHER THAN
     * ABOUT THE PAGE. `demo/verify.mjs` waits while the assert count is
     * GROWING and gives up after about two seconds of silence. This block's
     * first audio assert lands three and a half seconds in, so with the audio
     * checks first the harness collected **7 of 25** and reported 13/13 GREEN:
     * a page that had lost eighteen checks and looked perfect. MEASURED by
     * opening the same page by hand and reading `__demo.asserts.length`, which
     * came back **20 and still climbing** while the suite had already left.
     * ⚠️ SO THE COUNT IS THE INSTRUMENT AND THE COLOUR IS NOT. Nothing failed
     * in either run. The only thing that said anything was wrong was 25
     * becoming 7.
     */
````

<a id="nola-168"></a>
## nola-168: demo/nola/index.html, inline script, line 1791

````js
      /* 🔴 THE FOUR FRAMES, READ BACK OFF THE PAGE RATHER THAN OFF THE PARSER.
         `chords-test.mjs` already grades the arithmetic with no browser in it;
         what only this page can say is that the numeral it computed is the
         numeral on screen, and that `Fm6/C` came out lower case where `F/C`
         did not. That difference is the whole reason a numeral is drawn. */
````

<a id="nola-169"></a>
## nola-169: demo/nola/index.html, inline script, line 1801

````js
      /* 🔴 THE DOTS ARE COUNTED OFF THE PAINTED PICTURE, not off the array the
         page just handed itself. Asserting `c.notes.length` here would be the
         page grading its own arithmetic, which is the trap that let a
         `playbackRate` of 1 read green earlier today. */
````

<a id="nola-170"></a>
## nola-170: demo/nola/index.html, inline script, line 1812

````js
      /* 🔴 THE ROLL AND THE INSTRUMENT ARE ONE WINDOW, MEASURED AS A COLUMN
         POSITION IN PIXELS RATHER THAN AS A BASE NUMBER. This is the assert the
         chord charts were corrected into and it is inherited whole: comparing
         two `base` values grades the page's own arithmetic, and comparing where
         a column LANDS grades the picture, which is the thing that has to carry
         a shape down the page to your hands.
         ⚠️ AND IT IS WORTH MORE NOW THAN IT WAS. The charts were keyboards, so
         they agreed by being the same component; the roll is a different
         drawing and shares only `placeKey`, which is exactly the kind of
         agreement that rots in silence. */
````

<a id="nola-171"></a>
## nola-171: demo/nola/index.html, inline script, line 1834

````js
      /* 🔴 AND THE INSTRUMENT SWITCH IS IN THAT BOX TOO, HARD RIGHT, ASKED
         2026-09-25 AS *"add piano / rhodes into a isntrument footer to the right
         glued under keyboaed"*. It was a labelled row a block above the keys.
         ⚠️ THREE CLAIMS AND THREE RECTS, because `positron-ui` records two of
         three alignments lining up while the third was 30 px out, and arithmetic
         in a comment is not evidence. It is inside `keys.el`, it is under the
         component's OWN footer rather than under the keys two rows up, and its
         right edge is the box's right edge.
         ⚠️ AND `glued` IS WHAT THE PARENT TEST IS FOR. A row that merely looked
         flush under a sibling box would pass a gap test and still be a second
         surface; being inside `.kbd` is what makes it the same one. */
````

<a id="nola-172"></a>
## nola-172: demo/nola/index.html, inline script, line 1850

````js
      /* ⚠️ THE CONTROL IS NOW `--kbd-pad` IN FROM THE ROW'S EDGE RATHER THAN ON
         IT, AND THAT IS THE CHANGE OF 2026-09-25 RATHER THAN A LOOSENED CHECK.
         The row bleeds out to the box's border, so its own edge IS the border
         and `hard right` became the box's inset, which is the inset the keys
         above already keep. Read off the box rather than typed. */
````

<a id="nola-173"></a>
## nola-173: demo/nola/index.html, inline script, line 1864

````js
      /* 🔴 AND THE NAMEPLATE IS AT THE OTHER END OF THAT ROW, ASKED IN THE SAME
         BREATH AS *"add nola nameplace to the left of footer"*. Its LEFT edge is
         what this reads, because that is the only thing the right arrangement
         and the wrong one disagree about: `.panel-plate[data-place="end"]`
         carries `margin-left: auto`, which absorbs the row's free space before
         `justify-content` runs and parks the plate beside the selector, and a
         row with both children on the right still looks like a row.
         ⚠️ AND IT READS WHAT THE BROWSER RENDERS RATHER THAN WHAT WAS TYPED.
         `plate.shown()` reads the computed `text-transform`, which is how
         `/circuit/` was caught rendering `NOVATION` off a source that typed
         `novation` with a check that graded the source and stayed green either
         way. This plate is upper case by the project's own rule, and this is the
         half that says the rule really reached it. */
````

<a id="nola-174"></a>
## nola-174: demo/nola/index.html, inline script, line 1877

````js
      /* 🔴 AND THE INSET IS MEASURED INK AGAINST INK, NOT PADDING AGAINST A
         TOKEN. ASKED TWICE. First 2026-09-25 as *"add space on left of nona to be
         same as top and bottob paddings"*, which was answered by giving all three
         sides `--kbd-pad`, and then again the same evening, with a crop: *"just
         add some padding to left of nola. i do not understand how to do nameplate
         properly"*.
         🔴 THE FIRST ANSWER WAS RIGHT ABOUT THE BOXES AND WRONG ABOUT THE
         LETTERS, WHICH IS THE WHOLE LESSON HERE. MEASURED from `.kbd`'s inner
         edge: the pad row's first button and this plate both had their BOX at
         +9.00, agreeing to the pixel, while that button's LETTER sat at +19.00
         against the plate's at +9.00. A button carries its own border and inline
         padding, so two boxes agreeing is not two letters agreeing, and the plate
         read under-indented against the row above it while every number matched.
         ⚠️ SO THE OLD CHECK WAS GREEN WHILE THE PAGE LOOKED WRONG, and it is
         kept here as the reason this one reads a `Range` instead. It compared the
         row's three paddings to `--kbd-pad` and could never have seen the fault
         it was standing next to. That is the second assert this round that passed
         while the render was off, and both were caught by looking rather than by
         counting.
         ✅ THE 10 px IS DERIVED AND NOT TYPED. `shell.css` publishes
         `--kpad-pad` on `.kbd` now, the pad row's buttons read it, and the
         footer's left inset is `calc(var(--kbd-pad) + var(--kpad-pad) + 1px)`,
         the 1 px being the border every control in that file draws. */
````

<a id="nola-175"></a>
## nola-175: demo/nola/index.html, inline script, line 1905

````js
      /* 🔴 THE REFERENCE IS THE ROW'S LEFT EDGE PLUS A BUTTON'S OWN INK
         INSET, AND IT WAS ONE NAMED CONTROL'S LETTER UNTIL 2026-09-28. It read
         `.kpad-names button`, the `N` of the naming pair, which left the
         keyboard component on *"finally: rm N | D setting from keyboard
         component"*. Two things go wrong when a selector names one control:
         `querySelector` answers `null` and `inkLeft(null)` THROWS, taking this
         assert and every one after it out of the page in silence; and the
         control that inherits first place may not be a letter at all.
         🔴 IT IS NOT, AND THAT IS WHY MOVING THE SELECTOR ONE CONTROL ALONG WAS
         THE WRONG REPAIR. MEASURED the same evening: pointed at `.kpad-oct
         button` this assert read **x53.08 against the plate's x54.00** and went
         red at a tolerance of 0.6. `.step button.ico` is `padding: 0` and a
         fixed square, so the octave button CENTRES a glyph in 24 px and its ink
         lands wherever that glyph's advance puts it. The naming pair passed for
         five days because it was `width: auto` over `.kpad button`'s
         `0 var(--kpad-pad)`, so its letter sat at exactly the inset this claim
         is about. **An alignment that holds by one glyph's width is luck.**
         ✅ SO THE INSET IS READ OFF A BUTTON THAT HAS A WORD IN IT, as its ink
         minus its own border box, and applied to the pad ROW's left edge. That
         is ink against ink in the quantity the claim is about, it survives any
         reordering of the row, and it does not care which control is first. */
````

<a id="nola-176"></a>
## nola-176: demo/nola/index.html, inline script, line 1943

````js
      /* 🔴 AND THE TWO ROWS ARE SEPARATED BY A LINE RATHER THAN BY A GAP, WHICH
         REVERSES THIS PROJECT'S STANDING RULE FOR THIS ONE ROW AND WAS ASKED FOR
         IN THOSE WORDS: *"add top border to that footer"*. `/muta/` records the
         same reversal for the same reason, two blocks that needed a rule between
         them rather than more air.
         🔴 THE INK IS READ OFF THE BOX RATHER THAN TYPED TWICE. The claim is not
         *there is a 1 px line*, it is *the line across the inside of this box is
         drawn in the box's own edge colour*, and only a comparison can say that.

         🔴 **AND IT RUNS EDGE TO EDGE SINCE 2026-09-25, WHICH IS THIS ASSERT
         TURNED ROUND.** It read *"IT RUNS THE WIDTH OF THE KEYS, NOT OF THE
         BOX"* and required `inL > 0`, on an argument written in this file that
         a line touching the border would be the only thing in the box doing it.
         The report was *"the border on top of footer goes edge to edge. in the
         life of me i don ot understand why you do not see it"*, so the argument
         was wrong and the assert was grading it. **MEASURED before: 9.0 px in
         at both ends.**
         ⚠️ **BOTH ENDS, BECAUSE ONE END LINING UP IS HALF AN ALIGNMENT**, and
         against the box's own border rather than against a 0 typed here.
         ⚠️ AND THE ROW IS NO LONGER FLUSH WITH THE PAD ABOVE IT, which is the
         other half of the same change: the pad starts at the box's content edge
         and this now starts at the border, so they are `--kbd-pad` apart by
         construction. That is asserted rather than dropped. */
````

<a id="nola-177"></a>
## nola-177: demo/nola/index.html, inline script, line 1983

````js
      /* 🔴 THE FIRST ROW IS AS FAR FROM THE TOP AS THE ROWS ARE FROM EACH OTHER.
         Asked with a crop: *"add more space on first row on top of dots / label
         so disace from separators and from top is rohghly same"*. Every dot is
         centred in its row, so dot to dot is a whole row and the top edge to the
         first dot was HALF of one, which is two spacings that should read as
         one. MEASURED as the two distances rather than as the padding that
         produces them, because the padding is the cause and this is the claim. */
````

<a id="nola-178"></a>
## nola-178: demo/nola/index.html, inline script, line 1992

````js
        /* ⚠️ THE DOT, NOT THE CELL. A pseudo-element cannot be measured, and the
           cell it lives in is taller than the dot's own box on the first row,
           so the cell's centre is not the dot's. The dot is centred in the
           CONTENT box, which is the cell minus its padding. Reading the cell
           gave 19.5 px for a dot that is at 29.3. */
````

<a id="nola-179"></a>
## nola-179: demo/nola/index.html, inline script, line 2012

````js
      /* 🔴 AND THE BLACK ONES DELIBERATELY DO NOT, WHICH IS A CLAIM AND NOT A
         LOOSENED CHECK. Asked as *"move piano roll dots to cross the divider from
         the middle"* and then *"lines stay. black key dots move"*. A real black
         key is not centred between its neighbours and the KEYBOARD should look
         like a keyboard, so `placeKey` gives it the piano's offset. A roll is not
         a keyboard: it is a grid of marks read downward, and a mark sitting
         slightly off the rule under it reads as a mistake rather than as
         lutherie. So the roll's black cells keep their column and lose the
         nudge, which puts the dot on the line the eye is already following.
         ⚠️ MEASURED AS A DISTANCE FROM THE JOIN rather than as a difference from
         the keyboard, because what is claimed is where the dot IS, not that it
         moved. */
````

<a id="nola-180"></a>
## nola-180: demo/nola/index.html, inline script, line 2039

````js
      /* ⚠️ THE ROLL'S ONLY CONTROLS ARE ITS OWN ROWS, ONE EACH, AND THIS ASSERT
         SAID `no controls at all` UNTIL THE ROWS BECAME SELECTABLE AN HOUR
         LATER. What it was protecting is still protected: the keyboards this
         replaced brought an octave pair and a `Panic` EACH, four chords
         deep, which is a screen of controls belonging to nothing. A row that
         picks itself is the picture answering, not a control row. */
````

<a id="nola-181"></a>
## nola-181: demo/nola/index.html, inline script, line 2052

````js
      /* 🔴 PICKING A ROW PUTS THAT CHORD ON THE KEYS, WHICH IS THE WHOLE REASON
         THE ROLL IS SELECTABLE. Driven through the component's own `pick` so
         the check takes the same road a finger does, and read off the PAINTED
         keys rather than off the array the page just handed itself. */
````

<a id="nola-182"></a>
## nola-182: demo/nola/index.html, inline script, line 2062

````js
      /* 🔴 AND THE ROW IS PAINTED TO THE BOX'S EDGES WHILE ITS LANE STAYS WITH
         THE KEYS, WHICH WAS REPORTED TWICE AND FIXED ONCE. The first repair was
         a negative offset on a pseudo-element INSIDE A SCROLLER, which clips
         it: the rule was drawn and then cut off at the very edge it was trying
         to escape, so nothing moved and the picture looked identical.
         ⚠️ IT IS MEASURED ON THE ROLL'S OWN BOX, because a `::before` has no
         rect to ask for. The first version of this assert read the ROW element
         instead and reported `10.0 px` twice, which is the lane's inset said
         two ways: it could not have caught anything. */
````

<a id="nola-183"></a>
## nola-183: demo/nola/index.html, inline script, line 2081

````js
      /* ⚠️ AND THE NEGATIVE CONTROL IS THE HALF THAT MATTERS: a second press
         takes it off again, or the keyboard accumulates every chord anybody
         ever looked at. */
````

<a id="nola-184"></a>
## nola-184: demo/nola/index.html, inline script, line 2084

````js
      /* 🔴 AND THE OTHER DIRECTION, WHICH IS THE ONE A PLAYER MEETS FIRST:
         play the notes and the row answers. Driven by pressing keys rather than
         by calling `setHeld`, so what is graded is the path a finger takes. */
````

<a id="nola-185"></a>
## nola-185: demo/nola/index.html, inline script, line 2103

````js
      /* 🔴 THE VOICING CONTROL REALLY RE-VOICES, AND THE DOTS ARE READ OFF THE
         PICTURE RATHER THAN OFF THE ARRAY THE PAGE JUST BUILT. `chords.mjs`
         grades the arithmetic with 49 checks and no browser; what only this
         page can say is that pressing the control changes what is DRAWN.
         ⚠️ AND THE NEGATIVE CONTROL IS THE HALF THAT MATTERS: a picker wired to
         nothing would leave the dots where they were, which is exactly what the
         four lines this replaced used to do. */
````

<a id="nola-186"></a>
## nola-186: demo/nola/index.html, inline script, line 2114

````js
        /* ⚠️ `set(index)`, WHICH IS THE COMPONENT'S OWN WORD. The first version
           called `pick(id)` and threw, because that is `roll.mjs`'s vocabulary
           and this is `choice.mjs`: two components, two names for choosing, and
           the one that is right is the one the control being driven uses. */
````

<a id="nola-187"></a>
## nola-187: demo/nola/index.html, inline script, line 2131

````js
        /* \u{1F534} THE SPLIT VOICING IS DRAWN, WHICH IS THE ONE THING `chords.mjs`
           CANNOT SAY ABOUT IT. That module grades the note numbers with ten
           checks and no browser; what only this page can answer is whether the
           ROLL survived a voicing that is wider than the others, because a note
           under the body could have landed off the bottom of the keys and a roll
           has no column for a note the keyboard does not draw. It reads the
           dots back off the picture rather than off `charts`.
           \u26a0\ufe0f AND IT PUTS THE CONTROL BACK, so the checks after this one see
           the page in the state they were written against. */
````

<a id="nola-188"></a>
## nola-188: demo/nola/index.html, inline script, line 2155

````js
      /* 🔴 THE ROLL IS ONE TAB STOP AND THE ARROWS MOVE INSIDE IT, WHICH IS THE
         RULE `table.mjs` ALREADY CARRIES AND THE HALF THAT IS EASY TO GET
         WRONG. Every row a tab stop would cost a reader four presses to get
         past a line of chords and sixty-three past a song. The negative half is
         what makes this an assert rather than a decoration: one row at 0 AND
         every other at -1, because a roving tabindex that forgets to take the
         old one away is the same defect as none at all. */
````

<a id="nola-189"></a>
## nola-189: demo/nola/index.html, inline script, line 2184

````js
    /* 🔴 TWENTY FIVE KEYS, FIFTEEN OF THEM WHITE, AND NONE OF THEM UNDER THE
       TOUCH FLOOR. This asserted that the row does not scroll at this width,
       and it was true while the keyboard had no box around it: the fifteen
       whites filled 688 px with nothing to spare. `demo/shell/keyboard.mjs`
       gained a wrapper on 2026-09-23 and then padding on all four sides, which
       is 18 px the keys no longer have, so the row scrolls by about that much
       here.
       ⚠️ THE CLAIM THAT SURVIVES IS THE ONE WORTH MAKING. What the 44 px floor
       is FOR is that a key never squeezes under a fingertip: a row that scrolls
       is the component obeying that floor, and a row that fitted by shrinking
       its keys to 41 px would be the failure. So this measures the KEY, which
       is the thing a player touches, and reports the scroll beside it. */
````

<a id="nola-190"></a>
## nola-190: demo/nola/index.html, inline script, line 2205

````js
      /* ⚠️ AND ONLY THE MIDDLE OCTAVE IS REACHABLE FROM THE COMPUTER KEYBOARD,
         because there are not twenty five letters to give. It used to be
         asserted on the drawn LETTER; `keyboard.mjs` draws a dot now, faint on
         a key that has a letter behind it, and the claim is the same one: a
         mark on a key that does nothing when you press it is worse than no
         mark. */
````

<a id="nola-191"></a>
## nola-191: demo/nola/index.html, inline script, line 2211

````js
      /* 🔴 THE COMPUTER KEYBOARD REACHES THE BOTTOM OCTAVE, AND THIS IS THE
         CLAIM RATHER THAN A COUNT OF MARKS. It used to count drawn letters,
         then faint dots; both are gone, because a keyboard at rest draws
         nothing. What is still true and still worth grading is WHERE `a` lands:
         C3, the leftmost key, since 2026-09-23. */
````

<a id="nola-192"></a>
## nola-192: demo/nola/index.html, inline script, line 2224

````js
    /**
     * 🔴 THE RECORDINGS ARE FETCHED BEFORE ANY TIMED CHECK, AND THIS IS THE
     * SECOND TIME THE HARNESS'S PATIENCE HAS BITTEN. `verify.mjs` leaves after
     * about two seconds with no new assert, and `press()` awaits a fetch the
     * first time a key in an octave is played. On localhost that is tens of
     * milliseconds and invisible; against the DEPLOY it is hundreds, and two
     * runs of the same green page collected **21 and 34** asserts. Nothing
     * failed in either, the assert LIST was identical, and the only thing that
     * differed was how many of them the harness stayed for.
     * ⚠️ SO THE NETWORK COMES OUT OF THE MIDDLE OF THE BLOCK RATHER THAN THE
     * GAPS BEING SHAVED. Shaving them would have made the same defect rarer
     * instead of absent, and a check that is graded only when the link is fast
     * is a check nobody can trust the count of.
     */
````

<a id="nola-193"></a>
## nola-193: demo/nola/index.html, inline script, line 2245

````js
    //
    // ⚠️ THE CONTROL IS THE SAME GESTURE WITH NOTHING UNDER THE FOOT, MEASURED
    // AT THE SAME AGE. Without it, what is being measured is only that a note
    // takes a while to die.
````

<a id="nola-194"></a>
## nola-194: demo/nola/index.html, inline script, line 2255

````js
    /* 🔴 THE CONTROL ARM ON ITS OWN, AND IT IS TWO THINGS AT ONCE. The assert
       below is a RATIO, `onPedal > noPedal * 2`, which would pass perfectly
       well with both readings large: a page whose damper had stopped working
       entirely would still ring twice as loud under a foot. Two numbers from
       two places is this repository's rule and two derived from one comparison
       is the defect it has already paid for twice.
       ⚠️ AND IT IS ALSO THE REPAIR FOR A HARNESS SILENCE RECORDED IN
       `BACKLOG.md`. This pedal block ran **3.09 s with no assert in it** and
       `demo/verify.mjs` gives up about two seconds after the last NEW assert,
       so every check after it was green by luck rather than headroom. The
       sleeps are the measurement and must not be shortened; what was missing
       was an honest claim in the middle of them. This splits 3.09 s into 1.2
       and 1.8. */
````

<a id="nola-195"></a>
## nola-195: demo/nola/index.html, inline script, line 2311

````js
    //
    // 🔴 BOTH READINGS ARE CLEAR OF THE ANALYSER'S OWN 11.6 ms WINDOW, and at
    // 2048 samples neither was: a reading 40 ms after the key came up was still
    // half made of samples from before it, so an instant stop measured the same
    // as a ramp. The damper's time constant is a third of `damperSec`, so 45 ms
    // in it is at about a third of where it started and 130 ms in at a
    // twenty-fifth, which is a difference no window width can manufacture.
````

<a id="nola-196"></a>
## nola-196: demo/nola/index.html, inline script, line 2347

````js
    /* 🔴 AND THE LAMP FOLLOWS THE FOOT RATHER THAN THE PRESS, which is the
       mistake `/muta/` shipped and had reported as *"midi off, same label on
       both states??"*. A real pedal moves this button without anybody touching
       it, so the state has to come from the pedal. */
````

<a id="nola-197"></a>
## nola-197: demo/nola/index.html, inline script, line 2359

````js
    //
    // 🔴 THE PITCH, NOT THE NUMBER THE PAGE COMPUTED. Notes 63 and 64 come from
    // ONE recording, 63 at its own rate and 64 bent up a semitone, both read at
    // the same age. A semitone is a factor of 1.0595, and reading the page's own
    // `shift` instead would have been the page grading its arithmetic against
    // itself: MEASURED by forcing `playbackRate` to 1, which left this page
    // 24/24 green until this check read the sound.
````

<a id="nola-198"></a>
## nola-198: demo/nola/index.html, inline script, line 2387

````js
    //
    // 🔴 BOTH HALVES AT THE SAME SETTING, because the claim is about what
    // transpose does NOT reach. Putting it back to 0 before touching the screen
    // keys grades the second half at the one value where the two answers cannot
    // differ, and a transpose that leaked into the screen path read green.
````

<a id="nola-199"></a>
## nola-199: demo/nola/index.html, inline script, line 2411

````js
    //
    // 🔴 `verify.mjs` PRESSES `.pos-controls button` AND THE PAD IS NOT IN IT,
    // on purpose, because it belongs to the keyboard rather than to the page.
    // A page that ships it and asserts nothing about it has three ungraded
    // controls, which is how `/mirror/` lost two while reading green.
````

<a id="nola-200"></a>
## nola-200: demo/nola/index.html, inline script, line 2424

````js
    //
    // 🔴 THREE KEYS STILL DOWN AND THE PEDAL STILL DOWN, because a panic check
    // run on a quiet page grades nothing. This assert used to read the state
    // after everything had already decayed on its own, so deleting the whole
    // body of `onPanic` left it green: the notes were gone either way and the
    // check could not tell which reason it was looking at.
````

<a id="nola-201"></a>
## nola-201: demo/nola/index.html, inline script, line 2445

````js
    //
    // ⚠️ THE PIANO'S OWN FILES, COUNTED BEFORE THE RHODES BLOCK RUNS. Nothing
    // has asked for a Rhodes file at this point, so `gotFiles` is still the
    // piano's, and the Rhodes' own fetching is graded below on the URLs rather
    // than on this count.
````

<a id="nola-202"></a>
## nola-202: demo/nola/index.html, inline script, line 2457

````js
    //
    // 🔴 EVERY ONE OF THESE GOES THROUGH `pressInst(<id>)`, WHICH PRESSES THE
    // CONTROL, RATHER THAN THROUGH `setInstrument`. The selector is outside
    // `.pos-controls`, so no harness will ever press it, and a check that
    // reached past it would leave the one control this page owns graded by
    // nothing. That is the loss `positron-verify` records on `/mirror/` and
    // `/blocks/`, where ten and six asserts went silent behind a control
    // nobody could press.
    // 🔴 AND IT NAMES THE INSTRUMENT RATHER THAN INDEXING THE CONTROL, SINCE
    // 2026-09-25. These ten call sites read `instPick.buttons[0]` for PIANO and
    // `buttons[1]` for RHODES, which was true of `createChoice` and is false of
    // the selector that replaced it: a picker's two buttons are `previous` and
    // `next`. `buttons[1]` would have gone on landing on the Rhodes by luck and
    // `buttons[0]` would have become a direction, with every line's own comment
    // still reading correctly. See the block beside the control.
````

<a id="nola-203"></a>
## nola-203: demo/nola/index.html, inline script, line 2187

````js
      /* 🔴 THE FETCHING PART COMES FIRST AND IS READ OFF THE WIRE. What is
         being graded is which file the page ASKED FOR, not which layer it
         worked out a line earlier: reading `lastPlayed.layer` would be the page
         grading its own arithmetic, which is how a `playbackRate` forced to 1
         read green on this page once already. */
````

<a id="nola-204"></a>
## nola-204: demo/nola/index.html, inline script, line 2205

````js
      /* 🔴 READ OFF WHAT PLAYED, NOT OFF WHAT WAS FETCHED, AND THE DIFFERENCE
         MATTERS SINCE 2026-09-23. A Rhodes press now pulls every layer of that
         note in one plan, the way the piano already pulls an octave, so the
         fetch list no longer says which recording a velocity chose. `lastPlayed`
         is what actually sounded, which is the quantity these two checks were
         always about. */
````

<a id="nola-205"></a>
## nola-205: demo/nola/index.html, inline script, line 2216

````js
      /* 🔴 AND THE HOLE IS CROSSED FOR REAL, NOT IN ARITHMETIC. Note 81 has no
         layer 1 file at all, so a page that trusted the layer it computed would
         have asked for `rhodes-081-1.m4a` and got a 404 on a run whose own
         `no failed requests` line would then be the only thing that said so. */
````

<a id="nola-206"></a>
## nola-206: demo/nola/index.html, inline script, line 2225

````js
      /* ⚠️ WHAT THE TIMED READINGS NEED, FETCHED BEFORE ANY OF THEM. Same
         reason as the piano's octaves above: a fetch in the middle of a
         measurement is both a distorted reading and a silence the harness may
         walk out during. */
````

<a id="nola-207"></a>
## nola-207: demo/nola/index.html, inline script, line 2243

````js
      /* 🔴 READ WHILE THE RHODES IS THE ONE CHOSEN, WHICH IS NOT A DETAIL OF
         THIS CHECK BUT THE WHOLE DIFFERENCE THE NEW CONTROL MAKES. A choice
         gave every option a button and so a hover that existed whatever was
         selected; a selector shows ONE name at a time, so the credit is on the
         value cell and follows the selection. Taking this reading after the
         switch to the piano below would have read the piano's line and gone red
         on a page doing exactly what it promises. */
````

<a id="nola-208"></a>
## nola-208: demo/nola/index.html, inline script, line 2252

````js
      /* 🔴 AND THE LEVEL IS THE WHOLE REASON THERE ARE TWO CONSTANTS. The piano
         files are 21 dB down and the Rhodes files are at full scale, so an
         instrument switch that reused one number would be about 20 dB out in
         one direction or the other. The same key at the same velocity on both
         is the only reading that says whether that was got right. */
````

<a id="nola-209"></a>
## nola-209: demo/nola/index.html, inline script, line 2264

````js
      /* 🔴 THE ATTRIBUTION IS A LICENCE TERM, NOT A COURTESY, AND IT MOVED OFF
         THE FACE ON 2026-09-23. Asked to remove the sentence under the keys, and
         CC BY-NC-SA 4.0 requires attribution to travel with the work; what it
         does not require is a paragraph on the page. It is on the sound
         selector's hover, so this asserts the words a reader can still reach
         rather than the element that used to carry them.
         🔴 AND THE SECOND HALF IS THE NEGATIVE CONTROL THAT GRADES THE HAZARD
         THE NEW CONTROL BROUGHT WITH IT. `picker.mjs` overwrites the value
         cell's own title on every draw, at `:103` and again at `:160`, so a
         credit written once at build would be gone the next time the name was
         drawn and this check would still be green on whatever happened to be
         there. Reading the PIANO's title after a switch says two things at
         once: the credit survived a redraw, and it is following the selection
         rather than sitting there as a constant. */
````

<a id="nola-210"></a>
## nola-210: demo/nola/index.html, inline script, line 2291

````js
      /* 🔴 EVERY CHECK ON THIS PAGE PRESSES SCREEN KEYS, AND A MIDI KEYBOARD
         ENTERS SOMEWHERE ELSE ENTIRELY. `midiDown` and `midiUp` apply the
         transpose correction and are the only door a real keyboard comes
         through, so until now this page could read 72/72 green with that door
         broken. Reported from the deploy: *"you seem to lose keys i play"*.
         ⚠️ THESE CALL THE HANDLERS DIRECTLY, which is as close to the wire as a
         headless check can get: Web MIDI cannot be driven without a device. */
````

<a id="nola-211"></a>
## nola-211: demo/nola/index.html, inline script, line 2315

````js
      /* 🔴 AND THE COUNTS HAVE TO BALANCE, which is the half a held-set
         comparison cannot see: a note that went down and came up leaves both
         sides empty whether or not it ever reached an instrument. */
````

<a id="nola-212"></a>
## nola-212: demo/nola/index.html, inline script, line 2328

````js
      /* 🔴 AND A CHORD PLAYED OVER MIDI COMES BACK AROUND, WHICH IS THE CLAIM
         THAT WAS WRONG TWICE. Reported as *"can not hear looping"* and then
         *"still no looping"*. `/kit/` grades the component and was green through
         both reports, because it drives the keyboard directly; what neither of us
         had measured is THIS page's own MIDI path, which is the one a person
         actually plays.
         ⚠️ THE TWO SIDES ARE INDEPENDENT ON PURPOSE. `on` counts what arrived on
         the wire and `voiced` counts what the instrument made, so a loop that is
         working shows the wire standing still while the voices go up. Comparing
         the loop's own counter against itself would agree with itself whatever
         happened, which is the trap this project has already paid for. */
````

<a id="nola-213"></a>
## nola-213: demo/nola/index.html, inline script, line 2340

````js
        /**
         * 🔴 THE CONTROL IS NOT IN THE ROW ON A VISIT, AND THAT IS GRADED
         * BEFORE IT IS PUT BACK. Asked 2026-09-28: *"rm loop button when
         * evolution keyboad is not connected"*. Nothing is plugged into this
         * desk during a check run, so the DISCONNECTED case is what the harness
         * meets by default and the absence is the measurement.
         * 🔴 AND THEN IT IS OFFERED, OR TWELVE ASSERTS BELOW THIS ONE WOULD
         * SIMPLY STOP RUNNING. An assert that never runs cannot fail and only
         * the COUNT says so, which is this project's worst shape. `offerLoop`
         * is the SAME call the page makes from `onPorts` when a keyboard
         * appears, driven rather than simulated, so nothing here is a path a
         * person cannot reach. It is the `/mirror/` repair: drive the mode
         * nobody on this desk can reach, rather than letting the checks behind
         * it go quiet.
         * ⚠️ IT IS NOT GATED ON `SELFCHECK` AND MUST NOT BE. A page that
         * behaves one way for the harness and another for a person is a page
         * nothing grades. What is gated is the whole check block, as always.
         */
````

<a id="nola-214"></a>
## nola-214: demo/nola/index.html, inline script, line 2364

````js
        /* 🔴 THE SHARED CHECK EVERY KEYBOARD PAGE MAKES, driven through the same
           `offerLoopFor` the port callback calls, with a Circuit as the negative
           control. `timed: false`, because the full check cost this page its
           last 16 asserts at the harness ceiling, and the loop sounding over MIDI
           is graded just below. */
````

<a id="nola-215"></a>
## nola-215: demo/nola/index.html, inline script, line 2375

````js
        /* ⚠️ PRESSED, NOT CALLED. `keys.loop.set(true)` is the api and a person
           has a button, and those are two paths: this project's own rule is that
           a harness presses the control. It also means a toggle that stopped
           reporting its own clicks would be caught here rather than looking
           perfect through the api. */
````

<a id="nola-216"></a>
## nola-216: demo/nola/index.html, inline script, line 2389

````js
        /* ⚠️ ONE LAP AND A MARGIN, NOT THREE. `verify.mjs` stops growing about two
           seconds after the last NEW assert, so a long wait inside a check does
           not fail, it TRUNCATES the run and reports what it got as green. This
           block cost 17 asserts that way before the sleeps were cut. The lap here
           is the 250 ms floor, so 350 ms is a whole turn. */
````

<a id="nola-217"></a>
## nola-217: demo/nola/index.html, inline script, line 2404

````js
        /* 🔴 A LOOP MUST NOT LET GO OF A NOTE YOUR FINGER IS ON, AND THIS PAGE'S
           OWN TAP IS WHAT REPORTED IT. Said as *"pressing loop, just repssing is
           cutting off sound, does not held note"*, with the tap line reading *"the
           wire says 57,61 and the page says nothing"*.
           🔴 A NOTE CAN BE HELD BY A FINGER AND BY A LOOP AT ONCE AND A SET
           CANNOT COUNT. When the loop replayed a note somebody was also holding,
           its note-off reached this page and this page let go of the FINGER'S
           note: the wire still had the key down, the page had nothing, and the
           sound stopped under a hand that had not moved.
           ⚠️ GRADED ON THE TWO SIDES THE TAP ALREADY COMPARES, the wire against
           the page, because that is the disagreement that was reported. */
````

<a id="nola-218"></a>
## nola-218: demo/nola/index.html, inline script, line 2437

````js
        /* 🔴 A LOOPED NOTE COMES BACK AT THE VELOCITY IT WAS PLAYED WITH, AND ON
           THIS PAGE THAT IS NOT A LOUDNESS QUESTION. Asked 2026-09-23: *"do y
           preserve velocity at all?"*, and the answer was no: every looped note
           came back at a flat 100. The Rhodes picks a different RECORDING per
           velocity layer, so a quiet phrase was looping back as a different
           sample played hard, which is most of *"loops do not sound right"*.
           ⚠️ GRADED ON WHICH FILE SOUNDED, not on a number the page carries. The
           two checks above already establish that velocity 20 and velocity 120
           choose different recordings of note 60, so the file name is an
           independent witness to the velocity that arrived. */
````

<a id="nola-219"></a>
## nola-219: demo/nola/index.html, inline script, line 2464

````js
        /* 🔴 AND THE NUMBER PAD REACHES THOSE TAKES. Asked *"num works. how come
           you can not add it to keyboard"*. Driven through `midiProgram`, which
           is the function a real program change lands on, so this grades the
           mapping rather than a restatement of it.
           ⚠️ THE NUMBERS ARE THE PANEL'S OWN PRINTING, measured off the wire: the
           pad sends the number printed on the key, so program 2 is the second
           take and the pad's `0` is program 0 and the tenth. */
````

<a id="nola-220"></a>
## nola-220: demo/nola/index.html, inline script, line 2485

````js
      /* 🔴 AND THE WARM UP IS WHAT KEEPS A NOTE FROM BEING LATE IN THE FIRST
         PLACE. Reported twice: the Rhodes could not be heard from a MIDI
         keyboard even after a late note was made to sound. Almost every Rhodes
         note was a cold fetch, so almost every note was a 120 ms one. Pressing
         the instrument warms what the keys can reach, and this measures that a
         note played afterwards is an ordinary note rather than a late one. */
````

<a id="nola-221"></a>
## nola-221: demo/nola/index.html, inline script, line 2491

````js
      /* 🔴 ABOVE THE LETTER KEYS ON PURPOSE, AND THAT IS THE WHOLE POINT OF THIS
         CHECK. It used to press note 62, which is the top of `REACH`, so it sat
         inside the only window the warm up covered and could not have caught the
         fault it exists for. Reported as *"midi does not play rhodes, sceen keyb
         does?!"*: the screen's letter keys were warm and a MIDI keyboard playing
         an octave up was cold on every note. This presses A4, which a MIDI
         keyboard reaches and the letter keys never do. */
````

<a id="nola-222"></a>
## nola-222: demo/nola/index.html, inline script, line 2513

````js
      /* 🔴 THE ONE THAT WAS REALLY LOSING NOTES, AND IT NEEDS AN UNFETCHED
         RECORDING TO SHOW AT ALL. `press` has two awaits in it and one is a
         network fetch, so a note let go before its sample arrives used to reach
         `src.start()` with nothing left to stop it: `release` had already run
         and found no voice to damp. That is a note that sounds AFTER the key is
         up and plays to the end of the sample, and on a quick passage it is
         heard as the page losing what you played and inventing what you did
         not. It is counted and refused now. */
````

<a id="nola-223"></a>
## nola-223: demo/nola/index.html, inline script, line 2535

````js
      /* 🔴 AND THE READING THAT DECIDES A LEVEL IS A CHORD, NOT A NOTE. One
         note at the wrong level is quiet or loud; six at the wrong level is a
         page that clips, which is the harm the constant above exists to avoid.
         The piano's own three note chord is already measured by the notes off
         check at the same velocity and the same age, so `loud` is the
         comparison and nothing new has to be played to get it.
         🔴 AND THE TWO DO NOT AGREE, WHICH IS THE SPARSE NOTE MAP ARRIVING
         SOMEWHERE NOBODY WAS LOOKING. MEASURED here: one Rhodes note sits 2.6 dB
         from one piano note, and three Rhodes notes sit about 8 dB above three
         piano ones. Notes 64 and 67 come from the SAME Rhodes recording at two
         rates, so they start in phase and add almost coherently, while the
         piano's three notes come from three different recordings and add like
         noise. The first version of this check asserted the two chords were
         within a few dB of each other and went red on a page doing exactly what
         it promises.
         ⚠️ THE LEVEL IS STILL RIGHT AND THE HEADROOM IS STILL THERE. A triad
         reads about 0.32 against full scale at 1.0, which is the same order as
         the piano's own worst case, and `LOUDEST` is already a third of full
         scale for exactly this reason. */
````

<a id="nola-224"></a>
## nola-224: demo/nola/index.html, inline script, line 2570

````js
      //
      // 🔴 A KEY THAT IS STILL DOWN IS THE SHAPE THAT STRANDS A VOICE. Its
      // release goes through `pedal`, which knows a note number and nothing
      // about which instrument made the sound, so a page holding a voice list
      // per instrument would leave this one ringing until the tab closed.
      // ⚠️ The picker is still on RHODES from the chord above, which is why
      // there is no click here and the first press already lands on it.
````

<a id="nola-225"></a>
## nola-225: demo/nola/index.html, inline script, line 2586

````js
      /* ⚠️ THE CONTROL IS THE SAME NOTE HELD THE SAME WAY WITH NOBODY
         SWITCHING. Without it all that is measured is that a Rhodes note gets
         quieter on its own, which it does. */
````

<a id="nola-226"></a>
## nola-226: demo/nola/index.html, inline script, line 2600

````js
      /* 🔴 AND THE WAY BACK IS THE `‹` ARROW, PRESSED ON PURPOSE, BECAUSE A
         SELECTOR HAS A DIRECTION THE CONTROL IT REPLACED DID NOT HAVE. Every
         other press on this page is `pressInst`, which walks forward until the
         control reads the instrument it was given, so without this one line
         `‹` would be a button nothing in the repository has ever pressed.
         ⚠️ AND IT IS THE HALF THAT CAN BE DEAD. Over a list of two a clamping
         `‹` does nothing at all from the first entry, and there is no mark on
         the face that says so: it looks exactly like an arrow that works. This
         is the only check that says the arrows wrap.
         ⚠️ IT ALSO PUTS THE PAGE BACK WHERE A VISITOR FINDS IT, which is what
         this line was doing before and still has to do. */
````

<a id="nola-227"></a>
## nola-227: demo/nola/index.html, inline script, line 2620

````js
    //
    // 🔴 THROUGH THE KEYS AND THROUGH THE CONTROL, NEVER THROUGH THE
    // RECOGNISER. `node demo/shell/name-test.mjs` grades the arithmetic over
    // 648 generated voicings with no browser in it, including the one claim the
    // whole feature rests on. What only this page can say is that a finger on a
    // key reaches any of it, that the two timers are wired to the two
    // thresholds, and that the roll keeps the player's selection while it
    // grows. A check that called `nameChord` here would grade a module twice
    // and this page not at all.
    //
    // ⚠️ AND EVERY SLEEP IS UNDER 1.2 s, WHICH IS THE HARNESS RATHER THAN THE
    // PAGE. `verify.mjs` gives up about two seconds after the last NEW assert
    // and this block holds chords for whole seconds on purpose, because the
    // thresholds are the thing being graded. The asserts in the middle of a
    // hold are not padding to keep a timer alive: each one is the negative
    // control for the one after it, and a chord that is named but not yet
    // written down is exactly the state `LEARN_TIMES` exists to create.
````

<a id="nola-228"></a>
## nola-228: demo/nola/index.html, inline script, line 2649

````js
      /* 🔴 `isConnected`, NOT `hidden`, AND THE DIFFERENCE IS THE WHOLE OF WHY
         *"only show chords textfield when typed is selected"* was asked twice.
         `el.hidden` is a fact about an attribute and this check read a fact about
         a property beside it, so it passed every run while the field was on
         screen: `.pos-field` carries an explicit `display`, and any author rule
         beats the browser's own `[hidden]`. Membership of the document is the one
         thing that cannot be overruled by a stylesheet. */
````

<a id="nola-229"></a>
## nola-229: demo/nola/index.html, inline script, line 2663

````js
      /* 🔴 AND IT IS EXACTLY AS TALL EMPTY AS IT IS FULL, WHICH IS THE WHOLE
         POINT OF ASKING FOR IT. *"make piano roll h fixed to 5 items even when
         no data"*. An empty learning roll is the one state where a component
         that sizes itself to its contents would be zero pixels, so the page
         would grow under the reader on the first chord and on every chord
         after it. MEASURED as a height in pixels rather than as a row count,
         because a count is what the component believes and a height is what
         somebody sees. */
````

<a id="nola-230"></a>
## nola-230: demo/nola/index.html, inline script, line 2677

````js
      /* ⚠️ AND THE ROOM IS NOT IN ANYBODY'S WAY: it is not a button, nothing in
         it can be tabbed to, and a reader using a screen reader is not told
         about five chords that are not there. */
````

<a id="nola-231"></a>
## nola-231: demo/nola/index.html, inline script, line 2694

````js
      /* 🔴 AND THE NAME A VISITOR READS IS THE KEYBOARD'S OWN FOOTER, WHICH IS
         WHY THIS PAGE GAVE THE ROLL'S CORNER UP. Asked 2026-09-25: *"rm chord
         from top left (as it moves to keyb compoentn)"*. A display was deleted
         here, so the fact it carried is asserted where it now lives, which is
         this project's rule about deleting a block rather than a courtesy.
         ⚠️ TWO QUANTITIES, READ AT THE ONE MOMENT THEY AGREE. The footer names
         what is under the hands with no clock at all and this page's reading is
         settled over `LEARN_WINDOW`, so they part company while a chord is being
         rolled and meet while one is standing still. The chord has been down for
         a whole window here, which is that moment.
         ⚠️ AND THE ELEMENT IS ASSERTED AS WELL AS THE STRING, because a footer
         built with `chord: false` would answer an empty name and this check
         would read it as a page that named nothing. */
````

<a id="nola-232"></a>
## nola-232: demo/nola/index.html, inline script, line 2713

````js
      /* 🔴 THE NEGATIVE CONTROL FOR THE THRESHOLD, AND IT IS THE HALF THAT
         MAKES THE ADMISSION MEAN ANYTHING. Named is not learned: a chord you
         touched on the way past is named just as confidently as one you sat on,
         and if a name alone put a row in the roll the whole tally would be
         decoration.
         🔴 AND SINCE 2026-09-23 THE CONTROL IS SHARPER THAN IT WAS: holding is
         no longer enough at any length. One arrival is one arrival, so this
         sleeps well past the old two second threshold and the roll is still
         empty, which the previous gate could not have survived. */
````

<a id="nola-233"></a>
## nola-233: demo/nola/index.html, inline script, line 2722

````js
      /* ⚠️ AND IT IS READ IN TWO STEPS RATHER THAN AFTER ONE LONG SLEEP, WHICH
         IS ABOUT THE HARNESS AND NOT THE PAGE. `demo/verify.mjs` gives up about
         two seconds after the last NEW assert, so a single 2.4 s wait here
         collected 54 of this page's 70 checks and reported them as green. That
         is this project's worst failure shape and it cost one run to find. Both
         readings below are real measurements rather than padding: the first is
         the moment the hold is past the floor and banked, the second is well
         past the old time threshold. */
````

<a id="nola-234"></a>
## nola-234: demo/nola/index.html, inline script, line 2754

````js
      /* 🔴 AND IT IS DRAWN WHERE THE HANDS WERE, NOT WHERE A VOICING WOULD PUT
         IT. Reported 2026-09-23 with a screenshot: A major played as A3 C#4 E4
         came out as C#3 E3 A3 and the question was *"why it suggest someting i
         do not play"*. It was the same chord re-voiced, and a roll that
         disagrees with the fingers that fed it reads as the page inventing
         something. */
````

<a id="nola-235"></a>
## nola-235: demo/nola/index.html, inline script, line 2766

````js
      /* 🔴 AND A VOICING PRESS REALLY MOVES IT, which is the other half and the
         answer to *"you can revoice if i choose so?"*. A control that leaves the
         rows where they are is the inert control this project keeps finding. */
````

<a id="nola-236"></a>
## nola-236: demo/nola/index.html, inline script, line 2773

````js
      /* ⚠️ THE CLAIM IS THAT THE PRESS MOVED IT OFF THE PLAYING, NOT THAT EVERY
         VOICING DIFFERS FROM EVERY OTHER. With one chord and nothing before it,
         `Exact` and `Smooth` land a C major triad in the same place, and
         asserting otherwise was a check about arithmetic that `chords-test.mjs`
         already owns. */
````

<a id="nola-237"></a>
## nola-237: demo/nola/index.html, inline script, line 2782

````js
      /* 🔴 A FINGER LIFTED INSIDE A CHORD IS NOT A NEW CHORD. MEASURED on a 46
         second take from this desk: 55 of 181 transitions between readings were
         the new set being a SUBSET of the one before, and holding one chord with
         the fingers moving produced `Fmaj7/C`, `Fmaj/C`, `Fmaj7/C` in a row,
         each going into the tally as its own chord. */
````

<a id="nola-238"></a>
## nola-238: demo/nola/index.html, inline script, line 2800

````js
      /* 🔴 A CHORD YOU ARE HALF WAY INTO MARKS ITS OWN DOTS, asked for as *"when
         partial match with piano roll chord use faint yellow on dots"*. The row
         highlight is an exact set on purpose, and that left the roll silent at
         the one moment somebody is reaching for a chord.
         ⚠️ GRADED THROUGH REAL KEY PRESSES, not by calling `setHeld`, so what is
         measured is the path a finger takes. */
````

<a id="nola-239"></a>
## nola-239: demo/nola/index.html, inline script, line 2808

````js
      /* ⚠️ THE CHORD THAT TAUGHT THE PAGE IS STILL UNDER A FINGER, and finding
         that out cost a run. `heldNotes` is fingers, so it read 60/64/67/48/52
         and nothing matched anything, which is the rule working correctly on a
         check that had not put the keyboard down. */
````

<a id="nola-240"></a>
## nola-240: demo/nola/index.html, inline script, line 2830

````js
      /* ⚠️ AND ONE NOTE IS NOT REACHING FOR A CHORD, IT IS THE NOTE HAPPENING TO
         BE IN IT. Without a floor a root would mark a dot on every row that
         shares it, which is the highlight meaning nothing at all. */
````

<a id="nola-241"></a>
## nola-241: demo/nola/index.html, inline script, line 2842

````js
      /* 🔴 THE SELECTION, WHICH IS THE ONE THING THE COMPONENT HAD TO GROW A
         METHOD FOR. `setRows` cancels it, correctly, because in the typed mode
         the rows really are new rows. Here they are the old rows plus one, so
         the player would lose their selection every time they held a new chord
         long enough, which is the moment they are least expecting anything to
         move. */
````

<a id="nola-242"></a>
## nola-242: demo/nola/index.html, inline script, line 2859

````js
      /* ⚠️ ONE CHECK LEFT THIS BLOCK ON 2026-09-25 AND IS NOT REPLACED, WHICH IS
         WORTH A LINE RATHER THAN A SILENT DROP. It measured how far the played
         reading's first letter sat in from the roll's corner, `6 px in and 4 px
         down`, and that reading is not drawn on the roll any more. The padding it
         graded belonged to an element that no longer exists, so there is nothing
         to re-point it at: the name is in the keyboard's footer now, where the
         component reserves its own room and `/kit/` measures it. */
````

<a id="nola-243"></a>
## nola-243: demo/nola/index.html, inline script, line 2886

````js
      /* 🔴 THE TWO PROPOSALS ARE TWO DIFFERENT JOBS, NOT A RANKED PAIR OF ONE.
         MEASURED on 251 held-out jazz standards: slot A names the real next
         chord 48.7 per cent of the time and is the globally commonest chord
         16.2 per cent of the time, while slot B names it 9.9 per cent and is
         the global maximum 1.0 per cent with 90.7 per cent of what it offers
         still attested. A single ranked list scored on accuracy is the shape
         that makes *be right* and *no cliches* fight over one cell, and the
         constant baseline is the proof: two distinct answers in eleven thousand
         contexts. */
````

<a id="nola-244"></a>
## nola-244: demo/nola/index.html, inline script, line 2904

````js
      /* 🔴 THE PROPOSAL SITS BACK UNTIL YOU PLAY IT, asked for as *"fade 'ai
         row' subtly. when i play it, rm fading"*. MEASURED as a computed
         opacity either side of the chord going down, because a transition
         written in a stylesheet and a rule that never wins look identical in
         the source. */
````

<a id="nola-245"></a>
## nola-245: demo/nola/index.html, inline script, line 2909

````js
      /* ⚠️ PUT THE KEYBOARD DOWN FIRST. `heldNotes` is fingers, so the chord
         that taught the page is still in it, and a held set that is not a
         subset of this row matches nothing. That is the rule working correctly,
         and it has now caught two checks that forgot to let go. */
````

<a id="nola-246"></a>
## nola-246: demo/nola/index.html, inline script, line 2921

````js
      /* ⚠️ PAST THE TRANSITION, NOT INTO IT. Read 60 ms after letting go it
         measured 0.944, which is the fade on its way down rather than where it
         lands, and the check went red about a page that was working. The rule is
         90 ms in the stylesheet. */
````

<a id="nola-247"></a>
## nola-247: demo/nola/index.html, inline script, line 2932

````js
      /* 🔴 AND IT IS NEVER A CHORD ALREADY IN THE ROLL. Reported with a
         screenshot of two learned rows and a proposal repeating the first:
         *"you suggested what i played"*. The commonest answer to a two chord
         vamp is one of those two chords, which is true and useless. */
````

<a id="nola-248"></a>
## nola-248: demo/nola/index.html, inline script, line 2944

````js
      /* 🔴 AND IT IS PROPOSED WHERE THE HANDS ARE, NOT AT THE BOTTOM OF THE
         PICTURE. Reported with a screenshot: chords played at A3 to A4 and a
         proposal drawn at C3 to A3, *"suggeston does no make sense, tis way
         down"*. Every voiced chord was being squeezed into the fourteen
         semitones the LETTER keys cover, which is right for a typed line a
         laptop has to play and wrong for an answer to something somebody just
         played up the keyboard. MEASURED as the distance between the middle of
         the proposal and the middle of the chord it answers. */
````

<a id="nola-249"></a>
## nola-249: demo/nola/index.html, inline script, line 2954

````js
      /* ⚠️ AN OCTAVE IS THE LINE, AND IT IS A REAL ONE RATHER THAN A ROUND
         NUMBER: a chord voiced more than twelve semitones from the one it
         follows is in a different register, which is what made the reported
         screenshot read as nonsense. It measures 8.2 with the fix and goes over
         without it. */
````

<a id="nola-250"></a>
## nola-250: demo/nola/index.html, inline script, line 2964

````js
      /* 🔴 A PROPOSAL NOBODY HAS PLAYED IS LEFT ALONE. Asked as *"do not offer
         new when i hae not played old suggestion for a while"*. Every redraw used
         to recompute it, so the thing you were reaching for could change while
         your hands were moving toward it.
         ⚠️ DRIVEN BY CALLING THE REDRAW RATHER THAN BY LEARNING A THIRD CHORD,
         because a third chord costs three more arrivals and takes this block
         past the harness's patience, and what is in question is the redraw. */
````

<a id="nola-251"></a>
## nola-251: demo/nola/index.html, inline script, line 2971

````js
      /* ⚠️ ONE REDRAW FIRST, TO START FROM AN UNPLAYED PROPOSAL. The fade check
         above PLAYS this chord to measure the row coming forward, which
         legitimately releases the hold, and a check that began there would be
         measuring the release rather than the hold. Found by the count: the
         first redraw recomputed and the second did not. */
````

<a id="nola-252"></a>
## nola-252: demo/nola/index.html, inline script, line 2987

````js
      /* ⚠️ AND PLAYING IT RELEASES THE HOLD, which is what keeps this from being
         a proposal frozen on the screen. */
````

<a id="nola-253"></a>
## nola-253: demo/nola/index.html, inline script, line 2990

````js
      /* 🔴 THE TAKE, READ ON BOTH SIDES OF THE TWO TIMES THIS CHECK PLAYS A
         PROPOSAL, because a negative control whose `refused` is 0 because
         nothing was ever proposed proves nothing at all. Between here and
         `takeAfter` the check plays this page's own proposal twice, so the
         adaptation must refuse exactly two and count none. */
````

<a id="nola-254"></a>
## nola-254: demo/nola/index.html, inline script, line 3001

````js
      /* 🔴 AND IT WAS NOT COUNTED WHILE IT WAS BEING TRIED. Asked as *"when i
         trying to get suggestion right do not store"*: a chord this page put in
         front of somebody is not a chord they keep coming back to, and counting
         it would let the suggester feed itself a line it wrote. */
````

<a id="nola-255"></a>
## nola-255: demo/nola/index.html, inline script, line 3013

````js
      /* 🔴 AND IT STAYS UNLEARNABLE AFTER THE PROPOSAL HAS MOVED ON, which is the
         half a screenshot had to point out: *"you recorded a suggestion. why>"*.
         The first rule protected only the proposal on screen, so a chord the page
         had handed somebody earlier could still be learned, and from a player's
         side that reads as *sometimes it records my practising*. */
````

<a id="nola-256"></a>
## nola-256: demo/nola/index.html, inline script, line 3028

````js
      /* 🔴 A COUNTER ON THE FAR SIDE OF THE BOUNDARY, WHICH IS THE ONLY THING
         THAT SAYS THE TAKE IS WIRED RATHER THAN HELD. `suggest` reads
         `take.chords` exactly once and only when it was handed a take, so a page
         that built one and forgot to pass it reads 0 here while every other
         assert on this page stays green. It wraps the redraw the line below was
         already making rather than forcing another, because a forced proposal
         would replace the row the checks under it are about.
         ⚠️ IT READ 2 UNTIL 2026-09-29 AND THE SECOND READ WAS `routeTo`'s, which
         left with the way home. The count is 1 now, and it is still the assert
         and not a formality: 0 is a take nothing was handed, which is exactly
         the silent failure this exists to catch. */
````

<a id="nola-257"></a>
## nola-257: demo/nola/index.html, inline script, line 3052

````js
      //
      // 🔴 +6.32 POINTS OF TOP 1 ON HELD-OUT JAZZ, and it was built, graded and
      // called by nothing until this wiring. `plans/plan-better-chords-2026-09-25.md`
      // section 14.2 has the measurement and the three measures it does not cost.
````

<a id="nola-258"></a>
## nola-258: demo/nola/index.html, inline script, line 2837

````js
      /* 🔴 THE SITE IS THE SETTLE AND NOT `addLearned`, AND THIS IS THE ASSERT
         THAT SAYS SO. `learned[]` is the DISTINCT chords somebody came back to,
         capped at `LEARN_SLOTS`, and the adaptation is measured on the STREAM of
         chord events with repeats in it. A take fed from the roll's rows would
         read the same as the roll and most of the gain would be gone. */
````

<a id="nola-259"></a>
## nola-259: demo/nola/index.html, inline script, line 2847

````js
      /* 🔴 AND A SUGGESTION MUST NOT TEACH THE SUGGESTER, WHICH IS THIS PAGE'S
         OLDEST RULE HERE AND IS A NUMBER NOW RATHER THAN A PROHIBITION.
         Reported as *"you recorded a suggestion. why>"*. MEASURED in the plan: a
         generator fed its own output cycles 56.8 per cent of the time against
         50.2 and drops to 7.23 distinct chords from 7.44.
         ⚠️ AND IT IS DRIVEN RATHER THAN DECLARED. The two holds above played a
         chord this page proposed, so `refused` has somewhere to come from; an
         assert reading 0 refused because nothing was ever offered would be the
         vacuous shape this repository keeps paying for. */
````

<a id="nola-260"></a>
## nola-260: demo/nola/index.html, inline script, line 2867

````js
      /* 🔴 THE PROPOSAL IS ON THE KEYS, SMALLER, AND UNDERNEATH WHAT YOU PLAY.
         Asked as *"make suggested notes appear subtly and be smaller that real
         ones"* and *"fade them also in keyboard so smaller are on top of
         larger"*. A proposal you read in the roll and then hunt for on the
         keyboard is a proposal you travel to. */
````

<a id="nola-261"></a>
## nola-261: demo/nola/index.html, inline script, line 2883

````js
      /* 🔴 WHAT YOU PLAYED COMES FIRST, ASKED FOR IN THOSE WORDS: *"played is
         first choice"*. It was already true, by the order `addLearned` appends
         in rather than by anything saying so, and a rule nothing grades is a
         rule that drifts. */
````

<a id="nola-262"></a>
## nola-262: demo/nola/index.html, inline script, line 2892

````js
      /* 🔴 AND IT CAME OUT OF THE COUNTED TABLE RATHER THAN THE RULE THAT USED
         TO BE THE WHOLE SUGGESTER, WHICH IS THE HALF THAT SAYS THE NUMBERS
         ABOVE ARE ABOUT THIS PAGE. MEASURED on held-out songs: the 173 byte
         diatonic rule reads 1.4 per cent top 1 on jazz and is silent on 65.3
         per cent of cases, and the table reads 48.5 and 67.4 at top 3. A page
         that silently backed off to the rule would look identical and mean
         something else entirely. ⚠️ AND THE TABLE IS FETCHED, so this also
         grades that it was asked for on a chord somebody played rather than on
         a visit: the counter above already asserted zero files before any key
         was pressed. */
````

<a id="nola-263"></a>
## nola-263: demo/nola/index.html, inline script, line 2910

````js
      /* 🔴 WHERE THE KEY CAME FROM, SAID OUT LOUD, BECAUSE IT CANNOT BE
         DEDUCED. MEASURED: two chords fit 3.33 keys of 24 on average and never
         fewer than 2, and three chords never fit exactly one, since a major key
         and its relative minor hold the same seven chords. */
````

<a id="nola-264"></a>
## nola-264: demo/nola/index.html, inline script, line 2918

````js
      /* 🔴 THREE ASSERTS ABOUT A FOUR CHORD WAY HOME STOOD HERE AND WENT WITH
         THE BLOCK ON 2026-09-29, ON *"rm A WAY HOME"*. They graded that a route
         landed on the key the page had read, that the block's four reserved rows
         held their height when one arrived, and that asking twice could answer
         differently. All three were about a block a visitor cannot reach any
         more, so they are gone rather than re-pointed: an assert kept alive
         against something that no longer exists is the dead guard this project
         keeps paying for.
         ⚠️ THE ROUTE SEARCH ITSELF IS STILL GRADED AND THAT IS WHY THIS IS A
         REMOVAL AND NOT A LOSS. `routeTo` is exported by `demo/shell/suggest.mjs`
         and `demo/shell/suggest-test.mjs` runs it with no browser at all. What
         is no longer graded anywhere is the WIRING of it to a page, and nothing
         is wired to it, which is the honest state to leave this in.
         ⚠️ THE COUNT WENT 101 TO 98 PAGE ASSERTS, MEASURED BOTH WAYS. */
````

<a id="nola-265"></a>
## nola-265: demo/nola/index.html, inline script, line 2933

````js
      /* 🔴 AND THE CHORD IN THE ROLL IS DRAWN TOO, WHICH IS THE HALF A PLAYER
         ACTUALLY SEES. `suggest.mjs` samples its first slot instead of taking
         the likeliest row, and this page shows the SECOND slot, which is chosen
         from the rows the first one did not take. MEASURED over every trigram
         context in the shipped jazz table: the second slot now answers 1.69
         different chords a context and moves at all in 68.7 per cent of them,
         where before it was one chord, always.
         ⚠️ ASKED THROUGH THE SAME CALL THE PAGE MAKES AND NOT BY REDRAWING THE
         ROLL, because forcing twelve proposals would replace the row the checks
         below are about. The seed is this page's own. */
````

<a id="nola-266"></a>
## nola-266: demo/nola/index.html, inline script, line 2955

````js
      //
      // 🔴 `C E G#` IS `Caug` AND `Eaug` AND `G#aug`, three names for one set of
      // notes, because an augmented triad divides the octave into three equal
      // major thirds and is its own inversion three times over. Naming one of
      // them is a coin toss with a name on it, and this page has the worst
      // available version of that failure: `setHeld` lights a row when the
      // player plays it, so a wrong name in the roll gets confirmed straight
      // back to somebody who trusted it.
````

<a id="nola-267"></a>
## nola-267: demo/nola/index.html, inline script, line 2966

````js
      /* ⚠️ READ WHILE THE KEYS ARE STILL DOWN. The first version of this check
         let go first and read the line inside the assert expression, which runs
         after every line above it, so it graded an empty keyboard and reported
         `nothing held` about a page doing exactly the right thing. Same shape as
         `positron-verify`'s counter-beats-a-state rule, one step along: a
         reading taken next to the event that clears it is a reading of the
         clearing. */
````

<a id="nola-268"></a>
## nola-268: demo/nola/index.html, inline script, line 2975

````js
      /* 🔴 READ THE TALLY, NOT THE ROLL, AND THIS WAS FOUND BY SABOTAGE. The
         first version of this check asserted the ROW COUNT had not moved, and
         it stayed green with the margin test replaced by `if (false)`, because
         a chord written into the tally takes two whole seconds to reach the
         roll and this check reads it 320 ms in. It was measuring a threshold it
         had not waited for. `tally.held()` is the quantity in question: an
         unsure chord must never start accruing at all. */
````

<a id="nola-269"></a>
## nola-269: demo/nola/index.html, inline script, line 2984

````js
      /* 🔴 THIS CHECK REVERSED ON 2026-09-23 AND THE OLD ONE IS QUOTED HERE SO IT
         IS NOT RE-ARGUED. It read `a chord with more than one name shows both of
         them and starts no tally at all`, and asserted `Caug or Eaug` with
         nothing accruing. Asked, in these words: *"just forget about or...rec
         it, interpet it"*.
         ⚠️ THE OLD REASONING WAS TRUE AND LOST ANYWAY. An augmented triad really
         is three chords and naming one is a coin toss. But MEASURED across three
         takes from this desk, 40 to 108 readings a minute came back as a pair,
         so the page spent much of every minute refusing to write down chords
         somebody had plainly played, and a page that goes quiet a third of the
         time is not careful, it is useless.
         ✅ WHAT SURVIVES IS THE INK. A close reading still has no `data-sure`,
         so a coin toss looks different from a certainty, and `alts` still
         carries the other name. The margin decides how loudly, not whether. */
````

<a id="nola-270"></a>
## nola-270: demo/nola/index.html, inline script, line 3011

````js
      /* 🔴 THE TALLY AGAIN, FOR THE SAME REASON AND FOUND THE SAME WAY. With
         the mode test taken out of `heardChange` entirely, a row count 400 ms
         after a press cannot tell: admission is two seconds away. What CAN tell
         is that nothing began accruing and that no chord beyond the two learned
         ones was ever scored. */
````

<a id="nola-271"></a>
## nola-271: demo/nola/index.html, inline script, line 3019

````js
      /* ⚠️ A DELTA, NOT A TOTAL. This pinned the lifetime count at 2 and went red
         the moment the measured settle window let one more chord be named
         earlier in the run, which is a check about THIS mode failing because of
         something that happened in another one. What it is actually claiming is
         that playing in the typed mode adds nothing, so it compares against what
         had been scored before the mode changed. */
````

<a id="nola-272"></a>
## nola-272: demo/nola/index.html, inline script, line 3033

````js
      /* 🔴 THE FIFTH REPORT ABOUT THE ROLL'S VERTICAL RULES WAS *"rm gap in
         piano roll vert lines"*, WITH A SCREENSHOT OF THIS PAGE, AND THE REPAIR
         IS IN `shell.css` RATHER THAN HERE. `roll.mjs` carries all five reports
         and the reason four of them could each look like the last one coming
         back: the gap was never where any of them said. It was under the FIRST
         row only, because that row is half a row taller so the top dot is not
         crowded, while the lane the rules are painted in kept a flat 26 px, so
         they stopped 6.5 px short at each end of a 39 px row.
         ⚠️ LANES, NOT ROWS, WHICH IS WHY THIS COULD BE MISSED. A row's own rect
         was already flush at every join in the picture that was complained about,
         so measuring rows reports `no gap` about a picture with one in it. The
         rules live in `.roll-lane`, so that is the box to measure.
         ⚠️ AND EVERY LANE, INCLUDING THE RESERVED ONES. A rest carries a lane and
         cells of its own, so the rules run the whole height of the roll whether
         or not there are chords that far down, and the join this was reported
         about is the one between a real row and whatever is under it. */
````

<a id="nola-273"></a>
## nola-273: demo/nola/index.html, inline script, line 3070

````js
    /* 🔴 EXACTLY ONE, WHICH CATCHES BOTH DIRECTIONS. A bracket standing in for
       an arrow is the defect this is usually written against, so most pages
       assert 0. Here one is CORRECT: the keyboard's keys and its footswitch are
       a set and the component is told so. Asserting 1 rather than 0 means
       losing the bracket fails as loudly as growing a second one, and losing it
       would put an arrow from the keys into the footswitch. */
````

<a id="nola-274"></a>
## nola-274: demo/nola/index.html, inline script, line 3080

````js
  /**
   * 🔴 THE PATCHBAY HALF, FIRST AND SILENT. The round trip runs in an IN-MEMORY
   * room with a stand-in MIDIAccess, so a run opens no socket, asks the browser
   * for no MIDI and puts nothing on anybody's desk. The relay is graded by
   * `/patchbay/`.
   * 🔴 FIRST, BECAUSE LAST WAS MEASURED TO LOSE IT. Put after the diagram asserts
   * it reported 4 of its 8 and dropped the rest without a word: this page's
   * checks sleep about 21 s in total, `demo/verify.mjs` stops collecting at 24 s
   * (`GROWTH_TRIES`), and the round trip landed past the ceiling.
   * ⚠️ AND SILENT, BECAUSE FIRST MEANS BEFORE `a visit fetched nothing` IS READ
   * AND BEFORE ANY CHECK HOLDS A NOTE. It sends NOTE OFFS only, on a note no
   * check plays, so nothing sounds, nothing is fetched and nothing held is let
   * go. A note off is still the real handler: the tap counts it, off the wire.
   */
````

<a id="nola-275"></a>
## nola-275: demo/nola/index.html, inline script, line 3158

````js
  // ── the picture ───────────────────────────────────────────────────────────
  //
  // 🔴 NO BOX FOR SYMPATHETIC RESONANCE AND NO BOX FOR A STRING MODEL. Neither
  // is here, and a box for one would draw a mechanism the page does not have,
  // which is the one thing a diagram may never do.
  //
  // 🔴 AND THE BUCKET IS NOT DRAWN EITHER. `plans/plan-nola.md` §6.3 asks for a
  // `Cloudflare` container holding `workers/station` at `R2, 3.8MB`, and that is
  // where the Salamander pack will live. Today the recordings sit beside this
  // page and are served by the site itself, so the box says `workers/view` and
  // the size is the real one. A picture of next week's architecture is the same
  // defect as a note about how the picture was made.
````

<a id="nola-276"></a>
## nola-276: demo/nola/index.html, inline script, line 3176

````js
      /* 🔴 THE KEYBOARD IS DRAWN AS A MACHINE WITH TWO PARTS, AND THE FOOTSWITCH
         IS ONE OF THEM. Half of a keyboard is under the player's foot, and a
         picture that draws the keys and not the pedal is a picture of the half
         this page is not about. It is also what keeps the three machines a
         similar size: `diagram.mjs` gives EVERY top level box the height of the
         tallest, so one machine with five parts beside one with none draws two
         boxes that are mostly empty, which is the shape the rules already
         refuse for a container with nothing in it. MEASURED: five children made
         this picture 962 px tall, and three made it a third of that. */
````

<a id="nola-277"></a>
## nola-277: demo/nola/index.html, inline script, line 3185

````js
      /* ⚠️ `set: true`, BECAUSE KEYS AND A FOOTSWITCH DO NOT FEED EACH OTHER.
         Between two neighbours with no declared link the component draws an
         ARROW by default, and it drew one from the keys into the footswitch,
         which is a mechanism that does not exist. A machine whose children
         really are a set says so and gets a bracket instead. */
````

<a id="nola-278"></a>
## nola-278: demo/nola/index.html, inline script, line 3218

````js
          /* ⚠️ THE FILES COME FIRST BECAUSE THE BYTES GO THAT WAY. The worker
             READS the recordings and serves them, so an arrow from the worker
             into the files would draw the flow backwards, which a reader
             following the picture would believe. */
````

<a id="nola-279"></a>
## nola-279: demo/nola/index.html, inline script, line 3222

````js
          /* 🔴 `samples`, NOT `recordings`, ASKED 2026-09-25 AS *"recoridng in
             diagram is unclear. samples?"*. Two things on this page are called a
             recording and the box named neither of them clearly: the instrument's
             own audio files, and the take this page writes out under `?rec=1`,
             which really is a recording OF THE PLAYER. A box in the machine the
             files are served from, reading `recordings`, is one word away from
             saying the site keeps what you played.
             ⚠️ AND IT IS RIGHT ABOUT WHICH RHODES IT NAMES, which is the other
             seam and the reason this was not a free rename. `demo/shell/rhodes.mjs`
             is a SYNTHESISED Rhodes made of arithmetic and it is not on this page
             and not in this picture; what is in this box is 95 files somebody
             recorded off real instruments. A sampler plays samples and arithmetic
             has none, so the word separates the two rather than sitting on the
             seam between them. The note keeps `recorded by Jeff Learman`, because
             that is the fact the licence needs and the word `samples` does not
             carry. */
````

<a id="nola-280"></a>
## nola-280: demo/nola/index.html, inline script, line 3249

````js
      /* 🔴 BOTH WAYS IN LAND ON THE SAME BOX, AND THEY DID NOT UNTIL THIS WAS
         DRAWN. The MIDI keys pointed at the sampler while the screen keys
         pointed at the damper, which is a picture of two different instruments
         under one caption saying they are one. Every key event on this page,
         from either road, goes through the pedal's two sets first, because the
         pedal is what decides whether a release is a release. */
````

<a id="nola-281"></a>
## nola-281: demo/nola/index.html, inline script, line 3278

````js
  /* The chords the field opens with, drawn before anybody types. It fetches
     nothing and sounds nothing: a chart is a picture until a key is pressed.
     ⚠️ THROUGH `applyMode` RATHER THAN STRAIGHT INTO `drawChords`, so that
     `?learn=1` opens on an empty roll listening for chords instead of drawing a
     line the field is about to be disabled from feeding. In `Typed`, which is
     the default, this is the same call it always was. */
````

<a id="nola-282"></a>
## nola-282: demo/nola/index.html, inline script, line 3287

````js
  /**
   * 🔴 THE CHECKS RUN AT LOAD AND ARE NOT AWAITED, AND THAT IS THE WHOLE COST
   * OF DELETING THE CONTROL ROW. They used to hang off `Play a phrase`, which
   * is how `demo/verify.mjs` drove this page; with no button to press they had
   * to move or vanish, and vanishing is silent. `/muta/` and `/archive/radio/` already
   * do exactly this.
   */
````

<a id="nola-283"></a>
## nola-283: demo/nola/index.html, inline script, line 3298

````js
  /**
   * 🔴 `ready()` GOES AFTER THE CHECKS ARE STARTED AND NOT AT THE END OF THEM,
   * AND PUTTING IT AT THE END DEADLOCKED THE HARNESS ONCE ALREADY.
   * `demo/verify.mjs` waits up to six seconds for `__demo.ready` before it
   * touches the page, so a ready at the end of a ten second check block is a
   * page waiting for a harness that is waiting for the page. It read
   * `failed: null` and `console: nothing`, which is the shape that says hanging
   * rather than throwing.
   * ⚠️ SO THE TALLY LINE IS EARLY, AND THAT IS THE HOUSE PATTERN RATHER THAN A
   * SLIP. `verify.mjs` reads `__demo.asserts` and waits for the count to stop
   * growing, so nothing is lost but the number in one log line.
   */
````

<a id="nola-284"></a>
## nola-284: demo/nola/index.html, style, line 3314

````css
  /* 🔴 THE INSTRUMENT FOOTER HAS NO RULE IN THIS FILE ANY MORE, AND THAT IS THE
     WHOLE REPAIR. Reported 2026-09-25 off a crop of it: *"the border on top of
     footer goes edge to edge. in the life of me i don ot understand why you do
     not see it and build a soliutiojn that stays (glued panels) not invent
     custom css with measurements each time"*.
     🔴 **WHAT STOOD HERE WAS `.nola-foot`, WITH A `--foot-air: 10px` OF ITS OWN,
     A `margin-top`, A `padding-top` AND A `border-top`**, on a row appended
     inside `.kbd`, which pads by `--kbd-pad`. **MEASURED: the line stopped
     9.0 px short of the box's border at both ends.**
     🔴 **AND THE PARAGRAPH THAT STOOD HERE ARGUED FOR IT.** It said the line
     *"RUNS THE WIDTH OF THE KEYS, NOT OF THE BOX"* and that bleeding *"would be
     the only thing in here touching the border"*, and the page asserted that
     inset at both ends. Every word of it was reasoning where a component was
     wanted, which is what was objected to: the line, the air and the row's own
     insets belong to `keyboard.mjs` and reach all ten pages that import it.
     ✅ `createKeyboard({ foot: true })`, and `api.foot` is the row. `.kbd-foot`
     in `shell.css` carries the bleed, derived from `--kbd-pad` rather than
     typed, and the symmetric inset asked for in the same breath: *"add space on
     left of nona to be same as top and bottob paddings"*.
     ⚠️ **WHAT THIS PAGE STILL DECIDES IS WHAT GOES IN THE ROW**, which is the
     plate at one end and the sound selector at the other, and the plate's
     `place: 'ends'` is still this page's call for the reason beside it: `end`
     carries a `margin-left: auto` that would park both children on the right. */
````

<a id="nola-285"></a>
## nola-285: demo/nola/index.html, style, line 3338

````css
  /* 🔴 THE MODE AND THE FIELD IT TURNS OFF ARE ONE ROW. `Suggested` takes the
     chord field out of the document, and a control that removes something a
     block away is a page asking a reader to work out what happened.
     🔴 AND THIS SAID THE ROW DOES NOT COLLAPSE UNTIL 2026-09-29, WHICH WAS
     WRONG AND HAD BEEN WRONG FOR AS LONG AS IT STOOD HERE. It argued that
     `.pos-choice` keeps its own height and the field was the only thing that
     grew, and the second half of that sentence is the whole defect: the field
     grew BY ITS LABEL. Asked as *"nola: rm label from chord input field tpo
     avoid content jump"*. MEASURED at 1280 with the caption still on, pressing
     `Suggested` and back: the row went 50.5 px to 34 and the keyboard under it
     moved 16.5 px up the page on every press, both ways. MEASURED after the
     caption came off: 34 px in both modes, the keyboard at 239.5 px in both,
     0 px of movement.
     ⚠️ AND IT IS NOT ZERO ON A PHONE, WHICH IS A SECOND CAUSE AND IS LEFT
     ALONE. At 375 this row wraps, so the field is a whole second line rather
     than the tallest child of one. MEASURED 97.5 px to 47.5: 50 px of the row's
     own 16 px gap and the box's 34, and not one pixel of caption. Keeping a
     line for a control that is not in the document is a bigger claim than the
     ask makes, so it is measured here rather than written. */
````

<a id="nola-286"></a>
## nola-286: demo/nola/index.html, style, line 3360

````css
  /* ⚠️ `.nola-home-h` STOOD HERE AND WENT WITH THE WAY HOME ON 2026-09-29. It
     was the block's heading, set in the table heading's own register with a
     `nowrap` on it because the words named a chord that changes width. The class
     `.nola-home` never had a rule at all, which is why only one selector left
     this sheet: the wrapper was a hook and nothing more. A selector matching
     nothing reads as correct forever, so both names are gone rather than left
     for the next reader to wonder about. */
````

<a id="nola-287"></a>
## nola-287: demo/nola/index.html, style, line 3368

````css
  /* 🔴 NOTHING IS PINNED TO THIS BOX ANY MORE, SO IT IS NOT A CONTAINING
     BLOCK ANY MORE. It carried `position: relative` for one absolute child, the
     chord name on the roll's top left, and that name moved into the keyboard's
     own footer on 2026-09-25. A `position` kept for a child that has gone is a
     rule that reads as load-bearing and is not, which is the dead rule this
     project keeps measuring in the other direction. The two lines it still
     needs are at the foot of this sheet, with the gap arithmetic they belong
     to. */
````

<a id="nola-288"></a>
## nola-288: demo/nola/index.html, style, line 3377

````css
  /* 🔴 A CHORD THE PAGE IS PROPOSING IS NOT A CHORD THE PAGE HEARD YOU PLAY,
     AND THE ROLL MUST NOT DRAW THEM THE SAME. What it learned is a record of
     what you did; what it offers is a guess, and a guess wearing the same ink
     as a measurement is this project's oldest mistake in a new place. The dots
     keep their own colour, because they are still where the notes are. */
````

<a id="nola-289"></a>
## nola-289: demo/nola/index.html, style, line 3382

````css
  /* ⚠️ THE DOT IS AN `::after`, NOT THE CELL. Setting a background on the cell
     paints the whole column instead of the mark, which is what the first
     version of these two rules did. `shell.css` draws every dot that way and
     `[data-held]` above is the pattern to copy. */
````

<a id="nola-290"></a>
## nola-290: demo/nola/index.html, style, line 3389

````css
  /* 🔴 A PROPOSAL IS DRAWN SMALLER THAN SOMETHING YOU PLAYED, AND GROWS INTO IT
     WHEN YOU DO. Asked 2026-09-23: *"make suggested notes appear subtly and be
     smaller that real ones. they fade and get bigger then actually played"*.
     Size carries the same meaning the colour does, one channel louder: a small
     faint mark is an offer, a full one is a fact. `transform` rather than width,
     because `positron-ui` forbids an animation that changes how much room a
     thing takes and a dot that resized its cell would move the columns under a
     reader. */
````

<a id="nola-291"></a>
## nola-291: demo/nola/index.html, style, line 3397

````css
  /* 🔴 A RING, NOT A SMALLER DOT, AND THE SMALLER DOT WAS TRIED FIRST AND
     REPORTED AS *"not small dots, do not work"*. A small filled dot says
     *quieter*, which a reader has to compare against a neighbour to notice, and
     on a key with nothing beside it there is nothing to compare against. An
     outline at the SAME size says *empty*, which needs no comparison: it is a
     place for a dot rather than a faint one. Asked as *"try large circles with
     only outine"* and *"make it radiobutton"*, which is exactly the idea, a slot
     that fills when you take it.
     ⚠️ AND IT FILLS WHEN YOU PLAY IT, which is the same fact the row's opacity
     already carries, said in the one channel a player is actually looking at. */
````

<a id="nola-292"></a>
## nola-292: demo/nola/index.html, style, line 3407

````css
  /* 🔴 THE CIRCLE WON AND THE BLUR IS DELETED, WHICH IS WHAT THE SWITCH WAS FOR.
     Both were drawn for a while behind `?ai=`, because *"do not know what
     works"* is answered by looking rather than by me arguing for one in a
     comment, and the answer came back as *"keep circles not blur"*. The loser is
     deleted rather than left behind a flag: a page that keeps every option
     somebody tried is a page nobody can read. */
````

<a id="nola-293"></a>
## nola-293: demo/nola/index.html, style, line 3414

````css
  /* 🔴 THE SAME RING AND THE SAME DOT AS THE KEYBOARD, FROM THE SAME PROPERTY.
     Asked as *"take keybioard dot / circle sise and applu to piano roll too"*.
     `--k-ring` is four pixels more than `--k-dot`, which is one pixel of border
     and one of gap on each side, so a dot drawn inside this ring clears it by
     exactly a pixel. Both pictures read the one declaration in `shell.css`.
     ⚠️ AND A PLAYED PROPOSAL IS A DOT INSIDE ITS RING, NOT A FILLED RING, which
     is the radio button finished: the ring is the slot and the dot is the answer
     in it. One element does both, because the dot is a radial gradient in the
     middle of the same box the ring is drawn round. */
````

<a id="nola-294"></a>
## nola-294: demo/nola/index.html, style, line 3433

````css
  /* 🔴 A NEW PROPOSAL ARRIVES RATHER THAN APPEARING. Asked 2026-09-23:
     *"waaaaait when new suggetion, i want to feel it"*. A row that is simply
     there the next time you look is a row you find; a row that lands is one you
     notice, and this page is asking somebody to try something, which only works
     if they know it was offered.
     ⚠️ IT RUNS ONLY ON A PROPOSAL THAT REALLY CHANGED. The row is rebuilt on
     every redraw including the ones that keep the old proposal, so animating the
     element would flash a chord that has been sitting there for twenty seconds.
     `data-new` is set by the page on the row it just computed and on nothing
     else.
     ⚠️ AND IT MOVES NOTHING. `transform` and `opacity` only, because an
     animation that changes how much room a thing takes moves the columns under a
     reader, which is the rule this roll already keeps for its own rows. */
````

<a id="nola-295"></a>
## nola-295: demo/nola/index.html, style, line 3446

````css
  /* 🔴 ONE DURATION, DECLARED ONCE, BECAUSE THE TWO PICTURES ARRIVE TOGETHER.
     Asked as *"make them appear sloow on pianorooll and keyboard (same rate)"*.
     The roll and the keys are two drawings of one proposal, and two animations
     at two speeds read as two things happening rather than one. A shared
     measurement typed in two places is a measurement that will disagree, which
     is why it is a custom property rather than a number in each rule. */
````

<a id="nola-296"></a>
## nola-296: demo/nola/index.html, style, line 3452

````css
  /* 🔴 IT WAITS, THEN BREATHES IN. Asked as *"make suggestion arrive later and
     make looong fadein / breathe"*, after *"waaaaait when new suggetion, i want
     to feel it"*. The first version was 900 ms starting the instant the chord
     was computed, which lands on top of the chord you have just finished playing
     and reads as the page interrupting rather than answering.
     ⚠️ THE DELAY IS THE HALF THAT MAKES IT AN ANSWER. Nothing appears while your
     hands are still settling, and `backwards` holds it invisible through the
     wait rather than letting it flash at full strength first.
     ⚠️ AND BOTH PICTURES STILL SHARE ONE DECLARATION, because the roll and the
     keys are two drawings of one proposal and two speeds read as two events. */
````

<a id="nola-297"></a>
## nola-297: demo/nola/index.html, style, line 3463

````css
  /* 🔴 AND THE CURVE IS WHY IT LOOKED FAST WHEN IT WAS NOT. Reported as *"still
     soooo fast suggeston appreance. bug?"*, and MEASURED before changing
     anything: the computed animation really was `2.2s` at `0.7s` delay. The
     fault was `cubic-bezier(.16, 1, .3, 1)`, an expo-out curve that covers about
     ninety per cent of its distance in the first fifth of the time, so a 2.2 s
     fade is over in perhaps 0.3 s and then creeps invisibly for two seconds.
     ⚠️ A DURATION IS NOT A SPEED. What a reader perceives is where the curve
     spends its time, and every ease-OUT spends it at the start. A slow arrival
     needs a curve that is slow in the MIDDLE, which is what ease-in-out is, and
     opacity is left almost linear because the eye reads brightness directly. */
````

<a id="nola-298"></a>
## nola-298: demo/nola/index.html, style, line 3491

````css
  /* ⚠️ AND NOTHING MOVES FOR SOMEBODY WHO ASKED FOR THAT. The mark is still
     drawn, it simply does not travel to get there. */
````

<a id="nola-299"></a>
## nola-299: demo/nola/index.html, style, line 3498

````css
  /* 🔴 A PROPOSAL SITS BACK UNTIL YOU PLAY IT, asked for as *"fade 'ai row'
     subtly. when i play it, rm fading"*. The fade is the row saying it is not
     one of yours yet, and landing the chord is the moment it stops being a
     suggestion and starts being something you did, so that is where the fade
     goes. ⚠️ SUBTLE ON PURPOSE: enough to sit behind the played rows, not
     enough to read as disabled, and the row is still perfectly legible. */
````

<a id="nola-300"></a>
## nola-300: demo/nola/index.html, style, line 3504

````css
  /* 🔴 THE FADE IS STILL HERE AND IS LIGHTER THAN IT WAS, ASKED AS *"where is
     fade option"*. It was 0.62 when the proposal was a filled dot, and the mark
     is an OUTLINE now, which is already the quiet version of a dot. Two quiet
     channels stacked is not subtle, it is hard to find, and the question was
     somebody looking for a thing that was there and invisible.
     ⚠️ THERE IS NO CONTROL FOR IT AND THERE SHOULD NOT BE. The fade says *not
     played yet*, which is a fact about the row rather than a preference, and it
     answers by itself the moment you play the chord. */
````

<a id="nola-301"></a>
## nola-301: demo/nola/index.html, style, line 3515

````css
  /* 🔴 A CHORD YOU ARE HALF WAY INTO, ASKED FOR AS *"when partial match with
     piano roll chord use faint yellow on dots"*. `--hi` is the ink a pressed
     key already uses, so this is the same meaning at lower strength rather than
     a sixth colour: yellow says *you are playing this*. The row's own full
     match highlight is untouched, and `roll.mjs` marks no dots once the whole
     chord is down, because the row has lit by then and two signals for one fact
     is the middot rule wearing a colour.
     ⚠️ IT NEEDS (0,3,0) TO BEAT `.roll-row[data-on] .roll-cell.on::after`, which
     is the selected row repainting its dots and is written later in the file. */
````

<a id="nola-302"></a>
## nola-302: demo/nola/index.html, style, line 3527

````css
  /* 🔴 THE SUSTAIN BUTTON SITS WITH THE OCTAVE PAD, NOT IN `.pos-controls`.
     `keyboard.mjs` already argues this about the pad itself: an octave pair and
     a `Panic` are controls ABOUT the keys, and a hand's width away at the
     top of the page is the wrong place for any of them. A pedal is the same
     kind of thing.
     ⚠️ AND `presence.mjs` WARNS THAT A CONTROL OUTSIDE THAT ROW IS ONE NO
     HARNESS DRIVES. True, and answered: this page's own check presses it
     twice and then proves the lamp follows a REAL pedal as well as its own
     press, which is more than a harness click would have graded. */
````

<a id="nola-303"></a>
## nola-303: demo/nola/index.html, style, line 3541

````css
  /* 🔴 ONE PER ROW, AT THE KEYBOARD'S OWN WIDTH. Asked for as *"'hint
     keyboards': same w as regular one"*. They were a wrapping row of 320 px
     cards, which put two different key widths on one page: the chart's C and
     the instrument's C were different sizes, so the eye could not carry a shape
     from one to the other, which is the only thing a chord chart is for. */
````

<a id="nola-304"></a>
## nola-304: demo/nola/index.html, style, line 3548

````css
  /* ⚠️ `nowrap` AND `tabular-nums`, because a chord name sits over a picture
     whose width it must not change. A name that wrapped would move the keyboard
     under it and nothing that redraws may change how much room it takes. */
````

<a id="nola-305"></a>
## nola-305: demo/nola/index.html, style, line 3555

````css
  /* ⚠️ A SECOND INK, BECAUSE IT IS A SECOND KIND OF FACT. The name is what you
     type and the numeral is what it MEANS in this key, and the reference the
     four frames came from separates them the same way. */
````

<a id="nola-306"></a>
## nola-306: demo/nola/index.html, style, line 3564

````css
  /* 🔴 A CHART'S KEYS ARE SHORTER THAN AN INSTRUMENT'S. Twelve of these on a
     page at the playing keyboard's 74 px would be a screen of piano and no
     room for the piano you play. The proportions are the component's own:
     `.k.sharp` is `height: 46px` against 74, so 44 against 70 keeps the black
     key the same fraction of the white one. */
````

<a id="nola-307"></a>
## nola-307: demo/nola/index.html, style, line 3579

````css
  /* 🔴 A 2 px GAP, NOT THE COMPONENT'S 3, AND IT IS 14 PIXELS OF ARITHMETIC.
     MEASURED: fifteen white keys at the 44 px floor plus fourteen 3 px gaps is
     702 px and this page is 688, so the row scrolled by exactly the gaps. The
     alternative was a 43 px key, and 44 is Apple's minimum touch target on the
     nose: the gap is decoration and the key is the thing a finger has to hit,
     so the gap gives way. 15 x 44 + 14 x 2 = 688.
     ⚠️ IT IS ON THIS PAGE'S KEYBOARDS ONLY. Every other keyboard on the site
     draws eight white keys and has room to spare. */
````

<a id="nola-308"></a>
## nola-308: demo/nola/index.html, style, line 3587

````css
  /* ⚠️ THE GAP IS A PROPERTY NOW, NOT A RULE ON `.keys`, because the piano
     roll above the instrument is a second grid built to the same template and
     it has to read the same number. Setting `column-gap` here reached one of
     them and left the roll a pixel wider per column, which is the alignment
     defect this page has now had twice. */
````

<a id="nola-309"></a>
## nola-309: demo/nola/index.html, style, line 3595

````css
  /* 🔴 THE INSTRUMENT PICKER, THE KEYS AND THE CREDIT ARE ONE BLOCK. `stack.mjs`
     says it in its own header: a pair that belongs tight is one block, not a
     smaller gap, and the inside of a block is the block's own business. Which
     instrument the keys play and the keys themselves are not two things a
     reader should have to associate across 40 px of air. */
````

<a id="nola-310"></a>
## nola-310: demo/nola/index.html, style, line 3602

````css
  /* 🔴 THE CREDIT IS REQUIRED BY THE RHODES' LICENCE AND IS NOT DECORATION.
     CC BY-NC-SA means attribution, and attribution nobody can see is not
     attribution. It is a STANDING STATEMENT about what the keys play, so it
     sits with them rather than in `.pos-log`, which is for things that
     happened. Same argument as `.nola-bad` one element along. */
````

<a id="nola-311"></a>
## nola-311: demo/nola/index.html, inline script, line 2155

````js
    /* ── notes off, WITH SOMETHING ACTUALLY RINGING ──────────────────────── */
````
