# Kit lessons: circuit-sample

The longer comments cut from `demo/shell/circuit-sample.mjs` and `demo/shell/circuit-sample-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-circuit-sample.md#<anchor>`.

<a id="header"></a>

## `circuit-sample.mjs` module header

```text
demo/shell/circuit-sample.mjs
The SAMPLE half of a Novation Circuit pack: one RIFF/WAVE file read by
walking its chunks, and the numbers a table can sort on.

🔴 NOTHING HERE SENDS ANYTHING ANYWHERE. There is no Web MIDI, no
`requestMIDIAccess`, no output port, no SysEx frame and no network call, and
that is a safety property rather than an omission. `New Pack.circuitpack` is
the only backup of an instrument with no factory reset, and the three
operations that replace its contents are all one press away in Components.
This module reads bytes that are already in memory and returns numbers.
`circuit-sample-test.mjs` asserts the absence TWICE, the way
`circuit-session-test.mjs` does: once over the exported names, and once over
this file's own source text with the comments stripped, because a name test
cannot see a call inside a function.
🔴 AND IT OPENS NO AUDIO DEVICE EITHER. There is no `AudioContext`, no
`decodeAudioData` and no worklet in here. `toMono()` hands back a
`Float32Array` and the page decides whether anything is ever heard, which
keeps the decoder testable in node with no browser at all.

🔴 THE CHUNKS ARE WALKED, NOT ASSUMED, AND THE CORPUS WOULD NEVER CATCH THE
DIFFERENCE. MEASURED 2026-09-21 on all 64 samples in `New Pack.circuitpack`:
every one is `fmt ` then `data` and nothing else, so the audio starts at
offset 44 in 64 of 64 and a hard-coded 44 byte header would read this pack
perfectly. It would also read a file carrying a `LIST` or a `fact` chunk as
noise, silently, which is the shape of defect this repository keeps paying
for. The walker is graded on a synthetic file with an extra chunk in it and
an odd length one that needs its pad byte, because the real pack cannot grade
it.

🔴 THE DURATION IS DERIVED FROM THE DATA LENGTH AND FROM NOTHING THAT CLAIMS
IT. `byteRate` in the header is a claim, and so is a `fact` chunk's frame
count. Both are believed by most players and both can lie. What is counted
here is bytes actually present divided by `blockAlign`, so a truncated file
reports the length it really has and says that it was truncated.

⚖️ WHAT A FIELD MEANS IS NOT GUESSED, THE SAME STANCE `circuit-session.mjs`
TAKES. Everything decoded below is defined by the RIFF/WAVE specification.
🔴 THERE IS NO PAD MAPPING IN HERE BECAUSE NOTHING CORROBORATES ONE. The only
thing a second source confirms is which FILE is which SLOT: `index.json` in
the pack lists 64 samples named `Sample1` to `Sample64` against
`samples/sample_0.wav` to `samples/sample_63.wav`, in order, measured. Which
of the Circuit's drum pads ends up playing slot 37 is a property of a SESSION
and not of the sample, it is not in any WAV header, and the experiment that
would settle it is one assignment on the instrument, one export and a diff.

🔴 AND SINCE 2026-09-21 IT READS A SECOND CONTAINER, BECAUSE ELEVEN FILES IN
THE ARCHIVE DOWNLOAD CARRY SIXTY FOUR SAMPLES EACH AND NEITHER `/tom/` NOR
`/pack/` COULD OPEN ONE. A `.circuitpack` that is not a zip is a bulk SysEx
transfer, and `research/dump-samples-2026-09-21.md` measured the whole layout.
The instruction was three words: *"one line reading byte 0 - do it"*.
`containerOf()` is that line. **`50 4b` is a zip and `f0` is a stream**, and
everything below it exists because the second answer used to be a refusal.
🔴 THE RESTORATION IS PROVED RATHER THAN PLAUSIBLE, WHICH IS THE ONLY REASON
ANY OF IT IS HERE. The stream end carries a **CRC32 of the unpacked payload**
and **36 of 36 streams on this disk verify**, 24 sample and 12 session, over
145 MB of somebody else's packing. A single wrong bit breaks it, and
`streamsIn()` REFUSES a stream that fails rather than handing back audio that
merely looks like audio.
🔴 AND IT STILL BUILDS NOTHING AND STILL SENDS NOTHING. `unpack7()` is
imported from `circuit-syx.mjs`; there is no packer here, no message builder
and no stream writer, and a complete bulk sample transfer is exactly the file
that would replace every sample slot on an instrument with no factory reset.
The test builds the corrupt streams it needs and they cannot leave that file.

🔴 AND SINCE 2026-09-28 IT READS 24 BIT AND IT MIXES STEREO DOWN, BECAUSE
`/pack/` OPENS ANYBODY'S ZIP NOW AND 152 REAL FILES ON THIS DISK OPENED WITH
NO PEAK, NO SOUND SHARE, NO WAVEFORM AND NO PLAYBACK. Asked for in five
words: *"pack: make support of any wavs in zip and change desc accrodingly"*.
MEASURED the same day over the six zips in `tmp/packs` that hold audio: 989
named `.wav` entries, 88 of them Mac resource forks, leaving **901 real
files**. `readWave()` read every one of the 901 perfectly and `toMono()`
refused 152 of them, so every header cell was true and every measured cell
was empty. The shapes are **534 at 44.1 kHz 16 bit mono, 215 at 48 kHz 16 bit
mono, 98 at 44.1 kHz 24 bit stereo, 52 at 44.1 kHz 16 bit stereo and 2 at
44.1 kHz 24 bit mono**, and whole zips sat in the refused half: all 64 of
`Gabe Miller Drums 2020.zip` and all 40 of `one-shots.zip` are 24 bit stereo.
🔴 THE TWO SHAPES ADDED ARE THE TWO THE DISK CAN GRADE AND NOTHING ELSE.
8 bit, 32 bit integer, IEEE float and `WAVE_FORMAT_EXTENSIBLE` are all real
shapes in the wild and there are **zero of each in 965 real files here**,
counting the 64 nested one archive deeper. They are refused BY NAME, with the
count in the refusal, which is the honest version of a widened constant. The
header's own rule has not moved: untested arithmetic that silently produces
plausible audio is worse than a refusal a caller can read out.

🔴 A `blockAlign` SMALLER THAN THE FRAME IT DESCRIBES USED TO THROW A
`RangeError` OUT OF THREE EXPORTED FUNCTIONS, AND THAT WAS FOUND WHILE DOING
THE ABOVE RATHER THAN BY A HARNESS. `frames` comes from the DECLARED block
align and the reader steps by the DERIVED one, so a file declaring 1 on a
16 bit mono frame asked for twice the bytes it has and `toMono`, `content`
and `summarise` all died inside a `DataView`. A page opening somebody's zip
is exactly where that file arrives. The frame count is clamped to what the
data can actually supply now and `framesClamped` says it happened, which is
the module's standing rule arriving one function further in: a refusal is a
value a caller can show and nothing here throws.
```

<a id="depths"></a>

## `circuit-sample.mjs` DEPTHS

```text
The bit depths `toMono()` knows how to turn into floats.

🔴 TWO ENTRIES, AND BOTH ARE GRADED AGAINST REAL FILES RATHER THAN WIDENED.
This read `[16]` until 2026-09-28 and the comment beside it said an 8 bit or
a 24 bit branch would be code nothing here could grade. That was true of the
pack and stopped being true of the disk: **100 of the 901 real `.wav` files
in `tmp/packs` are 24 bit**, 98 stereo and 2 mono, and two whole zips are
nothing else. So 24 arrives with a corpus behind it and the rest do not.

🔴 AND WHAT IS NOT IN IT IS THE POINT. **8 bit is unsigned with a 128 bias**
where every other depth is signed, which is arithmetic that fails by halving
the level and adding a DC offset, which is the exact shape of plausible
audio this module refuses to invent. **32 bit integer** is rarer still. There
are **zero of either in 965 real files on this disk**. Both are refused by
name, with that count in the refusal, and the thing that would change it is a
file rather than an argument.
```

<a id="full-scale-24"></a>

## `circuit-sample.mjs` FULL_SCALE_24

```text
Divisor for 24 bit signed, which runs -8388608 to 8388607.
🔴 THREE BYTES LITTLE ENDIAN AND THE SIGN LIVES IN THE TOP ONE, so a reader
that takes the low two bytes and calls it 16 bit gets noise at a random
amplitude rather than an error. `DataView` has no `getInt24`, so the bytes
are assembled here and the sign is extended by hand.
```

<a id="mix-channels-max"></a>

## `circuit-sample.mjs` MIX_CHANNELS_MAX

```text
🔴 HOW MANY CHANNELS ARE MIXED DOWN, AND WHY IT IS TWO RATHER THAN ANY.
The mixdown below is a plain average, which is the right answer for one
channel and for two and is a GUESS for more: a 5.1 file has a centre, a
surround pair and an LFE, and weighting all six equally is a downmix nobody
here has measured against anything. There are **zero files above 2 channels
in the 965 on this disk**, so more than two is refused by name.
```

<a id="mix"></a>

## `circuit-sample.mjs` MIX

```text
🔴 THE MIXDOWN IS THE MEAN OF THE CHANNELS, AND IT IS WRITTEN DOWN HERE
BECAUSE A PEAK TAKEN AFTER IT IS A DIFFERENT NUMBER FROM A PEAK TAKEN PER
CHANNEL AND SOMEBODY WILL COMPARE THE TWO. `content()` reports BOTH, so the
comparison is a cell rather than an argument.

The three candidates and why this one:
- **The mean, which is what runs.** It cannot leave -1 to 1, so `peak` stays
  a fraction of full scale and `clipped` keeps meaning *this file touches the
  rail* rather than *our arithmetic did*. A frame is at the rail after the
  mean only when BOTH channels are at the rail, which is a stronger and truer
  statement than either channel alone.
- **The sum.** Invents clipping the file does not have: two channels of
  correlated material at 0.8 read 1.6, so a page would show a normalised
  sample as ruined.
- **The left channel alone.** Throws half the file away, and on a hard
  panned one shows silence for a sample that is not silent.
🔴 MEASURED OVER THE 150 REAL STEREO FILES IN `tmp/packs`, AND THE SPREAD IS
THE ARGUMENT FOR REPORTING BOTH NUMBERS RATHER THAN A FOOTNOTE ON IT. The
mean's peak against the louder channel's peak runs **0.46642 at worst,
0.99996 at the median and exactly 1 at best**: 39 of the 150 land on 1
exactly, 34 come in under 0.99 and **15 under 0.9**. 26 of the 150 are dual
mono, where the two readings agree by construction. So the widest file in the
corpus reads at **less than half** the level of its own loudest channel after
the mix, which is a real fact about a wide sample and is indistinguishable
from a quiet one unless both numbers are on screen.
⚠️ THAT MEDIAN WAS WRITTEN HERE AS `1.0000` FOR AN HOUR AND IT IS 0.99996.
The survey that produced it printed `toFixed(4)`, the assert built on the
printed figure went red, and the difference is 4 parts in 100,000 of one
sample of one file. **A rounded reading is a reading and not a fact**, which
this repository has paid for before at a different scale.

⚠️ AND THE ONE CASE WHERE THE MEAN LIES OUTRIGHT IS NAMED AND REPORTED
RATHER THAN LEFT TO BE DISCOVERED. Two channels in exact anti phase average
to digital silence, so `peak` reads 0 on a file that is loud. `content()`
sets `cancelled` when the mix is silent and a channel is not, because *this
file is empty* and *this mixdown cancelled* are two findings and a single
zero collapses them into the wrong one.
⚖️ **THERE ARE ZERO ANTI PHASE FILES IN THE 901**, so that flag has no real
subject on this disk and is graded on a fixture built for it. It is a guard
against a shape rather than a report of one.
```

<a id="readsample"></a>

## `circuit-sample.mjs` readSample

```text
One sample at a byte offset, as a float in -1 to 1.

🔴 24 BIT IS THREE BYTES LITTLE ENDIAN AND THE SIGN IS IN THE TOP BYTE, so
the top byte is shifted up and then the whole value is brought down by 2^24
when bit 23 is set. Doing it with `<< 16` on a signed byte would be a second
way to write the same thing and a first way to get it wrong, because `|` and
`<<` in JavaScript work on 32 bit signed integers and the sign would land in
the wrong bit.
⚠️ IT IS TOTAL OVER `DEPTHS` AND OVER NOTHING ELSE. Every caller checks the
depth first, which is why this has no refusal of its own to return.
```

<a id="shapefault"></a>

## `circuit-sample.mjs` shapeFault

```text
Whether this wave's SHAPE can be turned into floats, and the reason when not.
🔴 ONE PREDICATE, READ BY `readWave`, BY `slotWave` AND BY `toMono`, so the
`decodable` cell a page shows and the refusal a decoder gives cannot disagree.
They were two expressions in two files until 2026-09-28 and widening one of
them would have left the other saying no.
```

<a id="format-gate"></a>

## `circuit-sample.mjs` readWave: format gate

```text
🔴 THE FORMAT GATE IS WHERE IEEE FLOAT AND WAVE_FORMAT_EXTENSIBLE ARE
TURNED AWAY, AND THAT IS A DECISION RATHER THAN AN OMISSION. Both are
real shapes in the wild and there are ZERO of either among the 965 real
`.wav` files on this disk, so neither has anything here to be graded
against. Float in particular is not a depth: it is a different number
line, it is allowed to run past 1.0, and `peak`, `clipped` and the rail
test below all mean something different on it. A refusal that names the
format is an answer a page can print. Arithmetic nothing graded is not.
```

<a id="frames"></a>

## `circuit-sample.mjs` readWave: frames

```text
⚠️ `frames` USES THE DECLARED BLOCK ALIGN RATHER THAN channels x bits / 8.
They agree in all 64 files here and `blockAlignOk` says whether they agree
in the file in hand. Deriving the frame length instead of reading it would
hide exactly the disagreement a caller wants to be told about.

🔴 AND THEN IT IS CLAMPED TO WHAT THE DATA CAN SUPPLY, WHICH IS THE OTHER
HALF AND WAS MISSING UNTIL 2026-09-28. A file declaring a block align
SMALLER than its own frame claims more frames than there are bytes to read
at the real stride, and the reader walked straight off the end of the
`DataView` and threw a `RangeError` out of `toMono`, `content` and
`summarise` alike. MEASURED on a 16 bit mono file declaring a block align
of 1: 8 frames claimed over 8 bytes, 16 bytes needed, three exported
functions dead. Nothing else in this module throws and this must not
either, so the count comes down and `framesClamped` says it did.
```

<a id="tomono"></a>

## `circuit-sample.mjs` toMono

```text
The PCM as plain mono floats in -1 to 1, ready for
`AudioBuffer.copyToChannel`, with no round trip through a decoder.

🔴 IT READS THE MODEL AND NOT THE FILE. `readWave()` copied the data chunk,
so a caller that overwrites the buffer it parsed still gets the right audio,
and the test proves that by scribbling over the source.

🔴 AND A STEREO FILE IS MIXED DOWN BY THE `MIX` ABOVE, WHICH IS THE MEAN.
`mixed` says whether anything was mixed at all, so a page never has to work
it out from the channel count, and `mix` carries the name of the arithmetic
so a reading of this audio can be attributed to it.

@param {object} wave  what `readWave()` returned
@returns {{ok:false, why:string}|{ok:true, samples:Float32Array, frames:number, rate:number, mixed:boolean, mix:string}}
```

<a id="channelpeaks"></a>

## `circuit-sample.mjs` channelPeaks

```text
Every channel's own peak, taken from the bytes BEFORE anything is mixed.

🔴 IT IS A SECOND, INDEPENDENT READING AND THAT IS THE WHOLE REASON IT
EXISTS. `content().peak` is a property of the mixdown; these are properties
of the file. CLAUDE.md's rule about two numbers derived from one field is
what this answers: a page that showed only the mixed peak could not tell a
quiet file from a wide one, and could not tell either from the anti phase
case where the mean is silent and both channels are loud.

@param {object} wave  what `readWave()` returned
@returns {{ok:false, why:string}|{ok:true, peaks:number[]}}
```

<a id="content"></a>

## `circuit-sample.mjs` content

```text
What is actually in the audio, as numbers a table can sort on.

`peak` and `rms` are fractions of full scale rather than dBFS, because a
column of negative decibels reads worse than a column of 0 to 1 and the page
can convert. `leadingZeros` and `trailingZeros` are counted in FRAMES, and
they are how a page says how much of a 2 second sample is sound.

⚠️ A FILE OF NOTHING BUT ZEROS COUNTS AS ALL LEADING AND NO TRAILING. Counting
it both ways would make `sound` negative, and the honest reading of a silent
file is that it never started rather than that it ended twice.

@param {object} wave  what `readWave()` returned
```

<a id="rail"></a>

## `circuit-sample.mjs` content: rail

```text
⚠️ THE RAIL IS ONE STEP OF THIS FILE'S OWN DEPTH, NOT A CONSTANT. This read
`32767 / FULL_SCALE_16` until 2026-09-28, which is 0.99997 and is 256 steps
wide on a 24 bit file, so everything in the top 0.003 per cent of it would
have counted as clipped. One step of 24 bit is 0.00000012.
⚖️ AND IT CHANGES NOTHING ON THIS CORPUS, WHICH IS SAID RATHER THAN LEFT
FOR SOMEBODY TO ASSUME OTHERWISE. MEASURED over the 100 real 24 bit files:
**0 samples at the 24 bit rail and 0 at the 16 bit one**, so not one row
moves either way. It is graded on a fixture built to sit between the two.
```

<a id="cancelled"></a>

## `circuit-sample.mjs` content: cancelled

```text
🔴 THE ONE READING THE MEAN CANNOT GIVE ON ITS OWN. Two channels in anti
phase average to digital silence, so `peak` reads 0 on a file that is
loud. *This file is empty* and *this mixdown cancelled* are two findings
and a bare zero is the wrong one of them.
```

<a id="chanpeak"></a>

## `circuit-sample.mjs` summarise: chanPeak

```text
⚠️ THE PEAK OF THE LOUDEST CHANNEL, BESIDE THE PEAK OF THE MIX, BECAUSE
THEY ARE DIFFERENT NUMBERS ON A WIDE FILE AND A READER COMPARING TWO
COLUMNS SHOULD NOT HAVE TO DECODE THE FILE AGAIN TO DO IT. They are equal
on every mono file by construction, which is why a page showing one
column on a mono pack was never wrong, only narrow.
```

<a id="summariseall"></a>

## `circuit-sample.mjs` summariseAll

```text
The totals a page shows above a table of 64 rows.
⚠️ A REFUSED FILE IS COUNTED, NOT DROPPED. `refused` is the number that says
a pack is not what it looks like, so a total taken over the ones that parsed
would hide the only thing worth seeing.
```

<a id="mixed"></a>

## `circuit-sample.mjs` summariseAll: mixed

```text
⚠️ HOW MANY OF THEM HAD TO BE MIXED DOWN, so a total taken over a pack
that is half stereo says so rather than leaving the reader to infer it
from a `channels` list that only says WHICH counts appear.
```

<a id="samplesin"></a>

## `circuit-sample.mjs` samplesIn

```text
🔴 THE SAMPLES OUT OF AN OPEN PACK, IN ONE PLACE, BECAUSE TWO PAGES WANT
THEM. Instructed 2026-09-21: *"use shared code to get samples"*, while a
second page that opens a `.circuitpack` was being started. `/pack/` had this
loop inline and the new page would have had a second copy of it, which is
exactly the shape CLAUDE.md names: a control that exists in one page and
nowhere else is a component nobody has noticed yet, and the version that
arrives second is always subtly different.

⚠️ IT TAKES THE ENTRY LIST `unzip.mjs` RETURNS, NOT THE PACK'S BYTES. A page
opening a pack wants its patches and its sessions out of the same list, so
reading the zip twice to get two halves of one file would be the waste that
is easy not to notice. The caller unzips once and hands the list round.

⚠️ AND THE ORDER IS THE PACK'S OWN, BY NUMBER RATHER THAN BY NAME.
`sample_10.wav` sorts before `sample_2.wav` as text, and the owner's
`index.json` names them `Sample1` to `Sample64` against `sample_0.wav` to
`sample_63.wav` IN ORDER, 64 of 64. A page showing slot 10 where slot 2 lives
would be wrong in a way nobody would spot by looking.

🔴 A FILE THAT WILL NOT PARSE KEEPS ITS PLACE AND CARRIES ITS REASON. It is
the rule the patch reader already follows: a reader that silently drops one
leaves a pack looking smaller than it is, which is a wrong answer wearing an
empty one's clothes. `summariseAll` counts them as `refused` for the same
reason.
⚠️ AND A MANIFEST IS A PROMISE WHILE THE ARCHIVE IS THE INVENTORY, which was
MEASURED 2026-09-21 on the two packs in `purchased/`: their `index.json`
lists 128 samples between them, every one with an empty name, pointing at
`samples/sample_0.wav` onward, and **neither zip holds a single `.wav`**. A
page building its table from the index would show sixty four rows of audio
that is not in the file. So this reads the ENTRIES and never the index.

@param {{name:string,size:number,read:()=>Promise<Uint8Array>}[]} entries
  whatever `readZip()` returned
@returns {Promise<{name:string,size:number,wave:object,row:object}[]>}
```

<a id="other-container"></a>

## `circuit-sample.mjs` the other container

```text
── the other container ───────────────────────────────────────────────────

🔴 ONE LINE READING BYTE 0, AND IT IS WORTH ELEVEN FILES AND 336 SAMPLES.
Instructed 2026-09-21. Both pages used to hand a non-zip `.circuitpack` to
`readZip()`, catch the throw, and tell the visitor it was not a pack. It is a
pack. It is simply not a zip.
```

<a id="containerof"></a>

## `circuit-sample.mjs` containerOf

```text
The first two bytes, and nothing else.

⚠️ AN EXTENSION IS NOT EVIDENCE AND THAT IS WHY THIS EXISTS. `CLAUDE.md`
records a `.circuitpack` off a public archive that is a raw SysEx stream of
6,930 messages, and the archive download holds eleven more. The name says
pack on all of them, Components opens six of the seventeen, and the byte at
offset 0 separates them in one comparison.

@param {ArrayBuffer|Uint8Array} buf
@returns {{kind:string, head:string, why:string}}
```

<a id="crc32"></a>

## `circuit-sample.mjs` CRC32

```text
🔴 THIS IS WHAT MAKES THE RESTORATION EXACT RATHER THAN PLAUSIBLE. The stream
end declares a CRC32 of the unpacked payload and 36 of 36 streams on this disk
verify, over 145 MB packed by four unrelated authors. One wrong bit in
5,763,072 breaks it.

⚠️ IT IS PLAIN JAVASCRIPT ON PURPOSE. `node:zlib` has `crc32` and a browser
has nothing, and this module runs in both. The test grades this function
against `zlib.crc32`, which is the independent second source the rule about
two-numbers-from-one-field asks for.
```

<a id="region-samples"></a>

## `circuit-sample.mjs` REGION_SAMPLES

```text
✅ The six nibble field at bytes 8 to 13 of a stream start, MEASURED at
`0x23B000` on all 24 sample streams and `0x2E000` on all 12 session streams on
this disk, by four unrelated authors.
⚖️ **WHAT IT MEANS IS A READING AND STAYS ONE.** A destination address, a
capacity and a type tag that happens to look numeric are all consistent with
what is measured. Nothing here decides a stream's kind from it: the slot
walker decides, because the walker can be wrong in a way a reader can see.
```

<a id="streamsin"></a>

## `circuit-sample.mjs` streamsIn

```text
Every logical stream in a file, verified against its own declared length and
its own checksum.

🔴 IT SPLITS ON `0x77` AND `0x7a` BEFORE IT UNPACKS ANYTHING, AND THAT IS THE
WHOLE DIFFERENCE. A `.circuitpack` that is not a zip is TWO streams back to
back, 33 sessions of 53,248 bytes then a 64 slot sample table, and
concatenating all 29,376 carriers first makes one 7,520,256 byte run that is
neither. `research/dump-samples-2026-09-21.md` §7.3 measured the existing
reader doing exactly that and answering `sessions: 141` where the answer is
33.

🔴 AND A STREAM THAT FAILS ITS CHECKSUM IS REFUSED, NOT RETURNED WITH A
WARNING. Audio that decodes is not audio that decoded correctly, and the
stream carries the answer.

⚠️ A CARRIER'S LENGTH IS NOT ASSERTED. All 29,376 measured are 300 bytes and a
short final one would be legal; the declared length and the checksum catch
anything the carrier walk got wrong, which is a stronger test than the shape.

@param {ArrayBuffer|Uint8Array} buf
```

<a id="slot-depths"></a>

## `circuit-sample.mjs` SLOT_DEPTHS

```text
🔴 THE SLOT WALKER'S OWN DEPTH LIST, SPLIT OUT OF `DEPTHS` ON 2026-09-28,
AND THE SPLIT IS THE POINT RATHER THAN THE VALUE. This walk used to test
`DEPTHS.includes(bits)`, so widening the DECODER to read 24 bit files off a
stranger's zip would silently have widened the walker's SYNC CHECK at the
same time. They are two claims about two corpora: the decoder's list is what
the disk holds, and this one is **16 bit on all 1,536 Circuit slots
measured**. A sync check that accepts a second byte value is a sync check
twice as likely to find a sample table in noise, and this file's negative
controls are the only thing standing between a page and 64 rows of plausible
audio out of a session image.
⚠️ It is `bay.mjs`'s lesson in a new costume: one list doing two jobs breaks
everything or protects nothing, so it is two lists.
```

<a id="slot-channels"></a>

## `circuit-sample.mjs` SLOT_CHANNELS

```text
🔴 THE CHANNEL COUNT IS NOT IN THE SLOT HEADER AND THIS IS AN ASSUMPTION
WEARING A CONSTANT'S CLOTHES, SO IT IS NAMED. Ten bytes carry a flags byte, a
marker, a depth, a rate and a length, and no field anywhere says how many
channels. `positron-hardware` records the rule this sits under: **a channel
count cannot be inferred from a payload**, and guessing wrong plays an octave
out, which sounds like a broken instrument rather than a broken header.
✅ What corroborates 1 is a different corpus: all 64 samples in
`New Pack.circuitpack` are 48 kHz 16 bit MONO with a real `fmt ` chunk saying
so, and every recovered slot lands in the same length range as those.
⚠️ IT WOULD TAKE A STEREO SLOT TO PROVE THIS WRONG AND NONE HAS BEEN SEEN.
A slot wave carries `channelsFromHeader: false` so a page can say so.
```

<a id="slotsin"></a>

## `circuit-sample.mjs` slotsIn

```text
Walk the unpacked image as 64 variable length records.

✅ CONFIRMED THREE WAYS in `research/dump-samples-2026-09-21.md` §3.3 and
reproduced here: `80 bb 00 00` occurs exactly 64 times in the image and
nowhere else, the gap from one header to the next minus the declared length is
exactly 10 on all 63 gaps, and a slot of length 0 advances 10 bytes and lands
on the next valid header.

🔴 IT REFUSES THE WHOLE IMAGE RATHER THAN RETURNING WHAT IT GOT. A walk that
has lost the table produces records at arbitrary offsets whose audio is
plausible noise, which is the worst thing a decoder can hand a page. The
reason names the slot and the byte.

@param {ArrayBuffer|Uint8Array} plain  a VERIFIED stream's unpacked payload
```

<a id="tail"></a>

## `circuit-sample.mjs` slotsIn: tail

```text
⚠️ THE TAIL IS REPORTED AND NOT REFUSED. A sample transfer is a fixed size
image of the whole sample memory, so 3,743,408 of `80S Drums_sampleset.syx`
are zero fill after the last slot. That is normal and it is also 70.3 blocks
of 53,248, which is where the `141 sessions` in the research came from.
```

<a id="slotwave"></a>

## `circuit-sample.mjs` slotWave

```text
One slot as the model `readWave()` returns, so `toMono()`, `content()` and
`summarise()` read it with no special case.

🔴 IT BUILDS A MODEL AND NOT A FILE, WHICH IS DELIBERATE. Wrapping the PCM in
a 44 byte RIFF header would be the obvious route and it would put a byte
WRITER in this module, and this module's whole arrangement is that the test
builds bytes and the module does not. Nothing downstream needs the container:
every consumer reads the model.
⚠️ THE FIELDS A RIFF FILE HAS AND A SLOT DOES NOT ARE `null`, NEVER INVENTED.
`riffSizeOk`, `byteRateOk` and `blockAlignOk` are agreements between two
header fields, and a slot header has only one of each, so reporting `true`
would be a check that never looked at anything.

@param {ArrayBuffer|Uint8Array} plain  the image the slot was walked out of
@param {object} slot  one entry from `slotsIn().slots`
```

<a id="samplesetin"></a>

## `circuit-sample.mjs` sampleSetIn

```text
🔴 THE WHOLE JOURNEY, FOR A PAGE: bytes in, the same
`{name, size, wave, row}` rows `samplesIn()` hands back out.

It answers in the order a reader needs: what container is this, what streams
are in it, did each one verify, and only then what audio came out. A file with
no sample table is not an error and says what it is instead.

⚠️ THE UNPACKED IMAGES ARE DROPPED FROM THE RESULT. Two streams of a
`.circuitpack` are 7.5 MB of payload and a page that only wants the audio
would hold it for nothing. The slot data is already copied into each wave.

@param {ArrayBuffer|Uint8Array} buf  a whole file
```

<a id="names"></a>

## `circuit-sample.mjs` sampleSetIn: names

```text
⚠️ THE NAME CARRIES THE STREAM ONLY WHEN THERE IS MORE THAN ONE, because
sixty four rows reading `stream 1 slot 0` on a file with one table is noise
in every cell of a column.
```

<a id="test-header"></a>

## `circuit-sample-test.mjs` test header

```text
demo/shell/circuit-sample-test.mjs
The sample half of the pack, against the real 64, with no browser.

  node demo/shell/circuit-sample-test.mjs

🔴 IT READS `New Pack.circuitpack`, SOMEBODY'S ONLY BACKUP OF A DEVICE WITH NO
FACTORY RESET. Reading is free. Nothing here writes a file, touches a port or
modifies the pack, and the samples are pulled out of it IN MEMORY with
`unzip.mjs` rather than extracted to disk.

🔴 THE REAL CORPUS CANNOT GRADE THE CHUNK WALKER, WHICH IS WHY HALF THIS FILE
IS SYNTHETIC. All 64 samples are `fmt ` then `data` and nothing else, so the
audio starts at offset 44 in 64 of 64 and a reader that skipped 44 bytes and
called it a header would be green on every one of them. The fixtures below
carry a `LIST` chunk of odd length before the data and another chunk after
it, and they are the only thing in this repository that can tell the two
readers apart.

🔴 AND THE SABOTAGES ARE THE POINT. A parser is easy to write green: it reads
a file that is already correct. So a real sample is broken five ways here and
the number of structural claims that go red is the measurement. One of them
takes only 2 of 12 red and all ten survivors are RIGHT to survive, which is
reported rather than tuned away.
```

<a id="test-chunk"></a>

## `circuit-sample-test.mjs` test: chunk builder

```text
🔴 THE TEST BUILDS WAV FILES AND THE MODULE DOES NOT, WHICH IS THE WHOLE
ARRANGEMENT. A writer in `circuit-sample.mjs` would be a function that turns
an intention into bytes aimed at an instrument, and the one in here cannot
leave this file.
```

<a id="test-int24"></a>

## `circuit-sample-test.mjs` test: int24

```text
🔴 THREE BYTES LITTLE ENDIAN, WRITTEN BY HAND AND NOT BY A `DataView`, WHICH
IS THE POINT. There is no `setInt24`, so this is an INDEPENDENT second
implementation of the byte order the module reads: if both sides shared one
helper the test would be grading the helper. Negative values are written as
the two's complement in 24 bits, which is where the sign really lives.
```

<a id="test-odd-list"></a>

## `circuit-sample-test.mjs` test: odd LIST chunk

```text
🔴 THE CHECK THE REAL PACK CANNOT MAKE. An odd length `LIST` before the data
moves the audio to 58 and costs a pad byte, and a chunk after the data proves
the walker does not stop when it has what it wants.
```

<a id="test-at44"></a>

## `circuit-sample-test.mjs` test: at44 control

```text
⚠️ THE CONTROL THAT MAKES THE ABOVE WORTH READING. A reader that assumed a
44 byte header would read this file's LIST text as audio and say so to
nobody.
```

<a id="test-silent"></a>

## `circuit-sample-test.mjs` test: silent file

```text
🔴 A SILENT FILE IS A FINDING, NOT A FAILURE, AND IT HAS TO READ AS ONE.
```

<a id="test-empty-data"></a>

## `circuit-sample-test.mjs` test: empty data chunk

```text
⚠️ AND AN EMPTY DATA CHUNK IS A THIRD THING AGAIN: NOT A REFUSAL, NOT
SILENCE WITH A LENGTH. A pack slot holding one of these is a slot a page
must show as 0.000 s rather than hide.
```

<a id="test-absent-data"></a>

## `circuit-sample-test.mjs` test: data chunk named otherwise

```text
⚠️ THE FIRST ATTEMPT AT THIS ONE WAS NOT A TEST OF ANYTHING. It passed
`wav()` with no audio, which still writes a `data` chunk of length zero,
and the reader accepted it correctly. An absent chunk and an empty one are
different files and both are below.
```

<a id="test-24-bit"></a>

## `circuit-sample-test.mjs` test: 24 bit

```text
═════════════════════════════════════ 24 bit, and the sign in the top byte ══

🔴 EVERY VALUE BELOW IS WRITTEN OUT BY HAND BEFORE THE MODULE IS ASKED
ANYTHING, WHICH IS THE ONLY WAY A DEPTH BRANCH IS GRADED RATHER THAN
EXERCISED. `DEPTHS` gained 24 on 2026-09-28 because 100 real files on this
disk are 24 bit, and a 24 bit reader that is subtly wrong does not throw and
does not look wrong: it produces audio at a strange amplitude or with the
sign of every loud sample inverted, which is the module's own definition of
the worst thing a decoder can hand a page.
```

<a id="test-24-sign"></a>

## `circuit-sample-test.mjs` test: 24 bit sign sabotage

```text
🔴 THE SABOTAGE THAT SAYS THE SIGN IS READ FROM THE TOP BYTE AND NOT FROM
THE MIDDLE ONE. `0x00 0x00 0x80` is -8388608 and its low two bytes are
`00 00`, which a 16 bit reader calls 0 and a reader taking the sign off
byte 1 calls +8388608. Three answers, one file, and only one is right.
```

<a id="test-24-order"></a>

## `circuit-sample-test.mjs` test: 24 bit byte order

```text
🔴 AND THE ONE A BYTE ORDER MISTAKE PRODUCES, WHICH IS THE COMMON ONE.
0x123456 big endian is 0x563412, a completely different sample, and both
are inside -1 to 1 so nothing downstream could tell them apart.
```

<a id="test-24-rail"></a>

## `circuit-sample-test.mjs` test: 24 bit rail

```text
⚠️ THE RAIL IS ONE STEP OF THE FILE'S OWN DEPTH. A sample at 0.99998 of
full scale is 256 steps off the rail in 24 bit and would have counted as
clipped under the old 16 bit constant.
```

<a id="test-mixdown"></a>

## `circuit-sample-test.mjs` test: mixdown

```text
🔴 THE MIXDOWN IS DOCUMENTED IN THE MODULE AND IT IS THE MEAN, so these
grade the mean AND grade that it is not one of the three things it could
have been. A sum, a left channel and a max all give a different answer to
at least one of the files below, which is what makes them a test.
```

<a id="test-not-sum"></a>

## `circuit-sample-test.mjs` test: not sum, left or max

```text
🔴 THE THREE IT IS NOT, EACH DISPROVED BY A NAMED FRAME. Without these the
assert above is satisfied by any function that happens to agree on one row,
and the three candidates the module's own comment weighs are exactly the
three a reader would suspect.
```

<a id="test-channel-peaks"></a>

## `circuit-sample-test.mjs` test: per channel peaks

```text
🔴 PER CHANNEL PEAKS ARE A SECOND, INDEPENDENT READING AND THIS IS WHY.
```

<a id="test-hard-panned"></a>

## `circuit-sample-test.mjs` test: hard panned

```text
🔴 THE HARD PANNED CASE, WHERE THE TWO READINGS DISAGREE BY 6 dB. This is
the shape the corpus has: the widest of 150 real stereo files reads 0.4664
of its own loudest channel after the mix.
⚠️ FULL SCALE POSITIVE IS 32767/32768 AND NOT 1, WHICH IS WRITTEN OUT
RATHER THAN ROUNDED TO, because the first version of the swap sabotage
below asserted 1 and went red on a correct reading. The asymmetry is real:
-32768 reaches exactly -1 and +32767 never reaches +1.
```

<a id="test-swapped"></a>

## `circuit-sample-test.mjs` test: swapped channels

```text
🔴 SABOTAGE: THE TWO CHANNELS SWAPPED. The mean is symmetric so it must NOT
move, and the per channel peaks MUST. A reader taking the left channel
alone fails the first half; one that reads channel 0 twice fails the second.
```

<a id="test-anti-phase"></a>

## `circuit-sample-test.mjs` test: anti phase

```text
🔴 SABOTAGE: ONE CHANNEL INVERTED, WHICH IS THE ONE CASE THE MEAN LIES
ABOUT. The mix is digital silence and the file is loud, and a bare zero
there would read as an empty sample.
```

<a id="test-refused"></a>

## `circuit-sample-test.mjs` test: refused shapes

```text
🔴 A WIDENED CONSTANT IS NOT THE JOB. What is NOT in `DEPTHS` is a decision
with a corpus behind it: there are zero 8 bit, zero 32 bit integer, zero IEEE
float and zero WAVE_FORMAT_EXTENSIBLE files among the 965 real `.wav` files
on this disk, counting one archive deeper. Each is refused with its name in
the sentence, and none of them throws.
```

<a id="test-float"></a>

## `circuit-sample-test.mjs` test: float

```text
🔴 IEEE FLOAT IS REFUSED AT THE FORMAT GATE AND NOT AT THE DEPTH GATE, and
that ordering is the honest one: float is a different number line rather
than a wider integer, it is allowed to run past 1.0, and `peak`, `clipped`
and the rail all mean something else on it.
```

<a id="test-six"></a>

## `circuit-sample-test.mjs` test: six channels

```text
⚠️ AND THE REASON THAT REFUSAL COSTS NOTHING HERE IS A MEASUREMENT: every
one of the 100 real 24 bit files declares format tag 1, plain PCM.
```

<a id="test-no-throw"></a>

## `circuit-sample-test.mjs` test: nothing throws

```text
🔴 AND NOT ONE OF THEM THROWS, WHICH IS THE PROPERTY THE WHOLE MODULE
RESTS ON: a page opening a stranger's zip shows a sentence, never a stack.
```

<a id="test-block-align"></a>

## `circuit-sample-test.mjs` test: small block align

```text
🔴 FOUND WHILE ADDING THE TWO SHAPES ABOVE, AND IT WAS LIVE ON A PAGE THAT
OPENS ANYBODY'S ZIP. `frames` comes from the DECLARED block align and the
reader steps by the DERIVED one, so a file declaring a block align SMALLER
than its own frame claimed more frames than there were bytes and `toMono`,
`content` and `summarise` all died inside a `DataView`. MEASURED before the
repair: 8 frames claimed over 8 bytes, 16 bytes asked for, three exported
functions throwing `RangeError: Offset is outside the bounds of the DataView`.
```

<a id="test-block-align-stereo"></a>

## `circuit-sample-test.mjs` test: small block align stereo

```text
⚠️ THE SAME SHAPE ON A STEREO 24 BIT FILE, because the clamp has to be
computed from the real frame size rather than from a constant.
```

<a id="test-container"></a>

## `circuit-sample-test.mjs` test: the other container

```text
═══════════════════════════════════════════ the other container ═════════

🔴 EVERYTHING FROM HERE TO THE REAL PACK RUNS WITH NO CORPUS AT ALL, and that
is on purpose: this block sits ABOVE the `New Pack.circuitpack` early exit, so
a clone with no `tmp/` still grades the stream reader, the checksum and the
slot walker. The real corpus is at the bottom of the file behind its own
existence check.
```

<a id="test-neither"></a>

## `circuit-sample-test.mjs` test: neither container

```text
🔴 THE THIRD ANSWER IS THE ONE THAT MATTERS ON THIS DISK. Two files in the
archive download are a Windows executable and a Nintendo DS ROM, and a
router with two branches would have to put them somewhere.
```

<a id="test-patch-f0"></a>

## `circuit-sample-test.mjs` test: patch starts f0

```text
⚠️ A PATCH MESSAGE STARTS `f0` TOO, so the byte 0 test says which READER to
reach for and never what is in the file. That is the layering and it is the
thing a one line test could get subtly wrong.
```

<a id="test-crc"></a>

## `circuit-sample-test.mjs` test: CRC oracle

```text
🔴 A CRC GRADED AGAINST ITSELF IS `timeline/csound.mjs` AGAIN: 22 asserts green
for months with two real defects, because the check derived its answer from
the same formula the code implements. `node:zlib` has a CRC32 nobody here
wrote, so it is the oracle. The module cannot use it, because it runs in a
browser too.
```

<a id="test-streams"></a>

## `circuit-sample-test.mjs` test: synthetic streams

```text
---------------------------------------------------- the synthetic streams

🔴 THE TEST PACKS AND THE MODULE DOES NOT, WHICH IS THE SAME ARRANGEMENT THE
WAV BUILDER ABOVE IS UNDER AND IT MATTERS MORE HERE. A complete bulk sample
transfer is the file that would replace every sample slot on an instrument
with no factory reset, and `research/dump-samples-2026-09-21.md` §8 says
whether one writes flash is UNSETTLED. So the packer lives in a node test that
writes nothing to disk, and the last block of this file asserts that no such
function exists in the module.
```

<a id="test-carriers"></a>

## `circuit-sample-test.mjs` test: makeStream carriers

```text
⚠️ EACH CARRIER IS PACKED ON ITS OWN AND THE FIRST BUILD OF THIS PACKED THE
WHOLE PAYLOAD AND THEN CUT IT UP, WHICH LOST 59 BYTES. A real carrier holds
293 packed bytes restoring to 256, and 293 is 36 groups of eight plus a
partial group of five. Cutting one packed run at a carrier boundary lands in
the middle of a group, so the mask and its data go to different messages. The
declared length caught it immediately, which is what that field is for.
```

<a id="test-two-streams"></a>

## `circuit-sample-test.mjs` test: two streams

```text
🔴 TWO STREAMS BACK TO BACK IS THE SHAPE ELEVEN FILES IN THE DOWNLOAD HAVE,
and concatenating their carriers first is the measured defect this splitter
exists to avoid.
```

<a id="test-slot-nulls"></a>

## `circuit-sample-test.mjs` test: slot wave nulls

```text
🔴 THE FIELDS A RIFF FILE HAS AND A SLOT DOES NOT ARE null, NEVER INVENTED.
`riffSizeOk` is an agreement between two header fields and a slot has one of
each, so a `true` there would be a check that never looked at anything.
```

<a id="test-walker"></a>

## `circuit-sample-test.mjs` test: walker refusals

```text
🔴 THIS IS THE HALF THAT STOPS A DECODER FINDING STRUCTURE THAT IS NOT THERE.
A walker that reported slots in noise would produce 64 rows of plausible audio
out of anything, and the CRC above would say nothing about it because the CRC
grades the TRANSPORT.
```

<a id="test-walker-control"></a>

## `circuit-sample-test.mjs` test: walker control

```text
⚠️ THE CONTROL ON THE CONTROLS. A walker that refused everything would pass
every line above and be worthless, which is the `fake-err.mjs` lesson: a
check that reports a boundary whatever it is shown has not found one.
```

<a id="test-sabotage-a"></a>

## `circuit-sample-test.mjs` test: sabotage A

```text
🔴 SABOTAGE A: ONE PAYLOAD BYTE, WHICH IS THE ONE THE CHECKSUM EXISTS FOR.
Everything about the file stays right: the message count, the carrier count,
the declared length, even the slot table. The audio is simply wrong by one
sample and only the CRC can say so.
```

<a id="test-sabotage-a-page"></a>

## `circuit-sample-test.mjs` test: sabotage A page side

```text
⚠️ AND THE PAGE-FACING FUNCTION REFUSES RATHER THAN RETURNING THE AUDIO IT
HAS. The slot table still walks perfectly: a wrong byte in 21 kB of PCM
changes nothing structural, which is exactly why this is the dangerous case.
```

<a id="test-sabotage-b"></a>

## `circuit-sample-test.mjs` test: sabotage B

```text
🔴 SABOTAGE B: THE CHECKSUM ITSELF, which is the other side of the same claim.
```

<a id="test-sabotage-c"></a>

## `circuit-sample-test.mjs` test: sabotage C

```text
🔴 SABOTAGE C: THE DECLARED LENGTH, AND THE CHECKSUM ASSERT SURVIVES IT,
WHICH IS NOT WHAT THIS BLOCK EXPECTED. It was written asserting 4 reds on the
reasoning that a stream failing anything fails everything, and the run said 3:
the payload is untouched, so `crcOk` is genuinely true and the only claim that
broke is the one about the length. Two independent fields, measured
independently, is the shape the whole module wants and it is reported rather
than tuned to the guess.
```

<a id="test-sabotage-d"></a>

## `circuit-sample-test.mjs` test: sabotage D

```text
🔴 SABOTAGE D: THE STREAM NEVER ENDS. There is no checksum to check at all,
and a reader that only compared lengths would call this file perfect.
```

<a id="test-truncation"></a>

## `circuit-sample-test.mjs` test: truncation

```text
⚠️ AND A TRUNCATION THAT TAKES CARRIERS WITH IT FAILS ON THE LENGTH FIRST.
```

<a id="test-sabotage-e"></a>

## `circuit-sample-test.mjs` test: sabotage E

```text
🔴 SABOTAGE E: A SLOT HEADER, which the transport cannot see at all. The
checksum is recomputed over the damaged image, so the stream verifies
perfectly and the walk is the only thing left to notice.
```

<a id="test-every-wav"></a>

## `circuit-sample-test.mjs` test: every wav in every zip

```text
═══════════════════════ every wav in every zip, which is what the job is ═══

🔴 THIS BLOCK SITS ABOVE THE `New Pack.circuitpack` EARLY EXIT ON PURPOSE,
the same way the stream and slot blocks do, because the pack left this
repository on 2026-09-24 and everything below that exit is unreachable on a
checkout that follows CLAUDE.md. A measurement behind a file nobody has is a
measurement nobody takes.

🔴 AND THIS IS THE CORPUS THE MODULE'S HEADER SAID DID NOT EXIST. It has said
since 2026-09-21 that all 64 samples in the pack are `fmt ` then `data` and
nothing else, so no real file here could grade the chunk walker and only the
synthetic fixtures above could. That stopped being true the day `/pack/`
started opening anybody's zip: these 901 files carry **18 distinct chunk
layouts** and **265 of them put the audio somewhere other than offset 44**.
```

<a id="test-forks"></a>

## `circuit-sample-test.mjs` test: resource forks

```text
⚠️ READ IN MEMORY, NOTHING EXTRACTED, NOTHING EXECUTED, and the resource
forks counted rather than quietly skipped. A `.zip` made on a Mac carries a
`__MACOSX/._name.wav` beside every real file: 88 of the 989 named `.wav`
entries here are those, they are 4 KB of finder metadata rather than audio,
and counting them as refused samples would put an 88 file hole in every
figure below.
```

<a id="test-four-questions"></a>

## `circuit-sample-test.mjs` test: four questions

```text
🔴 THE FOUR QUESTIONS THE REQUEST IS ABOUT, ASKED SEPARATELY BECAUSE A
FILE THAT READS IS NOT A FILE THAT PLAYS. Before 2026-09-28 all 901 read
and only 749 of them did anything else, so a page showed a full header row
and four empty measured cells on 152 of them.
```

<a id="test-census"></a>

## `circuit-sample-test.mjs` test: shape census

```text
🔴 THE SHAPE CENSUS, WHICH IS WHAT SAYS THE 152 WERE A REAL POPULATION AND
NOT AN ODDITY. Two whole zips are nothing but 24 bit stereo.
```

<a id="test-layouts"></a>

## `circuit-sample-test.mjs` test: chunk layouts

```text
🔴 AND THE CHUNK WALKER FINALLY HAS A REAL CORPUS, WHICH IS A CLAIM THIS
MODULE'S HEADER HAS BEEN UNABLE TO MAKE SINCE IT WAS WRITTEN. `bext` is a
broadcast metadata chunk 602 bytes long, and a reader that skipped 44 bytes
would have played it as audio on 247 files.
```

<a id="test-bext"></a>

## `circuit-sample-test.mjs` test: bext before fmt

```text
⚠️ THREE FILES PUT `bext` BEFORE `fmt `, so a reader that assumed the format
chunk comes first would miss it on those. The walker does not assume.
```

<a id="test-totals"></a>

## `circuit-sample-test.mjs` test: totals

```text
🔴 THE TOTALS A PAGE SHOWS, AND `mixed` IS THE ONE THAT WAS NOT THERE.
```

<a id="test-ratio"></a>

## `circuit-sample-test.mjs` test: mix ratio

```text
🔴 THE MIXDOWN AGAINST THE REAL STEREO FILES, WHICH IS THE NUMBER THE
MODULE'S COMMENT QUOTES. If the mean were a sum this ratio would run above
1; if it were the left channel it would sit at 0 on a hard panned file.
```

<a id="test-median"></a>

## `circuit-sample-test.mjs` test: mix ratio median

```text
⚠️ THE MEDIAN IS 0.99996 AND THIS ASSERT SAID 1 UNTIL IT WENT RED. The
survey that produced the figure printed four decimal places and `1.0000`
was a ROUNDING rather than a reading, so the number went into the module's
comment wrong before this line caught it. It is asserted to five places
here for exactly that reason.
```

<a id="test-ffmpeg"></a>

## `circuit-sample-test.mjs` test: ffmpeg oracle

```text
── the oracle, which is not this file and not this repository ──────────

🔴 A DEPTH BRANCH GRADED AGAINST ITSELF IS `timeline/csound.mjs` AGAIN:
22 asserts green for months with two real defects, because the check
derived its answer from the formula the code implements. ffmpeg decodes
these files with an implementation nobody here wrote, so it is the oracle.
⚠️ IT SKIPS CLEANLY WHERE FFMPEG IS NOT INSTALLED, the way
`timeline/lab/csound-oracle.mjs` does, because a check nobody can run is a
check nobody runs.
⚠️ AND THE BYTES GO DOWN A PIPE, so this file still writes nothing to disk.
```

<a id="test-real-sabotage"></a>

## `circuit-sample-test.mjs` test: real bytes sabotage

```text
🔴 THE SABOTAGE ON REAL BYTES, WHICH IS THE ONE THAT MATTERS MOST. Every
fixture above is built by this file; this one takes a 24 bit stereo file
out of somebody's zip and tells it that it is 16 bit mono. Nothing about
the file is unreadable afterwards: it parses, it decodes, every float is
in range, and it is completely different audio.
```

<a id="test-pack-chunks"></a>

## `circuit-sample-test.mjs` test: pack chunks

```text
🔴 THE MEASUREMENT THAT JUSTIFIES THE WALKER AND ALSO SHOWS WHY IT IS NEVER
EXERCISED HERE. Two chunks, in that order, in 64 of 64.
```

<a id="test-plan-numbers"></a>

## `circuit-sample-test.mjs` test: plan numbers

```text
🔴 EVERY LINE IN THIS BLOCK WAS PUBLISHED BEFORE THIS MODULE EXISTED, WHICH IS
WHAT MAKES REPRODUCING ONE WORTH ANYTHING. The plan read the headers with a
different tool on a different day and printed five numbers. All five hold.
```

<a id="test-budget"></a>

## `circuit-sample-test.mjs` test: pack budget

```text
⚖️ THE PLAN'S OPEN QUESTION, RESTATED WITH THE NUMBER THIS MODULE MEASURES AND
NOT SETTLED. Whether the Circuit's pack budget is seconds or samples decides
whether 53.4 s at 48 kHz is nearly full or two thirds full, and the experiment
that would answer it writes to the instrument.
```

<a id="test-silence-ends"></a>

## `circuit-sample-test.mjs` test: silence at the ends

```text
🔴 THE NUMBER A PAGE IS FOR: HOW MUCH OF A SAMPLE IS SOUND. 4 per cent of this
pack is zeros at one end or the other, and it is almost all at the END.
```

<a id="test-scaling"></a>

## `circuit-sample-test.mjs` test: scaling

```text
🔴 THE SCALING, GRADED AGAINST THE BYTES RATHER THAN AGAINST ITSELF. If the
divisor were 32767 this would go red on every non-zero sample.
```

<a id="test-copies"></a>

## `circuit-sample-test.mjs` test: copies

```text
🔴 THE PROOF THAT THE MODEL HOLDS COPIES. Parse, scribble over the buffer
that was parsed, decode. If `readWave` had kept a view the audio would carry
the scribble.
```

<a id="test-slots"></a>

## `circuit-sample-test.mjs` test: slots

```text
✅ WHICH FILE IS WHICH SLOT, AND NOTHING MORE. `index.json` was written by
Novation Components and the file names were read by `unzip.mjs`. They agree.
⚖️ WHICH PAD PLAYS SLOT 37 IS NOT IN HERE AND IS NOT GUESSED. It is a property
of a session, not of a WAV, and nothing in this repository corroborates a
mapping.
```

<a id="test-duration-bound"></a>

## `circuit-sample-test.mjs` test: duration bound

```text
⚠️ HALF A MILLISECOND IS THE BOUND AND ONE ROW SITS EXACTLY ON IT. Sample 43
is 0.3125 s, which rounds half up to 0.313, so a strict `< 0.0005` goes red
on a correct row. The bound is inclusive and the float slop is named rather
than papered over with a looser number.
```

<a id="test-purchased"></a>

## `circuit-sample-test.mjs` test: purchased index

```text
🔴 AND THEIR index.json PROMISES 128 SAMPLES THAT ARE NOT IN THE FILE. That
is the `User Session` lesson one layer along: a manifest is a label, the
archive is the fact, and a page that built its table from `index.json`
would show 64 rows of audio that does not exist.
```

<a id="test-two-lengths"></a>

## `circuit-sample-test.mjs` test: two lengths

```text
⚠️ THE CROSS CHECK BETWEEN THE TWO WAYS OF ASKING HOW LONG IT IS. One reads
the data, the other believes the header. They agree in all 64 and a wrong
block align pulls them apart.
```

<a id="test-sabotage-1"></a>

## `circuit-sample-test.mjs` test: sabotage 1

```text
🔴 SABOTAGE 1: THE DATA CHUNK TRUNCATED.
⚠️ IT TAKES 2 OF 12 AND ALL TEN SURVIVORS ARE RIGHT TO SURVIVE, WHICH IS THE
REPORTABLE RESULT RATHER THAN A HOLE. Cut 1,024 bytes off a 16 bit mono file
and what is left is a shorter file that is correct in every other way: whole
frames, a consistent byte rate, floats in range. The ONLY thing that says it
was cut is that two headers still declare the old length, and those are the
two checks that go red. A reader that skipped 44 bytes and trusted what it
found would report 1.49 s and complain to nobody.
```

<a id="test-odd-cut"></a>

## `circuit-sample-test.mjs` test: odd cut

```text
🔴 AND CUTTING AN ODD NUMBER OF BYTES TAKES MORE, WHICH IS NOT A BUG IN
EITHER READING. A dangling half sample is a fact about the file that the
even cut genuinely does not have.
```

<a id="test-sabotage-2"></a>

## `circuit-sample-test.mjs` test: sabotage 2

```text
🔴 SABOTAGE 2: THE RIFF MAGIC CORRUPTED. One byte, and the reader refuses the
file rather than reading the audio that is undeniably still in it.
```

<a id="test-avi"></a>

## `circuit-sample-test.mjs` test: AVI form

```text
⚠️ AND THE FORM IS A SEPARATE BYTE RANGE, SO IT IS A SEPARATE SABOTAGE.
A file can say RIFF and be an AVI.
```

<a id="test-sabotage-3"></a>

## `circuit-sample-test.mjs` test: sabotage 3

```text
🔴 SABOTAGE 3: A BLOCK ALIGN THAT DISAGREES WITH CHANNELS TIMES BITS. The most
dangerous of the three, because nothing about the file looks wrong: it is
still RIFF, still WAVE, still 48 kHz 16 bit mono, still whole frames, and it
still decodes to floats in range. It is simply half as long as it is.
```

<a id="test-sabotage-4"></a>

## `circuit-sample-test.mjs` test: sabotage 4

```text
🔴 SABOTAGE 4: THE FORMAT TAG FLIPPED TO A COMPRESSED ONE. The bytes are
unchanged PCM and the reader must still refuse, because believing the audio
over the header is how a decoder produces confident noise.
```

<a id="test-sabotage-5"></a>

## `circuit-sample-test.mjs` test: sabotage 5

```text
🔴 SABOTAGE 5: THE data CHUNK RENAMED. There is 144,000 bytes of audio in the
file and no chunk claiming it, which is exactly the case a 44 byte assumption
cannot see.
```

<a id="test-sabotage-control"></a>

## `circuit-sample-test.mjs` test: sabotage control

```text
🔴 THE CONTROL ON THE CONTROLS. Every sabotage above is one edit to a copy
of `sample_0.wav`, so the block is only worth anything if the untouched
original is still green after all of it.
```

<a id="test-exports"></a>

## `circuit-sample-test.mjs` test: exports

```text
🔴 THE EXPORT TEST, THE SAME ONE `circuit-session-test.mjs` RUNS.
```

<a id="test-source"></a>

## `circuit-sample-test.mjs` test: source

```text
🔴 AND THE SOURCE TEST, BECAUSE A NAME TEST CANNOT SEE A CALL INSIDE A
FUNCTION. `toMono()` returns an array of floats on purpose, so the export test
alone would not notice a line that handed those floats to a device.
```

<a id="test-strip"></a>

## `circuit-sample-test.mjs` test: strip comments

```text
🔴 THE COMMENTS COME OUT FIRST, AND THAT IS NOT TIDINESS. The module's own
header says `requestMIDIAccess`, `AudioContext` and `decodeAudioData` in the
sentences promising it calls none of them, so a check run over the raw text
goes red on a correct file.
```

<a id="test-audio-list"></a>

## `circuit-sample-test.mjs` test: audio list

```text
🔴 AND A SECOND LIST THIS MODULE NEEDS AND THE SESSION ONE DOES NOT. A
sample decoder is the one place an `AudioContext` would look natural, and an
audio device opened inside a decoder is a decoder that cannot be run in
node, which is where every figure above was measured.
```

<a id="test-making"></a>

## `circuit-sample-test.mjs` test: making list

```text
🔴 AND A THIRD LIST SINCE THE STREAM READER LANDED, WHICH IS THE ONE THIS
WORK COULD HAVE BROKEN. `unpack7` has an inverse and the inverse is the
first half of a complete bulk sample transfer, the file that would replace
every sample slot on an instrument with no factory reset. `pack7` and
`makeStream` are in THIS file and they may not move into that one.
⚠️ AND THESE ARE ANCHORED RATHER THAN SUBSTRINGS, WHICH THE FIRST RUN
PROVED IT HAD TO BE: `'pack7'` matched inside `unpack7` and took this assert
red on a correct module. That is the rule in CLAUDE.md about never guarding
on `includes(<substring>)`, arriving inside the check written to enforce a
different rule.
```

<a id="test-samplesin"></a>

## `circuit-sample-test.mjs` test: samplesIn

```text
── the samples out of a pack, which is the half two pages share ──────────

🔴 `samplesIn` EXISTS BECAUSE A SECOND PAGE WAS ABOUT TO GROW A COPY OF IT.
Instructed 2026-09-21: *"use shared code to get samples"*. What it has to get
right beyond parsing is the ORDER, and that is the part a reader could never
catch by looking: `sample_10.wav` sorts before `sample_2.wav` as text, and the
pack's own `index.json` names `Sample1` to `Sample64` against `sample_0.wav`
to `sample_63.wav` in order, 64 of 64. A page showing slot 10 where slot 2
lives would be silently wrong on every row after the ninth.
```

<a id="test-shuffled"></a>

## `circuit-sample-test.mjs` test: shuffled

```text
🔴 THE NEGATIVE CONTROL FOR THAT ORDER, AND WITHOUT IT THE ASSERT ABOVE IS
SATISFIED BY THE ARCHIVE HAPPENING TO BE IN ORDER ALREADY. The entries are
handed over shuffled here, so a function that returned them as it found
them goes red.
```

<a id="test-no-wavs"></a>

## `circuit-sample-test.mjs` test: no wavs

```text
⚠️ AN ARCHIVE WITH NO WAVS IS NOT AN ERROR, IT IS AN ANSWER, and it is the
real shape of both packs in `purchased/`, whose index promises 128 samples
that are not in either file.
```

<a id="test-broken"></a>

## `circuit-sample-test.mjs` test: broken entry

```text
🔴 A FILE THAT WILL NOT PARSE KEEPS ITS PLACE AND CARRIES ITS REASON, which
is what stops a pack looking smaller than it is.
```

<a id="test-session-image"></a>

## `circuit-sample-test.mjs` test: session image

```text
── a real session image is not a sample table ────────────────────────────

🔴 THE NEGATIVE CONTROL THE SYNTHETIC ONES CANNOT GIVE. Zeros, 0xFF and noise
are easy to refuse. A real 53,248 byte Circuit session is structured data from
the same instrument in the same family of formats, and it is the buffer a
sliced sample stream would be mistaken for.
```

<a id="test-session-page"></a>

## `circuit-sample-test.mjs` test: session through sampleSetIn

```text
⚠️ AND THROUGH THE PAGE-FACING FUNCTION TOO, because a session file dropped
on a sample page has to be told what it is rather than shown nothing.
```

<a id="test-archive-corpus"></a>

## `circuit-sample-test.mjs` test: archive corpus

```text
⚠️ EVERY FILE BELOW IS READ IN MEMORY AND NOTHING IS EXTRACTED TO DISK.
`tmp/` is gitignored as a whole and one zip in that directory is a Windows
executable and another a Nintendo DS ROM. Nothing here runs anything.
⚠️ AND THE TEN INSIDE `Future_Kawaii.rar` ARE NOT HERE. `unzip.mjs` reads
zips and that file is a rar, so the ten `.circuitpack` files in it are
measured in the research and not by this test.
```

<a id="test-missing"></a>

## `circuit-sample-test.mjs` test: missing corpus

```text
🔴 AND THE MISSING ONES ARE COUNTED RATHER THAN INDEXED INTO.
`circuit-session-test.mjs` indexed an optional corpus unconditionally on
2026-09-21 and turned a clean skip into `Cannot read properties of
undefined`, which reads as a broken decoder rather than an absent file.
```

<a id="test-regions"></a>

## `circuit-sample-test.mjs` test: regions

```text
✅ THE FIELD THAT SEPARATES THE TWO KINDS, REPRODUCED. ⚖️ What it MEANS is
a reading and nothing here decides on it: the slot walker decides.
```

<a id="test-one-bit"></a>

## `circuit-sample-test.mjs` test: one bit

```text
🔴 THE SABOTAGE THAT MATTERS MOST, BECAUSE IT IS ON REAL BYTES. One bit
in 5,763,072 and nothing else in the file changes.
```

<a id="test-tail"></a>

## `circuit-sample-test.mjs` test: tail

```text
⚠️ THE TAIL IS ZERO FILL AND IT IS 70.3 BLOCKS OF 53,248, which is where
the `141 sessions` in `research/dump-samples-2026-09-21.md` §7.3 comes
from. It is reported and not refused.
```
