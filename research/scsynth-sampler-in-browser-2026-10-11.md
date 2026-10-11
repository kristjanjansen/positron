# The Pi's SuperCollider sampler in a tab, against the WebAudio sampler (2026-10-11)

Asked: *"Build sampler/040 with the same keyboard and samples, played by the Pi's
synthdefs running in the tab. Then compare the two by ear and in the readouts."*

- WebAudio: `/concepts/sampler/010/` (`demo/concepts/sampler/sampler.mjs`).
- scsynth: `/concepts/sampler/040/` (wasm scsynth from `demo/shell/scsynth.mjs`,
  the two `posSampler` defs from `rig/board/norns/possampler-defs.scd`, and the
  voice core copied from `rig/board/scsampler.mjs`).

Everything below was MEASURED on this laptop in headless Chrome 155 (`--headless=new`,
`--mute-audio`, `--autoplay-policy=no-user-gesture-required`), 48 kHz, local server
`node demo/server.mjs`, samples from our R2. Nobody listened. "By ear" means each
page's own output was recorded sample-exactly by an AudioWorklet tapped onto
everything connected to `ctx.destination`, and the numbers a listener would hear
were computed from that recording. The scripts are not in the repository; the method is in §6.

## 1. What 040 is, and what it is not

- **The defs are the .scd's graph, written in JS by `demo/shell/synthdef.mjs`,
  not sclang's bytes.** EnvGen(Env.asr(0.001, 1, rel, -6), gate, doneAction 2),
  PlayBuf(ch, buf, rate * BufRateScale, doneAction 2), times env, times amp, Out at `out`.
  The engine accepted both (`/done /d_recv`, 22 to 23 ms for the pair). ⚠️ Not byte
  compared with the files the Pi's sclang wrote (`/opt/positron-board/samples/defs/`); the
  graph is the same, the block order may not be. Fetching those two files from the
  board and diffing is the check that would settle it.
- **The rules are the same code.** Bands, gains, the Rhodes crossfade layer and
  fallback, key-off gain, `nearestIn` are imported from `sampler.mjs`, which
  `rig/board/test.mjs` grades equal to `scsampler.mjs`. The voice core (32
  voices, `/n_set rel gate 0` as the damper, key-off on the damper, the 0.5 on a
  stereo voice) is a copy of `createSamplerCore`, because `scsampler.mjs` imports
  `node:child_process` at the top and cannot load in a browser.
- **The output is the Pi's capture: scsynth's two outputs are summed to one
  channel, and both speakers play that.** `createSamplerCore` halves a stereo voice
  because the board's capture sums out_1 and out_2. Without the sum a Rhodes voice
  (mono files) would come out of the left speaker only. So 040 sounds like what the
  Pi sends down the relay, with no relay in between. `bootScsynth`'s 0.9 output
  trim is set to 1 because the Pi has none.
- **Loading is the tab's, not the Pi's.** The Pi loads all 208 piano files before
  its first note. 040 fetches one file per press and queues the rest behind it, using
  `planFor` and `PIANO.behind` from `sampler.mjs`, so both pages fetch the same
  files in the same order. 95 files and 5.24 MB in the score below for 040, 99 files
  and 5.26 MB for 010.

## 2. By ear: the same notes through both

Recorded output. Peak and RMS are dBFS. RMS covers the first 500 ms after onset, averaged
over both speakers. Centroid covers the first 200 ms of the mid signal. Tail is key up
to 60 dB below the note's peak, and stop is the level in the last 1 ms before digital
silence.

| event | 010 peak | 040 peak | 010 RMS | 040 RMS | 010 centroid | 040 centroid | 010 tail / stop | 040 tail / stop |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| piano C4 v30 (band v1) | -30.6 | -33.6 | -42.6 | -44.4 | 453 Hz | 455 Hz | 300 ms / -100 | 300 ms / -98 |
| piano C4 v70 (v6) | -19.5 | -23.6 | -31.9 | -33.4 | 626 | 627 | 225 / -100 | 250 / -100 |
| piano C4 v110 (v16) | -15.9 | -18.9 | -28.3 | -29.7 | 964 | 964 | 225 / -96 | 255 / -99 |
| piano C-E-G v90 | -11.9 | -14.5 | -26.6 | -27.8 | 875 | 875 | 215 / -100 | 250 / -97 |
| piano D4 v100, 0.3 s | -17.6 | -19.2 | -32.0 | -33.2 | 815 | 814 | 290 / -97 | 300 / -99 |
| Rhodes C4 v30 | -30.0 | -30.0 | -37.1 | -37.1 | 346 | 352 | **180 / -78** | **100 / -99** |
| Rhodes C4 v70 | -19.9 | -19.9 | -27.5 | -27.5 | 396 | 404 | **180 / -70** | **105 / -98** |
| Rhodes C4 v110 | -14.2 | -14.2 | -23.3 | -23.3 | 726 | 731 | **180 / -68** | **95 / -96** |

The two recordings aligned sample by sample, as the mid signal (L+R)/2:

| event | residual 040 minus 010, first 1 s | first 10 ms |
| --- | --- | --- |
| piano C4 v30, v70, v110 | **bit identical** (no difference at all) | identical |
| piano C-E-G v90 (two of three notes repitched) | -60.8 dB | -56.4 dB |
| piano D4 v100, 0.3 s (repitched, damped inside the second) | -27.1 dB | -56.0 dB |
| Rhodes C4 v30 / v70 / v110 (repitched from 59) | -57.3 / -58.1 / -51.7 dB | -40.8 / -41.9 / -35.9 dB |

### Which differences are audible

1. **The piano is about 1.5 dB quieter on 040, and mono.** All of it is the mono sum. 010's
   own recording loses 1.2 to 1.8 dB when its L and R are summed (`monoLossDb`), and
   that matches 040's RMS deficit to the tenth of a dB. Peaks drop 2.6 to 4 dB because
   the L and R peaks do not coincide. **Audible side by side**, mostly as a narrower
   piano rather than a quieter one. The Salamander is a stereo recording and 040 plays it
   the way the Pi does, as one channel. The Rhodes is mono files, so it is identical
   in level.
2. **The Rhodes damper is shorter and smoother on 040.** WebAudio damps with
   `setTargetAtTime(0, tau = 0.04)` and `stop()`s at 1.5 x 0.12 s = 180 ms, which
   truncates the tail at -68 to -78 dBFS. The second difference at that cut is 2 to 2.9
   times larger than anything in the 100 ms before it, so it is a small step. scsynth's
   Env.asr release (curve -6 over 0.12 s) reaches true zero at 95 to 123 ms with no step.
   **Probably audible only side by side on short Rhodes notes, as a slightly tighter
   damper on 040.** The WebAudio step at -68 dBFS is below hearing on speakers at a sane level.
   It might be a faint tick on headphones in a quiet room. The piano hides both
   differences under its key-off sample (rel files, about 0.45 s), and the tails match
   within 35 ms.
3. **Not audible:** pitch and timbre (centroid within 8 Hz), the velocity bands
   (the same files at the same gains), and the 1 ms attack (it lands on samples below
   -50 dBFS). Repitching interpolation (scsynth PlayBuf's cubic against Chrome's
   resampler) is -52 to -61 dB down. The Rhodes' first 10 ms differ by -36 to -42 dB.
   That is the 1 ms fade-in on a file that starts with energy, and it softens a
   transient that lasts 1 ms.
4. **Fast repeats** (8 strikes of C4, 120 ms apart): no clicks on either page (stop
   level -95 and -99 dBFS). The waveforms cannot be compared because the CDP-driven
   timing differs between runs.

### To listen for yourself, on both pages

- Local: http://127.0.0.1:8890/concepts/sampler/010/ and http://127.0.0.1:8890/concepts/sampler/040/
- **Piano width:** hold C4 for 2 s on each, on headphones. 040 should sound centred
  and about 1.5 dB quieter. 010 should be wider.
- **Rhodes damper:** pick Rhodes, play C4 staccato (key down for about 0.2 s), at
  both soft and hard velocities from a MIDI keyboard. Listen to the end of each note. 040
  should stop a little sooner, with no tick. On 010, listen in a quiet room for a faint
  tick about 180 ms after the key comes up.
- **The first note:** reload each page and press one key. 040 takes about a second
  longer to sound (§3).

## 3. Readouts and costs

| | 010 WebAudio | 040 scsynth |
| --- | --- | --- |
| key to sound, warm, press to speaker clock (3 tabs x 6 presses) | 16 to 22 ms, median about 20.5 | 16.5 to 22.5 ms, median about 21 |
| 040's own readout (030's 1 ms block onset at 0.02) | not shown | 19 to 26 ms |
| first note, cold tab, press to sound (3 tabs) | 393, 415, 423 ms | 1320, 1370, 1418 ms |
| boot | none | 947 to 951 ms: module 5, `sonic.init()` 668, defs 23, the rest is `bootScsynth`'s fixed 250 ms sleep after `/notify` |
| engine bytes | 0 | 1,701,983 B `scsynth-nrt.wasm` + 125,542 B `supersonic.js` + 375 B chunk + the worklet (30,263 B on disk; not in resource timing) |
| sample bytes, same score | 5.26 MB, 99 files | 5.24 MB, 95 files |
| underruns (`ctx.playbackStats.underrunEvents`), 24 voices held 4 s | 0 | 0 |
| whole Chrome CPU, engine idle (cores) | 0.09 to 0.11 | 0.11 to 0.14 |
| whole Chrome CPU, 24 piano voices held 4 s | 0.18, 0.40, 0.45 | 0.09, 0.16, 0.37 |
| main thread task time during those 4 s | 189 to 388 ms | 92 to 618 ms |

- **Warm latency is the same.** Both engines start a voice in the next render
  quantum or two. The postMessage hop to the scsynth worklet adds nothing a 1 ms block
  can see.
- **The cold note costs about 0.9 s more**, and all of it is the boot. It was measured on
  localhost, so on a real network add the download of 1.8 MB of engine. A quarter
  of the boot is a fixed `sleep(250)` in the shared kit (§5).
- **CPU cannot be told apart here.** The spread between trials is wider than the
  difference between engines, both stay well under half a core, and neither
  underran. The scsynth worklet runs while silent, so the idle cost is a little
  higher. ⚠️ The main thread figure for 040 includes its own key-to-sound meter (a
  rAF loop reading an analyser), which 010 does not have. ⚠️ This is a Mac. A phone is unmeasured.
- scsynth's own `/status.reply` CPU fields read 0 in this build (research
  `supercollider-browser-2026-09.md` §2.1), so `underruns` is the load cell on 040.
  It is blank on a browser without `playbackStats`, which includes Safari.

## 4. Recommendation: keep both, with WebAudio as the default sampler

- **There is no sound to gain.** On the same files, at a rate of 1, the two engines
  produce bit-identical output, and everywhere else they differ by -52 dB or more. The
  only audible differences are deliberate on the Pi's side: the mono sum (which a tab
  does not need) and a shorter, smoother damper.
- **The cost is real and up front.** 1.8 MB of engine, about 0.95 s of boot before the first
  note, and an audio worklet that runs while silent. For a page whose subject is key to
  sound, a one second first note is the wrong first impression.
- **What scsynth buys is sameness with the Pi**, not quality. 040 is the right page for
  hearing exactly what `pi-1:sampler` makes, and for moving a voice between tab and board
  with one definition. That is the patchbay story, so 040 stays as that
  demonstration.
- **One thing worth taking back into WebAudio:** end the damper on a ramp that reaches
  zero, not a `stop()` at -40 dB under the note. The Rhodes tick, small as it is, is the
  one defect either engine showed, and it is WebAudio's. That is a `sampler.mjs`
  change, so it is NOT made here.

## 5. Unsettled, and changes for somebody else to make

- **Byte identity with the Pi's compiled defs** is unchecked (§1).
- **Phone CPU and underruns** are unmeasured. So is SuperSonic in iOS Safari for this page.
- **`demo/shell/scsynth.mjs` sleeps a fixed 250 ms after `/notify`.** That is a quarter
  of every boot. Waiting for `/done /notify` instead would likely cut it, but it is a
  shared kit file with a measured history, so it was not touched.
- **The mono sum is a choice.** A `?mix=stereo` variant would need a different stereo
  gain than the core's 0.5, which would no longer be the Pi's rule. It was not built.
- The DOM-free tap and the analysis are throwaway scripts. Their method is in §6.

## 6. Method

- An init script (`Page.addScriptToEvaluateOnNewDocument`) subclassed
  `AudioContext` and wrapped `AudioNode.prototype.connect`. Every connection to a
  destination also fed a GainNode into an AudioWorklet that posted raw float blocks
  stamped with `currentFrame`. A press was stamped with `ctx.currentTime` (frames) and
  `performance.now()`.
- The score ran on both pages in fresh profiles, after a warm-up that loaded every
  file it plays and a wait for the behind queue to settle. It was C4 at velocities 30,
  70 and 110 held 1.5 s, C-E-G at v90 held 2 s, D4 at v100 held 0.3 s, then the Rhodes
  C4 at 30, 70 and 110, then 8 fast repeats.
- Press to speaker: the recorder's first sample over 0.001 after the press, mapped to
  performance time with `getOutputTimestamp()`.
- Residual: the mid signals aligned by cross-correlation within plus or minus 5 ms, then
  10 log10 of the residual energy over the reference energy.
- CPU: the sum of `ps` cumulative CPU time over every process of the run's own Chrome
  profile, divided by wall time.
