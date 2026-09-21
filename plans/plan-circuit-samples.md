# plan-circuit-samples: the pack in a browser, the drum machine after it

> **Three asks, 2026-09-21, all in `BACKLOG.md` verbatim:** parse and upload a
> Circuit pack locally in the browser and pull the samples out of it; research
> sample packs worth having for *"alternative and non-club... atmospheric, or
> just interesting warm stuff"*; and find the Circuit's own limits on sample
> length and quality, whether downsampling is possible, and what the pipeline
> looks like. The stated destination is **sample based, distributed drum
> machines with different grids**.
>
> 🟢 **THE FIRST ASK IS ANSWERED BY MEASUREMENT RATHER THAN BY ARGUMENT, AND IT
> IS ALREADY WORKING.** `demo/shell/unzip.mjs` reads the real pack with **no
> vendored library at all**, and `node demo/shell/unzip-test.mjs` is **13/13**
> against `New Pack.circuitpack` itself, including a control that corrupts a
> byte and requires a throw.
>
> 🔴 **NOTHING ELSE HERE IS BUILT.** No page, no row in `manifest.mjs`.

---

## 1. A pack is a zip and a browser can open it with nothing added

🔴 **MEASURED.** `New Pack.circuitpack`, 3,506,555 bytes:

| | |
|---|---|
| entries | **164** |
| compression | **161 deflate, 3 stored**, and nothing else |
| zip64 | **no** |
| uncompressed | 6.86 MB, from 3.49 MB of compressed data |

🟢 **SO THE WHOLE READER IS `DecompressionStream('deflate-raw')` PLUS ABOUT A
HUNDRED LINES OF CONTAINER.** That stream is in every browser this project
targets and in node, so a zip library would be adding the central directory, the
local header and an offset, which is exactly `LAYOUT.md`'s test for writing
rather than taking: the thing is read once and nobody learns anything from the
four hundredth zip parser.

⚠️ **ONE TRAP IS IN THE FORMAT AND IT IS WORTH NAMING BECAUSE IT FAILS
QUIETLY.** The local header's name and extra lengths are routinely different
from the central directory's. Using the central directory's numbers to find the
data starts the stream a few bytes off, which **inflates to noise rather than to
an error**. `unzip.mjs` reads the local header's own lengths and says so in a
comment.

⚠️ **AND WHAT IT CANNOT DO, IT REFUSES BY NAME**: zip64, encrypted entries, and
any compression method other than 0 and 8, each with the method number in the
message. A reader that returned nothing for an encrypted entry would be
`moq.mjs`'s silent 404 again.

✅ **UPLOADING IS THEREFORE A `<input type=file>` AND A `FileReader`.** Nothing
leaves the machine. The pack never goes near a server, which is the right
default for somebody's only backup.

---

## 2. What is inside one, measured

| | count | what it is |
|---|---|---|
| `index.json` | 1 | `{name, product: 'circuit', version: '2.0', sessions: [...]}`, 8,609 bytes |
| `patches/patch_N.syx` | **64** | 350 bytes each, `F0 00 20 29 01 60 00 00 00` then 340 data bytes then `F7`. `plans/plan-circuit-editor.md` has the whole format |
| `samples/sample_N.wav` | **64** | plain RIFF PCM |
| `sessions/session_N.circuitsession` | **32** | 53,248 bytes each |

🔴 **EVERY SAMPLE IS 48 kHz, 16 BIT, MONO, WITHOUT EXCEPTION**, read out of the
WAV headers rather than assumed:

| | |
|---|---|
| shortest | **0.12 s** |
| longest | **2.00 s** |
| median | **0.75 s** |
| total | **53.4 s** across all 64 |
| on disk | **5.13 MB** |

🟢 **SO A BROWSER NEEDS NO DECODER FOR THE AUDIO EITHER.** `decodeAudioData`
takes a RIFF PCM buffer directly, and at 48 kHz it matches the rate this
project's `AudioContext` pages already use.

---

## 3. The Circuit's limits, where the measurement and the writing disagree

🌐 **THIRD PARTY** (Synthtopia, 2020, on the original Circuit): it holds *"up to
60 seconds of 44.1 kHz WAV audio"*, moved with Components.
🌐 For contrast, **Circuit Tracks** was 60 s a pack and firmware 1.1.5 raised it
to **196.6 s**; **Circuit Rhythm** is **32 s a slot and 220 s a pack**.

🔴 **THE MEASUREMENT AGREES ABOUT THE TOTAL AND DISAGREES ABOUT THE RATE.**
53.4 s of audio in this pack, which sits just under 60. But every file in it is
**48000 Hz**, not 44100, and that is read out of 64 headers rather than from one.

⚖️ **THE READING THAT FITS BOTH**: the budget is a number of SAMPLES rather than
a number of seconds, and 60 s at 44.1 kHz is **2,646,000 samples**, while 53.4 s
at 48 kHz is **2,563,200**. Those are within 3 per cent of each other, which is
what a nearly full pack looks like against a sample budget.
🔌 **IT IS ONE EXPERIMENT TO SETTLE AND NOBODY HAS RUN IT**: build a pack whose
samples total, say, 58 s at 48 kHz and see whether Components accepts it. If the
budget is samples, it refuses; if it is seconds, it does not.
⚠️ **AND THE PRICE OF GETTING IT WRONG IS NOT SYMMETRIC.** Components writing a
pack to the device replaces what is on it, and the Circuit has no factory reset.

**So the working assumption, stated as an assumption:** about 60 s of mono
16 bit audio per pack, 64 slots, and **48 kHz is what the device itself
produced**, so it is the rate to target.

### 3.1 Downsampling, which is a real lever and a small one

⚖️ The budget is time, not bytes, so **halving the rate does not buy more
seconds** if the limit is seconds, and buys exactly double if it is samples.
That is the same open question as above and it is the reason to settle it before
building a pipeline around a rate.

⚠️ **AND DOWNSAMPLING IS AN AESTHETIC LEVER WHETHER OR NOT IT IS A CAPACITY
ONE.** 12 bit at 24 kHz is a sound, and it is the sound a lot of what was asked
for is made of. That is an argument for doing it deliberately in the pipeline
rather than as a compression trick.

---

## 4. The pipeline, end to end

```
source file  ->  ffmpeg  ->  48 kHz, 16 bit, mono, trimmed, peak normalised
             ->  a slot in a rebuilt pack  ->  Components  ->  the Circuit
```

**The ffmpeg line, which is the whole conversion:**

```sh
ffmpeg -i in.wav -ac 1 -ar 48000 -c:a pcm_s16le \
  -af "silenceremove=start_periods=1:start_threshold=-60dB,loudnorm=I=-14:TP=-1.5" \
  -t 2 out.wav
```

🔴 **THE `-t` IS THE PART THAT NEEDS A DECISION RATHER THAN A DEFAULT.** 64 slots
into about 60 s is **0.94 s a slot on average**, and the pack measured here has a
median of 0.75 s with a longest of 2.00 s. **A pack is a budget and every long
sample is taken from the others.** A pipeline that silently truncates is wrong
and one that silently overruns the budget is worse, so the tool reports the
running total and refuses to exceed it.

⚠️ **TRIMMING SILENCE FIRST IS WORTH MORE THAN ANY ENCODING CHOICE.** A one shot
with 200 ms of digital silence at the front spends a fifth of its slot on
nothing and delays the hit relative to the grid.

✅ **AND A PACK CAN BE REBUILT WITHOUT A DEVICE.** A `.circuitpack` is a zip of
`index.json`, `patches/`, `samples/` and `sessions/`, all measured above, so the
tool that writes one is the reader run backwards. **Writing it is safe; sending
it to the Circuit is the irreversible step**, and that is Components' job and a
person's decision.

---

## 5. Where the sounds come from, and the licence is half the answer

🔴 **"ROYALTY FREE" ON A MARKETING PAGE IS NOT A LICENCE YOU CAN REDISTRIBUTE
UNDER**, and this matters here specifically: anything that ships in this
repository or plays on a page somebody opens is redistribution. Most of the free
pack sites let you USE a sound in your music and say nothing about putting it in
a public demo.

**So, ordered by how safe they are for THIS project rather than by how good they
sound:**

| source | licence | why it is on the list |
|---|---|---|
| **Freesound**, filtered to **CC0** | public domain, no attribution needed | tens of thousands of field recordings, hits and textures. The CC0 filter is a real filter, not a promise |
| **archive.org**, public domain collections | varies, stated per item | this project already pulls from it for `/tapes/`, so the fetch path exists |
| **Signature Sounds** | states **CC0** | drums and percussion including atmospheric textures, which is the brief |
| **99Sounds** | royalty free, stated per pack | analogue and digital synths, acoustic drums, field recordings |
| **Mode Audio** free tasters | royalty free, use only | tape recorded drums, a 1984 cassette deck. **Good for private use, check before shipping** |
| **your own room** | yours | a contact microphone and a table is the warmest non club drum sound there is, and it has no licence question at all |

🟢 **AND THE ONE THIS PROJECT SHOULD ACTUALLY DO FIRST IS THE LAST ROW.** There
is a Model 12 with eight preamps on this desk and a Fast Track Pro already
measured capturing at 48 kHz. **Recording a pack is a half hour and it removes
the licence question entirely**, which no amount of searching does.

⚠️ **WHAT WAS NOT DONE HERE**: nothing above was downloaded, listened to, or
measured. These are sources read off their own pages, and *"interesting warm
stuff"* is a judgement nobody has made yet.

---

## 6. The drum machine, and why the pack is the right way in

**The shortest path to something that plays:**

1. **Drop a pack on a page.** `unzip.mjs` already reads it, `decodeAudioData`
   already takes the WAVs. **Nothing leaves the machine.**
2. **Sixteen steps by four lanes**, which is what the hardware draws and what
   `/circuit/`'s own grid already asserts.
3. **The transport is `timeline/`**, which this repository has had for longer
   than anything else in it. A drum machine that invents its own clock is a
   drum machine that cannot line up with anything else here.

🔴 **AND "DIFFERENT GRIDS" IS THE INTERESTING HALF, NOT THE SIXTEEN STEP ONE.**
Sixteen by four is the Circuit's grid, and this project does not need a second
Circuit. What it does not have anywhere is a machine where **each lane has its
own length**: five against sixteen against seven, which is where the pattern
stops repeating for thirty five bars. That is one number per lane and it is the
whole feature.

🔴 **"DISTRIBUTED" IS ALREADY BUILT AND IT IS CALLED THE RELAY.** A step is a
message, `wire.mjs` carries 1000 a second and was measured at 1 to 2 ms, and
`/bay/` already routes a note from one machine to another. **A distributed drum
machine is a grid whose presses are links in the patch bay**, which is the
argument for having built the bay first.
⚠️ **TWO PEOPLE ON ONE GRID IS TWO WRITERS ON ONE DOCUMENT**, and nothing in
`plans/plan-patchbay.md` says who wins. It is the same open question that plan
names for multi presence and it will arrive here first.

---

## 7. The sessions are opaque and should be left alone for now

🔴 **MEASURED**: 32 files, every one **53,248 bytes**, magic `USER`, a 16
character name at offset 0x10, **87 per cent non zero**, and **44,071 of 53,248
bytes are above 0x7F**.

🔴 **THAT LAST NUMBER IS THE ONE THAT MATTERS: A SESSION IS NOT SEVEN BIT, SO IT
IS NOT SysEx PAYLOAD.** A patch is 340 bytes that are all ≤ 0x7F and can travel
over MIDI as they are. A session cannot, so whatever moves one is not the patch
mechanism.

⚠️ **AND NOTHING DOCUMENTS IT.** The Programmer's Reference covers patches,
control changes and NRPN, and says nothing about the session container. 73 per
cent of the bytes are identical across all 32 sessions, which is a lot of
structure to reverse engineer for a format nobody has published.

🔴 **THE STANDING INSTRUCTION IS STILL THE TOP OF `BACKLOG.md`**: get the 32
sessions off the device, which is a Components operation nobody has run. **That
is a backup, not a parsing project**, and it should happen before anybody starts
poking at the format.

---

## 8. What to build, in order

1. **`demo/shell/unzip.mjs`** ✅ done, 13/13.
2. **A pack reader page**: drop a `.circuitpack`, see its 64 samples with
   lengths, play one. Reads `index.json`, `patches/`, `samples/`. **No upload,
   no server, no device.**
3. **The drum machine**, with per lane lengths, from those samples.
4. **The pack writer**, which is step 2 backwards, and which stops at producing
   a file. Sending it to hardware stays in Components.
5. **Recording our own pack** off the Model 12, which is the row above that
   removes the licence question.

## Sources

- **Measured here, 2026-09-21**: `New Pack.circuitpack` through Python's
  `zipfile` and through `demo/shell/unzip.mjs`; the 64 WAV headers through
  `wave`; the 32 session files by byte census.
- 🌐 Sample memory figures: [Synthtopia on Circuit sampler
  memory](https://www.synthtopia.com/content/2020/07/31/making-the-most-of-sampler-memory-with-the-novation-circuit/),
  [Synth Anatomy on Circuit Tracks firmware
  1.1.5](https://synthanatomy.com/2021/04/novation-circuit-tracks-firmware-1-1-5-upgrades-sample-time-to-1966-secs-per-pack.html),
  [Novation's Circuit Rhythm sample rec
  guide](https://userguides.novationmusic.com/hc/en-gb/articles/25494368059282-Recording-samples-with-the-Circuit-Rhythm-sample-rec-view).
- 🌐 Sample sources: [Signature Sounds](https://signaturesounds.org/),
  [99Sounds drum samples](https://99sounds.org/drum-samples/), [Mode Audio free
  taster packs](https://modeaudio.com/free-taster-sound-packs).
