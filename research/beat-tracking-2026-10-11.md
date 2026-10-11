# Beat phase on /concepts/radio/020/: why the beats land on the upbeat (2026-10-11)

Asked: *"beats are often upbeat"*, then *"radio 2 is upbeat. not good. freq
analsis?"*. The page is `demo/concepts/radio/020/index.html`, the detector in
`detBuild`, `detHop` and `detEstimate`.

How to read this file. **Measured** means a script in the scratchpad produced
the number from the two recordings below. **Inference** is reasoning about a
measurement and is marked. No browser was opened and nothing was fetched from
ERR or any other broadcaster. The page's code was ported to Node and run
offline.

Recordings, our own R2 copies, decoded to mono float at 44.1 kHz:

- `https://positron-station.kristjan-jansen.workers.dev/media/radio/raadio2/2026-10-11.mp3` (183 s)
- `https://positron-station.kristjan-jansen.workers.dev/media/radio/raadio4/2026-10-11.mp3` (183 s)

Scripts: `scratchpad/beat/` of session `371338a2`. `truth.mjs` and `grid.mjs`
build the truth, `page.mjs` is the port, `algos.mjs` the candidates, `eval.mjs`,
`t2.mjs` to `t6.mjs` the measurements, `bands.mjs` and `bars.mjs` the band
pictures.

## 1. The answer in four lines

- **Measured.** On Raadio 2 the page puts **48%** of its drawn beats exactly half
  a beat off the kick and **50%** on it. Only **2%** are anywhere in between.
  It is a clean half beat flip, not a latency.
- **Measured.** In Raadio 2's first song (0 to 25 s, 130 bpm) it is on the
  upbeat **98%** of the time. In the second song (31 to 114 s, 127 bpm) it flips
  between the two, **66%** on and **32%** off.
- **Cause, measured.** The phase is taken from the sum of four bands, and the
  band above 4 kHz is the hi-hat, which in this music sits on the offbeat. In
  song 1 the hat band's onsets are **1.93 times** stronger on the offbeat than
  on the beat, and the low band cannot outvote it because it carries the kick
  on the beat AND the bass on the offbeat (ratio **0.89**, nearly a tie).
- **Fix, measured.** Take the phase from a hat-free, low weighted envelope with
  a pulse train correlation, and score the hats half a beat later. Drawn beats
  on the kick go from **50% to 96%**, half a beat off from **48% to 3%**, for
  **0.7 to 0.9 ms of CPU per second of audio** more (3.3 to 4.0 or 4.2 ms/s).

## 2. Ground truth: where the kick really is

### How it was made

1. The audio low passed at 300 Hz (two zero phase biquads), decimated to 2205 Hz.
2. In every 6 s stretch, the six sharpest low band energy rises (10 ms against
   the 10 ms before) are candidate kick templates, 100 ms long from 5 ms before
   the rise.
3. Each candidate is cross correlated (normalised) with the whole recording.
   Hits are correlation peaks over **0.7**.
4. A template is kept only if, within 15 s of where it came from, more than 80%
   of its hits are one or two periods apart for one period between 0.40 and
   0.55 s. A produced track repeats one kick sample, so its hits match at 0.85
   to 0.97. A bass note changes pitch and does not.
5. Kicks from all kept templates are merged. Runs of six or more kicks one to
   four periods apart become the truth grid, fitted locally (a straight line of
   beat index against time over the kicks within 4 s).

### How good it is

- **Raadio 2: strong. Measured.** 201 kicks, 194 inside runs. Each kick sits a
  median **0.8 ms** (p90 3.1 ms) from its local grid. Runs: 0 to 12.6 s and 13.9
  to 24.6 s at **130.0 bpm**; 31.3 to 44.1, 46.4 to 53.5, 61.6 to 74.3, 76.7 to
  87.5 and 91.8 to 114.0 s at **127.0 bpm**. The gaps are breaks with no kick.
  After 125 s a third song starts with no drums.
- **The kick is the beat. Checked by eye on spectrograms** (`ffmpeg
  showspectrumpic`) at 10, 16 and 60 s: every truth hit is the kick's falling
  pitch sweep (about 300 Hz down to 50 Hz in 50 ms), and the broadband hi-hat
  bursts sit half way between two of them. The owner's ear agrees with the
  truth: the page is on the upbeat on Raadio 2.
- **The true tempo of song 2 is 127.0, not the 127.5 written in the page's
  comment.** The 127.5 came from an inter-onset median, the kick grid fits 127.0
  over 80 s. It does not cause the flip (section 3.4).
- **Raadio 4: thin. Measured.** Only 21 kicks in three short runs (31 to 36, 52
  to 60, 77 to 81 s, about 127.6 bpm). At a 0.55 threshold it finds 117 but the
  p90 residual is 217 ms, so hits land on offbeats too and that set was thrown
  away. Raadio 4 does not use one repeated kick sample, or the kick is not on
  every beat. Every method in this file scores 100% on the beat there, so
  **Raadio 4 does not discriminate between methods** and everything below rests
  on Raadio 2.

## 3. The page as shipped, measured against that truth

The port is line by line: WebAudio's biquad formulas (lowpass and highpass Q in
dB, bandpass Q linear), the 10 Hz two pole follower, `log1p(1e4 * e)` rises
every 256 samples, the 12 s window, the score at 1, 2 and 4 beats plus half a
beat, the 120 bpm prior, `STICK`, the median of five, the phase loop over the
last 4 s, `fresh` beats as drawn, and the fx drum booked 120 ms ahead on the
newest grid with confidence 0.5 or more.

### 3.1 Phase, Raadio 2

| what | n | on the kick (within 1/8 beat) | half a beat off (3/8 or more) | between |
| --- | --- | --- | --- | --- |
| drawn beats | 194 | 50% | 48% | 2% |
| fx drum hits | 186 | 48% | 48% | 3% |
| song 1, drawn | | 0% | 98% | |
| song 2, drawn | | 66% | 32% | |

Per 6 s stretch (`UP` is 60% or more on the offbeat, `ON` 60% or more on the
kick, `mx` is mixed), drawn beats:

```
 0 UP   6 UP  12 UP  18 UP  24 UP  30 mx  36 ON  42 mx  48 ON  60 mx
66 ON  72 mx  78 UP  84 UP  90 ON  96 ON 102 ON 108 ON 114 ON
```

The grid changed side between consecutive readings **28** times.

### 3.2 Which band pulls it: one beat folded on the kick grid

Each band's onset strength (the page's own log rise per hop) averaged over 16
bins of one beat, bin 0 the kick. Ratio is the offbeat (bins 7 to 9) over the
beat (bins 15, 0, 1). Above 1 pulls the phase onto the upbeat.

Song 1, 0 to 24.6 s, 130 bpm:

| band | beat | offbeat | ratio |
| --- | --- | --- | --- |
| page low, under 150 Hz | 0.064 | 0.057 | 0.89 |
| page 400 Hz | 0.068 | 0.060 | 0.88 |
| page 1500 Hz | 0.070 | 0.061 | 0.88 |
| **page over 4 kHz** | 0.094 | **0.181** | **1.93** |
| **page sum, what the phase step sees** | 0.295 | **0.359** | **1.21** |
| sub under 120 Hz | 0.087 | 0.074 | 0.85 |
| low mid 250 Hz | 0.076 | 0.073 | 0.95 |
| snare and clap, 150 Hz to 4 kHz | 0.064 | 0.058 | 0.90 |
| hats over 6 kHz | 0.088 | 0.209 | 2.36 |

Song 2, 31 to 114 s, 127 bpm:

| band | beat | offbeat | ratio |
| --- | --- | --- | --- |
| page low, under 150 Hz | 0.111 | 0.012 | 0.11 |
| page 400 Hz | 0.091 | 0.030 | 0.34 |
| page 1500 Hz | 0.046 | 0.049 | 1.05 |
| **page over 4 kHz** | 0.049 | **0.129** | **2.64** |
| page sum | 0.296 | 0.220 | 0.74 |
| sub under 120 Hz | 0.122 | 0.016 | 0.13 |
| hats over 6 kHz | 0.049 | 0.147 | 2.98 |

In song 1 the hat band gives the offbeat a lead of 0.087 and the other three
bands together give the beat back only 0.026. In song 2 the low band is clean
(0.11) and the sum leans to the beat on average, but the margin is small enough
that a 4 s pick flips (section 3.1).

### 3.3 Two bars, band by band, against the shipped grid

Sixteenths across. `1 . + .` is a beat, its sixteenths and its offbeat. `K` is
a truth kick, `|` a beat on the page's grid at that moment. Each band row is
its strongest onset in that sixteenth, scaled to its own maximum (` .:-=+*#%@`).

Raadio 2 from 16.24 s, 130 bpm, song 1:

```
                          1.+.2.+.3.+.4.+.5.+.6.+.7.+.8.+.
kick truth (template)     K   K   K   K   K   K   K   K
page grid (shipped)         |   |   |   |   |   |   |   |
sub/kick <120 Hz          = @+* @*- -+@ -.= %#* @*- :+% :.
low mid ~250 Hz           =.=-- @.=*:-:.:.+ ==- @.=%::= .
snare/clap 150 Hz-4 kHz   : . . @ :. :. ..: . . @ :. -.  .
hats >6 kHz               - %.::+ : *.: # - @ :.% : *.:.*
page sum (4 bands)        - =.:.@ =:--- -.- =.:.@ -.-=: :.
```

The page's grid sits exactly on the `+`. The sub band's biggest rises are on
the `+` too: the bass comes back in on the offbeat after the kick's dip, and in
the log domain that rise is bigger than the kick's. The loudest single burst
in the page sum is a clap or open hat on the `+` of beats 2 and 6.

Raadio 2 from 92.27 s, 127 bpm, song 2:

```
                          1.+.2.+.3.+.4.+.5.+.6.+.7.+.8.+.
kick truth (template)     K   K   K   K   K   K   K   K
page grid (shipped)       |   |   |   |   |   |   |   |
sub/kick <120 Hz          :- %.-.--- :@: #=- *:-:--::-+:.%
low mid ~250 Hz           : ::. .:* .@@  -: .:-  .#  -#  -
snare/clap 150 Hz-4 kHz    ..  +:.. -=@::: ...  :.+. =*: :
hats >6 kHz                 = @ +.  *: :=.  + *. .. *:..=:
page sum (4 bands)        . ::*:-::.=+@-:=. =:=.:.+.-+*-:-
```

Here the grid is on the kick, and the hats are on every `+`.

### 3.4 Why it lands on the upbeat

Measured:

- **The hat band decides the phase.** Removing it alone (weights 1, 0.5, 0.25,
  0 in the page's own phase step) moves drawn beats on the kick from 50% to
  **76%**.
- **Not the tempo.** Feeding the page's phase step the TRUE tempo from the kick
  grid: 51% on, 49% off, song 1 0% on. The 127.5 against 127.0 changes nothing.
- **Not a latency.** Beats that are on the kick are drawn a median **7 ms** late
  (the causal filters and the 10 Hz follower). 2% of beats are between. A
  constant delay would smear the error, not split it into 0 and 0.5.
- **The 4 s max sum pick is noisy.** On the same hat free envelope a pulse
  train correlation over 6 s weighted toward the newest beats gets **88%**
  against the page step's **76%**.

Inference, from the measurements above:

- Each band is log compressed separately (`log1p(1e4 * e)`), so a quiet hat's
  rise counts as much as a loud kick's. Loudness, which is what a listener uses
  to find the kick, is thrown away before the bands are summed.
- The band under 150 Hz is the kick AND the bass. In side chained dance music
  the bass ducks under the kick and comes back on the offbeat, so that band has
  two onsets a beat and the bigger log rise is often the bass coming back.
- So the only band that should anchor the phase is split in two, and the one
  band that is unambiguous is unambiguous about the OFFBEAT.

### 3.5 Clock and scheduling offsets

- **Measured, offline:** drawn beats on the kick are 7 ms late (shipped) to 11
  ms late (recommended). That is 1/40 of a beat.
- **The 120 ms `AHEAD_S` is not a shift.** Kicks are booked at the grid's own
  times on the audio clock. It only means a grid that arrives later than 120 ms
  before a beat does not move that beat. In the port the fx hits score the same
  as the drawn beats (48% against 50%).
- **Not measured, needs a browser:** whether `e.playbackTime - len / sr` is the
  context time of the ScriptProcessor's first input sample in Chrome and Safari,
  and the `outputLatency` between `currentTime` and the speaker. Both are
  constant offsets of milliseconds to tens of milliseconds. Neither can make a
  235 ms half beat.

## 4. Every method, measured on Raadio 2

Phase: drawn beats within 1/8 beat of a kick, and 3/8 or more off. Tempo: the
readings within 1% of the kick grid's tempo. "127 from" is the first reading
after which ten in a row are within 1% of 127.0 (song 2's kicks start at 31.3
s). CPU is Node 25 on an Apple M2 Pro, single thread, milliseconds per second
of audio for the whole detector (envelope 1.1 ms/s of it). Raadio 4 scored 100%
on the kick and 0% off for every method and is left out of the table.

| method | on | half off | flips | tempo within 1% | 127 from | CPU ms/s |
| --- | --- | --- | --- | --- | --- | --- |
| page as shipped (4 band sum, 4 s max sum) | 50% | 48% | 28 | 93% | 37.4 s | 3.3 |
| page phase step on low band only | 63% | 25% | 37 | 93% | 37.4 s | 3.3 |
| page phase step on a kick band (under 120 Hz, 24 dB/oct, 20 Hz follower) | 44% | 32% | 61 | 93% | 37.4 s | 3.9 |
| page phase step on weighted sum, hats out (1, .5, .25, 0) | 76% | 23% | 21 | 93% | 37.4 s | 3.3 |
| (b) pulse train on the 4 band sum | 49% | 51% | 27 | 93% | 37.4 s | 3.6 |
| (b) pulse train on the kick band | 56% | 26% | 59 | 93% | 37.4 s | 4.2 |
| (b) pulse train on weighted sum, hats out | 88% | 12% | 17 | 93% | 37.4 s | 3.9 |
| (b) pulse train, kick band + hats on the offbeat | 79% | 17% | 35 | 93% | 37.4 s | 4.6 |
| (b) pulse train, low band + hats on the offbeat | 93% | 7% | 13 | 93% | 37.4 s | 4.6 |
| **(b) pulse train, weighted sum + hats on the offbeat, beta 1** | **96%** | **3%** | **9** | 93% | 37.4 s | **4.0** |
| same, beta 0.25 | 94% | 6% | | 93% | 37.4 s | 4.0 |
| same, beta 2 | 97% | 1% | | 93% | 37.4 s | 4.0 |
| same, 4 s span, no recency weight | 93% | 6% | | 93% | 37.4 s | 4.0 |
| same, plus a two reading hysteresis on flips | 92% | 8% | 9 | 93% | 37.4 s | 4.0 |
| (c) DP beat tracker (Ellis 2007), 8 s, on the 4 band sum | 53% | 45% | 19 | 93% | 37.4 s | 3.8 |
| (c) DP beat tracker, on the kick band | 26% | 41% | 54 | 93% | 37.4 s | 4.4 |
| (c) DP beat tracker, on weighted sum, hats out | 57% | 21% | 48 | 93% | 37.4 s | 4.5 |
| (c) DP, beat two back projected forward, weighted sum | 56% | 20% | | 93% | 37.4 s | 3.8 |
| (d) phase lock (moves 40% of a big jump) over (b) kick + hats | 77% | 13% | 30 | 93% | 37.4 s | 4.6 |
| (d) comb resonator bank, tempo and phase, 4 band sum | 54% | 44% | 27 | 97% | 33.9 s | 1.4 |
| (d) comb resonator bank, tempo and phase, kick band | 49% | 27% | 64 | 90% | 33.4 s | 2.0 |
| tempo: 8 s window, phase (b) weighted + hats | 96% | 3% | 9 | 95% | 35.4 s | 3.2 |
| tempo: 20 s window, phase (b) weighted + hats | 96% | 3% | 9 | 88% | 41.4 s | 5.6 |
| tempo: online Viterbi over the page's score, phase (b) weighted + hats | 96% | 3% | 9 | 93% | 36.9 s | 4.3 |
| **tempo: comb resonator bank, phase (b) weighted + hats** | **98%** | **2%** | 10 | **97%** | **33.9 s** | **2.1** |
| tempo: page's step on the kick band, phase (b) kick + hats | 63% | 24% | 46 | 51% | 35.4 s | 4.6 |

Blank flips were not counted for that row.

Tempo error in bpm, Raadio 2, median and p90 of every reading against the kick
grid: shipped 0.09 and 0.34; 8 s window 0.11 and 0.34; 20 s 0.13 and 1.96;
Viterbi 0.10 and 0.31; comb bank **0.02 and 0.07**. The bank steps in 0.5 bpm
and both songs happen to sit on that grid (130.0, 127.0), so its 0.02 is partly
luck. Its honest error is up to 0.25 bpm.

What the parts of (b) are worth, each measured on its own:

- hats out of the phase envelope, same page step: 50% to 76%
- pulse train (Gaussian 12 ms kernel, 6 s, newer beats weighted with a 3 s
  decay) instead of the 4 s max sum: 76% to 88%
- hats scored half a beat later, beta 1: 88% to 96%

Where the remaining 3% are (measured): the first 4 s of the file while the
window fills (3.0 and 4.0 s), and the first beats after a break when the kick
comes back (31.6, 46.2 to 47.2, 61.3 s). Confidence there reads 0.61 to 0.91, so
the confidence does not see them.

The DP tracker did badly here. **Inference:** it has no notion of which band is
the beat, and allowing the period to stretch lets the grid drift onto the
offbeat bass and hats. Its known strength is offline whole song tracking with
backtracking, which a live 8 s window throws away.

## 5. Recommendation, in priority order

### 5.1 Take the phase from a hat free envelope with a pulse train, and score the hats on the offbeat

The one change that fixes the report. Measured on Raadio 2: on the kick 50% to
**96%**, half off 48% to **3%**, flips 28 to 9, CPU 3.3 to **4.0 ms/s**. The
tempo step is not touched.

In the page:

1. Keep each band's rise, not only the sum. In `detBuild` add
   `bands: BANDS.map(() => new Float32Array(n))` to `t`. In `detHop`, store
   `t.bands[b][t.w] = Math.max(0, l - t.prev[b])` for each band before
   `t.prev[b] = l` (the sum into `t.env` stays as it is, the tempo step keeps
   using it).
2. Add constants:
   `const PH_W = [1, 0.5, 0.25, 0], HAT = 3, HAT_BETA = 1, PH_SPAN_S = 6, PH_SIG_S = 0.012, PH_DECAY_S = 3;`
3. Replace the phase block in `detEstimate` (from `const P = 60 / t.est * rate`
   to `t.beatAt = ...`) with:

```js
const P = 60 / t.est * rate, span = Math.min(N, Math.round(PH_SPAN_S * rate));
const sg = PH_SIG_S * rate, R = Math.ceil(2 * sg);
const low = new Float32Array(span), hat = new Float32Array(span);
for (let i = 0; i < span; i++) {
  const j = (t.w - span + i + t.n) % t.n;
  for (let b = 0; b < BANDS.length; b++) low[i] += PH_W[b] * t.bands[b][j];
  hat[i] = t.bands[HAT][j];
}
const near = (e, c) => { let s = 0; for (let d = -R; d <= R; d++) { const i = Math.round(c + d); if (i >= 0 && i < span) s += Math.exp(-0.5 * ((i - c) / sg) ** 2) * e[i]; } return s; };
let bestPh = 0, bestSum = -Infinity;
for (let ph = 0; ph < P; ph += 0.5) {
  let sum = 0;
  for (let j = 0; ; j++) {
    const c = span - 1 - ph - j * P;
    if (c < R) break;
    const w = Math.exp(-(j * P / rate) / PH_DECAY_S);
    sum += w * (near(low, c) + HAT_BETA * near(hat, c + P / 2));
  }
  if (sum > bestSum) { bestSum = sum; bestPh = ph; }
}
t.beatAt = t.newest - bestPh / rate;
```

It reads the raw rises, not the running mean `x`. This exact code, run over the port (`t6.mjs`), measured **97%** on the kick and **3%** half off for drawn beats, 95% and 3% for the fx drum, 9 flips, 4.2 ms/s. CPU figures move by about 0.3 ms/s between runs. The beats on that grid and
the fx drum follow from `t.beatAt` with no other change.

4. Rewrite the comment block's step 6 and the "WHY" paragraph in the same
   commit, and correct its 127.5 to 127.0 (the kick grid's tempo).

### 5.2 Optional: shift the drawn and booked beat 11 ms earlier

Measured offline, the recommended grid is a median 11 ms late against the kick
onset (the causal filters and the follower). `t.beatAt = t.newest - bestPh /
rate - 0.011`. Small: 1.5 px on a 600 px, 4 s wave, and a just audible flam
against the radio's own kick. Worth doing only after a browser check of the
clock offsets in 3.5, which could be of the same size in either direction.

### 5.3 Optional: the tempo from a comb resonator bank

Measured: within 1% 93% to **97%**, the move to song 2's 127 found 3.5 s
sooner (33.9 against 37.4 s), and the whole detector cheaper (2.1 against 4.0
ms/s with 5.1 in), because 281 resonators at 172 Hz is less work than a 696 lag
autocorrelation every half second. It is a rewrite of the tempo step (state per
resonator, a 2048 sample ring each, about 2.3 MB of Float32), and the page's
tempo already reads right, so it is not needed for the reported fault. The
confidence the page sends would need a new definition. An 8 s window in the
existing step gets part of it (95%, 35.4 s) for a one constant change, but the
12 s window was chosen against the 3:2 confusion, which only Raadio 2 and 4
were checked for.

Not recommended, measured: the DP tracker, the phase lock as built, the
hysteresis, a 20 s tempo window, and any phase from the kick band alone (the
sub band carries the offbeat bass).

## 6. What could not be settled

- **One recording discriminates.** Raadio 2 has two songs and 194 truth kicks.
  Raadio 4's truth is 21 kicks and every method scores 100% there. The weights
  (1, 0.5, 0.25, 0) and beta 1 were chosen on Raadio 2, so 96% is an in sample
  number. A third recording with a steady kick is needed to call it general.
- **The hats on the offbeat term is a dance music prior. Inference:** where hats
  play straight eighths they land on both sides and the term is neutral. Where
  the loudest high band hits are ON the beat (some rock and pop, a shaker on the
  beat), it would pull the wrong way. Without it the method is 88% on Raadio 2,
  which is the floor if the prior is wrong for a song.
- **Bars and downbeats** were not attempted. Song 1 has a clap or open hat on the
  `+` of beat 2, so "snare on 2 and 4" would not have found its bar either.
- **The browser clock**: ScriptProcessor `playbackTime` semantics in Chrome and
  Safari, `outputLatency`, and the analyser's alignment with `currentTime` were
  not measured, because no browser was opened. They are constant offsets in
  milliseconds, not half beats.
- **CPU** is Node on an M2 Pro. In the page the biquads run natively and only
  the follower loop and the estimate are JavaScript, so the browser's main
  thread share is likely lower than the table (inference). A phone was not
  measured.
- **Raadio 4's last minute** has no steady beat and was not scored. Nothing here
  changes how the confidence falls there.
