# Live browser audio into scsynth-in-a-tab — MEASURED 2026-09-14

**It works. It has always worked. Nothing needs building.**

A browser `AudioNode` connected to `sonic.node.input` reaches SuperCollider's
hardware input busses (2 and 3), in the **same 128-sample block**, at **bit-equal
level**, through the **stock vendored worklet** and the repo's own
`bootScsynth({ input })`. Both a synthetic oscillator and a real
`getUserMedia` microphone were measured end to end.

The `withTone: 0.00000 / withoutTone: 0.00000` result that prompted this
investigation was **not an input-path failure**. It was Pappus outputting
silence because its own parameters were at the definition's defaults —
`mix 0, gain 0, thru 0, dry 0` — which is the *same* failure class as the
`gates` bug measured on 2026-09-14 (`demo/grains/index.html:setFixed()`), in a
new costume. The A/B measured the wrong quantity: it asked "is there sound at
the speakers" when the question was "does the input bus carry the tone", and
those differ by an entire unconfigured granulator.

---

## 1. The headline measurements

All numbers are peak RMS at an `AnalyserNode` in the engine's own output path,
headless Chrome, `--autoplay-policy=no-user-gesture-required`, 48 000 Hz,
`postMessage` transport, default `scsynthOptions`.

### 1.1 A hand-built `Out.ar(0, In.ar(2, 2))`

| run | source | at the engine's meter |
|---|---|---|
| stereo 220 Hz saw connected | 0.14936 | **0.14935** |
| the same, source gain → 0 | 0.00000 | **0.00000** |
| the same, source gain back | 0.14936 | **0.14936** |
| **control: input NOT connected** | 0.14935 | **0.00000** |
| mono source connected (1 channel) | 0.14935 | **0.07468** (left only; the analyser down-mixes) |

The control is the point: the identical graph, the identical tone still playing
into an analyser, and **nothing but `merge.connect(node)` removed**, reads
exactly 0. The worklet reported `c: 0` and `incoming: -1` in that run — Chrome
hands `process()` an empty channel array when the input has no connection.

### 1.2 A real microphone

Chrome's fake capture device (`--use-fake-device-for-media-stream`), track label
`Fake Default Audio Input`, via `getUserMedia` →
`createMediaStreamSource` → `node`:

| run | source | at the engine's meter |
|---|---|---|
| microphone connected | 0.48336 | **0.48336** |
| **control: microphone NOT connected** | 0.48336 | **0.00000** |

### 1.3 The real Pappus, granulating live browser audio

`/shell/scsynth.mjs`'s `bootScsynth({ input })` — **stock vendored worklet, no
instrumentation** — plus `/shell/pappus.mjs`'s `allocBuffers` (31/31) and
`startPappusSynth`, plus the settings `/grains/index.html`'s `setFixed()` and
`PATCHES[0]` send:

| run | with tone | 12 s of silence | tone back |
|---|---|---|---|
| input connected | **0.25804** / **0.19977** | 0.06386 / 0.05186 | 0.17079 / 0.17132 |
| **control: input not connected** | **0.00000** | 0.00000 | 0.00000 |

(two independent runs of the connected case; grains fired 4–5 per window in
*both* arms, which is why a grain count is not evidence of anything — see §3.)

The silent middle does not fall to zero because a granulator keeps replaying
its ring: `buflen 4` s of window out of a 60 s ring. It decays (0.25804 →
0.06386) and recovers, which is what a granulator reading live material does.
The disconnected control is the arm that reads exactly 0.00000 throughout.

### 1.4 The engine adds zero blocks of delay

The instrumented worklet recorded, for each probed block, the RMS of *this*
block's incoming channel 0, the RMS of the *previous* block's, and the RMS of
scsynth's output bus read immediately after `clockwork_tick()` returned:

```
out 0.127402  thisBlock 0.127402  lastBlock 0.179459   sameAsThis ✓  sameAsLast ✗
out 0.155557  thisBlock 0.155557  lastBlock 0.113305   sameAsThis ✓  sameAsLast ✗
out 0.157870  thisBlock 0.157870  lastBlock 0.165162   sameAsThis ✓  sameAsLast ✗
…
sameAsThis 11 / 11    sameAsLast 0 / 11
```

A 220 Hz saw's per-block RMS wanders between 0.086 and 0.184, so the two
hypotheses are cleanly separated rather than coincidentally equal. **`In.ar`
sees the block the worklet has just written, in the same `process()` call.**
Engine-added input latency is 0 samples; everything else is
`AudioContext.baseLatency` + `outputLatency`.

---

## 2. What the input path actually does

### 2.1 The chain, top to bottom

1. `new AudioWorkletNode(ctx, 'clockwork-processor', { numberOfInputs: 1,
   numberOfOutputs: 1, outputChannelCount: [outputChannels] })`
   (`supersonic.js` @78358). `numberOfInputs: 1` — the input exists by
   construction; nothing has to be asked for.
2. `sonic.node` is a **frozen façade**; `sonic.node.input` is that
   `AudioWorkletNode`. Measured: `node instanceof AudioNode === true`,
   `numberOfInputs 1`, `channelCount 2`, `channelCountMode "max"`.
3. `loadWasm` carries `inputChannels: config.audio.inputChannels`, which the
   `SuperSonic` subclass sets to `scsynthOptions.numInputBusChannels`
   (default **2**). The worklet stores it as `this.inputChannels = t.inputChannels ?? 0`
   and passes it to `clockwork_init(sampleRate, 0, inputChannels, outputChannels, …)`.
4. `process(inputs, outputs)` — the branch that was in question:

   ```js
   let c = inputs[0]?.length || 0;
   if (c > 0 && exports.get_audio_input_bus) {
     let a = exports.get_audio_input_bus(), n = exports.get_audio_buffer_samples();
     if (a > 0) { … this.inputView = new Float32Array(S, a, n * E);
                  for (let m = 0; m < Math.min(c, E); m++)
                    this.inputView.set(inputs[0][m], m * n); }
   }
   let _ = exports.clockwork_tick(currentTime, i, c);
   ```

5. `In.ar(2)` / `In.ar(3)` read it. Bus layout is outputs first, so 0–1 are the
   hardware outputs and 2–3 the hardware inputs.

### 2.2 It executes, with these runtime values

Measured inside the worklet (instrumented copy, `/probe/worklet.js`):

| quantity | value |
|---|---|
| `c` (`inputs[0].length`) | **2** connected stereo · **1** connected mono · **0** not connected |
| `get_audio_input_bus()` | **312960** (stable across the whole run) |
| `get_audio_output_bus()` | **247424** |
| `get_audio_buffer_samples()` | **128** |
| `get_audio_num_input_buses()` | **2** |
| `get_audio_num_output_buses()` | **2** |
| `this.inputChannels` / `this.outputChannels` | **2** / **2** |
| `this.mode` | `postMessage` |
| engine metrics `audioInputChannels` | **2** (the wasm's own answer, via `getMetrics()`) |
| `engineWasmErrors` | **0** |

### 2.3 Nothing zeroes the input bus

Three reads of the same 1024 bytes in one `process()` call — before the
worklet's copy, after the copy, after `clockwork_tick()`:

```
pre 0.09223   mid 0.17257   post 0.17257   outBus 0.17257   incoming 0.17257
pre 0.18409   mid 0.10129   post 0.10129   outBus 0.10129   incoming 0.10129
```

`pre ≠ mid` — the bus still holds the *previous* block when the next one
starts, so no clear happens between ticks. `post == mid` — scsynth reads the
input bus and does not wipe it. `outBus == incoming` — the pass-through synth
produced exactly the material that was written.

`realTime: false` (the default) is **not** a problem. Run with
`scsynthOptions: { realTime: true, numInputBusChannels: 2 }`: `inWithTone
0.14935`, byte-identical to the default run. The `-nrt` in the wasm filename
refers to the build, not to a soundfile-driven input path; the host buffer is
the driver either way.

### 2.4 Upstream documents exactly this

`supersonic-scsynth@0.81.0` (npm registry README, section *Audio Routing →
Connecting Microphone Input*):

```js
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const micSource = audioContext.createMediaStreamSource(stream);
micSource.connect(supersonic.node.input);
// Audio flows through scsynth's input buses (bus 2+ by default)
// Use In.ar(2) in a synthdef to read the mic signal
```

and `numInputBusChannels?` — *"Hardware input channels. Default: 2 (stereo)."*
Repo: <https://github.com/samaaron/supersonic>. So `bootScsynth`'s
`input.connect(sonic.node.input)` is the supported API, not a discovered
back door.

---

## 3. So why did the original A/B read 0.00000?

Pappus was never configured. Same harness, same live input, Pappus started with
only `startPappusSynth()` + `report 1`, then `/s_get` asked the **server** what
each setting was:

```
amp 1   dens 0   report 1   inbusl 2   inbusr 3   outbus 0
mix 0   gain 0   thru 0     dry 0
```

and the worklet at the same moment read

```
c 2   incoming 0.11943   mid 0.11943   post 0.11943   outBus 0.00000
```

**The tone was on the input bus. Pappus fired 27 grains in 2.5 s. The output
bus was zero.** `mix`, `gain`, `thru` and `dry` at 0 mute a working granulator
completely.

Add `/grains/`'s own `setFixed()` — `mscanmode 2`, `msrc 2`, `mlock 0`,
`msos 0.6`, `mbuflen 4`, `amp 1`, `ingain 1`, `run 1`,
`gates [1,0,0,0,0,0,0,0]`, `gates2`, `probs`, `probs2` — plus `PATCHES[0]`, and
the same run reads **0.24659**.

⚠️ **A grain count is not evidence that a granulator is audible.** The muted run
fired 27 grains; the disconnected-input control fired 4–5 per window while
outputting exactly 0.00000. `SendReply` fires off the grain clock, which runs
whether or not there is material and whether or not the output stage passes
anything. Only a level at the output tells you.

### The general lesson

This is CLAUDE.md's *"measure the quantity in question, not one adjacent to
it"*, and it is the third instance in this codebase of the same shape:
`msrc 1`, `notes.gate`, and now `mix/gain/thru/dry`. **Pappus has at least four
independent ways to be silent while every visible step succeeds**, and the
diagnostic that separates them is not at the speakers — it is the input bus
RMS beside the output bus RMS, in the same block.

---

## 4. Two real fragilities found on the way

Neither bit in these runs. Both are worth knowing before someone debugs them
from the outside.

### 4.1 The input copy's view cache omits the buffer identity

The **output** branch re-creates its view when the wasm buffer object changes
(`E !== this.audioView.buffer`). The **input** branch does not — it keys only on
the bus pointer and the channel count:

```js
(!this.inputView || this.lastInputBusPtr !== a || this.lastInputChannels !== E)
```

Measured during the Pappus run: wasm memory grew from **73 400 320** to
**106 954 752** bytes across `/b_alloc`, and `this.inputView.buffer === B`
went **false** — a stale view, still 256 floats long over a 73 400 320-byte
buffer. It kept working (`mid == incoming` reading through the *new* buffer),
because the memory is `shared: true` and growing a shared wasm memory does not
detach the old view; the two objects alias the same pages.

The risk is that the whole branch is wrapped in `} catch {}` with no logging.
If that memory ever became non-shared, `set()` would throw on a detached
buffer, the `catch` would swallow it, and **live input would stop for ever with
no error anywhere** — indistinguishable from "the browser sends nothing".

### 4.2 `mode: 'sab'` cannot be used with what is vendored here

With COOP/COEP served (`crossOriginIsolated true`, `SharedArrayBuffer` a
function), `new SuperSonic({ mode: 'sab' })` fails at
`Error: OSC IN worker initialization timeout`. SAB mode wants
`workers/osc_in_worker.js` and `workers/osc_out_log_sab_worker.js`, neither of
which is under `demo/shell/vendor/`. This is not a live-input issue —
`postMessage` mode is what the repo runs and input works there — but "switch to
SAB for lower latency" is not a one-line change today.

---

## 5. The smallest working example

Nothing in the repo needs to change. This is the whole thing:

```js
import { bootScsynth } from '/shell/scsynth.mjs';

const ctx = new AudioContext({ sampleRate: 48000 });
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const mic = ctx.createMediaStreamSource(stream);

// bootScsynth does `input.connect(sonic.node.input)` — busses 2 and 3.
const eng = await bootScsynth({ audioContext: ctx, input: mic });

// any graph reading In.ar(2)/In.ar(3) now hears the microphone.
```

⚠️ **Feed the engine a STEREO node.** `AudioWorkletNode` defaults to
`channelCountMode: 'max'`, so a mono source gives `inputs[0].length === 1` and
only bus 2 is written — bus 3 stays silent, which halves what a
`In.ar(2) + In.ar(3)` graph hears (measured 0.07468 against 0.14935). Either
put a `ChannelMergerNode(2)` in front, or set
`node.channelCount = 2; node.channelCountMode = 'explicit'`.

⚠️ **A page feeding live input must not also run `PosSource` onto bus 2** —
`Out.ar` sums, and the result is two materials in one buffer that neither end
can describe. `demo/shell/scsynth.mjs` already says this.

And for Pappus specifically, the input is necessary and **not sufficient**: it
needs the `setFixed()` settings before it makes any sound at all.

---

## 6. Question 4 — the `/b_setn` alternative — is not needed

Asked for as a fallback; recording it so nobody prices it twice.

It would be **feasible but strictly worse**. 48 000 samples/s at one OSC float
per sample is ~192 kB/s of message payload plus OSC framing, pushed through the
`postMessage` ring the relay-rate work already showed is the narrow part
(`MSG_BURST 120`, `MSG_PER_SEC 60` on the *relay*, and this ring has its own
`messagesDropped` counter for the same reason). It would add at least one
buffer of latency against the **0 blocks** measured in §1.4, it would need
`Engine_Pappus.sc`'s `In.ar(inbusl, 1)` replaced with a `PlayBuf`/`BufRd`
against a wrap-around write pointer — i.e. a *different instrument* from the
board's, which is the precise claim `/grains/` exists to avoid making — and
SuperSonic rewrites `/b_alloc` into its own pointer command, so the buffer
plumbing is not plain scsynth either.

There is no reason to build it. The bus works.

---

## How this was measured

Scratchpad only; no repo file was modified (`demo/shell/vendor/clockwork_audio_worklet.js`
md5 `8222d0c49785a2302ea424d31c0d5b18`, unchanged).

- `pserver.mjs` — serves the repo like `demo/server.mjs`, plus `/probe/*` from
  the scratchpad, plus an **instrumented copy** of the vendored worklet at
  `/probe/worklet.js`. The patch is applied in node with exact-count guards
  (`split(needle).length - 1 !== 1` throws) and an output-length assertion, per
  CLAUDE.md's rule against `includes()` guards.
- `mkdef.mjs` — writes SCgf v2 synthdefs by hand, because nothing in this repo
  compiles SynthDefs: `posin` = `Out.ar(0, In.ar(2,2))`, `possine` =
  `Out.ar(0, SinOsc.ar(440)!2)` as the encoder's own control (it read 0.71007,
  which is a full-scale sine at the analyser), `posinout`.
- `decode.mjs` — parses the real `pappus-tiny.scsyndef` (64 733 of 64 733 bytes
  consumed, 169 constants / 281 params / 1467 ugens) and `possource.scsyndef`
  (4 508 of 4 508), which is what validates the encoder's format understanding.
- `run.mjs` / `drive.mjs` — the page code and a CDP driver with a PID-scoped
  profile, following `demo/verify.mjs`'s pattern.

Every claim above has a control that reads 0.00000 with one connection removed.
