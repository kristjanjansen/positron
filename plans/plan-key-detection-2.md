# Key detection, second pass: a better reference, the band, and single note autoplay

Status (2026-10-14): open. The recommended band top of 1 kHz is not applied, since the KEY CORE block in demo/radio/key/index.html still defaults to hi 2000, and BACKLOG.md marks it waiting on the owner's listen; autoplay went the chroma chord way instead (commit 049aacde).

Written 2026-10-13. Asked, about https://positron.studio/concepts/radio/040/
(Live key): *"it feels repeating same chords all the time"*, then *"do research
for better key detection. perhaps single note mode as default?"*. The owner has
since chosen chords picked by the live chroma with voice leading ("1 + 2") for
autoplay, and another agent is building that in `demo/concepts/radio/040/`.
**Nothing on any page was changed by this work.** The first pass is
`plans/plan-key-detection.md` (2026-10-11), the tooling and the first soft
truth are `research/tempo-key-eval-2026-10-12.md`.

| mark | means |
| --- | --- |
| **MEASURED** | run offline on this laptop on 2026-10-13 |
| **READ** | from a paper or a library's source |
| **INFERRED** | drawn from measurements, not measured itself |
| **UNTESTED** | nobody has run it in a browser or listened to it |

## Verdict

1. **The reference is better now: five independent front ends, twelve
   readers.** Beside essentia's HPCP (five profiles) and librosa's constant Q
   chroma (two), three new ones ran, all from wheels or source with nothing
   compiled: **madmom's genre agnostic key CNN** (Korzeniowski and Widmer 2018),
   **madmom's deep chroma** network, and **Spotify's basic-pitch** note
   transcription. A mark has a soft truth when 3 of the 5 front ends name the
   same key. They do on **62% of the 440 marks**, all five on only 13%
   (MEASURED). The reference tools disagree with each other a lot, which is
   itself the main finding about these recordings.
2. **The page scores 0.70 MIREX against that truth (60% exact).** Its worst
   recording is Ida 1314 (0.54, mostly a fifth off).
3. **One number buys most of what is available: the band top from 2 kHz to
   1 kHz.** Pooled MIREX 0.70 to **0.79**, exact 60% to 71%, against the stricter
   4 of 5 truth 0.83 to **0.91**, no recording worse, under every one of the five
   leave-one-front-end-out truths it gains (+0.04 to +0.14), and it halves the
   CPU (43 to 22 µs per hop). The cost: transposition consistency drops (Raadio
   2 / Raadio 4 / Ida 77 / 100 / 100% to 69 / 96 / 83%) and key changes go from
   0.59 to 0.74 a minute (MEASURED).
4. **A second, optional step: an adaptive memory** that forgets at 6 s instead
   of 30 s while the last 6 s disagree with the long memory (correlation under
   0.6). On top of 1 kHz: 0.79 to **0.81**, 4 of 5 truth 0.95, no recording
   worse, 0.99 key changes a minute, Raadio 4 shift consistency 96 to 86%.
5. **edma, the profile the 2026-10-12 plan recommended, fails the rule here:**
   pooled 0.70 to 0.80 but Ida 1354 (the DJ mix) 0.73 to **0.59**, and on top of
   1 kHz it is worse everywhere but Raadio 4. Not recommended any more.
6. **The relative major or minor is not the main error on the radio.** Against
   this truth the page's errors are fifths (16%) and "other" (19%), relative
   only 5%. Bass led relative decisions were tried again and refused (Raadio 2
   0.85 to 0.50).
7. **Autoplay default: a single note that follows the radio, decided on bar
   lines.** Of five behaviours rendered over three recordings, it sits in the
   bottom half of what the radio is sounding 7 to 9% of the time, against 19 to
   32% for the old loop and 9 to 19% for a chroma chosen voiced chord, at 13 to
   21 note starts a minute. Chords stay, as the second mode. Section 6.

## 1. The soft truth, and how often the references agree (MEASURED)

**Recordings**, all OURS in R2, decoded on 2026-10-12 and reused from that
session's scratchpad: Raadio 2 and Raadio 4 of 2026-10-11 (183 s each, already
in our bucket), Ida 2026-10-11 (190 s) and the three Ida takes of 2026-10-12
(600 to 610 s). Nothing was opened to ERR or any station.

**Windows.** Every reader reads the 30 s before each 5 s mark, from 30 s on:
440 marks. The page is read at the same mark, its last reading at or before it.
⚠️ The page's memory is an exponential decay with a 30 s time constant, whose
mean age is 30 s; a 30 s rectangle's is 15 s. So the page lags the reference by
design, and every number below carries that lag (section 7).

**The readers (12) and front ends (5):**

| front end | readers | what it is |
| --- | --- | --- |
| hpcp | ess_edma, ess_bgate, ess_krumhansl, ess_temperley, ess_shaath | essentia KeyExtractor (HPCP chroma), five profiles; from ref.py of 2026-10-12 |
| cqt | lib_kk, lib_albrecht | librosa constant Q chroma correlated with two profiles; from ref.py |
| cnn | madmom_cnn | Korzeniowski and Widmer's AllConv key CNN, madmom 0.16.1's 5 network ensemble, on the window's slice of its own spectrogram (NEW) |
| deep | dc_kk, dc_albrecht | madmom DeepChromaProcessor (Korzeniowski and Widmer 2016), summed, correlated with two profiles (NEW) |
| notes | bp_temperley, bp_albrecht | basic-pitch (Bittner et al. 2022) through its ONNX model, notes weighted by duration times amplitude, two profiles (NEW) |

Each front end votes the key most of its readers name (a tie abstains), so
essentia's five readers are one vote, not five. **Soft truth = 3 of 5 front
ends.** The page's own front end (FFT peaks) is in none of them, and its
Temperley profile is shared with two of twelve readers.

**Positive control first**, because madmom had to be imported without its
compiled parts: synthetic C major, D major and A minor cadences. madmom_cnn and
basic-pitch read all three right at once. **Deep chroma read A major, B major
and F# minor: exactly a minor third off, every time,** because the first
version assumed madmom's bins start at A. They start at C. Fixed and re-run:
all five readers right on all three.

**How often a truth exists:**

| recording | marks | 3 of 5 agree | 4 of 5 | all 5 |
| --- | --- | --- | --- | --- |
| Raadio 2 | 31 | 42% | 26% | 0% |
| Raadio 4 | 31 | 81% | 35% | 29% |
| Ida 10-11 | 32 | 88% | 50% | 13% |
| Ida 1314 | 114 | 63% | 31% | 24% |
| Ida 1354 | 116 | 45% | 12% | 2% |
| Ida 1434 | 116 | 72% | 28% | 14% |
| **pooled** | **440** | **62%** | **27%** | **13%** |

**Front ends against each other**, exact (MIREX) where both vote:

| | hpcp | cqt | cnn | deep | notes |
| --- | --- | --- | --- | --- | --- |
| hpcp | | 64% (0.73) | 56% (0.68) | 81% (0.87) | 49% (0.63) |
| cqt | 64% (0.73) | | 44% (0.58) | 57% (0.66) | 62% (0.73) |
| cnn | 56% (0.68) | 44% (0.58) | | 60% (0.70) | 45% (0.59) |
| deep | 81% (0.87) | 57% (0.66) | 60% (0.70) | | 44% (0.58) |
| notes | 49% (0.63) | 62% (0.73) | 45% (0.59) | 44% (0.58) | |

**Each reader against a truth that leaves its own front end out** (3 of the
other 4):

| reader | marks | exact | fifth | relative | parallel | other | MIREX |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ess_edma | 128 | 89% | 4% | 2% | 1% | 4% | 0.92 |
| ess_bgate | 128 | 93% | 3% | 2% | 1% | 2% | 0.95 |
| ess_krumhansl | 128 | 82% | 5% | 2% | 1% | 10% | 0.85 |
| ess_temperley | 128 | 69% | 5% | 17% | 1% | 8% | 0.77 |
| ess_shaath | 128 | 91% | 4% | 3% | 1% | 2% | 0.94 |
| lib_kk | 221 | 63% | 14% | 2% | 8% | 12% | 0.73 |
| lib_albrecht | 221 | 62% | 17% | 4% | 5% | 12% | 0.73 |
| madmom_cnn | 164 | 66% | 13% | 8% | 2% | 11% | 0.75 |
| dc_kk | 151 | 63% | 18% | 7% | 5% | 7% | 0.75 |
| dc_albrecht | 151 | 83% | 9% | 1% | 6% | 1% | 0.89 |
| bp_temperley | 233 | 51% | 27% | 3% | 3% | 17% | 0.65 |
| bp_albrecht | 233 | 57% | 24% | 2% | 4% | 13% | 0.70 |

What this says (INFERRED):
- **The CNN, the published state of the art, is only 66% exact here.** Its own
  paper says why (section 2): it is a whole piece classifier and short excerpts
  are where it fails. 30 s of radio is a short excerpt.
- **Essentia's HPCP readers are the most agreeable**, but their leave-one-out
  marks (128) are the ones where the other four front ends agree, the easy ones.
- **Temperley's profile is the weakest profile on both front ends that carry
  it** (ess_temperley 0.77 with 17% relative, bp_temperley 0.65). The page uses
  Temperley, yet section 3 shows that changing the profile is not where the
  page's gain is.
- The soft truth itself changes key 0.43 times a minute over consecutive marks
  that both have one (Raadio 4 1.09, Ida 1354 0.95, Raadio 2 and Ida 10-11 0).

## 2. The literature, short (READ)

- **Pipeline.** Almost every system is chroma (HPCP or constant Q, with
  tuning estimation and some harmonic handling) summed over time and matched to
  24 key profiles (Krumhansl-Kessler, Temperley, Albrecht-Shanahan, Faraldo's
  edma and bgate for electronic music). Gomez's HPCP (PhD, UPF 2006) gives each
  peak to its possible fundamentals; Mauch and Dixon's NNLS chroma (ISMIR 2010)
  explains harmonics away by fitting note templates first. Noland and Sandler
  (AES 122, 2007; CMJ 33(1), 2009) showed the signal processing (band, frame,
  tuning) matters as much as the profile, which is what section 3 finds again.
- **Neural.** Korzeniowski and Widmer's end to end CNN (EUSIPCO 2017) and its
  genre agnostic AllConv successor (ISMIR 2018, https://arxiv.org/abs/1808.05340,
  in madmom). Their Table 2, MIREX weighted score / exact: **GiantSteps 74.6 /
  67.9** (electronic, 604 two minute Beatport excerpts), Billboard 85.1 / 79.9,
  classical 96.6 / 95.2, KeyFinder set 76.1 / 70.0 against bgate's 72.4 / 65.0,
  Isophonics 82.5 / 76.3, Robbie Williams 81.2 / 72.4, Rock 74.3 / 69.3. Its
  remaining errors on GiantSteps: fifth 7.0, relative 8.1, parallel 4.1, other
  12.9 (percent). And its own warning: **on the Rock set the median length of
  wrongly classified segments is 51 s against 131 s for right ones**, *"to
  recognise key modulations, classifying short excerpts individually will reach
  a glass ceiling"*.
- **So the ceiling on popular and electronic music is about 0.75 to 0.85
  MIREX** for whole tracks with human labels, and lower on short windows. Our
  0.70 to 0.81 against a soft truth is not comparable to those numbers, only to
  each other.
- **Modulation and segments.** Key over time is done with an HMM over keys
  (Noland and Sandler, the QM Vamp key detector) or jointly with chords; a live
  detector does the same with a memory length and hysteresis, which is what the
  page's decay and stickiness are, and what the adaptive memory in section 3
  extends.
- **Tonic and mode.** The relative pair shares its notes, so systems use a mode
  prior (Bernardes et al., ICASSP 2017, adaptive mode bias), the bass, or the
  cadence. On these recordings relative errors are rare (section 3), so this
  is not where the effort should go now.
- **What fits a 0.1% CPU tab detector:** band and fade, profile, harmonic step,
  memory policy, all linear in the bins of one FFT per 0.1 s. Deep chroma is
  the one learned part that comes close: an MLP of 538,124 weights on a
  log-filtered spectrogram at 10 frames a second is about 5.4 M multiply adds a
  second (ESTIMATED from the model file; about 1% of a core in plain JS at 10
  fps, near 0.1% at 1 fps, which is plenty for a key). The key CNN (663,585
  weights in each of 5 networks, convolutional) is heavier, ran 1.4 s per 30 s
  window in Python here, and is 66% exact on our windows anyway. ⚠️ madmom's
  model files are licensed CC BY-NC-SA, as I remember it; a footnote for R&D.

## 3. The page and every candidate against the soft truth (MEASURED)

The detector under test is the page's own `KEY CORE` block. A copy with extra
options (`research/tools/tempo-key/key2/cand-core.js`) gives byte identical
readings with no options, checked on all six recordings. The AnalyserNode is
re-implemented as before (32768 points, Blackman, every 0.1 s, a reading every
0.5 s) and its spectra cached so a candidate runs in seconds.

**The rule**, from the tempo work: keep a change only if the pooled score rises
and no recording falls by more than a point (0.01 MIREX). Pooled is the mean
over every scored mark, so the 10 minute Ida takes weigh more.

Columns: pooled MIREX against 3 of 5; the same against the stricter 4 of 5;
exact, fifth and relative shares; MIREX per recording (Raadio 2, Raadio 4, Ida
10-11, Ida 1314, Ida 1354, Ida 1434; scored marks 13, 25, 28, 72, 52, 84);
the worst drop against the row's base in points; key changes a minute.

**From the page:**

| candidate | pooled | 4 of 5 | exact | fifth | rel | R2 | R4 | Ida | 1314 | 1354 | 1434 | worst | ch/min | rule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **page** (Temperley, 55 Hz to 2 kHz, 1 octave fades) | 0.70 | 0.83 | 60% | 16% | 5% | 0.85 | 0.68 | 0.95 | 0.54 | 0.73 | 0.72 | | 0.59 | |
| edma | 0.80 | 0.85 | 75% | 7% | 3% | 0.87 | 0.88 | 0.96 | 0.79 | **0.59** | 0.86 | -15 | 1.36 | no |
| bgate | 0.74 | 0.78 | 69% | 8% | 3% | 0.92 | 0.86 | 0.80 | 0.74 | 0.51 | 0.80 | -22 | 1.48 | no |
| kk | 0.73 | 0.83 | 68% | 6% | 7% | 0.85 | 0.86 | 0.89 | 0.64 | 0.67 | 0.74 | -7 | 0.96 | no |
| shaath | 0.69 | 0.79 | 59% | 12% | 12% | 0.38 | 0.78 | 0.85 | 0.69 | 0.61 | 0.72 | -46 | 1.14 | no |
| albrecht | 0.74 | 0.82 | 70% | 7% | 2% | 0.85 | 0.70 | 0.95 | 0.76 | 0.65 | 0.72 | -9 | 0.99 | no |
| temperley+edma (mean) | 0.74 | 0.83 | 68% | 8% | 3% | 0.85 | 0.70 | 0.95 | 0.69 | 0.72 | 0.71 | -2 | 0.91 | no |
| kk+edma (mean) | 0.76 | 0.83 | 70% | 8% | 5% | 0.79 | 0.88 | 0.95 | 0.67 | 0.59 | 0.83 | -14 | 1.24 | no |
| minor bias +0.03 | 0.69 | 0.81 | 59% | 15% | 7% | 0.85 | 0.68 | 0.95 | 0.52 | 0.72 | 0.71 | -2 | 0.63 | no |
| minor bias -0.03 | 0.71 | 0.83 | 61% | 16% | 5% | 0.85 | 0.68 | 0.95 | 0.54 | 0.77 | 0.72 | 0 | 0.61 | yes |
| bass decides the relative, 0.3 | 0.70 | 0.82 | 60% | 16% | 5% | 0.85 | 0.68 | 0.95 | 0.54 | 0.73 | 0.71 | -1 | 0.58 | no |
| bass decides the relative, 1 | 0.69 | 0.79 | 57% | 19% | 9% | 0.31 | 0.68 | 0.95 | 0.66 | 0.70 | 0.70 | -54 | 0.65 | no |
| log compressed chroma, 3 | 0.69 | 0.81 | 59% | 17% | 6% | 0.85 | 0.68 | 0.95 | 0.54 | 0.70 | 0.71 | -4 | 0.59 | no |
| log compressed chroma, 20 | 0.69 | 0.81 | 58% | 16% | 7% | 0.85 | 0.68 | 0.95 | 0.54 | 0.67 | 0.71 | -6 | 0.59 | no |
| cos² kernel (HPCP style) | 0.70 | 0.83 | 61% | 16% | 5% | 0.85 | 0.68 | 0.95 | 0.54 | 0.75 | 0.72 | 0 | 0.59 | yes |
| peak weight squared | 0.75 | 0.87 | 65% | 19% | 2% | 0.85 | 0.68 | 0.95 | 0.71 | 0.77 | 0.71 | -1 | 0.65 | yes |
| peak weight square root | 0.70 | 0.81 | 62% | 11% | 8% | 0.85 | 0.68 | 0.95 | 0.52 | 0.73 | 0.74 | -2 | 0.61 | no |
| decay 20 s | 0.72 | 0.85 | 63% | 15% | 4% | 0.92 | 0.69 | 0.95 | 0.52 | 0.81 | 0.75 | -1 | 0.82 | no |
| decay 45 s | 0.67 | 0.76 | 56% | 17% | 7% | 0.85 | 0.68 | 0.95 | 0.52 | 0.61 | 0.71 | -12 | 0.57 | no |
| stickiness 0.1 | 0.69 | 0.81 | 59% | 16% | 7% | 0.85 | 0.68 | 0.95 | 0.54 | 0.67 | 0.72 | -6 | 0.56 | no |
| floor 30 dB | 0.71 | 0.84 | 62% | 17% | 5% | 0.85 | 0.68 | 0.95 | 0.61 | 0.73 | 0.70 | -2 | 0.63 | no |
| floor 45 dB | 0.70 | 0.81 | 62% | 11% | 8% | 0.85 | 0.68 | 0.95 | 0.52 | 0.73 | 0.73 | -2 | 0.68 | no |
| harmonics step off | 0.73 | 0.81 | 67% | 8% | 5% | 0.85 | 0.68 | 0.95 | 0.56 | 0.71 | 0.82 | -3 | 0.82 | no |
| harmonics step 0.4 | 0.72 | 0.83 | 65% | 12% | 5% | 0.85 | 0.68 | 0.95 | 0.53 | 0.74 | 0.80 | -1 | 0.67 | yes |
| harmonics step 0.9 | 0.67 | 0.77 | 55% | 21% | 5% | 0.54 | 0.68 | 0.95 | 0.52 | 0.73 | 0.68 | -31 | 0.91 | no |
| subharmonic (HPCP) 0.2 | 0.67 | 0.78 | 54% | 23% | 5% | 0.46 | 0.68 | 0.95 | 0.52 | 0.76 | 0.68 | -38 | 0.77 | no |
| band bottom 80 Hz | 0.70 | 0.81 | 63% | 10% | 9% | 1.00 | 0.74 | 0.95 | 0.52 | 0.73 | 0.71 | -2 | 0.86 | no |
| band top 700 Hz | 0.74 | 0.88 | 63% | 19% | 5% | 0.85 | 0.68 | 0.96 | 0.80 | 0.68 | 0.65 | -7 | 0.83 | no |
| band top 850 Hz | 0.78 | 0.92 | 70% | 14% | 3% | 0.85 | 0.68 | 0.96 | 0.77 | 0.77 | 0.75 | 0 | 0.82 | yes |
| **band top 1 kHz** | **0.79** | **0.91** | **71%** | 13% | 2% | 0.85 | 0.68 | 0.96 | **0.76** | 0.77 | 0.78 | 0 | 0.74 | **yes** |
| band top 1.2 kHz | 0.76 | 0.87 | 67% | 16% | 2% | 0.85 | 0.68 | 0.95 | 0.73 | 0.74 | 0.74 | 0 | 0.71 | yes |
| band top 1.5 kHz | 0.74 | 0.86 | 64% | 17% | 3% | 0.85 | 0.68 | 0.95 | 0.68 | 0.73 | 0.71 | -1 | 0.59 | no |
| band top 3 kHz | 0.68 | 0.82 | 58% | 16% | 5% | 0.85 | 0.68 | 0.95 | 0.49 | 0.68 | 0.72 | -5 | 0.96 | no |
| 1 kHz with a half octave fade | 0.70 | 0.82 | 59% | 19% | 3% | 0.85 | 0.68 | 0.95 | 0.64 | 0.65 | 0.69 | -8 | 0.74 | no |
| 1 kHz with the bottom at 40 Hz | 0.73 | 0.87 | 63% | 18% | 3% | 0.85 | 0.68 | 0.96 | 0.69 | 0.73 | 0.66 | -6 | 1.15 | no |
| 2 kHz, top fade 2 octaves (500 Hz to 2 kHz) | 0.76 | 0.87 | 67% | 16% | 2% | 0.85 | 0.68 | 0.95 | 0.71 | 0.77 | 0.73 | 0 | 0.61 | yes |
| 2 kHz, top fade 2.5 octaves | 0.76 | 0.88 | 67% | 18% | 2% | 0.85 | 0.68 | 0.95 | 0.73 | 0.79 | 0.72 | 0 | 0.62 | yes |
| 1.4 kHz, top fade 2 octaves | 0.77 | 0.89 | 67% | 17% | 2% | 0.85 | 0.68 | 0.95 | 0.76 | 0.77 | 0.72 | 0 | 0.71 | yes |
| 3 kHz, top fade 3 octaves | 0.74 | 0.86 | 65% | 17% | 2% | 0.85 | 0.68 | 0.95 | 0.66 | 0.77 | 0.73 | 0 | 0.69 | yes |

**From the page with the band top at 1 kHz:**

| candidate | pooled | 4 of 5 | exact | fifth | rel | R2 | R4 | Ida | 1314 | 1354 | 1434 | worst | ch/min | rule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **1 kHz** | 0.79 | 0.91 | 71% | 13% | 2% | 0.85 | 0.68 | 0.96 | 0.76 | 0.77 | 0.78 | | 0.74 | |
| + edma | 0.74 | 0.82 | 67% | 11% | 3% | 0.79 | 0.86 | 0.88 | 0.76 | 0.64 | 0.70 | -13 | 1.41 | no |
| + kk | 0.74 | 0.82 | 67% | 7% | 7% | 0.85 | 0.84 | 0.90 | 0.74 | 0.71 | 0.64 | -14 | 1.37 | no |
| + albrecht | 0.80 | 0.92 | 73% | 11% | 4% | 0.85 | 0.70 | 0.97 | 0.77 | 0.81 | 0.78 | 0 | 1.17 | yes |
| + temperley+edma | 0.79 | 0.92 | 72% | 12% | 4% | 0.85 | 0.70 | 0.96 | 0.77 | 0.74 | 0.80 | -3 | 1.14 | no |
| + bgate | 0.76 | 0.84 | 69% | 11% | 3% | 0.85 | 0.84 | 0.70 | 0.75 | 0.64 | 0.82 | -27 | 1.38 | no |
| + peak weight squared | 0.80 | 0.95 | 72% | 15% | 2% | 0.85 | 0.68 | 0.95 | 0.79 | 0.77 | 0.81 | -2 | 0.59 | no |
| + harmonics 0.4 | 0.79 | 0.90 | 74% | 10% | 2% | 0.85 | 0.68 | 0.95 | 0.73 | 0.77 | 0.83 | -3 | 0.72 | no |
| + harmonics off | 0.77 | 0.88 | 72% | 7% | 3% | 0.85 | 0.70 | 0.95 | 0.69 | 0.73 | 0.81 | -7 | 0.89 | no |
| + minor bias -0.03 | 0.79 | 0.92 | 71% | 13% | 2% | 0.85 | 0.68 | 0.96 | 0.73 | 0.79 | 0.79 | -3 | 0.85 | no |
| + cos² kernel | 0.77 | 0.89 | 68% | 16% | 2% | 0.85 | 0.68 | 0.96 | 0.76 | 0.75 | 0.73 | -5 | 0.82 | no |
| + decay 20 s | 0.81 | 0.93 | 73% | 14% | 2% | 0.88 | 0.68 | 0.96 | 0.72 | 0.85 | 0.83 | -4 | 1.30 | no |
| + floor 30 dB | 0.79 | 0.93 | 71% | 15% | 2% | 0.85 | 0.68 | 0.95 | 0.79 | 0.79 | 0.77 | -2 | 0.71 | no |
| + stickiness 0.03 | 0.79 | 0.91 | 71% | 14% | 2% | 0.85 | 0.68 | 0.96 | 0.73 | 0.81 | 0.78 | -3 | 0.96 | no |
| + bass decides the relative 0.3 | 0.78 | 0.90 | 71% | 14% | 2% | 0.85 | 0.68 | 0.96 | 0.77 | 0.74 | 0.78 | -3 | 0.81 | no |
| + adaptive memory 6 s / 0.5 / 8 s | 0.80 | 0.93 | 73% | 13% | 2% | 0.85 | 0.68 | 0.96 | 0.76 | 0.77 | 0.82 | 0 | 0.81 | yes |
| + adaptive memory 6 s / 0.7 / 10 s | 0.81 | 0.93 | 73% | 13% | 2% | 0.85 | 0.68 | 0.96 | 0.76 | 0.77 | 0.84 | 0 | 0.99 | yes |
| **+ adaptive memory 6 s / 0.6 / 6 s** | **0.81** | **0.95** | 74% | 12% | 3% | 0.85 | 0.68 | 0.96 | 0.76 | 0.79 | 0.84 | 0 | 0.99 | **yes** |
| + adaptive memory 10 s / 0.6 / 10 s | 0.79 | 0.92 | 72% | 13% | 2% | 0.85 | 0.68 | 0.96 | 0.76 | 0.77 | 0.79 | 0 | 0.76 | yes |
| + adaptive memory 6 s / 0.8 / 12 s | 0.81 | 0.95 | 73% | 13% | 3% | 0.85 | 0.68 | 0.96 | 0.75 | 0.81 | 0.84 | -1 | 1.09 | no |

Nothing stacked on 1 kHz plus the adaptive memory passed the rule (albrecht,
squared weights, floor 30, harmonics 0.4, stickiness 0.08, decay 40, 850 Hz,
1.2 kHz, edma, kk: each lost 3 to 21 points on some recording).

**The adaptive memory**, as built in `cand-core.js`: beside the 30 s sum keep a
6 s one; each frame, if the Pearson correlation between the two falls under 0.6,
the 30 s sum decays with a 6 s time constant for that frame instead. ⚠️ Its
first version compared them by cosine, which for two all positive chroma
vectors is almost always above 0.9, and it changed nothing on any recording to
the second decimal. That was the tell: an option with zero effect is an option
that never fires.

**Robustness checks:**

| | page | 1 kHz | 1 kHz + adaptive | 2 kHz, 2 octave top fade | edma |
| --- | --- | --- | --- | --- | --- |
| truth without hpcp (128 marks) | 0.78 | 0.89 | 0.94 | 0.84 | 0.82 |
| truth without cqt (221) | 0.73 | 0.82 | 0.84 | 0.78 | 0.81 |
| truth without cnn (164) | 0.75 | 0.84 | 0.88 | 0.82 | 0.82 |
| truth without deep (151) | 0.76 | 0.90 | 0.93 | 0.85 | 0.85 |
| truth without notes (233) | 0.73 | 0.77 | 0.80 | 0.75 | 0.82 |
| shift consistency R2 / R4 / Ida, shifts -3, +2, +5 | 77 / 100 / 100 | 69 / 96 / 83 | 69 / 86 / 82 | 71 / 98 / 96 | 73 / 87 / 86 |
| synthetic, 48 pieces, final / mean after 10 s | 0.82 / 0.82 | 0.82 / 0.82 | 0.82 / 0.82 | 0.82 / 0.82 | 0.82 / 0.82 |
| µs per 0.1 s hop, Node | 43 | 22 | 23 | 43 | 39 |

- **The 1 kHz gain does not come from one reference.** It holds against every
  truth with one front end left out, +0.04 to +0.14.
- **Shift consistency falls**, most on Ida (100 to 83%; per shift 83 / 91 / 75%
  at -3 / +2 / +5). A lower top puts more of the melody in the fade, so a shift
  moves notes across it. The 2 octave top fade keeps it (71 / 98 / 96) and buys
  only +0.06. This is the one real trade in this file.
- **The synthetic set cannot rank anything.** A fresh set of 48 pieces (the
  2026-10-11 generator was in a scratchpad that is gone): every candidate reads
  every major piece and every i iv V7 i piece right and every i VI III VII piece
  as its relative major, 0.82 for all. It shows no candidate breaks clean
  chords; it says nothing more.
- **Raadio 4 is 0.68 for every candidate**, and it is two stretches: at 55 to
  90 s four of five front ends say B major (the fifth above E) where the page
  holds E major, and from 140 s the references say Eb minor while the page
  holds E major with low confidence. That last minute is the drumless outro
  the tempo research found; with a short memory the page reads Ab minor, F#
  minor, Eb major there, so it hears no settled key either.
- **The bass does not settle the relative.** Bass led decisions cost Raadio 2
  35 to 54 points and, on the synthetic set, moved no i VI III VII piece and
  broke four major ones.

## 4. Recommendation for the detector

1. **Set the band top to 1 kHz** (`hi: 1000`, the 1 octave fade unchanged, so
   peaks fade out over 500 Hz to 1 kHz). One constant. +0.09 pooled MIREX, +0.08
   against the 4 of 5 truth, every recording equal or better, half the CPU. Its
   price is transposition consistency, so the page's comment block (which
   quotes the 2026-10-11 shift numbers) has to be rewritten in the same commit
   with this file's numbers.
   If the shift price is judged too high, the fallback is the 2 octave top fade
   at 2 kHz: +0.06, shift almost kept, same CPU.
2. **Optionally, the adaptive memory** (6 s / 0.6 / 6 s): +0.02 more, the
   reading follows a new song sooner, 0.99 key changes a minute against the
   truth's own 0.43 over consecutive marks. Worth it if the owner hears the key
   lagging songs; not worth it if the key already moves too often by ear.
3. **Do not switch to edma.** That recommendation (plan-tempo-key-improve.md
   item 3) is withdrawn: against the wider truth it costs Ida 1354 14 points.
4. **Do not chase the relative key now.** 5% of marks.
5. **The next bigger step, if wanted, is deep chroma** in place of the peak
   chroma: as a reader it is 0.89 against its leave-own-out truth, about where
   the tuned page is (0.93 on the same marks), so it would be a replacement of
   similar accuracy and a new dependency. Not recommended before listening.

## 5. Costs

- Item 1: one number in the page plus its comment. CPU falls.
- Item 2: about 12 lines in `keyDecay`, one more 12 bin array, CPU unchanged
  (23 µs).
- Measuring: the tooling below runs every candidate on all six recordings in
  about 20 s.

## 6. Autoplay: single note mode against chords (MEASURED offline, UNTESTED by ear)

**What "single note mode" could mean**, and why it may sound better: a chord is
three notes asserting a harmony, so when the radio is on a different chord all
three can rub; a single note in the key is one note, and if it is a note the
radio is sounding it reinforces rather than contradicts. The confidence already
sets the level, so a single note also fades with doubt. The owner's complaint
is repetition, which a single note that follows the radio answers too, because
it moves when the music does rather than on a 4 s clock.

**Rendered**, each over three recordings, with the page's own detector and
confidence to level mapping (silent at 0.05, full at 0.35, eased 3 s), a pad
stand in (two detuned saws, one pole lowpass at 1.2 kHz, 0.5 s in, 1 s out),
the radio at half scale under it, bar lines from the tempo the 2026-10-12
research measured (Ida 1314 99.3, Raadio 2 127.1, Ida 1354 107.5 bpm):

| id | behaviour |
| --- | --- |
| 0 | the old loop: I vi IV V, 4 s each, root position |
| 1 | drone: the tonic, its fifth quieter, struck again only when the key changes |
| 2 | scale walk: the key's notes one at a time, a note every 2 beats, a step of 1 or 2 degrees toward the pitch class the radio sounds most |
| 3 | follower: on every beat, the in-key pitch class the radio sounded most in the last 0.5 s, held while it stays strongest, in the octave nearest the last note |
| 3b | the same follower, deciding only on bar lines over the last bar's chroma |
| 4 | chords chosen by the chroma, voice led, on bar lines: the diatonic triad the last bar sounded most (root 1, third 0.8, fifth 0.6), kept unless another wins by 10%, each voice moved to the nearest chord tone, plus a bass on the root. ⚠️ My approximation of what the owner chose, not the other agent's code |

**What they measure**: note starts a minute; the mean share of the radio's
half second chroma held by the sounding notes (uniform is 8.3%); and **"weak"**,
the share of sounding note time whose pitch class is in the bottom half of the
radio's 12 at that moment (a clash proxy). ⚠️ Behaviours 2, 3 and 3b choose
from that same chroma, so their low "weak" is partly by construction; it is
still the quantity a listener would hear as "in" or "against".

| recording, 90 s | behaviour | starts/min | share | weak |
| --- | --- | --- | --- | --- |
| Ida 1314 60 to 150 s | 0 old loop | 15 | 9.0% | 32% |
| | 1 drone | 1 | 9.7% | 21% |
| | 2 scale walk | 50 | 10.4% | 9% |
| | 3 follower | 42 | 12.1% | 2% |
| | 3b follower, bars | 17 | 10.6% | 7% |
| | 4 chroma chords | 25 | 9.9% | 19% |
| Raadio 2 120 to 183 s | 0 old loop | 15 | 11.7% | 19% |
| | 1 drone | 1 | 13.3% | 12% |
| | 2 scale walk | 64 | 15.6% | 1% |
| | 3 follower | 45 | 17.9% | 0% |
| | 3b follower, bars | 21 | 15.0% | 9% |
| | 4 chroma chords | 32 | 12.7% | 9% |
| Ida 1354 200 to 290 s | 0 old loop | 15 | 9.9% | 28% |
| | 1 drone | 3 | 11.1% | 15% |
| | 2 scale walk | 54 | 12.3% | 7% |
| | 3 follower | 47 | 14.6% | 1% |
| | 3b follower, bars | 13 | 12.7% | 7% |
| | 4 chroma chords | 27 | 11.3% | 13% |

**The WAVs**, 16 bit mono, in this session's scratchpad
`/private/tmp/claude-501/-Users-s32863-personal-positron/e0ccd797-f07c-41de-abae-fda074f2551f/scratchpad/kd2/wav/`,
named `<recording>-<start>-<id>.wav`, for example
`ida1314-60-3b-follower-bars.wav` and `ida1314-60-4-chroma-chords.wav`. Nobody
has listened to them; the table is a proxy, the ears decide.

**Recommendation for autoplay's default: 3b, one note following the radio,
decided on bar lines**, with the chroma chosen voiced chords (the owner's 1 + 2)
as the second mode. Reasons:
1. It answers "the same chords all the time" directly: what it plays is what
   the radio is doing this bar, not a cycle.
2. It is the least likely to sound against the radio short of the per beat
   follower: weak 7 to 9% against 9 to 19% for chords and 19 to 32% for the old
   loop.
3. A wrong single note is one rub; a wrong chord is three.
4. It is calm: 13 to 21 starts a minute, close to the chords' 25 to 32, where
   the per beat follower (42 to 47) and the scale walk (50 to 64) are busy
   enough to read as a second melody competing with the radio's.
5. The drone (1) is the safe fallback for a page with no tempo or a stretch
   with no beat: it never moves except when the key does, and 12 to 21% weak is
   its pedal against the radio's changing chords, which is the usual sound of
   a pedal.
The chord mode keeps its place for the owner's own reason: it is a fuller sound,
and voice leading plus bar lines already removes most of what the old loop did
wrong.

**What both need from the page:** bar lines. Live key has no tempo detector of
its own; `demo/concepts/radio/tempo.mjs` is the shared one (about 0.35% CPU per
the 2026-10-12 research). Without it, a fixed 2 s or 4 s decision clock works
for 3b and the drone, at the cost of not landing on the downbeat.

## 7. What could not be settled

- **No human labels, still.** Every "right" is tools agreeing, and the tools
  agree with each other only 44 to 81% of the time at front end level. The
  numbers rank candidates; they do not say how often the page is right by ear.
- **The window mismatch.** The references read 30 s rectangles; the page a 30 s
  exponential. Part of the 1 kHz gain or the adaptive memory's could be the
  page catching up with a faster reference rather than hearing better; the
  leave-one-out table makes a pure artefact unlikely, not impossible.
- **Shift consistency against soft truth.** The two metrics pull apart for the
  band top. Which matters more is a listening question.
- **The synthetic set is too easy to rank anything.**
- **madmom ran from source with stubs**, its three Cython modules replaced and
  numpy and collections aliases restored; the positive control passed, the
  library's own test suite was not run.
- **The essentia profile values** in the candidate core are the ones read
  through a summariser on 2026-10-12, still not byte checked against
  `key.cpp`.
- **The autoplay renders are a stand in voice, offline.** The page's pad, its
  room and its levels are not reproduced, and nobody has listened.
- **Raadio 4's last minute and Raadio 2's middle** (42% truth coverage) are
  ambiguous for every reader here.

## 8. Tooling (all nothing compiled)

- `research/tools/tempo-key/ref-key2.py`: the three new front ends per window.
  madmom 0.16.1 is imported from its PyPI source in
  `~/.cache/positron-tools/src/` through `~/.cache/positron-tools/madmom-shim/load.py`
  (Cython modules stubbed, `pkg_resources` stubbed, numpy 2 and
  `collections` aliases); basic-pitch 0.4.0 installed `--no-deps` into
  `~/.cache/positron-tools/venv` with `pretty_midi`, `mir_eval`, `resampy`,
  `mido`, run on onnxruntime 1.31.
- `research/tools/tempo-key/key2/`: `spectra.mjs` (cache the analyser
  spectra), `cand-core.js` (the page's block plus options), `run.mjs`,
  `truth.mjs` (readers, front ends, scoring), `agree.mjs` (section 1),
  `cands.mjs` (section 3 tables, the rule in the last column), `shift.mjs`,
  `syn-gen.py` and `syn.mjs` (synthetic set), `render.mjs` (section 6 WAVs and
  measures). They read `TK` (decoded recordings and ref.py output) and `KD2`
  (caches, results, WAVs) from the environment.
