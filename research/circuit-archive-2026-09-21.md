# A public Circuit archive, downloaded and measured

> **The ask**, 2026-09-21, verbatim: *"in bg dl
> https://archive.org/download/novation-circuit_202402 stuff to purchased/dump
> or whaterv you have"*.
>
> 🔴 **THE ONE THING TO CARRY OUT OF THIS DOCUMENT: TEN FILES IN THIS DOWNLOAD
> SIT IN FOLDERS NAMED `Without Patches` AND EVERY ONE OF THEM OVERWRITES ALL
> 64 PATCH SLOTS WITH `Initial Patch`.** They are `.circuitpack` files that are
> not zips, they carry 64 messages with command byte `01`, which is `Replace
> Patch` and writes FLASH, aimed at locations 0 through 63. `Without Patches`
> does not mean it leaves your patches alone. It means the patches it writes
> are blank ones.
>
> ✅ **AND THE NOTE FORMAT HOLDS ON A THIRD CORPUS.** 46 sessions that nobody
> here has ever seen, 2,614 note events, every structural invariant intact and
> two of them cleaner than on the owner's own pack.
>
> ⚠️ **NO INSTRUMENT WAS IN THIS LOOP.** Nothing was sent anywhere. Every
> statement below comes from reading bytes on this disk.

---

## 1. What the item is

| field | value |
|---|---|
| identifier | `novation-circuit_202402` |
| title | Novation Circuit |
| creator | Novation Circuit (series) |
| uploader | `deefdelic@hotmail.com` |
| added | 2024-02-04 |
| collection | `open_source_software` |
| description | *"Novation Circuit series - Patches and Samples found around the net collection."* |

It is one person's scrapbook of other people's work, not a release by Novation.
That matters for reading everything below: the packs inside come from different
authors, different years and different tools, which is exactly what makes it a
useful corpus and exactly why a file in it cannot be trusted by its name.

**32 files, 3,626,920,932 bytes, 3,458.9 MiB.**

## 2. What was downloaded and what was left

✅ **DOWNLOADED: 29 files, 437,194,117 bytes, 416.9 MiB.** Sequentially, one
request at a time, three seconds apart, a real user agent, resumable ranged GET,
**zero retries and zero failures**. Every file returned HTTP 200 and every file
matched its advertised byte count exactly. They are in `purchased/dump/`, which
`.gitignore` line 83 already covers as `purchased/`.

🔴 **NOT DOWNLOADED, AND THE FIRST ONE NEEDS A DECISION:**

| file | bytes | why not |
|---|---|---|
| `Novation Circuit.zip` | 3,154,325,293 | **3.0 GiB, 87 per cent of the item.** Not fetched without being asked. |
| `Visual C++ Redist 2015-2019 (XP).zip` | 35,368,993 | A Microsoft Windows runtime installer. No Circuit content, and no reason to put an unknown Windows installer on this laptop. |
| `novation-circuit_202402_archive.torrent` | 43,461 | A torrent file is an instruction to open connections to strangers. |

**Skipped total: 3,189,737,747 bytes, 3,042.0 MiB.**

⚠️ **AND ABOUT 320 MiB OF WHAT WAS FETCHED IS NOT CIRCUIT CONTENT EITHER**,
which was only knowable after opening it:

- `Artillery Double Pack.zip`, **240 MiB and the single largest thing
  downloaded**, holds exactly two files: `Artillery Double Pack.exe`, a **PE32
  Windows GUI executable**, and a 238 MiB `.bin` beside it. It is a Windows
  installer, not a pack. ⚠️ **IT WAS NOT RUN AND MUST NOT BE.**
- `EasyPiano-2.zip` holds a **Nintendo DS ROM**, `NINTENDO_____NTRJ01_00-build2.trim.nds`.
- `dxup-master.zip` holds six Windows **Direct3D DLLs**.
- `07.-afraid-of-heights.zip`, 60 MiB, is somebody's album: 8 mp3s, 9 pngs, a
  torrent and a sqlite.

## 3. 🔴 The safety census, which comes first

**Read byte 6 of every 350 byte message.** `00` is `Replace Current Patch` and
lands in RAM. `01` is `Replace Patch` and writes FLASH on an instrument with no
factory reset. `demo/shell/circuit-syx.mjs` was used rather than a second
scanner.

```
TOTAL 350-byte patch messages   1,201
  command 0x00, RAM               433
  command 0x01, FLASH             768
  undocumented command bytes        0
```

🔴 **768 FLASH-WRITING MESSAGES ACROSS 12 FILES. EVERY ONE OF THE TWELVE AIMS
AT ALL 64 SLOTS, LOCATIONS 0 THROUGH 63, 64 DISTINCT.**

| file | flash msgs | zip? |
|---|---|---|
| `Future Kawaii/Packs/With Patches/All Together/Future Kawaii All Together.circuitpack` | 64 | **no** |
| `Future Kawaii/Packs/With Patches/Anime/Future Kawaii Anime.circuitpack` | 64 | **no** |
| `Future Kawaii/Packs/With Patches/Base/Future Kawaii Base.circuitpack` | 64 | **no** |
| `Future Kawaii/Packs/With Patches/Memes/Future Kawaii Memes.circuitpack` | 64 | **no** |
| `Future Kawaii/Packs/With Patches/Nintendo/Future Kawaii Nintendo.circuitpack` | 64 | **no** |
| `Future Kawaii/Packs/Without Patches/All Together/Future Kawaii All Together.circuitpack` | 64 | **no** |
| `Future Kawaii/Packs/Without Patches/Anime/Future Kawaii Anime.circuitpack` | 64 | **no** |
| `Future Kawaii/Packs/Without Patches/Base/Future Kawaii Base.circuitpack` | 64 | **no** |
| `Future Kawaii/Packs/Without Patches/Memes/Future Kawaii Memes.circuitpack` | 64 | **no** |
| `Future Kawaii/Packs/Without Patches/Nintendo/Future Kawaii Nintendo.circuitpack` | 64 | **no** |
| `payton_carter_circuit_pack_201215/payton_carter.circuitpack` | 64 | **no** |
| `Gemfire Synths/Gemfire Synths_patches.syx` | 64 | n/a, a bare `.syx` |

✅ **THE 344 `patch_N.syx` FILES INSIDE PROPER ZIP PACKS ARE SAFE**: 216 carry
command `00` and **not one carries `01`**. The danger is entirely in the loose
files and the fake packs.

### 🔴 `Without Patches` writes patches, and they are blanks

MEASURED by decoding the patch names out of the flash messages with
`demo/shell/circuit-patch.mjs`:

| file | distinct patch names | first few |
|---|---|---|
| `With Patches/Base/...circuitpack` | **64** | Smooth Pad, Saw Striker, Alive, K-plunk, Talky Bass |
| `Without Patches/Base/...circuitpack` | **1** | **Initial Patch, 64 times** |
| `payton_carter.circuitpack` | 34 | PC_Annabelle, PC_Banks, PC_Clementine, PC_Cyanide |

Both files carry command `01` at locations 0 through 63. The `Without Patches`
build is **not the safe one**. It is the one that replaces all 64 of somebody's
patches with `Initial Patch` and leaves nothing behind to hear.

⚠️ **THIS IS THE `User Session` LESSON AGAIN, IN THE WORST POSSIBLE PLACE.**
First a name was not evidence, then a four byte head was not evidence, then a
hash was not evidence. Now a **folder name states the opposite of what the file
does**, and the reading that gets somebody hurt is the cautious one: a person
protecting their patches picks the folder that says `Without Patches`.

### An extension is still not evidence

✅ **16 files call themselves a pack. 5 are zips. 11 ARE NOT.** All eleven
non-zips open `f0 00 20 29 00 77`, are **exactly 8,835,276 bytes**, and are
**11 distinct files** rather than copies of one. Each holds 29,444 messages:
two stream starts, 29,376 carriers, two stream ends and 64 patch messages.

Novation Components will not open these, so anybody handling one reaches for a
SysEx tool, which is the route with no safety rail. That is the shape
`CLAUDE.md` already warns about, and there are now eleven more of them on this
disk.

### 🔴 A `writesFlash: false` is NOT a clean bill of health

`80S Drums_sampleset.syx`, 6,753,638 bytes, surveys as **`writesFlash: false`
with 0 patch messages**. That is true and it is not the same as safe. The file
is a bulk **sample** stream: 22,512 carriers, 5,763,072 payload bytes, wrapped
in one stream start and one stream end.

⚠️ **WHERE A SAMPLE TRANSFER LANDS IS NOT ANSWERED BY ANYTHING IN THIS
REPOSITORY.** `survey()` reads the patch command byte and nothing else, so on a
file with no patch messages it is silent by construction rather than reassuring.
The Circuit's 64 sample slots are not RAM. **Treat `flashMessages: 0` on a
carrier-only stream as "not measured", never as "safe".**

## 4. 🔴 The shape test has a false positive rate, measured

`stepGridLooksRight()` is documented as *"the cheapest thing that tells a
session from a file that merely happens to be 53,248 bytes long"*. That claim is
now measurably too strong.

Sliced blindly, the sample stream above yields **108 blocks of 53,248 bytes that
are 16 bit PCM audio and not sessions at all**:

| test | result on 108 non-sessions |
|---|---|
| `stepGridLooksRight().share == 1.0` | **70 of 108 PASS** |
| magic `dc bb` at offset 4 | **0 of 108** (owner: 32 of 32) |

⚠️ **THE RANDOM-BYTES CONTROL WAS THE WRONG SHAPE.** The published control puts
random bytes at 0 of 2,048 on the zero test. Quiet PCM audio is mostly zeros, so
it sails through a test that asks whether bytes 2 and 3 are zero. A control has
to look like the thing you will actually be handed.

✅ **AND THE GOOD NEWS, WHICH IS THE HALF THAT MATTERS.** The 70 that pass yield
**0 note events between them**, and all **27,975** garbage note events come from
the 38 that the test correctly refuses. So the gate fails in the safe direction:
it never lets through a non-session that would invent notes.

✅ **THE TEST THAT ACTUALLY SEPARATES THEM IS TWO BYTES**: magic `dc bb` at
offset 4, already read by `readSession()` as `header.magicOk`. It is 0 of 108
against 32 of 32, it is cheaper than the grid scan, and it should be the first
question asked of any 53,248 byte buffer.

## 5. ✅ The note format on a third corpus: IT HOLDS

**46 sessions** passed the magic test, from two packs by unrelated authors, and
**none is byte identical to any of the owner's 32**.

| test | OWNER 32 (re-measured here) | **ARCHIVE 46** | BLANK 64 | RANDOM 8 |
|---|---|---|---|---|
| records read | 8,192 | **11,776** | 16,384 | 2,048 |
| bytes 2 and 3 both zero | 100.00% | **100.00%** | 100% | 0% |
| mask has bit 6 or 7 set | 0 of 8,192 | **0 of 11,776** | 0 | 1,540 of 2,048 |
| popcount == filled slots | 99.62% | **99.87%** | 100% | 11.08% |
| popcount <= filled slots | **100%** | **100%** | 100% | 96.44% |
| note events | 5,095 | **2,614** | **0** | 8,203 |
| note range | 36..132, **105 over 127** | **24..108, 0 over 127** | n/a | 49% over 127 |
| velocity range | 1..127 | **1..126** | n/a | n/a |
| bytes at +448 | `0f 00 00 00` x508, `02 00 00 00` x4 | **`0f 00 00 00` x736, 100%** | n/a | n/a |

⚠️ **THE OWNER BASELINE WAS RE-MEASURED RATHER THAN QUOTED**, and it reproduces
`research/circuit-session-notes-2026-09-21.md` exactly on every row. That is
what makes the archive column worth reading.

**Two rows come out CLEANER on the strangers' pack than on the owner's:**

- `popcount == filled` is **99.87 per cent against 99.62**. The stale-note-byte
  reading survives: popcount is **never greater** than the filled slot count,
  11,776 of 11,776, the same invariant, so a decoder still has to read the mask.
- **Zero notes above 127**, against 105 in the owner's pack. Those 105 were all
  in `session_28` regions 8 to 15 and looked like the format's weak point. A
  second corpus with none of them says `session_28` is unusual rather than the
  format being loose.

✅ **ROUND TRIP: `rebuild()` returns byte identical on 46 of 46.**

### ⚠️ The one thing that does NOT match: gate

The published `0xFF` gate range is **1 to 96 across 4,224 events**, with the
reading that gate counts sixths of a step so a full 16 step gate is 96.

MEASURED here: ASMR sits inside it at **1..96**. `ORIGINS FREE DEMO` reaches
**224**. It is **22 events of 1,315, 1.7 per cent**, in four sessions, at three
values: **132, 200 and 224**. Of those, 132 is a multiple of 6 and 200 and 224
are not.

⚖️ **SO THE 96 IS NOT A CEILING, AND THE "SIXTHS OF A STEP" READING DOES NOT
EXPLAIN 200 OR 224.** It is marked as a reading in the source document and it
stays one. Nothing else about the format moves: the same 22 events sit in
records whose mask, zero bytes and popcount all behave. **Whether a gate above
96 is a longer tie, a different unit, or a field this decoder is misreading is
NOT SETTLED and would need an instrument.**

### ⚠️ What this corpus does NOT test

**All 46 sessions carry header byte 8 = `0xFF`.** The `0x07` per step velocity
encoding gets **no new evidence at all** here. It still rests on the owner's 8
sessions and the `Ghostly Intro` pair.

## 6. ✅ An independent confirmation of "29 of 32"

`CLAUDE.md` says the owner's pack holds **29 sessions of real work, not 32**,
and that `session_10`, `session_16` and `session_22` are the near-template
three. That was decided by **byte distance from a stock template**.

This archive contains its own stock template: one `Initial Session` that appears
**18 times**, 16 times in the ASMR pack and twice in ORIGINS, across two
unrelated packs. It holds **0 note events**.

🔴 **AN ENTIRELY DIFFERENT MEASURE REACHES THE SAME VERDICT AND NAMES THE SAME
THREE FILES.** Counting note events rather than byte distance:

```
owner sessions with ZERO note events   3   session_10, session_16, session_22
owner sessions WITH note events       29
```

And the byte distance to this new template has a clean gap in it:

```
session_16   4,096 bytes differ   0 notes
session_10   4,097               0 notes
session_22   4,097               0 notes
        ---- the gap ----
session_31   4,358               9 notes
session_8    4,424              48 notes
median over all 32: 5,562        max 9,508 (session_5, 192 notes)
```

⚠️ **NOTE THAT EVEN `session_16` DIFFERS FROM THIS TEMPLATE AT 4,096 BYTES**, so
this is a different revision of the template from the one that matched it byte
for byte. The split it produces is identical anyway, which is the point: two
templates from two sources and two different measures, one answer.

✅ **THE CONCLUSION IS UNCHANGED AND BETTER SUPPORTED. 29 of 32, and nothing
about not sending a pack to the Circuit changes.**

## 7. A manifest is a promise, the archive is the inventory

MEASURED on five packs. `samplesIn()` reads entries and never the index, for
this reason.

| pack | product | promised | on disk |
|---|---|---|---|
| ASMR Sampler | circuit | 32 sessions, 64 patches, 64 samples | 32, 64, **32** |
| ASMR Sampler | circuit-tracks | 64 projects, 128 patches, 64 samples | **16**, **64**, **32** |
| ORIGINS FREE DEMO | circuit | 32 sessions, 64 patches, 64 samples | 32, 64, **32** |
| ORIGINS FREE DEMO | circuit-tracks | 64 projects, 128 patches, 64 samples | **11**, **24**, **32** |
| HIP HOP album 1 | circuit-rhythm | 64 projects, 128 samples, 16 grid effects | 64, **111**, 16 |
| Payton Carter | circuit-tracks | 64 projects, 128 patches, 64 samples | 64, 128, 64 |

**Five of six over-promise. One is complete.** The gap is the norm rather than
the exception, on packs from four different authors.

✅ **UNLIKE THE TWO PACKS IN `purchased/`, THESE HOLD REAL AUDIO.** Every `.wav`
parses through `demo/shell/circuit-sample.mjs`, **none is silent**, all are
**48 kHz 16 bit mono PCM** with `fmt ` and `data` chunks and none truncated.
`ASMR sample_0` is 0.214 s, peak 0.95, RMS 0.2845, 99.9 per cent sound.

## 8. Two formats this project had never seen

### `.ncs`, a Circuit Tracks project

**160,780 bytes**, against the Circuit session's 53,248. ⚠️ **AND IT SHARES THE
SESSION HEADER CONVENTION**: tag `USER` at offset 0 and a 32 byte name at offset
16, exactly where `circuit-session.mjs` puts `TAG_AT` and `NAME_AT`. The magic
at offset 4 is **`0c 74`** and not `dc bb`.

MEASURED on the ASMR pack's 16 projects: **16 distinct fingerprints of 16**,
entropy 1.04 to 1.11 bits a byte, **82.5 to 83.1 per cent non-zero**, which sits
beside the owner's real sessions at 84 to 89 per cent and two orders of
magnitude away from the blanks at 0.1 per cent. They are real work.
⚠️ Eight are named `User Session` and eight `Drone Delay`, and the eight
`Drone Delay` are all distinct. The name is still a label somebody did not
change.

⚖️ **NO DECODER WAS WRITTEN AND NONE SHOULD BE GUESSED.** Whether the 28 byte
step record survives into `.ncs` is **UNMEASURED**. The shared header is an
invitation to look, not a finding.

### `.grideffect`, in a `circuit-rhythm` pack

16 of them in `HIP HOP F volume 1.circuitrhythmpack`, which IS a proper zip.
Contents not investigated.

## 9. What could not be settled

1. **The 3.0 GiB `Novation Circuit.zip` was not fetched.** It is 87 per cent of
   the item and the only part of this download that needs a decision.
2. **Where a bulk SAMPLE transfer lands.** RAM or flash is unknown, and
   `writesFlash: false` on a carrier-only stream says nothing about it.
3. **Gate values above 96.** Three values, 22 events, no explanation that fits.
4. **The `0x07` velocity encoding gets no new evidence.** All 46 are `0xFF`.
5. **`.ncs` and `.grideffect` are unparsed.**
6. **Whether `Send to Circuit` on a pack really writes session slots** is still
   the inference it was, and the only way to confirm it costs the sessions if
   the answer is yes.

---

## Appendix: the corpora, all read and never written

| corpus | files | source |
|---|---|---|
| ARCHIVE sessions | 46 | ASMR Sampler 32, ORIGINS FREE DEMO 14 |
| ARCHIVE distinct | 29 | 18 copies of one `Initial Session` collapse to 1 |
| ARCHIVE `.ncs` | 91 | ASMR 16, ORIGINS 11, payton_carter 64 |
| ARCHIVE loose `.syx` | 674 | 433 RAM patches, 64 flash, 240 non-patch |
| ARCHIVE `.wav` | 1,205 | across all packs |
| OWNER | 32 | `New Pack.circuitpack`, extracted read only to scratch |

⚠️ **`New Pack.circuitpack` WAS READ AND NOT TOUCHED.** sha256
`d52145ad95d3a30bf6f022b65492e7fbbfc74bcb1292b139411bf9e929139386`, unchanged.
