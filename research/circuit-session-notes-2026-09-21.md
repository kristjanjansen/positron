# Note data out of a Circuit session, measured

> **The ask**, 2026-09-21, verbatim: *"can we get note data out of regions?"*
>
> ✅ **YES. The sixteen 1,508 byte `wide` regions carry a 16 step grid of 28
> byte records, each record holds up to six notes as MIDI note numbers with a
> velocity and a gate, and 5,095 note events come out of the owner's 32
> sessions.**
>
> 🔴 **AND THE CONTROL IS THE HALF THAT MAKES THAT WORTH ANYTHING: the same
> decoder finds ZERO note events in all 64 purchased blanks, ZERO in the three
> near-template sessions, and about 1,025 per file in random bytes.** A detector
> that finds notes in a blank has found nothing. This one finds none.
>
> ⚠️ **NO INSTRUMENT WAS IN THIS LOOP.** Nobody pressed a key, recorded a
> pattern and exported it. Section 9 is the ordered list of what a person at
> the Circuit would have to do, and it takes about five minutes.

---

## 1. What is measured and what is a reading

Everything in this document is one of three things and is marked as such.

| mark | means |
|---|---|
| ✅ | measured on files on this disk, with the count |
| ⚖️ | a reading of what a measured field MEANS, corroborated or not |
| 🔴 | a correction, a trap, or a thing that would destroy something |

**The corpora**, all read and never written:

| corpus | files | what it is |
|---|---|---|
| OWNER | 32 | `New Pack.circuitpack`, `sessions/session_*.circuitsession` |
| NEAR-TEMPLATE | 3 | `session_10`, `session_16`, `session_22`, the three CLAUDE.md names |
| BLANK | 64 | the two `.circuitpack` files inside `purchased/Synth-Patches.com ....zip` |
| GHOSTLY | 4 | `purchased/Ghostly Intro*.circuitsession`, two distinct |
| RANDOM | 8 | 53,248 bytes of `random.Random(7)`, generated here |
| SHUFFLED | 8 | the owner's own sessions with every non-`0xFF` byte permuted |

**SHUFFLED is the control that matters most**, because it holds the byte
histogram fixed and destroys only the arrangement. A test that passes on it was
measuring the histogram.

---

## 2. Inside a `wide` region, and it is not one block

`demo/shell/circuit-session.mjs` partitions the file into 50 regions and stops
there, correctly, because nothing corroborated a subdivision. There is one now.

```
wide region, 1508 bytes
  +   0   16 step records of 28 bytes            448
  + 448   4 bytes                                  4
  + 452   11 blocks of 96 bytes                 1056
                                             ------
                                                1508
```

✅ **THE 28 AND THE 4 WERE FOUND BLIND, BEFORE ANY RECORD WAS READ.** Match rate
of byte `i` against byte `i+L` over the first 448 bytes of all 512 owner wide
regions, for every lag 1 to 128:

```
top lags   56: 90.51%   112: 90.40%   84: 89.21%   28: 88.65%   4: 85.50%
baseline   mean over all 128 lags                               68.03%
lags 1,2,3                                             63.9%  62.9%  63.2%
```

**The top four lags are the four multiples of 28 and the fifth is 4.** Lags that
are not multiples of 4 sit at the 63 per cent floor. Nothing about a record
layout was assumed to get that.

✅ **AND THE 96 WAS FOUND IN A NEARLY EMPTY REGION.** `session_17` wide region 0
has exactly eight non-`0xFF` bytes past +452, at **452, 548, 644, 740, 836, 932,
1028 and 1124**, which is seven consecutive gaps of exactly 96. `452 + 11 x 96`
is 1508, which is the region stride, so the blocks tile the rest of it exactly.
⚠️ Corroborating but weaker, over the whole corpus: the offset of a non-`0xFF`
byte past +452, taken modulo 96, lands on 0 in **186** cases against a mean of
**55.4** for the other 95 residues.

---

## 3. The 28 byte record, which is a step

```
byte  0        mask
byte  1        a per step value
bytes 2, 3     zero
bytes 4..27    six slots of four bytes:  [ note ] [ gate ] [ zero ] [ velocity ]
```

A worked example, `session_0` wide region 0 step 0, in the owner's pack:

```
01 00 00 00 | 37 02 00 29 | 00 00 00 60 | 00 00 00 60 | ...
```

mask `01`, one bit set, one slot filled: note `0x37` is 55 which is G3, gate 2,
velocity `0x29` is 41. The five unused slots read `00 00 00 60`, which is
velocity 96 and nothing else.

And a six note step, `session_1` wide region 9 step 10:

```
3f 00 00 00 | 43 0d 00 5f | 4a 11 00 64 | 47 0f 00 67 | 56 04 00 52 | 45 02 00 5b | 53 03 00 60
```

mask `3f`, six bits, six notes: 67, 74, 71, 86, 69, 83, which is a chord.

### What holds across 8,192 records

| test | OWNER 32 | BLANK 64 | RANDOM 8 | SHUFFLED 8 |
|---|---|---|---|---|
| records read | 8,192 | 16,384 | 2,048 | 2,048 |
| bytes 2 and 3 both zero | **8,192 of 8,192** | 16,384 of 16,384 | **0 of 2,048** | 1,116 of 2,048 |
| mask has bit 6 or 7 set | **0 of 8,192** | 0 of 16,384 | **1,540 of 2,048** | not run |
| popcount(mask) == filled note slots | **99.62%** | 100% | **11.08%** | **18.99%** |
| popcount(mask) <= filled note slots | **100%** | 100% | 96.44% | 83.64% |
| note events yielded | **5,095** | **0** | 8,203 | 1,596 |

🔴 **THE BLANK COLUMN PASSES TWO TESTS WITH ZERO INFORMATION AND THAT IS THE
POINT.** The purchased blanks are zero filled, so "bytes 2 and 3 are zero" and
"popcount equals filled slots" are both trivially true of them, and the row that
separates the two packs is the last one: **5,095 note events against 0**.

✅ **NOTE VALUES.** 5,095 mask confirmed note bytes, range **36 to 132**, of
which **105 are above 127 and all 105 are in `session_28`, wide regions 8 to
15**, which is one whole group of eight. Every other note in the pack is a legal
MIDI note number. Random bytes put 49.29 per cent above 127.

✅ **VELOCITY.** Slot byte 3, 4,224 events in the `0xFF` header group: **0 to 127
with nothing above**. Record byte 1, 2,048 records in the `0x07` group: **1 to
127 with nothing above, and never zero**, including on steps with no notes,
where it sits at 96.

✅ **THE 4 BYTES AT +448.** `0f 00 00 00` in **508 of 512** owner wide regions
and `02 00 00 00` in **4**. ⚖️ **A READING: pattern length minus one**, 16 steps
and 3 steps. What supports it beyond the arithmetic is that the four exceptions
are `session_19` wide 12, 13, 14 and 15, four consecutive regions, and each one
holds **exactly one note at step 0**, being 72, 84, 96 and 108, which are four
octaves of C.

### The 31 records that do not fit, and what they say

✅ popcount(mask) is **never greater** than the number of filled note slots,
8,192 of 8,192. In **31** records it is exactly one less.

⚖️ **A READING: THE MASK IS THE TRUTH AND THE EXTRA NOTE BYTE IS STALE.** The
instrument clears the mask bit when a note is removed and leaves the note byte
where it was. Sixteen of the 31 are the same record repeated in `session_18`
wide regions 8 through 11, reading mask `07` with notes 60, 67, 63 and a fourth
slot holding 68 that no mask bit claims. 60, 63 and 67 are a C minor triad and
68 is the note next to it.
⚠️ **THE OBVIOUS ALTERNATIVE WAS TESTED AND FAILS.** If the clear bit meant a
tie, the unclaimed note would be sounding at the previous step. It is, in
**4 of 31**. That is not a tie.
⚠️ Which means **a decoder must read the mask, not the note bytes.** One that
trusts the bytes emits 31 notes nobody played.

---

## 4. Two encodings of one session, which is the corroboration

🔴 **`purchased/Ghostly Intro.circuitsession` IS BYTE IDENTICAL TO THE OWNER'S
`session_17`**, md5 `c34a296c...`, and `Ghostly Intro (2)` and `(3)` are a second
and different file with the same name. All four carry
`kMDItemWhereFroms: https://components.novationmusic.com/` and came down through
Chrome on 2026-09-21 at 14:39, 14:58, 15:03 and 15:14.
⚠️ **WHAT HAPPENED BETWEEN 14:58 AND 15:03 IS NOT KNOWN FROM THE FILES**, and
guessing is exactly the mistake this project keeps paying for. What the files
say is that Novation Components served the same session in two encodings.

✅ **HEADER BYTE 8 SELECTS THE ENCODING, AND IT IS `0x07` OR `0xFF`, NEVER
ANYTHING ELSE, IN ALL 36 REAL SESSIONS.**

| header byte 8 | velocity lives at | gate unit | owner sessions | tag |
|---|---|---|---|---|
| `0x07` | record byte 1, per step | 0..15 | 8 | DEMO 7, USER 1 |
| `0xFF` | slot byte 3, per note | 1..96 | 24 | USER 21, INIT 3 |

🔴 **AND THE TWO ENCODINGS DECODE TO THE SAME MUSIC.** 31 note events in each
file, and the note number and the velocity agree on **31 of 31**, read out of
different bytes. That is two independent encodings of one piece of music
agreeing, which is the strongest corroboration available without an instrument.

✅ **THE GATE FIELD OBEYS `ff = 6 x (07 + 1)` ON 31 OF 31.** A gate of 13 in the
`0x07` file is 84 in the `0xFF` file, 15 becomes 96, 0 becomes 6.
⚖️ **A READING, and its second source is not the same measurement:** 6 is the
number of bytes per step in the 96 byte blocks, derived separately in section 6.
So `0x07` counts gate in steps minus one and `0xFF` counts it in sixths of a
step, and a full 16 step gate is 96 in both readings.
✅ The ranges agree with that and were measured on the whole pack rather than on
the pair: **0 to 15 across 871 events** in the `0x07` sessions, **1 to 96 across
4,224 events** in the `0xFF` ones.

---

## 5. Sixteen wide regions are two groups of eight, and it is no longer arithmetic

The module's own comment calls `2 x 8` and `4 x 8` *"arithmetic that happens to
land"*. It lands for a reason.

✅ **THE MUSICAL TEST.** Take the median pitch of each wide region that has
notes, partition the 16 regions into two blocks of eight, and measure the spread
of those medians inside a block. Over the 28 sessions with notes in at least
four regions:

```
partition at index 8 (aligned)          8.50 semitones
the seven rotated partitions       13.66 .. 17.55 semitones
200 random partitions into 8 and 8     18.19 mean, 14.23 MINIMUM
```

**The aligned split beats all seven rotations and all 200 random partitions.**
Regions 0 to 7 and regions 8 to 15 are playing in different registers, session
after session.

✅ **AND THE 105 OUT OF RANGE NOTES RESPECT THE SAME BOUNDARY.** All of them are
in `session_28` regions 8 to 15 and none in 0 to 7. A per group property is
evidence of a group.

✅ **THIRTY TWO NARROW REGIONS ARE FOUR GROUPS OF EIGHT.** Same shape of test on
the used length, over the 9 sessions where it varies:

```
partition into four blocks of 8 (aligned)     148.8
the seven rotated partitions            250.2 .. 296.9
200 random partitions into four 8s      360.2 mean, 290.8 MINIMUM
```

⚖️ **SO THE GROUPING IS MEASURED AND THE NAMES ARE STILL NOT.** What is measured
is two groups of eight regions carrying polyphonic pitched notes, and four
groups of eight carrying something else. **Nothing here says the word synth, and
nothing here should.** The Circuit having two pitched parts and four drum parts
is a fact about the instrument that makes the reading attractive and is not a
measurement of this file. Section 9 settles it in one press.

---

## 6. Inside a `narrow` region

```
narrow region, 720 bytes
  +   0   16 bytes                                16
  +  16   16 bytes, one per step                  16
  +  32   7 blocks of 96 bytes                   672
  + 704   16 bytes                                16
                                              ------
                                                 720
```

✅ **BYTES 16 TO 31 ARE ONE VALUE PER STEP AND THEY ARE SEVEN BIT.** 16,384
bytes across the owner's 32 sessions, **1,888 non zero, none above 127**, range
8 to 127.
⚖️ **A READING: per step velocity.** In `session_20` narrow region 24 all
sixteen are filled and read `114, 96, 105, 96, 113, 110, 105, 96, 109, 96, 106,
111, 96, 96, 96, 96`, where 96 is the value the wide records also use as their
resting velocity.

✅ **AND THE 96 BYTE BLOCK IS SIX BYTES PER STEP, WHICH WAS MEASURED, NOT
DIVIDED.** `session_17` narrow region 31 has its filled step values at steps
**0, 3, 6, 10 and 13**, and the first 96 byte block holds the value 111 at
offsets **+0, +18, +36, +60 and +78**. Those are **6 x 0, 6 x 3, 6 x 6, 6 x 10
and 6 x 13**. Five of five.

✅ **EVERY LANE BYTE IN THE PACK IS SEVEN BIT.** 5,449 non erased bytes in the
wide blocks and 4,096 in the narrow ones, **128 distinct values, 0 to 127, not
one above**. Random bytes put 49.6 per cent above 127.
⚖️ **A READING: automation.** Two shapes appear. A single value at offset 0 of a
block and erasure after it, which is a knob that was never moved. And a run that
rises and falls one step at a time, for instance `01 08 19 27 3a 4b 53 60 6e 7c
7f` then later `7e 7d 7b 76 70 66 5c`, which is a knob that was.
✅ Which blocks are ever written: **0 to 9 of the 11** in wide regions, never
block 10. **0 to 6 of the 7** in narrow regions.

🔴 **BYTES 0 TO 15 OF A NARROW REGION ARE OFFERED AS BYTES AND NOTHING ELSE.**
16,384 read, **434 non zero, none above 127**, range 1 to 62, spread over all
sixteen indices with the peaks at index 0 and index 8. It behaves like one value
per step. What the value is, is not known.

🔴 **AND SO ARE BYTES 704 TO 719.** Non erased in 129 regions, 76 distinct
patterns, values up to `0x28`, with `0xFF` between them rather than zero, for
instance `09 ff 0f 09 ff ff 0f ff 09 ff 0f 09 ff ff 0f`. Sixteen bytes, which is
one per step. Not decoded.

---

## 7. The strides that were tried, and what each one answered

The brief asks for the ones that found nothing, so here is the whole sweep. The
score is the share of records where popcount of the first byte equals the number
of filled four byte slots, and the yield is the note events that fall out.

| stride | records | informative | consistent | note events |
|---|---|---|---|---|
| 4 | 57,344 | 7,262 | 87.34% | 23,498 |
| 8 | 28,672 | 4,404 | 86.98% | 12,163 |
| 12 | 18,944 | 3,744 | 83.65% | 8,111 |
| 14 | 16,384 | 2,138 | 96.50% | 5,095 |
| 16 | 14,336 | 3,154 | 82.25% | 6,197 |
| 20 | 11,264 | 2,974 | 78.54% | 4,753 |
| 24 | 9,216 | 2,604 | 78.84% | 3,964 |
| 26 | 8,704 | 1,481 | 86.70% | 1,405 |
| 27 | 8,192 | 3,026 | 67.03% | 4,063 |
| **28** | **8,192** | **2,138** | **99.62%** | **5,095** |
| 29 | 7,680 | 2,653 | 69.82% | 3,852 |
| 30 | 7,168 | 1,015 | 89.90% | 2,102 |
| 32 | 7,168 | 2,280 | 74.82% | 3,013 |
| 36 | 6,144 | 1,935 | 74.40% | 2,840 |
| 40 | 5,632 | 1,760 | 76.40% | 2,470 |
| 48 | 4,608 | 1,525 | 76.84% | 2,268 |
| 56 | 4,096 | 1,454 | 99.71% | 3,739 |
| 64 | 3,584 | 1,215 | 73.35% | 1,500 |
| 96 | 2,048 | 633 | 81.30% | 1,069 |
| 112 | 2,048 | 758 | 99.90% | 2,031 |

🔴 **AND THE SCORE ON ITS OWN IS A LIAR, WHICH IS WHY THE YIELD COLUMN IS
THERE.** Stride 56, 112, 224 and 448 all beat 28 on consistency, and all four
are multiples of 28 that read one record in two, four, eight or sixteen and
throw the rest away. **They score better by finding less.** The origin sweep is
the same trap with the volume turned up:

```
stride 28, origin  0   2,138 informative   99.62%   5,095 note events
stride 28, origin  2       0 informative  100.00%       0 note events
stride 28, origin  6       0 informative  100.00%       0 note events
stride 28, origin 14       0 informative  100.00%       0 note events
stride 28, origin 26       0 informative  100.00%       0 note events
stride 28, origin  3   5,114 informative   33.41%       0 note events
```

**Four origins score a perfect 100 per cent by landing on bytes that are always
zero.** A test whose best score is achieved by reading nothing is not a test,
and this is the shape the project has already written up twice: *a statistic
that is constant by construction over your subject is not a weak measurement, it
is a blind one*. Stride 28 at origin 0 is the smallest stride that is both
maximally consistent and yields every event.

**Periods that found nothing**, checked and reported because they were the
obvious guesses: **16**, the step count, scores 82.25 per cent and is beaten by
several neighbours. **32** and **64**, the tidy powers, score 74.82 and 73.35.
**27** and **29**, one either side of the answer, score 67.03 and 69.82, which
is what a wrong stride looks like next to a right one.

---

## 8. What comes out, and what it agrees with

Decoded across the owner's 32 sessions, reading the mask as truth:

```
5,095 note events        1,888 filled drum steps        29 sessions with notes
```

🔴 **AND IT AGREES WITH THE `29 OF 32` IN CLAUDE.md, FROM A DIFFERENT
MEASUREMENT.** That number was reached by measuring distance in bytes from a
stock template. This one counts note events and never looks at a template. They
name **the same three files**: `session_10`, `session_16` and `session_22`
decode to **0 notes and 0 filled drum steps**, and all 29 others decode to
between **9 and 700** notes. Three sources now say the same thing and the third
one is musical.

| file | index.json name | byte 8 | notes | drum steps | patterns with notes |
|---|---|---|---|---|---|
| session_0 | User Session | ff | 72 | 14 | 12 |
| session_1 | User Session | ff | 246 | 12 | 8 |
| session_2 | User Session | ff | 176 | 43 | 12 |
| session_3 | Skyscraper | 07 | 24 | 224 | 14 |
| session_4 | Insert Point | 07 | 297 | 216 | 16 |
| session_5 | Chunk | 07 | 192 | 262 | 16 |
| session_6 | User Session | ff | 351 | 22 | 16 |
| session_7 | User Session | ff | 106 | 22 | 8 |
| session_8 | User Session | ff | 48 | 15 | 4 |
| session_9 | Starting Point | ff | 124 | 8 | 8 |
| **session_10** | **Initial Session** | ff | **0** | **0** | **0** |
| session_11 | Starting Point | ff | 235 | 15 | 8 |
| session_12 | Starting Point | ff | 155 | 32 | 8 |
| session_13 | Starting Point | ff | 305 | 11 | 12 |
| session_14 | Starting Point | ff | 549 | 18 | 16 |
| session_15 | Starting Point | ff | 193 | 31 | 12 |
| **session_16** | **Initial Session** | ff | **0** | **0** | **0** |
| session_17 | Ghostly Intro | 07 | 31 | 201 | 8 |
| session_18 | Dub Circulation | 07 | 96 | 114 | 11 |
| session_19 | Werk | 07 | 54 | 129 | 16 |
| session_20 | Off Timed | 07 | 106 | 248 | 16 |
| session_21 | Back To Earth | 07 | 71 | 126 | 16 |
| **session_22** | **Initial Session** | ff | **0** | **0** | **0** |
| session_23 | User Session | ff | 265 | 10 | 16 |
| session_24 | User Session | ff | 289 | 9 | 16 |
| session_25 | User Session | ff | 45 | 32 | 5 |
| session_26 | User Session | ff | 63 | 21 | 8 |
| session_27 | User Session | ff | 90 | 18 | 7 |
| session_28 | Starting Point | ff | 700 | 14 | 16 |
| session_29 | User Session | ff | 170 | 8 | 8 |
| session_30 | Starting Point | ff | 33 | 6 | 6 |
| session_31 | User Session | ff | 9 | 7 | 3 |

⚠️ **AND A SESSION WITH FEW NOTES IS NOT A SESSION WITH LITTLE WORK.**
`session_3` decodes to 24 notes and **224 filled drum steps**. Counting one
column would have condemned it, which is the same mistake as counting the name.

**What it looks like when printed.** `session_0` wide region 0:

```
step  0   G3 (55)  velocity 41  gate 2
step  1   G3 (55)  velocity 80  gate 8
step  3   A3 (57)  velocity 85  gate 5
step  5   G3 (55)  velocity 63  gate 4   and   A3 (57)  velocity 75  gate 5
step  6   E4 (64)  velocity 89  gate 95
```

and its wide region 8, which is where the other group of eight lives:

```
step  0   G4 (67) v72 g15   C5 (72) v93 g32   C4 (60) v84 g96   E5 (76) v85 g28
step  4   G4 (67) v76 g9
step  6   E5 (76) v83 g96   G4 (67) v64 g96   C5 (72) v82 g96   G5 (79) v83 g96
```

A bass line under chords. ⚖️ Calling it that is a reading. That the numbers are
40 to 108, sit in one register per group, and land on the pitch classes of one
key is measured: the pitch class histogram over all 5,095 notes puts **82.8 per
cent on seven of the twelve classes**, with a pitch class entropy of **3.35 bits
against a flat 3.585**.
⚠️ **THAT ONE IS A WEAK TEST AND IS REPORTED AS SUCH.** Random bytes score 60.3
per cent on their best seven and 3.58 bits, which is not far enough away, and
the SHUFFLED control scores 79.6 per cent and **3.12 bits, better than the real
thing**, because shuffling keeps the histogram. **The pitch class argument
proves nothing on its own.** The mask consistency and the yield do.

### The instrument is not blind

Breaking the file on purpose, which is the half that separates a decoder from a
decoration:

```
baseline, session_0                                     72 events, first note 55
+7 on the note byte at file offset 80                   72 events, first note 62
the mask byte of wide 0 step 0 zeroed                   71 events
all 16 mask bytes of wide region 0 zeroed               66 events
the whole 448 byte step grid of wide region 0 zeroed    66 events
```

Each sabotage moves exactly what it should and nothing else, and the last two
agree, which says the mask accounts for every event in that region. And the
other direction:

```
a purchased blank, untouched                             0 events
one hand written 28 byte record planted in it            2 events, notes 60 and 64
                                                         velocities 100 and 90
```

It reads back what was written.

---

## 9. What a person at the Circuit would have to do, in five minutes

🔴 **NOTHING BELOW SENDS ANYTHING TO THE INSTRUMENT.** Every step is an export.
The Circuit has no factory reset, `New Pack.circuitpack` is the only backup, and
the three operations that replace its contents are `Send to Circuit`, the
Factory Pack, and a `Replace Patch` SysEx. None of them appears here.

⚠️ **AND THE FIRST STEP IS A BACKUP, BECAUSE READING IS FREE.** The pack in the
repository is dated 2026-09-20 and anything played since then exists nowhere
else.

1. **Export a fresh pack from Novation Components** and keep it. Name it with
   today's date. This is the control every later diff is taken against.
2. **Pick an empty session slot.** One of `session_10`, `session_16` or
   `session_22` is already empty, measured above, so nothing is at risk. Note
   which slot number it is.
3. **Export that empty session on its own** from Components. Call it `A`.
4. **Press ONE step on synth 1, pattern 1, step 1, with one note.** One note,
   one step, nothing else. Save the session.
5. **Export it again.** Call it `B`.
6. **Change ONLY the velocity of that step** and save and export. Call it `C`.
7. **Change ONLY the gate length of that step** and save and export. Call it `D`.
8. **Add a second note to the same step** and save and export. Call it `E`.
9. **Press one step on drum 1, pattern 1** and save and export. Call it `F`.

**What each diff settles, and it is one field per file:**

| diff | settles |
|---|---|
| A to B | which of the 16 wide regions is synth 1 pattern 1, and whether the note is where section 3 says |
| B to C | whether velocity is slot byte 3 or record byte 1 on THIS firmware |
| C to D | the gate unit, which section 4 reads as steps or sixths of a step |
| D to E | that the mask is a note presence mask, by watching one bit appear |
| B to F | which of the 32 narrow regions is drum 1 pattern 1, and whether bytes 16 to 31 are its velocities |

⚠️ **AND THE ONE THAT SETTLES THE NAMES IS STEP 4 ALONE.** If the note lands in
wide region 0 the two groups of eight are two pitched parts with eight patterns
each and the module can say so. If it lands anywhere else, the reading in
section 5 is wrong and this document is the thing that has to change.

🔌 **ALSO WORTH ASKING WHILE SOMEBODY IS AT THE INSTRUMENT, AND IT IS FREE:** is
the **Save button lit blue**. `positron-hardware` records that Circuit ships with
Save disabled and that nobody here has looked. A session that will not save is a
session that cannot be exported, and every step above assumes it saves.

---

## 10. What this does NOT say

- 🔴 **NO NAME IN THIS DOCUMENT IS CORROBORATED BY AN INSTRUMENT.** `wide` and
  `narrow` stay the names, for the reason the module already gives.
- 🔴 **THE FIRMWARE ON THIS DESK WAS NOT CONSULTED.** Everything here is read
  out of files exported by Novation Components on 2026-09-20 and 2026-09-21. If
  the instrument has been updated since, the `0x07` and `0xFF` encodings may not
  be the only two.
- ⚠️ **105 NOTE BYTES ARE ABOVE THE MIDI RANGE AND THAT IS NOT EXPLAINED.** All
  of them are in one group of eight regions of one session. ⚖️ An octave shift
  applied at save time would produce it, and so would several other things.
- ⚠️ **NOTHING IN A `wide` REGION SAYS WHICH PATCH PLAYS IT.** The two 340 byte
  patch payloads are in the tail region and the link between them and the two
  groups of eight is a reading, not a pointer that was followed.
- ⚠️ **NARROW BYTES 0 TO 15 AND 704 TO 719 ARE NOT DECODED**, and neither is most
  of the 76 byte header or the 848 used bytes of the tail beyond the two patches.
- ⚠️ **NOTHING HERE HAS BEEN WRITTEN BACK.** A decoder that reads is not a writer,
  and the rule from `research/circuit-session-format-2026-09-21.md` §3 stands:
  a writer that emits only the fields it understands destroys everything it does
  not. If one is ever built it carries the unknown bytes raw, per region.

## Sources

- Measured here, 2026-09-21, in Python, over 108 session files: the owner's 32,
  64 purchased blanks, 4 loose `Ghostly Intro` exports and 8 generated controls.
- `demo/shell/circuit-session.mjs` for the 50 region grid, which nothing here
  contradicts and everything here sits inside.
- `research/circuit-session-format-2026-09-21.md` for the container, the entropy
  and the prior art.
- `CLAUDE.md` for `29 of 32`, which section 8 reaches again by another road.
