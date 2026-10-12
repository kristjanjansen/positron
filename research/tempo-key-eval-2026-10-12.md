# Tempo and key on our radio pages, measured against reference tools, 2026-10-12

Asked 2026-10-12 about https://positron.studio/concepts/radio/030/ Live tempo:
*"not good perf of bmp"*, then *"save more and evaluate bmp and keys perf. do
reseach / get tooling"*. The detectors measured are the tempo detector of
`demo/concepts/radio/030/index.html` (byte identical to radio/020's, checked
with `diff`) and the key detector of `demo/concepts/radio/040/index.html`
(`KEY CORE`). The plan that follows from this file is
`plans/plan-tempo-key-improve.md`.

| mark | means |
| --- | --- |
| **MEASURED** | run offline on this laptop on 2026-10-12 |
| **ESTIMATED** | arithmetic or a reading from a measurement, not run itself |
| **READ** | from a paper, a README or a library's source |

## 0. Verdict

1. **The tempo NUMBER is mostly right; the BEAT GRID is what is poor on Ida.**
   Pooled over six recordings, our tempo matches the reference tools within 4%
   on 84% of readings (MEASURED). But on the three new Ida takes the drawn
   beats sit half a beat off the reference beats 52%, 17% and 23% of the time,
   and the grid jumps by a quarter beat or more **23 to 27 times a minute**
   (MEASURED). That is a click wandering between the kick and the offbeat,
   which is what a listener hears as "poor BPM".
2. **The cause is the phase step, not the tempo step.** It chooses the phase
   afresh every 0.5 s with no memory, and it assumes the hats sit on the
   offbeat (a house prior chosen on Raadio 2). Two cheap changes, the hats'
   side measured instead of assumed and the last grid kept unless a new one
   wins clearly, take pooled "on the beat" from 63% to 77%, "half a beat off"
   from 27% to 11% and grid jumps from 21.4 to 4.5 a minute (MEASURED).
3. **Where the reference tools hear no steady beat, our confidence already
   knows.** Readings at confidence 0.5 or more are 92% right; below 0.5 they
   are 54% right, and they are 20% of all readings (MEASURED). The page shows
   both the same way.
4. **The key detector reads a fifth or worse off on two of the three new Ida
   takes.** Pooled exact 52%, MIREX 0.64 (MEASURED against a soft truth). With
   Faraldo's `edma` profile in place of Temperley's: exact 71%, MIREX 0.76,
   and against an independent soft truth 0.55 to 0.63, at the cost of more key
   changes (0.59 to 1.36 a minute).
5. **None of this has ground truth.** "Right" means "two or more established
   tools agree", and section 3 says exactly where that is circular.

## 1. What was recorded (MEASURED)

Ida Radio Tallinn only. Nothing was opened to ERR: Raadio 2 and Raadio 4 are
the 2026-10-11 recordings already in R2.

| R2 key (bucket `positron-station`) | start (UTC) | seconds | bytes |
| --- | --- | --- | --- |
| `radio/ida/2026-10-12-1314.aac` | 10:14:24 | 599.8 | 24,171,667 |
| `radio/ida/2026-10-12-1354.aac` | 10:54:24 | 610.1 | 24,557,157 |
| `radio/ida/2026-10-12-1434.aac` | 11:34:24 | 608.4 | 24,517,947 |
| `radio/ida/2026-10-12.json` | the sidecar: when, how long, how | | 1,427 |

- **How:** one `curl -sS --max-time 600` at a time, 30 minutes apart, through
  our relay's tee, `https://shout.positron.studio/ida-tallinn`. Three relay
  connections in total, never two at once. `GET /tee/ida-tallinn` read
  `upstreamConnections: 1` with four listeners at the first take, so the
  broadcaster saw no new connection from us. Bytes kept as the relay sent them:
  ADTS AAC, 44.1 kHz stereo, `icy-br: 320`. The relay bursts at connect, so a
  take's audio begins a few seconds before its start time.
- **Why three takes of ten minutes, 40 minutes apart:** three different stretches of
  programming at about the length a visitor listens, enough readings to count
  (about 1,190 tempo readings and 116 key marks each), and an hour and a half
  of wall clock. It is one weekday lunchtime; section 6 says what that misses.
- **Uploaded with** `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN npx -y wrangler@4 r2 object put positron-station/<key> --file <f> --content-type audio/aac --cache-control "public, max-age=31536000, immutable" --remote`,
  from the scratchpad (no `.env` in the cwd). Read back through
  `https://positron-station.kristjan-jansen.workers.dev/media/radio/ida/<name>`
  at the uploaded byte count, all four.
- **What the takes are (from the tools, not by ear):** 1314 is about 93 then
  100 bpm, G major or E minor, with a gap in the beat at 268 to 279 s. 1354 is
  DJ mixing, 108 to 112 bpm, the key moving every minute or two (A minor, F, G,
  B, E, Eb minor). 1434 is 124 bpm to 150 s, then about two minutes with no
  steady beat, then 80 bpm material the tools split between 80 and 160.

## 2. Tooling, and what ran on this machine

**What runs:** Python 3.12 from Homebrew, a venv at
`~/.cache/positron-tools/venv`, prebuilt wheels only
(`pip install --only-binary=:all: essentia librosa torch beat-this soxr`), and
the npm package `essentia.js` 0.1.3 (wasm) under node. Nothing was compiled.

- 🔴 **THE VENV HAS TO LIVE UNDER THE HOME DIRECTORY.** Built in the session
  scratchpad under `/private/tmp`, every native extension failed to load,
  numpy's included, with `mmap(size=...) failed with errno=1`: this managed
  machine refuses to map executable pages from there. The same wheels in
  `~/.cache/positron-tools` load. 1.1 GB, plus 85 MB of beat_this checkpoints
  in `~/.cache/torch/hub/checkpoints`.
- **madmom** has no wheel for this Python (`No matching distribution`), so
  madmom, BeatNet (which needs it) and madmom's CNN key recogniser were not run.
- **aubio** is not installed and was not attempted (it would mean Homebrew).
- **ffmpeg** 9.0.1 is on PATH (Homebrew) and decodes everything.

Versions: essentia 2.1b6.dev1389, librosa 1.0.0, torch 2.14.1, torchaudio
2.11.0, beat-this 1.1.0, numpy 2.5.4, scipy 1.18.1, soxr 1.1.0, essentia.js
0.1.3, node 25.9.0.

**The scripts**, all in `research/tools/tempo-key/`:

| file | what |
| --- | --- |
| `our-tempo.mjs` | radio/030's tempo detector run offline. The code from `const HOP = 256;` to the canvas section is cut out of the page's HTML and evaluated, so `detHop` and `detEstimate` are the page's own lines. Re-implemented: the four BiquadFilterNodes (Web Audio spec formulas), the per sample follower, and the level stage (`--level agc030`, the default, or `static020` or `none`). `--set 'NAME=value;...'` swaps a constant, `--page` runs a patched copy, `--dump` writes the band rises |
| `our-key.mjs` | radio/040's `KEY CORE` run offline with an AnalyserNode re-implemented (32768 points, Blackman, every 0.1 s, a reading every 0.5 s). `--opts` passes `keyCreate` options; adds `edma`, `bgate`, `shaath` and `albrecht` profiles beside the page's two |
| `ref.py` | the references: essentia RhythmExtractor2013 (multifeature and degara), PercivalBpmEstimator on the page's 12 s windows every 2 s, librosa `beat_track`, beat_this `final0` without DBN, essentia KeyExtractor with five profiles and librosa constant Q chroma with two profiles on 30 s windows every 5 s |
| `bt-window.py` | beat_this run as a tab would have to: the last 12 s only, every 2 s, no future |
| `patch-page.mjs` | writes a copy of radio/030 with one candidate change to the phase step (`keep`, `keepnear`, `adapt`), refusing if its anchor text has moved |
| `eval.mjs` | scores everything (section 3) |
| `essentia-js-cost.cjs` | what essentia.js costs per window in wasm |

**Commands**, with `D` a working folder:

```sh
ffmpeg -i x.aac -ac 1 -ar 44100 -f f32le $D/x.f32      # mono float, as the analysers downmix
ffmpeg -i x.aac -ac 1 -ar 44100 $D/x.wav
node research/tools/tempo-key/our-tempo.mjs $D/x.f32 > $D/our-x.json
node research/tools/tempo-key/our-key.mjs $D/x.f32 > $D/key-x.json
~/.cache/positron-tools/venv/bin/python research/tools/tempo-key/ref.py $D/x.wav $D/ref-x.json
~/.cache/positron-tools/venv/bin/python research/tools/tempo-key/bt-window.py $D/x.wav $D/bt12-x.json small0
node research/tools/tempo-key/eval.mjs $D x [y ...]              # --tempo <prefix> --key <prefix> --phase essentia --json
node research/tools/tempo-key/patch-page.mjs adapt $D/cand.html 'ratio=1.5,keep=0.5'
node research/tools/tempo-key/our-tempo.mjs $D/x.f32 --page $D/cand.html > $D/tcand-x.json
```

Reference runs cost about 10 s per three minutes of audio on this laptop
(essentia multifeature 1.5 s, beat_this 2.8 s, librosa 2.3 s, keys 2.0 s per
183 s, MEASURED).

🔴 **AN INSTRUMENT THAT READ ONE NUMBER PER FILE, CAUGHT BEFORE IT WAS
BELIEVED.** The first `ref.py` built one `PercivalBpmEstimator` and called it
on every window. It returned **130 for all 86 windows of Raadio 2 and 109 for
all 294 windows of an Ida take** whose tempo moves from 93 to 101; a fresh
instance per window reads 94, 94, 92, 101 and 100 on the same windows
(MEASURED). It agreed with the other tools 100% on Raadio 2, because Raadio 2
really is one tempo, which is how a stuck reader passes. Every essentia
algorithm is now built fresh per window, KeyExtractor included.

## 3. How "right" is decided, and where it is circular

**Tempo.** At each of our readings (every 0.5 s, from 12 s on), each
reference's beats in the 12 s before give a local tempo: a least squares line
through the beats against their beat number, needing six beats. (A median
inter beat interval is quantised by beat_this's 20 ms frames to 125.0 or
130.4 bpm, so it read 125 for a 127 bpm song; the line does not.) Percival on
the same window is the fourth reader. **The soft truth is the mean of the
largest group of readers that agree within 4%, and only when that group has
two or more.** Our reading is scored exact (within 4%), octave (x2, x1/2, x3,
x1/3), 3:2, or other. "Within 4%" is MIREX's Accuracy 1 tolerance.

**Phase.** Our newest beat against the nearest **beat_this** beat, as a
fraction of our period: "on" under 1/8 beat, "half off" 3/8 or more; only on
readings whose tempo is exact. **Grid jumps** are consecutive readings at the
same tempo whose grids sit a quarter beat or more apart, per minute.
⚠️ beat_this is the only phase reference trusted here, and the reason is
measured: on Raadio 2 beat_this and essentia disagree about the phase on 68%
of beats (essentia and librosa put the beat on the hats, which in that music
sit on the offbeat), and the kick grid measured by hand on 2026-10-11
(`research/beat-tracking-2026-10-11.md`, 201 kicks) sides with beat_this: our
page is 85% on beat_this's beats there and 36% on essentia's. On the other
five recordings beat_this and essentia agree on 86% to 96% of beats. Scores
against essentia are given too.

**Key.** At each 5 s mark from 30 s on, seven readers over the 30 s before:
essentia's KeyExtractor (HPCP chroma) with the `edma`, `bgate`, `krumhansl`,
`temperley` and `shaath` profiles, and librosa's constant Q chroma correlated
with Krumhansl-Kessler and Albrecht-Shanahan. **The soft truth is the key four
or more of the seven name, and only when both front ends are among them.**
Scored MIREX style: exact 1, fifth 0.5, relative 0.3, parallel 0.2.
⚠️ **IT IS CIRCULAR FOR ANY PROFILE THAT IS ALSO A READER.** Five of seven
readers share essentia's chroma and one of them is `edma`, so a candidate
using `edma` is partly graded by itself. So every key result also carries a
second, independent soft truth: **the two librosa readers agreeing with each
other**, which share no code and no profile with `edma` or Temperley.

## 4. Tempo, MEASURED

### 4.1 The page as it is

| recording | readings | soft truth exists | exact | octave | 3:2 | other | on beat / half off | grid jumps / min | tempo flips / min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Raadio 2 | 343 | 100% | 100% | 0% | 0% | 0% | 85% / 14% | 7.3 | 0.0 |
| Raadio 4 | 342 | 82% | 85% | 0% | 1% | 14% | 90% / 7% | 10.2 | 3.2 |
| Ida 10-11 | 355 | 97% | 90% | 0% | 3% | 7% | 98% / 1% | 4.4 | 2.0 |
| Ida 1314 | 1177 | 97% | 95% | 3% | 0% | 2% | **43% / 52%** | **26.2** | 1.0 |
| Ida 1354 | 1196 | 91% | 87% | 0% | 2% | 11% | **55% / 17%** | **23.1** | 1.6 |
| Ida 1434 | 1194 | 84% | 62% | 17% | 6% | 15% | **70% / 23%** | **27.2** | 3.6 |
| **pooled** | 4607 | | **84%** | 5% | | | **63% / 27%** | **21.4** | 2.0 |

Against essentia's beats instead: on / half off 36/62, 87/4, 96/2, 42/53,
35/26, 75/5 (see 3 for why Raadio 2 reads that way).

Global tempo per tool (ours is the median reading after 12 s):

| recording | ours | essentia multifeature | essentia degara | beat_this | librosa |
| --- | --- | --- | --- | --- | --- |
| Raadio 2 | 127.1 | 127.1 | 127.1 | 127.0 | 129.2 |
| Raadio 4 | 127.6 | 127.3 | 127.4 | 127.4 | 129.2 |
| Ida 10-11 | 131.0 | 131.3 | 131.2 | 131.2 | 129.2 |
| Ida 1314 | 99.3 | 100.8 | 100.8 | 99.7 | 99.4 |
| Ida 1354 | 107.5 | 107.9 | 120.2 | 112.3 | 129.2 |
| Ida 1434 | 112.4 | 123.6 | 161.6 | 123.9 | 161.5 |

librosa's global tempo sits on its tempogram's bins (129.2 on four recordings);
its beats are used, its global number is not. How often the reference readers
agree with each other, pairwise, falls from 94 to 100% on Raadio 2 to **2 to
52% on Ida 1434**: on the hard takes the tools disagree as much as we do.

### 4.2 What the misses are

- **Ida 1434, 160 to 300 s:** no steady beat. beat_this reads 65, 125, 136,
  75; Percival 66 to 134; our confidence sits at 0.09 to 0.39. Then **80 or
  160**: beat_this and Percival read 80 bpm, essentia and librosa 160, we read
  80, with 106.6 (4/3 of 80) as the runner up that wins at 480 to 500 s.
- **Raadio 4, last minute:** no drum (beat_this has seven gaps over 2.5 s
  after 126 s), our confidence low.
- **The confidence already separates them.** Pooled, readings at confidence
  0.5 or more: **3,341, 92% exact**. Below 0.5: **850, 54% exact**. Per
  recording, confidence 0.5 or more is 100, 100, 100, 98, 95 and 72% exact.

### 4.3 What the level stage does: nothing measurable

`--level agc030` (the live page's AGC and limiter, approximated), `static020`
(radio/020's block levelling) and `none`: pooled exact 84, 85, 84%, on beat 63,
63, 63%, jumps 21.4, 21.3, 21.1 (MEASURED). The log compression in the onset
step makes a gain a constant that the rise subtracts away.

### 4.4 Phase candidates (pooled over all six; tempo is unchanged by all of them)

| candidate | on / half off | grid jumps / min | CPU, ms per s of audio (Node) |
| --- | --- | --- | --- |
| page as is | 63% / 27% | 21.4 | 3.4 to 3.6 |
| hats' offbeat term off (`HAT_BETA=0`) | 68% / 17% | 16.0 | same |
| keep the last grid unless beaten by 25% (`keepnear 0.25`) | 62% / 27% | 7.0 | about 3.5 |
| same, by 50% (`keepnear 0.5`) | 62% / 27% | 3.3 | about 3.5 |
| **hats' side measured, keep 50% (`adapt ratio=1.5,keep=0.5`)** | **77% / 11%** | **4.5** | 3.9 to 4.6 |
| hats' side measured, ratio 2, keep 50% | 78% / 10% | 4.2 | about 4.5 |
| hats' side measured, ratio 1, keep 50% | 75% / 14% | 5.2 | about 4.5 |
| our tempo, beat_this small0 phase on the last 12 s (hybrid) | 86% / 7% | 4.7 | ours plus the model |
| beat_this small0 alone on the last 12 s | 93% / 4% (tempo exact 78%) | 1.2 | 37 to 93 in PyTorch |

Per recording for the measured hat side with keep 0.5: on / half off 83/17,
89/7, 98/1, **83/11**, **61/8**, **75/18**; jumps 5.9, 3.9, 2.4, 3.5, 5.5,
5.0. Raadio 2 loses 2 points of "on" (85 to 83%), Ida 1314 gains 40.

**What `adapt` does.** The low bands (`PH_W`, hats out) find their own best
grid first. The hat band is folded on that grid. Only when the hats sit more
on the offbeat than on the beat, by `ratio`, is today's offbeat hat term used;
otherwise the beat envelope is all four bands at weight 1 with no offbeat term.
Then the last reading's grid, carried forward and allowed to slide 1/16 beat,
is kept unless the best new phase beats it by more than `keep`. It is the
"make HAT_BETA depend on which side the hats fold to, measured live" that
`plans/plan-beat-detection.md` section 6.2 proposed; Ida 1314, with hats on the
beat, is the recording that plan said was missing.

⚠️ **The earlier refusal of phase hysteresis stands corrected for a reason.**
`plan-beat-detection.md` refused it at 92% against 96% on Raadio 2's kick
grid. Here keep alone costs Raadio 2 nothing measurable against beat_this
(85 to 88 to 90%) and cuts jumps three to six times; the difference is that
the old number counted drawn beats, and this one also counts how often the
grid moves, which is what is heard.

⚠️ The hybrid and beat_this alone are graded on phase against beat_this
`final0`, their own family. Against essentia the hybrid reads 24/66, 86/6,
95/2, 96/2, 50/9 and 72/6, the same shape as ours on Raadio 2 for the reason
in section 3. Treat their phase numbers as an upper bound.

### 4.5 Why beat_this is not simply the answer

Run as a tab would run it, on the last 12 s every 2 s, beat_this `small0`
(2.1 M parameters) gets the phase right 93% of the time but **the tempo exact
only 78%**, against our 84% (Raadio 2 83% against our 100%; Ida 1354 68%
against 87%): twelve seconds of beats at the window edge is a noisier tempo
than our autocorrelation (MEASURED). Its tempo flips 5.8 times a minute
against our 2.0. Cost in PyTorch on this laptop: **77 ms per 12 s window**
multi threaded, **161 ms single threaded**; `final0` (20.3 M) 106 ms. In a
browser through ONNX Runtime Web it would be slower; 2 to 5 times is a guess
(ESTIMATED), which is 0.3 to 0.8 s of CPU per 2 s window, 15 to 40% of a core.

### 4.6 What essentia.js would cost in a tab (MEASURED in node, wasm)

| algorithm | window | ms |
| --- | --- | --- |
| RhythmExtractor2013 multifeature | 12 s | 547 to 559 |
| RhythmExtractor2013 degara | 12 s | 118 to 119 |
| PercivalBpmEstimator | 12 s | 147 to 148 |
| KeyExtractor (edma) | 30 s | 54 to 56 |

Run every 2 s, multifeature would be over a quarter of a core and degara about
6%; our detector is about 0.35% (3.5 ms per second of audio). Essentia's own
documentation says RhythmExtractor2013 relies on statistics over the whole
track and is not suited to real time (READ, essentia.upf.edu beat detection
tutorial).

## 5. Key, MEASURED

### 5.1 The page as it is (Temperley, the 2026-10-11 block)

| recording | marks | soft truth exists | exact | fifth | relative | other | MIREX | exact within 15 s | librosa pair: marks, MIREX | changes / min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Raadio 2 | 31 | 48% | 73% | 7% | 20% | 0% | 0.83 | 93% | 26, 0.52 | 0.71 |
| Raadio 4 | 31 | 71% | 55% | 45% | 0% | 0% | 0.77 | 55% | 22, 0.66 | 0.00 |
| Ida 10-11 | 32 | 94% | 87% | 0% | 0% | 13% | 0.87 | 87% | 28, 0.91 | 0.00 |
| Ida 1314 | 114 | 75% | 34% | 27% | 9% | 29% | 0.50 | 36% | 78, 0.59 | 0.72 |
| Ida 1354 | 116 | 59% | 50% | 10% | 3% | 37% | 0.56 | 56% | 72, 0.35 | 1.21 |
| Ida 1434 | 116 | 59% | 54% | 35% | 1% | 10% | 0.71 | 62% | 55, 0.57 | 0.91 |
| **pooled** | 289 scored | | **52%** | | | | **0.64** | | 281, **0.55** | 0.59 (mean) |

- **Ida 1314 reads a fifth BELOW the tools**: C major on 562 readings where six
  of seven tools say G major or its relative E minor. Turning off the
  harmonics step (`harm: 0`) moves it to 45% exact and still reads C major most;
  changing the profile is what moves it (section 5.2).
- **Ida 1354 is a DJ mix and the key moves every one or two minutes.** "Exact
  within 15 s" (our reading is right at some point in the next 15 s) is 56%
  against 50% exact, so the 30 s memory is part of it and not most of it.
- **Raadio 2 is ambiguous for the tools too**: only 48% of its marks have a
  soft truth, and the seven whole file readers split between Bb minor, C# major
  and F# major (a relative pair and its fifth).

### 5.2 Candidates (pooled over all six)

| candidate | exact | MIREX | librosa pair MIREX (independent) | changes / min |
| --- | --- | --- | --- | --- |
| page (Temperley) | 52% | 0.64 | 0.55 | 0.59 |
| **edma profile** | **71%** | **0.76** | **0.63** | 1.36 |
| edma, stickiness 0.1 | 65% | 0.71 | 0.60 | 0.85 |
| edma, harmonics 0.4 | 66% | 0.73 | 0.58 | 1.06 |
| edma, decay 20 s | 67% | 0.73 | 0.61 | 1.77 |
| edma, decay 15 s | 66% | 0.74 | 0.62 | 2.45 |
| edma, harmonics off | 61% | 0.72 | 0.58 | 0.93 |
| edma, band to 4 kHz | 62% | 0.68 | 0.55 | 1.44 |
| Krumhansl-Kessler | 63% | 0.69 | 0.58 | 0.96 |
| bgate | 63% | 0.68 | 0.54 | 1.48 |
| Albrecht-Shanahan | 57% | 0.65 | 0.52 | 0.99 |
| Shaath | 54% | 0.65 | 0.54 | 1.14 |
| Temperley, harmonics off | 58% | 0.67 | 0.55 | 0.82 |
| Temperley, decay 15 s | 55% | 0.67 | 0.59 | 1.65 |
| Temperley, band to 4 kHz | 49% | 0.59 | 0.52 | 0.63 |

edma per recording: MIREX 0.64, 0.98, 0.87, **0.82**, 0.51, **0.83** (from
0.83, 0.77, 0.87, 0.50, 0.56, 0.71); librosa pair 0.39, 0.82, 0.93, 0.87,
0.34, 0.57. It loses on Raadio 2 (the ambiguous one) and on Ida 1354 (the
mix), and wins clearly on Raadio 4, Ida 1314 and Ida 1434.

**Essentia's own readers against the independent librosa pair** (281 marks):
shaath 0.72, krumhansl 0.71, edma 0.70, bgate 0.69, essentia's temperley 0.59;
exact 64, 64, 62, 60, 39%. So **essentia.js's KeyExtractor on a 30 s window
would score about 0.70 here against our page's 0.55 and our page with edma's
0.63**, for 55 ms of wasm every 5 s (section 4.6).

⚠️ Against the synthetic set of 2026-10-11 (`plans/plan-key-detection.md`
section 3), the page with edma scored 0.77 against 0.78 on the 48 pieces and
**0.60 against 0.65 on the 24 held out**. That set is clean chords, which
favour Temperley; the radio favours edma. Both are true.

## 6. Research: what the field does, and what fits in a tab (READ)

- **Neural beat tracking is the state of the art and the offline best is
  beat_this.** Foscarin, Schlueter and Widmer, *Beat This! Accurate Beat
  Tracking Without DBN Postprocessing*, ISMIR 2024,
  https://github.com/CPJKU/beat_this and
  https://research.jku.at/en/publications/beat-this-accurate-beat-tracking-without-dbn-postprocessing/.
  A transformer over a mel spectrogram, trained on many datasets, no DBN, so
  no tempo or meter prior baked in. `small0` is 2.1 M parameters (MEASURED
  above). It is NOT causal: it sees the whole chunk, which is why it was run
  here on the last 12 s only.
- **For a live stream the published systems are causal**: BeatNet (Heydari,
  Cwitkowitz, Duan, ISMIR 2021), a causal CRNN with two particle filters for
  beat, downbeat and meter, https://arxiv.org/pdf/2108.03576 and
  https://github.com/mjhydri/BeatNet, with BeatNet+ in TISMIR,
  https://transactions.ismir.net/articles/10.5334/tismir.198; and BEAST, a
  streaming transformer, https://arxiv.org/pdf/2312.17156. Neither ran here
  (BeatNet needs madmom, which has no wheel). Their weight in a tab is the
  same order as beat_this small (ESTIMATED from their papers' descriptions).
- **Tempo without beats**: TempoCNN (Schreiber and Mueller, ISMIR 2018) reads
  tempo from 11.9 s of mel spectrogram as a classification, which is good
  against octave errors,
  https://www.audiolabs-erlangen.de/content/05_fau/professor/00_mueller/03_publications/2018_SchreiberMueller_TempoCNN_ISMIR_PrintedVersion.pdf,
  https://github.com/hendriks73/tempo-cnn. Essentia ships it in its TensorFlow
  build and essentia.js can run its TF.js models (READ,
  https://mtg.github.io/essentia.js/). A review: https://arxiv.org/pdf/2401.00209.
- **Essentia's classical extractors**: RhythmExtractor2013, Percival, Degara;
  essentia.js runs them in wasm with an AudioWorklet pattern for real time,
  https://mtg.github.io/essentia.js/docs/api/tutorial-2.%20Real-time%20analysis.html,
  paper https://transactions.ismir.net/articles/10.5334/tismir.111. Costs in
  section 4.6.
- **Key**: profile matching over a chroma is still the baseline, and for
  electronic and popular music the profile matters more than the chroma.
  Faraldo et al.'s `edma` and `bgate` (Essentia's default) came out of
  electronic dance music (sources in `plans/plan-key-detection.md` section 1).
  The neural state of the art is Korzeniowski and Widmer's genre agnostic CNN,
  ISMIR 2018, https://arxiv.org/pdf/1808.05340, in madmom as
  `CNNKeyRecognitionProcessor`,
  https://github.com/CPJKU/madmom/blob/main/madmom/features/key.py, a global
  key per piece rather than a running one. "Spotify style" key is a closed
  service; what is public about it is a per track key with a confidence, the
  same global shape.
- **Speech and silence**: radio speech/music discrimination is old and cheap:
  Saunders 1996 ran in real time on broadcast FM at about 98%,
  https://www.semanticscholar.org/paper/Real-time-discrimination-of-broadcast-speech-music-Saunders/7eefb1bf926bf126bc3633fb8d65e8ff4159eaaa;
  a single low energy ratio feature with a Bayes classifier, or a rhythm
  strength feature, is enough (survey of results,
  https://ismir2005.ismir.net/proceedings/2027.pdf,
  https://www.researchgate.net/publication/3964001_Rhythm_detection_for_speech-music_discrimination_in_MPEG_compressed_domain).
  Our own confidence is already a rhythm strength feature, and section 4.2
  shows it separates. Ida had almost no speech in these takes (beat_this
  gaps over 2.5 s: two in 1314, none in 1354 or 1434 besides the unsteady
  stretch), so **speech gating was not measured**.

## 7. What could not be settled

- **No human labels.** Every "right" is tools agreeing. Listening to the Ida
  takes at the places named in the plan would turn soft truth into truth.
- **The phase reference is one model.** beat_this is trusted over essentia
  because of one hand measured kick grid on one recording.
- **The key soft truth is mostly one front end** (five of seven readers are
  essentia HPCP), which the librosa pair column exists to check.
- **The Web Audio parts are re-implemented, not run.** The biquads follow the
  Web Audio spec formulas and were not compared with Chrome's output; the
  limiter in `agc030` is an approximation without Chrome's makeup gain or
  look-ahead. The level stage measured as irrelevant (4.3), so the limiter
  approximation probably is too; the biquads are not checked.
- **Live decoding is not modelled.** The live page reads the stream through
  `createMp3Stream`; a gap or a stall there would be an onset our offline run
  never sees. Not measured; it would need the page run against the stand in.
- **Three takes on one weekday lunchtime.** No evening club programming, no
  talk heavy hour.
- **Browser cost of a model is estimated, not measured** (4.5).
- **The essentia profile numbers** in `our-key.mjs` were read from Essentia's
  `key.cpp` through a summariser and not byte checked; Albrecht-Shanahan as
  music21 carries it.

## 8. beat_this small in a tab, MEASURED 2026-10-12 evening

Asked as item (c) of *"do open stuff"*: install onnx, export beat_this small,
measure it in Chrome, grade it beside `demo/concepts/radio/tempo.mjs` (which
since commit 5f9c8733 scores on the beat 81.3% pooled and shown wrong 5.0%).
**This replaces the ESTIMATED browser cost in 4.5 and in item 5 of the plan.**
Nothing on any page changed.

### 8.1 What ran

- `pip install --only-binary=:all: onnx` in `~/.cache/positron-tools/venv`:
  onnx 1.23.2, protobuf 7.36.2, ml_dtypes 0.6.0, all wheels, nothing compiled.
- **Export:** `small0` (2,099,960 parameters) through the TorchScript exporter,
  opset 17, the time axis dynamic. `onnx.checker` passes. **10,498,987 bytes**
  at float32, **6,310,140** with the weights stored as float16 and cast back to
  float32 at load (the arithmetic is unchanged). Logits through onnx's own
  reference evaluator against a fresh torch run: max difference 6e-5.
- **Runtime:** onnxruntime-web 1.30.0 from npm, the `wasm` build
  (`ort.wasm.min.mjs`, `ort-wasm-simd-threaded.wasm`), in headless Chrome 155
  on this laptop over CDP, served by a local static server. Also the
  `webgpu` build once, with the GPU allowed.
- **Front end in JS**, matching beat_this's `LogMelSpect`: 22,050 Hz, n_fft
  1024 with a periodic Hann window, hop 441 (50 frames a second), centred
  frames with reflect padding, magnitude, 128 slaney mels from 30 to 11,000 Hz,
  `log1p(1000 x)`, six zero frames either side as `zeropad` does, and the
  minimal postprocessing (a local maximum over 7 frames with a logit above 0,
  adjacent peaks merged). The page's audio is 44.1 kHz, so a 191 tap Kaiser
  windowed lowpass at 10.6 kHz and 2:1 decimation stands in for soxr.
- **Run as `bt-window.py` runs it:** the last 12 s every 2 s, no future, the
  same tempo line through the window's beats, readings in `our-tempo.mjs`'s
  shape, graded by `eval.mjs` against the same soft truth as section 4.
- The tools are in `research/tools/tempo-key/onnx/` (`export.py`, the test
  page, its driver and the three scripts that turn its output into readings);
  the page's header says how to lay out a working folder.

⚠️ **TWO TRAPS, BOTH CAUGHT BY THE FIXTURE BEFORE ANY NUMBER WAS BELIEVED.**
`normalized='frame_length'` in torchaudio divides by `sqrt(n_fft)` (32), not
by the window's energy (19.6): the first JS mel sat **0.48 above torchaudio in
every bin**, which is `ln(32 / 19.6)`. And logits taken from the same torch
model instance right after `torch.onnx.export` differed from a fresh instance
by up to **6.9**, so the first comparison blamed the ONNX graph for a fault in
the reference; the fixture is now taken from a fresh model.

**Fidelity, MEASURED on a 12 s Raadio 2 window:** JS mel against torchaudio on
the same soxr audio, max difference 4e-5. onnxruntime-web logits against torch
on the reference mel, max 5e-5. With the JS decimation in place of soxr: mel
mean difference 0.005 (max 1.3, in the top bands), logits max 0.63, and **the
26 beats identical**. Over all six recordings the tab's model alone reads tempo
exact **78.2%** against 78% for PyTorch in 4.5, so the port is the model.

### 8.2 Cost in Chrome (MEASURED, this laptop)

| | wasm, 1 thread | wasm, 4 threads | WebGPU |
| --- | --- | --- | --- |
| inference per 12 s window (613 frames) | **mean 520 ms**, p50 509 to 525, p95 524 to 578, max 593 (1,153 windows) | 162 ms wall | **p50 47 ms**, p95 53 ms (40 windows) |
| renderer CPU per window | 520 ms | about 690 ms (the pool spins) | not separated (the GPU process was not counted) |
| at a 2 s cadence, per 1 s of audio | **about 276 ms, 27.6% of a core** | more CPU, less latency | |
| needs | nothing | `crossOriginIsolated` (COOP and COEP), which positron.studio does not send | a GPU; WebGPU on the visitor's browser |

- The rest of the work per window: log mel 15.3 ms, peak picking 0.02 ms; the
  decimation 6.6 to 10.3 ms per second of audio as written (a polyphase
  halfband would be a fraction of that). 276 ms per second of audio is
  520 / 2 + 15.3 / 2 + about 8; **`tempo.mjs` is 4.1 ms, so about 68 times
  less.**
- Every 4 s instead of 2: about 146 ms per second of audio with our detector
  added, 14.6% of a core. Every 8 s: about 79 ms, 7.9%.
- ⚠️ **On the main thread a 520 ms run blocks the page for half a second
  every two.** The test page ran it there; any real page would need a Worker
  (`ort.env.wasm.proxy` or its own), which was not measured.
- **First inference:** session create 590 to 606 ms (compile and model load,
  served locally so the download is not in it), first run 570 to 593 ms, so
  about 1.2 s from the files arriving to the first beats, after the 12 s of
  audio the first window needs. WebGPU: create 1,108 ms, first run 856 ms,
  then 47 ms.
- **Download, MEASURED bytes:**

| file | raw | brotli 11 |
| --- | --- | --- |
| `ort.wasm.min.mjs` + `ort-wasm-simd-threaded.mjs` | 74,507 | 22,552 |
| `ort-wasm-simd-threaded.wasm` | 14,239,897 | 2,300,583 (jsDelivr serves it as 3,073,897 br) |
| `small0.onnx` (float32) | 10,498,987 | 7,787,080 |
| `small0-f16.onnx` (float16 weights) | 6,310,140 | 3,772,289 |
| `ort-wasm-simd-threaded.asyncify.wasm` (the WebGPU build instead) | 26,781,914 | 3,866,678 |

  So the wasm path with float16 weights is **about 6.1 to 6.9 MB over the
  wire** and 20.6 MB uncompressed. The float16 file grades within 0.1 point of
  the float32 one on every column of 8.3 (tempo exact 78.2 against 78.1).
- **Memory, MEASURED** with `performance.measureUserAgentSpecificMemory`:
  0.69 MB before the session, **52.8 MB** after it with float32 weights and
  **44.4 MB** with float16; JS heap 9 to 13 MB of that. The peak during a run
  was not separated from the test page's own audio buffers.
- The WebGPU beats were identical to the wasm beats on all 40 windows tried.

### 8.3 Graded, pooled over the six recordings (MEASURED)

Phase against beat_this `final0`, the same family, so every "on" number for a
row that uses the model is an upper bound (section 3).

| detector | exact | octave | on / half off | jumps / min | flips / min | no steady beat | shown right | shown wrong | ms per s of audio |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tempo.mjs` today | **84.3** | 5.1 | 81.3 / 8.0 | 3.8 | 2.0 | 25.0 | **75.9** | **5.0** | **4.1** |
| model alone, every 2 s | 78.2 | 8.1 | **92.4 / 4.5** | **1.6** | 6.1 | 0 | 78.2 | 21.8 | 276 |
| model alone, shown only when its beats are regular (spacing CV under 0.1) | 78.2 | 8.1 | 92.4 / 4.5 | 1.6 | 6.1 | 34.6 | 63.9 | 4.8 | 276 |
| our tempo, the model's phase every window | 84.3 | 5.1 | 86.2 / 6.8 | 5.1 | 2.0 | 25.0 | 75.9 | 5.0 | 280 |
| **our tempo, the model's phase with memory** (adopted after two windows in a row disagree by over 1/8 beat) | 84.3 | 5.1 | **86.7 / 5.6** | **2.3** | 2.0 | 25.0 | 75.9 | 5.0 | 280 |
| same, a window every 4 s | 84.3 | 5.1 | 84.1 / 5.4 | 1.2 | 2.0 | 25.0 | 75.9 | 5.0 | 146 |
| same, a window every 8 s | 84.3 | 5.1 | 78.2 / 7.8 | 1.3 | 2.0 | 25.0 | 75.9 | 5.0 | 79 |

Per recording, the hybrid with memory against `tempo.mjs`, on the beat:
Raadio 2 86.8 against 91.5, Raadio 4 90.4 against 89.1, Ida 10-11 97.7
against 97.4, **Ida 1314 95.5 against 87.4**, **Ida 1354 72.1 against 63.6**,
Ida 1434 86.6 against 80.6.

- **The model does not help the number a visitor reads.** Alone, its tempo is
  exact 78.2% against our 84.3% and flips three times as often; given a
  confidence of its own it shows right 63.9% against our 75.9% at the same
  5% wrong. In the hybrid the number, the confidence and therefore shown
  right and wrong are ours, unchanged.
- **What it buys is the grid: +5.4 points on the beat and 1.5 fewer jumps a
  minute**, against its own family.
- ⚠️ **Against essentia's beats, the independent reference, the gain is
  zero:** on / half off 71.7 / 11.0 for the hybrid with memory against 72.0 /
  12.9 for `tempo.mjs`, per recording 25/70, 88/6, 95/1, 96/2, 49/7, 72/6
  against 39/59, 88/4, 95/2, 88/8, 52/14, 75/3. It wins on Ida 1314 (+8) and
  loses Raadio 2 (-14), where essentia sits on the hats and the hand counted
  kick grid of 2026-10-11 sides with beat_this. So the gain is real on Ida 1314
  by both references and otherwise rests on beat_this grading beat_this.

### 8.4 Recommendation: do not ship it in the tab; at most an opt-in page

1. **Not by default.** 27.6% of a core on one thread (68 times `tempo.mjs`),
   6 to 7 MB before the first beat, a Worker the page does not have, for a
   grid gain of 5.4 points measured against the model's own family and zero
   against the independent one. The tempo number and what is shown right or
   wrong do not move at all.
2. **An opt-in is defensible only as its own concept page**, "a neural beat
   tracker in the tab", and only in this shape: our tempo and confidence, the
   model's phase with memory, a window every 4 s (84.1 / 5.4, 1.2 jumps,
   14.6% of a core), float16 weights, WebGPU when the browser has it (47 ms a
   window here) and wasm in a Worker when it does not, loaded on a press.
3. **Before either, listen.** The places in the plan's "Where to listen"
   table, Ida 1314 from 1:00 to 4:00 first, decide whether beat_this's grid
   is the right one. If it is, item 1 of the plan already got most of the way
   there for 0.4% of a core.

### 8.5 What could not be measured

- **No phone and no Safari.** Every cost is this laptop in headless Chrome.
  A phone's wasm is likely several times slower (ESTIMATED), which would put
  a 2 s cadence past real time.
- **The WebGPU run's GPU time and the GPU process's CPU** were not counted,
  and it was 40 windows of one recording.
- **A Worker** was not built, so the main thread blocking and any proxy
  overhead are unmeasured.
- **The download time** on a real network: the files came from a local
  server. Whether positron.studio's worker would serve the wasm and the model
  compressed was not checked.
- **int8 quantisation** needs onnxruntime's Python quantiser, which is not in
  the venv and was not installed.
- **The live path**: the test page read decoded recordings, not
  `createMp3Stream` with its gaps.
- **Peak memory** during inference, separately from the page's buffers.
- Every phase number still has beat_this as its reference; no human labels.
