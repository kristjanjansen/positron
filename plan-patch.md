# plan-patch — an instrument that travels as a file (2026-09-13)

Companion to `plan-visuals.md` (which made this argument for pictures and not
for sound), `research/supercollider-browser-2026-09.md` (which measured the
mechanism and then priced a different question), and `plan-twins.md` (whose
central claim this makes literal).

Every number below was taken on this machine today unless it says otherwise.
`/patch/` is the page; `node demo/verify.mjs patch` runs it.

---

## 0. The question, and the one it is not

**Can a synth definition travel as a message, the way a shader does?**

`plan-visuals.md` §1.2 already settled the picture half. A fragment shader is a
document — *"~2 KB of GLSL plus ~200 bytes of parameters reproduces it at any
resolution"* — and §1.2's **Seam 3** works out when generated code may cross a
wire and why a shader is a defensible thing to send where JavaScript is not.
Nobody had written the sound half down.

⚠️ **This is NOT the question `research/…§5` answered, and conflating the two
is what kept it from being asked for a day.** That section priced *"do we need
scsynth to make granular sound in a browser?"* — **1,701,983 B of engine against
a 6,659 B Faust worklet, and 251 lines of plain AudioWorklet already in the
repo** — and answered it correctly: no. Every number in it is right. None of
them bears on this, because here **the engine is a reader you fetch once and the
asset is the thing that travels**. A PNG decoder is larger than most PNGs and
that has never been an argument against PNG.

🔴 **And it fixes a claim this repo is already making.** `grains` says the
worklet in the page and scsynth on the Raspberry Pi are *"the same granulator"*.
They are not. One is a reimplementation that sounds comparable, which is a
different and weaker statement. **Two ends run the same instrument only if the
same definition runs on both** — that is what this page makes literal.

---

## 1. What was built

| file | what it is |
|---|---|
| `demo/shell/synthdef.mjs` | the `SCgf` format, both directions: a writer, an independent reader, and a version 1 → version 2 converter |
| `demo/shell/synthdef-audio.mjs` | a SECOND reader — the browser's own oscillators and gains, built from the same file, which **refuses** any file it cannot read all of |
| `demo/patch/engine.mjs` | wasm scsynth, lazily fetched, plus the loudness meter and the price measurement |
| `demo/patch/vendor/` | 1,858,163 B of vendored engine, and one `.scsyndef` nobody here wrote |
| `demo/patch/index.html` | the page |

The shape of a run: choose a file → the bytes go out over the relay and come
back → **only the copy that came back** is played → SuperCollider plays it,
then the browser's own reader plays it or says which parts it does not know.

---

## 2. The measurements

All from ONE run of `node demo/verify.mjs patch` — headless Chrome,
`--disable-gpu --mute-audio`, local server, nothing cached, **26/26 green** (20
asserts from the page, 6 from the harness) with no other Chrome on the machine.
Figures from other runs are marked as ranges.

### 2.1 What travels

| file | written by | bytes | building blocks | round trip |
|---|---|---:|---:|---:|
| `positron-bell` | this page, byte by byte | **339** | 7 | **36 ms** |
| `positron-drone` | this page | **384** | 8 | **32 ms** |
| `sonic-pi-beep` | **sclang, years ago, elsewhere** | 1,656 → **2,370** | 40 | **37 ms** |

(Across every run of the day the round trip sat between **31 and 46 ms**, with
one 166 ms outlier on a first send.)

The round trip is `demo/shell/wire.mjs` → `ws.positron.studio` → a Durable
Object → back, as a binary frame. All three came back **byte-identical**.

⚠️ **1,656 → 2,370 is not padding, it is the format version.** The shipped file
is `SCgf` version 1, where every count and index is 16 bits; a SuperCollider
from this decade writes version 2, where they are 32. ✅ **The converter here
produced exactly 2,370 B from 1,656 B, which is byte-for-byte the figure
`research/…§2.1` recorded for the converter written independently for that
report.** Two implementations, written a day apart, agreeing on a number neither
could have guessed.

### 2.2 What plays it

| | |
|---|---|
| engine boot | **630 ms** here; **625–752 ms** across the day (research measured 747) |
| transport | **`postMessage`** — `crossOriginIsolated: false`, no COOP/COEP, nothing in the deployment touched |
| sample rate | 48,000 Hz |
| SuperCollider, playing | **0.075000** / 0.049255 / 0.074979 rms |
| the browser's own reader, playing | **0.074989** / 0.041678 rms, and it REFUSED the third |
| **nothing playing, both meters** | **0.000000 / 0.000000** |

🔴 **The last row is the one that makes the others mean anything.** This project
has produced three separate "it is silent" conclusions from a meter pointed at
the wrong device. Without a deafness control, "SuperCollider 0.075" and "this
meter reads 0.075 whatever happens" are the same reading.

### 2.3 Does a setting reach the engine

`amp 0.15 → 0` gives **0.075037 → 0.000000**, and `/s_get` reads the value back
off the server as `0`. The browser's reader goes **0.075020 → 0.000000** on the
same instruction.

⚠️ **This is the assert that grades the ARITHMETIC in the file, and nothing
else can.** Reading the bytes back proves they are self-consistent. A wrong
number in the multiply — `BinaryOpUGen`'s special index, which is 2 for `*` and
0 for `+` — writes a perfectly well-formed file that ADDS the loudness instead
of scaling by it. Only an engine that runs the graph can catch that, and only a
measurement of the output can see the engine catch it.

### 2.4 The price, measured rather than quoted

```
the reader    at least 1,827,900 B, fetched once, only when asked   (page timing)
the assets                3,093 B for all three definitions together
                             591x
```

⚠️ **"At least", and the gap is instructive.** The page's own resource timing
sees the wasm (1,701,983 B), the client module (125,542 B) and one 375 B chunk.
It does **not** see `clockwork_audio_worklet.js` (30,263 B), which is fetched
inside the AudioWorklet's own scope. 1,701,983 + 125,542 + 30,263 is **exactly
1,857,788 B** — the figure `research/…§1.1` read off the packages — so the true
reader is that plus the chunk, **1,858,163 B**, and the page reports 1.6% less
than it costs. It says `at least` rather than inventing the difference.

Two smaller things the timing showed: the wasm is requested **twice** (one full
response and one empty-bodied row), and an `encodedBodySize || transferSize`
fallback added a phantom 300 B before it was removed — a measurement of a
measurement being slightly wrong, which is the third time today the instrument
needed checking before the pattern.

Both numbers go side by side on the page, because the judgement belongs to
whoever reads them. §5 of the research is right that 256x is absurd **for a
demo's sound engine**. Whether ~600x is absurd for an asset format depends
entirely on how many assets there are and how often the reader is fetched, and
that is a question about a system rather than about a page.

---

## 3. Three things this turned up that were not expected

### 3.1 A synth definition is a SAFER thing to send than a shader

`plan-visuals.md` §1.2 argues that generated GLSL is a defensible seam and
generated JavaScript is not: *"a shader cannot open a socket, cannot read
`document.cookie`… its worst case is a hang or a driver reset, not
exfiltration"*, and it names the guard a page must own — *"no `while`, bounded
`for` counts, a compile timeout, and a first-run frame-budget check"*.

**A synth definition needs none of that, and the reason is structural.** A
`.scsyndef` is not a program with control flow. It is a list of building blocks,
each naming a class from a **fixed table compiled into the engine**, each wired
to blocks that appear EARLIER in the list. There is no loop construct, no
branch, no way to name anything the engine does not already contain. Its cost is
bounded in advance by the number of blocks times the cost of each, and that
number is in the file and can be read before loading it — which `/patch/` does,
and prints.

So the two failure modes a shader validator exists to catch — an unbounded loop
and a call to something dangerous — **cannot be expressed in this format at
all**. What is left is ordinary resource use: a file naming 50,000 blocks would
be expensive, and the block count is right there in the header.

⚠️ **Two real limits, neither of them safety.** wasm scsynth silently refuses
any `/d_recv` over **64 KiB** (research §8.2, bisected: 52,730 B loads, 68,892 B
does not, no reply of any kind) — so a browser cannot be sent an arbitrarily
large instrument. And the relay caps a message at **256 KiB**. The narrower
limit is the browser's, not the wire's, which is worth knowing before designing
anything around this.

### 3.2 The second reader is where the honesty lives

`demo/shell/synthdef-audio.mjs` knows seven kinds of building block. Given
`sonic-pi-beep` it names the six it does not — `HPZ1, Impulse, UnaryOpUGen,
EnvGen, Select, Pan2` — and **plays nothing**.

That refusal is the most useful thing on the page. A reader that played the
parts it understood would produce a sound that is not the one in the file while
looking like a success, which is this project's oldest failure shape in a new
costume. It is also the exact claim `grains` makes loosely: *the same
instrument*. Here the page can say **which** parts are the same and which are
absent, because it had to enumerate them to build anything at all.

And it reports what is NOT identical even when it does play: the browser's
`sawtooth` is band-limited where SuperCollider's `LFSaw` is a raw ramp, and an
`OscillatorNode` has no starting phase. Both are printed. *A difference nobody
wrote down is a difference somebody will later call a bug.*

### 3.3 A maximum straddles a change

The first version of this measurement read the PEAK loudness over 700 ms
immediately after turning the loudness down, and **reported that turning it down
did nothing** — twice, on two different definitions, convincingly. Two causes,
both real: the analyser's 2,048-sample window still held 42 ms of the loud
signal, and a maximum keeps it forever; and two detuned oscillators beat at
1.1 Hz, so any two 700 ms windows differ anyway.

A mean, taken after the change has had time to land, answers the question that
was actually asked. That is CLAUDE.md's *"measure the quantity in question, not
one adjacent to it"* in the smallest possible costume — and it is worth noting
that **the wrong measurement produced exactly the symptom the board's granulator
shows**: a parameter that demonstrably reaches the engine while the audio does
not change. One of those two was a measurement artefact. It is at least worth
asking whether the other one is too.

---

### 3.4 The guards were broken on purpose, and one of them was too quiet

CLAUDE.md: *"Prove a guard fires. Break the thing on purpose once."* Two
sabotages, both reverted.

**`OP.mul` changed from 2 to 0 — the file now ADDS the loudness instead of
scaling by it.** Result: **18 of 20**, and the two that went red were the two
that ask whether a setting changes the sound. Everything else stayed green,
including *"SuperCollider made a sound from bell"* — which read **0.914262**
instead of 0.075000 and passed, because it only asks whether there is a sound.
🔴 **That is the whole argument for the loudness assert in one line: five checks
are blind to a wrong opcode and one is not.** A file with the wrong arithmetic
in it is still a well-formed file, still loads, still plays, and still crosses
the relay unchanged.

**One count left 16 bits wide in `toVersion2`** — the exact defect the
converter exists to avoid. The reader's "consumed to the exact byte" check
caught it, `sonic-pi-beep` never loaded, and the run went red — **but it first
went red the WRONG WAY**: the file threw inside `select()`, the loop skipped it,
and the page silently went from **20 asserts to 15**, with only the aggregate at
the end noticing. A shrinking assert total is how four checks went missing
unnoticed in this project once already, so the skip now emits a failing assert
of its own. Re-sabotaged: **14 of 16**, with `sonic-pi-beep says what it is —
the file could not be read at all` named in the output.

**And the relay taken away entirely** (`--host-resolver-rules=MAP
ws.positron.studio 127.0.0.1:1`, so the socket cannot open at all): **17 of
20**. The three "came back off the relay unchanged" asserts go red saying
`nothing came back`, and NOTHING HANGS — the page falls back to the local copy,
both engines still play it, the loudness settings still work and the deafness
control still reads zero. A page whose claim is that the bytes crossed should
fail when they did not, and should still be usable while it says so.

⚠️ So a red `patch` is not automatically a regression, for the same reason
CLAUDE.md already gives about `now` and `carry`: **three of its twenty asserts
are about somebody else's network.**

---

## 4. What the board would need, and why it was not done

⚠️ **The Raspberry Pi was in use by other work while this was written and it is
one device.** The browser half is complete and proved; the board half is
designed and unbuilt. What follows is the list, so that picking it up is a
build rather than a design.

1. **Compile on the board.** It already has sclang.
   `SynthDef(\x, { … }).writeDefFile("/tmp")` writes a version 2 `.scsyndef`
   and needs no server, no audio device and no JACK — research §8.2 established
   that while generating a ladder of test definitions on the Pi after the Mac
   went to sleep. **A `.scsyndef` is a platform-independent binary.**
2. **Carry it on the relay it already uses.** `rig/box/` is on `studio-1`. The
   bytes fit: 2,370 B against a 256 KiB message cap.
3. 🔴 **DECLARE WHAT THE FRAME IS. Do not sniff it.** The board's relay already
   carries binary PCM, and CLAUDE.md's hardest-won message rule is that *a
   channel count cannot be inferred from a payload* — two kinds of binary on one
   socket cannot be told apart by looking at them. A `.scsyndef` does start with
   the four bytes `SCgf`, which is tempting and is the same mistake in a new
   costume. **Send a JSON message that says what is coming and how big it is,
   then the frame** — or carry the bytes inside the JSON and pay the base64.
   The page does not have this problem only because a private room per run has
   exactly one kind of binary in it, and that is luck rather than design.
4. **Hand it to the board's scsynth.** It is a NATIVE scsynth, so the 64 KiB
   `/d_recv` ceiling that binds the browser does not apply — which means the
   board can be sent instruments the browser cannot run, and a page that offers
   a file to both ends has to say so rather than fail quietly.
5. **Do not stomp Pappus.** The board's scsynth holds a running node tree.
   A definition arriving from a page needs its own group and its own node ids.

**What that would prove that today does not:** that a definition written in one
place runs in a DIFFERENT PROCESS ON ANOTHER MACHINE, which is the whole point
and is currently proved only across a network round trip that ends where it
started.

---

## 5. What is measured, and what is not

| claim | state |
|---|---|
| the format is written correctly | ✅ real scsynth loads it, plays it, and responds to its settings |
| the format is READ correctly | ✅ a file compiled by sclang elsewhere parses **to the exact byte** |
| version 1 → 2 conversion | ✅ 1,656 → 2,370 B, matching an independent implementation |
| the bytes survive a real network hop | ✅ byte-identical, 36–46 ms, three times |
| two engines, one file | ✅ in the browser, with the second one refusing what it cannot read |
| **a definition written HERE loads into a NATIVE scsynth** | ⚠️ **UNPROVED** — only wasm scsynth has graded this writer |
| **a definition compiled on the BOARD loads here** | ⚠️ UNPROVED — the sclang-compiled file used is Sonic Pi's, and is version 1 |
| the same file sounds the same in two places | ⚠️ UNPROVED, and `synthdef-audio.mjs` already says it does not |
| anything at all on iOS | ⚠️ UNTESTED. `demo/verify-native.mjs` exists and has not been pointed at this |
| an instrument of a useful size | ⚠️ 64 KiB is the browser's ceiling. Pappus LITE is 73,297 B, **11.8% over** |

---

## 6. Is this going somewhere, or is it a curiosity?

**Honestly: it is a real thing with a narrow door, and the door is 64 KiB.**

What is genuinely good about it:

- **The mechanism works and is cheap.** 339 bytes describe an instrument that a
  browser had never seen, and playing it costs one message.
- **It is a better seam than generated shaders**, for the reason in §3.1: the
  format cannot express a loop or name anything outside the engine, so the
  validator `plan-visuals` says a shader needs does not exist here.
- **It turns a loose claim into a checkable one.** "The same instrument in two
  places" is now a sentence with a test under it.
- **The second reader is reusable on its own.** `synthdef.mjs` has no dependency
  on any engine: any page can read a `.scsyndef` and say what is in it.

What is genuinely against it:

- 🔴 **The instrument this repo actually cares about does not fit.** Pappus FULL
  is 118,597 B and LITE is 73,297 B against a silent 64 KiB ceiling in the wasm
  build. Cutting a stage to fit means the two ends run DIFFERENT graphs, which
  is exactly the claim this work exists to make literal. That is not a small
  irony and it should decide the next step.
- **1.86 MB of AGPL for a reader.** Fine once, for a page. A second page that
  wants it doubles nothing (the fetch is cached) but the licence does not go
  away, and *serving over a network* is AGPL's trigger.
- **Nothing here needs SuperCollider specifically.** The same argument holds for
  a Faust `.wasm` (48 KB for a Pappus-shaped chain, research §4.1) or a Csound
  `.csd`, and both are smaller assets with smaller readers. What SuperCollider
  has that they do not is **the board already running it**, which is the only
  reason this is the right format for this project.

**The next move, if there is one, is not a bigger page.** It is the board: send
a definition from `/patch/` to `studio-1`, have `rig/box/` load it into the
native scsynth, and hear the same file in two buildings. That is one afternoon,
it needs the device free, and it is the only experiment that can turn
`plan-twins`' claim from approximate to literal. Everything else here is
finished.
