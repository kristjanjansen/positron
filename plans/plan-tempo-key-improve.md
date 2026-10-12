# Improving tempo (radio/020, radio/030) and key (radio/040), ranked

Written 2026-10-12 after *"not good perf of bmp"* on
https://positron.studio/concepts/radio/030/ and *"save more and evaluate bmp
and keys perf. do reseach / get tooling"*. The measurements are in
`research/tempo-key-eval-2026-10-12.md`, the tools in
`research/tools/tempo-key/`. **Nothing here is built; the owner decides.**

Every gain is pooled over six recordings (Raadio 2 and 4 of 2026-10-11, Ida of
2026-10-11 and the three Ida takes of 2026-10-12, about 41 minutes) and
labelled **MEASURED** (run offline against reference tools) or **ESTIMATED**.
"Right" means two or more established tools agree, never a person; the
research file says where that is circular.

## What is wrong, in one paragraph

The tempo NUMBER is right 84% of the time and 92% of the time when its own
confidence is 0.5 or more. What is poor on Ida is the BEAT GRID: on the new
takes the click sits half a beat off 17 to 52% of the time and the grid jumps
23 to 27 times a minute, because the phase step picks a phase afresh every
0.5 s with no memory and assumes the hats sit on the offbeat. The key reads a
fifth or worse off on two of three new Ida takes with Temperley's profile.

## Ranked changes

### 1. Phase: measure the hats' side, and keep the last grid (tempo pages 020 and 030)

**What:** in `detEstimate`, find the low bands' best grid first, fold the hat
band on it, use today's offbeat hat term only when the hats really sit on the
offbeat (by 1.5 times), and otherwise use all four bands on the beat. Then keep
the last reading's grid (allowed to slide 1/16 beat) unless the best new phase
beats it by 50%. Exactly the `adapt ratio=1.5,keep=0.5` candidate in
`research/tools/tempo-key/patch-page.mjs`, about 20 lines in the page.

**Gain, MEASURED:** on the beat 63% to **77%**, half a beat off 27% to
**11%**, grid jumps 21.4 to **4.5 a minute**. On the worst take (Ida 1314)
43/52 to 83/11 and 26.2 to 3.5 jumps. Cost: Raadio 2 85% to 83% on.
Tempo unchanged. CPU 3.5 to about 4.3 ms per second of audio in Node, still
under half a per cent of a core.

**Risk:** chosen on these six; the ratio between 1 and 2 moves the pooled
result by 3 points, so it is not knife edge (MEASURED: ratio 1, 1.5, 2 give
75, 77, 78% on).

### 2. Say "no steady beat" below confidence 0.5 (tempo pages; display only)

**What:** below 0.5, dim the number and the line, write "no steady beat" in
the readout, and draw no beats on the wave. The click already waits for 0.5.

**Gain, MEASURED split:** 20% of readings are below 0.5 and only 54% of them
are right; the 80% above are 92% right. **ESTIMATED effect:** most of what a
listener would call a wrong BPM during a break, a mix or the unsteady stretch
of Ida 1434 (160 to 300 s) stops being shown as a fact. No detector change.

### 3. Key: the edma profile (radio/040)

**What:** `profiles: 'edma'` in `keyCreate`, with its table added to
`KEY_PROFILES` (Essentia's `key.cpp` values, to be byte checked against the
source before shipping).

**Gain, MEASURED:** pooled exact 52% to **71%**, MIREX 0.64 to **0.76**;
against the independent librosa pair 0.55 to **0.63**. Ida 1314 0.50 to 0.82,
Ida 1434 0.71 to 0.83, Raadio 4 0.77 to 0.98.
**Cost, MEASURED:** key changes 0.59 to 1.36 a minute; Raadio 2 (ambiguous
for the tools too) 0.83 to 0.64; on the 2026-10-11 synthetic held out set
0.65 to 0.60. With stickiness 0.1 the trade is in between: 65%, 0.71, 0.60,
0.85 changes a minute. **Recommendation:** edma with stickiness 0.05 as now,
and the runner up shown, because the steadier option gives back a third of
the gain.

### 4. Key, larger: essentia.js KeyExtractor instead of our block

**What:** essentia.js (npm, wasm, 0.1.3) `KeyExtractor` with a profile on the
last 30 s every 5 s, in place of `KEY CORE`.
**Gain:** essentia's own readers score 0.69 to 0.72 MIREX against the
independent librosa pair (MEASURED), against 0.55 for our page and 0.63 for
item 3. **Cost, MEASURED in node wasm:** 55 ms per call, about 1% of a core;
the wasm file is a few MB to fetch on Play (ESTIMATED, not checked).
**Why not first:** a new dependency on every key page and a whole reading
replaced, for 0.07 over item 3, judged by readers that include itself. Do item
3, listen, and come back to this if the key is still wrong by ear.

### 5. Phase from a small neural beat tracker (tempo pages, optional, heavy)

**What:** beat_this `small0` (2.1 M parameters) on the last 12 s every 2 s,
exported to ONNX and run with ONNX Runtime Web; our tempo stays, the model
gives only the grid.
**Gain, MEASURED offline:** on the beat 86%, half off 7% (against beat_this
`final0`, its own family, so an upper bound), jumps 4.7 a minute. Over item 1
that is 9 more points on the beat.
**Cost:** 77 ms per window multi threaded and 161 ms single threaded in
PyTorch (MEASURED); in a tab 0.3 to 0.8 s per 2 s window, 15 to 40% of a core
(ESTIMATED, untested), plus about 8 MB of weights and the runtime. The ONNX
export is untested.
**Refused as a replacement for the tempo:** alone on 12 s windows its tempo is
exact 78% against our 84% (MEASURED).

### 6. Speech and break gating (later)

Not measured: Ida had almost no speech in these takes. Item 2 covers breaks
already through the confidence. If a talk hour is recorded, the cheap
discriminators in the research file (a low energy ratio, rhythm strength) are
the first thing to try.

## Refused, with the measured reason

- **RhythmExtractor2013 multifeature in a tab:** 550 ms of wasm per 12 s
  window, a quarter of a core at a 2 s cadence; Essentia says it is not for
  real time.
- **Keep alone (no hat side):** jumps fall to 3.3 a minute but on the beat
  stays 62%: it holds the wrong grid as steadily as the right one.
- **A shorter key memory (15 or 20 s):** at most +0.02 MIREX over item 3 and
  1.8 to 2.5 key changes a minute.
- **Key band to 4 kHz:** worse with both profiles (0.59, 0.68).
- **Levelling changes for the detector:** the level stage changes nothing
  measurable (84, 85, 84% exact with the live AGC, radio/020's levelling and
  none).

## Where to listen, to turn soft truth into truth

The takes are at
`https://positron-station.kristjan-jansen.workers.dev/media/radio/ida/<name>`.

| take | time | question |
| --- | --- | --- |
| 2026-10-12-1314.aac | 1:00 to 4:00 | is the beat where beat_this puts it (the page puts the click half a beat off about half the time)? Is it G major / E minor, or C major as the page says? |
| 2026-10-12-1354.aac | 9:00 to 10:00 | Eb minor (tools) or Ab minor (edma)? |
| 2026-10-12-1434.aac | 2:40 to 5:00 | is there a beat at all? |
| 2026-10-12-1434.aac | 6:00 to 8:00 | 80 or 160 bpm? |

## What could not be settled

No human labels; phase graded against one model; key soft truth mostly one
front end; the Web Audio biquads not compared with Chrome's; the live
decoder's gaps not modelled; one lunchtime of Ida; every browser cost for a
model ESTIMATED. Details in the research file, section 7.
