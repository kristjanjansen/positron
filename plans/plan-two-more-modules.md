# plan-two-more-modules: the next two DSP cores after Plaits, one of them an effect

**Written 2026-09-22.**

🔴 **WHAT HAPPENED NEXT, THE SAME DAY: `/plai/` BECAME `/muta/` AND THE
WARPS PROPOSAL IN §3 WAS BUILT.** Every `/plai/` below reads as the page this
document was written against, and that page is at `/muta/` now with Warps
chained after the oscillator inside it, green at 38/38. So §3 is a description
of a thing that exists rather than a proposal, and §4 is still a proposal.
⚠️ **THE ONE RECOMMENDATION THAT WAS FOLLOWED IS THE 48 kHz ONE**, §3.5: the
page runs at 48,000 and prints the vocoder's octave error in a readout cell
rather than running the context at 96 kHz. MEASURED on the page afterwards:
20 bands at 43.7 to 3520 Hz, reported as -1.00 octaves.

🔴 **NOTHING IN THIS DOCUMENT WAS BUILT.** No compiler ran, no container
started, no `emsdk` was fetched, no page was made and no sound was produced.
Every size, line count, constant and file path below was read out of source that
is already on this disk or out of an artefact that is already in this working
tree. Every microsecond figure for the two proposals is an ESTIMATE derived from
Plaits, and §7 says exactly what would have to be compiled to turn each one into
a fact.

Legend, used on every claim:

| mark | meaning |
|---|---|
| 📄 | DOCUMENTED. Read in a file, with the path and the line. |
| 📏 | MEASURED. A number produced by running something. Says what, and when. |
| ⚖️ | INFERRED. A conclusion drawn here, not stated by any source. |
| ⚠️ | A trap, or a place where the obvious reading is wrong. |

📏 **WHERE THE SOURCE NUMBERS COME FROM.** `tmp/plai-src/euro` already holds the
whole Mutable Instruments eurorack tree, checked out at the commit
`demo/muta/build/build.sh` pins (`9739c0227708fab7a28b4efef7b27a9a1bc098d1`),
because the Plaits build put it there. Everything in §2 was measured by reading
those files today with `wc`, `grep` and a short Python script over
`resources.cc`. **Nothing was downloaded and no repository was cloned for this
document.**

---

## 1. Answer first

**Two modules, both out of the family whose source is already on this disk,
both at the commit already pinned, both MIT by the same clause that put Plaits
in scope.**

| | the effect | the something else |
|---|---|---|
| module | **Warps** | **Marbles** |
| proposed slug | **`/meet/`** | **`/seed/`** |
| what it is | two signals go in, a knob picks how they are combined, one comes out | a machine that decides notes, and makes no sound at all |
| licence clause | `warps/Makefile:29` `FAMILY = f4xx` | `marbles/Makefile:29` `FAMILY = f4xx` |
| 📏 lookup tables | **52,896 bytes** | **72,744 bytes** |
| 📏 DSP source | **73,540 bytes in 14 files** | **110,039 bytes in 25 files** |
| ⚖️ artefact estimate | **80 to 115 KB** | **85 to 110 KB** |
| ⚠️ the Plaits block-size trap | **not present**, checked | **not present**, checked |
| ⚠️ a constant where a rate belongs | in the tables, always live | in `ramp_extractor.cc`, dormant unless an external clock is added |
| the hard part | its tables were computed at 96 kHz and the page runs at 48 | its firmware glue is 173 lines that a shim has to re-say |
| where the sound comes from | its own internal carrier oscillator, plus `/plai/` as the second input | it makes none, it plays `/plai/` |

🔴 **AND THE SINGLE FACT THAT MAKES BOTH OF THESE CHEAP: THEY ARE ALREADY
PINNED.** `build.sh` fetches one repository at one commit, and **that commit
contains Warps and Marbles as well as Plaits.** A second module is a different
`SOURCES` list and a different `EXPORTS` string against the same two shas. There
is no new upstream, no new clone, no new licence to read from scratch, and no
new provenance mechanism to invent. §6 prices the rest.

⚠️ **AND THE HONEST DEPENDENCY, MEASURED WHEN THIS WAS WRITTEN: `/plai/` WAS
NOT COMMITTED.** `git status --porcelain demo/plai` answered `?? demo/plai/`.
The artefact was real (199,678 bytes on this disk) and it was not in git, not on
`positron.studio`, and another agent was inside that directory at the time.
**Both proposals below lean on it for their sound**, so both were blocked behind
it landing. ✅ **IT LANDED THE SAME DAY AS `demo/muta/`**, with the effect of
§3 already chained into it.

---

## 2. What was measured today, in one table

📏 Read from `tmp/plai-src/euro` on 2026-09-22. `F_CPU` and `FAMILY` come
straight out of each module's `Makefile` lines 27 and 29. "Tables" is the total
binary size of every `const <type> name[] = { … }` in that module's
`resources.cc`, counted by type and multiplied by its width. "DSP source" counts
only the files a shim would compile, excluding drivers, bootloader, `ui.cc`,
`settings.cc` and `resources.cc`.

| module | `FAMILY` | `F_CPU` | `resources.cc` text | 📏 tables, binary | DSP source | DSP files |
|---|---|---|---|---|---|---|
| **plaits** | f37x | 72 MHz | 494,273 | **114,106** | 412,291 | 83 |
| **warps** | f4xx | 168 MHz | 248,009 | **52,896** | 73,540 | 14 |
| **marbles** | f4xx | 168 MHz | 340,785 | **72,744** | 110,039 | 25 |
| clouds | f4xx | 168 MHz | 213,152 | 45,622 | 130,803 | 25 |
| rings | f4xx | 168 MHz | 113,303 | 24,084 | | |
| elements | f4xx | 168 MHz | 1,599,351 | **372,594** | | |
| stages | f37x | 72 MHz | 110,656 | 23,556 | 46,447 | 6 |
| tides2 | f37x | 72 MHz | 168,078 | | | |
| braids | f10x | 72 MHz | 388,743 | | | |

🔴 **THE YARDSTICK THAT MAKES THE ESTIMATES POSSIBLE.** 📏 `plai.wasm` is
**199,678 bytes** and its lookup tables are **114,106** of them, which is
**57.1 per cent**. So the compiled CODE of sixteen Plaits engines, its physical
modelling, its four speech synthesisers and three stmlib files is **85,572
bytes**, out of 412,291 bytes of source. ⚖️ **That gives a crude ratio of 0.208
compiled bytes per source byte**, and it is crude on purpose: every one of those
files carries a 23-line MIT header, so a large slice of the source bytes is
comment. Every artefact estimate below is `tables + 0.208 × source`, stated with
its error bars and marked INFERRED.

📏 **AND THE LICENCE CLAUSE, READ RATHER THAN REMEMBERED.** The `README.md` in
that tree says, in full:

> Code (AVR projects): GPL3.0.
>
> Code (STM32F projects): MIT license.

📄 `warps/Makefile:29` is `FAMILY = f4xx` and `marbles/Makefile:29` is
`FAMILY = f4xx`. Both are STM32F4 parts, so both fall on the MIT side of that
sentence, by the same reading that `build.sh` already applies to
`plaits/Makefile:29` `FAMILY = f37x`. 📄 The same README also asks that a
derivative not carry the Mutable Instruments name **and recommends not keeping
the module's name either**, which is why `/plai/` is not called `/plaits/` and
why neither slug below is `warps` or `marbles`.

---

## 3. The effect: Warps, at `/meet/`

### 3.1 Which module, which repository, which licence

📄 `tmp/plai-src/euro/warps/`, in `github.com/VCVRack/pichenettes-eurorack` at
the commit `build.sh` already pins. 📄 `warps/Makefile:29` reads
`FAMILY = f4xx`, which is the line that puts it under the MIT half of the
README's grant. 📄 `warps/Makefile:27` reads `F_CPU = 168000000L`.

⚠️ **THE PANEL IS NOT TAKEN AND CANNOT BE.** Same as Plaits. The artwork is
under a separate grant to the Rack adapter's repository and this project draws
its own faces anyway.

### 3.2 What it demonstrates that `/plai/` does not

🔴 **IT HAS TWO AUDIO INPUTS, AND NO PAGE ON THIS SITE PROCESSES TWO SIGNALS
INTO ONE.** That is the whole argument and it is worth stating plainly. `/plai/`
generates. Every other sound page here plays a stream, plays a file, or plays a
sample. **Warps takes a carrier and a modulator and combines them**, and every
one of its six cross-modulation algorithms is a different answer to the question
of what "combine" means.

📄 `warps/dsp/modulator.h:117-125`, the whole list:

```cpp
enum XmodAlgorithm {
  ALGORITHM_XFADE,
  ALGORITHM_FOLD,
  ALGORITHM_ANALOG_RING_MODULATION,
  ALGORITHM_DIGITAL_RING_MODULATION,
  ALGORITHM_XOR,
  ALGORITHM_COMPARATOR,
  ALGORITHM_NOP,
  ALGORITHM_LAST
};
```

📄 And past those six, one knob position further, it stops being a waveshaper
and becomes a **20-band vocoder**: `warps/dsp/filter_bank.h:42` is
`const int32_t kNumBands = 20`, and `warps/dsp/modulator.cc:288` picks between
the two paths on `vocoder_amount < 0.5f`.

⚖️ **SO ONE MODULE IS SIX WAVESHAPERS AND A VOCODER, AND THE KNOB BETWEEN THEM
CROSSFADES.** `modulator.cc:302-311` interpolates between two adjacent
algorithms on the fractional part of the knob, which means the control surface is
continuous rather than a list of modes. That is a different kind of page from
`/plai/`, whose sixteen engines are a stepped choice.

🔴 **AND THE SECOND THING IT DEMONSTRATES IS THE ONE THIS PIPELINE HAS NOT SHOWN
YET: TWO UNEDITED FIRMWARES IN ONE GRAPH.** `/plai/` proves one firmware
compiles and runs. Chaining `plai.wasm` into `meet.wasm` inside a single
AudioWorklet proves the pipeline is a **pipeline** rather than a one-off, and it
does it with zero bytes from anybody's server.

### 3.3 Is the DSP separable, and how much host code

✅ **IT IS THE MOST SEPARABLE THING IN THE FAMILY.** 📏 Five `.cc` files carry
the whole of it: `modulator.cc`, `oscillator.cc`, `vocoder.cc`,
`filter_bank.cc`, `resources.cc`. Everything else under `warps/` is drivers, a
bootloader, `ui.cc`, `settings.cc` and `cv_scaler.cc`, none of which a browser
needs.

📄 The contact surface, read out of `warps/dsp/modulator.h`:

```cpp
void Init(float sample_rate);
void Process(ShortFrame* input, ShortFrame* output, size_t size);
Parameters* mutable_parameters();
```

⚖️ **THAT IS SMALLER THAN PLAITS' SURFACE, NOT LARGER.** `plaits::Voice::Render`
takes a `Patch`, a `Modulations` and an output block; `Modulator::Process` takes
interleaved 16-bit in and interleaved 16-bit out, and everything else is fields
on one `Parameters` struct. There is no per-voice state to manage, no allocator
to hand it, no note, no gate and no stealing rule. **The polyphony machinery that
is most of `plai_shim.cc` simply does not exist here.**

📏 **AGAINST THE BASELINE, MEASURED TODAY:** `demo/muta/build/plai_shim.cc` is
**582 lines, of which 306 are code** and the rest is comment. (The brief quotes
216; that is a count from an earlier state of the file. The order of magnitude is
what matters and I estimate against 306.)

⚖️ **ESTIMATE FOR `meet_shim.cc`: 150 to 220 code lines.** It is an ESTIMATE from
reading the headers, not a measurement. What it has to do:

| the shim must | lines, estimated |
|---|---|
| hold one `Modulator`, `Init` it, expose a rate check | 20 |
| map parameter ids to `Parameters` fields and back | 50 |
| convert float in to `ShortFrame` and `ShortFrame` out to float | 25 |
| chop 128 frames into blocks of at most 96 | 15 |
| report which algorithm is sounding, and the counters a readout needs | 40 |
| the build stamp and source digest exports, copied from `plai_shim.cc` | 15 |

⚠️ **PLUS 40 TO 60 LINES IF THE RATE IS SOLVED BY OVERSAMPLING**, see §3.5.

### 3.4 The trap check, which the brief asked for by name

✅ **WARPS DOES NOT HAVE THE PLAITS TRAP. I LOOKED FOR IT AND IT IS NOT THERE.**

📄 The Plaits defect, restated: `plaits/dsp/dsp.h` sets `kBlockSize = 12` and
`voice.cc` uses that CONSTANT rather than its `size` argument in three places
that set envelope rates, so any block length but 12 changes the instrument.

📏 **MEASURED: every occurrence of `kMaxBlockSize` in `warps/dsp/` is an array
dimension.** The complete list, from `warps/dsp/modulator.h:225-227`:

```cpp
float internal_modulation_[kMaxBlockSize];
float buffer_[3][kMaxBlockSize];
float src_buffer_[2][kMaxBlockSize * kOversampling];
```

📄 And every loop in `modulator.cc`, `vocoder.cc` and `filter_bank.cc` uses
`size`. The two places that look like constants are `modulator.cc:311` and
`:313`, both `size * kOversampling`, which is **derived from the argument** and
is exactly right. 📄 `warps/dsp/modulator.h:46` is
`const size_t kMaxBlockSize = 96`, so 96 is a **ceiling, not a requirement**, and
📄 `warps/warps.cc:100` calls `codec.Start(60, &FillBuffer)`, so the hardware
itself runs 60-frame blocks against a 96-frame ceiling. ⚖️ **A block size the
firmware already varies is a block size the DSP was written to respect.**

⚠️ **WHAT THAT COSTS THE SHIM IS ONE LINE OF ARITHMETIC.** An AudioWorklet
quantum is 128 and the ceiling is 96, so a render is two calls of 64. There is
no carry, no `block_pos`, and no envelope arithmetic to keep in step, which is
the whole of what makes `plai_shim.cc`'s `plai_render` complicated.

### 3.5 🔴 The real trap, which is the sample rate, and it is worse than Plaits'

🔴 **WARPS' LOOKUP TABLES WERE COMPUTED AT 96 kHz AND THE GENERATOR SCRIPT SAYS
SO IN A CONSTANT.** 📄 `warps/resources/lookup_tables.py:103` and
`warps/resources/filter_bank.py:63` both read `SAMPLE_RATE = 96000`, and
`filter_bank.py:67-69` reads:

```python
sample_rates = [SAMPLE_RATE / 12] * 13
sample_rates += [SAMPLE_RATE / 3] * 6
sample_rates += [SAMPLE_RATE] * 1
```

📄 `warps/warps.cc:91` is `modulator.Init(96000.0f)` and `:97` is
`codec.Init(!version.revised(), 96000)`.

⚠️ **AND THE SHAPE OF THE PROBLEM IS NOT WHAT IT LOOKS LIKE.** 📄
`Modulator::Init` TAKES the rate (`warps/dsp/modulator.cc:43`) and passes it down
to the oscillators and the vocoder, so calling `Init(48000.0f)` compiles, runs,
and gets the oscillators and the envelope follower time constants right. 📄
`filter_bank.cc` then computes `b.sample_rate = sample_rate / b.decimation_factor`
correctly. **But the biquad coefficients themselves come out of the `fb_*` tables
and those are fixed numbers designed at 8000, 32000 and 96000 Hz** (the table
names carry the rate: `fb__87_8000`, `fb_110_8000`, `fb_139_8000`).

⚖️ **SO AT 48 kHz THE VOCODER'S TWENTY BANDS SIT AN OCTAVE BELOW WHERE THE
HARDWARE PUTS THEM**, roughly 44 Hz to 4 kHz instead of 88 Hz to 8 kHz.
⚠️ **AND THE SIX CROSS-MODULATION ALGORITHMS ARE UNAFFECTED**, because they are
memoryless waveshapers and the 6× polyphase converter around them is a fixed
interpolation filter with no rate in it. **Half the knob is exactly right at
48 kHz and half of it is an octave low.**

✅ **AND THE TABLES ARE THE ONLY PLACE THIS BITES, WHICH WAS CHECKED RATHER THAN
ASSUMED.** 📏 `grep -rn "96000\|48000\|32000\|44100" warps/dsp/` returns
**exactly one line in the whole DSP**: `warps/dsp/oscillator.h:41`,
`const float kInternalOscillatorSampleRate = 96000.0f`. 📏 That symbol is
referenced **nowhere**, and `Oscillator::Init` computes
`one_hertz_ = 1.0f / sample_rate` from its argument
(`warps/dsp/oscillator.cc:42-43`). ⚠️ **It is a dead constant that names the
hardware rate, which is a thing to notice rather than a thing to fix**: it reads
like the rate the module runs at, and it is not.

**Three ways out, and the recommendation is not the tidy one.**

| option | what it costs | what it breaks |
|---|---|---|
| **1. run at 48 kHz and print the error** | nothing | the vocoder half is an octave low, and the page says so in a readout cell |
| **2. oversample 2× in the shim** | 40 to 60 lines of host code, and double the Warps CPU | nothing about the sound. The carrier from `/plai/` also has to be upsampled, so it is two converters, not one |
| **3. run the AudioContext at 96 kHz** | nothing | `/plai/` refuses. `plai_init` returns 0 at any rate but 48000, by design, so the carrier cannot be Plaits |

🔴 **RECOMMENDATION: SHIP OPTION 1 AND PRINT THE ERROR, THEN DO OPTION 2.** A
page that reports its own defect in a readout cell is worth more than a page that
buries it behind three sample rate converters, and this project has an entire
lesson about the opposite (LESSONS §81: a confident sentence that outlived its
facts). ⚠️ **Option 3 is a trap that looks like the clean answer**: it is the one
that silently makes the two firmwares incompatible.

### 3.6 🔴 Where does the sound come from

**The brief is right that this is the question `/plai/` did not have to answer,
and Warps has an unusually good answer to it.**

📄 **HALF OF IT COMES FROM INSIDE THE MODULE.** `warps/dsp/modulator.cc:225-240`:
when `parameters_.carrier_shape` is non-zero, Warps **renders its own carrier**
from an internal oscillator, and the left input becomes a phase-modulation input
instead. The shapes are sine, triangle and saw on the cross-modulation side, and
saw, pulse and noise on the vocoder side. 📄
`warps/dsp/oscillator.h:41` gives it its own rate constant,
`kInternalOscillatorSampleRate = 96000.0f`, and 📄 `modulator.cc:54-56` hands it
the rate passed to `Init`, so it is correct at whatever rate the page runs.

**So the page needs exactly ONE external signal, not two.**

🔴 **AND THAT ONE IS `/plai/`, FOR A REASON THAT WAS MEASURED RATHER THAN
PREFERRED.** 📏 Checked today: **there is not one audio file committed to this
repository.** `find demo -name "*.wav" -o -name "*.mp3" -o -name "*.ogg" -o
-name "*.flac"` returns nothing. So the four candidates the brief names come out
like this:

| candidate | verdict |
|---|---|
| **`/plai/` feeding it** | ✅ **THIS ONE.** 199,678 bytes already in the tree, zero wasm imports, generates from nothing, opens nothing, costs nobody anything |
| this site's `/pack/` samples | 🔴 **THERE ARE NONE TO SHIP.** 📏 `/pack/` reads a file the VISITOR drops (`demo/pack/index.html:128` imports `createDrop`). The 64 samples belong to `tmp/personal/New Pack.circuitpack`, which is gitignored and is somebody's only copy. A page that needs one of those works on one desk |
| a bundled sample | ⚠️ **POSSIBLE AND WORSE.** It adds the first audio file this repository has ever carried, it is bytes on every visit, and it has its own licence question. It also teaches nothing: a sample is a sample |
| a microphone | 🔴 **REFUSED.** A permission prompt on a visitor's machine, on a page whose whole point is that it opens nothing. `getUserMedia` on load is the shape CLAUDE.md names as the worst there is |

⚠️ **AND THE SECOND INPUT, IF THE PAGE WANTS ONE, IS A SECOND `/plai/` VOICE.**
`plai.wasm` already runs eight voices against one `Patch`. Two instances at
different engines, one into the carrier and one into the modulator, is the
demonstration in its strongest form and costs one more wasm instantiation.

### 3.7 The artefact and the CPU

⚖️ **ARTEFACT: 80 to 115 KB, ESTIMATED.** 📏 Tables are **52,896 bytes**,
measured. Code is the uncertain half: 73,540 source bytes at the Plaits ratio of
0.208 gives about **15,300 bytes**, and that number is **an underestimate I do
not trust**, because `modulator.h` is heavily templated. 📄 `xmod_table_` is six
`XmodFn` entries, each a distinct instantiation of a pairwise-crossfading
`Process<algorithm_1, algorithm_2>` with `Xmod<a>` and `Xmod<b>` inlined, and
`SampleRateConverter<SRC_UP, 6, 48>` is a fully unrolled 48-tap polyphase filter
instantiated three times. **Template instantiation inflates code in a way a
source-byte ratio cannot see.** So the range is wide on purpose: the floor is
52,896 + 15,000 and the ceiling assumes the templates cost four times the naive
estimate.

⚖️ **CPU: BOUNDED FROM ABOVE BY THE CHIP, WHICH IS A BETTER ARGUMENT THAN MY
ARITHMETIC.** 📄 Plaits runs on a 72 MHz part (`plaits/Makefile:27`
`F_CPU = 72000000L`) and Warps on a 168 MHz one
(`warps/Makefile:27 F_CPU = 168000000L`). Both are real-time on their own chip.
⚖️ **So Warps is at most 2.3 times the compute budget of the whole of Plaits**,
and Plaits' dearest engine measured **15.7 µs per 128 frames** here. That puts
one Warps at roughly **15 to 40 µs per 128 frames** against the 2,667 µs those
frames last, which is **0.6 to 1.5 per cent of one core**.

⚠️ **AND THE ESTIMATE DOUBLES UNDER OPTION 2 OF §3.5**, because the module would
then run at 96 kHz. ⚠️ **AND IT IS AN INFERENCE FROM A CHIP CLOCK, NOT A
MEASUREMENT.** The M2 Pro is a wildly different machine from a Cortex-M4F and
the ratio between two ARM parts is not a ratio between two wasm modules. What it
buys is an ORDER, and the order says Warps is comparable to a couple of Plaits
voices rather than to eight of them.

### 3.8 What the page would be

**Slug: `/meet/`.** One sentence, in the house form: *two sounds go in and what
comes out is neither of them.*

⚠️ **THE NAME IS NOT `warps` AND THAT IS A LICENCE-ADJACENT CHOICE, NOT A
STYLE ONE.** The upstream README asks that a derivative not keep the module's
name. `/plai/` already follows this. ⚠️ **AND IT IS NOT `/fold/` EITHER**, even
though `ALGORITHM_FOLD` is one of the six: `positron-ui` lists `fold` among the
words banned from anything a visitor reads. `pair` is the alternative if `meet`
reads wrong.

**What a visitor presses:**

| control | kit component | what it does |
|---|---|---|
| ALGORITHM | slider | the continuous knob: xfade, fold, analog ring, digital ring, xor, comparator, then vocoder |
| AMOUNT | slider | `modulation_parameter`, whose meaning changes with the algorithm |
| CARRIER | picker | off (use the second `/plai/` voice) or one of the six internal shapes |
| NOTE | slider | the internal carrier's pitch |
| DRIVE ×2 | slider group | the two input gains |
| PLAY | pad | one note on the `/plai/` that feeds it |

**What the readout says**, six cells, which is even as the rule requires:

| key | what it is |
|---|---|
| `algorithm` | which of the seven is sounding, named |
| `blend` | how far between two of them the knob sits |
| `bands` | 20, and whether the vocoder path is the one running |
| `rate` | 48000, and whether the tables agree with it |
| `render` | µs per 128 frames |
| `built` | the source digest, as `/plai/` prints it |

🔴 **AND ONE CELL IS THE POINT OF THE WHOLE PAGE: `rate`.** Under option 1 of
§3.5 it reads `48000, tables want 96000` and the paragraph explains that the
vocoder's bands sit an octave low as a result. That is a page reporting a defect
it could have hidden, which is the thing this project keeps writing lessons about
not doing.

---

## 4. The something else: Marbles, at `/seed/`

### 4.1 Which module, which repository, which licence

📄 `tmp/plai-src/euro/marbles/`, same repository, same pinned commit. 📄
`marbles/Makefile:29` reads `FAMILY = f4xx`, MIT by the same clause. 📄
`marbles/Makefile:27` reads `F_CPU = 168000000L`.

### 4.2 What it demonstrates that `/plai/` does not

🔴 **IT MAKES NO SOUND AT ALL, AND THAT IS THE ARGUMENT.** Every audio page on
this site outputs samples. Marbles outputs **decisions**: two streams of gates
and four streams of voltages, at a control rate, quantised to a scale. Its output
is what a *player* does, not what an *instrument* does.

⚖️ **SO IT IS THE FIRST PIECE OF DSP HERE WHOSE CORRECTNESS CAN BE READ RATHER
THAN HEARD.** A page can print the events in a table. A harness can assert on
them. Nothing about grading it needs an RMS, a spectrum or an ear.

🔴 **AND THE SECOND THING, WHICH IS THE ONE WORTH BUILDING THE PAGE FOR: ITS
RANDOMNESS IS A SEEDED LCG AND IN A BROWSER IT IS COMPLETELY DETERMINISTIC.**
This was measured by reading, and it is not obvious from the outside.

📄 `marbles/random/random_generator.h:44-56`, in full:

```cpp
inline void Init(uint32_t seed) { state_ = seed; }
inline void Mix(uint32_t word) {
  // state_ ^= word;
}
inline uint32_t GetWord() {
  state_ = state_ * 1664525L + 1013904223L;
  return state_;
}
```

📄 `marbles/random/random_stream.h` wraps it: a 128-word ring buffer fed by the
STM32's hardware RNG peripheral, **falling back to that LCG whenever the ring is
empty**. 📄 `marbles.cc:410` is `rng.Init()`, the hardware peripheral, and
`:127-128` feeds its words into the stream.

🔴 **THREE THINGS FALL OUT OF THAT AND ALL THREE ARE FINDINGS.**

1. ⚖️ **A BROWSER HAS NO STM32 RNG PERIPHERAL, SO THE RING IS ALWAYS EMPTY AND
   THE LCG IS THE ONLY SOURCE.** The module becomes fully deterministic without
   anything being edited.
2. 📄 **`Mix` IS COMMENTED OUT UPSTREAM.** The body is `// state_ ^= word;`. So
   even on hardware the entropy never reaches the LCG's state, only the ring.
3. 📄 **`random_generator` IS NEVER SEEDED IN `marbles.cc`.** There is no
   `random_generator.Init(...)` anywhere in that file. It has static storage
   duration, so `state_` starts at 0, and the sequence is the same on every boot
   of every unit once the ring runs dry.

✅ **SO A SHIM CAN EXPOSE `seed` AS A CONTROL, HONESTLY, BY CALLING AN `Init`
THAT UPSTREAM PROVIDES AND THE FIRMWARE DOES NOT USE.** Nothing is patched. The
entry point is already public.

🔴 **WHICH GIVES THE PAGE AN ASSERT NO AUDIO PAGE HERE CAN MAKE: RUN IT TWICE
FROM THE SAME SEED AND COMPARE TWO HUNDRED EVENTS BYTE FOR BYTE.** Not
"similar". Not "close". Identical, or a bug. ⚠️ And the negative control is free:
change the seed by one and require them to differ, which is the half that stops a
frozen generator reading as a passing test.

⚖️ **AND IT IS THE DIRECT ANSWER TO LESSONS §81 IN A WAY CLOUDS IS NOT**, see
§5.1. §81's rule is that *"the same X at both ends"* is a claim about one
definition and that no amount of A/B promotes "similar" to "same". **A seeded
generator is the case where the claim is checkable by equality**, which is the
only form of that claim this project has ever been able to stand behind.

### 4.3 Is the DSP separable, and how much host code

⚠️ **PARTLY, AND THIS IS THE HONEST WEAKNESS OF THE PROPOSAL.**

✅ **The generators themselves are clean classes and they are rate-parameterised,
which Plaits is not.** 📄 `marbles/random/t_generator.h:86` and
`marbles/random/x_y_generator.h:91`:

```cpp
void Init(RandomStream* random_stream, float sr);
```

📄 `TGenerator::Process(bool use_external_clock, const GateFlags* external_clock,
Ramps ramps, bool* gate, size_t size)` and
📄 `XYGenerator::Process(ClockSource, const GroupSettings& x, const
GroupSettings& y, const GateFlags* external_clock, const Ramps&, float* output,
size_t size)`. Everything else is `set_*` inline setters. **No allocator, no
codec, no drivers.**

🔴 **BUT THE INSTRUMENT IS NOT A CLASS. IT IS `marbles.cc`.** 📏 `Process()` runs
from line 228 to line 400, which is **173 lines**, and it is where the deja vu
deadband, the scale selection, the clock self-patching detector, the ramp buffer
layout and the gate delay all live. `TGenerator` and `XYGenerator` do not talk to
each other; `marbles.cc` wires them.

⚠️ **SO A SHIM HAS TO RE-SAY THAT WIRING, AND THAT IS A REAL DEPARTURE FROM WHAT
MAKES `/plai/` STRONG.** `plai_shim.cc`'s claim is that not one line of upstream
is edited or copied, and the six lines of contact are calls. **A `/seed/` shim
would contain a transcription of firmware logic**, which is a weaker claim and
has to be labelled as one, in the shim's header, in the page's paragraph and in
`PROVENANCE.json`. ⚠️ The honest wording is *"the generators are upstream's,
unedited; the wiring between them is ours, read off `marbles.cc:228-400`"*, and
a reader is entitled to know which half is which.

⚖️ **ESTIMATE FOR `seed_shim.cc`: 380 to 480 code lines**, against `plai_shim.cc`'s
measured 306. An ESTIMATE, from reading:

| the shim must | lines, estimated |
|---|---|
| hold `TGenerator`, `XYGenerator`, `RandomStream`, `RandomGenerator`, seed them | 40 |
| transcribe the wiring from `marbles.cc:228-400` | 170 |
| map roughly 14 parameters to setters and back | 70 |
| expose the events as a readable buffer rather than as DAC codes | 50 |
| a scale table, since `LoadScale` wants one | 40 |
| build stamp, digest, counters | 30 |

✅ **AND WHAT IT DROPS IS LARGER THAN WHAT IT ADDS.** The 173 lines contain
calibration, DAC code conversion, self-patching detection and a gate delay tail
that exist because the hardware has jacks. A browser has none of those, so a
fair transcription is shorter than the original, not longer.

### 4.4 The trap check, and I got this section wrong the first time

✅ **THE BLOCK-SIZE HALF IS CLEAN.** 📏 Measured today: `kBlockSize` appears in
`marbles/io_buffer.h:40` (`const size_t kBlockSize = 5`, the firmware's DAC
double buffer), in six array dimensions in `marbles.cc`, and in
`marbles/bootloader/bootloader.cc` where it means something else entirely
(16384, a flash page). **`grep -rn kBlockSize marbles/random/ marbles/ramp/`
returns nothing.** Every generator takes `size` and uses it.

✅ **AND THE TABLES CARRY NO RATE.** 📏 Measured today:
`grep -rn "SAMPLE_RATE\|sample_rate\|32000\|48000" marbles/resources/*.py`
**returns nothing**, and `marbles/resources.cc` holds `lut_raised_cosine`,
`lut_sine` and `lut_logit`, which are shape tables with no frequency in them.
This is the opposite of Warps, where the generator script declares
`SAMPLE_RATE = 96000` in two files.

🔴 **BUT THIS SECTION SAID "NO TRAP" AND THAT WAS WRONG. THERE ARE THREE
HARDCODED `32000` LITERALS AND I FOUND THEM BY RUNNING THE COMMAND §7 SAID TO
RUN.** 📏 All three are in `marbles/ramp/ramp_extractor.cc`:

```cpp
audio_rate_period_ = 1.0f / (100.0f / 32000.0f);            // :57, in Init
reset_interval_ = 32000 * 3;                                 // :71, in Reset
std::max(4.0f / target_frequency_, 32000 * 3.0f)             // :250, in Process
```

⚠️ **AND THE SHAPE IS EXACTLY PLAITS' SHAPE: A RATE-CORRECT FUNCTION WITH A
CONSTANT INSIDE IT.** 📄 `RampExtractor::Init(float max_frequency)` takes a
NORMALISED frequency and both callers derive it properly
(`x_y_generator.cc:45` is `ramp_extractor_.Init(8000.0f / sr)`,
`t_generator.cc:154` is `ramp_extractor_.Init(1000.0f / sr)`). Then the first
line of the body throws the rate away for one variable. ⚖️ At 48 kHz the
audio-rate detection threshold moves from 100 Hz to **150 Hz**, and the reset
timeout moves from 3 seconds to **2**.

✅ **AND THE GOOD NEWS IS PRECISE: ALL THREE ARE ON THE EXTERNAL CLOCK PATH
ONLY.** 📄 `t_generator.cc:332` gates `ramp_extractor_.Process(...)` behind
`if (use_external_clock)`, and `x_y_generator.cc:83-86` reaches it only in
`case CLOCK_SOURCE_EXTERNAL`. `Init` and `Reset` run unconditionally, but the
constants they set are only READ inside `Process`. **A page running on the
internal clock never touches any of them.**

⚖️ **SO THE VERDICT IS CONDITIONAL, NOT CLEAN: `/seed/` ON ITS INTERNAL CLOCK IS
FREE OF THIS, AND THE MOMENT SOMEBODY ADDS AN EXTERNAL CLOCK CONTROL IT ARRIVES.**
That is a note for the shim's header and for whoever adds the control later, and
it is the sort of thing that would otherwise be found by somebody wondering why a
clock divider behaves oddly above 100 Hz.

⚠️ **THE LESSON IS ABOUT THIS DOCUMENT, NOT ABOUT MARBLES.** §7 listed the grep
as a thing to check and §8 admitted the claim was weak. Running it took one
command and it turned a ✅ into a conditional. **A claim flagged as unverified in
a plan is a claim the plan should have verified before it shipped**, whenever the
check is one command long.

### 4.5 Where does the sound come from

🔴 **NOWHERE, AND THAT IS WHY THIS ONE IS THE EASY HALF OF THE PAIR.** Marbles
generates events, so the question turns round: what plays them. The answer is
`/plai/`, for the same measured reason as §3.6, and here it is not a compromise
but the natural pairing. **A random note generator with nothing to play is a
table; with `plai.wasm` behind it, it is an instrument that plays itself.**

⚠️ **AND THE PAGE MUST NOT SOUND ON LOAD.** CLAUDE.md's rule about a visit
opening nothing is about bytes, but a page that starts generating notes the
moment it is opened is the same defect wearing a different coat. The generator
runs when somebody presses START.

### 4.6 The artefact and the CPU

⚖️ **ARTEFACT: 85 to 110 KB, ESTIMATED.** 📏 Tables are **72,744 bytes**,
measured, which is more than Warps and is the dominant half. Code is 110,039
source bytes at 0.208, about **22,900 bytes**, and unlike Warps there is almost
no template machinery to inflate it, so this estimate is the firmer of the two.

⚖️ **CPU: THE CHEAPEST THING IN THIS DOCUMENT, BY A WIDE MARGIN.** Marbles runs
on a 168 MHz part, but it is producing **four voltages and two gates at 32 kHz**,
not audio. 📄 The expensive parts are a quantiser, a lag processor, an envelope
of ramps and a handful of LCG calls per event. ⚖️ **Estimate: 1 to 5 µs per 128
frames**, well under one Plaits voice, and there is a strong case for not running
it at audio rate at all.

⚠️ **AND THAT RAISES A DESIGN QUESTION THE BUILD WOULD HAVE TO SETTLE:** does
`/seed/` live in an AudioWorklet beside `/plai/`, or on the main thread feeding
`plai_note_on` through a message port. ⚖️ **In the worklet**, because a note's
time is then a sample index rather than whenever a callback happened, and
LESSONS §84 is an entire entry about `requestAnimationFrame` being a paint
callback and never a trigger. **A generator on the main thread would be that
mistake with a new name.**

### 4.7 What the page would be

**Slug: `/seed/`.** One sentence: *a machine that decides which notes to play,
and a number that makes it decide the same way twice.*

**What a visitor presses:**

| control | kit component | what it does |
|---|---|---|
| START | pad | runs the generator. Nothing sounds until it is pressed |
| SEED | stepper | the LCG's starting state. Change it and everything changes |
| AGAIN | slider | the deja vu control: at 0 every event is new, at 1 an eight-event loop repeats |
| LENGTH | stepper | how long that loop is |
| RATE | slider | events per second |
| SPREAD | slider | how far the voltages wander |
| SCALE | picker | which set of notes the voltages are quantised to |

**What the readout says**, six cells:

| key | what it is |
|---|---|
| `events` | how many have been generated since START |
| `repeat` | how many of the last 32 were replays rather than new draws |
| `seed` | the number, printed so it can be typed back in |
| `same` | after a second run from the same seed: how many of 200 events matched. This is the page |
| `notes` | how many distinct notes the scale has admitted |
| `built` | the source digest |

🔴 **`same` IS THE CELL THE PAGE EXISTS FOR AND IT MUST BE ABLE TO READ
SOMETHING OTHER THAN 200.** A cell that is always full is a cell that teaches a
reader to stop looking (`positron-ui`: *every readout cell must be able to
change*). The control that makes it move is the seed: run twice from the same
seed and it reads 200 of 200, change the seed by one and it reads a handful, and
both are one press apart.

---

## 5. What was refused, and why

**The family on this disk is nine plausible candidates and there are 529
Airwindows effects past it. Here is every one I looked at and the reason it lost.**

### 5.1 🔴 Clouds, refused, and the brief was right to demand the argument

**Clouds is the obvious effect to propose and I am not proposing it.**

📏 The numbers first, all measured today: `clouds/resources.cc` carries **45,622
bytes** of tables, which is the smallest here, and the DSP is 25 files and
130,803 bytes. On size alone it would be fine.

🔴 **THE FIRST REASON IS THE ONE THE BRIEF NAMED, AND MY READING OF IT IS THAT A
REAL CLOUDS DOES *NOT* ANSWER LESSONS §81. IT WOULD BE A THIRD GRANULATOR.**

§81 is about `/grains/` claiming *"the same granulator in this page and on a
Raspberry Pi"* while running a Web Audio reimplementation against the board's
Pappus. The lesson's own repair was to put **real scsynth running the board's own
compiled graph** in the page, so that "same" became a claim about one definition.
⚠️ **Clouds has nothing to do with Pappus.** Compiling it would put a *third*
granular algorithm on this site, unrelated to either end of the pair §81 is
about, and it would leave `/grains/`'s pair exactly as it is. **The lesson is
about one definition at two ends, not about granulation**, and answering it with
a different granulator is answering a question nobody asked.

⚖️ **THE STRONGEST VERSION OF THE CASE FOR CLOUDS IS THE OTHER ONE**, and it is
worth stating so somebody can argue with it: *this site granulates in a
reimplementation, so a page running the firmware would be the first honest
granulator here.* ⚠️ That is true. It is also a much smaller claim than §81, and
it is a claim about `/grains/` that `/grains/` already makes correctly about its
scsynth half.

🔴 **THE SECOND REASON IS MEASURED AND IS ON ITS OWN DISQUALIFYING FOR A FIRST
ATTEMPT.** 📄 `clouds/clouds.cc:51-52`:

```cpp
uint8_t block_mem[118784];
uint8_t block_ccm[65536 - 128] __attribute__ ((section (".ccmdata")));
```

**184,192 bytes of delay memory**, handed to `processor.Init(...)` at
`clouds.cc:105`. That is nearly the whole of `plai.wasm` in buffer alone, before
a byte of code, and `-sINITIAL_MEMORY=4MB` in `build.sh` would have to grow.

🔴 **THE THIRD IS THE RATE, AND IT IS WORSE THAN WARPS'.** 📄 `clouds.cc:111` and
`:115` are `meter.Init(32000)` and `codec.Init(master, 32000)`, and 📄
`clouds/dsp/granular_processor.h:156-158` hardcodes it in the DSP:

```cpp
inline float sample_rate() const {
  return 32000.0f / \
      (low_fidelity_ ? kDownsamplingFactor : 1);
}
```

📄 And `clouds/dsp/fx/reverb.h:45-46` divides by a literal `32000.0f` twice.
⚠️ **A rate that is a method returning a constant is harder to change than one
that is an `Init` argument**, and Clouds would need genuine resampling rather
than a decision.

**Verdict: not first. Worth revisiting once `/meet/` has proved a second module
is routine, and worth it then as a page about the PHASE VOCODER mode rather than
about granulation, because `clouds/dsp/pvoc/` is the part this site has no
counterpart to at all.**

### 5.2 Rings, refused: this site has already compiled most of it

📏 `rings/resources.cc` is the second smallest table set here at 24,084 bytes and
the DSP is 23 files. It is a fine module. **The problem is overlap.**

📏 Measured today: `plaits/dsp/physical_modelling/` contains `resonator.cc`,
`string.cc`, `modal_voice.cc` and `string_voice.cc`, and **all four are already in
`build.sh`'s `SOURCES` list**. `rings/dsp/` contains `resonator.cc` (122 lines)
and `string.cc` alongside `part.cc`, `fm_voice.cc` and `string_synth_part.cc`.
⚖️ **They are not the same files, but they are the same author's same technique,
and Plaits' MODAL and STRING engines are the condensed version of what Rings
does with more voices.** A `/rings/` page would be, to a visitor, *`/plai/`'s
modal engine with more knobs*.

⚠️ **THE HONEST COUNTER, SINCE THE BRIEF ASKED FOR ARGUABLE REFUSALS:** Rings is
a genuine EFFECT in a way Plaits is not, because its resonator takes an external
exciter. If the two-input argument in §3.2 is the one that matters, Rings makes a
version of it. **Warps wins because its two inputs are symmetrical and Rings' are
not**, and because Rings' second input is a click.

### 5.3 Elements, refused on size

📏 **`elements/resources.cc` is 1,599,351 bytes of text carrying 372,594 bytes of
tables.** That is 3.3 times Plaits' 114,106, and Plaits' tables are already 57
per cent of a 199,678 byte artefact. ⚖️ **An `elements.wasm` would be at least
400 KB and probably nearer 450**, which is more than twice `/plai/` for a module
that is, from a visitor's seat, Rings with an exciter section.

### 5.4 Braids, refused: it is what Plaits replaced

📄 `braids/Makefile:29` is `FAMILY = f10x`, so it is in scope licence-wise. 📏
Its tables are the second largest in the family after Elements. ⚖️ **But Braids
is the module Plaits succeeded**, and the brief's own standard rules it out in
one line: a second macro-oscillator teaches nothing. Several of its engines are
in `plai.wasm` already under different names.

### 5.5 Stages and Tides2, refused in favour of Marbles

📏 **Stages is the smallest thing in the family**: 23,556 bytes of tables and a
DSP subset of six files and 46,447 bytes, with a clean `SegmentGenerator` class
that instantiates six times exactly the way `plaits::Voice` instantiates eight.
⚖️ **On engineering grounds it is the easiest build in this document by some
distance.**

🔴 **IT LOSES ON WHAT IT WOULD DEMONSTRATE.** Stages makes envelopes and LFOs.
`/plai/` already has a lowpass gate with a decay control, this site has a dozen
pages with a shape moving over time, and *"six envelopes"* is not a page. ⚠️ **It
would be an excellent SECOND control module**, once `/seed/` has established that
a CV page is a thing here, because Stages feeding Marbles' clock input is what
the two do in a real rack.

**Tides2 loses the same way** and additionally sits between the two: it is a
shape generator that can also be an oscillator, so it is neither clearly the
effect nor clearly the something else.

### 5.6 The 529 Airwindows effects, refused for now, and the reason is not quality

📄 `baconpaul/airwin2rack` is MIT, 529 effects behind
`AirwinConsolidatedBase::processReplacing(float**, float**, VstInt32)`, whose
only includes are `<cstdint> <cassert> <cstring> <stdio.h> <cmath>`.
`plan-vcv-modules.md` §5.2 calls it *"the ABI somebody already designed"* and it
is right.

🔴 **AND THAT IS EXACTLY WHY IT IS NOT THE NEXT THING.** The pipeline this
project just built is: pin an upstream, list the sources, compile in a container,
digest the definition, run it in a worklet, report the provenance. **An
Airwindows effect exercises none of the hard parts.** It is one header, one
class, no tables, no fixed block size, no sample rate constant and no allocator.
It would compile first time, weigh maybe 20 KB, and prove nothing that was in
doubt.

⚠️ **AND IT HAS THE SOUND-SOURCE PROBLEM WITH NONE OF WARPS' ANSWER.** Every
Airwindows effect is strictly an insert. There is no internal oscillator, so the
page is entirely dependent on something else generating, and the interesting ones
cannot be chosen from a list of names without listening to them.

✅ **WHAT IT IS GOOD FOR IS A DIFFERENT PAGE ENTIRELY: 529 OF THEM AT ONCE.**
⚖️ A page that compiles the whole consolidated library and lets a visitor walk
529 effects over one signal is a demonstration of the ABI rather than of any one
effect, and it is the only shape in which the number 529 means anything. **That
is worth a plan of its own and it is not this one.**

### 5.7 What was not considered, and should be said

- ⚠️ **The Surge `sst-*` libraries** (`sst-filters`, `sst-effects`,
  `sst-basic-blocks`, `sst-waveshapers`) are all GPL-3.0. `plan-vcv-modules.md`
  §5.3 calls that *"a decision rather than a blocker"* for an R&D repository.
  **I did not consider them here because both proposals are MIT and there is no
  reason to spend a licence decision before the permissive options are used up.**
- ⚠️ **Cardinal, headless or otherwise.** `plan-vcv-modules.md` §12 recommends
  looking at it, and nothing here contradicts that. It is a different question
  from *which DSP core comes next*.

---

## 6. Ranking, and what a day costs

🔴 **DO `/meet/` FIRST.**

| | `/meet/` (Warps) | `/seed/` (Marbles) |
|---|---|---|
| DSP files to compile | **5** | 8 to 10 |
| shim, estimated | **150 to 220 lines** | 380 to 480 lines |
| upstream logic transcribed | **none** | 173 lines |
| block-size trap | none | none |
| rate problem | ⚠️ real, and it is a **decision** | none found |
| depends on `/plai/` | yes | yes |
| answers the request's "effect" half | ✅ | ✗ |

⚖️ **THE DECIDING REASON IS THE SHIM, NOT THE SIZE.** `/meet/` reuses
`plai_shim.cc`'s shape almost exactly and drops its hardest part (the voice
allocator and the stealing rule). `/seed/` has to re-say firmware, which is the
first time this pipeline would put OUR logic inside an artefact that claims to be
UPSTREAM's, and that is a thing to do second, deliberately, with the labelling
worked out rather than invented under time pressure.

⚠️ **AND THE RATE PROBLEM IS NOT A REASON TO DEFER `/meet/`**, because §3.5
option 1 costs nothing and produces a page that reports its own error. It becomes
a reason to defer only if somebody insists on option 2 before shipping.

### What a day would actually contain

⚠️ **THESE ARE ESTIMATES OF EFFORT, NOT MEASUREMENTS, AND THE FIRST TWO ITEMS
BLOCK EVERYTHING ELSE.**

| step | who | estimate |
|---|---|---|
| **0. `/plai/` lands and is committed** | the agent already in there | blocking, not mine to price |
| **1. generalise `build.sh` into one script that takes a module** | one agent, before any page agent starts | 2 to 3 hours |
| 2. `meet_shim.cc` and its first compile | | 3 to 4 hours |
| 3. `meet-worklet.js`, copied from `plai-worklet.js` | | 1 hour |
| 4. the `/meet/` page, its diagram and its asserts | | 4 to 6 hours |
| 5. `seed_shim.cc`, the transcription, and its labelling | | 6 to 8 hours |
| 6. the `/seed/` page and the seed-equality assert | | 4 to 6 hours |

🔴 **STEP 1 IS NOT OPTIONAL AND IT IS THE ONE THAT GETS SKIPPED.** CLAUDE.md is
explicit: *"ANYTHING SHARED IS DONE ONCE, BY ONE AGENT, BEFORE THE PAGE AGENTS
START"*. Three near-identical `build.sh` files with three `SOURCES` arrays and
three hand-maintained `EXPORTS` strings is the hand-rolled-control rule arriving
in the build system. ⚠️ **The parameterisation is not obvious**, either: the
digest in `build.sh` is computed over the pins, the shim's bytes, the defines and
the source list, and it has to stay a per-module digest while the script becomes
shared. That is a design decision worth making on purpose.

⚖️ **SO THE REALISTIC SHAPE IS: ONE DAY FOR THE SHARED BUILD PLUS `/meet/`, A
SECOND DAY FOR `/seed/`.** Both figures assume the compile works roughly first
time, which is what `-DTEST` and the existing container buy, and neither assumes
any of the numbers in §3.7 or §4.6 turn out to be right.

---

## 7. What would turn each estimate into a fact

| reading | what would settle it | cost | blocked here? |
|---|---|---|---|
| `meet.wasm` is 80 to 115 KB | add a `warps/` `SOURCES` list to `build.sh` and run it | one container run, no host install | ⚠️ **ASK FIRST.** It is the existing container, so it is `LESSONS.md` §80 only in the sense that `/plai/` already was |
| `seed.wasm` is 85 to 110 KB | same, with a `marbles/` list | same | same |
| Warps costs 15 to 40 µs per 128 frames | the same main-thread timing `/plai/` already uses, since `performance` is not in an `AudioWorkletGlobalScope` | minutes, once it compiles | after the build |
| Marbles costs 1 to 5 µs | same | same | same |
| the shim is 150 to 220 lines | write it | half a day | after the build |
| **the vocoder really is an octave low at 48 kHz** | run the filter bank at 48000 and sweep a tone through it, reading which band lights | an hour, once it compiles | after the build. ⚠️ **This is the one I would check before deciding between §3.5's three options** |
| ~~Marbles' tables carry no baked rate~~ | ✅ **DONE WHILE WRITING THIS.** The grep is clean, and running it also turned up the three `32000` literals in `ramp_extractor.cc`. §4.4 is rewritten | one command | settled |
| the seed really gives identical runs | two runs, 200 events, byte compare, plus a seed+1 negative control | trivial, once it compiles | after the build |
| a static initialiser breaks `--no-entry` | link it. 📄 `warps/dsp/vocoder.h:39` is `const float kFollowerGain = sqrtf(kNumBands);` at namespace scope, which clang should constant-fold at `-O3` but may instead emit into `__wasm_call_ctors` | the link step tells you | ⚠️ **a real risk and it would surface as silence, not as an error** |
| zero wasm imports, as `/plai/` has | `wasm-objdump` the artefact, the same check `/plai/` passes | seconds | after the build |

---

## 8. What I could not settle

🔴 **NONE OF THE FOLLOWING SHOULD BE REPEATED AS IF IT WERE KNOWN.**

- ⚖️ **EVERY ARTEFACT SIZE IN THIS DOCUMENT RESTS ON ONE RATIO FROM ONE
  DATA POINT.** 0.208 compiled bytes per source byte comes from Plaits alone, and
  Plaits is unusually comment-heavy and unusually engine-rich. Warps is
  template-heavy in a way that ratio cannot see. **Treat the ranges as orders of
  magnitude and nothing finer.**
- ⚖️ **EVERY CPU FIGURE IS AN INFERENCE FROM A CHIP CLOCK.** 72 MHz against
  168 MHz is a fact about two Cortex-M parts. It is not a fact about two wasm
  modules on an M2 Pro, where cache behaviour, SIMD and the compiler's inlining
  decisions dominate. **The only thing I will stand behind is the ORDER**: Warps
  is a couple of Plaits voices, Marbles is less than one.
- ✅ **THE ONE THING I FLAGGED AND THEN CHECKED.** This entry used to say I had
  not looked at whether `marbles/resources/` bakes a sample rate. I ran it. The
  tables are clean and **three hardcoded `32000` literals turned up in
  `ramp_extractor.cc` instead**, which is left here as the record of a claim that
  changed between draft and delivery. §4.4 carries the result.
- ✅ **AND THE SAME SWEEP FOR WARPS, ALSO RUN RATHER THAN LEFT.** 📏
  `grep -rn "96000\|48000\|32000\|44100" warps/dsp/` returns **exactly one line**,
  `warps/dsp/oscillator.h:41`, `const float kInternalOscillatorSampleRate =
  96000.0f`. 📏 That symbol appears **nowhere else in the whole of `warps/`**: it
  is dead, and `Oscillator::Init` at `oscillator.cc:42-43` computes
  `one_hertz_ = 1.0f / sample_rate` from its argument. ⚖️ **So Warps' only live
  rate dependence is the `resources.cc` filter bank, exactly as §3.5 says, and
  there is no second trap hiding in the code.** ⚠️ A dead constant naming the
  hardware rate is still a thing to notice, because it reads as the rate the
  module runs at and it is not.
- ⚠️ **THE 173-LINE TRANSCRIPTION IS THE LARGEST UNKNOWN IN THIS DOCUMENT.** I
  read `marbles.cc:228-400` and formed a view of how much of it is hardware
  plumbing. I did not work out line by line which parts a browser needs, so the
  380 to 480 line estimate for `seed_shim.cc` could be 300 or could be 600.
- ⚠️ **I DID NOT READ THE RACK ADAPTERS FOR EITHER MODULE.**
  `VCVRack/AudibleInstruments` carries a `Warps.cpp` and a `Marbles.cpp` and
  they have already solved the rate question and the wiring question in their own
  way. **That repository is not on this disk and I did not fetch it**, because the
  brief asked for no network work beyond reading. Reading those two files before
  writing either shim would be the single highest-value hour available, and it is
  free.
- ⚠️ **WHETHER `/plai/` WILL STILL LOOK LIKE THIS WHEN IT LANDS.** 📏 Measured
  today: it is untracked, another agent is inside it, and `plai_shim.cc` is
  582 lines where the brief said 216. **Both proposals are written against a
  moving file.**
- ⚠️ **WHETHER THE SLUGS ARE RIGHT.** `meet` and `seed` are proposals. `pair` and
  `again` are the alternatives I would accept. What is not negotiable is that
  neither is `warps` or `marbles`, for the reason in §2.
- ⚠️ **WHETHER TWO PAGES IS THE RIGHT ANSWER AT ALL.** The request was for two
  and this document gives two. ⚖️ **A defensible alternative is one page with two
  modules in it**: `/meet/` with `/seed/` driving the `/plai/` that feeds it is a
  complete rack in one tab, and it is the arrangement all three were built to sit
  in. I did not propose it because it triples what one page has to explain, and
  because two pages can be built by two agents and one cannot.
