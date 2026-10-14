# Key detection on /concepts/radio/040/, what the literature says and what was measured

Status (2026-10-14): done. The edge fade, 35 dB floor, 30 s decay and 0.05 stickiness are in the KEY CORE block of demo/radio/key/index.html (commit 1d3215ae), live at https://positron.studio/radio/key/.

Written 2026-10-11, asked *"improve in bg key detectiom. do more measurement.
read about aliritms"*. The page is `demo/concepts/radio/040/index.html`, live at
https://positron.studio/concepts/radio/040/. The detector is the block between
`// KEY CORE BEGIN` and `// KEY CORE END`; the comment above it carries the
short version of this file.

| mark | means |
| --- | --- |
| **MEASURED** | run offline in Node on the page's own block, 2026-10-11 |
| **READ** | from a paper or a library's source, not run here |
| **INFERRED** | drawn from measurements, not measured itself |
| **UNTESTED** | nobody has run it in a browser or listened for it |

## Verdict

**The block was changed, because one candidate beat the old detector on every
number measured.** Three parameters and one new step:

| | before | after |
| --- | --- | --- |
| band edges | hard cut at 55 Hz and 2 kHz | same band, every peak's weight faded in over 55 to 110 Hz and out over 1 to 2 kHz (raised cosine, `taper: 1` octave) |
| floor | 50 dB under the loudest peak | 35 dB |
| decay of the sum | 20 s | 30 s |
| stickiness | 0.02 | 0.05 |
| profiles, harmonics step, tuning, confidence, event shape | unchanged | unchanged |

What it bought (**MEASURED**):

| | before | after |
| --- | --- | --- |
| MIREX score, 48 synthetic pieces | 0.73 | 0.78 |
| MIREX score, 24 held out synthetic pieces | 0.56 | 0.65 |
| pieces read a fifth off, or worse than relative | 5 of 48 | 0 of 48 |
| shifted synthetic pieces that move by exactly the shift | 87% | 93% |
| shifted recordings that move by exactly the shift, Raadio 2 / Raadio 4 / Ida | 35% / 63% / 72% | 82% / 99% / 98% |
| key changes after the first 15 s, Raadio 2 / Raadio 4 / Ida (about 2.8 min each) | 2 / 1 / 2 | 2 / 0 / 0 |
| first answer that then holds 15 s, per recording | 3 / 3 / 4 s | 3 / 3 / 4 s |
| synthetic: mean time from which the reading stays right | 7.7 s | 5.4 s |
| CPU per 0.1 s hop in Node (keyFrame plus keyRead) | about 37 µs | about 29 µs |

The edge fade alone did most of it. The other three numbers bought the steadiness
the fade on its own lost (fade alone: 10 / 3 / 2 key changes).

**Temperley's profiles stay.** Albrecht-Shanahan, Shaath and Krumhansl-Kessler
each scored a little higher on the synthetic set (up to +0.05) and each was less
steady or less shift-consistent on the radio, and the synthetic set is too small
for 0.05 to mean much (one piece is 0.02).

**The relative major or minor is still the main error and nothing here fixes
it.** Every remaining synthetic mistake is a minor piece read as its relative
major. See section 5.

## 1. What the literature says (READ)

**Profile matching is the classic method and still the baseline.** Krumhansl and
Schmuckler correlate a 12 bin pitch class histogram with a key profile rotated to
each of the 24 keys; the profiles came from probe tone experiments (Krumhansl and
Kessler 1982). Temperley replaced them with counts from a corpus (Kostka-Payne
excerpts, the version on this page is his MIREX 2005 set) and Albrecht and
Shanahan trained theirs on a large corpus to fix the minor mode, which the
earlier profiles under-detect. Their published numbers were checked against
Shanahan's own code:
https://github.com/shanahdt/huji_summer_class_2026/blob/main/utils/keyfinding.py
(paper: *The Use of Large Corpora to Train a New Type of Key-Finding Algorithm:
An Improved Treatment of the Minor Mode*, Music Perception 31(1), 2013,
https://doi.org/10.1525/mp.2013.31.1.59). The profile table used here was taken
from Essentia's source, which carries Krumhansl, Temperley (1999 and MIREX
2005), Shaath, Noland, Gomez, edma, edmm, braw and bgate side by side:
https://github.com/MTG/essentia/blob/master/src/algorithms/tonal/key.cpp and
https://essentia.upf.edu/reference/std_Key.html.

**Audio adds the problem symbolic key finding does not have: harmonics.** A
note's third harmonic lands a twelfth up, which folds to a fifth, so a raw
chromagram leans a fifth sharp. Three published answers:
- Gomez's HPCP (PhD, UPF 2006) can give each spectral peak to the pitch
  classes of its possible fundamentals as well as its own (Essentia's `HPCP`
  `harmonics` parameter), and Essentia's `Key` builds the profile out of the I,
  IV and V triads with 4 harmonics each, decaying with a slope of 0.6
  (`usePolyphony`, `useThreeChords`, `numHarmonics`, `slope`, all on by
  default, READ in its documentation and source).
- Mauch and Dixon's NNLS chroma transcribes approximately first, fitting a
  dictionary of note spectra with harmonics to each frame by non-negative least
  squares, so the harmonics are explained away before folding: *Approximate
  Note Transcription for the Improved Identification of Difficult Chords*, ISMIR
  2010, https://www.eecs.qmul.ac.uk/~simond/pub/2010/Mauch-Dixon-ISMIR-2010.pdf.
- This page's own ad hoc step: a peak 19 or 28 semitones above a louder peak is
  cut by 70%.

**Signal processing choices matter as much as the profile.** Noland and Sandler
measured how frequency range, frame size, tuning and the profile change the
result (*Signal Processing Parameters for Tonality Estimation*, AES 122, 2007,
and *Influences of Signal Processing, Tone Profiles, and Chord Progressions on a
Model for Estimating the Musical Key from Audio*, Computer Music Journal 33(1),
2009); their HMM key tracker is the QM Vamp key detector,
https://vamp-plugins.org/plugin-doc/qm-vamp-plugins.html.

**Electronic and popular music want different profiles.** Faraldo, Gomez, Jorda
and Herrera derived profiles from the median chromagram of electronic dance
tracks (`edma`) and from Beatport (`braw`, and `bgate` with the four weakest
bins zeroed, now Essentia's default). That relative and fifth confusions are
most of what is left in that repertoire is how I remember their result, not
reread today (*Key Estimation in
Electronic Dance Music*, ECIR 2016; thesis *Tonality Estimation in Electronic
Dance Music*, UPF 2017,
https://www.tdx.cat/bitstream/handle/10803/463079/tafp.pdf; code
https://github.com/angelfaraldo/edmkey). ⚠️ The full texts were behind access
walls from here, so their exact numbers are not quoted; what is quoted is
Essentia's documentation and source.

**The relative key is the known hard case.** A major key and its relative minor
share all seven notes, so a histogram only sees which notes are more frequent.
What others use to tell them apart: the bass (the tonic is the most common bass
note), the final chord or cadence, the raised seventh that harmonic minor puts in
the dominant chord, and a mode prior. Eerola and Schutz recently measured how
far audio key finders track listeners' sense of major and minor:
https://doi.org/10.1177/03057356251326065 (2025).

**Scoring.** The MIREX audio key detection task scores a correct key 1, a key a
fifth away (same mode) 0.5, the relative 0.3, the parallel 0.2, anything else 0,
averaged over pieces. That is the score used below. Described in, for example,
https://ismir2012.ismir.net/event/papers/247_ISMIR_2012.pdf and
https://apmcleod.github.io/pdf/key-detect-paper.pdf.

## 2. How it was measured (MEASURED)

There is no ground truth for the three radio recordings, so two kinds of test
were built that need none.

**The detector under test is the page's own block.** A Node harness reads the
text between the `KEY CORE` markers out of the HTML and evaluates it. For
candidates, a copy of the block with extra options was written whose defaults
reproduce the page byte for byte: run on all 84 spectra files, the two gave
identical readings. After the change, the page's block was read back out and
compared again against the chosen candidate: identical readings, zero
differences.

**The input is what the AnalyserNode hands the page.** Audio decoded with ffmpeg
to mono 44.1 kHz float (the analyser downmixes too), and every 0.1 s the last
32768 samples, Blackman window, FFT, `20 log10(|X| / N)`, no smoothing, as
`getFloatFrequencyData` defines it with `smoothingTimeConstant = 0`. A frame
every 0.1 s, a reading every 0.5 s, exactly as `keyStart` does. ⚠️ The page
feeds the detector the LEVELLED sound; the harness does not level, which should
not matter because the floor is relative to the loudest peak and every frame is
normalised, but it was not checked.

**(a) Synthetic music of known key.** Rendered in Node from oscillators and noise
only, no samples: 48 pieces of 40 s, two per key, and a held out set of 24 more
with a different random seed. Each piece is a four chord progression looped at
90 to 130 bpm, voiced as an additive piano (14 partials, slight inharmonicity,
partials decaying faster the higher they are), detuned band limited saws, or
both, with a bass on roots and fifths, a melody that lands on chord tones, a
kick, a hat and a snare, all tuned by a random -30 to +30 cents. The
progressions: major I V vi IV, I IV V I, I vi ii V7, I IV I V; minor i iv V7 i
and i VII VI V (harmonic minor dominant) and i VI III VII and i iv VII III
(natural minor throughout). ⚠️ The last two are the relative major's vi IV I V
and vi ii V I started on vi, the same notes chord for chord, so a listener might
call some of them major too; the label is what the progression starts on. The held out set happens to hold
only i VI III VII and i iv VII III in minor, which is why every candidate scores
lower on it.
Measured per candidate: the MIREX score of the last reading (40 s), the mean
MIREX score over every reading after 10 s, the error kinds, and the mean time
from which the reading stays right.

**(b) Transposition consistency on our recordings.** Each R2 recording pitch
shifted by -5 to +6 semitones (`asetrate`, `aresample`, `atempo`; ffmpeg here
has no `rubberband`). A key detector should move by exactly the shift. For each
reading after 15 s, the share where the shifted reading equals the unshifted one
moved by the shift, same mode. This needs no ground truth and finds anything
that is not shift invariant: profile bias, band edges, harmonic handling. Its
own floor was measured the same way on 20 synthetic pieces at -3 and +2 (column
"syn shift"), because the shifting itself smears the sound a little.

**(c) Steadiness** on the unshifted recordings: key changes after 15 s, and the
first reading that then holds for 15 s.

**CPU**: wall time of `keyFrame` plus `keyRead` per 0.1 s hop in Node 25 on this
laptop, with up to ten runs in parallel, so a rough figure. The page has 100 ms
per hop; every candidate uses well under 0.1% of it.

Recordings, OURS, from `https://positron-station.kristjan-jansen.workers.dev/media/`:
`radio/raadio2/2026-10-11.mp3` (183 s), `radio/raadio4/2026-10-11.mp3` (183 s),
`radio/ida/2026-10-11.aac` (190 s). Nothing was fetched from any broadcaster.
The scripts (`synth.mjs`, `spectra.mjs`, `eval.mjs`, `cand-block.js`, the
candidate lists and every result as JSON) are in that session's scratchpad
`key/` folder and are not in the repository.

## 3. Every candidate (MEASURED)

Columns: **A** MIREX score of the final reading, 48 synthetic pieces. **A avg**
the same averaged over every reading after 10 s. **B** final MIREX score on the
24 held out pieces. **kinds** right / fifth / relative / other on A. **lock** mean
seconds from which the reading stays right (pieces that lock). **syn shift**
synthetic transposition consistency (blank: not run for that batch). **radio
shift** transposition consistency in % for Raadio 2 / Raadio 4 / Ida. **changes**
key changes after 15 s, same order. **µs** per hop.

Each row changes the named thing from the old page (first block) or from the new
page (rows starting `new +`).

| candidate | A | A avg | B | kinds | lock | syn shift | radio shift | changes | µs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **old page** (Temperley, 55 Hz to 2 kHz hard, 50 dB, 20 s, 0.02, harmonics 0.7) | 0.73 | 0.73 | 0.56 | 30/2/13/3 | 7.7 | 87% | 35 / 63 / 72 | 2/1/2 | 36.8 |
| **new page** (fade 1 octave, 35 dB, 30 s, 0.05) | 0.78 | 0.78 | 0.65 | 33/0/15/0 | 5.4 | 93% | 82 / 99 / 98 | 2/0/0 | 28.8 |
| prof-kk | 0.80 | 0.82 | 0.65 | 34/0/14/0 | 6.2 |  | 25 / 57 / 74 | 11/1/6 | 41.2 |
| prof-temperley99 | 0.74 | 0.73 | 0.64 | 30/0/18/0 | 4.8 |  | 30 / 71 / 55 | 1/2/8 | 41.6 |
| prof-albrecht | 0.72 | 0.75 | 0.56 | 29/4/12/3 | 10 |  | 39 / 54 / 85 | 6/1/2 | 42.6 |
| prof-shaath | 0.81 | 0.85 | 0.66 | 35/1/12/0 | 9.2 |  | 32 / 52 / 76 | 12/5/4 | 42.8 |
| prof-noland | 0.60 | 0.58 | 0.41 | 20/12/9/7 | 17.6 |  | 55 / 70 / 84 | 2/0/0 | 42.2 |
| prof-edma | 0.74 | 0.79 | 0.48 | 32/2/8/6 | 10 |  | 31 / 51 / 81 | 13/8/2 | 41.6 |
| prof-braw | 0.70 | 0.72 | 0.58 | 27/5/14/2 | 9.2 |  | 42 / 46 / 74 | 5/12/2 | 42.6 |
| prof-bgate | 0.76 | 0.77 | 0.60 | 31/3/13/1 | 9.4 |  | 34 / 42 / 75 | 5/4/2 | 42.2 |
| prof-diatonic | 0.67 | 0.66 | 0.65 | 25/0/23/0 | 5 |  | 16 / 75 / 36 | 1/5/5 | 41.8 |
| harm-0 | 0.75 | 0.76 | 0.60 | 32/2/10/4 | 6.1 |  | 4 / 34 / 55 | 3/1/0 | 29.6 |
| harm-0.4 | 0.77 | 0.76 | 0.64 | 32/0/16/0 | 5.8 |  | 12 / 50 / 63 | 4/1/0 | 41.9 |
| harm-1 | 0.51 | 0.49 | 0.28 | 14/17/6/11 | 16 |  | 67 / 81 / 39 | 6/5/9 | 41.7 |
| band-55-1000 | 0.70 | 0.72 | 0.54 | 28/3/13/4 | 10.7 |  | 22 / 64 / 54 | 4/3/5 | 19.9 |
| band-55-5000 | 0.73 | 0.73 | 0.60 | 30/2/14/2 | 7.8 |  | 30 / 28 / 60 | 3/13/6 | 125.4 |
| band-100-2000 | 0.73 | 0.75 | 0.60 | 30/2/13/3 | 5.2 |  | 32 / 56 / 47 | 4/1/2 | 40.8 |
| band-30-2000 | 0.72 | 0.72 | 0.61 | 31/1/11/5 | 7.2 |  | 37 / 66 / 80 | 2/1/0 | 43.6 |
| band-80-4000 | 0.74 | 0.74 | 0.59 | 31/1/13/3 | 6.2 |  | 18 / 42 / 48 | 2/0/0 | 96.6 |
| tau-5 | 0.69 | 0.70 | 0.51 | 26/6/13/3 | 21.4 |  | 33 / 48 / 59 | 14/18/27 | 41.5 |
| tau-10 | 0.71 | 0.72 | 0.55 | 29/2/14/3 | 12.4 |  | 34 / 53 / 64 | 2/7/9 | 41.7 |
| tau-40 | 0.72 | 0.72 | 0.58 | 31/1/11/5 | 7.3 |  | 36 / 73 / 72 | 2/0/0 | 42 |
| tau-80 | 0.71 | 0.71 | 0.58 | 29/2/13/4 | 5.9 |  | 30 / 76 / 72 | 2/0/0 | 41.4 |
| floor-30 | 0.76 | 0.75 | 0.63 | 32/0/15/1 | 6.9 |  | 29 / 83 / 92 | 5/5/2 | 23.8 |
| floor-40 | 0.76 | 0.75 | 0.59 | 32/0/15/1 | 7 |  | 30 / 72 / 90 | 2/2/2 | 35 |
| floor-60 | 0.65 | 0.64 | 0.47 | 25/6/11/6 | 12.4 |  | 33 / 55 / 46 | 2/1/2 | 46.2 |
| floor-70 | 0.54 | 0.52 | 0.42 | 17/13/7/10 | 14.6 |  | 32 / 49 / 37 | 4/1/3 | 48.3 |
| weight-lin | 0.72 | 0.73 | 0.57 | 29/2/15/2 | 7.1 |  | 37 / 85 / 86 | 7/3/5 | 43.5 |
| weight-pow | 0.73 | 0.73 | 0.57 | 30/2/13/3 | 9.3 |  | 33 / 73 / 74 | 2/3/2 | 42.5 |
| bassW-0.5 | 0.69 | 0.72 | 0.56 | 28/3/12/5 | 6.3 |  | 33 / 58 / 67 | 4/0/2 | 41.4 |
| bassW-2 | 0.73 | 0.73 | 0.59 | 31/1/12/4 | 8.8 |  | 37 / 60 / 54 | 2/3/6 | 41.1 |
| bassW-3 | 0.72 | 0.71 | 0.59 | 31/1/11/5 | 8.6 |  | 35 / 45 / 37 | 4/9/8 | 41.8 |
| tonicBass-0.5 | 0.75 | 0.75 | 0.60 | 32/0/13/3 | 7.2 |  | 35 / 62 / 72 | 2/1/0 | 41.9 |
| tonicBass-1 | 0.76 | 0.77 | 0.63 | 33/0/12/3 | 7.4 |  | 35 / 62 / 71 | 2/1/0 | 41.1 |
| tonicBass-2 | 0.78 | 0.81 | 0.68 | 34/0/11/3 | 6.2 |  | 34 / 58 / 68 | 4/3/0 | 41.4 |
| triad-0.3 | 0.72 | 0.71 | 0.56 | 29/3/13/3 | 8.7 |  | 35 / 63 / 72 | 2/1/2 | 42.5 |
| triad-0.6 | 0.69 | 0.71 | 0.54 | 28/4/11/5 | 8.3 |  | 35 / 62 / 73 | 2/1/2 | 41.4 |
| triad-1 | 0.68 | 0.71 | 0.52 | 27/5/11/5 | 10.7 |  | 36 / 62 / 73 | 2/1/2 | 41.2 |
| stick-0 | 0.71 | 0.72 | 0.57 | 29/2/14/3 | 10.5 |  | 35 / 62 / 71 | 10/3/2 | 41.1 |
| stick-0.05 | 0.71 | 0.72 | 0.59 | 30/2/11/5 | 7 |  | 34 / 65 / 72 | 2/1/0 | 41.2 |
| sub-0.2 | 0.64 | 0.64 | 0.47 | 24/8/9/7 | 16.8 | 72% | 46 / 63 / 70 | 4/6/2 | 39.9 |
| sub-0.36 | 0.57 | 0.54 | 0.42 | 18/13/10/7 | 22.9 | 58% | 51 / 58 / 69 | 10/1/2 | 39.3 |
| sub-0.6 | 0.43 | 0.41 | 0.33 | 6/25/8/9 | 30.4 | 64% | 43 / 58 / 61 | 7/4/4 | 39 |
| sub0h-0.2 | 0.80 | 0.78 | 0.64 | 34/0/14/0 | 6 | 92% | 8 / 43 / 63 | 3/2/0 | 28.3 |
| sub0h-0.36 | 0.80 | 0.79 | 0.65 | 34/0/14/0 | 6 | 93% | 13 / 45 / 66 | 3/1/0 | 28.3 |
| sub0h-0.6 | 0.79 | 0.79 | 0.64 | 34/0/13/1 | 7 | 94% | 23 / 42 / 67 | 4/1/0 | 28.2 |
| profHarm0h-0.3 | 0.80 | 0.79 | 0.65 | 34/0/14/0 | 6.1 | 94% | 13 / 42 / 69 | 3/3/0 | 27.8 |
| profHarm0h-0.5 | 0.74 | 0.76 | 0.63 | 31/0/15/2 | 5.8 | 95% | 28 / 51 / 68 | 2/1/0 | 27.6 |
| profHarm0h-0.7 | 0.65 | 0.68 | 0.47 | 24/6/14/4 | 11.4 | 74% | 34 / 43 / 53 | 2/1/4 | 27.4 |
| profHarm-0.3 | 0.59 | 0.54 | 0.40 | 19/13/9/7 | 23.2 | 56% | 49 / 59 / 72 | 4/1/2 | 38.3 |
| profHarm-0.5 | 0.36 | 0.35 | 0.26 | 2/27/6/13 | 37.3 | 70% | 43 / 54 / 57 | 9/4/5 | 38.3 |
| profHarm0h-kk-0.3 | 0.83 | 0.84 | 0.57 | 38/1/4/5 | 11.2 | 75% | 34 / 35 / 62 | 3/3/5 | 27.6 |
| profHarm0h-kk-0.5 | 0.82 | 0.82 | 0.59 | 36/0/12/0 | 6.7 | 89% | 28 / 40 / 71 | 3/2/4 | 27.7 |
| win-6 | 0.56 | 0.56 | 0.43 | 18/12/9/8 | 11.5 | 37% | 28 / 46 / 47 | 4/3/4 | 154.4 |
| win-12 | 0.60 | 0.59 | 0.45 | 21/10/9/8 | 11.6 | 48% | 34 / 48 / 47 | 2/0/2 | 179.1 |
| win-24 | 0.65 | 0.65 | 0.50 | 25/6/11/6 | 10.4 | 58% | 30 / 53 / 57 | 2/0/3 | 203.7 |
| win30-6 | 0.74 | 0.73 | 0.63 | 31/0/15/2 | 6.3 | 92% | 30 / 59 / 55 | 4/1/2 | 142.9 |
| win30-12 | 0.74 | 0.75 | 0.63 | 31/0/15/2 | 5.3 | 98% | 34 / 63 / 66 | 2/1/0 | 168.9 |
| taper-0.5 | 0.74 | 0.74 | 0.58 | 30/2/15/1 | 6 | 88% | 47 / 73 / 79 | 2/1/0 | 43.2 |
| taper-1 | 0.79 | 0.76 | 0.62 | 33/1/14/0 | 7.6 | 90% | 66 / 87 / 87 | 10/3/2 | 43 |
| taperwide-0.5 | 0.73 | 0.74 | 0.60 | 30/2/14/2 | 6.5 | 87% | 60 / 87 / 96 | 10/1/0 | 93.8 |
| taperwide-1 | 0.74 | 0.75 | 0.60 | 31/1/14/2 | 6.5 | 86% | 64 / 87 / 99 | 15/3/0 | 93 |
| win12-taper1 | 0.67 | 0.71 | 0.53 | 27/5/9/7 | 9.2 | 74% | 59 / 88 / 97 | 13/1/4 | 179.9 |
| win12-taper1-wide | 0.65 | 0.63 | 0.45 | 25/7/9/7 | 10.6 | 60% | 74 / 71 / 88 | 6/8/5 | 545.9 |
| new + f40 | 0.78 | 0.78 | 0.65 | 33/0/15/0 | 5.1 | 93% | 68 / 99 / 97 | 2/0/0 | 34.9 |
| new + tau20 | 0.78 | 0.77 | 0.65 | 33/0/14/1 | 5.4 | 92% | 91 / 91 / 95 | 2/2/0 | 29.3 |
| new + albrecht | 0.82 | 0.82 | 0.65 | 36/0/12/0 | 5.3 | 94% | 75 / 90 / 99 | 5/1/0 | 29.2 |
| new + albrecht-h0.4 | 0.82 | 0.83 | 0.64 | 36/0/12/0 | 4.9 | 93% | 84 / 88 / 100 | 5/1/0 | 29.9 |
| new + shaath-h0.4 | 0.83 | 0.89 | 0.70 | 37/0/10/1 | 5.4 | 88% | 60 / 96 / 89 | 2/3/0 | 29.7 |
| new + kk | 0.80 | 0.83 | 0.61 | 35/0/12/1 | 3.8 | 88% | 62 / 91 / 76 | 2/3/1 | 29.3 |
| new + bgate | 0.80 | 0.82 | 0.64 | 35/0/12/1 | 3.4 | 88% | 70 / 92 / 75 | 6/4/4 | 29.4 |
| new + edma | 0.77 | 0.82 | 0.60 | 34/0/9/5 | 5.3 | 90% | 68 / 90 / 87 | 7/3/3 | 29 |
| new + tonicBass1 | 0.81 | 0.82 | 0.70 | 36/0/9/3 | 6.4 | 93% | 47 / 97 / 95 | 4/0/0 | 28.8 |
| new + tonicBass2 | 0.80 | 0.84 | 0.64 | 36/0/8/4 | 5.8 | 86% | 31 / 86 / 85 | 2/0/0 | 29 |
| new + bassW2 | 0.79 | 0.77 | 0.65 | 34/0/13/1 | 5.7 | 84% | 65 / 63 / 79 | 2/3/0 | 29.3 |
| new + triad0.5 | 0.78 | 0.77 | 0.62 | 33/1/13/1 | 6.5 | 93% | 79 / 99 / 98 | 2/0/0 | 28.7 |
| new + h0.4 | 0.78 | 0.78 | 0.65 | 33/0/15/0 | 4.7 | 93% | 75 / 98 / 100 | 2/1/0 | 28.7 |
| new + h0 | 0.81 | 0.79 | 0.64 | 35/0/13/0 | 5.1 | 94% | 81 / 87 / 99 | 2/3/0 | 23 |
| new + hi1000 | 0.79 | 0.79 | 0.65 | 34/0/13/1 | 4.8 | 90% | 70 / 95 / 84 | 2/0/2 | 16.2 |
| new + hi4000 | 0.78 | 0.77 | 0.65 | 33/0/15/0 | 5.6 | 96% | 95 / 97 / 98 | 2/0/0 | 52.6 |

What the ids mean: `prof-X` profile set X (see section 1; `temperley99` is
Temperley's 1999 profile, `diatonic` a flat in-scale profile). `harm-X` the
harmonics step's cut (0 off, 1 removes the peak). `band-lo-hi` the band in Hz.
`tau-X` decay in s. `floor-X` dB under the loudest. `weight-lin` and `weight-pow`
weight peaks by linear or square root magnitude instead of dB above the floor.
`bassW-X` multiplies peaks under 200 Hz. `tonicBass-X` adds X times the tonic's
share of a separate under 200 Hz chroma to each key's score. `triad-X` adds the
tonic triad's share. `stick-X` stickiness. `sub-X` gives each peak X of its
weight at the fifth below as well (HPCP's subharmonic idea); `sub0h` the same
with the harmonics step off. `profHarm-X` folds expected harmonics into the
profile instead (fifth up at X, third up at X²), `profHarm0h` with the
harmonics step off. `win-X` makes the floor relative to the loudest peak within
X semitones instead of the whole band (a crude spectral whitening), `win30` the
same at 30 dB. `taper-X` fades the band edges over X octaves, `taperwide` the
same on 40 Hz to 4 kHz.

Also MEASURED, a grid of 240 around the fade (fade 0.75, 1, 1.5 octaves, floor
40 or 50, five profiles, harmonics 0.4 or 0.7, tonic bass 0 or 1, stickiness
0.02 or 0.05) and a grid of 72 around Temperley with the fade (fade 0.75, 1,
1.25; floor 35, 40, 45; stickiness 0.05, 0.08; decay 20, 30; band 55 Hz to 2 kHz
or 40 Hz to 3 kHz). The new page is the top of the second grid on (A avg plus
mean radio shift minus 0.05 times changes per minute). Its neighbours all land
close to it: 66 of the 72, and 22 of the 24 with a 1 octave fade, beat the old
page on A, on syn shift and on Raadio 4 and Ida shift at once (the two that did
not were on the 40 Hz to 3 kHz band with 0.08 stickiness and missed only on syn
shift, 86% against 87%). Raadio 2 shift is the volatile one, 28% to 91% across
the 72 and 35% to 91% among the 1 octave fades, for the reason in section 5.

## 4. Why this one (INFERRED from section 3)

1. **The fade fixes a real defect, not a taste.** With a hard edge the loudest
   peak in the band, which on the radio is usually a bass note, decides the
   floor for everything else, and a bass note crossing 55 Hz switches that floor
   by tens of dB from one frame to the next; a partial crossing 2 kHz does the
   same to the top. The shift test showed it as fifth jumps: Raadio 2 shifted
   +2 or +3 read C# major where unshifted read F# major on two thirds of
   readings, and Raadio 4 shifted -3 read A major (a fifth off) on most of them.
   With the fade those jumps are mostly gone, and on the synthetic set the five
   fifth and "other" errors went to zero.
2. **The floor, decay and stickiness buy back steadiness.** The fade alone was
   twitchy on Raadio 2 (10 changes). A 35 dB floor drops the weakest peaks,
   which are mostly upper partials and noise; 30 s of decay and 0.05 of
   stickiness stop a near tie from flipping. Time to a first answer did not get
   worse (3 to 4 s), because the 3 s minimum and the first readings dominate it.
3. **The profile is the least important choice.** On the old page, swapping the
   profile moved A between 0.60 and 0.82, but with the fade every reasonable
   profile lands at 0.77 to 0.83 and the differences sit at two or three
   pieces. Temperley was the steadiest on the radio, so it stays; Albrecht-
   Shanahan with the fade (A 0.82, shifts 75 / 90 / 99) is the runner-up.
4. **Things that did not help.** Bass weighting, both as louder bass and as a
   tonic bonus, fixed a few relative errors on the synthetic set and broke the
   radio's shift consistency (Raadio 2 47% and 31%). The HPCP subharmonic idea
   and harmonics folded into the profile both did worse than the page's own
   harmonics step unless that step was off, and still did not beat it on the
   radio. A floor relative to the local loudest peak (crude whitening) was worse
   on everything unless the floor was also lowered to 30 dB. A wider band (to 4
   or 5 kHz) costs 2 to 3 times the CPU; with the fade, 4 kHz was slightly
   better on the shift tests (95 / 97 / 98, syn shift 96%) and no better on the
   synthetic score, so it is the first thing to try if Raadio 2 turns out wrong
   by ear.

## 5. What could not be settled

- **No real ground truth.** Nobody has said what key any of the three
  recordings is in. Raadio 4 (E major) and Ida (D minor) read the same before
  and after, and the new page holds them for the whole recording. Raadio 2 is
  where they disagree: it sways between F# major, C# major, Bb minor (the
  relative of C# major) and Eb minor (the relative of F# major), and the
  recording may simply hold more than one song or a modulation. Section 6 lists
  the stretches to listen to.
- **The relative major and minor.** Every remaining synthetic error (15 of 48)
  is a minor piece read as its relative major: all twelve natural minor loops
  and three of i VII VI V. A pitch class histogram cannot settle those, and the
  cheap fixes measured here (bass, tonic triad) cost more on the radio than they
  bought. What has not been tried: a chord level model (which chord the
  progression keeps returning to, or the raised seventh only when it sits in a
  dominant chord), a key HMM with a transition model (Noland and Sandler), and
  NNLS chroma (Mauch and Dixon). Each is a real piece of work, not a parameter.
- **The synthetic set is my own music.** It is simple, loops one progression,
  and its timbres are a guess at what radio sounds like. A score on it says the
  detector can read clear chords; it does not say how often it is right on the
  radio. 48 pieces means one piece is 0.02 of the score.
- **The shift test has a floor of its own.** Even clean synthetic pieces move by
  exactly the shift only 93% of the time with the new block, so a radio number
  in the high 90s is about as good as this test can show.
- **The page levels before the detector; the harness did not.** Inferred not to
  matter (relative floor, normalised frames), not measured.
- **UNTESTED in a browser.** The block is the same arithmetic the harness ran,
  read back out of the file and compared reading for reading, but nobody has
  watched the page with it.

## 6. Where to listen (for the owner)

The readings lag what is playing, because they are a 30 s decaying sum: judge
the 20 to 30 s BEFORE each time. The recordings play on
https://positron.studio/concepts/radio/040/ and directly at the URLs below.

**Raadio 2**, https://positron-station.kristjan-jansen.workers.dev/media/radio/raadio2/2026-10-11.mp3

| time | old page says | new page says | the question |
| --- | --- | --- | --- |
| 0:20 | Eb major | Eb major | both agree; is the opening really Eb major? |
| 0:45 | Eb minor | Eb major | major or minor on Eb? |
| 1:05 | Eb minor | Bb minor | which minor? |
| 1:18 | F# major | Bb minor | relative pair of the next row's C# major? |
| 2:00 and 2:50 | F# major | C# major | a fifth apart: which is home? (Shaath with the fade says Bb minor here) |

**Raadio 4**, https://positron-station.kristjan-jansen.workers.dev/media/radio/raadio4/2026-10-11.mp3

| time | old page says | new page says | the question |
| --- | --- | --- | --- |
| 1:30 | E major | E major | is it E major at all? |
| 2:55 | Eb minor | E major | did something change at the end? |

**Ida**, https://positron-station.kristjan-jansen.workers.dev/media/radio/ida/2026-10-11.aac

| time | old page says | new page says | the question |
| --- | --- | --- | --- |
| 1:30 | D minor | D minor | both agree for the whole recording; is it D minor, or F major? |

If Raadio 2 by ear is F# major or Eb minor, the old page was nearer there and
the next candidate is the new page with a 4 kHz band. If it is C# major or Bb
minor, the new page is right there too.

## 7. Next, if wanted

1. Listen to section 6 and write the answers here. Three labelled stretches turn
   the radio from a consistency test into a real one.
2. A chord level tie-breaker for the relative key, measured on the same harness
   against the 15 relative errors, and kept only if the radio shift numbers do
   not fall.
3. NNLS chroma as a replacement for the harmonics step: about 84 note templates
   times the band's bins, a few hundred µs a hop, still cheap.
