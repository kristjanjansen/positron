# A better piano for the sampler, from free sample sets

Answers *"in bg do re-search for piano samples, see a aplan. current one sounds
metallic thin and lame"*, asked 2026-10-11 about the piano in
`/concepts/sampler/000/` to `030/`, `/nola/` and the Pi sampler in
`rig/board/scsampler.mjs`.

**Research and plan only. Nothing was built, nothing in `demo/` or `rig/` was
touched, nothing was uploaded.** It builds on `plans/plan-nola.md` section 2
(the survey of 2026-09-22, which already chose Salamander and then shipped
FluidR3 as a phase zero that never got replaced) and on
`research/rhodes-packs-2026-09-23.md`.

| mark | means |
| --- | --- |
| **MEASURED** | taken on this laptop today, 2026-10-11, with the command named |
| **DOCUMENTED** | a page, source file or API listing fetched today, URL given |
| **INFERRED** | drawn from two of the above, stated by neither |
| **UNCONFIRMED** | not checked, or nobody has listened |

**Nobody has listened to anything in this document.** The numbers below are
signal measurements on decoded audio, which can show *why* a set would sound
thin or metallic but cannot replace a pair of ears. What was fetched to measure:
5 Salamander FLACs (7.9 MB) and 6 Salamander mp3s and 4 Splendid m4a files
(about 0.6 MB), once each, from GitHub. No archive was pulled.

---

## 1. The verdict

1. **Salamander Grand Piano V3** (Alexander Holm, Yamaha C5), the same set
   `plans/plan-nola.md` chose on 2026-09-22 and nobody built. Its 30 notes sit
   on exactly the 30 MIDI numbers the sampler already uses (21 to 108 in steps
   of 3), so `PIANO_NOTES` and the nearest-note rule do not change at all.
2. **Web subset: 4 velocity layers (Salamander v1, v6, v11, v16), 30 notes,
   stereo, AAC in m4a at 96 kbps, 48 kHz, each file capped at 8 s with a
   1.5 s fade, trimmed to 2 ms before its onset.** Plus the 88 key-off release
   samples. Full set **about 10.5 MB of notes + 0.5 MB of releases**, fetched
   one file at a time, never on a visit.
3. **First note: one file, about 98 KB at middle C**, against today's first
   press which fetches an octave of four files, 102,340 bytes. The first note
   costs the same bytes as today and sounds like a piano.
4. **Pi subset: the same 4 layers and 30 notes, FLAC 16 bit, 48 kHz, MONO**,
   because the board's capture already sums `out_1` and `out_2`
   (`rig/board/norns/possampler-defs.scd`, read today), same 8 s cap.
   About 165 MB of float32 in scsynth Buffers, against 1.5 GB free.
5. **Licence: CC BY 3.0 on every mirror, while the author's own page says it
   has been public domain since 4.3.2022.** Treat it as CC BY 3.0 and credit
   Alexander Holm; that satisfies both readings.
6. **Fallback with a cleaner licence: VCSL Grand Piano, Kawai (CC0, 4 layers,
   38 notes, 84 releases).** Not chosen first because nobody has measured or
   heard it and its spacing is irregular.

---

## 2. Why today's piano sounds metallic and thin, with evidence

What ships today (MEASURED, `ffprobe` and decoding on this laptop, and
`curl -I` on all 30 files in R2): **30 mp3, 671,974 bytes, every file exactly
25,585 bytes and exactly 3.13 s long, 44.1 kHz stereo, 64 kbps.** The R2 copy
at `positron-station/sampler/piano/` is byte identical to `demo/nola/*.mp3`
(sha256 of `60.mp3` matches). ⚠️ `plans/plan-sampler-pi-pico.md` section 2.5
says 732 KB; the bytes are 671,974, so 732 is not the size of anything served.

Where it came from (DOCUMENTED, `demo/nola/PROVENANCE.json`, and the
generator source at
`github.com/gleitz/MIDI.js/blob/master/generator/ruby/soundfont_builder.rb`,
fetched today): FluidR3_GM's acoustic grand, rendered by FluidSynth from a
MIDI file with **one note-on at `VELOCITY = 85`**, held for `DURATION = 3000`,
then `fluidsynth -C no -R no -g 0.5` (chorus off, reverb off, gain 0.5) and
`lame -v -b 8 -B 64`. UNCONFIRMED that this exact revision of the script made
these files, but every measured property below agrees with it.

Five causes, in the order they matter:

### 2.1 It is brighter than the hardest real strike, at every velocity

MEASURED: spectral centroid and energy above 2 kHz over the first 186 ms after
the onset, left channel, middle C (`cenL.mjs` in the scratchpad):

| file | centroid | energy above 2 kHz |
| --- | --- | --- |
| Salamander C4 v1 (softest) | 518 Hz | -47.0 dB |
| Salamander C4 v8 | 619 Hz | -25.2 dB |
| Salamander C4 v16 (hardest) | 749 Hz | -14.8 dB |
| Splendid C4 FF | 554 Hz | -23.4 dB |
| **today's C4 (FluidR3, vel 85)** | **945 Hz** | **-9.3 dB** |

And in the bass, A0: **today -14.6 dB above 2 kHz, Salamander v8 -39.7 dB**,
25 dB more top end on the lowest note of the keyboard.

**This is the "metallic".** Today's piano has more energy above 2 kHz than a
Yamaha C5 struck as hard as it can be, and because there is one layer, a soft
note is that same bright file turned down. A real piano gets darker as it gets
quieter: Salamander loses 32 dB of top end from v16 to v1. INFERRED: no amount
of gain curve can make the current set sound soft.

### 2.2 Its stereo image cancels, and in mono it falls apart

MEASURED: mid against side energy over each whole file, and what is left when
L and R are summed:

| note | today mid/side | today, loss summed to mono | Salamander mid/side | Salamander loss in mono |
| --- | --- | --- | --- | --- |
| A0 (21) | +5.5 dB | -1.1 dB | +8.1 dB | -0.6 dB |
| C2 (36) | +1.0 dB | -2.5 dB | | |
| C3 (48) | +4.2 dB | -1.4 dB | | |
| C4 (60) | -0.3 dB | -3.2 dB | +4.1 dB | -1.4 dB |
| C5 (72) | -5.1 dB | -6.3 dB | | |
| C6 (84) | -3.8 dB | -5.3 dB | | |
| C7 (96) | **-11.8 dB** | **-12.1 dB** | +3.1 dB | -1.7 dB |

L/R correlation at C7 is **-0.875**, nearly polarity inverted. From middle C up,
today's files carry more out-of-phase energy than in-phase energy. On
headphones that is a hollow, phasey sound; on a phone speaker, a Bluetooth
speaker or any mono path, the top half of the keyboard loses 3 to 12 dB and
what remains is the thin part. **The Pi's capture sums `out_1` and `out_2`**
(`possampler-defs.scd`, read today), so the Pi piano is today's piano with the
top two octaves partly cancelled. INFERRED: the cause is in the FluidR3 SF2's
stereo sample pair, since the generator turned chorus and reverb off.

### 2.3 Every note stops dead at 3.13 s

MEASURED: the left channel's level in the last 10 ms of each file, against its
peak: **A0 is still 16 dB below peak when the file ends, C2 35 dB, C4 41 dB**,
and no fade. The sampler ends a voice when its buffer runs out, so any held
note below about middle C stops audibly at 3.13 s, pedal or no pedal.
Salamander's own lengths are 25.00 s at A0, 16.19 s at C4 and 3.89 s at C8
(MEASURED in `plans/plan-nola.md` section 2.3, re-measured today on A0, C4 and
C7: 25.00, 16.19 and 4.08 s).

### 2.4 One velocity layer

DOCUMENTED (generator, `VELOCITY = 85`), and covered by 2.1. The only thing
velocity changes today is gain, through `velGain`'s `(v/127)^1.5`.

### 2.5 Smaller things

- **64 kbps mp3 at -20.7 dBFS peak** (MEASURED; the generator's `-g 0.5`).
  Not the main problem; the plan replaces it anyway.
- **Pitch shift up to one semitone** is the same in the new set (same 30
  notes), so it is not a cause and does not change.
- **No release samples, no resonance.** Section 4 adds releases.

---

## 3. The sets, surveyed today

DOCUMENTED from GitHub's own tree API (exact bytes) and the pages named, all
fetched 2026-10-11, unless marked MEASURED.

| set | instrument | layers | spacing | releases | full size | licence | redistribute from our R2? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Salamander V3** | Yamaha C5, 2 x AKG C414 AB about 12 cm over the strings | **16** | **minor thirds, MIDI 21 to 108, 30 notes** | **88 chromatic, 0.46 s** + 69 resonance + 4 pedal | 641 FLAC, **748,397,030 bytes** (48 kHz 24 bit stereo); Ogg tarball 78,010,482; 44.1/16 tarball 488,713,261 | **CC BY 3.0** (LICENSE in the mirror, archive.org `licenseurl`); author's page: *"As of 4.3.2022, this is now public domain!"*; musical-artifacts lists `public` | **yes, with attribution** |
| Splendid Grand | Steinway, Akai CD 2000 | 4 (+1 made by filter) | 44 to 62 notes per layer, irregular, about 2 semitones | none | 226 FLAC, 76,828,674 bytes; smplr's web copy 23,824,778 m4a / 19,888,425 ogg | **public domain**, README only: *"released as public domain in early 2000 by Akai"* | yes |
| VCSL Grand Piano, Kawai | Kawai grand | 4 (v1 to v4, 3 cells missing) | 38 notes, irregular | **84** | 229 WAV, 459,886,063 bytes, 44.1/16 stereo (MEASURED header) | **CC0** | yes |
| VCSL Grand Piano, Steinway B | Steinway B | 3 | 42, whole tones | 99 | 352 WAV, 1,339,722,934 bytes, 44.1/**24** (MEASURED header); Sus and NoSus sets; normalised | **CC0** | yes |
| VCSL Upright, Yamaha / Knight | uprights | 1 to 2 | 71 / 50 notes | 71 / 50 | 248 MB / 420 MB WAV | **CC0** | yes |
| Upright Piano KW (FreePats) | Kawai upright, Zoom H1 in a living room | 2 (vL, vH, some missing) | minor thirds, A C D# F# | none | 67 FLAC, 32,864,411 bytes; FreePats "small" 2.9 MiB | **CC0** | yes |
| VSCO 2 CE upright | upright | 3 | 23 notes, major thirds | none | | **CC0** | yes |
| Osiris Piano | | 2 | 52, white keys only | none | 437 MiB FLAC | **CC0** | yes |
| Headroom Piano | Yamaha C3 | 5 | | | 156.2 MB | CC BY 4.0, plus a naming condition (plan-nola 2.1) | yes, with conditions |
| University of Iowa MIS | Steinway B, 2001 | 3 (pp mf ff) | chromatic B0 to C8 | none | AIFF 44.1/16 stereo, 1.1 to 12.9 MB a file | **no licence on the page at all** (theremin.music.uiowa.edu/MISpiano.html) | **unsettled**: no written grant |
| Piano in 162 | Steinway B, Ivy Audio | 5 | | | 4.9 GB, torrent only | page carries no licence; REPORTED (rekkerd.org): *"any repackaging or modification of the library for redistribution is prohibited"* | **no** |
| Pianobook packs | per pack | | | | | FAQ: *"It is forbidden to sell or redistribute the sample libraries"* (plan-nola 2.2) | **no** |
| Maestro Concert Grand | Yamaha CF-3 | | | | 268.5 MB | "All rights reserved ... You may not modify and spread" (plan-nola 2.2) | **no** |
| Karoryfer | | | | | | the shop lists no piano today; `karoryfer.scarypiano` is CC0 but a processed, experimental piano | n/a |
| midi-js FluidR3 piano (today's) | FluidR3 SF2 | **1** | chromatic render | none | 1,971,564 bytes for 88 | README: **CC BY 3.0** for the FluidR3 renders | yes, **with attribution**, see 6.2 |
| midi-js MusyngKite piano | Musyng Kite SF | 1 | chromatic render | none | | **CC BY-SA 3.0** | yes, share-alike |
| Tone.js `audio/salamander` | Salamander **V2**, v8 only | 1 | minor thirds, same 30 notes | none | 30 mp3, 2,012,677 bytes | CC BY 3.0 (its README is Holm's) | yes |
| `@tonejs/piano` (tambien) | Salamander, all 16 layers | 16 | minor thirds | 88 + 69 harm + 4 pedal | 480 note mp3, 31,624,346 bytes, about 38 kbps stereo VBR (MEASURED) | CC BY 3.0 | yes, but its GitHub Pages URL answers **404** today; only raw GitHub works |

**The jRhodes3d author's other work** (DOCUMENTED, `api.github.com/users/jlearman/repos`):
no piano sample set of his own, but two useful things.
`SplendidGrandLatencyFix` (licence NOASSERTION) trims the silence off the front
of Splendid's notes, which says Splendid's onsets are late. `PianoIRs`
(**Unlicense**) is impulse responses of a grand's harp with the pedal down,
made by summing every note of Accurate Salamander and of a Yamaha CP4. That is
a cheap sympathetic resonance by convolution; UNCONFIRMED whether the
Unlicense can cover an IR derived from a CP4's factory samples, so only the
Salamander one is a candidate.

### 3.1 Why Salamander and not Splendid, which has the better licence

MEASURED on smplr's m4a copies (`smpldsnds/sfzinstruments-splendid-grand-piano`):
**Splendid's notes are short**: FF C4 3.80 s, PP C4 4.17 s, Mf C7 2.52 s, FF
A0 12.35 s, and the FLAC header of `FF C4.flac` (read by a 64 byte ranged GET)
agrees: 167,793 samples at 44.1 kHz. That is barely longer than today's 3.13 s
in the middle of the keyboard. Every file is also **normalised to about
0 dBFS, PP included** (MEASURED peak +0.8 dBFS on PP C4), so it carries no
recorded dynamics and the level has to come entirely from a curve, which is
half of today's problem. Salamander's C4 v1 peaks at -19.3 dBFS and v16 at
-1.6 dBFS (MEASURED), so it carries 18 dB of real dynamics and the timbre that
goes with them.

Salamander also has the release samples, the resonance set and the pedal noise
already recorded, and its notes are exactly the grid the code uses.

### 3.2 The quick A/B that needs no encode

DOCUMENTED and MEASURED: `raw.githubusercontent.com/Tonejs/audio/master/salamander/`
holds Salamander V2's **v8 layer at the same 30 notes**, mp3, 2,012,677 bytes,
`C4.mp3` 16.19 s long and measurably the same file as v8 (identical centroid,
energy and peak). Pointing a scratch copy of `PIANO.file` at those 30 files,
renamed by MIDI number, answers *is it the recording or the code* in an hour,
with one layer still. ⚠️ It is a different host, and `CLAUDE.md` says to avoid
other people's servers, so this is a local listening test with the files copied
once, not something a page fetches.

---

## 4. What the sampler module needs to play it well

All of this is a change to `demo/concepts/sampler/sampler.mjs` (the shared
module) and its twin in `rig/board/scsampler.mjs`. Neither was touched.

1. **Layer choice: 4 bands, hard switched, no crossfade.** Salamander's own
   SFZ does not crossfade either (DOCUMENTED, `Data/notes.txt`: 16 groups with
   `lovel`/`hivel` and no `xfin`). Collapsing its 16 bands into 4:

   | velocity | plays | Salamander's own range for that file |
   | --- | --- | --- |
   | 1 to 40 | v1 | 1 to 26 |
   | 41 to 72 | v6 | 47 to 50 |
   | 73 to 104 | v11 | 81 to 88 |
   | 105 to 127 | v16 | 121 to 127 |

   One voice per note, so the 64 voice budget and the Pi stay as they are.
   Crossfading two layers is the second step only if the switch is audible,
   and it doubles voices. `@tonejs/piano`'s map for 4 layers is
   `[1, 5, 10, 15]` (DOCUMENTED, `src/piano/Salamander.ts`), a near neighbour.
2. **Level: keep the recording's dynamics, flatten the curve.** Today's
   `velGain` is `(LOUDEST / peak) * (v/127)^1.5` with one `peak` per
   instrument. With layers that already differ by 18 dB, the same curve would
   double the range. Use ONE normalising constant for the whole set (the
   loudest v16 file) and a gentle curve inside each band. Salamander V3's own
   README says it *"Decreased amp_veltrack to 75"* (DOCUMENTED). INFERRED
   starting point: within a band, gain from the band's bottom to its top spans
   about 6 dB. Tune by ear.
3. **Releases: play `rel<N>` on key up**, the chromatic one for the key, at
   Salamander's `volume=-37` dB with `amp_veltrack=82` (DOCUMENTED,
   `Data/hammer.txt`), when the damper actually falls: not on key up with the
   pedal down, but when `pedal.mjs` releases the note. 0.46 s each.
4. **Round robin: none exists in Salamander.** A repeated note plays the same
   file. Not a cause of thinness. Nothing to do.
5. **Onset trim at build time, not at play time.** MEASURED: Salamander's
   onsets (first sample at 1 % of peak) sit **7.9 to 13.0 ms** into the file;
   its SFZ carries per-file `offset` values of **356 to 2,163 samples at
   48 kHz, 7 to 45 ms** (DOCUMENTED, `Data/vel_01.txt` to `vel_16.txt`). Cut
   to 2 ms before the onset with a 2 ms fade in, as `fetch-jrhodes3d.mjs`
   already does (`leadSeconds 0.005`, `fadeInSeconds 0.003`). Untrimmed, every
   note is up to 45 ms late.
6. **The cap and the fade.** Each file to 8 s, fading over its last 1.5 s.
   Only notes below C6 are affected (the top 10 files, C6 to C8, are already
   shorter than 8 s). A held bass note then dies over 1.5 s instead of
   stopping, which is what today's files lack. Salamander's own tails already
   end near -60 dB (MEASURED: C4 v8 last above -60 dB at 16.00 s of 16.19), so
   a level trim saves nothing; the cap is the only byte lever.
7. **Fetch one file per press, then the rest of the octave behind it.**
   Today's `planFor` fetches an octave of piano before the first note sounds.
   With four layers that would be 16 files. The press should await only the
   one file it needs (`near`, band), and start the other three notes of the
   octave at the same band, then the other bands, in the background.
8. **Memory is the real limit, not bytes.** `decodeAudioData` gives float32
   at the context rate. MEASURED arithmetic: 4 layers x 30 notes at an 8 s cap
   is 861 s of audio, **331 MB stereo at 48 kHz if every file were decoded**;
   today's whole set is 31.8 MB. A real session plays perhaps 12 notes at 2 to
   3 layers, about 70 to 100 MB. UNCONFIRMED on an iPhone. If it fails there,
   the phone gets the mono variant (half) or a 6 s cap.
9. **AAC priming.** ⚠️ UNCONFIRMED: whether `decodeAudioData` in Chrome and in
   Safari honours the m4a edit list, or leaves the encoder's priming samples
   (about 21 to 46 ms) in front of the onset. The Rhodes already ships m4a, so
   the cheapest check is decoding one Rhodes file in both browsers
   (`demo/verify-native.mjs`, `demo/verify-safari.mjs`) and reading where the
   onset lands.

---

## 5. The budget

MEASURED encode rates on real Salamander notes (`aac_at`, the macOS encoder,
which is what `fetch-jrhodes3d.mjs` uses): **96 kbps stereo is 12.2 KB per
second, 128 kbps stereo 16.2, 64 kbps mono 8.2.** C4 v8 uncapped at 96 kbps
stereo: 198,795 bytes. Bytes below are seconds of audio times those rates, from
Salamander's 30 measured v8 durations (422.5 s at one layer).

| what | today | recommended (4 layers, 8 s cap, 96 kbps stereo) |
| --- | --- | --- |
| first press, middle C | 4 files, **102,340 B** | **1 file, about 98 KB** |
| one octave (4 notes), one layer | 102,340 B | about 390 KB |
| one octave, all 4 layers | n/a | about 1.56 MB |
| one octave of releases (12 x 0.46 s) | none | about 67 KB |
| **whole set of notes** | **671,974 B** | **about 10.5 MB** |
| all 88 releases | none | about 0.49 MB |
| decoded, everything | 31.8 MB | 331 MB (see 4.8) |

Other shapes, whole set of notes at 96 kbps stereo:

| cap | 1 layer | 4 layers | 5 layers | 5 layers, 64 kbps mono |
| --- | --- | --- | --- | --- |
| 3 s | 1.10 MB | 4.39 MB | 5.49 MB | 3.69 MB |
| 6 s | 2.09 MB | 8.37 MB | 10.47 MB | 7.03 MB |
| **8 s** | 2.63 MB | **10.51 MB** | 13.13 MB | 8.83 MB |
| none | 5.15 MB | 20.62 MB | 25.77 MB | 17.32 MB |

**Why 4 layers and 8 s, not plan-nola's 3 layers and 3 s:** a 3 s cap
reproduces today's dead stop (2.3), and the owner's complaint is the sound,
not the size. 10.5 MB is fetched only as far as somebody plays, one file per
new note, so nobody downloads it on a visit and a two octave melody costs
under 1 MB.

**Pi:** FLAC 16 bit, 48 kHz (the scsynth rate, so `BufRateScale` is 1), mono
summed at build time, same 4 layers and 8 s cap: about 165 MB of float32
Buffers (861 s x 48,000 x 4 B), and INFERRED about 40 to 50 MB of FLAC on the
card. Mono costs nothing audible there because the capture already sums to
mono, and Salamander sums with a loss of only 0.6 to 1.7 dB (2.2).

---

## 6. Licence and attribution

### 6.1 Salamander

CC BY 3.0 (DOCUMENTED: `sfzinstruments/SalamanderGrandPiano/LICENSE` is the
CC BY 3.0 Unported legal code; `archive.org/metadata/SalamanderGrandPianoV3`
`licenseurl` is `http://creativecommons.org/licenses/by/3.0/`). The author's
page `rytmenpinne.wordpress.com/sounds-and-such/salamander-grandpiano/` says
*"As of 4.3.2022, this is now public domain!"*, and in a comment that credit
is technically not required. ⚠️ `4.3.2022` is 4 March or 3 April depending on
convention, and no CC0 instrument was found; this changes nothing, since
attribution satisfies both. Transcoding and trimming are a derivative, which
CC BY permits. The text to ship beside the files, as `LICENSE-salamander`, and
in the `PROVENANCE` json:

> Salamander Grand Piano V3 by Alexander Holm, a Yamaha C5, licensed CC BY 3.0
> (https://creativecommons.org/licenses/by/3.0/). Source:
> https://github.com/sfzinstruments/SalamanderGrandPiano (retuned SFZ by
> Markus Fiedler, mapping by kinwie). These files are trimmed, capped at 8 s,
> faded, and re-encoded to AAC; they are not the author's originals.

### 6.2 Today's set has an attribution gap

`demo/nola/PROVENANCE.json` says *"MIT (the conversion); FluidR3_GM is released
for redistribution"*. The midi-js-soundfonts README says the FluidR3 renders
are **"Released under Creative Commons Attribution 3.0 license"** (DOCUMENTED,
`github.com/gleitz/midi-js-soundfonts`). So the set in R2 today owes an
attribution it does not carry. Moot once replaced; worth one line if it stays.

---

## 7. Steps to fetch, encode and upload

Shaped exactly like `demo/resources/fetch-jrhodes3d.mjs` (fetch once into
gitignored `tmp/`, `--check`, `--encode`, `--force`, a second between files,
`PROVENANCE` written by the script).

1. **`demo/resources/fetch-salamander.mjs`**: fetch from
   `raw.githubusercontent.com/sfzinstruments/SalamanderGrandPiano/master/Samples/`
   the 120 note files for v1, v6, v11, v16 and the 88 `rel*.flac`, into
   `tmp/salamander/`. ⚠️ **`encodeURIComponent` every name**: `D#1v8.flac`
   requested raw asks for `D` and 404s, which silently loses every black key
   (plan-nola 2.3 hit this). Sizes are in the tree listing, so the script can
   say how many bytes it is about to ask for before it asks
   (`sal.tsv` in the scratchpad: the 120 + 88 files are the input).
2. **Trim**: find the onset (1 % of the file's peak) and cut 2 ms before it,
   2 ms fade in. Cross-check against the SFZ `offset` values.
3. **Cap and fade**: 8 s, fade over the last 1.5 s.
4. **Encode web**: `ffmpeg -i <flac> -ar 48000 -ac 2 -c:a aac_at -b:a 96k`.
   Name by MIDI number and band so no `#` ever reaches a URL:
   `p060-v11.m4a`, `rel060.m4a`.
5. **Encode Pi**: `-ac 1 -ar 48000 -sample_fmt s16 -c:a flac`, `p060-v11.flac`.
6. **Upload** to `positron-station/sampler/salamander/web/` and
   `positron-station/sampler/salamander/pi/`, with `LICENSE-salamander` and
   `PROVENANCE-salamander.json` in both. Keep `sampler/piano/` where it is
   until the pages have switched, so nothing deployed breaks between the two
   steps. ⚠️ UNCONFIRMED which command uploaded the existing sets; BACKLOG
   says only that they are in R2.
7. **Module**: `PIANO.file(note, band)`, `layerAt` returning the band,
   `PIANO_PEAK` replaced by one constant for the set, `planFor` fetching one
   file first, releases on damper fall (section 4).
8. **Pi**: `scsampler.mjs` reads the same note map and bands; 120 Buffers of
   mono plus 88 releases.
9. **Verify economically**: `node demo/verify.mjs sampler/000 sampler/010`,
   compare assert counts, then listen. The only real test is a person at a
   keyboard playing soft and loud.

---

## 8. What could not be settled

- **How any of it sounds.** Nobody has listened to Salamander, VCSL Kawai or
  Splendid here. The measurements say today's set is brighter than a hard
  strike, phase-cancelling and cut short; they do not say the replacement will
  please the owner. Section 3.2's A/B is the cheapest way to find out.
- **Whether 4 layers switch audibly.** Salamander's v1 to v16 span 32 dB of top
  end at middle C, so a band edge is a step of about 10 dB in brightness.
  If it is heard as a jump, crossfade or go to 5 or 6 layers.
- **iPhone memory** with up to 331 MB of decoded audio (4.8).
- **AAC priming in `decodeAudioData`** (4.9).
- **The public domain date and instrument**: one blog sentence, no CC0 deed.
- **The University of Iowa set**: no licence of any kind on its page, so it
  stays out.
- **VCSL Kawai's quality and its 3 missing layer cells**: not measured.
- **Why FluidR3's stereo pair is out of phase**: INFERRED to be the SF2, not
  checked inside the SF2.
- **Cost**: about 7.9 MB fetched from GitHub once today for measurement, no
  money.
