# A Rhodes sample pack for `/nola/`, surveyed

Answers *"nola: can you get similar good sample pack for rhodes? investigate in
bg"*, asked 2026-09-23. *Similar* is to the Salamander Grand Piano that
`plans/plan-nola.md` section 2.3 sized: **641 files, 748,397,030 bytes, 48 kHz,
24 bit, stereo, 30 notes exactly three semitones apart, 16 velocity layers, 88
release samples**, a licence open enough to serve from a public website, and a
**3.80 MiB** browser budget worked out from minor thirds capping the worst pitch
shift at one semitone.

🔴 **NOTHING WAS DOWNLOADED AND NOTHING WAS HEARD.** Every size below is either
an exact byte count from the GitHub trees API, which is the host's own listing,
or a duration read out of a file header by a ranged GET of 64 to 250 bytes. The
technique is the one `plans/plan-nola.md` used on Salamander: **270 ranged
requests totalling about 20 KB of response body, no archive pulled and no
sample decoded.** No opinion below about how anything sounds is mine, because
nobody here has played any of it.

| mark | means |
| --- | --- |
| **MEASURED** | a number taken off a running thing on this desk, with the command that took it |
| **DOCUMENTED** | a page, licence file or repository fetched today, 2026-09-23, and quoted |
| **REPORTED** | second hand, from somebody else's write-up, not confirmed at the source |
| **INFERRED** | a conclusion drawn from two of the above and stated by neither |
| **UNVERIFIED** | written from memory, nothing fetched to check it |

---

## The short answer

**There is exactly one real Rhodes in the free world that is worth building on,
it is Jeff Learman's jRhodes3, and its licence is the whole question.**
DOCUMENTED: every other free Rhodes found today is either a Pianobook upload
that forbids redistribution, a soundfont of unknown parentage, or a recording of
a software emulation rather than of an instrument.

**jRhodes3 is a real 1977 Rhodes Mark I Stage 73**, DOCUMENTED from the author's
own README: his own instrument, bought new in 1978, recorded around 2006
directly from the harp connector, five velocity layers at about 3 dB apart, 15
sampled notes, mono, 44.1 kHz, 16 bit.

🔴 **AND ITS LICENCE SAYS TWO DIFFERENT THINGS IN TWO FILES BY THE SAME HAND,
FETCHED WITHIN THREE MINUTES OF EACH OTHER TODAY.** The repository `LICENSE`
says the samples are **CC BY-NC**, which this project already refused. A
15 sample GM subset of the same recording, in the same author's other
repository, carries a header line reading **`// License: Creative Commons CC0,
Jeff Learman`**. Section 3 is about which one to believe and why the answer is
*neither, ask him*.

**The cheap, clean, zero risk answer that is NOT a Rhodes**: Greg Sullivan's
**Wurlitzer EP200**, CC-BY 3.0 with the full legal code in the repository, 42
files, and **937,212 bytes as m4a on a mirror that already exists**. A Wurlitzer
is a reed electric piano rather than a tine one, so it is the wrong instrument
with the right paperwork.

**The day-one answer that changes nothing about how `/nola/` is built**:
FluidR3's `electric_piano_1`, 88 chromatic mp3 notes, **1,672,174 bytes for all
88 and 571,796 bytes for the same 30 note minor third subset the page already
ships**. It is a soundfont of unknown parentage and one velocity layer.

---

## 1. What was fetched, and what refused

DOCUMENTED, all on 2026-09-23:

| source | what came back |
| --- | --- |
| `api.github.com/orgs/sfzinstruments/repos` | 76 repositories with licence, size and description |
| `sfzinstruments.github.io/pianos/` | the piano index, with a licence column |
| `sfzinstruments.github.io/pianos/jrhodes3c/` | the instrument page |
| raw `LICENSE` and `README.md` of jRhodes3c, jRhodes3d, jRhodes3d-wav, GregSullivan.E-Pianos, Discord-SFZ-GM-Bank | full text |
| GitHub trees of 6 repositories | exact name and byte size of every file |
| `raw.githubusercontent.com`, 179 ranged GETs | WAV `fmt `/`data`/`smpl` chunks and FLAC `STREAMINFO` |
| `pianobook.co.uk/faq/are-pianobook-sample-packs-royalty-free-or-free-for-commercial-use/` | the redistribution answer, quoted in section 5 |
| `musical-artifacts.com/artifacts/459.json` and `/5001.json` | licence, author and description fields |

⚠️ **AND TWO REFUSALS, WHICH ARE FACTS ABOUT THE ASKING AND NOT ABOUT THE
CONTENT.** `musical-artifacts.com` answers **HTTP 403** to a fetcher on its
artifact HTML pages and to `HEAD` on its download URLs, while its `.json`
endpoints answer fine, so the two artifacts in section 6 have licence and
description but **no measured file size**. `pianobook.co.uk/faqs/` is **404**
and the answer moved to `/faq/`. This is the shape `positron-verify` already
names: *"Three hosts refusing in three different ways is not three facts about
the content, it is one fact about how you are asking."*

✅ **ONE CROSS CHECK RAN BEFORE ANY OF THE NUMBERS BELOW WERE TRUSTED.** The 30
note subset of `FluidR3_GM/acoustic_grand_piano-mp3`, summed from the GitHub
trees API, is **671,974 bytes**. The 30 files already sitting in `demo/nola/`
are **671,974 bytes** on this disk, and `demo/nola/PROVENANCE.json` sums to the
same. MEASURED:

```sh
ls -l demo/nola/*.mp3 | awk '{s+=$5} END {print s}'    # 671974
```

The listing and the disk agree to the byte, so the technique is not guessing.

---

## 2. Every Rhodes that exists for free, and what its licence actually says

🔴 **THE FIELD IS TWO ENTRIES LONG AND THEY ARE THE SAME RECORDING.**
DOCUMENTED off `sfzinstruments.github.io/pianos/` today, which is the most
complete index of free SFZ pianos there is. Its 22 rows contain exactly two
Rhodes:

| pack | instrument | licence as the index states it today |
| --- | --- | --- |
| **jRhodes3c** | 1977 Rhodes Mark I Stage 73, looped | **CC-BY-NC-SA-4.0** |
| **jRhodes3d** | 1977 Rhodes Mark I Stage 73, unlooped, velocity crossfade option | **CC-BY-NC-4.0** |

Everything else on that index is an acoustic grand, a commercial product, or one
of the three Greg Sullivan electric pianos, none of which is a Rhodes.

### 2.1 The jRhodes3c licence, quoted in full

DOCUMENTED, `raw.githubusercontent.com/sfzinstruments/jlearman.jRhodes3c/master/LICENSE`:

> This sample set is provided free for use as a musical instrument.
> You can use the sounds in any way in your works as an artist,
> just as you could with a real instrument.
>
> To distribute the samples themselves, such as in an application, software
> instrument, or as a sample set, the jRhodes samples are licensed under
> CC BY-NC-SA 4.0. To view a copy of this license, visit
> https://creativecommons.org/licenses/by-nc/4.0 .
>
>     BY: Credit must be given to the creator.
>     NC: Only noncommercial use of the work is permitted.
>
> To use the samples in a commercial product, please contact me and I will be
> happy to grant a license.
>
> jjlearman@gmail.com
>
> Control files and example clips are in the public domain using CC0 [...]
>
> CC BY-SA license is granted for Strudel software
> (https://codeberg.org/uzu/strudel), including network linking as allowed by
> Strudel's GNU AFFERO GENERAL PUBLIC LICENSE.

🔴 **PUTTING SAMPLES ON A WEB PAGE IS THE FIRST SENTENCE OF THE SECOND
PARAGRAPH.** *"To distribute the samples themselves, such as in an
application"* is exactly what serving them from `positron.studio` is, so the
artist grant in the first paragraph does not reach this, and the NC term does.
That is the same reading `plans/plan-nola.md` section 2.2 applied.

✅ **THREE THINGS IN THAT TEXT ARE LEVERS AND ARE WORTH SAYING OUT LOUD.**
1. **He grants other licences on request, in writing, and says he is happy to.**
2. **He has already done it once.** The last paragraph grants **CC BY-SA**, with
   the NC dropped, to one named piece of software, explicitly to make network
   linking work under that project's AGPL. That is a precedent with a name on
   it, not a hope.
3. **The licence contradicts its own link.** The body says **BY-NC-SA 4.0** and
   the URL points at **by-nc/4.0**, which is BY-NC without the ShareAlike.
   INFERRED: this is a copy and paste slip rather than a position, and the index
   page calling 3c `CC-BY-NC-SA-4.0` and 3d `CC-BY-NC-4.0` suggests SA is what
   was meant for 3c.

⚠️ **jRhodes3d IS THE SAME TEXT WITH THE `SA` AND THE STRUDEL PARAGRAPH GONE.**
DOCUMENTED, its `LICENSE` opens with a three line summary the 3c file does not
have: *"License for samples: CC BY-NC / License for everything else: CC0 /
License for musicians using this to make music: CC0"*. The `jRhodes3d-wav`
repository under his personal account carries the byte identical file.

---

## 3. The CC0 Rhodes, and why it is a coin toss rather than a finding

🔴 **THERE IS A 15 SAMPLE SUBSET OF THE SAME RHODES CARRYING A CC0 LINE, AND IT
IS THE MOST IMPORTANT THING IN THIS DOCUMENT.** DOCUMENTED, the complete header
of `Discord GM/Melodic/005-Electric Piano 1.sfz` in
`github.com/sfzinstruments/Discord-SFZ-GM-Bank`:

```
// GM Electric Piano
// jRhodes GM version
// Author: Jeff Learman: http://github.com/jlearman
// License: Creative Commons CC0, Jeff Learman
// Source: http://github.com/sfzinstruments/jlearman.jRhodes3c
// Mapped and relooped for GM by jlearman
```

That repository is Jeff Learman's own, DOCUMENTED from
`api.github.com/users/jlearman/repos`, and its `README.md` states the bank's
admission rule verbatim:

> Only CC0, CC-BY, and equivalent licences are allowed. (I will expand this list
> to specify equivalent licenses.)
> More restrictive licenses are not allowed. For example, we plan for this to be
> usable in products, so CC-NC is not permitted.

So the copyright holder put his own Rhodes into a bank whose stated rule
excludes the licence his other repository publishes it under, and labelled it
CC0 while doing so. **That is the strongest form a grant can take short of a
LICENSE file.**

🔴 **AND HERE IS WHY IT STILL CANNOT BE RELIED ON ALONE. THE SAME HEADER FORMAT,
IN THE FILE NEXT DOOR, ASSERTS CC0 OVER SOMEBODY ELSE'S CC-BY WORK.**
DOCUMENTED, `003-Electric Grand Piano.sfz` in the same directory:

```
// GM Electric Grand Piano
// Yamaha CP80 Electric Grand Piano
// Author Greg Sullivan
// License: Creative Commons CC0, Greg Sullivan
// Source: https://github.com/sfzinstruments/GregSullivan.E-Pianos
```

DOCUMENTED, the source it names, `GregSullivan.E-Pianos/README.md`:

> This repository contains 3 piano instruments made by [Greg Sullivan], with the
> author permission with the request for attribution.
> [...] This work is licensed under a Creative Commons Attribution 3.0 Unported
> License.

and its `LICENSE` is the **19,467 byte full legal code of CC-BY 3.0 Unported**.
CC0 waives attribution. CC-BY 3.0 *"with the request for attribution"* does the
opposite. **The bank's header is wrong about that instrument, and Jeff Learman
is not in a position to make it right, because it is not his recording.**

⚠️ **SO THE `// License:` LINE IS A CLASSIFICATION THE BANK'S MAINTAINER WROTE,
AND ONLY SOMETIMES ALSO A GRANT BY THE COPYRIGHT HOLDER.** For 005 the two
happen to be the same person, which is the entire reason it is arguable at all.
It is the `Maestro Concert Grand` trap from `plans/plan-nola.md` section 2.2
turned inside out: there an index row said `Custom` and hid a refusal, here a
comment says `CC0` and hides an unresolved question. **An index row is not a
licence in either direction.**

✅ **AND THE FIX COSTS ONE EMAIL, WHICH THE LICENCE ITSELF INVITES.**
`jjlearman@gmail.com` is in the file, he answers questions on his own GitHub
issues, and the Strudel paragraph proves he writes bespoke grants. Asking *"may
positron.studio serve the jRhodes3d mono set from a public web page"* is the
only thing that turns section 4's numbers into a plan.

### 3.1 What the CC0 subset actually is, measured

MEASURED by ranged GET on all 15 WAV headers, `fmt ` and `data` and the trailing
`smpl` chunk:

| property | value |
| --- | --- |
| files | **15 WAV, 6,187,318 bytes**, plus 3 SFZ of 5,110 bytes |
| format | **44,100 Hz, 1 channel, 16 bit**, on every one |
| total audio | **70.12 seconds** |
| notes | **15**: MIDI 29, 35, 40, 45, 50, 55, 59, 62, 65, 71, 76, 81, 86, 91, 96 |
| spacing | 6, 5, 5, 5, 5, 4, 3, 3, 6, 5, 5, 5, 5, 5 semitones |
| velocity layers | **one**, and the SFZ has no `lovel` or `hivel` opcode anywhere |
| releases | **none** |
| pedal noise | **none** |
| loops | **yes, one per file**, and this is the interesting part |

🔴 **EVERY FILE CARRIES A `smpl` CHUNK WITH EXACTLY ONE LOOP, WHICH CHANGES THE
BUDGET ARITHMETIC RATHER THAN JUST THE FILE LIST.** MEASURED on the last 250
bytes of three of them: `A_029__F1_3.wav` loops samples 217,011 to 230,254,
`A_035__B1_3.wav` 187,583 to 202,625, `A_040__E2_3.wav` 258,145 to 283,757.
Divided by 44,100 the first is 4.921 s, which is the exact `ampeg_hold=4.921`
in the SFZ, so the SFZ and the chunk agree. **A looped note sustains for as long
as the key is held out of five seconds of audio**, where Salamander's 3 s cap
truncates all 30 of its notes including the top one. `AudioBufferSourceNode`
already has `loop`, `loopStart` and `loopEnd` in seconds and needs no new
machinery for it.

⚠️ **THE VELOCITY LAYER IT KEPT IS NOT ONE LAYER, IT IS TWO PICKED PER REGION.**
MEASURED from the filenames: the nine notes from MIDI 29 to 65 are layer `_3`
and the six from 71 up are layer `_4`. INFERRED: layer 3 does not exist above
note 71, which section 4.1 confirms from the full set. So the subset is a
sensible pick rather than a lazy one, and it is still **one layer at any given
key**, which is the thing `demo/shell/rhodes.mjs`'s own header argues at length
is the wrong instrument.

---

## 4. jRhodes3, measured

### 4.1 The full sets, exact file counts and byte sizes

MEASURED from the GitHub trees API, which returns the host's own byte size for
every blob:

| set | files | bytes | format |
| --- | --- | --- | --- |
| **jRhodes3c**, looped, mono | 65 | **5,970,448** | FLAC 44.1 kHz 16 bit |
| **jRhodes3c**, looped, stereo | 65 | **11,540,542** | FLAC 44.1 kHz 16 bit |
| **jRhodes3d**, unlooped, mono | 65 | **22,884,538** | FLAC 44.1 kHz 16 bit |
| **jRhodes3d**, unlooped, stereo | 65 | **37,937,187** | FLAC |
| **jRhodes3d**, unlooped, stereo vibrato | 65 | **34,338,619** | FLAC |

**All 15 notes and their spacing are identical across every set**: MIDI 29, 35,
40, 45, 50, 55, 59, 62, 65, 71, 76, 81, 86, 91, 96. The author calls this
*"sampling every 4th white key"*.

🔴 **THE FIVE VELOCITY LAYERS ARE NOT FIVE EVERYWHERE, AND THAT DECIDES WHICH
THREE A BUILD CAN USE.** MEASURED, layer by layer, from the FLAC `STREAMINFO`
of all 65 mono files:

| MIDI | L1 | L2 | L3 | L4 | L5 |
| --- | --- | --- | --- | --- | --- |
| 29 | 16.80 | 14.40 | 14.40 | 14.00 | 18.60 |
| 35 | 19.20 | 18.80 | 17.00 | 16.20 | 23.00 |
| 40 | 15.00 | 14.00 | 20.60 | 19.00 | 24.60 |
| 45 | 19.60 | 16.00 | 18.80 | 18.60 | 25.00 |
| 50 | 14.60 | 13.20 | 19.00 | 17.80 | 20.60 |
| 55 | 16.20 | 18.20 | 20.40 | 20.00 | 20.40 |
| 59 | 13.00 | 14.60 | 12.80 | 15.00 | 17.60 |
| 62 | 14.00 | 15.60 | 16.80 | 14.22 | 17.80 |
| 65 | 12.40 | 14.00 | 15.40 | 15.00 | 15.00 |
| 71 | 9.20 | 10.60 | absent | 12.20 | 12.80 |
| 76 | 5.40 | 6.00 | absent | 5.40 | 5.20 |
| 81 | absent | 6.60 | absent | 7.80 | 8.40 |
| 86 | absent | 6.40 | absent | 7.20 | 7.20 |
| 91 | absent | 3.00 | absent | 3.20 | 3.60 |
| 96 | absent | 1.40 | absent | 1.40 | 1.40 |

Seconds, MEASURED. **Total 891.65 s over 65 files.** **Layers 2, 4 and 5 are the
only three present on all 15 notes**, and the author says why in the README:
*"Not all layers are full-keyboard width, as higher notes don't change timbre as
much."*

⚠️ **THE LONGEST NOTE IS 25.00 s AND THE SHORTEST IS 1.40 s, A RATIO OF 17.9 TO
1.** Salamander's, MEASURED in `plans/plan-nola.md`, is 25.00 to 3.89, a ratio
of 6.4. INFERRED: a Rhodes tine at the top of its range stops much faster than a
piano string does, so a flat cap costs a Rhodes less than it costs a piano.

### 4.2 What the recording actually is

DOCUMENTED, from `jlearman.jRhodes3d/README.md`, and this is the part that
decides whether it is worth anything to `/nola/`:

> jRhodes3 is my sampling of my 1977 Rhodes Mark I Stage 73 electric piano,
> which I purchased new back in 1978. [...] It was recorded with EQ, with a
> treble boost and low-mid scoop, emphasizing the bell tones, and with
> substantial bark on the higher velocity layers. There are 5 layers, sampled to
> peak at 3dB difference per layer at on the low notes [...]
>
> The samples were recorded directly from the harp connector.

and:

> This is not intended to be the authentic original unprocessed Rhodes; it's
> intended to be what I wanted the Rhodes to sound like most of the time.
>
> I lost the original sample recordings in a home fire, but fortunately I did
> have distribution copies of the original looped and unlooped soundfont files,
> and these sample sets are recreated from them.

✅ **IT IS A REAL INSTRUMENT AND IT IS THE THING ARITHMETIC CANNOT BE.** A
recording of a struck tine with bark on it, taken off the pickups of a specific
1977 piano.
⚠️ **AND FOUR THINGS ABOUT IT ARE NOT NEUTRAL, ALL DOCUMENTED BY THE AUTHOR
HIMSELF.** It is EQ'd to one player's taste rather than flat. It is a direct
pickup feed with no amp and no room. It has been through a soundfont round trip
because the masters burned. And **the stereo is synthetic**: DOCUMENTED, *"The
stereo effect is a mild pitch-shift doubling to create a stereo image, applied
in mid-side effect so that it cancels out when summed to mono"*, and the stereo
vibrato is a rebuilt Suitcase effect applied per note. **The mono set is the
recording. The two stereo sets are the mono set with a browser-sized effect
baked in at 1.7 times the bytes**, which is an argument for taking the mono set
and doing the widening in Web Audio if it is wanted at all.

### 4.3 There is no release sample, no pedal noise and no resonance

MEASURED by exhaustion: the 65 file names in every set are `A_<midi>__<name>_<1
to 5>`, and no other pattern exists in any of the three sets. Salamander brings
88 releases, 69 resonance samples and 4 pedal noises, which is **three of the
four expensive things already recorded**. jRhodes brings none of them.

⚠️ **AND THAT IS LESS OF A LOSS THAN IT LOOKS, WHICH IS A CLAIM ABOUT THE
INSTRUMENT AND IS INFERRED RATHER THAN MEASURED.** A Rhodes damper is a felt pad
on a tine, not a bar across a soundboard, and there is no second set of strings
to ring in sympathy, so the resonance samples that make `plans/plan-nola.md`
section 5 interesting have no Rhodes equivalent to be missing. The release
*noise* is real and is not recorded here. **Nobody on this desk has verified
that by listening**, and a Rhodes damper release is audible on records, so this
is a reasoned guess and not a finding.

---

## 5. What it costs in a browser, using `plans/plan-nola.md`'s own arithmetic

### 5.1 By that plan's method: seconds times bitrate

`plans/plan-nola.md` section 3.3 establishes that at a constant bitrate nothing
but seconds of audio matters, and section 3.5 budgets at **96 kbps AAC**.
Applying exactly that to the MEASURED durations above, with a flat cap per file:

| layers | files | no cap | cap 4 s | cap 3 s | cap 2 s | cap 1.5 s |
| --- | --- | --- | --- | --- | --- | --- |
| **5 (all)** | 65 | 10.20 MiB | **2.86 MiB** | 2.18 MiB | 1.47 MiB | 1.11 MiB |
| **3 (2, 4, 5)** | 45 | 6.65 MiB | 1.95 MiB | **1.49 MiB** | 1.01 MiB | 0.77 MiB |
| **2 (2, 5)** | 30 | 4.51 MiB | 1.30 MiB | 0.99 MiB | 0.67 MiB | 0.51 MiB |
| **1 (5)** | 15 | 2.53 MiB | 0.65 MiB | 0.50 MiB | 0.34 MiB | 0.26 MiB |

🔴 **THE HEADLINE IS THAT A RHODES IS ABOUT HALF THE PRICE OF THE PIANO AND
BUYS MORE LAYERS WITH THE DIFFERENCE.** Salamander's recommended 3.80 MiB buys
**three of its sixteen velocity layers at a 3 s cap**. The same 3.80 MiB buys
**all five jRhodes layers at a 4 s cap with 0.94 MiB left over**. The reason is
arithmetic and not quality: 15 notes instead of 30, mono instead of stereo, and
a shorter top octave.

### 5.2 And somebody has already done the encode, which is a second, independent number

✅ **`smpldsnds/sfzinstruments-jlearman-jrhodes3d` IS A BROWSER-READY MIRROR OF
THE WHOLE THING IN `ogg` AND `m4a`, AND ITS BYTE SIZES ARE EXACT.** MEASURED
from its trees API, 195 files of each format:

| set | m4a, all 5 layers | ogg, all 5 layers | m4a, layers 2/4/5 | m4a, layers 2/4 |
| --- | --- | --- | --- | --- |
| **mono** | **7,945,932 B, 7.58 MiB** | 7,248,259 B, 6.91 MiB | **5,180,812 B, 4.94 MiB** | 3,211,114 B, 3.06 MiB |
| stereo | 14,494,524 B, 13.82 MiB | 11,478,614 B, 10.95 MiB | 9,447,575 B, 9.01 MiB | 5,851,855 B, 5.58 MiB |
| stereo vibrato | 14,571,765 B, 13.90 MiB | 11,159,505 B, 10.64 MiB | 8,684,010 B, 8.28 MiB | 5,887,755 B, 5.62 MiB |

⚠️ **THAT MIRROR IS 2.7 TIMES THE ARITHMETIC IN 5.1 BECAUSE IT IS UNCAPPED AND
UNTRIMMED**, 891.65 s of audio at a higher effective bitrate. It is the number
to quote for *"what if we just used what exists"* and the section 5.1 table is
the number for *"what if we build it the way Salamander would be built"*.
⚠️ **AND THE MIRROR SHIPS `ogg` FIRST**, which is the exact thing
`plans/plan-nola.md` section 3.4's container note warns about: `smplr`'s own
source says *"Safari reports it can play OGG but decodeAudioData fails on many
samples"*, and that library defaults to `["ogg", "m4a"]` anyway. **Take the
m4a.**
⚠️ **AND ITS `LICENSE` IS THE SAME 1,039 BYTE CC BY-NC FILE**, MEASURED by size
against the upstream. A convenient mirror does not launder a licence.

### 5.3 The pitch shifting is where the quality actually goes

🔴 **15 NOTES WITH GAPS OF UP TO 6 SEMITONES MEANS A WORST SHIFT OF 3
SEMITONES, WHICH IS THE ROW `plans/plan-nola.md` SECTION 3.2 CALLS THE CARTOON
EFFECT.** MEASURED from the note list, the gaps are 6, 5, 5, 5, 5, 4, 3, 3, 6,
5, 5, 5, 5, 5. Nearest sample plus pitch shift gives a worst case of 3 semitones
and a typical case of 2. Against that plan's own table:

| | Salamander | jRhodes3 |
| --- | --- | --- |
| sampled notes | 30 | 15 |
| spacing | exactly 3 semitones | 3 to 6 semitones |
| worst shift | **1 semitone** | **3 semitones** |
| length and formant error at worst | **5.9 %** | **18.9 %** |

⚠️ **WHETHER 18.9 % MATTERS AS MUCH ON A RHODES IS GENUINELY OPEN AND IS
INFERRED IN BOTH DIRECTIONS.** The argument that it matters less: a Rhodes tine
is a bar with no soundboard and no body cavity, so there are fewer fixed
resonances to be dragged up in pitch, and the pickup response is the main
colour. The argument that it matters more: the bell partial is the identity of
the instrument, it is inharmonic, and moving it 18.9 % moves the thing a
listener recognises. **Nobody has listened. This is the single most important
thing that is not measured in this document.**

⚠️ **AND THE TOP OF THE KEYBOARD IS WORSE THAN 3 SEMITONES.** The highest sample
is MIDI 96, so MIDI 97 to 108 are reached by shifting up to **12 semitones**.
✅ That is less bad than it reads: a Rhodes Mark I Stage 73 has 73 keys, **MIDI
28 to 100**, so the pack already covers its own instrument and then some, and
the keys above it are keys the real piano does not have. A page that draws 88
keys has to decide what to do about that, and saying so on the face of the page
is cheaper than faking it.

---

## 6. The ones that look like an answer and are not

### 6.1 Pianobook, re-verified today

DOCUMENTED, `pianobook.co.uk/faq/are-pianobook-sample-packs-royalty-free-or-free-for-commercial-use/`,
fetched 2026-09-23:

> It is forbidden to sell or redistribute the sample libraries that you do not
> own the copyright to.

and the page repeats that Pianobook cannot guarantee uploads are copyright free
because that is the uploader's responsibility. **Refused, unchanged from
`plans/plan-nola.md` section 2.2.** The old `/faqs/` URL that plan used is now
**404** and the answer lives at `/faq/`. Every Rhodes on that site, and there are
several including the frequently recommended *Tape Pianos*, falls under it.

### 6.2 `musical-artifacts.com` artifact 5001, "Rhodes Electric Piano"

DOCUMENTED, from its `.json` today. Licence field **`by-3`**, which is CC-BY
3.0, author `Daindune`, file `Rhodes_MKII_Piano.sf2`. Its description, verbatim:

> Here is a Rhodes MKII Electric piano soundfont.
> I sampled it in Pianoteq 8, with stereo sound, and three velocity layers.

🔴 **IT IS A RECORDING OF A SOFTWARE EMULATION, WHICH IS THE ONE THING `/nola/`
HAS NO USE FOR.** The page it would go on already has an electric piano that is
arithmetic. Replacing FM arithmetic with samples of somebody else's physical
model is not the upgrade that was asked for.
🔴 **AND THE UPLOADER'S CC-BY IS A LICENCE HE PROBABLY CANNOT GRANT.**
INFERRED, and marked as inference because Modartt's EULA was not fetched today:
commercial instrument plugins routinely forbid redistributing their output as a
sample library, and a third party CC-BY on top of that does not cure it.
**Refused on the instrument first and the paperwork second, so the paperwork
does not need settling.**

### 6.3 `musical-artifacts.com` artifact 459, "Freepats Rhodes"

DOCUMENTED, licence field **`gpl`**, author field **`Unknown`**, one `rhodes.sf2`,
described as *"Cool lo-fi rhodes electric piano sound that was previously
available at http://freepats.zenvoid.org"*, with a Wayback mirror from 2016 as
its only other source.
⚠️ **AUTHOR UNKNOWN IS THE END OF IT.** A GPL label applied by an uploader to a
file whose author is recorded as unknown grants nothing, and `plans/plan-nola.md`
already refused *Piano in 162* for the weaker version of this problem. Its size
could not be MEASURED because the host answers 403 to `HEAD`. **Refused.**

### 6.4 The one that is not a Rhodes and has no licence problem at all

✅ **GREG SULLIVAN'S E-PIANOS, CC-BY 3.0 WITH THE 19,467 BYTE LEGAL CODE IN THE
REPOSITORY.** MEASURED, all three at 44,100 Hz, mono, 16 bit:

| instrument | files | FLAC bytes | seconds | notes | layers | releases | m4a on the smpldsnds mirror |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Wurlitzer EP200** | 42 | 2,391,082 | **100.51** | **20** | PP, MP, F, FF | none | **937,212 B, 0.89 MiB** |
| **Hohner Pianet T** | 49 | 8,049,223 | 433.41 | 18 | P, FF | **16 release samples** | 3,883,472 B, 3.70 MiB |
| **Yamaha CP80** | 81 | 11,003,179 | 511.33 | 23 | PP, MP, F, FF | none | 4,611,092 B, 4.40 MiB |

🔴 **THE WURLITZER IS THE BEST LICENCE-TO-BYTES RATIO IN THIS ENTIRE DOCUMENT
AND IT IS THE WRONG INSTRUMENT.** A Wurlitzer 200 strikes a steel reed and a
Rhodes strikes a tine against a tonebar. They are cousins and they do not sound
alike, and a page that says Rhodes and plays a Wurlitzer is lying in its `what`.
✅ **THE PIANET T IS THE ONLY PACK IN THIS SURVEY WITH RELEASE SAMPLES**, 16 of
them, MEASURED by filename. It is also the wrong instrument, and it only has two
velocity layers.
⚠️ **AND THE NOTE SPACING ON ALL THREE IS IRREGULAR RATHER THAN EVEN.**
MEASURED, the Wurlitzer's gaps run 1, 2, 3, 4, 5, 6 and 7 semitones, so its
worst shift is **3 or 4 semitones**, no better than jRhodes.

✅ **AND THERE IS A SIGNAL IN WHO ELSE GAVE UP.** DOCUMENTED, `smplr`'s
`src/electric-piano.ts`, which is a shipping browser sampler that curates free
instruments, offers exactly four electric pianos: **CP80, PianetT,
WurlitzerEP200 and TX81Z**. The first three are Greg Sullivan's CC-BY set and
the fourth is an **FM piano** out of Versilian's CC0 library. **A library whose
whole job is finding openly licensed instruments for browsers shipped an FM
piano where a Rhodes should be**, which is the same conclusion this document
reaches by a different road, and the same thing `demo/shell/rhodes.mjs` already
is.

### 6.5 The FluidR3 option, which is the cheapest thing here by a factor of ten

MEASURED, summed from the `gleitz/midi-js-soundfonts` trees API, and this is the
same source `demo/nola/` already uses:

| bank and program | all 88 chromatic mp3 | the same 30 note minor third subset |
| --- | --- | --- |
| `FluidR3_GM/acoustic_grand_piano` | 1,971,564 B | **671,974 B**, which is what is in `demo/nola/` today |
| **`FluidR3_GM/electric_piano_1`** | **1,672,174 B** | **571,796 B** |
| `FluidR3_GM/electric_piano_2` | 1,878,952 B | 638,772 B |
| `MusyngKite/electric_piano_1` | 1,311,788 B | 446,398 B |
| `FatBoy/electric_piano_1` | 1,306,978 B | 444,266 B |

✅ **IT IS A ONE FILE CHANGE TO THE FETCH URL IN A BUILD SCRIPT, THE LICENCE
QUESTION IS ALREADY WHATEVER THE PAGE ALREADY ACCEPTED, AND IT IS 88 CHROMATIC
NOTES WITH A WORST PITCH SHIFT OF ZERO.**
🔴 **AND IT IS ONE VELOCITY LAYER, WHICH IS THE EXACT DEFECT `/nola/` ALREADY
SAYS ON ITS OWN FACE.** Swapping one one-layer soundfont for another one-layer
soundfont does not answer *"can you get a similar good sample pack"*; it changes
the timbre and leaves velocity as volume.
⚠️ **AND WHETHER FluidR3's ELECTRIC PIANO IS A RECORDING OF A RHODES AT ALL IS
UNVERIFIED.** FluidR3 is an assembled General MIDI bank, its per-program
provenance is not published anywhere that was found today, and
`plans/plan-nola.md` already records that its upstream host refused the
connection. **It might be a Rhodes, a Rhodes emulation, or an FM patch. Nobody
knows, and a page that claims it is a Rhodes would be guessing.**

---

## 7. What this means for `demo/shell/rhodes.mjs` going to `archive/`

`BACKLOG.md` carries *"general: move our custom rhodes into archvie, it makes
too much agent noise"*, asked the same day as this question. Read together the
two requests mean **a pack is the replacement for the synth on `/nola/`, not a
second engine beside it**, so the standard for the pack is higher than it would
be for an addition.

⚠️ **AND SECTION 6.4 IS THE UNCOMFORTABLE PART OF THAT.** `smplr` reached for an
FM electric piano because no usable Rhodes recording exists for it either. If
the synth leaves and the only landable pack is the 15 sample CC0 subset, the
page trades **five velocity layers of arithmetic that responds to how hard a key
is hit** for **one velocity layer of a real instrument that does not**, on a
page whose whole complaint today is that velocity is only volume. That is a real
regression wearing an upgrade's clothes.

🔴 **THE THREE OUTCOMES, AND ONLY ONE OF THEM IS GOOD.**
1. **Jeff Learman answers yes.** Then `/nola/` gets all five layers of a real
   1977 Rhodes for **2.86 MiB at a 4 s cap**, the synth goes to `archive/`
   without loss, and the page's velocity claim becomes true. **This is the only
   outcome worth building for.**
2. **No answer, and the CC0 subset is taken on its own footing.** One layer, 15
   notes, 0.80 MiB, looped so it sustains. Real Rhodes timbre, no velocity
   response, and a licence resting on a comment that the file next door proves
   unreliable.
3. **No answer and no appetite for the risk.** Then the synth should **not**
   move to `archive/` until something replaces it, because `rig/board/synth.mjs`
   imports it, `rig/m1/rhodes-render.mjs` imports it,
   `demo/shell/worklet-test.mjs` compares against it, and `/nola/` would be left
   with a one layer soundfont. **The archive request and the pack request are
   coupled, and the order is: settle the licence, then move the file.**

---

## 8. The recommendation

🔴 **SEND ONE EMAIL BEFORE BUILDING ANYTHING. IT IS THE ONLY STEP THAT CHANGES
THE ANSWER AND IT COSTS NOTHING.** `jjlearman@gmail.com`, asking whether
`positron.studio` may serve a trimmed, re-encoded subset of the **jRhodes3d mono
set** from a public page with attribution, and asking him to confirm whether the
CC0 line on `005-Electric Piano 1.sfz` was intended to cover those samples. He
offers this in his own licence file, he has granted a bespoke non-NC licence
before, and the two Rhodes packs in existence are both his.

**If he says yes, build this**, using `plans/plan-nola.md`'s own method with no
new arithmetic invented:

| decision | value | why |
| --- | --- | --- |
| set | **jRhodes3d mono**, not `st` or `sv` | the stereo is a synthetic 2 cent doubling by his own README, and a browser can do that for nothing |
| source fetch | **22,884,538 bytes**, once, into `tmp/` | against Salamander's 131 MiB, and the same one-shot build rule applies |
| layers | **all 5**, not 3 | 15 notes is half of Salamander's 30, so the layers are affordable here in a way they are not there |
| cap | **4 s flat, level trim preferred** | 2.86 MiB flat capped, and section 3.5 of plan-nola already argues the level trim beats the cap |
| codec | **AAC in m4a at 96 kbps** | plan-nola section 3.4 measured AAC about 18 dB better than Opus on pre-echo, and it is the only container with no Safari question |
| trim | a few ms before the onset, 2 to 5 ms fade in | pre-echo lives before the attack, so trimming there discards exactly that region |
| total | **about 2.9 MiB**, against the 3.80 MiB piano budget | and it leaves room for the top-octave problem to be solved with more notes if anyone re-samples |
| fetch | lazily, per octave, on first press | `CLAUDE.md`'s most repeated rule |
| attribution | Jeff Learman, 1977 Rhodes Mark I Stage 73, beside the files | `LAYOUT.md` rule 6, and CC-BY requires it under every reading of his licence |

**If he does not answer, do not build the CC0 subset as the page's only
engine.** Take it as a *second* voice beside `demo/shell/rhodes.mjs` if anything,
and keep the synth, because one velocity layer on a page whose open complaint is
that velocity is only volume is not progress. **And say the licence is uncertain
in the commit message rather than in nobody's head.**

**Do not build on Pianobook, on either Musical Artifacts entry, or on FluidR3's
electric piano as a Rhodes.** The first forbids it in writing, the second is a
recording of a plugin under a licence its uploader probably cannot grant, the
third has an unknown author, and the fourth cannot be shown to be a Rhodes at
all.

**The Wurlitzer EP200 is the one to reach for if the instrument is negotiable.**
CC-BY 3.0 with full legal code, 42 files, 100.51 s, **0.89 MiB already encoded**,
and it would be honest on the page as a Wurlitzer.

---

## 9. What this could not settle

🔴 **NOBODY HAS HEARD ANY OF IT, AND THREE OF THE DECISIONS ABOVE ARE REALLY
LISTENING DECISIONS.** Whether a 3 semitone shift ruins a Rhodes bell the way it
would ruin a piano. Whether the EQ Jeff Learman baked in is the sound `/nola/`
wants or one it would fight. Whether the loops in the CC0 subset are clean or
click. **Every sentence in this document about quality is arithmetic or somebody
else's prose.**

⚠️ **THE CC0 QUESTION IS NOT RESOLVED AND THIS DOCUMENT DOES NOT RESOLVE IT.**
Two files by one author say different things. The reading that the CC0 line is a
deliberate re-grant is plausible and the reading that it is a maintainer's
shorthand is plausible, and the fact that the same shorthand is provably wrong
about Greg Sullivan's CP80 is the reason neither can be picked from here.

⚠️ **THE PIANOTEQ EULA WAS NOT FETCHED**, so section 6.2's second objection is
inference. It does not matter, because the first objection is enough.

⚠️ **NO `decodeAudioData` HAS BEEN RUN ON ANYTHING**, which is the same gap
`plans/plan-nola.md` section 3.4 leaves open. `demo/verify-native.mjs` and
`demo/verify-safari.mjs` are the two harnesses that would settle m4a against ogg
on Safari, and neither was run for this.

⚠️ **THE 96 kbps FIGURES ARE ARITHMETIC, NOT ENCODES.** Section 5.1 multiplies
measured seconds by a bitrate, exactly as `plans/plan-nola.md` section 3.3 does.
No file was encoded. Section 5.2's numbers ARE real encodes and are 2.7 times
larger, because they are uncapped, which is the honest reminder that the cap and
the trim are doing most of the work in the first table.

⚠️ **THE RHODES RANGE CLAIM IS FROM MEMORY.** That a Mark I Stage 73 spans MIDI
28 to 100 is **UNVERIFIED** and was not checked against a service manual today.
The conclusion it supports, that the pack covers its own instrument, would
survive being off by a few keys, but the number itself should not be put on a
page without a source.

⚠️ **AND NOTHING HERE CHECKED WHETHER A FOURTH SOURCE EXISTS OUTSIDE GITHUB AND
THE TWO INDEXES SEARCHED.** Freesound was not searched, because its search needs
an API key and `CLAUDE.md`'s external-source rule made that not worth opening an
account for on a survey. **A CC0 Rhodes multisample could be sitting there.**

---

## 10. What to do before anybody builds on this

1. **Email `jjlearman@gmail.com`.** Everything else is contingent on the answer.
2. **Ask him the second question too**: whether `005-Electric Piano 1.sfz`'s CC0
   line covers the samples, and whether `003-Electric Grand Piano.sfz` should say
   CC-BY 3.0 for Greg Sullivan's CP80. The second one is a favour to him and it
   makes the first question obviously good faith.
3. **Listen to one note at the worst case.** Fetch `A_062__D4_5.flac` alone,
   play it at MIDI 59 and at MIDI 65, and decide whether 3 semitones is
   acceptable. **One file, 17.8 s, and it settles the largest open question in
   this document.**
4. **Encode one file for real** at 96 kbps AAC with the trim and the 4 s cap, and
   check the actual bytes against the 2.86 MiB arithmetic. Section 5.2 says to
   expect the arithmetic to be optimistic.
5. **Run `demo/verify-safari.mjs`** on a page that calls `decodeAudioData` on an
   m4a, since that is the one compatibility claim this project has never tested.
6. **Decide the archive question second, not first.** `demo/shell/rhodes.mjs`
   has three importers outside `demo/` and `/nola/` would be left worse off if
   it moves before a pack lands.
