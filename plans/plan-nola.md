# nola, a piano you play from a MIDI keyboard

Answers `what drives it, sc? plain webmidi?`, asked 2026-09-22 about a proposed
demo with the slug `nola`: a playable piano in the browser, driven from a MIDI
keyboard, with the sustain pedal working.

🔴 **THIS DOCUMENT IS PART MEASUREMENT AND PART READING, AND EVERY LINE SAYS
WHICH.** The repository facts, the codec numbers in section 3.4 and
Salamander's own file sizes and durations in section 2.3 were all taken off a
running thing today. Everything else in section 2 and all of sections 4.4 and
4.6 was surveyed over the network. **Nothing was downloaded and nothing has
been listened to.** No piano has been played, no pedal has been pressed in
front of any page, and no note has been measured from press to sound.

⚠️ **AND TWO OF THE RESEARCH THREADS BEHIND SECTION 4 NEVER RETURNED**, on Opus
transient handling and on FLAC ratios. Section 3.4 replaced both with numbers
taken here: a pre-echo measurement on encoded audio, and a compression ratio
computed from Salamander's own byte sizes and durations. Both substitutes are
better than a literature review for this purpose and neither is one. Section 7
lists them.

| mark | means |
| --- | --- |
| **MEASURED** | a number taken off a running thing on this desk today, with the command that took it |
| **DOCUMENTED** | a vendor, standard or project document says so, and the page was fetched today |
| **REPORTED** | a second-hand figure quoted from somebody else's write-up, not confirmed at the source |
| **INFERRED** | a conclusion drawn from two of the above, and stated by neither |
| **UNVERIFIED** | written from memory, and nothing was fetched to check it |

---

## The short answer

**Plain Web Audio, one `AudioBufferSourceNode` per note, driven by
`demo/shell/midi.mjs`, which already exists and already handles the note-on
at velocity 0 case.** Not scsynth. Not an AudioWorklet. Not a physical model,
for the sound that ships.

The one piece of new shared code is the **sustain pedal**, which
`demo/muta/index.html` grew today as page-local `keysDown` and `pedalHolds`
sets, and which belongs in `demo/shell/` before a second page writes a second
copy of it.

**The samples come from the Salamander Grand Piano**, Alexander Holm's Yamaha
C5, CC-BY 3.0. It already samples **exactly the 30 notes at minor-third spacing
that section 3's arithmetic asked for**, and it already carries key-off
releases, sympathetic resonance and pedal noise, which is three of the four
things section 5 calls expensive.

**Byte budget: 3.80 MiB, fetched lazily and never on a visit.** 3.09 MiB of
notes at three velocity layers with a three second cap, 0.16 of releases, 0.50
of resonance, 0.05 of pedal noise, and a maximum pitch shift of one semitone
anywhere on the keyboard. Every one of those figures comes from a real file
length read out of Salamander's own headers today.

**And there is a phase zero that needs no build pipeline at all**: FluidR3's
`acoustic_grand_piano-mp3`, 88 chromatic notes in 1,971,564 bytes, already
served over HTTPS. One velocity layer, so it is not the shipping sound, but it
makes every control and every assert real before a single file is encoded.

**What could not be settled by research and needs the desk**: whether the pedal
in this building sends controller 64 at all. Section 7.

---

## 1. What this repository already has, measured today

Everything in this section was read off the working tree on 2026-09-22.

### 1.1 The MIDI input path is finished and is not the question

**`demo/shell/midi.mjs`, 80 lines.** It asks for access, wires every input,
re-wires on `onstatechange` so a keyboard plugged in after load works, calls
back on note-on, note-off and control change with the channel, and reports
`unsupported` rather than an error where there is no Web MIDI at all.

It already carries the single most common first-implementation bug, in its own
words: **a note-on at velocity 0 is a note-off**, and many keyboards never send
`0x80` at all. A piano page that wrote its own MIDI handling would meet that bug
on its first chord.

⚠️ **AND ITS REACH IS SMALLER THAN A GREP FOR `createMidi` SUGGESTS, WHICH WAS
MEASURED RATHER THAN ASSUMED.** `grep -rn "midi.mjs" demo/*/index.html` finds a
real `import` in exactly **two** pages, `able` and `muta`. Five more (`evo`,
`circuit`, `twelve`, `shape`, `bay`) call `navigator.requestMIDIAccess`
themselves, and that is not drift: they are MIDI LOG pages that need every byte
on the wire, including SysEx, clock and active sensing, while `createMidi`
deliberately hands back only notes and controllers. **`nola` is note-shaped, so
`createMidi` is the right one**, and no new access code is needed.
⚠️ Whether five hand-rolled `requestMIDIAccess` blocks are one component nobody
has noticed is a separate question and is not this plan's to answer.

🔴 **SO "PLAIN WEBMIDI" IS NOT A CHOICE THIS PLAN GETS TO MAKE.** There is one
way a browser reads a MIDI keyboard and it is `navigator.requestMIDIAccess`.
The real question in the ask is what makes the **sound**, and that is section 4.

🔴 **AND SAFARI HAS NO WEB MIDI ON ANY PLATFORM, WHICH IS NOT A GAP THAT IS
CLOSING.** VERIFIED from caniuse today: not supported in Safari desktop from 3.1
through 27.1, not supported in Safari iOS from 3.2 through 27.2. Chrome has it
from 43, Edge from 79, Firefox from 108. **WebKit bug 107250 was opened on
2013-01-18 and is still status NEW with a blank resolution**, its most recent
comment dated 2025-07-30 reading *"Please add WebMIDI API to Safari"*. That is
thirteen years.
✅ **`demo/shell/caps.mjs` ALREADY HANDLES IT CORRECTLY** and `nola` needs to do
nothing new: `midi` is a SOFT capability, so the row stays linked and the page
says *"no MIDI here, but the on-screen keys still work"* rather than vanishing.
⚠️ **BUT IT DECIDES WHAT THE PAGE IS.** On an iPhone, which is most of this
site's phone traffic, `nola` is an on-screen piano and nothing else, and the
readout's `press to sound` measures a tap rather than a key. **The page has to
be worth opening in that state**, which is the same bargain `/evo/` made when it
wrote a known stream into itself.

### 1.2 The keyboard, the capability table and the pedal knowledge

- **`demo/shell/keyboard.mjs`, 644 lines.** The on-screen piano: white keys in a
  grid with the five blacks raised over the boundaries, pointer capture, a
  separate colour for a note somebody else played, an octave pad, and the rule
  that a key is lit by a NOTE rather than by the press that caused it. It also
  carries the swipe-versus-drag arbitration that a phone needs.
  ⚠️ **AND `verify.mjs` CANNOT PRESS ITS PAD**, which the module says in its own
  header: the pad is deliberately not in `.pos-controls`. A page that ships it
  and asserts nothing about it has three ungraded controls.
- **`demo/shell/midi-decode.mjs`, 369 lines.** `noteName(n)`, and a controller
  table in which **64 is already named `sustain`**. Its own comment is the right
  warning for this page: a name out of that table is a CONVENTION, shown as `by
  convention`, never as what the pedal you just pressed does.
- **`demo/shell/cc-adapter.mjs`, 703 lines.** Its `SWITCHES` set is
  `{64, 65, 66, 67, 68, 69, 120 to 127}`, with the comment *"a dropped
  sustain-pedal-down is the CC analogue of a stuck note"*. So the repository
  already classifies the damper pedal as a switch that must never be thinned.
- **`demo/shell/midi-log.mjs`, 107 lines.** Five columns, raw bytes kept beside
  the reading, clock bytes counted rather than listed. Used by `circuit`,
  `model` and `evo`. This is the instrument that answers section 7's first
  question in four seconds.
- **`demo/shell/caps.mjs`.** `WebMIDI` maps to the soft `midi` capability with
  the message *"no MIDI here, but the on-screen keys still work"*.

### 1.3 There is already a sampler on this site, and it is plain Web Audio

**`demo/tom/index.html`.** MEASURED: `createBufferSource` appears in four pages
(`tom`, `pack`, `lanes`, `videoradio`) and three kit modules (`looper.mjs`,
`projector.mjs`, `mp3-stream.mjs`), and **`tom` is the one that is a sampler**.
The others fire a click, a bed or a kept lap. `tom` does exactly what a piano
would do, minus the pitch: its `fire()` decodes on the first press and never on
a visit, keeps the `AudioBuffer` afterwards, builds one `AudioContext` and one
master gain at 0.5 because sixty four rows can land on one step, fires
`ac.resume()` and moves on rather than awaiting it, and warms the remaining rows
off the firing path.

Three of its comments are load-bearing for `nola` and are quoted rather than
re-derived:

- *"Sixty four WAVs through an `AudioContext` at load is the load-on-a-visit
  defect this project has paid for three times."*
- *"`AudioContext.resume()` waits on a gesture in a real browser and does NOT
  reject, so awaiting one is a hang rather than an error."*
- The audio comes out of a decoder the page can grade synchronously rather than
  out of `decodeAudioData`, *"because a check can grade a press rather than
  racing a decode"*. For `nola` that argument points the other way, since a
  compressed pack has to go through the browser's decoder, and section 6 says
  what replaces it.

### 1.4 There is already a synthesized keyboard instrument, and the board plays it

**`demo/shell/rhodes.mjs`, 60 lines.** An FM electric piano written as pure
per-sample arithmetic with no Web Audio nodes at all, so the same function runs
in a browser, in node, and in C. Velocity moves the modulation INDEX rather than
just the volume, which the file argues is *"the whole expressive character of
the instrument"*.

🔴 **MEASURED: NO PAGE IN `demo/` IMPORTS IT.** `grep -rn rhodes` finds its
consumers in `rig/board/synth.mjs` and `rig/m1/rhodes-render.mjs`, which is the
Raspberry Pi and the studio Mac. So the repository's one synthesized keyboard
voice is played by hardware and by no browser page.

**`rig/board/synth.mjs` is the closest thing here to a piano voice manager**, and
three of its decisions transfer whole:

```
const DAMP_SEC = 0.12;   // lifting the key stops the tine
```

with the comment *"A struck piano has no sustain to release, but it does have a
DAMPER: lifting the key stops the tine. Without this a held chord rings its full
1.6 s after release and the instrument feels like a music box rather than a
keyboard."*

That sentence is the whole sustain pedal in one line: **the pedal is the absence
of the damper**, not the presence of a sustain. Section 5 builds on it.
Its other two transferable decisions: a retrigger damps the old voice rather
than stacking it, because two copies of one note is 6 dB louder and reads as a
stuck key; and voice stealing is **oldest first**, because *"dropping what was
just played is the audible failure"*. It caps at 16 voices, which is not enough
for a pedal.

### 1.5 scsynth is vendored and is 1.7 MB of it

MEASURED on disk:

| file | bytes |
| --- | --- |
| `demo/shell/vendor/scsynth-nrt.wasm` | 1,701,983 |
| `demo/shell/vendor/supersonic.js` | 125,542 |
| `demo/shell/vendor/clockwork_audio_worklet.js` | 30,263 |
| `demo/shell/vendor/chunks/` (3 files) | 19,375 |
| **total** | **1,877,163** |

⚠️ **AND THE FIGURE THIS REPOSITORY QUOTES DOES NOT MATCH ANY OF THOSE.**
`demo/muta/index.html` prints *"scsynth.wasm is 1740.8 KB booting in 747
ms"* as a typed literal, and `HANDOFF.md:67` and `BACKLOG.md:1236` repeat it.
1740.8 KB is 1,782,579 bytes at 1024, or 1,740,800 at 1000, and the vendored
artefact is 1,701,983, which is 1662.1 KiB or 1702.0 kB. **Nothing here depends
on the 40 KB**, and the yardstick's shape is right either way, but a number
quoted in three files that matches no file on disk is worth one command to
somebody who has a reason to care.

`demo/shell/scsynth.mjs`, 196 lines, brings it up: `bootScsynth()` returns a
live engine, a meter in the path, an output gain, OSC send and a reply matcher.
Its consumers are `radio`, `videoradio`, `grains/engine.mjs` and `pappus.mjs`.

### 1.6 The wasm-in-a-worklet path is one day old and is the heaviest thing here

**`demo/muta/`**, shipped 2026-09-22. `plai.wasm` is 200,139 bytes and
`warp.wasm` is 78,204. The worklet compiles them on the audio thread, 128 frames
at a time, with the wasm arriving over the port as BYTES because a
`WebAudioWorkletGlobalScope` has no `fetch` and because, MEASURED in headless
Chrome 141 that day, **posting a compiled `WebAssembly.Module` to that port is
silently never delivered.**

That page also grew MIDI, velocity and a sustain pedal the same day, which is
where section 5 starts.

### 1.7 The site ships no audio at all today, and that is the size yardstick

MEASURED:

- `find demo -maxdepth 2 \( -name '*.wav' -o -name '*.mp3' -o -name '*.m4a' -o -name '*.opus' -o -name '*.ogg' \)` returns **nothing**. Not one audio file in any demo directory.
- `du -sh demo/` is **14 MB**; `du -sh workers/view/public` is **16 MB**.
- The largest single deployed asset is `scsynth-nrt.wasm` at **1,701,983 bytes**.

🔴 **SO A PIANO PACK LARGER THAN 1.7 MB WOULD BE THE BIGGEST THING THIS SITE HAS
EVER SERVED, AND A 3 MiB PACK IS A FIFTH OF THE WHOLE DEPLOY.** That is not a
reason to refuse it. It is the reason section 3 spends its effort on the budget
rather than on the fidelity.

### 1.8 Where a sample pack can physically live

Three routes, and only one of them works without a fight:

1. **`demo/nola/*.m4a` at the top level.** `demoFiles()` in
   `workers/view/build.mjs` enumerates **one directory level** and filters to an
   extension allowlist that already contains `.m4a`, `.mp3`, `.opus`, `.ogg`
   and `.wav`. So flat files in `demo/nola/` WOULD be copied. Ninety loose audio
   files in a page directory is the cost.
2. **`demo/nola/samples/…`.** Not copied. A subdirectory is invisible to
   `demoFiles()`, and that containment wall is deliberate and is documented
   three times in `LAYOUT.md` rule 6. It would need ninety lines in the
   allowlist, plus `checkPresent()` and `checkVendorUrls()` to keep them honest.
3. **R2, behind `workers/station`.** MEASURED in that worker: `/media/<key>`
   reads R2, and its CORS block is `access-control-allow-origin: *` with
   `range` allowed and `content-range` and `accept-ranges` exposed. The
   MIMproject corpus already lives there, addressed as
   `https://positron-station.kristjan-jansen.workers.dev/media/mimproject/…`.

🔴 **AND THE REPOSITORY HAS ALREADY MEASURED WHY 1 AND 2 CANNOT SERVE A RANGE.**
`workers/station/wrangler.jsonc` records it: *"MEASURED 2026-09-15 17:50Z: a
`Range: bytes=461-1460` against an asset directory answered 200 with the whole
4 801 140-byte file and no `accept-ranges`, from outside and from the ASSETS
binding alike."* So a **single-file sample pack read by byte range**, which is
the tidiest shape a sampler can have, is only possible from R2.

DOCUMENTED from Cloudflare's own limits page, fetched today: Workers static
assets are capped at 25 MiB per file and 20,000 files free / 100,000 paid.
Neither cap is what decides this. The Range behaviour is.

---

## 2. Free piano sample packs, surveyed

🔴 **NOTHING IN THIS SECTION WAS DOWNLOADED AND NOTHING WAS LISTENED TO.** Every
page and API endpoint below was fetched on 2026-09-22. File counts and byte
sizes taken from the GitHub API are exact rather than estimated, because they
come from the API's own listing. **A licence read off a page is a claim about a
page**, and where two sources disagree that is said rather than resolved.
Two `HEAD` requests were used to confirm liveness and one `Content-Length`. No
archive was pulled.

⚠️ **AND THREE HOSTS DID NOT ANSWER, WHICH IS A FACT ABOUT THE ASKING AND NOT
YET A FACT ABOUT THE CONTENT.** `positron-verify`'s rule is explicit about this:
*"Three hosts refusing in three different ways is not three facts about the
content, it is one fact about how you are asking."* What could not be reached
today: **Accurate-Salamander** at `www.ir.isas.jaxa.jp`, which timed out and
then returned HTTP 000 (listed elsewhere as CC-BY, 1.6 GB, SFZ);
**`member.keymusician.com`**, FluidR3's upstream, which refused the connection,
which is why its licence is reported two ways below; and
**`schristiancollins.com`**, which serves a JavaScript application shell and no
content to a fetcher, so GeneralUser GS's licence was read off a mirror instead.
`https://freepats.zenvoid.org/Piano/` returns **403** to a directory listing
while its individual file URLs answer fine, which is a fourth instance of the
same shape.

### 2.1 The candidates, with their licences

| pack | licence, as stated today | size | format | notes sampled | layers | releases | pedal-down |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Salamander Grand Piano** (Alexander Holm, Yamaha C5) | **CC-BY 3.0** on every mirror; the author's own blog says *"As of 4.3.2022, this is now public domain!"* | 393 MiB WAV 44.1/16, 707 MiB FLAC, **74.4 MB Ogg Vorbis**, 296 MiB SF2 | SFZ + WAV / FLAC / Ogg / SF2 | **30, at minor thirds, A0 to C8** | **16** | **yes, 88 chromatic** | **yes: 69 resonance samples and 4 pedal noises** |
| **Splendid Grand Piano** (AKAI, mapped by kinwie) | **Public domain**, released by Akai in early 2000 | **73.27 MB** | SFZ + FLAC, 226 files | not confirmed | **5** | none found | resonance is SIMULATED, not sampled |
| **VCSL Grand Piano Steinway B** (Versilian) | **CC0-1.0** | **1.28 GB** (Sus 734.4 MB, NoSus 515.1 MB, Rel 28.2 MB) | WAV | **42, whole tones**, A#0 to G#7 | **3** | **yes, 99 files, 33 notes** | **yes, a whole separate Sus set** |
| **Osiris Piano** | **CC0-1.0**, `LICENSE` is the CC0 legal code | 437 MiB | FLAC 16-bit, SFZ | 52, white keys only | 2 | none found | **yes, a `-Sus` set** |
| **Upright Piano KW** (FreePats, Kawai upright) | **CC0 1.0** | **2.9 MiB** for the "small" build, 32 MiB full FLAC | SFZ + FLAC / SF2 | not stated | **2** | not stated | not stated |
| **Headroom Piano** (Bengt Nilsson, Yamaha C3) | **CC-BY-4.0**, plus a naming condition the author added on top | 156.2 MB | FLAC, SFZ | not confirmed | 5 | not confirmed | not confirmed |
| **midi-js-soundfonts FluidR3 `acoustic_grand_piano-mp3`** | MIT on the packaging; FluidR3 itself is called **MIT by Fedora and CC-BY 3.0 by the packager**, and upstream refused the connection | **1,971,564 bytes for all 88 files** | mp3, 21.9 KB a note | **88, fully chromatic A0 to C8** | **1** | none | none |
| **tonejs-instruments piano** | MIT code, **CC-BY 3.0** samples, derived from VSCO-2 which is CC0 | **14.88 MB mp3, 13.74 MB ogg** | mp3 / ogg / wav | **85, fully chromatic C1 to C8** | **1** | none | none |
| **University of Iowa** (Steinway Model B, 2001) | **no licence of any kind.** The only grant is prose: *"may be downloaded and used for any projects, without restrictions"* | files 1.1 to 12.9 MB each | **AIFF**, 44.1 kHz, 16-bit, stereo | chromatic, B0 to C8 | **3** (pp, mf, ff) | none | none |
| **VSCO-2 Community Edition** | **CC0-1.0** | 2.23 GB whole library | SFZ + WAV | **no grand piano at all.** `Upright Piano` is 23 notes at major thirds, `Upright Nr1` is 7 notes at octaves | 3 | none | none |
| **Sonatina Symphonic Orchestra** | CC Sampling Plus 1.0, a RETIRED and non-free licence, **but its Grand Piano folder is separately marked public domain** and is the Splendid Grand | 73.27 MB for the piano | FLAC | see Splendid | 5 | | |
| **GeneralUser GS** | a custom **"GeneralUser GS License v2.0"**, permissive in prose | 31,281,186 bytes | SF2 | | | | |
| **YDP Grand Piano** (FreePats, Yamaha Disklavier Pro, from Zenph via OLPC) | **CC-BY 3.0** | 36 MiB | SF2 | | | | |
| **Greg Sullivan E-Pianos** (CP80, Pianet T, Wurlitzer) | **CC-BY-3.0**, full legal code in the repo | 18.3 MiB | FLAC + SFZ | not confirmed | not confirmed | | |

### 2.2 The ones that look free and are not

🔴 **FIVE OF THE OBVIOUS CANDIDATES FORBID EXACTLY WHAT A BROWSER DEMO DOES.**
Putting samples in a web page is REDISTRIBUTION, and transcoding them is a
DERIVATIVE WORK, so a licence that permits use in compositions but not
redistribution is a refusal here even though it reads as generous.

- **Pianobook**, quoted verbatim from its own FAQ: *"It is forbidden to sell or
  redistribute the sample libraries that you do not own the copyright to."* The
  grant covers using the samples in compositions, not rehosting them. It also
  says in writing: *"We cannot guarantee sample packs uploaded to this site are
  copyright free as the responsibility of ensuring this is in the hands of the
  Samplist."* **Refused.**
- **Maestro Concert Grand** (Mats Helgesson, Yamaha CF-3). The
  `sfzinstruments` index lists its licence as `Custom`, which hides what the
  readme says verbatim: *"All rights reserved. You may not sell this sound set
  [...] You may not modify and spread this soundfont without the author's
  written permission."* **Refused, and the index row is the trap.**
- **Keppy's Steinway**, CC-BY-**ND** 4.0. NoDerivatives. Transcoding, trimming
  or remapping are all derivative works. It also has *"no velocity layers"*,
  which is a second reason. **Refused.**
- **jRhodes3c and jRhodes3d**, CC-BY-**NC**. **Refused** on the same reasoning
  this project applies elsewhere.
- **Piano in 162** (Ivy Audio, Steinway B, 4.9 GB). The page loads and carries
  **no licence statement at all**, and every download is a BitTorrent magnet
  because *"Direct downloads will be back soon!"*. The "free for commercial
  use" claim comes only from secondary blogs. **Refused: nothing is written
  down.**

⚠️ **AND THE UNIVERSITY OF IOWA SET IS A FIFTH CASE THAT IS NOT A REFUSAL BUT IS
NOT A LICENCE EITHER.** The site carries one sentence and no licence document.
Third parties, including the author of Virtual Playing Orchestra, describe those
recordings as public domain. **Iowa does not say so.** *"Without restrictions"*
is the whole of what is actually granted, it was written in prose by a music
department rather than by a lawyer, and it can be withdrawn from a web page in
one edit. It is usable and it is a weaker footing than CC0, and a plan that
called it public domain would be repeating somebody else's summary as a fact.

### 2.3 Salamander is the right source, and the reason is arithmetic rather than taste

🔴 **SALAMANDER SAMPLES THE SAME 30 NOTES SECTION 3.2 DERIVED FROM FIRST
PRINCIPLES, AND THE TWO WERE ARRIVED AT INDEPENDENTLY.** Its sampled notes are
`A0, C1, D#1, F#1, A1, C2 … F#7, A7, C8`: **MIDI 21 to 108 in steps of 3**,
which is exactly the minor-third spacing section 3.2 argues for and exactly the
30 notes the budget was costed against before this survey was read. That is
corroboration rather than confirmation bias: the arithmetic says minor thirds is
the only spacing that keeps the worst shift at one semitone, and the best free
library in the world picked it.

🔴 **AND UNLIKE THE REST OF THIS SECTION, SALAMANDER WAS MEASURED DIRECTLY
RATHER THAN READ OFF A SURVEY**, because the whole recommendation rests on it.
Two things were done today: the repository's full file tree was pulled from the
GitHub API, giving an exact name and byte size for every one of its **641
files, 748,397,030 bytes, 713.7 MiB of FLAC**; and the first 64 bytes of 50 of
those files were fetched as ranged GETs, which is where a FLAC file keeps its
`STREAMINFO` block and therefore its **exact** sample rate, channel count, bit
depth and total sample count. Nothing was downloaded; 50 requests of 64 bytes
is 3.2 KB.

| group | files | what it is |
| --- | --- | --- |
| `<note>v<1..16>.flac` | **480** | **30 notes at 16 velocity layers.** Every interval between neighbouring notes is **exactly 3 semitones**, MIDI 21 to 108, verified across the whole set |
| `rel1..rel88.flac` | **88** | key-off and hammer noise, **chromatic across all 88 keys**, **0.46 s each** |
| `harmL*` / `harmS*` / `harmV3*` | **69** | **sympathetic resonance**, 23 notes at three lengths: `harmL` **2.80 s**, `harmS` **1.90 s** |
| `pedalD1`, `pedalD2`, `pedalU1`, `pedalU2` | **4** | the mechanical noise of the pedal. Down is **6.38 s**, up is **0.70 s** |

**Format, MEASURED off the headers rather than off a description: 48,000 Hz, 2
channels, 24 bit**, on every file checked.

**Note lengths, MEASURED at velocity layer 8**, in seconds:

| A0 | C1 | D#1 | F#1 | A1 | C2 | D#2 | F#2 | A2 | C3 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 25.00 | 23.62 | 24.28 | 23.35 | 23.31 | 22.32 | 22.11 | 20.45 | 15.94 | 16.00 |

| D#3 | F#3 | A3 | C4 | D#4 | F#4 | A4 | C5 | D#5 | F#5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 16.08 | 16.13 | 15.62 | **16.19** | 15.82 | 14.69 | 13.32 | 15.57 | 12.95 | 11.92 |

| A5 | C6 | D#6 | F#6 | A6 | C7 | D#7 | F#7 | A7 | C8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10.54 | 6.23 | 6.70 | 5.85 | 6.81 | 4.08 | 4.88 | 4.83 | 4.03 | **3.89** |

**422.5 seconds of audio at one velocity layer.** The velocity layer changes the
length much less than the pitch does: `C4v1` is **12.05 s** against `C4v8`'s
16.19 and `C4v16`'s 15.52, and `C8v1` is **3.10 s** against `C8v8`'s 3.89.

**So three of the four things section 5 calls expensive are already recorded.**

⚠️ **AND ONE TRAP WAS HIT WHILE MEASURING, WHICH IS WORTH A LINE IN THE BUILD
SCRIPT.** Fourteen of the thirty notes 404'd on the first pass. The cause is not
the mirror: **the note names contain `#`, which a URL reads as the start of a
fragment**, so `D#1v8.flac` requests `D` and throws the rest away. The server
answers 404 about a file that is there. `encodeURIComponent` fixes it, and
without it exactly the black-key samples go missing, silently, on a run that
otherwise looks fine.

✅ **AND THE BUILD DOES NOT NEED THE 393 MiB TARBALL.** The
`sfzinstruments/SalamanderGrandPiano` mirror holds every sample as an
INDIVIDUAL FLAC file over HTTPS, so a build script fetches only the 90 it wants.
Those 90 add up to **131 MiB, fetched once and lossless**, measured from the
API's own byte sizes, rather than 393 MiB of tarball to extract 90 files out of.
⚠️ **ONE DELIBERATE DOWNLOAD, ONCE, INTO `tmp/`.** `CLAUDE.md`'s external-source
rule is about a harness or a page hitting somebody else's server repeatedly, and
a build artefact fetched once and cached is the opposite shape. Say so in the
script's header and make it refuse to run twice.

⚠️ **THE LICENCE IS CC-BY 3.0 AND SHOULD BE TREATED AS CC-BY 3.0.** The author's
blog at `rytmenpinne.wordpress.com` says *"As of 4.3.2022, this is now public
domain!"*, and **no mirror has caught up**: archive.org's metadata, FreePats and
the GitHub mirror's `LICENSE` all still say CC-BY 3.0, and no formal CC0
dedication instrument was found. Attributing Alexander Holm satisfies both
readings and costs one line, which is what `LAYOUT.md` rule 6 already requires
beside any vendored third-party file.

### 2.4 The two that are worth naming as alternatives

- **`midi-js-soundfonts` FluidR3 `acoustic_grand_piano-mp3` is the day-one
  option and it is remarkable value: 88 chromatic notes, 1,971,564 bytes,
  21.9 KB a note, already served over HTTPS from GitHub Pages with the
  repository's README explicitly endorsing hot-linking** (which section 6.1
  still declines to do from a deploy or a harness). Zero build step. Its
  costs are real and are the reason it is not the recommendation: **one velocity
  layer**, so velocity can only be volume, which `rhodes.mjs` argues at length
  is the wrong instrument; no releases; no pedal noise; soundfont-grade timbre;
  and a licence whose name is genuinely unsettled, with Fedora saying MIT and
  the packager saying CC-BY 3.0 while the upstream host refused the connection
  today.
- **Splendid Grand Piano, 73.27 MB of FLAC, genuinely public domain**, released
  by Akai in 2000, five velocity layers. **The best licence-to-quality ratio of
  any grand in the survey** and the fallback if the Salamander licence question
  ever turns awkward. Its sympathetic resonance is SIMULATED by the SFZ rather
  than recorded, so it cannot answer section 5's resonance question.

- **And Tone.js hosts a Salamander subset that is a third phase-zero option**,
  at `tonejs.github.io/audio/salamander/`: **30 notes at minor thirds, 1.92 MB
  of mp3 and 6.62 MB of ogg, one velocity layer**, and it is Salamander **V2**
  rather than V3. It is the right 30 notes and the wrong everything else, since
  Tone's own `Sampler` could not use sixteen layers or a release sample if they
  were there. Useful because it proves the note set works; not a substitute for
  the build in section 8.

⚠️ **AND `tonejs-instruments` ILLUSTRATES A TRAP RATHER THAN OFFERING A PACK.**
Its 85 chromatic notes at 14.88 MB are derived, by its own
`sample-source-info.txt`, from VSCO-2, **whose only pianos are a 23-note upright
at major thirds and a 7-note upright at octaves**. Getting 85 chromatic notes
out of 23 means heavy pitch-shifting was done at build time and baked in, which
is the thing section 3.2 wants to keep to one semitone and visible in a readout
cell. Nobody here has listened to it. **A set that is already chromatic is not
evidence that it was chromatically recorded.**


---

## 3. The size problem, with numbers

### 3.1 The raw arithmetic, which is the part nobody argues with

MEASURED by `node` on this machine, from first principles. Bytes per second of
uncompressed PCM:

| format | bytes/s |
| --- | --- |
| 44100 Hz, 16 bit, stereo | 176,400 |
| 44100 Hz, 16 bit, mono | 88,200 |
| 48000 Hz, 24 bit, stereo | 288,000 |
| 22050 Hz, 16 bit, mono | 44,100 |

**One octave, one velocity layer, 44100/16/stereo**, by note length and by how
many semitones apart the sampled notes are:

| note length | every semitone (12) | every 2nd (6) | every 3rd (4) | every 4th (3) | every 6th (2) |
| --- | --- | --- | --- | --- | --- |
| 3 s | 6.1 MiB | 3.0 MiB | 2.0 MiB | 1.5 MiB | 1.0 MiB |
| 5 s | 10.1 MiB | 5.0 MiB | 3.4 MiB | 2.5 MiB | 1.7 MiB |
| 8 s | 16.1 MiB | 8.1 MiB | 5.4 MiB | 4.0 MiB | 2.7 MiB |
| 12 s | 24.2 MiB | 12.1 MiB | 8.1 MiB | 6.1 MiB | 4.0 MiB |
| 20 s | 40.4 MiB | 20.2 MiB | 13.5 MiB | 10.1 MiB | 6.7 MiB |

**So the headline number is: an octave of stereo CD-quality piano, sampled at
every semitone at one velocity, with eight second notes, is 16 MiB.** Sixteen
velocity layers over 88 notes is where a commercial library's gigabyte comes
from, and the arithmetic below confirms it.

⚠️ **A FLAT NOTE LENGTH IS THE WRONG MODEL AND IT MATTERS BY A FACTOR OF FOUR.**
A piano's bass strings ring far longer than its top octave. The table above uses
a flat length to make the per-octave arithmetic legible; the whole-keyboard
tables below it use a geometric model between 30 s at A0 and 1.5 s at C8.

🔴 **AND THAT MODEL WAS WRONG IN BOTH DIRECTIONS, WHICH IS WHY SECTION 3.5 USES
MEASURED DURATIONS INSTEAD.** The real ones were read out of Salamander's own
FLAC headers (section 2.3) after this section was written. The model said A0
rings for 30 s and C8 for 1.5, a ratio of 20 to 1. **Measured: A0 is 25.00 s and
C8 is 3.89 s, a ratio of 6.4 to 1**, and middle C is 16.19 s against the model's
7.8. So the model was pessimistic in the bass and optimistic across the whole
top half of the keyboard by about a factor of two. **The tables in 3.1 and 3.3
are kept because their job is the shape of the arithmetic, and section 3.5 is
the one to budget from.**

**A whole 88-key set, PCM**, under that model:

| shape | notes | layers | total audio | size |
| --- | --- | --- | --- | --- |
| every semitone, 16 layers, 48/24 stereo | 88 | 16 | 13,496 s | **3,707 MiB** |
| every minor third, 16 layers, 44.1/16 stereo | 30 | 16 | 4,670 s | 786 MiB |
| every minor third, 4 layers, 44.1/16 stereo | 30 | 4 | 1,168 s | 196 MiB |
| every minor third, 3 layers, 44.1/16 mono | 30 | 3 | 876 s | 74 MiB |
| every minor third, 3 layers, mono, 4 s cap | 30 | 3 | 315 s | 26 MiB |
| every major third, 2 layers, mono, 4 s cap | 22 | 2 | 157 s | 13 MiB |

The first row is why this section exists. The last row is still four times the
site's largest asset.

### 3.2 What the spacing buys, exactly

A sampler that picks the NEAREST sampled note and pitch-shifts to the target
has a worst-case shift that follows directly from the spacing:

| spacing | notes over 88 keys | worst shift | length and formant error at the worst shift |
| --- | --- | --- | --- |
| every semitone | 88 | 0 | none |
| every 2nd | 44 | 1 semitone | 5.9 % |
| every 3rd (minor third) | 30 | **1 semitone** | **5.9 %** |
| every 4th (major third) | 22 | 2 semitones | 12.2 % |
| every 6th (tritone) | 15 | 3 semitones | 18.9 % |

🔴 **MINOR THIRDS ARE THE BARGAIN AND THE ARITHMETIC IS WHY.** With four samples
an octave the offsets from the nearest sample are 0, +1, then -1, so **the worst
shift is one semitone**, the same as sampling every second note, at two thirds
of the bytes. Every fourth note gives offsets 0, +1, +2, -1, so the worst case
doubles. This is INFERRED from the arithmetic and is also, as far as this survey
found, what the free libraries do.

⚠️ **AND THE ERROR IS NOT ONLY PITCH.** `AudioBufferSourceNode.playbackRate`
resamples, so a sample played at 2^(1/12) is 5.9 % shorter AND has every
resonance in it moved up 5.9 %, including the hammer knock, the soundboard
body and the room. A piano's body resonances do not move with the note, so a
shifted sample is wrong about the instrument in a way a listener hears as the
piano changing size. At one semitone this is the standard sampler compromise
and is generally accepted; at three it is audible as the cartoon effect.

### 3.3 What a codec does to the bytes

At a constant bitrate the sample rate and the channel count stop mattering, and
the only thing that sets the size is **seconds of audio times bitrate**:

| shape | seconds | 48 kbps | 64 kbps | 96 kbps | 128 kbps |
| --- | --- | --- | --- | --- | --- |
| minor thirds, 3 layers, 4 s cap | 315 | 1.8 MiB | 2.4 MiB | 3.6 MiB | 4.8 MiB |
| minor thirds, 2 layers, 4 s cap | 210 | 1.2 MiB | 1.6 MiB | 2.4 MiB | 3.2 MiB |
| major thirds, 2 layers, 4 s cap | 157 | 0.9 MiB | 1.2 MiB | 1.8 MiB | 2.4 MiB |
| minor thirds, 3 layers, full ring | 876 | 5.0 MiB | 6.7 MiB | 10.0 MiB | 13.4 MiB |

**So the codec is worth a factor of about fifteen against 44.1/16 mono and about
thirty against stereo**, and the note length cap is worth about another three.
Between them they turn 786 MiB into 3 MiB, and every other decision is noise
next to those two.

### 3.4 What a codec does to a piano attack, measured on this machine

🔴 **THIS IS THE ONE PART OF THE SIZE QUESTION THAT IS USUALLY ANSWERED WITH AN
OPINION, SO IT WAS MEASURED.** A synthetic struck-string note was written at
48 kHz: 500 ms of true digital silence, then a hammer knock and 24 inharmonic
partials at an inharmonicity coefficient of 0.00025, decaying. It was encoded
with the ffmpeg on this machine (`libopus` and ffmpeg's native `aac`), decoded
back to PCM, aligned against the original by cross-correlation, and two things
were measured: the energy in the 5 ms BEFORE the attack, relative to the peak,
and how long the 1 ms moving envelope takes to go from 10 % to 90 % of its
maximum.

| encode | bytes | pre-echo in the 5 ms before the attack | envelope rise |
| --- | --- | --- | --- |
| **reference** | 192,044 | -236.6 dB (digital silence) | **3.35 ms** |
| Opus 48 kbps | 11,292 | **-33.5 dB** | 3.38 ms |
| Opus 64 kbps | 14,606 | **-32.9 dB** | 3.40 ms |
| Opus 96 kbps | 22,275 | **-36.6 dB** | 3.40 ms |
| Opus 128 kbps | 28,259 | -48.9 dB | 3.31 ms |
| AAC 48 kbps | 12,022 | **-51.4 dB** | 3.33 ms |
| AAC 64 kbps | 15,387 | -51.8 dB | 3.33 ms |
| AAC 96 kbps | 21,078 | -51.0 dB | 3.40 ms |
| AAC 128 kbps | 26,132 | -59.6 dB | 3.42 ms |
| Opus 96 kbps, 5 ms frames | 23,134 | -40.3 dB | 3.31 ms |
| Opus 96 kbps, 10 ms frames | 22,479 | -40.4 dB | 3.38 ms |

**Three findings, and the first one contradicts the folklore:**

1. 🔴 **NEITHER CODEC SMEARS THE ATTACK ITSELF.** Every encode reproduces the
   reference's 3.35 ms envelope rise to within 0.1 ms. The sentence *"a codec
   destroys a piano attack"* is not what happens and should not go on the page.
2. 🔴 **WHAT HAPPENS IS PRE-ECHO, AND OPUS IS ABOUT 18 dB WORSE AT IT THAN AAC
   AT THE SAME BITRATE.** Opus at 96 kbps puts noise 36.6 dB below the peak in
   the 5 ms before a hard attack; ffmpeg's AAC at 48 kbps puts it 51.4 dB down.
   Opus at 128 kbps is still 3 dB worse than AAC at 48. INFERRED cause: Opus's
   default frame is 20 ms and CELT spreads quantisation noise across it, while
   AAC switches to short blocks of 2.67 ms across a transient.
3. ✅ **AND SHORTENING OPUS'S FRAME RECOVERS ABOUT 4 dB FOR ABOUT 4 % MORE
   BYTES.** 20 ms to 10 ms took the 5 ms pre-echo from -36.6 dB to -40.4 dB and
   the file from 22,275 to 22,479 bytes. Going further to 5 ms bought nothing
   and cost 4 %.

⚠️ **AND THE HONEST CAVEATS, WHICH ARE LARGE.** This is ONE synthetic note with
an unnaturally sharp onset, encoded by ffmpeg's encoders on this laptop, judged
by an energy measure and not by a listening test. The lead of true digital
silence is the worst case a codec can be given; a real recording has room tone
in front of the attack that masks pre-echo, and no free library ships a note
with half a second of digital silence on the front.

🔴 **THE PRACTICAL CONSEQUENCE IS A DESIGN RULE AND IT DISSOLVES MOST OF THE
PROBLEM.** Pre-echo lives in the few milliseconds BEFORE the attack. A sampler
that trims each file to start a few milliseconds before the onset, and applies a
2 to 5 ms fade-in when it starts a voice, throws away exactly the region the
pre-echo occupies. **Trim and fade, and the codec choice stops being interesting.**

FLAC on the same note came out at 41,812 bytes against 192,044, which is 21.8 %.
⚠️ **THAT RATIO IS MEANINGLESS AND IS QUOTED ONLY TO SAY SO**: a synthetic sum
of 24 sinusoids is far more predictable than a recording. The real ratio on
Salamander is measurable now that section 2.3 has both the byte sizes and the
exact durations: `C4v8.flac` is 1,774,472 bytes for 16.19 s of 48 kHz 24-bit
stereo, which is **109.6 kB/s against 288 kB/s uncompressed, or 38 per cent**.
That is better than the 50 to 60 per cent usually quoted for piano, and the
reason is visible in the durations: most of each file is a very quiet tail.

#### And the container, which is a different question from the codec

🔴 **THE SAFE CONTAINER IS AAC IN MP4 OR M4A, AND THE EVIDENCE IS A SHIPPING
LIBRARY'S SOURCE RATHER THAN A SUPPORT TABLE.** `smplr`'s `load-audio.ts`
carries this comment: *"Safari reports it can play OGG but **decodeAudioData
fails on many samples**. Skip OGG entirely on Safari and use the fallback format
(mp3/m4a)."* It accordingly ships **m4a to Safari and ogg to everyone else**.
That is somebody who hit the bug in production, and it says exactly the thing
that matters here: **`canPlayType` and `decodeAudioData` disagree on Safari**.

⚠️ **AND THE SUPPORT TABLES CANNOT SETTLE IT, WHICH THEY SAY THEMSELVES.**
caniuse's Opus and FLAC rows both carry *"Support refers to this format's use in
the `audio` element, not other conditions."* So they are not evidence about
`decodeAudioData` at all. What they do say: Opus is Chrome 33, Firefox 15,
Edge 14, **Safari desktop partial from 11 through current**, Safari iOS partial
11 to 18.3 then full from 18.4. MDN's own note, which is dated, says Safari
supports Opus *"only when packaged in a CAF file"*.

🔴 **SO THE PLAN PICKS AAC AND THE MEASUREMENT AGREES WITH THE COMPATIBILITY.**
Section 3.4 already found AAC about 18 dB better than Opus on pre-echo at the
same bitrate, and this section finds it the only container with no Safari
question mark. **That is two independent reasons pointing the same way**, which
is rarer than it sounds and is the reason this is not a close call.
⚠️ **IT IS STILL UNMEASURED IN A BROWSER HERE.** Nobody on this desk has run
`decodeAudioData` on anything. `demo/verify-native.mjs` and
`demo/verify-safari.mjs` are the two harnesses that would settle it and neither
was run.

### 3.5 The recommended budget, from measured durations

🔴 **EVERY NUMBER IN THIS SECTION IS BUILT ON REAL FILE DURATIONS RATHER THAN ON
THE MODEL.** All 30 of Salamander's sampled notes had their FLAC `STREAMINFO`
read today, and the length cap is the only variable left.

**The whole set of notes at 96 kbps**, with the cap applied per file:

| cap | one layer | two layers | **three layers** | four layers |
| --- | --- | --- | --- | --- |
| 1.5 s | 0.51 MiB | 1.03 MiB | 1.54 MiB | 2.06 MiB |
| 2 s | 0.69 MiB | 1.37 MiB | 2.06 MiB | 2.75 MiB |
| 2.5 s | 0.86 MiB | 1.72 MiB | 2.57 MiB | 3.43 MiB |
| **3 s** | **1.03 MiB** | **2.06 MiB** | **3.09 MiB** | **4.12 MiB** |
| 4 s | 1.37 MiB | 2.74 MiB | 4.12 MiB | 5.49 MiB |
| 6 s | 1.96 MiB | 3.93 MiB | 5.89 MiB | 7.85 MiB |
| **no cap** | 4.84 MiB | 9.67 MiB | **14.51 MiB** | 19.35 MiB |

**And the three extras Salamander already records**, at their measured lengths:

| extra | count | measured length | at 96 kbps |
| --- | --- | --- | --- |
| **releases**, one per sampled note | 30 of its 88 | **0.46 s** | **0.16 MiB** |
| releases, all 88 chromatic | 88 | 0.46 s | 0.46 MiB |
| **resonance**, the short set | 23 | **1.90 s** | **0.50 MiB** |
| resonance, the long set | 23 | 2.80 s | 0.74 MiB |
| **pedal noise**, 2 down and 2 up | 4 | 6.38 s down, 0.70 s up | **0.05 MiB** capped at 1.5 s |

🔴 **RECOMMENDED BUDGET: 3.80 MiB, WHICH IS 3,982,800 BYTES.** Three velocity
layers at a 3 s cap (3.09), 30 releases (0.16), the short resonance set (0.50)
and the pedal noise (0.05). What it buys, item by item:

- **All 88 keys playable**, of which 30 are the real recording and 58 are one
  semitone away from one.
- **Three velocity layers, chosen from Salamander's sixteen.** Section 2 found
  that the free libraries run from one layer to sixteen; three is where the
  character changes from soft to hard without the layer switch becoming the
  loudest event in a phrase.
- **Three seconds of each note, and the cap is the lever worth arguing about.**
  🔴 **MEASURED, AND IT IS NOT ONLY THE BASS THAT GETS CUT:** Salamander's notes
  run from **25.00 s at A0 to 3.89 s at C8**, and middle C is **16.19 s**, so a
  3 s cap truncates EVERY note on the keyboard including the top one. Uncapped,
  the same three layers are **14.51 MiB**.
  ✅ **A LEVEL TRIM BEATS A FLAT CAP AND COSTS ONE PASS.** Most of those seconds
  are a very quiet tail: cut where the envelope falls below about 60 dB under
  that file's peak, fade out over 200 ms, and the audible length is kept while
  the bytes go. The flat cap is the fallback if the level trim turns out to
  leave audible stops, and the numbers above are the flat cap because that is
  the one that can be computed without decoding anything.
- **A release sample per sampled note.** The damper hitting the string.
- **The recorded sympathetic ring with the pedal down**, which section 5.2 says
  is a stand-in and not a coupled model.
- **Three seconds of 4G.** Arithmetic: 3.80 MiB at 10 Mbit/s is 3.2 s, at
  50 Mbit/s is 0.6 s, at 200 Mbit/s is 0.16 s.

⚠️ **AND IT IS FETCHED LAZILY, PER OCTAVE, ON THE FIRST PRESS AND NEVER ON A
VISIT.** `CLAUDE.md`'s most-repeated rule. At the 3 s cap a file is 35 KiB, the
three layers of one note are 105 KiB and an octave around middle C is
**0.41 MiB**, so the first note can sound inside a few hundred milliseconds
while the rest arrives behind it.

---

## 4. What drives it

The ask names two candidates and there are four worth comparing. Each row below
says what it would cost in this repository, not in the abstract.

### 4.1 Plain Web Audio, one `AudioBufferSourceNode` per note

**What it is.** Decode each sample once into an `AudioBuffer`. On note-on, make
a `AudioBufferSourceNode`, set `playbackRate` to the pitch ratio, run it through
a `GainNode` for the velocity trim and the damper envelope, `start()`. On
note-off, ramp the gain down over the damper time and stop.

| | |
| --- | --- |
| **ships** | 0 bytes of engine. The browser is the engine. |
| **already here** | `demo/tom/index.html` does exactly this without the pitch |
| **latency** | the node graph's own, which is `AudioContext.baseLatency` plus the hardware. Nothing is added. |
| **polyphony** | each voice is a native node, not a JS loop. Not measured here; a pedalled piano reaches well over 100 ringing voices and this is the only option where that costs the page nothing. |
| **sample accuracy** | `start(when)` is sample accurate, so a note can be scheduled rather than fired |
| **what it cannot do** | anything per sample. No sympathetic resonance model, no string coupling, no cross-voice interaction beyond a shared convolution or filter. |

🔴 **AND THE REPOSITORY'S OWN RULE POINTS HERE BEFORE ANY OF THAT.**
`positron-ui`: *"BUILD FROM `/kit/`. Almost everything below exists because
somebody hand-rolled a control that was already in `demo/shell/`."* The sampler
version of that rule is that `AudioBufferSourceNode` IS the sampler, natively,
in every browser, and anything else is a second implementation of it.

### 4.2 An AudioWorklet sampler

**What it is.** One processor that owns every voice, reads `Float32Array`s of
sample data, and mixes on the audio thread, the way `demo/muta/muta-worklet.js`
does for two wasm firmwares.

| | |
| --- | --- |
| **ships** | a few KB of JS, plus the same samples |
| **already here** | the pattern, in `muta-worklet.js` and `demo/shell/impulse-worklet.js` |
| **buys** | per-sample control: a real damper model, string coupling, a resonance bus that every held string feeds |
| **costs** | the whole mixer written by hand in JS, including resampling, which the browser's own node does in native code. And `muta`'s own measured trap: a worklet cannot `fetch`, so every buffer crosses the port as bytes. |
| **verdict** | **right if and only if the page is about sympathetic resonance.** For "play the notes", it is a slower reimplementation of a native node. |

⚠️ **THE HONEST CASE FOR IT IS ONE FEATURE AND SECTION 5 REFUSES THAT FEATURE.**
Sympathetic resonance with the dampers up cannot be done with independent buffer
sources, because it is by definition an interaction between strings. If that is
ever wanted, this is the road. It is not wanted in version one.

### 4.3 scsynth compiled to wasm

**What it is.** `bootScsynth()` from `demo/shell/scsynth.mjs`, then a SynthDef
per voice, buffers via `/b_alloc` and `/b_read`, notes via `/s_new`.

| | |
| --- | --- |
| **ships** | 1,877,163 bytes MEASURED, of which 1,701,983 is the wasm |
| **boot** | REPORTED at 747 ms in `muta`'s own log line; not re-measured here |
| **buys for a piano** | `PlayBuf.ar` with a rate, an envelope, and voice allocation. Every one of those is a Web Audio node. |
| **costs beyond the bytes** | a compiled `.scsyndef`, which in this repository is compiled by sclang **on the Raspberry Pi** and checked in, with a whole build refusal (`checkCompiledDefs()`) existing to catch it going stale. A piano would add a second such artefact and a second staleness surface. |
| **verdict** | **no.** |

🔴 **THE ARGUMENT IS NOT THAT SCSYNTH IS HEAVY. IT IS THAT IT BUYS NOTHING
HERE.** `/grains/` and `/radio/` boot it because Pappus is a SuperCollider
engine that runs on the board and the page's whole claim is that the browser is
running the same graph. There is no piano on the board, there is no `.scsyndef`
to be faithful to, and a piano needs no UGen a browser lacks. Spending 1.7 MB
and a Pi-compiled artefact to get `PlayBuf` is the shape of decision this
project's `CLAUDE.md` refuses most consistently.

### 4.4 A physically modelled piano

**What it is.** No samples at all. A hammer excitation into a string model,
inharmonicity from an allpass dispersion filter, two or three detuned strings
per note coupled through a bridge, and a soundboard. Ships kilobytes.

| | |
| --- | --- |
| **ships** | single-digit KB of arithmetic |
| **already here** | the SHAPE, in `demo/shell/rhodes.mjs` and `demo/shell/moog.mjs`: pure per-sample functions with no Web Audio nodes, so the same code runs in node and on the Pi |
| **buys** | every note distinct, every velocity continuous rather than layered, unlimited note length, and a sustain pedal that can be modelled properly rather than approximated |
| **costs** | the piano is the hardest instrument in physical modelling, and the survey below says so with numbers rather than as an opinion |
| **verdict** | **not the shipping sound. Possibly the second half of the page.** |

#### Three premises the research overturned

🔴 **THE mda PIANO IS NOT SAMPLE-LESS. IT IS A FIFTEEN KEYGROUP ROMPLER.**
`mdaPiano.cpp` includes `mdaPianoData.h`, which is **3,275,026 bytes of ASCII C
whose first line is `short pianoData[] = {`**: 586,349 shorts, **1,172,698 bytes
of raw PCM**, about 26.6 seconds of mono 22.05 kHz audio. Fifteen keygroups with
roots hard-coded at MIDI 36 to 93, one sample and one velocity layer each. The
whole audio loop is linear interpolation into a wavetable, one exponential
envelope multiplier, a one-pole muffle filter fixed at note-on, and a 256 sample
comb for pseudo-stereo. **There is no physical model in it at all**, and its
"Hardness" control works by selecting a different keygroup. Licence is dual
MIT / GPL2+ at the licensee's choice, and `elk-audio/mda-vst2` carries plain
MIT. **Porting it would ship 1.17 MB of PCM and call it code.**
⚠️ SuperCollider's `MdaPiano` is the same `pianoData[]` array, so it is
excluded for the same reason.

🔴 **STK HAS NO PIANO CLASS.** Confirmed from its own header listing: `PitShift.h`
goes straight to `Plucked.h`. What it has is **`StifKarp`, 334 lines of code and
zero sample files**, a Karplus-Strong with the Jaffe and Smith enhancements
whose stiffness is four **second-order allpass sections** spread from twice the
fundamental up to Nyquist, with pole radius `0.5 + stretch/2`. That is a real
dispersion filter. `Twang` is the better substrate because it accepts an
external excitation, which is what commuted synthesis needs. STK is effectively
MIT. ⚠️ **Its excitation is white noise, which is exactly why it sounds
plucked.**

🔴 **FAUST'S `physmodels.lib` HAS NO PIANO EITHER.** Verified three ways,
including a grep of the 5,203 line source: zero hits. Its `strikeModel` is
filtered noise through an envelope, which is a struck BAR, and there is no
hammer, no string coupling, no soundboard and no damper anywhere in the library.
✅ **But Faust's `examples/` has three**, and one of them is portable:
`faust-stk/piano.dsp` is a waveguide commuted piano with a real sustain-pedal
envelope, and it **cannot compile to WebAssembly** because it makes 24
`ffunction` calls into a C header; **`piano1.dsp`, the same model revised by
David Braun with those tables replaced by 34 breakpoint functions, has zero live
`ffunction` references** and exposes `freq`, `gain` and `gate`, so `-poly`
should work. Licence STK-4.3, an MIT-style licence.
⚠️ **UNCOMPILED. No wasm size, no voice count and no CPU cost exist for it**,
and anyone planning on a number must measure one.

#### What a piano model has to have, with the published values

This is the part that turns *"the piano is the hardest instrument"* into a
specification, and it is why 4.4 is not the shipping sound.

- **The hammer, which is the piece nobody hands you.** Force law `F = K * dy^p`.
  Hall and Askenfelt measured **p between 2.2 and 3.5 for used hammers** and
  1.5 to 2.8 for unused, with a keyboard trend of **p ≈ 2 in the bass rising to
  p ≈ 4 in the treble**, peak forces 200 to 300 N, and real hysteresis, so K and
  p differ between compression and relaxation. **Contact time falls from about
  4 ms in the bass to under 1 ms in the highest treble**, which is a physical
  lowpass on the excitation: partials whose period is much shorter than the
  contact are barely excited at all. **Neither mda nor STK has one.**
- **Strike position**, and the familiar rule is wrong at the top: traditional is
  between 1/7 and 1/9 of the string, **but the modern treble at C8 uses between
  1/12 and 1/17**. At 1/7 the seventh partial is almost completely missing.
- **Inharmonicity.** `f_n = n * F0 * sqrt(1 + B * n^2)` with
  `B = pi^3 * E * d^4 / (64 * T * L^2)`, where `d` is the string diameter.
  MEASURED B from a six piano L1 fit (Rigaud, David and Daudet, *JASA* 133(5),
  2013), which comes out as
  **`B(m) = exp(0.0926 * m - 13.64)`** for MIDI note `m`: **C3 1.02e-4,
  C4 3.08e-4, A4 7.10e-4, C6 2.85e-3, C7 8.65e-3, C8 2.63e-2**. It agrees with
  Young's 1952 physically derived slope to within 2 per cent and with Bank's
  independent measurement at A#4 to within 4 per cent, which is two separate
  studies landing on the same curve.
  ⚠️ **TWO CAVEATS ON THAT FIT.** It holds for PLAIN strings; wound bass strings
  give a lower value, so the fit read below C4 is an extrapolation out of its
  own range. And `dsprelated.com`'s page on dispersion filter design prints a
  form that is **four times too small** and is internally inconsistent with its
  own left-hand expression: checked numerically at C4 it gives 9.0e-5 against a
  measured 3.1e-4. Use the diameter form above.
  🔴 **AND ONE PUBLISHED FIGURE IN CIRCULATION IS WRONG BY MORE THAN A FACTOR OF
  TEN.** Hinrichsen (arXiv:1203.5101) states B rises *"up to 0.4 for treble
  strings"* while **his own figure 4 has a log axis topping out near 1e-2**. It
  has been repeated forward into a 2023 Frontiers paper. Every corroborated
  source puts the treble ceiling near 2.6e-2. **Do not use 0.4.**
  ⚠️ **AND THAT IS THIS PROJECT'S OWN LESSON ARRIVING FROM THE LITERATURE**: a
  confident sentence outliving its own figure, then being cited by somebody who
  read the sentence and not the figure.
  ⚠️ And the counterintuitive half: **B is largest in the treble and matters
  most in the bass**, because a bass note exposes far more audible partials.
  Filter order needed: prior work tuned the first tens of partials of any real
  piano string with a **total allpass order of 20 or less**, and practical
  designs use 8 first-order or 4 second-order sections.
- **Two or three strings per note, COUPLED and not merely summed.** Weinreich,
  *JASA* 62(6), 1977, pp. 1474 to 1484, named the two stages **prompt sound**
  and **aftersound**, and showed the effect is LINEAR coupling through a bridge
  with both resistance and reactance. 🔴 **Summing detuned strings produces
  beating in amplitude and fails to produce the two stage decay at all.**
  ⚠️ **The detuning in cents is the weakest number in this whole research.** No
  published table was found. Technician sources suggest 0.3 to about 2 cents.
  Treat it as a tunable and say so.
- **Stretched tuning is real and is ±30 cents at the extremes**, verified
  independently by Rigaud and by Bank, against about ±5 cents in the middle.
- **The soundboard, and the trick that makes it free.** Commuted synthesis:
  the radiated sound is `E(z) * S(z) * R(z)`, all three are linear and
  time-invariant, so it equals `[E(z) * R(z)] * S(z)`, and the bracket is computed
  ONCE, offline, into a wavetable. A soundboard response of any length then
  costs nothing per sample. The nonlinear hammer survives because after
  deconvolution the interaction is a few discrete impulses filtered in a
  velocity-dependent way. Van Duyne and Smith, ICMC and WASPAA 1995.
  ⚠️ **Note what commuted synthesis is: it puts a recording back in.** A model
  that ships a soundboard wavetable is not sample-free, which is the honest
  reading of the whole approach.

#### What runs in real time, and what does not

| model | licence | real time? |
| --- | --- | --- |
| **Qiano** (`FigBug/Piano`) | GPL-2.0 | 🟢 **MEASURED on its own CI: 1 voice at 119.5x, 16 voices at 22.0x real time on Linux** |
| OpenPiano | **AGPL-3.0** | 🟢 yes, author calls it alpha and says it *"sounds like a strangely out of tune piano with no soundboard and only one string per note"* |
| Faust `piano1.dsp` | STK-4.3, MIT-style | 🟢 waveguide, but uncompiled and unmeasured |
| Csound `prepiano` (Bilbao and ffitch) | LGPL | ❓ no figure published |
| Bank's modal piano | **no code released** | 🟢 10,000 second-order resonators at 30 per cent of a 2008 Core 2 Duo |
| Chabassier / MONTJOIE | INRIA | 🔴 **24 hours on a 300 CPU cluster for one second of sound**, and the authors call it *"a crude skeleton of the instrument"* |

🔴 **QIANO'S NUMBER IS THE ONE THAT SAYS A BROWSER PIANO IS POSSIBLE AT ALL:
sixteen voices at 16 to 22 times real time, native, with a genuine hysteretic
hammer oversampled three times and a three iteration implicit solve.** A
WebAssembly build gives some of that back, and 16 voices is not a pedalled
piano. **It is GPL-2.0, which is a decision about this repository and not about
one page.**
⚠️ **AND `rodolphomacedo/piano` IS NOT A SHORTCUT.** MIT OR Apache-2.0, Rust
with a `piano-wasm` AudioWorklet target, created 2026-08-22, **zero stars**, and
its README says the browser build is *"a single voice, no MIDI, no polyphony
yet"*. Its own design note is the sentence to keep: *"A full piano is up to 240
simultaneously ringing strings. The difference between O(1) and O(hundreds) per
string per sample decides whether that is possible at all on a laptop."*

⚠️ **AND THE COMPARISON IS THE INTERESTING THING, WHICH IS WHY THIS IS NOT A
FLAT NO.** A page that can play the same phrase through 3.8 MiB of recording and
through 4 KB of arithmetic, and prints both numbers, is a positron demo. A page
that ships only the model and calls it a piano is a page whose `what` sentence
would be false. Section 6 puts `rhodes.mjs` behind a switch and says so on the
page, because it is here, it is 60 lines, and it is already honest about not
being a recording.

### 4.5 The comparison, in one table

| | ships | reuses | gives a piano | verdict |
| --- | --- | --- | --- | --- |
| Web Audio buffer sources | 0 B | `tom`'s pattern, `midi.mjs` | the recording, pitch-shifted at most 1 semitone | **yes** |
| AudioWorklet sampler | a few KB | `muta-worklet.js` | the same, plus a resonance model | only if resonance is the subject |
| scsynth wasm | 1.88 MB | `scsynth.mjs` | nothing Web Audio lacks | no |
| physical model | ~4 KB | `rhodes.mjs`'s shape | a struck string that is not yet a piano | as the comparison, behind a switch |
| a sampler library | 23 to 131 kB | nothing here | the notes, and **no pedal and no releases in any of them** | no, and section 4.6 says why |

### 4.6 The libraries that already do all of this, and why not one of them

There is a fifth answer the ask did not name: **use somebody's sampler library.**
It deserves a real look rather than a reflex, because this project's own rule is
to reach for what exists.

VERIFIED from the npm registry today:

| package | version | licence | unpacked | files |
| --- | --- | --- | --- | --- |
| `tone` | 15.1.22 | MIT | **5,401,640 B** | 886 |
| `smplr` | 1.0.0 | MIT | **1,034,924 B** | 8 |
| `spessasynth_lib` | 4.3.14 | Apache-2.0 | 2,402,884 B | 8 |
| `js-synthesizer` | 1.13.0 | BSD-3-Clause | 6,932,424 B | 101 |
| `webaudiofont` | 3.0.4 | **GPL-3.0-or-later** | 5,497,869 B | 89 |

Sizes over the wire, which is what matters and is not the same number:
`tone` is **336,893 B minified, 76,599 gzip** (bundlephobia, whole library, no
tree shaking); `smplr` is **70,033 min, 23,180 gzip, zero dependencies**;
SpessaSynth's worklet plus its main-thread API measure **116,335 + 15,015 bytes
brotli**; `js-synthesizer`'s AudioWorklet path is about **194 kB brotli**
before any SoundFont, since its libfluidsynth is an Emscripten `SINGLE_FILE`
build with roughly 330 kB of wasm inlined as base64.

🔴 **AND HERE IS THE FINDING THAT DECIDES IT: NOT ONE OF THE SAMPLER LIBRARIES
IMPLEMENTS A SUSTAIN PEDAL, AND NOT ONE PLAYS A RELEASE SAMPLE.**

- **`tone`'s `Sampler` has no MIDI and no pedal concept at all.** VERIFIED in
  its source: it finds the closest mapped pitch by walking outward a semitone at
  a time and sets `playbackRate`; velocity is a plain gain multiplier passed to
  the buffer source, so **there is no velocity-layer concept either**; and a
  grep for `sustain` across the file finds only the ADSR sustain LEVEL of
  `Synth` and `Envelope`. Its `release` default of 0.1 s with an exponential
  curve resolves to a time constant of about **18 ms**, which for a piano is a
  hard key-up cut rather than a damper. Repeated `triggerAttack` on one pitch
  **stacks voices and nothing steals**.
- 🔴 **`smplr` LOOKS LIKE IT SUPPORTS THE PEDAL AND DOES NOT, AND THIS PLAN
  SAID IT DID UNTIL THE SOURCE WAS READ.** Its README shows
  `piano.setCC(64, 127); // sustain pedal on`. The source comment says what it
  really does: *"Set a MIDI CC value. **Affects region matching** for
  groups/regions that have `ccRange` constraints"*. The body only writes to a
  map, that map is read in exactly one place (`RegionMatcher.match()`), the stop
  path never consults it, **and no bundled preset declares a `ccRange` at all**,
  `SplendidGrandPiano` included. **`setCC(64, 127)` changes nothing.**
  ⚠️ **THAT IS THIS PROJECT'S OWN MOST EXPENSIVE DEFECT SHAPE ARRIVING FROM
  OUTSIDE**: a control that reads as live and is inert, exactly like `/mirror/`'s
  full screen button optional-chaining past a missing method. A page built on it
  would have a pedal that looked implemented and did nothing, and the author
  would have a README quote to point at.
- **`webaudiofont` is GPL-3.0-or-later on the code**, which is a decision about
  this whole repository rather than about one page. Its sample DATA repository
  is MIT, but that is the packager's own licence over material converted from
  other people's soundfonts, and `Aspirin`, `Chaos`, `JCLive`, `SBLive` and
  `SoundBlasterOld` carry **no upstream licence statement anywhere**. Its
  piano files are remarkably small (137 kB to 957 kB gzipped, one request), its
  sample data has not been touched since **2019-03-07**, and it has no velocity
  layers, no release samples and no CC 64.
- **No usable browser SFZ player exists.** `sfz-web-player` is `"private": true`
  and not on npm, and its audio path drops note-off on the floor with no
  envelope, no release and no CC of any kind. `sfizz` is **archived**, and the
  `sfizz-webaudio` port builds from an `emscripten` branch that does not exist
  on the upstream repository. `sfzformat.com` lists twenty players and exactly
  one is browser-based, and it is the stub. **Converting SFZ offline is the only
  route, which is what section 8's build script does.**

✅ **ONE LIBRARY GETS THE PEDAL RIGHT, AND IT IS WORTH NAMING PROPERLY.**
**SpessaSynth** (`spessasynth_lib`, Apache-2.0, pushed yesterday) documents
controller 64 in its own MIDI implementation table as *"Holds the Note Off
messages until the pedal is off, then stops them all at once"*, marked as engine
behaviour that a soundfont cannot switch off. That is the correct damper
semantic. It is an AudioWorklet, it is about **131 kB brotli**, it reads SF2,
SF3, DLS and SFOGG, and it ships Web MIDI handling. CC 67, the soft pedal, is
there too.
⚠️ **AND IT IS A SOUNDFONT SYNTHESIZER, WHICH IS THE REASON IT IS NOT THE
ANSWER HERE.** What it would play is a GM bank's piano, at soundfont fidelity
with no release samples and no recorded resonance, and its one measured complete
bank is **8,423,728 bytes**. **If a future page wants General MIDI in a browser,
this is the thing to reach for**, and that is worth writing into `BACKLOG.md`
whatever happens to `nola`.

🔴 **SO THE ~150 LINES OF OWN WEB AUDIO IS NOT COMPETING WITH A PEDAL
IMPLEMENTATION, BECAUSE THERE IS NOT ONE TO COMPETE WITH.** Every one of these
libraries requires the page to hold its own note state and defer note-off while
CC 64 is down, which is precisely the `keysDown` and `pedalHolds` pair
`/muta/` already wrote. **Adopting a library would mean writing section 5's
module anyway and then handing it a sampler that also cannot do releases.**

⚠️ **AND THE SECOND REASON IS WHERE THE SAMPLES COME FROM.** `smplr` fetches its
instruments from `smpldsnds.github.io` at runtime. That is a page on this site
opening somebody else's host on every visit and on every harness run, which is
the thing `CLAUDE.md` refuses in its own words: *"the rule is about whose server
it is, not about which harm has been named yet"*.

⚠️ **THE HONEST SUMMARY**: if the page only had to make a piano sound, `smplr`
plus its 4-layer Splendid Grand is a good afternoon and should be said so
plainly. What it cannot give is the pedal, the releases, the press-to-sound
measurement, the shift readout, or pedal logic gradeable in node, and those five
are what make this a positron page rather than a piano.

---

## 5. The sustain pedal, properly

### 5.1 What `/muta/` already does, and it is right

MEASURED by reading `keysDown`, `keyUp` and `keyControl` in
`demo/muta/index.html`, written
2026-09-22 in answer to *"how can i get long sustaned notes, drony ones? i do
have sustain pedal but"*:

```js
const keysDown = new Set(), pedalHolds = new Set();

function keyDown(note, vel) { keysDown.add(note); pedalHolds.delete(note); … }
function keyUp(note)        { keysDown.delete(note); if (pedal) { pedalHolds.add(note); return; } noteOff(note); }

function keyControl(cc, value) {
  if (cc !== 64) return;
  const down = value >= 64;
  if (down === pedal) return;          // act only on a change
  pedal = down;
  if (down) return;
  for (const n of pedalHolds) if (!keysDown.has(n)) noteOff(n);
  pedalHolds.clear();
}
```

**Four things in that are correct and all four are the things a first
implementation gets wrong:**

1. **Two sets, not one.** A key pressed again while the pedal is down is removed
   from `pedalHolds`, so lifting the pedal cannot steal a note that is still
   under a finger.
2. **The threshold is 64, not 127.** DOCUMENTED, fetched from midi.org today:
   controller 64 is `Damper Pedal on/off (Sustain)` with *"≤63 off, ≥64 on"*.
   Controllers 65 to 69 use the same threshold. A test for `=== 127` works on a
   cheap switch pedal and fails on an expensive one.
3. **It acts only on a CHANGE.** A pedal held down repeats its value, and
   releasing every held note on each repeat would stutter under a foot that is
   not moving.
4. **Switching MIDI off forgets the foot.** `pedal = false` and both sets
   cleared, because *"a pedal left down across a switch off would hold the next
   session's first note for ever, and nothing on screen would say why"*.

🔴 **SO `nola` SHOULD NOT WRITE THIS AGAIN. IT SHOULD LIFT IT INTO THE KIT
FIRST.** `positron-ui`'s own words: *"a control that exists in one page and
nowhere else is a component that has not been noticed yet."* Two pages with
a sustain pedal is two copies, and this repository has paid for two copies of
one function twice (`rowHTML` printing `undefined` over every demo name,
`moq.mjs` importing a renamed URL).

**Proposed: `demo/shell/pedal.mjs`**, owning the two sets, the 63/64 threshold,
the change filter, the panic, and the reading of how many notes are held by the
foot rather than by a hand. A page owns what `noteOff` means on its own graph.
⚠️ **AND `demo/shell/pedal-test.mjs` BESIDE IT**, because this is pure set
arithmetic with no audio in it at all, which is exactly the bargain
`looper-test.mjs` already makes: *"None of those needs a browser to catch, and
the page that carried them is one no harness may open."* The four failure modes
above are four negative controls, written so that the bug fails them.

⚠️ **AND `/muta/` SWITCHES TO IT IN THE SAME CHANGE.** A kit module with one
caller and one copy left behind is the drift this repository keeps measuring.

### 5.2 What a real pedal does that the code above does not

| | what it is | cost to implement | for `nola` |
| --- | --- | --- | --- |
| **the 63/64 threshold** | controller 64, off at 0 to 63, on at 64 to 127 | already done | **do it** |
| **re-pedalling** | lifting and re-pressing the pedal within a phrase. Notes released while the pedal was up stay released; notes still under a finger are re-captured when it goes down again | free, and it falls out of the two-set design: `pedalHolds` is cleared on lift, `keysDown` is not | **do it, and assert it** |
| **the damper is a release, not a stop** | a real damper takes 50 to 150 ms to silence a string, and longer in the bass | one `gain.setTargetAtTime` instead of `stop()`. `rig/board/synth.mjs` already picked `DAMP_SEC = 0.12` for the same reason | **do it** |
| **half-pedalling** | a continuous pedal sends the whole 0 to 127 range on controller 64, and the damper rides just clear of the strings, shortening the decay rather than stopping it | map the continuous value to the damper time constant. Perhaps ten lines. The hard part is not the code, it is that a switch pedal only ever sends 0 and 127, so nothing on this desk can grade it | **implement the reading, say on the page that only a continuous pedal will show it** |
| **release samples** | the thud of the damper landing and the key returning. 0.14 MiB for 30 of them | a second buffer per sampled note, fired at note-off at a velocity-scaled gain | **do it, it is the cheapest realism on the list** |
| **sympathetic resonance** | with the dampers up, every undamped string is excited by every other through the bridge. It is why a pedalled chord blooms | **the real thing cannot be done with independent buffer sources at all**, because it is by definition an interaction. What CAN be done is what Salamander already records: 69 resonance samples over 23 notes at three layers, fired per note when the pedal is down, which is **0.50 MiB at one layer** | **ship the recorded stand-in, and say on the page what it is not** |
| **sostenuto (CC 66)** | the middle pedal: holds only the notes already down when it was pressed | a third set, perhaps fifteen lines | **refuse it**: nothing on this desk sends CC 66 |
| **una corda (CC 67)** | the left pedal: the action shifts so the hammer strikes fewer strings, changing timbre not just volume | needs a second set of samples recorded with the shift. There is no cheap version | **refuse it**, and refuse the version that just turns the volume down, which is the lie |

🔴 **THE ONE TO SAY OUT LOUD IS STILL SYMPATHETIC RESONANCE, AND THE SURVEY
CHANGED THE VERDICT WITHOUT CHANGING THE SENTENCE.** Salamander records it, so
the demo can have the bloom for about half a megabyte. **What the recording
cannot give is the interaction**: firing one note's resonance sample gives that
note's response to a piano with the dampers up, and says nothing about the other
five notes being held at the same time. It is a layer per key, not a coupled
model.

⚠️ **SO THE PAGE SAYS IT IN ONE SENTENCE, AND NOT IN THE FORM OF AN APOLOGY**:
with the pedal down each note also plays the piano's recorded ring, and the
strings do not hear each other. A page that instead switched a reverb in on
pedal-down would be claiming the mechanism and delivering an effect, which is
the shape this project calls a control that lies.
⚠️ **AND THE HONEST WAY TO SETTLE IT IS A LISTENING TEST NOBODY HAS RUN**: the
recorded stand-in against the same phrase with it off, and against a real piano
if one is to hand. Section 7.

### 5.3 Three traps that come from this desk specifically

🔴 **THE PEDAL IN THIS BUILDING MAY NOT SEND CONTROLLER 64, AND NOBODY HAS
CHECKED.** `research/evo-mk425c-face-2026-09-21.md` records the rear panel as
printing `SUSTAIN - C21`, and `plans/plan-fasttrack-mk425c.md` §4.5 quotes the
manual: the footswitch is *"fully MIDI assignable"*. `/evo/`'s own source says
it directly: *"Which MIDI controller number a given slot sends is a per preset,
per unit setting held in non volatile memory and printed in none of the three
manuals."* So **CC 64 is the DEFAULT, not a measurement.**

🔴 **AND ITS POLARITY IS SENSED AT POWER UP.** DOCUMENTED, quoted verbatim in
`plans/plan-fasttrack-mk425c.md` §4.5 from the manual: *"On power up, the
sustain pedal is assumed to be in the OFF position. So, if you want the sustain
pedal to be off when it is unpressed, make sure the pedal is unpressed when you
power up."* A pedal held down while the keyboard boots is **inverted for the
whole session**, and nothing on any screen will say so.

⚠️ **A PAGE CANNOT TELL AN INVERTED PEDAL FROM A PEDAL SOMEBODY IS HOLDING**,
and it should not pretend to. What it can do is print the raw value beside the
reading, so `CC64 = 127, pedal down` is visible and a player who is not touching
the pedal can see the instrument is lying. That is one readout cell and it is
worth it.

🔴 **AND THE KEYBOARD IS A SEMITONE FLAT.** MEASURED and recorded in
`demo/evo/index.html` beside its `KEY_LO` constant: the MK-425C's 25 keys
arrive as notes **47 to 71**, where a C-to-C 25-key controller sits at 48 to 72.
`/evo/` deliberately does not correct it, on the grounds that *"drawing 48 to 72 and shifting what arrives
would hide the one thing worth reporting"*. For `nola` that decision does not
carry over unchanged: `/evo/` is a page ABOUT that keyboard, and `nola` is a
piano. **A piano that is a semitone flat against every other instrument is the
kind of fault that gets blamed on the sample pack.** The proposal is a transpose
control that defaults to 0, and a log line the first time a note below 48
arrives, which is exactly what `/evo/` already does with its `flatSaid` flag.

---

## 6. The recommendation

### 6.1 The design

**`demo/nola/index.html`, slug `nola`, act 4, group `instruments`.**

1. **Input: `createMidi` from `demo/shell/midi.mjs`.** Unchanged. Note-on,
   note-off, control change, and the note-on-at-velocity-0 case already handled.
2. **On-screen keys: `createKeyboard` from `demo/shell/keyboard.mjs`.** One
   path, not two, which is `midi.mjs`'s own first rule. A tapped key and a
   played key call the same two functions.
3. **Pedal: a new `demo/shell/pedal.mjs`**, lifted verbatim from
   `demo/muta/index.html` with the reading of the continuous value added, plus
   `demo/shell/pedal-test.mjs`, and `/muta/` switched over in the same change.
4. **Sound: plain Web Audio.** One `AudioBufferSourceNode` per note into one
   `GainNode` per voice into one master gain. `playbackRate` set from the
   nearest sampled note, at most one semitone away. Damper on note-off is
   `setTargetAtTime` over about 0.12 s, not `stop()`. Release sample fired at
   note-off, at a gain scaled by how hard the note was played and by how long
   ago. Voice stealing oldest-first past a cap, which `rig/board/synth.mjs`
   already argued for.
5. **Samples: 3.80 MiB at 96 kbps, built from Salamander, in R2 behind
   `workers/station`**, fetched per octave on the first press of a key in that
   octave and never on a visit. Salamander's own 30 notes ARE the minor thirds
   the arithmetic asked for, so nothing in the source is resampled: the build is
   a selection of 3 of its 16 velocity layers, a trim, a fade, a cap and an
   encode. Attribution to Alexander Holm on the page and a `LICENSE-salamander`
   beside the build script, which is what `LAYOUT.md` rule 6 already requires.
6. **A second engine behind a switch, and clearly labelled**: the same keyboard
   playing `demo/shell/rhodes.mjs`, which is 60 lines already in the kit and is
   played by the Raspberry Pi and by no browser page. It is not a piano and the
   page says it is not a piano. What it is for is the number: 3.80 MiB of
   recording against under 4 KB of arithmetic, both audible from one keyboard.
   ⚠️ **AND IT IS THE HONEST VERSION OF THE MODEL QUESTION.** A piano physical
   model good enough to stand next to a recording is not a session's work;
   `rhodes.mjs` is here, it is already true about what it is, and putting it
   opposite the samples asks the real question without claiming to have answered
   it.

🔴 **AND THERE IS A PHASE ZERO THAT NEEDS NO BUILD PIPELINE AT ALL, WHICH IS HOW
THE PAGE SHOULD FIRST BE MADE TO WORK.** `midi-js-soundfonts`'s FluidR3
`acoustic_grand_piano-mp3` is 88 chromatic notes in **1,971,564 bytes**, already
served over HTTPS from GitHub Pages, with that repository's README endorsing
exactly this use. Point `nola` at it, get MIDI, the pedal, the voice manager,
the damper, the readout and every assert working against a real sound, and only
then build the Salamander pack.
⚠️ **IT IS NOT THE SHIPPING SOUND**, for the three reasons in section 2.4:
one velocity layer means velocity can only be volume, there are no releases, and
its licence name is genuinely unsettled. **Phase zero proves the machinery.
Phase one is the piano.**

🔴 **AND IT IS HOT-LINKED IN DEVELOPMENT ONLY, NEVER FROM THE DEPLOY AND NEVER
UNDER A HARNESS.** `CLAUDE.md`'s rule is *"the rule is about whose server it is,
not about which harm has been named yet"*, and a harness that runs dozens of
times a day pulling 88 files off somebody's GitHub Pages is exactly the shape
that rule refuses, endorsement in a README or not. **Copy the 88 files in**:
`.mp3` is already in `demoFiles()`'s allowlist and they sit one level deep, so
88 flat files in `demo/nola/` are copied by the build with no allowlist entry at
all, at 1.88 MB total. The alternative is R2 from the start, which is where the
Salamander pack is going anyway.

### 6.2 What it measures, in six cells

The readout must have an even number of cells and every cell must be able to
change. Proposed:

| key | unit | why it can change |
| --- | --- | --- |
| `press to sound` | ms | median from the Web MIDI timestamp to the scheduled start, including `AudioContext.outputLatency` |
| `worst` | ms | the slowest of the same, because a median hides the one bad note |
| `sounding` | | voices currently ringing |
| `held by the pedal` | | the size of the pedal's own set, which is the number nobody can see |
| `fetched` | KB | grows as octaves arrive, and says what the piano has cost so far |
| `shift` | semitones | how far the last note was pitch-shifted from its recording, which is 0 or ±1 and moves on nearly every note |

⚠️ **`notes in the set` IS DELIBERATELY NOT A CELL.** It is a structural
constant, and `positron-ui` is explicit that a cell showing one *"reads as a
measurement and teaches the reader to ignore the row"*.

⚠️ **AND `press to sound` HAS TO SAY WHAT IT COULD NOT INCLUDE.**
`AudioContext.outputLatency` is DOCUMENTED on MDN, fetched today, as Baseline
since March 2025, so it can be read on a current browser and added to the
scheduling delay. `baseLatency` is the fallback. **What neither of them
measures is the keyboard's own scanning delay and the USB stack**, which is
everything between the felt of the key and the `MIDIMessageEvent`, and no
browser API can see it. The cell is the browser's half of the number and the
page says so in one line rather than implying it is the whole one.

⚠️ **AND THE RAW CONTROLLER VALUE GOES IN THE LOG, NOT IN A CELL.** It changes
only when a foot moves, which is a state change, and section 5.3 wants it
visible for the inverted-pedal case.

### 6.3 What the diagram shows

Last on the page, `{ how: true, atEnd: true }`, no title, and the page's `what`
is the manifest's `one` line verbatim.

- **`MIDI keyboard`** (sub: `USB MIDI`), outside the browser. ⚠️ Not `25 keys`:
  the sub says what kind of thing the box is, and the number of keys is a fact
  about one keyboard on one desk rather than about the picture.
- Container **`Browser`**, holding:
  - **`Web MIDI`** (sub: `requestMIDIAccess`)
  - **`damper`** (sub: `CC64, 63/64`) with the note that the pedal is the
    absence of the damper rather than the presence of a sustain, and that a
    value of 63 is off and 64 is on
  - **`sampler`** (sub: `30 notes, 3 layers`) with the note that a key plays the
    nearest recording at a changed rate, never more than one semitone away
  - **`speakers`**
- Container **`Cloudflare`**, holding **`workers/station`** (sub: `R2, 3.8MB`).

Arrows: `MIDI keyboard` to `Web MIDI` labelled `notes, CC64`; `Web MIDI` to
`damper` and to `sampler`; `damper` to `sampler`; `workers/station` to `sampler`
labelled `96k AAC`; `sampler` to `speakers`.

⚠️ **NO BOX FOR SYMPATHETIC RESONANCE, AND NO BOX FOR A STRING MODEL.** The
resonance is a recorded layer the sampler fires, not a machine, so it belongs in
the `sampler` box's note and nowhere else. A box for it would draw a mechanism
the page does not have, which is the one thing a diagram here may never do.

### 6.4 How it is graded

- `node demo/check-html.mjs demo/nola/index.html` first, which parses every
  module block with no browser at all.
- `node demo/shell/pedal-test.mjs`, no browser, with negative controls for all
  four failure modes in section 5.1.
- `node demo/verify.mjs nola`, **driven through the real MIDI handlers**, which
  is the pattern `/muta/` already set the day it grew the pedal: *"This machine
  has no MIDI under a harness, so `keyDown`, `keyUp` and `keyControl` are the
  only part of that path a check can reach, and reaching past them to `noteOn`
  would grade the synth and say nothing about the keyboard."* Its own pedal
  assert calls `keyControl(64, 127)` and `keyControl(64, 0)` directly.
  ⚠️ **AND EVERY ONE NEEDS THE NEGATIVE CONTROL BESIDE IT**, which `/muta/` also
  got right: the same gesture with no pedal under it, or what is measured is
  only that a note takes a while to die. The page asserts things only it can:
  - a key held with the pedal down and then released leaves the voice sounding,
    and lifting the pedal ends it
  - a key pressed AGAIN while the pedal is down, then released with the pedal
    still down, is NOT ended when the pedal lifts, because a finger is on it
  - the pitch shift of every note on the keyboard is within one semitone
  - the damper is a ramp and not a stop, measured as the gain at two times
  - a visit fetches zero audio bytes, asserted over a counter rather than read
    off the source, which is the `/reel/` repair
- ⚠️ **AND EVERYTHING COSTLY IS BEHIND `SELFCHECK` FROM
  `demo/shell/selfcheck.mjs`.** A visitor's page fetches nothing and sounds
  nothing until they press a key.
- ⚠️ **THE PAGE HAS NO TRANSPORT.** There is no position inside a sound, so
  `createTransportBar` is either absent or `toggle: false`, which `/keys/`
  already settled: *"a toggle whose only honest behaviour is to do nothing is
  the shape of control this project calls a lie."*

---

## 7. What research could not settle

Every item here is cheap and none of it has been done. They are ordered by how
badly the plan depends on them.

1. 🔴 **DOES THE PEDAL IN THIS BUILDING SEND CONTROLLER 64?** Four seconds in
   front of `/circuit/`, `/model/` or `/evo/`, all three of which draw
   `demo/shell/midi-log.mjs` with the raw bytes in a column. If it sends
   something else, `pedal.mjs` takes the controller number as an option and the
   page says which one it heard. **If this is not checked first, the whole
   pedal section is written against a default.**
2. 🔴 **IS THE PEDAL'S POLARITY INVERTED THIS SESSION?** Same four seconds:
   press it and see whether the value goes up or down. It is a per-power-up
   property, so the answer is only true until the keyboard is switched off.
3. **IS THE SEMITONE-FLAT TRANSPOSE THE INSTRUMENT'S BASE OR A SETTING SOMEBODY
   LEFT?** `/evo/`'s own source says this is *"testable for free and has not
   been tested"*: power-cycle the keyboard and play the bottom key. It decides
   whether `nola` ships a transpose default of 0 or of +1.
4. **NOTHING IN SECTION 2 HAS BEEN DOWNLOADED OR LISTENED TO.** Every figure
   there came off a web page or the GitHub API today. Salamander has not been
   heard here, its sample rate and bit depth were read off a description rather
   than off a file header, and **the licence question is genuinely open**: every
   mirror says CC-BY 3.0 and the author's own blog says public domain since
   2022-03-04, with no formal dedication instrument found. Attributing him costs
   one line and closes it either way.
5. **WHICH 3 OF SALAMANDER'S 16 VELOCITY LAYERS.** The note lengths are
   measured now (section 2.3), so the budget is no longer a model. **Which
   layers to keep is still open and nobody can answer it without hearing
   them**: evenly spaced by index is the obvious answer and is almost certainly
   not the right one, because loudness against layer index is not linear. The
   same pass settles the level trim in 3.5, which needs a peak and an envelope
   per file and therefore a decode.
6. **IS 96 kbps TRANSPARENT ON REAL PIANO?** Section 3.4 measured one synthetic
   note by an energy criterion. The listening test is: encode six real notes at
   48, 96 and 128, trim and fade as recommended, and see whether anybody can
   pick them.
7. **IS A ONE SEMITONE `playbackRate` SHIFT AUDIBLE?** Salamander cannot answer
   this on its own, because it only samples minor thirds and so has no
   neighbouring recording to compare against. The Iowa set is chromatic and is
   the instrument for this test: play its real recording of a note against its
   neighbour shifted by one semitone, same dynamic, and listen. If it is
   audible, the spacing goes to every second semitone and the note budget goes
   from 2.87 MiB to 4.24 MiB.
8. **DOES THE RECORDED SYMPATHETIC RESONANCE ACTUALLY HELP?** Half a megabyte
   for a layer that fires per note and models no interaction. It might be the
   difference a pianist hears first, or it might be an expensive wash. Section
   5.2 says which it is not; nobody here knows which it is.
9. **WHAT IS PRESS TO SOUND, REALLY?** Nobody in this repository has measured
   Web MIDI input latency or its jitter. The readout's first two cells are the
   measurement, and until the page exists there is no number.
10. **HOW MANY VOICES DOES A PHONE SUSTAIN WITH THE PEDAL DOWN?** A pedalled
   glissando is over a hundred simultaneous `AudioBufferSourceNode`s. This is
   the one place where the plain Web Audio choice could be wrong, and it is
   unmeasured.
11. **WHICH CONTAINERS DOES EACH BROWSER'S `decodeAudioData` ACCEPT?** Section
    3.4 argues for AAC in MP4 on two independent grounds and **neither of them
    is a browser on this desk**. The compatibility tables say in their own words
    that they describe the `<audio>` element and not `decodeAudioData`, and the
    one piece of real evidence is a comment in somebody else's library.
    `demo/verify-native.mjs` and `demo/verify-safari.mjs` are the two harnesses
    that would settle it, and neither was run.
12. 🔴 **WHAT A `playbackRate` SHIFT ACTUALLY DOES TO THE SIGNAL WAS NOT
    RESEARCHED AT ALL.** The Web Audio specification's requirements on
    interpolation quality, what Blink and Gecko actually implement, and what
    artefacts a one semitone shift produces are all unknown here. What IS known
    is that **every off-the-shelf option pitch-shifts this way**: Tone.js by
    `playbackRate`, WebAudioFont by `playbackRate`, `smplr` by `detune` with a
    `playbackRate` fallback on Safari. So whatever the artefacts are, the whole
    field lives with them, which is an argument and not a measurement.
13. **AND TWO OF THE FIVE RESEARCH THREADS BEHIND SECTION 4 NEVER CAME BACK.**
    Published evidence on Opus transient handling and on FLAC ratios was not
    gathered. Section 3.4 replaced the first with a measurement taken here,
    which is better, and section 3.3 replaced the second with a ratio computed
    from Salamander's own bytes and durations. **Neither substitute is a
    literature review**, and if somebody later finds published listening tests
    that contradict section 3.4, the published tests win.

---

## 8. Order of work, if it is built

🔴 **THE SHARED THING IS DONE FIRST AND BY ONE AGENT**, which is `CLAUDE.md`'s
rule for a fan-out: *"ANYTHING SHARED IS DONE ONCE, BY ONE AGENT, BEFORE THE
PAGE AGENTS START."*

1. **The four seconds in front of `/evo/` or `/circuit/`** that answer section
   7's items 1, 2 and 3. They are the cheapest and they change what gets built.
2. **`demo/shell/pedal.mjs` and `demo/shell/pedal-test.mjs`**, with `/muta/`
   switched over in the same change and `node demo/verify.mjs muta` re-run to
   confirm its assert count did not move.
3. **Phase zero: the page against FluidR3's 1.88 MB of mp3**, copied into
   `demo/nola/` rather than hot-linked, for the reason in section 6.1. Every
   control, the voice manager, the damper ramp, the readout, the diagram and
   every assert working against a real sound, with no build pipeline anywhere.
   This is also where section 7's items 9, 10 and 11 get their first numbers.
4. **Fetch the 90 Salamander FLACs** from the `sfzinstruments` mirror into
   `tmp/`, 131 MiB once, remembering to `encodeURIComponent` the `#` in the
   black-key names or exactly those files go missing without an error.
5. **Build the pack**: trim each file to a few milliseconds before the onset,
   fade in 2 to 5 ms, trim the tail where it falls 60 dB under that file's peak
   with a 200 ms fade, encode at 96 kbps, and write a manifest keyed by note and
   layer. A script under `demo/resources/`, beside
   `measure-durations.mjs` and `build-corpus.mjs`, re-runnable from the cache
   the way `build-corpus.mjs --offline` is, and refusing to re-fetch what it
   already has.
6. **Upload to R2 through `workers/station`**, and point the page at it.
7. **The listening tests**, section 7 items 6, 7 and 8, which decide the
   bitrate, the spacing and whether the resonance layer earns its half megabyte.
8. `node demo/check-html.mjs`, then `node demo/verify.mjs nola`, and only then a
   full suite.

⚠️ **STEPS 1 TO 3 ARE A SESSION AND STEPS 4 TO 7 ARE A SECOND ONE.** A page
that plays and pedals correctly off a 1.88 MB soundfont is a finished demo with
a known upgrade path; a page waiting on a sample build is neither.
