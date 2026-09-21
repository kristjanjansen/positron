# Getting the audio out of the archive download, with no Circuit wrapper

> **The ask**, 2026-09-21, verbatim: *"can you inverstigate downloaded dump stuff
> can we just get samples out of it does not have to be circuit wrapper? some
> guardrails."*
>
> ✅ **THE ANSWER IS YES, AND IT IS BIGGER THAN A ZIP FULL OF WAVS.**
> **1,540 distinct samples, 13.3 minutes of audio, none of it silent, none of it
> refused.** 1,204 of them are ordinary `.wav` files sitting inside archives, and
> **336 more come out of SysEx sample transfers that no wrapper will ever open**,
> including the eleven `.circuitpack` files that are not zips.
>
> 🔴 **AND THE SYSEX HALF IS NOT A GUESS. THE STREAM CARRIES A CRC32 OF ITS OWN
> UNPACKED CONTENT, AND 31 OF 31 STREAMS VERIFY.** A single wrong bit in
> 5,763,072 bytes would break it. Four deliberately wrong unpackings were tried
> and all four fail it.
>
> ⚠️ **NOTHING WAS SENT ANYWHERE AND NOTHING WAS RUN.** No Web MIDI, no SysEx
> tool, no `amidi`, no Components, no network. Every statement below comes from
> reading bytes already on this disk. Two files in that directory are a Windows
> executable and a Nintendo DS ROM and neither was executed.
>
> ⚠️ **NOTHING IN THE REPOSITORY WAS EDITED.** Everything here is a measurement
> against `demo/shell/circuit-syx.mjs`, `demo/shell/circuit-sample.mjs` and
> `demo/shell/circuit-session.mjs` as they stand today. Three defects were found
> in them and they are REPORTED at the end, not fixed.

Marks used throughout: ✅ measured here today, 📄 read from a file on this disk,
⚖️ a reading rather than a measurement.

---

## 1. 🔴 The guardrails, which came first

### The dangerous shape is in that directory and it was re-measured, not quoted

✅ Every file under `tmp/packs` and every file inside every archive in it was
opened and every `F0 ... F7` message read with `patchesIn()` from
`demo/shell/circuit-syx.mjs`. **2,350 files opened, 690 of them SysEx shaped.**

```
350 byte patch messages          1,201
  command 0x00, lands in RAM       433
  command 0x01, WRITES FLASH       768
  undocumented command bytes         0
```

✅ **768 flash writing messages across 12 files, every one of the twelve aiming
at all 64 slots.** That reproduces `research/circuit-archive-2026-09-21.md`
exactly, independently, today. The twelve are the ten Future Kawaii packs (five
`With Patches` and five `Without Patches`), `payton_carter.circuitpack`, and
`Gemfire Synths_patches.syx`.

🔴 **`Without Patches` still means it writes 64 blank patches over yours.** That
finding is unchanged and nothing here softens it.

### What this work added to the sheet

- ✅ **Sixteen archives were opened and nothing was executed.** `Artillery
  Double Pack.zip` was never extracted. Its 238 MiB payload was **streamed
  through a byte scanner and never written to disk** to answer whether it hides
  audio. It does not, and the method is in section 5.
- ✅ **Nothing was written to `tmp/`.** Every extraction landed in the session
  scratchpad.
- ✅ **`New Pack.circuitpack` was read and not touched.** sha256 before and
  after: `d52145ad95d3a30bf6f022b65492e7fbbfc74bcb1292b139411bf9e929139386`,
  matching the value recorded on 2026-09-21.
- 🔴 **AND IT IS NOT IN THE REPOSITORY ROOT ANY MORE.** `CLAUDE.md` says *"A 3.3
  MiB FILE IN THE REPOSITORY ROOT"*. It lives at **`tmp/personal/New
  Pack.circuitpack`**, moved deliberately in commit `0ddd5af`, whose own message
  is *"session 42: the pack moves to tmp/personal, and git stops being its
  backup"*. `.gitignore` line 92 is `tmp/`, so **the only backup of an
  instrument with no factory reset is now untracked**. That is the intended
  state and it is worth saying out loud, because the sentence in `CLAUDE.md`
  that everybody reads still points at a path with nothing on it.

---

## 2. ✅ The inventory, by container

`tmp/packs` holds **29 files, 437,194,117 bytes**. Twenty of them carry audio.

### 2.1 The `.wav` files

✅ **1,316 `.wav` files on disk after extracting every archive and every nested
pack. `readWave()` parses 1,316 of 1,316. Nothing is refused and nothing is
silent.** After removing byte identical copies there are **1,204 distinct**
files, **636.5 s, 10.6 minutes, 72,217,476 bytes.**

| archive in `tmp/packs` | distinct wav | ready for `toMono()` | needs 24 bit | needs stereo | seconds | rate | bits | ch |
|---|---|---|---|---|---|---|---|---|
| `Novation_Heritage_Drumstation_Hits.zip` | 534 | 534 | 0 | 0 | 181.1 | 44100 | 16 | 1 |
| `payton_carter_circuit_pack_210615.zip` | 247 | 247 | 0 | 0 | 68.1 | 48000 | 16 | 1 |
| `Hip-Hop-Foundations.zip` | 111 | 111 | 0 | 0 | 221.3 | 48000 | 16 | 1 |
| `A_FORCE..._ORIGINS_FREE_DEMO_SOUND_PACK.zip` | 32 | 32 | 0 | 0 | 23.8 | 48000 | 16 | 1 |
| `ASMR-Dream-Sampler.zip` | 32 | 32 | 0 | 0 | 18.9 | 48000 | 16 | 1 |
| `Future_Kawaii.rar` | 96 | 20 | 0 | 76 | 55.4 | 22050, 44100 | 16 | 1, 2 |
| `Gabe Miller Drums 2020.zip` | 64 | 0 | 64 | 64 | 23.8 | 44100 | 24 | 2 |
| `Roland_Classics.zip` | 48 | 0 | 0 | 48 | 17.3 | 44100 | 16 | 2 |
| `one-shots.zip` | 40 | 0 | 36 | 38 | 26.8 | 44100 | 16, 24 | 1, 2 |

✅ **976 of the 1,204 already decode through `toMono()` with no change to any
module.** The other **228 are refused for a stated reason**: 100 are 24 bit, 226
are stereo, 98 are both. ⚠️ That refusal is the module doing exactly what its
comment says it does, and it is a decision to revisit rather than a bug.

🔴 **A HARD CODED 44 BYTE HEADER WOULD MISREAD 824 OF THE 1,316 FILES, AND THE
OWNER'S OWN PACK COULD NEVER HAVE SHOWN THAT.** `circuit-sample.mjs` says so in
its own header comment and the corpus finally proves it. **19 distinct chunk
layouts** appear here. Only 492 files are the plain `fmt ` then `data` that all
64 samples in `New Pack.circuitpack` use:

```
fmt  data                                  492
fmt  data LIST CDif CDif                   515
fmt  bext junk data                        247
fmt  data AFAn                              17
fmt  data LIST CDif CDif CDif               10
fmt  data LIST id3                           7
fmt  data LIST CDif                          7
... and 12 more layouts carrying bext, JUNK, ID3, LGWV, AFmd, acid and cue
```

✅ The walker handles all of them: **0 refusals, 0 block align mismatches, 0
byte rate mismatches, 0 partial final frames.**

### 2.2 🔴 The SysEx sample transfers, which no wrapper opens

✅ **19 files carry a 64 slot sample table. 1,152 filled slots, 336 distinct
after removing copies, 159.9 s, 2.66 minutes.** Every one is **48 kHz, 16 bit,
mono**, which is exactly the format of all 64 samples in the owner's own pack.
**0 refused by `readWave()`, 0 silent.**

| file carrying a 64 slot sample table | filled | empty | seconds |
|---|---|---|---|
| `80S Drums_sampleset.syx` | 64 | 0 | 21.03 |
| `drum_and_synth_samples/drum_and_synth.syx` | 64 | 0 | 41.72 |
| `Roland_Classics/Roland Classics.syx` | 48 | 16 | 17.31 |
| `Future Kawaii Anime Samples.syx` and `Anime/...circuitpack` x2 | 64 | 0 | 34.22 |
| `Future Kawaii Nintendo Samples.syx` and `Nintendo/...circuitpack` x2 | 64 | 0 | 30.02 |
| `Future Kawaii All Together Samples.syx` and `...circuitpack` x2 | 64 | 0 | 29.19 |
| `Future Kawaii Memes Samples.syx` and `Memes/...circuitpack` x2 | 64 | 0 | 28.72 |
| `Future Kawaii Base Samples.syx` and `Base/...circuitpack` x2 | 48 | 16 | 18.80 |
| `payton_carter.circuitpack` | 64 | 0 | 24.46 |

🔴 **THE ELEVEN `.circuitpack` FILES THAT ARE NOT ZIPS EACH CARRY A COMPLETE
SAMPLE SET, AND `/tom/` AND `/pack/` BOTH REFUSE THEM TODAY.** Each of them is
two logical streams back to back: **33 sessions of 53,248 bytes, then 64 sample
slots**, plus 64 patch messages. `1,757,184 + 5,763,072 = 7,520,256` plain bytes,
which is exactly what their 29,376 carriers restore to. ✅ Measured on all
eleven.

### 2.3 What the recovered audio and the WAVs are, relative to each other

✅ **DISJOINT. 0 of the 336 recovered PCM blocks is byte identical to any of the
1,204 WAV data chunks on disk.** ⚠️ That is a fact about this corpus and not a
verdict on the decoder: the packs that ship a sample `.syx` ship no WAVs, and
the packs that ship WAVs ship no sample `.syx`. There was never an overlap to
find. The decoder is graded by the CRC in section 3 instead, which is stronger.

**So the total distinct audio recoverable with no Circuit wrapper anywhere in the
chain is 1,204 + 336 = 1,540 samples, 796.4 s, 13.3 minutes.**

### 2.4 The containers that hold no audio

| kind | count | what it is |
|---|---|---|
| `.circuitsession` | 64 in packs, plus 4 loose in `tmp/purchages` | 53,248 byte sessions, magic `dc bb`, ✅ no audio |
| `.ncs` | 155 | 📄 Circuit Tracks projects at 160,780 bytes and Circuit Rhythm at 169,092. Header `USER`, magic `0c 74`. ✅ no audio |
| `.grideffect` | 16 | ✅ **7 bytes each.** Two configuration bytes and five zeros |
| `.syx` patches | 531 at 350 bytes, 33 at 352, 95 at 12 | patches and empty slot markers. ✅ no audio |
| `index.json` | 6 | the manifest. ⚠️ a promise, not an inventory |

---

## 3. 🔴 What `80S Drums_sampleset.syx` really is

**6,753,638 bytes. It is a bulk sample transfer for all 64 slots and it is fully
decodable with the code already in this repository.**

### 3.1 The transport is the session transport, byte for byte

| question asked | ✅ measured answer |
|---|---|
| how many messages | **22,514**: one of 23 bytes, 22,512 of 300, one of 15 |
| byte 5 of each | `0x77` start x1, `0x79` carrier x22,512, `0x7a` end x1 |
| **what byte 6 is** | 🔴 **NOT a command byte. It is the first MASK byte of the packed payload.** On a carrier, bytes 0 to 5 are the header and everything from byte 6 to the `F7` is seven bit packed content |
| is the payload seven bit packed | ✅ **YES. 6,596,016 payload bytes and 0 of them above 0x7F.** The same MSB first, one mask byte then seven data bytes scheme `circuit-syx.mjs` already implements for sessions |
| does `unpack7()` apply unchanged | ✅ **YES.** 293 packed bytes restore to exactly 256, which is `CARRIER_PLAIN`, on all 22,512 carriers |
| unpacked size | **5,763,072 bytes = 22,512 x 256** |
| does `survey()` say anything useful | ⚠️ `writesFlash: false`, `flashMessages: 0`, `patches: 0`. **True and silent by construction**, because there is not one 350 byte message in the file |

### 3.2 🔴 The stream start and end are a header and a checksum, and they decode

✅ Measured on all 31 logical streams in the corpus.

```
start   f0 00 20 29 00 77 | 00 00 02 03 0b 00 00 00 | 00 00 | 05 07 0f 00 00 00 | f7
end     f0 00 20 29 00 7a | 0d 07 09 0d 01 0c 0a 04 | f7
```

- ✅ **Bytes 16 to 21 of the start are the unpacked payload length, six nibbles
  most significant first.** `05 07 0f 00 00 00` is `0x57F000` = **5,763,072**,
  and `01 0a 0d 00 00 00` is `0x1AD000` = **1,757,184**, which is 33 sessions.
  **31 of 31 streams match their own declared length.**
- 🔴 **Bytes 6 to 13 of the END are a CRC32 of the unpacked payload, same nibble
  encoding. 31 OF 31 STREAMS VERIFY.** `zlib.crc32(plain) === 0xd79d1ca4` for
  this file. ✅ **This is the proof that the seven bit restoration is exactly
  right, not merely plausible.**
- ✅ **Bytes 8 to 13 of the start are the only field that differs by stream
  kind**, in the same nibble encoding: **`0x23B000` on all 19 sample streams and
  `0x2E000` on all 12 session streams**, constant across files by unrelated
  authors. ⚖️ **It looks like a destination address or a length in the
  instrument's own map and that is a reading.** It is nonetheless the only
  candidate in the whole file for "where does this land", which is section 6.
- ✅ Bytes 6 and 7 of the start are `00 00` on every stream of both kinds.

### 3.3 🔴 The payload is a 64 entry slot table, not something to slice

✅ The unpacked 5,763,072 bytes are **64 variable length records laid end to
end**, each a **10 byte header** then signed 16 bit little endian mono PCM.

| offset | size | ✅ what it is |
|---|---|---|
| 0 | 1 | ⚖️ **unexplained.** 35 distinct values across 64 slots, no pattern found |
| 1 | 1 | `0x01` on all 1,152 slots read |
| 2 | 1 | `0x10` = **16, the bit depth**, on all 1,152 |
| 3 to 6 | 4 | uint32 little endian = **48000**, on all 1,152 |
| 7 to 9 | 3 | uint24 little endian = **the PCM byte length**. **0 means an empty slot** |
| 10 onward | len | the audio |

✅ **CONFIRMED THREE INDEPENDENT WAYS:**

1. The byte pattern `80 bb 00 00`, which is 48000 as a little endian uint32,
   occurs **exactly 64 times** in the image and nowhere else.
2. **The gap from one header to the next minus the declared length is exactly 10
   on all 63 gaps.** That pins the header at 10 bytes with no arithmetic left
   over.
3. A slot whose length is 0 advances exactly 10 bytes and **lands precisely on
   the next valid header**. `Roland Classics.syx` is 48 filled and 16 empty and
   `Future Kawaii Base Samples.syx` is 48 and 16, both walked to a clean 64.

✅ **For `80S Drums_sampleset.syx`: 64 of 64 slots filled, 2,019,664 bytes used,
and the remaining 3,743,408 bytes are ZERO. Measured: 0 non-zero bytes in the
tail.** The 6,753,638 byte container is a fixed size image of the whole sample
memory, which is why **13 unrelated files in this download are byte for byte the
same length.**

### 3.4 ✅ The recovered audio, through this repository's own WAV reader

Every slot was wrapped in a 44 byte RIFF header and handed back to
`readWave()` and `content()`.

```
64 slots recovered, 0 refused, 0 silent, 0 clipped frames
21.03 s total, shortest 0.073 s, longest 1.072 s, median 0.288 s
peak 0.3212 to 0.9531, median rms 0.1665
```

Across all 336 distinct recovered samples: **159.9 s, shortest 0.015 s, longest
3.864 s, median 0.360 s, peak 0.1166 to 0.9923 with a median of 0.8816, 0
silent.** These are drum hits and one shots with real dynamics, not headers that
happen to validate.

### 3.5 ✅ The instrument is not blind, which is the half that matters

**Four deliberately wrong unpackings and two blank controls**, graded by the
lag 1 autocorrelation of the result. Real 48 kHz audio is strongly correlated
sample to sample and corrupted bytes are not.

| unpack variant | lag 1 autocorrelation |
|---|---|
| **correct MSB first mask, `circuit-syx.mjs`** | **0.9263** |
| mask ignored, seven bit data only | 0.7225 |
| no unpacking, the raw seven bit payload | 0.4467 |
| mask bits reversed within the group | 0.2555 |
| group misaligned by one byte | 0.1834 |
| random bytes, the negative control | 0.0009 |

✅ And the targeted version of the same question, because a packing error would
show up at the seams rather than everywhere: **mean absolute step across the
7,889 carrier boundaries is 909.45, against 910.56 everywhere else. Ratio
0.999.** There is no discontinuity at any carrier seam.

🔴 **AND THE CRC IS THE ONE THAT SETTLES IT.** The `mask bits reversed` variant
produces `0x4537abe0` against a declared `0xd79d1ca4`. **It fails, as it must.**
A check that passed under sabotage would be decoration.

✅ **The slot walker refuses everything it should:** random bytes 0 slots, all
zeros 0 slots, all `0xFF` 0 slots, and **a real 53,248 byte session 0 slots.**
`payton_carter_sessions.syx`, which is 33 sessions and no samples, yields 0
slots.

---

## 4. 🔴 Where `research/circuit-archive-2026-09-21.md` is wrong

### 4.1 The `stepGridLooksRight()` false positive rate is against ZEROS, not audio

📄 That document says:

> *"Sliced blindly, the sample stream above yields 108 blocks of 53,248 bytes
> that are 16 bit PCM audio and not sessions at all"*, and `stepGridLooksRight().share == 1.0`
> passes **70 of 108**, and *"Quiet PCM audio is mostly zeros, so it sails
> through a test that asks whether bytes 2 and 3 are zero."*

✅ **RE-MEASURED TODAY, AND THE 70 THAT PASS ARE NOT AUDIO AT ALL:**

```
108 blocks of 53,248 bytes
  70 contain NOT ONE non-zero byte      -> stepGridLooksRight passes 70 of 70
  38 carry PCM audio                    -> stepGridLooksRight passes  0 of 38
```

🔴 **SO ITS FALSE POSITIVE RATE AGAINST REAL PCM AUDIO IS 0 OF 38, NOT 70 OF
108.** What it passes is **erased sample memory**, which is exactly the case the
module's own comment already documents (*"16,384 of 16,384 blanks"*). Section 3
explains why: only 2,019,664 of the 5,763,072 bytes are used and the rest is
zero fill, and 3,743,408 zero bytes is 70.3 blocks of 53,248.

⚠️ **THE RECOMMENDED REPAIR IS STILL RIGHT AND THE REASON CHANGES.** Magic
`dc bb` at offset 4 is **0 of 108 here and 32 of 32 on the owner's pack**,
re-confirmed today. It should be the first question asked of any 53,248 byte
buffer, not because the grid test lets audio through, but because the grid test
cannot tell a session from a blank and this format is four fifths blank.

⚠️ And the framing matters more than the number. The published line reads as
*this shape test is weak*. What is true is narrower and more useful: **slicing a
sample transfer into 53,248 byte blocks is a category error**, and the 27,975
"garbage note events" it produces all come from the 38 blocks the gate already
refuses.

### 4.2 The pack census is 17 and 6, not 16 and 5

📄 *"16 files call themselves a pack. 5 are zips. 11 ARE NOT."*

✅ **MEASURED: 17 pack named files, 6 zips, 11 not zips**, ignoring `__MACOSX`
stubs. The eleven non zips are unchanged and all open `f0 00`. The zip that was
missed is **`HIP HOP F volume 1.circuitrhythmpack`**, which is a proper zip
holding 111 WAVs, 64 `.ncs` and 16 `.grideffect`.

### 4.3 The open question about where a sample transfer lands is still open, and there is now one thing to look at

📄 *"Where a bulk SAMPLE transfer lands. RAM or flash is unknown, and
`writesFlash: false` on a carrier-only stream says nothing about it."*

✅ Still true, and it can be sharpened. **There is no per slot command byte
anywhere in the format.** The only byte in the whole 6.7 MB file that
distinguishes a sample transfer from a session transfer is the six nibble field
at bytes 8 to 13 of the stream start: **`0x23B000` for samples, `0x2E000` for
sessions**, constant across nineteen and twelve streams by unrelated authors.

⚖️ **What that value means is a reading and it stays one.** It could be a
destination address, a capacity, or a type tag that looks numeric by accident.
Settling it needs either Novation documentation or an instrument, and on an
instrument the experiment costs the sample slots if the answer is the bad one.

---

## 5. ✅ What is NOT recoverable, and how each absence was established

🔴 An absence reported as a fact is the expensive kind, so each one below names
its method.

| thing | verdict | ✅ how it was established |
|---|---|---|
| `Artillery Double Pack.zip`, 240 MiB | **no audio, and it was never extracted or run** | The 238,398,747 byte `.bin` was **streamed through a signature scanner and never written to disk**. `RIFF` 0, `WAVE` 0, `OggS` 0, `fLaC` 0, Novation SysEx `f0 00 20 29` 0. It counts 3,479 `ff fb` MP3 frame syncs, and **chance alone predicts 3,637** in 238 MB, so that is below noise. ⚠️ It is a compressed or packed installer payload. Nothing decodable is in it as it stands |
| `EasyPiano-2.zip` | **a Nintendo DS ROM, not opened** | 📄 one entry, `NINTENDO_____NTRJ01_00-build2.trim.nds`, named in the zip directory. 🔴 Not extracted and not run |
| `dxup-master.zip` | **six Windows Direct3D DLLs** | 📄 zip directory listing only. Not extracted |
| `07.-afraid-of-heights.zip`, 60 MiB | **8 MP3s of somebody's commercial album, deliberately left alone** | 📄 zip directory listing. The track names include `17. MxPx- Let's Ride.mp3`. ⚠️ It is a released record, not sample content, and it was not extracted |
| the purchased soundbank in `tmp/purchages` | **holds no audio at all** | ✅ `unzip -l` over the whole archive: **0 `.wav` entries** among 149. Its `index.json` promises 128 samples. That reproduces `research/circuit-soundbank-2026-09-21.md` |
| `.ncs`, 155 files | **no audio in them** | ✅ Two fixed sizes, 160,780 and 169,092, and 📄 `index.json` calls them `projects`. No RIFF, no slot table, no 48000 signature |
| `.grideffect`, 16 files | **no audio, and nothing else either** | ✅ **7 bytes each.** `01 03 00 00 00 00 00` and `02 03 00 00 00 00 00`. Two configuration bytes |
| the 228 WAVs `toMono()` refuses | **present and readable, just not decoded here** | ✅ `readWave()` parses all 228 and reports their real format. 100 are 24 bit, 226 are stereo. This is a refusal with a reason, not an absence |
| `noir_presets.zip`, 147 entries | **not audio and not Circuit** | ✅ 772 byte **Apple binary property lists** with no extension. ⚠️ **Only 53 of the 147 extracted**, because several names are not valid UTF-8 and `unzip` failed on them. **That is a tooling limit, not a measurement**, and if those 147 ever matter they need a different extractor |
| `LCXL_Temps_by_Sven_K...zip` | **Launch Control XL templates, wrong instrument** | ✅ 8 extensionless `Template1` to `Template8`, plus an `.odt` whose name also failed to extract |
| a byte identical match between recovered PCM and any WAV | **there is none, and it proves nothing** | ✅ All 336 recovered blocks hashed against all 1,204 WAV data chunks. 0 matches. ⚠️ The corpora do not overlap by construction, so this is an absence of an opportunity rather than an absence of agreement |

---

## 6. ✅ What a general reader would have to handle, in order of value

Written as work a page could do, cheapest and most valuable first.

### First, and it is one line: accept a non-zip `.circuitpack`

🔴 **ELEVEN FILES IN THIS DOWNLOAD CARRY 64 SAMPLES EACH AND BOTH `/tom/` AND
`/pack/` TELL THE VISITOR THEY ARE NOT PACKS.** `/tom/` calls `readZip()` and
reports *"did not read as a pack"*. The first two bytes already separate them:
`50 4b` is a zip, `f0 00` is a SysEx stream. **Reading byte 0 costs nothing and
unlocks 336 samples and 33 sessions per file.**

### Second: the slot table reader, about forty lines

Everything it needs is already here. `messages()` and `unpack7()` from
`circuit-syx.mjs` do the transport, and `readWave()` and `content()` grade the
result. What is missing is the 10 byte header walk in section 3.3 and a function
that wraps raw PCM in a RIFF header so `/tom/` can hold a row.

⚠️ **AND IT SHOULD VERIFY THE CRC RATHER THAN TRUST ITS OWN ARITHMETIC.** The
stream carries the answer. A reader that checks it can say *this file decoded
correctly* instead of *this file decoded*, and the difference is the whole
reason section 3.5 is short.

⚠️ **AND IT MUST SPLIT ON STREAM BOUNDARIES FIRST.** A `.circuitpack` that is
not a zip is two streams. Concatenating all its carriers before unpacking
produces one 7,520,256 byte blob that is neither 33 sessions nor 64 samples, and
`sessionsIn()` as it stands does exactly that. It is why the existing reader
finds 141 "sessions" in one of these files instead of 33.

### Third: stereo and 24 bit in `toMono()`, which buys 228 more samples

✅ 226 stereo and 100 at 24 bits, 98 of them both. ⚠️ **The module refuses these
on purpose** and its comment is right that untested arithmetic producing
plausible audio is worse than a refusal. So this is not a patch, it is a piece
of work with a test behind it, and this corpus is the grading set it never had.

### Fourth: rates other than 48 kHz

✅ 774 distinct files at 44,100 and 16 at 22,050. Nothing in `circuit-sample.mjs`
cares, because `readWave()` reports the rate and a page resamples or plays at
pitch. ⚠️ Worth naming only because **a Circuit slot is always 48 kHz** and a row
mixing the two without saying so is a readout that lies about pitch.

### Not worth it

- `.ncs` and `.grideffect`. ✅ No audio in either, measured.
- The Windows installer, the DS ROM and the DLLs. 🔴 Not worth it and not safe.
- The album. ⚠️ It is somebody's record.
- The 147 `noir_presets` property lists. ✅ Not Circuit data and not audio.

---

## 7. 🔴 Three defects found in modules this repository already trusts

**Reported, not fixed.** The brief said not to edit anything.

### 7.1 `patchesIn()` identifies a Circuit patch by LENGTH ALONE

`demo/shell/circuit-syx.mjs` line 125:

```js
return messages(buf).filter((m) => m.length === PATCH_BYTES)
```

There is no check on the six byte head. ✅ **MEASURED across the whole corpus:**

| shape | count | seen by `patchesIn()` |
|---|---|---|
| product `0x60`, 350 bytes, byte 6 `0x01` | **768** | yes |
| product `0x60`, 350 bytes, byte 6 `0x00` | 321 | yes |
| **product `0x64`, 350 bytes, byte 6 `0x00`** | **112** | **yes, and it is the wrong product** |
| **product `0x64`, 12 bytes, byte 6 `0x01`** | **95** | **NO** |
| **product `0x64`, 352 bytes, byte 6 `0x01`** | **33** | **NO** |

- ✅ **The 768 flash writes are all product `0x60`.** The published safety verdict
  is correct in substance and nothing about it moves.
- ⚠️ **The published "433 RAM" is two products added together**, 321 OG Circuit
  and 112 Circuit Tracks. No safety consequence, because both are byte 6 `0x00`.
- 🔴 **AND THE OTHER DIRECTION IS THE ONE THAT MATTERS. 128 Circuit Tracks
  messages carry byte 6 `0x01` and `survey()` never sees one of them**, because
  they are 12 or 352 bytes rather than 350. So `survey()` on
  `payton_carter.circuittrackspack` prints `writesFlash: false` while 128
  messages in it carry the byte that means FLASH on the sibling product.
  ⚖️ **Whether `0x01` means `Replace Patch` on product `0x64` is NOT established
  here.** The point stands either way: **the reader does not look, so the `false`
  it prints about a Tracks file carries no information.** It is the same hole
  `research/circuit-archive-2026-09-21.md` already names for carrier only
  streams, arriving through a second door.

### 7.2 `readWave()` reports `truncated: true` on 19 files that are complete

`truncated` is `data.truncated || riffSize + 8 !== u8.length`, which merges two
different facts under one word, and the word says audio is missing.

✅ **MEASURED on all 19 flagged files, every one of them in
`HIP HOP F volume 1.circuitrhythmpack`:**

```
chunk running past end of file      0 of 19
RIFF size field disagreeing         19 of 19, and in every case the field is ZERO
declared data size == bytes present 19 of 19
partial final frame                  0 of 19
peak                                0.267 to 0.998, none silent
```

⚖️ The reading is a writer that streamed the file and never went back to patch
the RIFF size. **Nothing is cut.** A page showing `truncated` on these is telling
a visitor that audio is missing when all of it is there. ⚠️ The repair is two
fields rather than a different threshold, which is the same shape as the rule
about gluing facts into one string.

### 7.3 `sessionsIn()` concatenates across stream boundaries

It filters every 300 byte carrier in the file and concatenates the lot before
slicing at 53,248. ✅ **MEASURED on `Future Kawaii Anime.circuitpack`:
`survey()` returns `sessions: 141`.** The real answer is 33. It merged a session
stream and a sample stream into one 7,520,256 byte run, and of the 141 blocks 33
are sessions, 70 are zero fill and 38 are sliced PCM audio. ⚠️ `leftover` does
read 12,288 rather than 0, so something is off, but nothing in the return value
says a stream boundary was crossed and 141 is the number a page would show.
Splitting on `0x77` and `0x7a` first is what section 3.2 does, and the CRC then
says whether the split was right.

---

## 8. What could not be settled

1. 🔴 **Whether a sample transfer writes flash.** No per slot command byte
   exists. The only candidate is the six nibble field at bytes 8 to 13 of the
   stream start, `0x23B000` on samples against `0x2E000` on sessions. ⚖️ A
   reading. Confirming it costs the sample slots if the answer is the bad one.
2. ⚖️ **Byte 0 of the 10 byte slot header.** 35 distinct values across 64 slots,
   present on empty slots too, no correlation found with length, position or
   content. A gain, a loop point, a pad assignment and leftover memory are all
   consistent with what is measured.
3. ⚖️ **Whether byte 6 `0x01` on a Circuit Tracks message means what it means on
   the OG Circuit.** 128 such messages are in this download. Until somebody
   knows, a Tracks pack has no safety reading at all.
4. ⚠️ **94 of the 147 `noir_presets` entries were never extracted**, because
   their names are not valid UTF-8 and `unzip` refused them. What they are is
   read from the 53 that came out, which is an inference across the rest.
5. ⚠️ **The 238 MiB Artillery payload is packed in something unidentified.** The
   scan proves no uncompressed audio and no SysEx. It does not prove the
   container holds nothing.
6. 📄 **`Novation Circuit.zip`, 3.0 GiB and 87 per cent of the archive item, was
   never fetched** and remains the one thing in this download that needs a
   decision.

---

## Appendix: everything read, nothing written

| corpus | count | where |
|---|---|---|
| archives in `tmp/packs` | 29 files, 437,194,117 bytes | read only, never modified |
| extracted to the session scratchpad | 1,688 files, 248 MiB | 🔴 never into `tmp/` and never into the repository |
| nested zip packs opened | 6 | 888 more files |
| `.wav` measured through `readWave()` | 1,316, of which 1,204 distinct | 0 refused |
| SysEx streams CRC verified | **31 of 31** | 19 sample, 12 session |
| sample slots recovered | 1,152, of which 336 distinct | 0 refused, 0 silent |
| 350 byte patch messages surveyed | 1,201 | 768 flash, all product `0x60` |
| `tmp/personal/New Pack.circuitpack` | read, unchanged | sha256 `d52145ad95d3a30bf6f022b65492e7fbbfc74bcb1292b139411bf9e929139386` before and after |

🔴 **NOTHING WAS SENT TO ANY INSTRUMENT, NOTHING WAS EXECUTED, AND NO FILE
OUTSIDE THIS DOCUMENT WAS CREATED OR CHANGED.**
