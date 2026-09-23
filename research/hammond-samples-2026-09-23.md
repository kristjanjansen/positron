# A Hammond organ for a web page, surveyed

Answers *"research Hammond organ sample sets that could be played from a web
page"*, asked 2026-09-23. The page it has to fit is `/nola/`, which already
plays two instruments from recordings fetched per note over the wire: FluidR3's
grand piano and Jeff Learman's jRhodes3d. `research/rhodes-packs-2026-09-23.md`
is the survey that put the Rhodes there and this one uses its method and its
marks.

🔴 **NOTHING WAS DOWNLOADED AND NOTHING WAS HEARD.** Every size below is a byte
count from a host's own listing, a `Content-Length` from a single `HEAD`, or one
1,024 byte ranged read of an mp3 header. No sample library was fetched, no
archive was unpacked and no audio was decoded. No opinion here about how
anything sounds is mine.

| mark | means |
| --- | --- |
| **MEASURED** | a number taken off a running thing on this desk, with the command that took it |
| **DOCUMENTED** | a page, licence file or repository fetched today, 2026-09-23, and quoted |
| **REPORTED** | second hand, from somebody else's write-up, not confirmed at the source |
| **INFERRED** | a conclusion drawn from two of the above and stated by neither |
| **UNVERIFIED** | written from memory, nothing fetched to check it |

---

## The short answer

🔴 **THERE IS NO FREE RECORDING OF A REAL HAMMOND THAT IS WORTH BUILDING ON,
AND THE BEST LICENSED ONES ARE RECORDINGS OF A SOFTWARE EMULATOR.** The FreePats
project publishes three Hammond sample sets under **CC0 1.0**, which is the
cleanest licence in this entire document, and its own page says in as many words
that they were **recorded from setBfree**, a GPL-2.0 tonewheel emulator. So the
best-licensed Hammond samples in the free world are a recording of arithmetic.

🔴 **AND THE INSTRUMENT ITSELF REFUSES TO BE SAMPLED, WHICH IS A STRUCTURAL FACT
AND NOT A QUALITY JUDGEMENT.** A Hammond patch is not a timbre, it is nine
slider positions, and the nine are combined by the player while a note sounds.
Worse, the nine oscillators are **shared between keys**: a B-3 has 91 tonewheels
turning all the time and a key just connects busbars to them, so two keys a
fifth apart play some of the *same* wheels and those partials do not add twice.
A sample set has one recording per note and no way to express either fact.

✅ **ADDITIVE SYNTHESIS IS THE ANSWER AND IT IS NOT CLOSE.** MEASURED on this
desk: a full 91 tonewheel bank plus a two rotor Leslie with doppler renders
10 seconds of audio in **88.0 ms**, which is **0.88 per cent of one core**, and
costs **zero bytes over the wire**. The cheapest honest sample option, FluidR3's
`drawbar_organ` at **652,214 bytes** for 30 notes, buys one frozen drawbar
setting, no Leslie the player can turn on or off, and **3.13 seconds** of a note
that on a real organ sustains for as long as the key is held.

**The recommendation is section 7 and it is: write a tonewheel bank, not a
sampler. Do not ship Hammond samples at all.**

---

## 1. What was fetched, and what refused

DOCUMENTED, all on 2026-09-23:

| source | what came back |
| --- | --- |
| `api.github.com/repos/gleitz/midi-js-soundfonts/contents/...`, 18 listings | exact byte size of every mp3 in 15 bank and program combinations |
| `raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/README.md` | the licence of all three banks, quoted in 4.2 |
| `freepats.zenvoid.org/Organ/electric-organ.html` | three CC0 organ sets, quoted verbatim in 4.1 |
| six `HEAD` requests to `freepats.zenvoid.org` | exact `Content-Length` of every FreePats organ archive |
| one ranged `GET`, 1,024 bytes, of `FluidR3_GM/drawbar_organ-mp3/C4.mp3` | the Xing header, so the duration is measured rather than guessed |
| `electricdruid.net/technical-aspects-of-the-hammond-organ/` | the gear ratio table, the foldback table, the scanner and the key click |
| `en.wikipedia.org` Hammond organ and Leslie speaker | manual sizes, drawbar footages, Leslie rotor speeds |
| `api.github.com/orgs/sfzinstruments/repos`, `.../smpldsnds/repos` | 76 and 20 repositories with licence and size |
| GitHub repository search, three queries | 19 tonewheel projects, none of them shipping samples |
| `api.github.com/repos/sgossner/VCSL/contents/...` and its `LICENSE` | the CC0 Versilian library's instrument tree |
| `musical-artifacts.com/artifacts/466.json` | HamOrg's licence field |
| `freesound.org/people/hammondman/packs/18844/` and one sound page | 12 CC0 tonewheel organ notes |
| `michaelpichermusic` via search, `kvraudio`, `payhip` | HamOrg's terms |

⚠️ **AND THREE REFUSALS, WHICH ARE FACTS ABOUT THE ASKING AND NOT ABOUT THE
CONTENT.** `musical-artifacts.com` answered two `.json` requests and then
dropped the TLS connection entirely on the next two, so its list endpoint was
never read. `vi-control.net` answers **HTTP 403** to a fetcher, so *Real Rotor
Organ* in section 4.5 has no licence text. `michaelpichermusic.wixsite.com`
answers **HTTP 404** on the path every search result gives for it. This is the
shape `positron-verify` already names: three hosts refusing in three ways is one
fact about how you are asking, not three facts about the content.

⚠️ **FREESOUND'S SEARCH WAS NOT USED**, because it needs an API key and
`CLAUDE.md`'s external source rule made opening an account not worth it for a
survey. One pack was read because a search result named it. **There may be a CC0
Hammond multisample on Freesound that this document does not know about**, and
section 8 says what would settle that.

---

## 2. One cross check ran before any number below was trusted

✅ The 30 note subset of `FluidR3_GM/acoustic_grand_piano-mp3`, summed from the
GitHub contents API, is **671,974 bytes**. The 30 files already sitting in
`demo/nola/` are **671,974 bytes** on this disk. MEASURED:

```sh
ls -l demo/nola/*.mp3 | awk '{s+=$5} END {print s}'    # 671974
```

The listing and the disk agree to the byte, so the technique in section 4.2 is
not guessing. The same check is in `research/rhodes-packs-2026-09-23.md` and it
was re-run here rather than quoted, because a claim an agent builds on is worth
one command of checking.

---

## 3. What a Hammond is, and why this section comes before the sample sets

A piano and a Rhodes are struck. One key, one hammer, one recording, and the
whole of `/nola/`'s sampler follows from that. **None of it is true of a
tonewheel organ**, and every number in this section is a thing a static sample
set has to carry somehow or lose.

### 3.1 Ninety one oscillators that never stop

DOCUMENTED, `electricdruid.net`: the generator is one motor at **20 revolutions
per second** driving **91 tonewheels** through **12 gear ratios**, and the wheel
counts are *"12 tonewheels of 2 teeth"* through 128 teeth in sevens, then
*"7 tonewheels of 192 teeth"*. Frequency is `F = 20 * teeth * ratio`.

✅ **MEASURED, by computing all 91 from that table** in
the appendix script, section A.1:

| | value |
| --- | --- |
| wheels | **91**, all 91 frequencies distinct |
| lowest | **32.6923 Hz** |
| highest | **5924.57 Hz** |
| the anchor | wheel 46 is **440.0000 Hz** exactly, which is the check that the table was transcribed right |
| worst tuning error in the first seven octaves | **-0.71 cents**, and it is every G# |
| worst tuning error anywhere | **+1.98 cents**, in the top half octave |

⚠️ **electricdruid says 0.69 cents and 1.93 cents for those two and this desk
computes 0.71 and 1.98.** The difference is a rounding choice about which equal
tempered reference the error is taken from, it is two hundredths of a cent, and
neither number changes anything. It is recorded because a number that disagrees
with its source and is not flagged is how a wrong number survives.

🔴 **THE WHEELS TURN WHETHER OR NOT ANYBODY IS PLAYING, AND A KEY IS A SWITCH
RATHER THAN A TRIGGER.** DOCUMENTED, the same page: *"The original organs have
nine contacts under each key"*, and *"The busbars are simple mixer circuits that
sum all the notes pressed down"*. **This is the fact that decides the whole
document** and section 3.6 is about it.

### 3.2 Nine drawbars, and what each one actually picks

DOCUMENTED, footage and harmonic from `electricdruid.net`, wheel offsets read
out of its foldback table and MEASURED against it in the appendix script, section A.2:

| drawbar | harmonic | multiple | semitones above the fundamental | worst error against the exact harmonic | keys of 61 where it folds |
| --- | --- | --- | --- | --- | --- |
| **16'** | sub-fundamental | 0.5 | -12 | 0.000 cents | **12** |
| **5 1/3'** | sub-third | 1.5 | +7 | **-2.665 cents** | 0 |
| **8'** | fundamental | 1 | 0 | 0.000 cents | 0 |
| **4'** | 2nd | 2 | +12 | +1.851 cents | 0 |
| **2 2/3'** | 3rd | 3 | +19 | -2.665 cents | 1 |
| **2'** | 4th | 4 | +24 | +2.665 cents | 6 |
| **1 3/5'** | 5th | 5 | +28 | **+16.218 cents** | **10** |
| **1 1/3'** | 6th | 6 | +31 | -2.665 cents | **13** |
| **1'** | 8th | 8 | +36 | +2.665 cents | **18** |

🔴 **A HAMMOND NOTE IS NOT A HARMONIC SERIES AND THE 1 3/5' DRAWBAR IS 16.2
CENTS OUT.** Equal temperament's major third is already 13.7 cents sharp of a
just one, and Hammond's own approximation adds another 2.5. That drawbar is the
one people call the *"sweet"* or the *"nasal"* one depending on taste, and its
character is precisely that it is **audibly not** the fifth harmonic. Six of the
nine are between 1.8 and 2.7 cents off. **A stack of nine sine waves at exact
integer ratios is a different instrument.**

⚠️ **EACH DRAWBAR HAS NINE POSITIONS, 0 TO 8.** That is **9^9 = 387,420,489**
registrations on one manual. DOCUMENTED that the steps are labelled 0 to 8 and
that a popular setting is written `888000000`; **the dB per step is UNVERIFIED**
and commonly REPORTED as roughly 3 dB, which was not confirmed at a source
today.

### 3.3 Foldback, which is a fact about the keyboard rather than about a note

DOCUMENTED, the ranges of wheels each harmonic may use: sub-fundamental 13 to
61, sub-third 20 to 80, fundamental 13 to 73, 2nd 25 to 85, 3rd 32 to 91, 4th 37
to 91, 5th 41 to 91, 6th 44 to 91, 8th 49 to 91. When a harmonic runs off either
end it is **folded back by an octave into the range that exists**.

✅ MEASURED from those ranges: the 1' drawbar folds on **18 of 61 keys**, the
1 1/3' on 13, the 1 3/5' on 10 and the 16' on the bottom 12. 🔴 **SO THE TIMBRE
OF A GIVEN DRAWBAR SETTING CHANGES AS YOU WALK UP THE KEYBOARD, IN OCTAVE JUMPS,
AT FOUR DIFFERENT KEYS.** This is the one thing on the list that a per-note
sample set gets right for free, because it samples each note separately. It is
also the reason a **pitch shifted** sample set gets it wrong: shifting one
recording three semitones moves the fold to the wrong key.

### 3.4 Percussion, key click, the scanner and leakage

- **Percussion.** DOCUMENTED, Wikipedia: introduced on the B-3, *"single-trigger"*
  and selectable *"normal or soft"*, on the 2nd or 3rd harmonic. It decays away
  while the key is still down and it **re-arms only when every key is released**,
  which is why legato playing produces it on the first chord and not the second.
  ⚠️ It also **steals the 1' drawbar's key contact** while it is on, DOCUMENTED:
  *"they rob one contact from a harmonic when the percussion is switched on"*.
  So switching percussion on silences a drawbar. **The exact decay times in
  seconds are UNVERIFIED** and were not found at a source today.
- **Key click.** DOCUMENTED, verbatim: *"The clicking is caused by a combination
  of the nine key contacts not shutting simultaneously, and contact bounce
  exacerbated by dirty contacts. This causes a random rapid switching of the
  signal in the initial portion of the note."* It is **random per press**, and
  the page's own suggested remedies are *"adding in transient noise, or
  electronically simulating contact bounce"*.
- **The vibrato and chorus scanner.** DOCUMENTED: a **9 stage LC delay line** of
  *"around 1mS"*, scanned *"from 1 through to 9 and then back again 9 to 1"*, a
  **16 step** cycle, at a **fixed 7 Hz** with no rate control, in six settings
  V1 V2 V3 C1 C2 C3. ⚠️ It is a **short modulated delay**, and the chorus
  settings mix the delayed signal back with the dry one while the vibrato
  settings do not.
- **Leakage.** DOCUMENTED: the generator is divided into bins, *"Each bin
  contains 2 tonewheels which are connected to the same driven gear"*, and
  magnetic leakage means *"it is possible to hear harmonic leakage either four
  octaves above or below the required tone"*.

### 3.5 The Leslie, which is the one that is definitely not a sample

DOCUMENTED, Wikipedia: a rotating **drum** in front of the bass driver and a
rotating **horn** in front of the treble driver, crossed over at *"deliberately
set to 800 Hz"*. Speeds: horn **50 rpm** chorale and **400 rpm** tremolo, drum
**40 rpm** and **340 rpm**. The effect is *"tremolo (the modulation of
amplitude) and a variation in pitch"* through *"frequency modulated sidebands"*,
which is doppler, plus the reflections off the cabinet.

🔴 **A ROTATING LESLIE IS A MOVING FILTER AND A MOVING DELAY, NOT A TIMBRE, AND
TWO OF ITS PROPERTIES MAKE SAMPLING IT INCOHERENT.** Its two rotors run at
**different speeds and are not in phase with each other**, so the sound never
repeats. And the speed change is the whole point of the control: the ramp from
chorale to tremolo takes seconds and every player uses it as an expressive
gesture. A recording captures **one rotor phase at one speed** and a loop
imposes a period the instrument does not have. ⚠️ **AND PITCH SHIFTING A
LESLIED SAMPLE MOVES THE ROTOR SPEED WITH THE PITCH**, so a three semitone
shift makes the horn spin 19 per cent faster.

### 3.6 🔴 The wheels are SHARED, and this is what a sampler cannot express

Take a C and the G a fifth above it, both with the 8' and the 2 2/3' drawbars
out. The C's 3rd harmonic is wheel `fundamental + 19`. The G's fundamental is
wheel `fundamental + 7`, and its own 3rd harmonic is `+26`. Play both and two of
the contacts land on **the same physical wheel**, feeding the same busbar.

✅ MEASURED in the appendix script, section A.3: ten keys held with all nine drawbars out
is **9 x 10 = 90** contacts, and they light **39 distinct wheels of 91**. More
than half of the contacts are duplicates.

🔴 **ON A REAL HAMMOND THOSE DUPLICATES ARE ONE OSCILLATOR, SO THEY DO NOT BEAT,
THEY DO NOT DRIFT APART AND THEY DO NOT DOUBLE IN THE WAY TWO INDEPENDENT
OSCILLATORS DOUBLE.** They sum through the keying resistors as one correlated
signal. This is why a Hammond chord thickens far less than the note count
suggests, why the instrument stays intelligible with both hands and the pedals
down, and why organists voice chords the way they do.
🔴 **A SAMPLER GETS THIS EXACTLY BACKWARDS.** One recording per note, played as
one `AudioBufferSourceNode` per note, means every shared partial is present
**twice, at independent phase**. That is not a small error. It is the difference
between a Hammond and a stack of organ patches.
✅ **AND AN ALWAYS RUNNING WHEEL BANK GETS IT RIGHT FOR FREE**, by summing gains
onto 91 phase accumulators instead of allocating voices. Section 6 prices it.

---

## 4. Every Hammond sample set that exists free, and what its licence says

### 4.1 FreePats, CC0 1.0, and it is a recording of setBfree

✅ **THE BEST LICENCE IN THIS DOCUMENT.** DOCUMENTED verbatim from
`freepats.zenvoid.org/Organ/electric-organ.html`, the same sentence on all
three sets:

> Published under the terms of the Creative Commons CC0 1.0 public domain
> dedication.

and, also verbatim:

> Recorded from setBfree software synthesizer. setBfree is a free software
> program that accurately imitates the sound of electromechanical organs. For
> best quality and flexibility we recommend to run setBfree synthesizer directly
> in your computer. These sound banks are provided for convenience when
> sample-based synthesizers are preferred and for building complete sound sets.

MEASURED by six `HEAD` requests, exact `Content-Length`:

| set | version | SFZ and WAV, bytes | SF2, bytes | who made it |
| --- | --- | --- | --- | --- |
| **Drawbar organ emulation** | 2019-07-12 | **6,042,972** | 6,037,780 | Roberto, for FreePats |
| **Percussive organ emulation** | 2019-07-15 | **12,423,412** | 12,348,808 | Strix SoundFont Team |
| **Rock organ emulation** | 2019-07-15 | **12,576,272** | 12,549,588 | Strix SoundFont Team |

🔴 **THE PAGE RECOMMENDS AGAINST ITS OWN SAMPLES, IN WRITING, AND SAYS WHY.**
*"For best quality and flexibility we recommend to run setBfree synthesizer
directly in your computer."* The publisher of the only CC0 Hammond samples there
are says the synthesiser is better. **That is the recommendation of section 7,
arriving from the one party with no reason to say it.**

⚠️ **AND IT IS THE `Rhodes MKII` REFUSAL FROM `research/rhodes-packs-2026-09-23.md`
SECTION 6.2, WITH THE PAPERWORK FIXED.** That set was refused because it is a
recording of Pianoteq, a software model, and *"replacing FM arithmetic with
samples of somebody else's physical model is not the upgrade that was asked
for"*. This is the same thing with a clean CC0 on it. **The licence problem is
gone and the instrument problem is identical.**

⚠️ **THE INSIDE OF THESE ARCHIVES IS NOT MEASURED.** They are `.tar.xz`, so the
number of samples, the sample rate, the bit depth, the note spacing, the
velocity layers and whether the WAVs carry `smpl` loop chunks are all **UNKNOWN**
and cannot be read without downloading. Section 8 says what settles it and what
it would cost.
⚠️ **AND CC0 DOES NOT WASH THE SOURCE.** setBfree is **GPL-2.0**. INFERRED, and
marked as inference because no lawyer was asked: the output of a GPL program is
not itself GPL, so CC0 on a recording of it is almost certainly fine, and this
is the same reasoning that makes a document written in a GPL editor not GPL. It
is stated because somebody will ask.

### 4.2 The three General MIDI banks the page is already built on

MEASURED, every byte count straight from the GitHub contents API, cross checked
against the disk in section 2. All 88 chromatic notes present in all fifteen
combinations, mp3 only, **no `-ogg` directory exists for any program in any
bank**:

| bank | programme | 88 files, bytes | the 30 note subset, bytes | min | max | mean |
| --- | --- | --- | --- | --- | --- | --- |
| **FluidR3_GM** | **drawbar_organ** | 1,912,830 | **652,214** | 13,417 | 25,585 | 21,736.70 |
| FluidR3_GM | percussive_organ | 2,012,410 | 683,908 | 14,951 | 25,585 | 22,868.30 |
| FluidR3_GM | rock_organ | 2,104,346 | 715,914 | 18,825 | 25,585 | 23,913.02 |
| FluidR3_GM | church_organ | 2,098,704 | 716,278 | 13,001 | 25,585 | 23,848.91 |
| FluidR3_GM | reed_organ | 2,222,178 | 755,824 | 20,697 | 25,585 | 25,252.02 |
| MusyngKite | drawbar_organ | 2,188,924 | 744,774 | 20,957 | 25,585 | 24,874.14 |
| MusyngKite | percussive_organ | 2,183,672 | 742,486 | 19,241 | 25,585 | 24,814.45 |
| MusyngKite | rock_organ | 2,240,144 | 762,948 | 22,517 | 25,585 | 25,456.18 |
| MusyngKite | church_organ | 2,238,896 | 754,966 | 13,001 | 25,585 | 25,442.00 |
| MusyngKite | reed_organ | 2,179,408 | 743,474 | 17,655 | 25,585 | 24,766.00 |
| FatBoy | drawbar_organ | 2,035,004 | 689,160 | 15,679 | 25,585 | 23,125.05 |
| FatBoy | percussive_organ | 2,182,528 | 741,966 | 18,045 | 25,585 | 24,801.45 |
| FatBoy | rock_organ | 2,185,180 | 744,670 | 22,751 | 25,585 | 24,831.59 |
| FatBoy | church_organ | 2,251,272 | 767,342 | 25,377 | 25,585 | 25,582.64 |
| FatBoy | reed_organ | 2,192,330 | 747,868 | 20,593 | 25,585 | 24,912.84 |

For scale, the same subset of `acoustic_grand_piano` is 671,974 bytes and is
what `demo/nola/` ships today, and the whole Rhodes pack beside it is 65 files
and **3,153,007 bytes**. MEASURED:

```sh
ls -l demo/nola/*.m4a | awk '{s+=$5} END {print s}'    # 3153007
```

**The licences, DOCUMENTED verbatim from the mirror's own README:**

| bank | licence as the README states it | obligation on this project |
| --- | --- | --- |
| **FluidR3_GM** | *"Released under Creative Commons Attribution 3.0 license"* | **attribution only**. No NC, no share-alike |
| **MusyngKite** | *"Released under Creative Commons Attribution Share-Alike 3.0 license"* | attribution **and share-alike**, which is viral on the re-encode |
| **FatBoy** | *"Released under Creative Commons Attribution Share-Alike 3.0 license"* | same |

✅ **FluidR3 IS CC BY 3.0 AND IS THEREFORE THE CLEANEST THING ON THE PAGE
ALREADY**, cleaner than the Rhodes, which is CC BY-NC-SA 4.0. Taking
`drawbar_organ` from it adds **no new obligation at all**: the attribution line
for FluidR3 is already owed and already there.
⚠️ **MusyngKite AND FatBoy ADD A SECOND, DIFFERENT COPYLEFT.** CC BY-SA 3.0's
share-alike attaches to the **adapted work**, which a trimmed re-encode is. That
is not incompatible with the Rhodes's CC BY-NC-SA 4.0 as long as the files stay
**separate files with separate licence notes**, which is how `demo/nola/` is
already arranged. **They must never be merged into one asset**, and a page that
mixed a BY-SA organ and a BY-NC-SA Rhodes into a single rendered stem would have
a real problem. There is no reason to take either: they are bigger than FluidR3
and no better documented.

🔴 **AND THE HEADLINE PROBLEM WITH ALL FIFTEEN IS THAT THEY DO NOT SUSTAIN.**
MEASURED by one 1,024 byte ranged read of the Xing header of
`FluidR3_GM/drawbar_organ-mp3/C4.mp3`: **121 frames, which at 1152 samples and
44,100 Hz is 3.160816 seconds**, MPEG-1 Layer III, 44.1 kHz, joint stereo.
MEASURED locally on the sibling piano files with `ffprobe`, which reports the
gapless trimmed length: **3.128889 s**, identical on every one of the 30. The
`max` column above being **exactly 25,585 bytes in all fifteen programmes**, and
exactly the size of the local piano files, is the same renderer with the same
fixed cap.

🔴 **AN ORGAN NOTE SUSTAINS FOR AS LONG AS THE KEY IS DOWN AND THIS ONE STOPS
AFTER 3.13 SECONDS.** That is the whole difference between a struck instrument
and a switched one, and it is why the piano and the Rhodes work from this source
and an organ does not. ⚠️ **AND mp3 CARRIES NO LOOP POINTS**, so the `smpl`
chunk that `research/rhodes-packs-2026-09-23.md` section 3.1 found in the jRhodes
WAVs, and that `AudioBufferSourceNode` already understands as `loopStart` and
`loopEnd`, does not survive the render. Whatever loop the original FluidR3 sf2
had is **played out and discarded**.
✅ **LOOP POINTS FOR AN ORGAN ARE COMPUTABLE RATHER THAN SHIPPED, WHICH IS THE
ONE THING THAT MAKES IT ARGUABLE.** An organ tone is strictly periodic, so an
autocorrelation over the decoded buffer finds a period and any whole number of
periods is a clean loop. INFERRED, not measured: this is a few milliseconds per
note at load time in the browser, it has to happen after `decodeAudioData`
because encoder padding moves the sample offsets, and nobody here has written or
timed it. **It is machinery to make a recording do what an oscillator does
without being asked.**

🔴 **AND THE PROVENANCE OF EVERY ONE OF THESE FIFTEEN IS UNKNOWN.**
`research/rhodes-packs-2026-09-23.md` section 6.5 already refused FluidR3's
`electric_piano_1` on exactly this ground: *"It might be a Rhodes, a Rhodes
emulation, or an FM patch. Nobody knows, and a page that claims it is a Rhodes
would be guessing."* The identical sentence applies here. **A page that called
`drawbar_organ` a Hammond would be guessing**, and FluidR3's per programme
provenance is published nowhere that was found today.

### 4.3 Freesound: 12 CC0 notes of a real Hammond, with the Leslie already on

✅ MEASURED from `freesound.org/people/hammondman/packs/18844/` and one sound
page: **12 sounds**, ids 333759 to 333770, named `g2 d3 e3 f3 g3 d4 e4 f4 g4 d5
e5 f5`, every one described *"real organ slow rotary"*, uploaded 2016-01-21.
**All 12 are CC0**: the pack page carries the string `Creative Commons 0`
**twelve times and the string `attribution` zero times**, and sound 333759's own
sidebar reads *"Creative Commons 0 / You can copy, modify, distribute and
perform the sound, even for commercial purposes, all without the need of asking
permission to the author."* MEASURED on that sound: **mono, 1.693 seconds**.

🔴 **THIS IS THE ONLY RECORDING OF A REAL TONEWHEEL ORGAN IN THIS DOCUMENT WITH
A LICENCE THAT PERMITS SERVING IT, AND IT IS UNUSABLE FOR THREE REASONS AT
ONCE.** **12 notes** spanning g2 to f5 in a repeating `d e f g` pattern means
gaps of 2, 1, 1 and 7 semitones, so a worst pitch shift of **3 or 4 semitones**.
**1.693 seconds** does not sustain. And the **Leslie is baked in and rotating**,
which section 3.5 explains cannot be looped and cannot be pitch shifted. ✅ It
would make a fine single sound effect and it is not an instrument.

### 4.4 HamOrg, which is the best sampled Hammond and is not redistributable

DOCUMENTED, `musical-artifacts.com/artifacts/466.json`, the licence field
verbatim: **`"license":"copyright"`**. REPORTED via search results from KVR and
Musical Artifacts, the terms as the author states them: *"All Rights Reserved to
Michael Picher"*, marked **Non-free**, with the extra consideration *"Feel free
to use this virtual instrument in any commercial/non-commercial projects!"*.

DOCUMENTED, the author's own description: *"HamOrg Basic"* is *"designed for a
single keyboard setup with 9 preset key switches, which include vibrato/chorus
and percussion effects already built into certain ones"*, and both versions
*"use chromatically recorded tones sampled from a real organ"*. The paid version
*"gives you complete control over drawbar settings, vibrato/chorus, and
percussion effects"*.

🔴 **REFUSED, AND FOR THE SAME REASON THE jRhodes LICENCE READING TURNED ON.**
*"Use this virtual instrument in any project"* is a grant to a **musician**.
Putting the samples on `positron.studio` is **distributing them**, which is what
*"All Rights Reserved"* and *"Non-free"* forbid, and it is the first sentence of
the second paragraph of Jeff Learman's licence all over again: an artist grant
does not reach redistribution. ⚠️ **AND IT IS THE INTERESTING ONE**, because
*"complete control over drawbar settings"* out of a sample library means either
nine separate recordings per note or a very large number of pre-rendered
registrations. Nobody here knows which. **It is refused on paperwork before that
question matters.**

### 4.5 Real Rotor Organ, which could not be read

REPORTED from search results only: a 1957 Hammond B-3 sampled through a spinning
Leslie at chorale speed, one drawbar setting popular in rock and jazz, offered
free for Kontakt, Decent Sampler and SF2. `vi-control.net` answers **HTTP 403**
to a fetcher, so **no licence text was read, no size was measured and nothing
here is DOCUMENTED**.

⚠️ **IT DOES NOT MATTER, BECAUSE THE DESCRIPTION IS ALREADY DISQUALIFYING.**
*"One drawbar setting"* and *"through a spinning rotary speaker"* is section 3.5
and section 4.3's problem at full size: a single frozen registration with a
moving filter recorded into it. **A reader who wants it settled has to open that
page in a browser**, and it would still be one registration.

### 4.6 The places that have nothing, which is itself the finding

MEASURED, all by listing API:

- **`sfzinstruments`**, the most complete index of free SFZ instruments there is:
  **76 repositories, zero** matching organ, Hammond, tonewheel, drawbar, Leslie
  or B3. One near miss named `OrgueEglise`, French for church organ, with **no
  description, no detected licence and 27,401 KB**, contents not inspected.
- **`smpldsnds`**, the mirror project that re-encodes sample sets to ogg and m4a
  for browsers and that `research/rhodes-packs-2026-09-23.md` section 5.2 used
  for the Rhodes: **20 repositories, zero** organ related. Its list is pianos,
  e-pianos, a mellotron, drum machines and `sgossner-vcsl`.
- **VCSL**, the Versilian Community Sample Library, **CC0 1.0** with the full
  legal code in the repository: its `Electrophones` directory contains **exactly
  one instrument, `TX81Z`**, which is the FM synth. Its `Aerophones` are
  edge-blown, free, lip and reed. **No organ of any kind.**
- **GitHub repository search**, three queries: `hammond organ samples` returns
  **one** result, a *"Real-time additive synthesis pipe organ engine"* whose own
  description says *"no samples, no soundfonts"*. `drawbar organ sfz` returns
  **zero**. `tonewheel organ` returns **18**, and **every one of them is an
  emulator that ships no audio**.

🔴 **THE PATTERN IS THE SAME ONE `research/rhodes-packs-2026-09-23.md` SECTION
6.4 FOUND AND IT IS STRONGER HERE.** There the finding was that `smplr`, a
browser sampler whose whole job is curating openly licensed instruments,
*"shipped an FM piano where a Rhodes should be"*. Here the entire free sampling
world has shipped **nothing at all** where a Hammond should be, and has instead
shipped **eighteen synthesisers**. When every independent party that tried to
solve a problem solved it the same way, that is evidence about the problem.

### 4.7 Pipe organs, in one line

There are excellent, large, well licensed **pipe organ** sample sets, REPORTED
at around **174 MB** for Jeux d'orgues 2 and much larger for the Hauptwerk sets.
A church pipe organ is a different instrument from a Hammond in every way that
matters here and none of them was pursued.

---

## 5. What a static sample set can and cannot carry

The honest ledger, feature by feature. **Can** means a per note sample set can
reproduce it. **Cannot** means it has to be synthesised whatever else happens.

| the thing | sampled? | why |
| --- | --- | --- |
| the timbre of **one** drawbar setting | ✅ yes | that is what a recording is |
| the **other 387,420,488** settings | 🔴 no | nine sliders moved while a note sounds is a control, not a patch |
| **foldback** | ✅ yes, per note | a per note recording carries it for free. A **pitch shifted** one puts it on the wrong key |
| **key click** | ⚠️ partly | it is in the attack of the recording, but it is **random per press** and a sample repeats the same click forever |
| **percussion** | ⚠️ as a second set | it is a whole second recording per note, it re-arms only on full release, and it silences the 1' drawbar |
| the **scanner** vibrato and chorus | 🔴 no | a 7 Hz modulated 1 ms delay is a live process. Recording it bakes one phase in and a loop imposes a period |
| the **Leslie** | 🔴 no | two rotors at different speeds, doppler, and the speed change is the gesture. Section 3.5 |
| **wheel sharing** | 🔴 no, and this is the big one | one sample per note means every shared partial sounds twice at independent phase. Section 3.6 |
| **leakage** | 🔴 no | it is a property of the generator, not of a note |
| **sustain** | ⚠️ only with loop points | and mp3 does not carry them. Section 4.2 |
| the **tuning error**, 16.2 cents on the 1 3/5' | ✅ yes | a recording has it. Exact-integer additive does not, unless the wheel table is used |

✅ **EXACTLY TWO ROWS FAVOUR SAMPLING, AND BOTH ARE ALSO AVAILABLE TO A SYNTH
THAT USES THE WHEEL TABLE.** Foldback is a lookup and the tuning error is the
table in section 3.1. Everything else on the list is either a live process or a
thing sampling actively gets wrong.

---

## 6. Additive, priced against samples

### 6.1 What it costs to run, MEASURED

the appendix script, section A.3, plain JavaScript with no Web Audio nodes, which is the
arithmetic an `AudioWorkletProcessor` would run. A 4,096 entry sine table, 91
phase accumulators, ten keys down with all nine drawbars out, and a Leslie built
as a two band split with a fractional delay for doppler on the horn. Best of
three runs, node v25.9.0 on this laptop, 10 seconds of audio at 48,000 Hz:

| | ms for 10 s | per cent of one core |
| --- | --- | --- |
| **91 tonewheel bank**, all 91 always turning | 70.5 | **0.71 %** |
| 8 voices of 9 oscillators, nothing shared | 43.5 | 0.43 % |
| **Leslie**, 2 rotors, doppler delay, 2 bands | 16.9 | 0.17 % |
| **bank + Leslie, the whole instrument** | **88.0** | **0.88 %** |

⚠️ **RE-RUN MINUTES LATER THE LAST ROW WAS 91.0 ms AND 0.91 PER CENT.** The
honest figure is **0.7 to 0.9 per cent of one core**, and appendix A.3 has both
runs. Nothing in this document turns on the third digit.

🔴 **THE BANK'S COST IS FLAT IN POLYPHONY AND THE PER VOICE MODEL'S IS NOT.**
The 91 wheels turn whether one key is down or twenty, so 0.71 per cent is the
cost at every chord size, silence included. The per voice column is 0.43 per
cent **at eight voices** and is arithmetic away from 1.07 per cent at twenty.
**The model that is correct about the instrument is also the one that stops
getting more expensive**, which is not a trade-off anybody had to make.

⚠️ **AND THIS IS NODE ON AN APPLE LAPTOP, NOT AN `AudioWorklet` ON A PHONE.**
`plans/plan-fau.md` section 11 item 11 already records that **nobody has measured
what an iPhone grants an AudioWorklet**, and that gap is not closed here. What
the number does settle is the order of magnitude: this is not a borderline
budget, it is under one per cent of one core with 100 times of headroom, and the
render buffer arithmetic has no allocation in it.

### 6.2 What it costs to ship

| | bytes fetched by a visitor |
| --- | --- |
| **a tonewheel bank** | **0** |
| FluidR3 `drawbar_organ`, 30 notes | 652,214 |
| FluidR3 `drawbar_organ`, all 88 | 1,912,830 |
| FreePats CC0 drawbar organ, compressed source | 6,042,972 |
| all three FreePats sets | 31,042,656 |
| the Rhodes already on `/nola/` | 3,153,007 |

For scale on the source side, `demo/shell/rhodes.mjs` is a whole FM electric
piano in **2,684 bytes** and `demo/shell/moog.mjs` is **4,773**. MEASURED with
`wc -c`. INFERRED: a `tonewheel.mjs` carrying the 12 gear ratios, the 91 wheel
table, the nine drawbar offsets, the foldback ranges and a Leslie is in the same
neighbourhood, call it **6 to 9 KB**, and that is a guess from comparable files
rather than from a written one.

### 6.3 The clever cheap trick, and why it is refused

🔴 **NINE DRAWBARS FIT IN ONE `PeriodicWave`, AND IT IS THE WRONG ANSWER.** The
drawbar multiples are 0.5, 1.5, 1, 2, 3, 4, 5, 6 and 8, which are not all
integers of the fundamental. **They are all integers of HALF the fundamental.**
MEASURED in the appendix script, section A.2: doubled, they are **1, 3, 2, 4, 6, 8, 10,
12, 16**, so one `OscillatorNode` running at `freq / 2` with a 17 entry
`PeriodicWave` is an entire Hammond note at any drawbar setting, for **exactly
one node per key**, the same node count the sampler already uses.

✅ It is a real result and it is worth knowing.
🔴 **AND IT CANNOT DO EITHER OF THE TWO THINGS SECTION 3 SAYS MATTER.** A
`PeriodicWave` is by construction a set of **exact integer harmonics**, so the
16.218 cents on the 1 3/5' drawbar and the 2.665 cents on four others are gone,
and what is left is an idealised organ rather than a Hammond. And every key
carries its own oscillator, so shared wheels sound twice at independent phase,
which is section 3.6's defect arriving by a shorter road. ⚠️ Whether
`setPeriodicWave` on a **running** oscillator glitches when a drawbar moves is
**UNVERIFIED** and was not tested.

**Refused. It is the right shape for a three partial organ preset and the wrong
shape for a tonewheel one.**

### 6.4 What is already here that bears on it

Searched before assuming, and this is the whole of it:

- 🔴 **`hammond` appears ZERO times in this repository. `tonewheel` appears zero
  times.** MEASURED: `grep -ril` over everything outside `node_modules` returns
  nothing for either.
- **`drawbar` appears twice and neither is work.** `plans/plan-midi2.md:381`
  uses *"This is a drawbar organ, so controller N is the second drawbar"* as an
  example of what a MIDI 2.0 Profile is for, and
  `archive/box-fluidsynth-hexter/page-half.js:39` has `Drawbar Organ` inside the
  General MIDI programme name list. **There is no prior art and no prior ask.**
  `BACKLOG.md` has no organ line.
- ✅ **`/fau/` ALREADY HAS AN `Organ` PRESET AND IT IS THE STOCK FAUST EXAMPLE.**
  `demo/fau/index.html:277` is `os.osc(freq) + 0.5 * os.osc(freq * 2) + 0.25 *
  os.osc(freq * 3)` with an ADSR, described on the page as *"three partials and
  an envelope, which is the one to edit first"*. DOCUMENTED: the Faust
  repository's own `tests/architecture-tests/organ.dsp` is the **same three
  partials at the same 1, 0.5, 0.25 weights**. It is the first thing anybody
  writes and it is three drawbars of nine at fixed positions.
- ✅ **`demo/shell/rhodes.mjs` IS THE PATTERN TO COPY.** Its own header states
  the rule: *"NO Web Audio nodes, on purpose. This is a function from time to a
  sample, so the SAME math runs in a browser, in node, and in C on a
  microcontroller."* A tonewheel bank written that way runs on the Pi board in
  `rig/` as well as in a tab, which is the reason the Rhodes is written that way.
- ⚠️ **`/nola/`'s INSTRUMENT OBJECT CANNOT HOLD AN ORGAN.** `demo/nola/index.html:301`
  says so in its own comment: *"A note table, a level constant, a file name and a
  layer: those four are the whole of the difference"*. An organ has **no file, no
  layer, no velocity** at all, and its state is **nine sliders, a percussion
  switch, a vibrato selector and a Leslie speed**. It is not a third entry in
  `INSTRUMENTS`. Section 7 says where it goes instead.
- ⚠️ **AND FAUST'S POLYPHONIC MODEL IS THE WRONG SHAPE TOO.** `/fau/` declares
  `VOICES = 8` and the runtime **replicates a voice** that declares `freq`, `gain`
  and `gate`. A Hammond has no voices: it has one always running generator and 61
  switches. A `/fau/` preset can give a visitor nine drawbars **per voice**, which
  is a nine partial organ, and it cannot give wheel sharing at all without
  abandoning `nvoices` and writing one monolithic `process` with 91 oscillators
  and 61 gates.
- ⚠️ **THERE IS NO LESLIE IN THE FAUST LIBRARIES.** MEASURED by GitHub code
  search over `grame-cncm/faustlibraries`: `leslie` returns **0** hits and
  `rotary` returns **0**. It would be written from scratch either way.

### 6.5 Who else has already answered this, in a browser

DOCUMENTED, `github.com/gpasquero/hammond-b3`, **MIT licensed**, Rust compiled
to WebAssembly with a live browser demo at `gpasquero.github.io/hammond-b3/`.
Its own feature list is the whole of section 3: *"nine drawbars"*, *"authentic
tonewheel foldback"*, *"Leslie rotary speaker, independent horn & drum rotors"*,
*"Percussion, single-triggered 2nd / 3rd harmonic"*, *"Key click"*, *"tonewheel
leakage"*, *"Vibrato / Chorus scanner"* and *"Tube overdrive"*. It notes it uses
*"a shared sine wavetable"* in the browser. **No CPU number is published.**

Beside it, from the same search: `pteichman/roto`, MIT, a tonewheel organ on a
Teensy microcontroller. `mosmeh/syntw`, MIT. `uprod/OrganMXA`, nine drawbars and
a Leslie companion, no licence. `pantherb/setBfree`, **GPL-2.0**, 234 stars, the
reference implementation and the thing FreePats recorded.

✅ **THIS IS THE STRONGEST SIGNAL IN THE DOCUMENT AND IT IS NOT AN OPINION.**
Eighteen independent people wrote a tonewheel organ rather than sampling one,
one of them already runs in a browser under MIT, and the only organisation that
published CC0 Hammond samples **recorded them off one of these and then wrote on
its own page that you should run the synthesiser instead**.
⚠️ **AND NONE OF THAT CODE IS PROPOSED FOR IMPORT HERE.** GPL-2.0 is not a
licence this repository should take on, and a Rust and wasm build is a toolchain
question on a managed laptop. They are cited as evidence about the problem, not
as dependencies.

---

## 7. The recommendation

🔴 **BUILD THE TONEWHEEL BANK. DO NOT SHIP HAMMOND SAMPLES AT ALL.** The reasons,
in the order they carry weight:

1. **A sample set cannot hold the control the instrument is about.** Nine
   drawbars is 387,420,489 registrations and a recording is one of them. Every
   sampled option in section 4 is a frozen `888000000` or similar, and moving a
   slider on `/nola/` would do nothing a Hammond player would recognise.
2. **A sample set gets wheel sharing exactly wrong.** Section 3.6: ten keys is
   90 contacts on 39 wheels, so more than half the partials are duplicates that
   on the real instrument are one oscillator. One sample per note plays them all
   twice at independent phase. This is the difference between the instrument and
   a pile of organ patches, and no amount of re-encoding fixes it.
3. **The best licensed samples that exist are a recording of a synthesiser, and
   their publisher says so and recommends against them.** Section 4.1.
4. **It costs nothing to run and nothing to ship.** MEASURED: 0.88 per cent of
   one core for the bank and the Leslie together, flat in polyphony, against
   652,214 bytes for the cheapest sampled alternative and 6,042,972 for the best
   licensed one.
5. **It removes the licence question entirely.** Arithmetic has no licence. The
   page today carries **CC BY-NC-SA 4.0** for the Rhodes and **CC BY 3.0** for
   the piano, and a synthesised organ adds **no third obligation, no share-alike
   and no attribution line**. The only thing owed is a citation of where the gear
   ratio table came from, which is courtesy rather than law.
6. **It is the shape this repository already uses.** `demo/shell/rhodes.mjs` is
   2,684 bytes of per sample arithmetic that runs in a tab, in node and on the
   Pi. A tonewheel bank written the same way inherits all of that.

**What to build, concretely:**

| decision | value | why |
| --- | --- | --- |
| where | **`demo/shell/tonewheel.mjs`**, the `rhodes.mjs` pattern | a function from time to a sample, no Web Audio nodes, so `rig/` can run it |
| the generator | **91 phase accumulators**, always turning, frequencies from `20 * teeth * ratio` | section 3.1, and it is the only shape that gets sharing right |
| a key | **nine gains summed onto wheels**, not a voice | section 3.6. Two keys sharing a wheel add gain, not oscillators |
| drawbars | **nine sliders, 0 to 8**, into those gains | it is the instrument's only real control |
| foldback | the nine ranges in section 3.3, as a lookup | 18 of 61 keys need it on the 1' alone |
| the Leslie | **two rotors at different speeds**, fractional delay for doppler on the horn, amplitude modulation on both, split near **800 Hz** | MEASURED at 0.17 per cent of a core |
| percussion | **second or third harmonic, single trigger, re-arms on full release**, and it mutes the 1' | section 3.4. The decay times are not known and must be found |
| key click | **a short noise burst with a new random seed per press** | it is random on the real thing, so a fixed one is wrong |
| the scanner | **a 1 ms delay swept by a triangle at 7 Hz**, chorus mixes dry back in, vibrato does not | section 3.4 |
| leakage | **leave it out of version one** | it is a refinement and the four rows above it are the instrument |
| where it is played | **its own page, or a `/fau/` preset, NOT a third `/nola/` instrument** | section 6.4. `/nola/`'s instrument object is a file and a layer and an organ has neither |

⚠️ **AND THE PAGE IS A `positron-ui` TASK AND A `positron-verify` TASK BEFORE IT
IS A SYNTHESIS ONE.** Nine drawbars is nine controls arriving at once, which by
`CLAUDE.md`'s own rule moves every other control's harness press on whatever
page they land on. **Load both skills before the first slider exists**, and the
`what` and the `one` line in `demo/manifest.mjs` are written in the same commit
as the controls.

**The one thing to reconsider this for**, and it is narrow: if what is wanted is
**not a playable Hammond** but **one organ colour beside a piano and a Rhodes on
`/nola/`**, then `FluidR3_GM/drawbar_organ` at **652,214 bytes** for 30 notes is
a one line change to a build script, adds **no new licence obligation** because
FluidR3's CC BY 3.0 attribution is already owed, and lands in an afternoon.
🔴 **It must not be called a Hammond on the page**, because its provenance is
unknown and section 4.2's refusal is the same one `research/rhodes-packs-2026-09-23.md`
already applied to `electric_piano_1`. And it stops sounding after **3.13
seconds** unless somebody writes the loop finder, which is the point at which
building the oscillator would have been cheaper.

---

## 8. What this could not settle

🔴 **NOBODY HAS HEARD ANY OF IT.** No sample was decoded, no oscillator was run
through a speaker, and every sentence here about how something sounds is either
arithmetic or somebody else's prose. In particular, **whether 0.88 per cent of a
core of tonewheel bank actually sounds like a Hammond is not established by
this document and cannot be**. Eighteen other people thought it could be done.
That is not the same as having done it.

⚠️ **THE INSIDE OF THE THREE FREEPATS ARCHIVES IS UNKNOWN.** Sample count, rate,
bit depth, note spacing, velocity layers and loop chunks are all unmeasured
because they are `.tar.xz`. **What settles it: one download of 6,042,972 bytes
into `tmp/`, which is gitignored, then `tar -tvJf` and `unzip`-style inspection
of the SFZ and one WAV header.** That is a single fetch from one host, it is the
same one-shot rule `demo/resources/fetch-jrhodes3d.mjs` already follows, and it
was **not done here** because section 4.1's objection does not depend on the
answer. If anybody wants the sampled path taken seriously, this is the first
command.

⚠️ **THE PERCUSSION DECAY TIMES ARE NOT KNOWN.** Fast and slow, normal and soft,
in seconds, are the four numbers a build would need on day one and no source
consulted today gives them. A Hammond service manual would.

⚠️ **THE dB PER DRAWBAR STEP IS UNVERIFIED.** Roughly 3 dB is REPORTED and was
not confirmed. It is the difference between a drawbar that feels right and one
that does not, and it is one measurement off a real instrument or one line of a
service manual.

⚠️ **THE `AudioWorklet` BUDGET ON A PHONE IS STILL OPEN**, exactly as
`plans/plan-fau.md` section 11 leaves it. 0.88 per cent on this laptop says the
idea is not borderline. It does not say what an iPhone grants a worklet, and
`/fau/` has the same unanswered question about a much heavier instrument.

⚠️ **WHETHER `setPeriodicWave` ON A RUNNING OSCILLATOR GLITCHES WAS NOT TESTED**,
and it only matters if section 6.3 is ever revisited.

⚠️ **FREESOUND WAS NOT SEARCHED**, only one pack that a search result named. **A
CC0 multisampled Hammond could be sitting there.** What settles it: an account
and an API key, or twenty minutes of somebody browsing the site by hand with the
licence filter set to CC0. This is the same hole
`research/rhodes-packs-2026-09-23.md` section 9 left open and it is still open.

⚠️ **`musical-artifacts.com` DROPPED THE CONNECTION AFTER TWO REQUESTS**, so its
organ listing was never read and there may be entries there this document does
not name. Two were read and one of them, HamOrg, is refused on its own licence
field.

⚠️ **`OrgueEglise` IN `sfzinstruments` WAS NOT OPENED.** 27,401 KB, no
description, no detected licence, and a French name meaning church organ. It is
almost certainly a pipe organ and section 4.7 applies, but **almost certainly is
not measured** and one contents listing would settle it.

⚠️ **AND THE 0.02 CENT DISAGREEMENT IN SECTION 3.1 IS UNRESOLVED.** This desk
computes -0.71 and +1.98 cents where `electricdruid.net` states 0.69 and 1.93.
Nothing depends on it. It is written down because the alternative is a number
that quietly disagrees with its own source.

---

## Appendix A. The three measurements, reproducible

Everything MEASURED in sections 3 and 6 came from these. They are printed here
rather than committed as scripts, because the only reason they exist is to
produce the numbers above and a reader who doubts one should be able to re-run it
without hunting for a file. Save any of them anywhere and run it with `node`.
None of them opens a network connection or touches this repository.

### A.1 The 91 tonewheel frequencies

Builds the generator from the gear ratio table and checks it against the one
frequency the source says is exact.

```js
const RATIO = { C:85/104,'C#':71/82,D:67/73,'D#':105/108,E:103/100,F:84/77,
  'F#':74/64,G:98/80,'G#':96/74,A:88/64,'A#':67/46,B:108/70 };
const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const TEETH = [2,4,8,16,32,64,128];
const f = [];
for (let o = 0; o < 7; o++) for (let i = 0; i < 12; i++) f.push(20 * TEETH[o] * RATIO[NAMES[i]]);
// The top seven wheels have 192 teeth and use the gear ratios from F upwards,
// because Hammond could not cut a wheel with 256 teeth.
for (let i = 0; i < 7; i++) f.push(20 * 192 * RATIO[NAMES[(5 + i) % 12]]);

console.log(f.length, f[0].toFixed(4), f[90].toFixed(2), f[45].toFixed(4));
let worst = 0, worst7 = 0;
for (let i = 0; i < 91; i++) {
  const semis = Math.round(12 * Math.log2(f[i] / 440));
  const cents = 1200 * Math.log2(f[i] / (440 * Math.pow(2, semis / 12)));
  if (Math.abs(cents) > Math.abs(worst)) worst = cents;
  if (i < 84 && Math.abs(cents) > Math.abs(worst7)) worst7 = cents;
}
console.log(worst.toFixed(2), worst7.toFixed(2), new Set(f.map((x) => x.toFixed(4))).size);
```

Prints `91 32.6923 5924.57 440.0000`, then `1.98 -0.71 91`.

### A.2 What each drawbar actually picks

Uses `f` from A.1. The offsets are read out of the foldback ranges in section
3.3: a harmonic that runs off either end is moved by octaves until it is back
inside the range the generator has.

```js
const BARS = [                          // foot, multiple, semitones, lo wheel, hi wheel
  ["16'",     0.5, -12, 13, 61], ["5 1/3'",  1.5,   7, 20, 80], ["8'",      1,   0, 13, 73],
  ["4'",      2,    12, 25, 85], ["2 2/3'",  3,    19, 32, 91], ["2'",      4,  24, 37, 91],
  ["1 3/5'",  5,    28, 41, 91], ["1 1/3'",  6,    31, 44, 91], ["1'",      8,  36, 49, 91],
];
for (const [foot, mult, off, lo, hi] of BARS) {
  let worst = 0, folded = 0;
  for (let key = 1; key <= 61; key++) {          // the fundamental of key k is wheel k + 12
    const fund = key + 12;
    let w = fund + off;
    if (w < lo || w > hi) { folded++; while (w > hi) w -= 12; while (w < lo) w += 12; }
    const cents = 1200 * Math.log2(f[w - 1] / (f[fund - 1] * mult));
    if (Math.abs(cents) > Math.abs(worst) && Math.abs(cents) < 100) worst = cents;
  }
  console.log(foot.padEnd(8), String(mult).padStart(3), worst.toFixed(3).padStart(8), String(folded).padStart(3));
}
console.log(BARS.map(([, m]) => m * 2).join(', '));   // the PeriodicWave indices of section 6.3
```

Prints the table in section 3.2, then `1, 3, 2, 4, 6, 8, 10, 12, 16`.

### A.3 What the whole instrument costs to run

🔴 **THIS IS THE NUMBER THE RECOMMENDATION RESTS ON, SO IT IS THE ONE WORTH
RE-RUNNING.** No Web Audio, no browser: it is the arithmetic an
`AudioWorkletProcessor` would run, timed on a plain array. Ten keys held with all
nine drawbars out, which lights **39 distinct wheels of 91** because more than
half the contacts are duplicates.

```js
const SR = 48000, N = SR * 10;
const TBL = 4096, tbl = new Float32Array(TBL + 1);
for (let i = 0; i <= TBL; i++) tbl[i] = Math.sin(2 * Math.PI * i / TBL);
const phase = new Float32Array(91), inc = new Float32Array(91), gain = new Float32Array(91);
for (let i = 0; i < 91; i++) { inc[i] = f[i] / SR; phase[i] = Math.random(); }
// A key is nine gains SUMMED onto wheels. Two keys sharing a wheel share one
// oscillator, which is the whole of section 3.6.
for (const key of [24, 28, 31, 36, 40, 43, 47, 50, 55, 60])
  for (const o of [-12, 7, 0, 12, 19, 24, 28, 31, 36]) { const w = key + o; if (w >= 0 && w < 91) gain[w] += 1; }

function bank(out) {
  for (let s = 0; s < out.length; s++) {
    let acc = 0;
    for (let i = 0; i < 91; i++) {
      let p = phase[i] + inc[i]; if (p >= 1) p -= 1; phase[i] = p;
      acc += tbl[(p * TBL) | 0] * gain[i];
    }
    out[s] = acc * 0.02;
  }
}
const DMAX = 2048, dl = new Float32Array(DMAX);
let dw = 0, hp = 0, dp = 0, lp = 0;
function leslie(inp, outL, outR) {                 // horn 6.7 rev/s, drum 5.7, never in phase
  for (let s = 0; s < inp.length; s++) {
    hp += 6.7 / SR; if (hp >= 1) hp -= 1;
    dp += 5.7 / SR; if (dp >= 1) dp -= 1;
    const x = inp[s];
    lp += 0.12 * (x - lp);                         // the 800 Hz split
    const hi = x - lp;
    dl[dw] = hi; dw = (dw + 1) & (DMAX - 1);
    const sw = Math.sin(2 * Math.PI * hp);
    const ix = (dw - (64 + 48 * sw) + DMAX) & (DMAX - 1);   // doppler, in samples
    const i0 = ix | 0, fr = ix - i0;
    const h = dl[i0] * (1 - fr) + dl[(i0 + 1) & (DMAX - 1)] * fr;
    const ds = Math.sin(2 * Math.PI * dp);
    outL[s] = h * (0.65 + 0.35 * sw) + lp * (0.7 + 0.3 * ds);
    outR[s] = h * (0.65 - 0.35 * sw) + lp * (0.7 - 0.3 * ds);
  }
}
const a = new Float32Array(N), l = new Float32Array(N), r = new Float32Array(N);
for (const [name, fn] of [['bank', () => bank(a)], ['leslie', () => leslie(a, l, r)],
                          ['both', () => { bank(a); leslie(a, l, r); }]]) {
  let best = Infinity;
  for (let i = 0; i < 3; i++) { const t = process.hrtime.bigint(); fn(); best = Math.min(best, Number(process.hrtime.bigint() - t) / 1e6); }
  console.log(name, best.toFixed(1) + ' ms for 10 s =', (best / 100).toFixed(2) + ' % of one core');
}
```

MEASURED here, node v25.9.0, best of three: `bank 70.5 ms`, `leslie 16.9 ms`,
`both 88.0 ms`, which is **0.88 per cent of one core**.

⚠️ **IT VARIES BY A FEW PER CENT BETWEEN RUNS AND THE NUMBERS ABOVE ARE ONE
RUN, NOT A FLOOR.** A second run on the same machine minutes later gave
`bank 71.1`, `leslie 19.2`, `both 91.0`, so **0.71 to 0.91 per cent of a core**
is the honest range. Quote the range rather than the digit.

⚠️ **AND WHAT IT DOES NOT SAY IS THE HONEST HALF.** This is V8 on an Apple
laptop with the whole machine to itself, not an `AudioWorklet` on a phone under
a render quantum deadline, and `plans/plan-fau.md` section 11 item 11 already
records that nobody has measured what an iPhone grants a worklet. The number
settles the order of magnitude and nothing finer.
