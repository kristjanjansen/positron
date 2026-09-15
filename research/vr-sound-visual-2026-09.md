# Visualising a live MP3 stream in VR — a throbbing, waving floor (2026-09-14)

Companion to `research/quest-xr-2026-09.md` (the headset), `plan-visuals.md`
(which side of the wire a picture is made on), and `demo/floor/index.html`
(an infinite instanced WebXR floor that already exists).

The question: **how do you drive a floor from a live MP3 stream of ambient /
experimental music that usually has no rhythm?**

Every claim is tagged **MEASURED** (a command was run and its output is quoted),
**DOCUMENTED** (a spec, vendor or paper says so, with a URL), **ESTIMATED**
(arithmetic on measured values, shown), or **UNCONFIRMED** (nobody here has
checked).

⚠️ Nothing was built. This is research; there is no page to open.

---

## 0. The short answer

**Four findings, and three of them cut against the obvious design.**

1. 🔴 **The music's loudness envelope lives at 0.025 Hz — a 40-second swell —
   and 78% of its modulation power is below 0.1 Hz.** MEASURED on 98.5 s of
   Radio 1965. Above 1 Hz there is **1.1%**. So there is nothing for a
   beat-reactive visual to react to, and this is measured rather than assumed:
   a spectral-flux tempo detector that scores **r=0.992 on a 120 BPM control**
   scores **0.169** on the station, against **0.031** on pink noise.

2. 🔴 **That is also what makes the floor safe, and it is a coincidence you can
   destroy.** ISO 2631-1 weights **0.1–0.5 Hz** hardest for motion sickness,
   peaking near **0.17–0.23 Hz** (DOCUMENTED). The music sits about **three
   octaves below that peak** (0.025 Hz against 0.2 Hz). **A floor that follows
   the sound faithfully is comfortable by construction; a floor that "helps" —
   an AGC, an added pulse, a fast attack — moves the energy up into the
   sickness band.** Honesty and
   comfort agree here, which is rare, and the way to lose both is the same edit.

3. 🔴 **Do not bind the throb to the bass.** MEASURED: 20–60 Hz is **1.8% of
   total energy** and has the **narrowest** dynamic range of any band (17.4 dB).
   The energy is at **1–2 kHz (30.1%)**, 60–125 Hz (19.8%) and 2–4 kHz (19.3%),
   and the widest-moving bands are the **mids and highs** (50–52 dB of range).
   The instinctive mapping — sub-bass drives the floor — binds the biggest
   visual gesture to the quietest, flattest signal in the piece.

4. **Dynamic range is 22.9 LU (LRA), p10–p90 = 25.5 LU.** MEASURED. A linear
   amplitude → height map leaves the floor flat ~90% of the time: −40 LUFS is
   0.01 in amplitude. **Map in dB/LUFS, with fixed anchors at the measured
   percentiles**, not in amplitude and not through a hidden AGC.

**The recommendation: a modal plate (Chladni), not a spectrum bar-chart and not
a noise field.** Sum ~24 plate eigenmodes whose amplitudes are the energies of
~24 log-spaced bands. A sustained drone becomes a *stable standing pattern*; a
spectral change morphs it. It holds still when the music holds still, which is
the one behaviour a rhythm-less piece needs and a beat-driven visual cannot do.
It costs no render targets and no feedback buffer — pure ALU per vertex.

**And put the fast signal in light, never in geometry.** Brightness (spectral
centroid) moves **120 Hz per 46 ms frame at p50, 557 Hz at p90** — it is the
lively axis in this music while level is the slow one. Geometry carries the slow
swell; colour carries the fast change. That is the comfort rule and the
legibility rule reaching the same conclusion.

---

## 1. What the material actually is — MEASURED

### 1.1 The capture

The source is the station this repo already relays. MEASURED 2026-09-14 12:41 UTC,
`curl -D -` against `https://shout.positron.studio/radio.mp3`:

```
access-control-allow-origin: *
icy-name: Radio 1965
icy-description: Improvisations by EMA
icy-genre: Avant-garde
icy-metaint: 16000
x-shout-ttfb: 125
```

98.5 s captured; `ffprobe` reads **mp3, 44100 Hz, 2 ch, 128,018 bit/s** —
matching the 128.076 kbit/s already recorded in `demo/radio/index.html`.
The relay is live, CORS-open, and first byte in 125 ms. ⚠️ **One 98.5 s capture
of one station at one time of day.** Every percentile below is from that
capture; a different hour will differ, and §3.5 says what to do about it.

### 1.2 There is no beat — with a control that proves the detector works

Spectral flux over 2048-sample windows at an 11.6 ms hop, detrended by a 1 s
moving average, autocorrelated over 0.25–2.0 s lags, **local** maxima only:

| signal | local peaks | best | autocorr range | prominence over median |
|---|---|---|---|---|
| **120 BPM click** (positive control) | 3 | **r=0.992 at 0.499 s = 120.2 BPM** | −0.053 … 0.992 | 1.044 |
| **pink noise** (negative control) | 31 | r=0.031 at 1.149 s | −0.024 … 0.031 | 0.033 |
| **Radio 1965** (live) | 19 | r=0.169 at 0.348 s | −0.153 … 0.189 | 0.250 |

MEASURED. The station is **much closer to pink noise than to a beat**: 17% of
the control's periodic strength, spread over 19 weak local peaks rather than
concentrated in one.

⚠️ **The first version of this measurement reported "224.7 BPM" and was wrong.**
Without detrending, the autocorrelation of the flux is dominated by the slow
loudness drift, so *every* lag reads high (min 0.350, median 0.417) and the
global maximum is simply the shortest lag tested. A monotone decay has no local
peak; taking `max()` over it manufactures a tempo out of a smooth signal. This
is CLAUDE.md's *"a partial result that is too tidy is a broken collector"* in its
tempo costume — **and the only reason it was caught is that a click track was run
through the same code.**

⚠️ **An onset picker still fires constantly, and that is the trap.** With an
adaptive threshold the same flux yields **194 onsets in 98.5 s — 118 per
minute**, roughly two a second, with no periodicity behind them. A visual driven
by that gets a steady drizzle of flashes that *looks* like it is working and is
picking texture, not events. **An onset detector on this material does not fail
loudly; it fails by always answering.**

### 1.3 The loudness envelope, and where it lives

EBU R128 momentary loudness (400 ms window, one value per 100 ms), 985 values:

```
p01 -63.1   p10 -40.0   p50 -21.6   p90 -14.5   p99 -12.5 LUFS
|dM| per 100 ms:  p50 0.42   p90 1.71   max 13.31 LU
```

DFT of that envelope (Hann, 10 Hz sample rate), power by band — MEASURED:

| band | share of envelope modulation power |
|---|---|
| **0.02–0.1 Hz** | **78.1%** |
| 0.1–0.5 Hz | 16.7% |
| 0.5–1 Hz | 4.0% |
| 1–2 Hz | 0.9% |
| 2–5 Hz | 0.2% |

**Strongest modulation at 0.025 Hz — a 40-second period.** This is the single
most useful number in the document: it says the visual's primary gesture should
take about **half a minute**, not half a second.

And yet `|dM| max = 13.31 LU in 100 ms`: the piece is improvised, so there are
silences and sudden entries. **Both timescales are real** — a 40 s swell and a
handful of violent 13 LU steps — and §2.3 says they must go to different
channels.

### 1.4 Where the energy is — the bass trap

2048-point FFT, 43 ms hop, 2307 frames. Levels in dB relative to the full-band
median; "own dynamic range" is that band's own p90 − p10. MEASURED:

| band (Hz) | share | p10 | p50 | p90 | own range |
|---|---|---|---|---|---|
| 20–60 | **1.8%** | −42.5 | −33.1 | −25.2 | **17.4 dB** |
| 60–125 | 19.8% | −37.1 | −18.3 | −7.0 | 30.1 dB |
| 125–250 | 5.8% | −44.9 | −27.0 | −6.2 | 38.7 dB |
| 250–500 | 6.7% | −40.1 | −21.6 | −7.0 | 33.1 dB |
| 500–1k | 14.5% | −34.2 | −15.1 | −3.4 | 30.7 dB |
| **1k–2k** | **30.1%** | −44.0 | −8.6 | +6.0 | **50.0 dB** |
| 2k–4k | 19.3% | −48.6 | −12.0 | +3.7 | **52.3 dB** |
| 4k–8k | 1.7% | −55.1 | −36.0 | −5.8 | 49.2 dB |
| 8k–12k | 0.3% | −57.0 | −41.8 | −22.1 | 34.9 dB |

🔴 **Sub-bass is 1.8% of the energy and the flattest band there is.** A floor
bound to 20–60 Hz would barely move, and what movement it had would be the least
expressive signal in the piece. The mids carry both the energy and the range.

**The top octave is the codec's opinion, not the music's.** MEASURED at full
44.1 kHz rate: **12–16 kHz is 0.015% of energy at p50** (0.415% at p90) and
**above 16 kHz is 0.0000% at p50** (0.0038% at p90). At 128 kbit/s there is
effectively nothing above 16 kHz. ⚠️ **Never drive a visible channel from a band
the encoder discards** — it will read as "the sparkle stopped" when what changed
was the bitrate.

### 1.5 What moves fast: brightness, not level

`aspectralstats`, 4096-point Hann windows, 46 ms frames, 2122 frames. MEASURED:

| feature | p10 | p50 | p90 |
|---|---|---|---|
| spectral centroid | 1373.7 Hz | 2625.5 Hz | 3821.3 Hz |
| spectral flatness | 0.025 | 0.061 | 0.158 |
| spectral rolloff | 2034.9 Hz | 4285.1 Hz | 8796.3 Hz |
| spectral entropy | 0.020 | 0.100 | 0.324 |

`centroid |Δ| per 46 ms frame: p50 119.8 Hz, p90 557.4 Hz`.

So while the *level* is doing a 40-second swell, the *brightness* is moving
several hundred Hz several times a second. **The material is not slow — its
loudness is slow.** A visual that reads only level will look dead; one that
reads centroid will look alive, and it costs nothing extra.

Flatness spans 0.025 → 0.158, a 6× range: the piece really does move between
tonal and noisy, so **tone-vs-noise is a genuine axis**, not a constant dressed
as one. (CLAUDE.md: *a statistic that is constant by construction over your
subject is blind, not weak.*)

### 1.6 Stereo width is a free axis nobody maps

MEASURED, per 85 ms frame:

```
L/R correlation:      p10 0.406   p50 0.743   p90 0.949
side/mid energy:      p10 0.034   p50 0.173   p90 0.464
```

Width varies from near-mono to genuinely wide — a 13× span in side/mid energy.
In VR this is the one audio feature with an *obvious* spatial meaning: width
maps to how far across the floor a disturbance spreads, or to how much the left
and right halves of the field decorrelate. It is free (two dot products per
block, no FFT) and it is almost never used.

---

## 2. The comfort collision — and why it nearly resolves itself

### 2.1 The number that decides this

ISO 2631-1:1997 evaluates motion sickness over **0.1–0.5 Hz** in the vertical
axis, via the **Wf** weighting used for the Motion Sickness Dose Value; recent
work re-fitting it for pre-emesis symptoms puts the normalised peak at **0.23 Hz**
against the standard's ~0.17 Hz. DOCUMENTED
([ISO 2631-1 overview](https://blog.ansi.org/ansi/iso-2631-1-1997-whole-body-vibration/),
[DSC 2024](https://proceedings.driving-simulation.org/proceeding/dsc-2024/advancing-iso-2631-1-by-considering-pre-emesis-symptoms-in-carsickness/)).

**"Throbbing at breath rate" is 0.2–0.3 Hz. That is the worst possible choice**,
and it is the one a designer reaches for unprompted.

**The measured music is not there.** 78.1% of its envelope power is in
0.02–0.1 Hz and only 16.7% in 0.1–0.5 Hz. Following the envelope *as measured*
puts the dominant floor motion at **0.025 Hz**, roughly a factor of eight below
the peak.

### 2.2 The three edits that break it

Each of these is a normal, well-intentioned change that moves energy into
0.1–0.5 Hz:

1. **An AGC / adaptive normaliser with a short time constant.** It compresses
   the 40 s swell toward the middle and amplifies the faster wobble — it
   literally redistributes envelope power upward in frequency. If you must
   adapt, adapt over **minutes**, and show the gain (§3.5).
2. **A synthetic pulse "so it has some life".** Adding a 0.2 Hz LFO because the
   music is slow puts a pure tone at the nauseogenic peak.
3. **Fast attack on the level follower.** Turning the measured `|dM| max
   13.31 LU` step into an instantaneous vertical jump is a broadband vertical
   impulse with plenty of 0.1–0.5 Hz content.

### 2.3 The rules that follow

- 🔴 **Vertical, whole-field, in-phase heave is the one motion to avoid.** If
  every point of the floor rises and falls together, the floor is a piston and
  the viewer is standing on it. **Travelling waves and standing patterns are
  fine where pistonic heave is not**, because the mean height stays put and the
  visual system gets a stable ground reference.
- 🔴 **Keep the floor rigid under the viewer.** Ramp displacement amplitude from
  **0 within ~1.5 m** of the head's ground projection to full beyond ~3 m. The
  patch you are standing on is the rest frame. Rest frames are the
  best-evidenced VIMS mitigation there is —
  [static and dynamic rest frames](https://www.researchgate.net/publication/327331902_Visually-Induced_Motion_Sickness_Reduction_via_Static_and_Dynamic_Rest_Frames),
  [a "natural" independent visual background](https://www.researchgate.net/publication/273595001_A_Natural_Independent_Visual_Background_Reduced_Simulator_Sickness)
  (DOCUMENTED) — and here it costs one `smoothstep` on radius.
- **Send the sudden events somewhere that is not height.** The 13 LU steps
  become an expanding ring, a colour shift, or a brightening — not a step in Y.
- **Cap vertical velocity, not just amplitude.** Amplitude limits alone let a
  small displacement arrive violently.
- ⚠️ **Seated / standing changes the answer and nobody here has measured it.**
  All of the above is reasoned from the vibration literature, not from a trial
  on this content. UNCONFIRMED until somebody wears it for ten minutes.

---

## 3. Getting the signal, in the browser, on a headset

### 3.1 The CORS trap is already solved here — do not re-solve it

`demo/radio/index.html` records it: their mount is **plain HTTP on port
8001**, so an HTTPS page cannot load it at all, and Icecast omits
`access-control-allow-origin`, so `createMediaElementSource` on the raw
cross-origin element **yields a graph that outputs silence while the speakers
play normally.** The relay at `shout.positron.studio` fixes both. Use it; set
`audio.crossOrigin = 'anonymous'` before `audio.src`.

The **visual is in sync with the sound for free**, because both are downstream
of the same media element — whatever the stream's buffering is (seconds), the
analyser sees exactly the samples the ears get. This is `plan-visuals.md` §4.2's
rule: *analysis is the right signal for anything that must look like the sound,
computed in the browser, because that is the only place the picture and the
sound are on one clock.*

### 3.2 AnalyserNode settings for this material

- **`fftSize = 4096`** (92.9 ms window, 10.8 Hz/bin at 44.1 kHz). 2048 gives
  21.5 Hz/bin, which puts the whole 60–125 Hz band in 3 bins. The 93 ms latency
  is irrelevant against a 40 s gesture.
- 🔴 **`smoothingTimeConstant = 0`, and do your own smoothing in seconds.** The
  analyser's smoothing is applied **per call**, so the same page smooths
  differently at 60 fps on a desktop, 72, 90 or 120 fps on a Quest — a "time
  constant" that silently depends on frame rate. Filter with
  `a = exp(-dt / tau)` against a real `tau` in seconds instead.
- **Log-spaced bands, not raw bins.** 24 bands from 40 Hz to 12 kHz at ~1/4
  octave; anything above 16 kHz is codec noise (§1.4).
- **Level as K-weighted loudness, not raw RMS.** Two `BiquadFilterNode`s (a
  high-shelf and a high-pass) ahead of the analyser give the ITU-R BS.1770
  K-weighting, and then the page's level number is in the same units as every
  percentile in §1.3 — so the anchors below transfer directly instead of needing
  re-derivation.

### 3.3 Three timescales, explicitly

| channel | window | source | what it drives |
|---|---|---|---|
| **slow** | 3 s (R128 short-term) | K-weighted loudness | overall displacement, the 40 s swell |
| **breath** | 400 ms (R128 momentary) | K-weighted loudness | modal amplitudes |
| **fast** | 46–93 ms | centroid, flatness, width | colour, sharpness, spread |
| **rare** | event | a jump over 3 LU | a ripple, a flash |

A visual that reacts at only one of these looks either jittery or dead. The
threshold of 3 LU is picked off the measurement: `|dM|` p90 is 1.71 LU, so 3 LU
fires rarely and means something, where 1 LU would fire constantly.

### 3.4 The mapping table, with the measured anchors

| feature | measured p10 → p90 | maps to | note |
|---|---|---|---|
| momentary loudness | −40.0 → −14.5 LUFS | displacement 0 → 1 | **in LU, never in amplitude** |
| spectral centroid | 1374 → 3821 Hz | hue / brightness | the fast axis |
| spectral flatness | 0.025 → 0.158 | nodal-line sharpness | tonal → crisp, noisy → diffuse |
| side/mid energy | 0.034 → 0.464 | lateral spread | free, two dot products |
| band energies (24) | per §1.4 | modal amplitudes | mids carry the range |
| a jump over 3 LU | max seen 13.31 | expanding ring | not a step in height |

### 3.5 Fixed anchors, and say so

Use the percentiles above as **fixed** anchors rather than adapting. A hidden
AGC makes **silence look loud** — the page would show a lively floor during a
30-second gap, which is a confident measurement of nothing, exactly what
CLAUDE.md forbids. If adaptation is added later it must be over minutes, and the
**raw LUFS must be in a readout cell** so a reader can see the floor is being
driven by −45 LUFS of nothing.

### 3.6 ⚠️ The unknown that could sink this on day one

**Does an `<audio>` element playing a live stream keep playing when the page
enters an immersive session on the Quest Browser, and does its `AudioContext`
stay `running`?** UNCONFIRMED. Nothing authoritative was found; the immersive-web
samples mute on focus loss as a matter of etiquette, and there is at least one
Meta community report of audio being *"distorted, with a constant cracking/static
sound"* on entering VR mode
([Meta community forums](https://communityforums.atmeta.com/discussions/dev-general/audio-issues-in-oculus-browser-on-quest--go/744522)).

This is a five-minute measurement on a real headset and it gates everything
else. It also lands squarely on CLAUDE.md's rule: **never let sound gate the
work** — `AudioContext.resume()` and `audio.play()` both wait on a gesture and
neither rejects, so awaiting either inside the session-entry path is a hang, not
an error. Fire them and move on.

⚠️ And instrument the entry path with `navigator.sendBeacon`, not a batched
shipper — `research/quest-xr-2026-09.md` records three headset runs lost because
a throw escaped the session handler and the log lines never shipped.

---

## 4. Five ways to move the floor, ranked

Cost arithmetic uses the repo's MEASURED Quest 3 figures: framebuffer
**3360×1760 = 5.914 Mpx/frame**, two views, **89.8 fps** sustained in `scene`.
Bandwidth: Quest 3 **68 GB/s**, Quest 3S **42 GB/s** on identical GPU silicon.

### A. Modal plate / Chladni — **recommended**

Sum N plate eigenmodes, `sin(mπx/L)·sin(nπy/L)`, each amplitude driven by the
band nearest its modal frequency. Displacement is `Σ aᵢ·φᵢ(x,y)`.

- **Why it fits:** a sustained drone produces a **stable standing pattern**. The
  floor *holds still while the music holds still* — the one behaviour rhythm-less
  material needs and the one a beat-driven visual cannot produce. A spectral
  change morphs the pattern; two close partials make it beat slowly.
- **Honest mapping:** the picture is a readout of the spectrum's shape, and
  Chladni figures are what a real driven plate does. Not a metaphor.
- **Cost:** 24 modes × ~6 flops per vertex = ~150 flops/vertex. **No render
  targets, no feedback, no history.** ESTIMATED: at a 128×128 mesh (16,384
  verts) that is 2.5 Mflop per view per frame — nothing.
- **Trap:** modal amplitudes must be smoothed per second (§3.2) or the pattern
  shimmers at frame rate.

### B. FDTD wave equation on a membrane — **recommended as the event layer**

`u' = 2u − u_prev + c²∇²u − damping`, ping-pong RG16F, energy injected at points.

- **Why it fits:** ripples spread, interfere and decay on their own, so a rare
  13 LU event produces a disturbance that lasts seconds without any scripting.
- **Cost — negligible.** ESTIMATED: 256² RG16F, read+write = 524 KB/frame →
  **47 MB/s at 90 fps = 0.11% of a Quest 3S's 42 GB/s.** The simulation is free;
  only the shading of the floor costs anything.
- 🔴 **The trap that would ruin it: you cannot inject the waveform.** The sim
  steps at frame rate, so it carries nothing above ~45 Hz (Nyquist of 90 fps).
  Feeding it 1–2 kHz audio aliases into noise. **Inject band *envelopes* at
  separate points** — each band is a striker at its own place on the drumhead.
  Substepping 10× per frame only buys 900 Hz and does not fix it.
- **Trap:** the CFL condition, `c·dt/dx ≤ 1/√2` in 2D, or it explodes.

### C. Spectrogram terrain (scrolling waterfall) — **not underfoot**

Time on one axis, frequency on the other, height = energy. Very legible, shows
history. But it **scrolls**, which is continuous optic flow under a standing
viewer — the exact thing §2.3 says to avoid. Good as a **wall or a horizon
band**; poor as a floor.

### D. Radial rings from onsets — **only for the rare events**

Measured: an onset picker fires **118×/minute with no periodicity** (§1.2), so
ring-per-onset is mush. Gate on `|ΔM| > 3 LU` instead and it becomes the event
layer for B.

### E. Domain-warped noise — **texture, not structure**

Cheap, ambient-looking, and says nothing specific about the sound: the same
picture appears for any input. Use it as a surface detail under A, never as the
primary mapping. (It is the default look of every three.js audio visualiser —
[Codrops](https://tympanus.net/codrops/2025/06/18/coding-a-3d-audio-visualizer-with-three-js-gsap-web-audio-api/),
[three.js forum](https://discourse.threejs.org/t/audio-reactive-3d-visualizer-three-js-web-audio-api-with-in-browser-mp4-export/92234)
— and they are all tuned for music with beats.)

### The combination

**A for form** (modal plate = the spectrum, slow), **B+D for events** (rare big
changes propagate), **colour for centroid** (fast), **lateral spread for stereo
width**. Geometry slow, light fast.

---

## 5. Rendering budget on the headset

- **Split the mesh from the pattern.** Displace a **coarse** mesh (128² = 16k
  verts) for the slow undulation — that is the comfort-relevant motion — and
  render the **fine** nodal lines analytically in the fragment shader. Fine
  geometry buys nothing a fragment can't draw, and vertex work is per-view.
- **`OCULUS_multiview` is on by default** and is the one with MSAA. ⚠️ Its
  benefit is **CPU-side only** (Meta quote 25–50%), and nothing at all if you
  are fragment-bound. DOCUMENTED, `research/quest-xr-2026-09.md` §1.3.
- 🔴 **No full-resolution bloom. Ever, on a 3S.** ESTIMATED from repo numbers:
  one full-screen RGBA8 read+write at 3360×1760 is 47.3 MB/frame → **4.26 GB/s
  at 90 fps per pass**. `UnrealBloomPass` is **12 passes** (`plan-visuals.md`
  §2.3, read from source) → **51 GB/s**, which exceeds a Quest 3S's *entire*
  42 GB/s memory bandwidth and most of a Quest 3's 68. **Downsample first:** at
  quarter resolution per axis one pass is 0.27 GB/s and twelve is 3.2 GB/s.
  Arm's own result — an 8-pass dual filter at 2.8 ms against a naive 1-pass
  blur at 41.9 ms — is the same rule: passes are cheap when each is *smaller*.
- **Passthrough is a real option and it is free.** MEASURED on a Quest 3:
  `immersive-ar` reports `environmentBlendMode: alpha-blend` and holds
  **90.0 fps** against VR's 89.8. A modal pattern rippling across the *real*
  floor of the room is a better idea than a virtual floor in a black void, and
  it costs nothing measurable.
  🔴 **`alpha: false` on the WebGL context makes passthrough impossible** — no
  transparent pixels to composite through, so the room is replaced by black.
  And assert on `environmentBlendMode`, never on the session name.
- 🔴 **`session.renderState.baseLayer` is NULL until the next animation frame.**
  Read the layer inside `requestAnimationFrame`. This cost three headset runs
  already; do not spend a fourth.
- **Any controller button exits, plus a dead-man's switch** if nothing has been
  drawn after 4 s.

---

## 6. What to build first

Two things gate everything and both are short:

1. **Measure whether audio survives session entry on the Quest** (§3.6). Five
   minutes with a headset; the answer changes the architecture if it is "no".
2. **A feature extractor, on a desktop page first.** Level (K-weighted, 400 ms
   and 3 s), 24 log bands, centroid, flatness, side/mid, and the `|ΔM| > 3 LU`
   event. Assert the numbers against the percentiles in §1 — the harness can
   check that a live stream produces a centroid inside 1374–3821 Hz and a
   loudness inside −40…−14.5 LUFS, which is a real assert rather than a
   tautology, because those anchors came from ffmpeg and not from this code.

Then the plate, on the desktop, then in XR.

🔴 **One decision for the session, not for me:** a feature extractor is **shared
code**, and CLAUDE.md is explicit — *"If the thing you need is not in the kit,
stop and ask"*. `demo/shell/` has `grain-scope.mjs` (a scope) and nothing that
extracts features; `shout` and `radio` each hand-roll an `AnalyserNode`.
So: **add `demo/shell/features.mjs` as a kit component, or lift what
`radio` already has?** Both are defensible; building a third copy inside a
new page is not.

---

## 7. What would have to be true

- The 98.5 s capture is representative of the station. ⚠️ **UNCONFIRMED** — one
  capture, one time of day. Re-run the analysis over an hour before hard-coding
  the anchors in §3.4.
- Audio keeps running in an immersive session on Quest Browser (§3.6).
- A standing viewer tolerates a floor moving at 0.025 Hz with a rigid 1.5 m
  rest patch. Reasoned from ISO 2631-1, **not measured on this content**.
- `OCULUS_multiview` composes with a displaced mesh without surprises. Nothing
  in this repo has used it yet.

## 8. Scripts

The analysis scripts are in this session's scratchpad, not the repo —
`an.mjs` (loudness envelope + modulation spectrum), `bands.mjs` (octave bands,
stereo), `flux.mjs` (onsets, codec top end), `tempo.mjs` (detrended tempo with
the click and pink-noise controls). ⚠️ **`tempo.mjs` is the one worth keeping**:
it carries its own positive and negative control, which is the only reason the
"224.7 BPM" artefact was caught.
