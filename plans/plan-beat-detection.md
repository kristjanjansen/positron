# Beat detection on /concepts/radio/020/, how it works and what is next

Status (2026-10-14): partly done. The detector it describes is demo/radio/tempo.mjs on https://positron.studio/radio/tempo/, while the §6 next steps (a fourth recording, per-band onset latency, the comb resonator bank) have not landed.

Written 2026-10-11, asked *"write these workings to pplan"* after *"what was
bmp detect fix?"*. The page is `demo/concepts/radio/020/index.html` (it was
`radio/020` until the same day). The measurements behind it are in
`research/beat-tracking-2026-10-11.md`, with the scripts in that session's
scratchpad `beat/` folder.

| mark | means |
| --- | --- |
| **MEASURED** | run offline in Node on our three R2 recordings, 2026-10-11 |
| **INFERRED** | drawn from measurements, not measured itself |
| **UNTESTED** | nobody has run it in a browser or listened for it |

## 1. What the page plays

Three recordings from our own bucket, fetched once on Play and looped. Each was
captured ONCE through our relay `positron-shout`, so a visit never reaches the
broadcaster:

| station | R2 key | format | level before levelling (ffmpeg volumedetect) | kick tempo |
| --- | --- | --- | --- | --- |
| Raadio 2 | `radio/raadio2/2026-10-11.mp3` | MP3 | mean -15.5 dB, peak -3.6 | 130.0 bpm to 24.6 s, then 127.0 from 31 s, no drum after 125 s |
| Raadio 4 | `radio/raadio4/2026-10-11.mp3` | MP3 | mean -21.4 dB, peak -8.7 | 127 to 129 in its first two minutes, no steady beat in the last |
| Ida | `radio/ida/2026-10-11.aac` | ADTS AAC, 44.1 kHz stereo | mean -27.2 dB, peak 0.0 | 131.2 bpm, no kick 108 to 135 s |

**Levelling** (since 2026-10-11, *"ida signal is soooo weak"*): on decode each
recording is raised, never lowered, toward -16 dBFS RMS, and anything over 0.8
is bent under 1 with a tanh. Ida was 12 dB under Raadio 2 while its loudest
instants already touched full scale, so plain gain would have clipped. The
detector hears the levelled sound. UNTESTED by ear.

## 2. The detector, step by step

All in the page, plain WebAudio and arithmetic, nothing fetched.

1. **Four bands**: low pass 150 Hz (kick and bass), band pass 400 Hz, band pass
   1.5 kHz (snares, voices), high pass 4 kHz (hats), merged into one four
   channel input.
2. **Onsets**: each band's energy through a follower (squared, two one pole low
   passes at 10 Hz), read every 256 samples on a log scale, and how much it
   ROSE since the hop before. The rises summed over the bands are the onset
   envelope, with its own one second running mean taken off. Each band's rise
   is ALSO kept in a ring of its own, for step 6.
3. **Tempo candidates**: every 0.5 s, the autocorrelation of the last 12 s of
   the summed envelope. Each tempo from 60 to 200 bpm scores the mean of its
   correlation at one, two and four beats, plus half of it at half a beat,
   times a prior around 120 bpm (a Gaussian 0.7 octave wide). The peaks of the
   score are the candidates; the five best are sent and drawn as dots.
4. **Tempo choice**: the best candidate, with a 15% bonus for staying within 3%
   of the last choice; the line is the median of the last five choices.
5. **Confidence**: `1 - exp(-score / 0.25)`, times how many of the last eight
   choices agree (half weight). The click in the fx box waits for 0.5.
6. **Phase (where the beats fall), new 2026-10-11**: a beat envelope weighs the
   bands `[1, 0.5, 0.25, 0]`, the hats not at all. Every offset into the last
   6 s is scored as a pulse train: at each beat back, the beat envelope under a
   Gaussian 12 ms wide, plus the hat band half a beat later (weight 1), each
   beat counting less with age (3 s decay). The best offset is the last beat on
   the tab's audio clock, and the grid is `beatAt + k * 60 / bpm`.

The wave draws the beats on that grid, the tempo scope draws the line, the dots
and the confidence, and the fx box books a click on the grid 120 ms ahead on
the audio clock.

## 3. The upbeat fault, and why step 6 changed

Reported: *"beats are often uppeat"*, *"radio 2 is upbeat. not good."*

**Ground truth (MEASURED):** one kick sample matched against Raadio 2 low
passed at 300 Hz, kept only where the hits come at a steady period: 201 kicks,
median 0.8 ms from a fitted grid. Spectrograms at 10, 16 and 60 s show every hit
is the kick's falling sweep and the hat bursts sit half way between.

**The old step 6** took the phase from the four band SUM over 4 s.

**Each band folded on the kick grid** (offbeat over beat, above 1 pulls the
grid onto the upbeat, MEASURED):

| band | song 1 (130 bpm) | song 2 (127 bpm) |
| --- | --- | --- |
| under 150 Hz | 0.89 | 0.11 |
| 400 Hz | 0.88 | 0.34 |
| 1.5 kHz | 0.88 | 1.05 |
| **over 4 kHz, the hats** | **1.93** | **2.64** |
| **the sum the old step used** | **1.21** | 0.74 |

So the hats, which sit on the "and" in this music, won the sum. INFERRED: each
band is log compressed on its own, so a quiet hat's rise counts as much as a
loud kick's, and the low band cannot outvote it because the bass comes back on
the offbeat too.

**Ruled out (MEASURED):** tempo (with the true tempo fed in, still 51% on and
49% off), latency (beats on the kick are drawn 7 ms late, and only 2% fall in
between, so the error is split in two rather than smeared), and the 120 ms
booking ahead (it books at the grid's own times).

## 4. Every method tried, Raadio 2 (MEASURED)

"On" is within 1/8 beat of a kick, "half" is 3/8 or more off. CPU is ms per
second of audio for the whole detector in Node on an M2 Pro.

| method | on | half | grid flips | CPU |
| --- | --- | --- | --- | --- |
| old step 6 (shipped until today) | 50% | 48% | 28 | 3.3 |
| old step on the low band only | 63% | 25% | 37 | 3.3 |
| old step, bands weighted 1/0.5/0.25, hats 0 | 76% | 23% | 21 | 3.3 |
| pulse train on the four band sum | 49% | 51% | 27 | 3.6 |
| pulse train, weighted, hats out | 88% | 12% | 17 | 3.9 |
| pulse train, low band plus hats on the offbeat | 93% | 7% | 13 | 4.6 |
| **pulse train, weighted plus hats on the offbeat (now)** | **96 to 97%** | **3%** | **9** | **4.0** |
| dynamic programming tracker (Ellis 2007), best variant | 57% | 21% | 48 | 4.5 |
| phase lock over the pulse train | 77% | 13% | 30 | 4.6 |
| comb resonator bank, tempo and phase | 54% | 44% | 27 | 1.4 |
| comb bank tempo plus the pulse train phase | 98% | 2% | 10 | 2.1 |

What each part of the fix bought: hats out 50 to 76%, the pulse train 76 to
88%, hats scored half a beat later 88 to 96%. The last 3% are the first 4 s and
the first beats after a break.

**The page as committed (MEASURED from the page's own code):**

| recording | on, before / after | half, before / after | flips, before / after |
| --- | --- | --- | --- |
| Raadio 2 | 50% / 97% | 48% / 3% | 28 / 9 |
| Raadio 4 | 100% / 100% | 0% / 0% | 0 / 0 |
| Ida | 97% / 98% | 1% / 1% | 13 / 8 |

Tempo unchanged: 93% of Raadio 2's readings within 1%, 358 of 359 within 3% of
127.0. Ida reads median 131.04 at confidence 0.93.

## 5. What is not settled

1. **One recording decides the weights.** Raadio 4 has too few kicks to grade
   and Ida has almost no hats (its high band is about 19 dB under the mix), so
   Ida proves only that the change does not break a kick-only track. A
   recording with hats ON the beat is untested, and there the hats-on-the-
   offbeat term would pull the wrong way. Without that term the floor is 88%.
2. **Ida's beats land a median 37 to 38 ms after its kick** (11 ms on Raadio 2,
   16 on Raadio 4), before and after the change. INFERRED: a slow attack kick
   and the 10 Hz follower. Inside the 1/8 beat window, but possibly audible as
   the click just behind the kick.
3. **Browser clock offsets** (ScriptProcessor's `playbackTime`, `outputLatency`,
   the analyser against `currentTime`) are UNTESTED. They would be fixed
   offsets of milliseconds, never half a beat.
4. **Chrome and Safari decoding Ida's ADTS AAC** is UNTESTED.
5. **CPU in a browser and on a phone** is UNTESTED; the numbers are Node.
6. **Bars and downbeats** were not attempted.

## 6. Next, in priority order

1. **Listen** to all three stations with the mix knob up and say whether the
   click sits on the kick. That is the test the offline numbers stand in for.
2. **A fourth recording with a steady kick and hats on the beat** (rock or
   straight eighths), captured once through `positron-shout` into R2, to test
   item 5.1. If the hats term pulls wrong there, make `HAT_BETA` depend on
   which side of the beat the hats fold to, measured live.
3. **Per-band onset latency**: shift each band's rises by its measured delay to
   the kick (Ida's 37 ms), or take the beat time from the low band's peak
   rather than its rise. Measure on Ida first.
4. **Optional, from the research:** draw and book beats 11 ms earlier, only
   after item 5.3 is measured in a browser.
5. **Optional:** the comb resonator bank for tempo. 97% within 1% against 93%,
   finds a new song 3.5 s sooner, half the CPU (2.1 against 4.0 ms/s), but a
   new confidence and a rewrite of a tempo step that already reads right.

## 7. Refused, with the reason

- **The DP beat tracker and a phase lock loop**: measured worse than the pulse
  train (57% and 77% on).
- **Phase from the kick band alone**: the sub band carries the offbeat bass
  (fold 0.13 to 0.85), so 44 to 63% on.
- **A 20 s tempo window**: tempo within 1% falls to 88% and a new song takes
  41 s to find.
- **Hysteresis on the phase**: 92% against 96%.
