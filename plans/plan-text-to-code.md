# plan-text-to-code: a sentence writes the program, not just the patch

Status (2026-10-15): open. A plan only. No page, node, worker route or board
file was changed, nothing was deployed, nothing was sent to the Pi.

> Asked 2026-10-15: *"do resraech of text input generatinv visual shaders,
> faust or supercollider code"*. On /connect/
> (https://positron.studio/connect/) a sentence already becomes patch links
> through the wish worker. The question here is whether a sentence can become
> the CODE a node runs (a fragment shader, a Faust DSP, a SuperCollider synth),
> delivered over a `program` link, and how well.

Marks. **MEASURED** means a command ran in this session and printed the
number. **READ** means it is in a file (path given) or a page (URL given).
**INFERRED** means reasoning on top of those, with the reasoning shown.

## 0. The answer

1. **Yes, and the hard part is already built.** All three targets have a
   compiler in reach that says *no* with a line number and keeps the last good
   program running: WebGL2 for GLSL, `demo/shell/sclang-lite.mjs` for the
   SuperCollider subset (in the tab AND on the Pi, same file), libfaust wasm for
   Faust. A model is one more author typing into a box that already refuses
   bad text safely. READ, §1.
2. **Shaders first.** GLSL is the target where a wrong answer costs nothing (a
   picture, no ears), the contract is smallest, prior art is strongest (a 2026
   benchmark: 90.8% compile across four hosted models; a GPT-4 system: under 3%
   failure after up to five retries), and the `program-in` port already exists
   on `web:shader` and `pi-1:shader`. READ, §1 and §4.
3. **Faust compiles easily and fails by being loud.** Eight programs written to
   the /code/faust/ contract compiled 8 of 8, and 2 of 8 came out clipping, one
   of them at **peak 29.9** (30 times full scale) from an innocent looking
   `pm.ks(..., gate)`. No limiter sits between a browser synth and the speakers
   today. MEASURED, §2.3; READ, §1.
4. **The SuperCollider subset is the bottleneck, and it says so well.** The
   same eight sounds written as ordinary SuperCollider compiled **0 of 8**
   through sclang-lite, **1 of 8** after mechanically unwrapping `SynthDef` and
   `Out.ar`. Written to the subset contract by this agent, which had just read
   the whitelist: **7 of 8**, and the miss was `.range`, the most common gap.
   Every refusal names what the subset does know, which is exactly what a retry
   needs. MEASURED, §2.3.
5. **What no model on Workers AI has done yet is any of it.** The existing
   `/wish` route forces a links-only JSON schema and cannot return code, so no
   Workers AI model was called (the brief allowed it only through an existing
   route). Every compile number here is ONE author, this agent (Claude Opus
   5.5), writing first shot. §6 is the measurement that replaces it.

## 1. What each target accepts today

### 1.1 GLSL, `web:shader` (/shader/mirror/, /video/shader/, /connect/) and `pi-1:shader` (/shader/remote/)

- **The language.** A fragment shader body compiled as GLSL ES 3.00 in the
  tab (`#version 300 es`, prepended) and ES 3.10 on the Pi; the body must be
  valid ES 3.00 and must not carry a `#version` line. READ,
  `plans/plan-audio-shader.md` §5.1, `rig/board/video.mjs:166-183`.
- **The contract the running program expects.** Uniforms `uT`, `uRes`,
  `uPrev` (the feedback texture) and `uSegments` (the knob), output `out vec4
  o`. A body that drops `uSegments` compiles and the knob drives nothing, which
  the page says. READ, `demo/shell/mirror-shader.mjs:12-36`,
  `demo/shader/remote/index.html:742`.
- **How code arrives.** As `{ of: 'program', source, at }` on a `program`
  link. `program` is a light medium in `bay.mjs` (*"a shader arrives whole as
  one message"*). On /shader/remote/ the code box is a node, `web:code`, whose
  `program-out` is held to both `web:shader:program-in` and
  `pi-1:shader:program-in`. READ, `demo/shell/bay.mjs:18-25`,
  `demo/shader/remote/index.html:618-668`, `demo/shell/nodes.mjs:93-96`.
- ⚠️ **On /connect/ the port is declared and not wired.** `nodes.mjs:192`
  gives `shader` an optional `program-in`, and `demo/shell/rt-shader.mjs`
  delivers only `value-in`. Its program reaches it only by a person typing in
  its code box. The `code` node is in `NOT_YET`
  (`demo/shell/node-runtime.mjs:49`). READ.
- **What validates it, and what a compile error does.** `build(text)` compiles
  and links; a failure returns `{ ok: false, error }` with the GL's own info
  log and the previous program keeps drawing. READ,
  `demo/shell/mirror-shader.mjs:94-125`. On the Pi, `video.shader` refuses a
  non-string, a body over **12,000** characters and any `#version` line, waits
  up to **1.5 s** for the renderer's verdict, and the renderer keeps the running
  picture when a body does not build. READ, `rig/board/video.mjs:170-183`.
- **The safety envelope.** WebGL is a sandbox for memory, so the remaining
  risks are a shader that is too slow (a long loop) and a lost context.
  ⚠️ No `webglcontextlost` handler exists anywhere in `demo/shell/` (grep, READ
  by absence) and no render watchdog was found in `rig/vis/v3dpipe.c` (grep for
  watchdog, timeout, stall, READ by absence). A pathological loop on the Pi
  stalls its one render thread, since the body is compiled on that thread
  (`v3dpipe.c:150`). INFERRED: the cost is a frozen picture, never damage.

### 1.2 SuperCollider, `web:collide` (/code/collide/, /connect/) and the Pi's collide engine (/remote/collide/)

- **The language.** Not sclang: a subset compiled to a SynthDef in the tab,
  one function `{ |freq = 220, amp = 0.2, gate = 1| ... }` returning a signal,
  knobs as `\name.kr(default, lag, spec: [min, max])`. **25 UGens**, not the 12
  the brief names (the grain ring and the echo added 13): SinOsc, Saw, Pulse,
  LFSaw, LFTri, LFNoise1, WhiteNoise, LPF, HPF, RLPF, Pan2, EnvGen, Impulse,
  Dust, TRand, Phasor, BufFrames, BufDur, In, BufWr, GrainBuf, SendReply,
  DelayC, LocalIn, LocalOut, plus `Env.adsr/perc/new` and `Mix`. Methods: `.neg
  .abs .squared .sqrt .midicps .sin .cos .tanh .dup` and `!`. Operators `+ - * /
  %`, left to right with no precedence, which is also real sclang's rule. No
  strings, no `~` variables, no `#[...]`. MEASURED (`Object.keys(UGENS)`), READ
  `demo/shell/sclang-lite.mjs:1-62,180-241`.
- **Tests.** `node demo/shell/sclang-lite-test.mjs`: **114 ok, 0 failed**.
  MEASURED.
- **How code arrives.** In the tab, only by typing: `rt-collide.mjs` compiles
  its code box through `compile-idle.mjs` and has no `program-in`; `nodes.mjs`
  gives `collide` `midi-in`, `value-in`, `audio-out` only. READ. To the Pi, as
  the board verb `sc.load` over the relay or the direct channel. READ,
  `rig/board/scollide.mjs:1-3, 501-516`.
- **What validates it.** `compile()` returns `{ ok: false, line, col,
  message }`, and every refusal names the alternatives (*"Pluck is not in this
  subset, which knows SinOsc, Saw, ..."*). The page plays the last good program.
  MEASURED §2.3, READ `demo/code/collide/index.html:145-170`.
- **The safety envelope on the Pi** is the strongest of the three. The board
  compiles the text itself with the same `sclang-lite.mjs` (no OSC from a
  browser), and refuses: text over **4,000** characters, more than **16**
  programs, more than **48** nodes, more than **64** blocks in one definition,
  new notes above **70%** CPU. Page programs sit in their own group ahead of a
  limiter at **0.49** per channel. READ, `rig/board/scollide.mjs:34-90, 159-168`.
  In the tab there is no limiter (grep for `DynamicsCompressor` and
  `createWaveShaper` across `demo/shell/` and `demo/code/`: nothing, READ by
  absence).

### 1.3 Faust, /code/faust/ (`fau` on /connect/ has no runtime yet)

- **The language.** All of Faust plus `stdfaust.lib` (53 `.lib` files),
  compiled in the tab by libfaust wasm: the compiler is **6,162,473 B**, its
  library data **2,406,429 B**, fetched on the first key press. A program
  declares `freq`, `gain`, `gate` and is played polyphonically, 8 voices. READ,
  `demo/shell/faust.mjs:1-30, 80-100`, `demo/code/faust/index.html:32-72`.
- **How code arrives.** By typing only. `fau` is in `NOT_YET` (*"its engine is
  a group module shaped for its own pages, which needs an adapter first"*),
  and its catalogue entry has no `program-in`. READ, `node-runtime.mjs:52`,
  `nodes.mjs:157-160`.
- **What validates it.** `faustCompile` throws with the compiler's message.
  A Faust program is a dataflow, so it cannot loop forever at run time; its
  risks are a huge `par()` that makes the compile slow, large delay lines, and
  level. INFERRED from the language. The audio runs in an AudioWorklet, which
  cannot reach the network or the page. No limiter. READ.

### 1.4 The Pi accepting code at all

The relay is tokenless except for `-cam` rooms: *"The relay has no
authentication, no routing and no sender identity, so the room name is the only
isolation this stack has"*. READ, `lessons/rig-board-io.md` (setup-room),
`workers/relay/src/index.js:1-29`. So anybody in `studio-1` can send
`video.shader` and `sc.load` TODAY. A model does not widen who can send code to
the board; it widens how much code arrives and how fast. The guards in 1.1 and
1.2 are what stand between that and the board, and they are about size,
counts, CPU and level, never about content.

## 2. Models

### 2.1 Workers AI, the catalogue read today

READ, https://developers.cloudflare.com/workers-ai/platform/pricing/ and the
model pages, 2026-10-15. Price per million tokens, input / output.

| model | in / out | why it is on this list |
| --- | --- | --- |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 0.293 / 2.253 | what /wish uses today; 24k context |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | 0.66 / 1.00 | the one code-specific model; 32k context |
| `@cf/moonshotai/kimi-k2.7-code` | 0.95 / 4.00 | code-specific, newer |
| `@cf/openai/gpt-oss-120b` | 0.35 / 0.75 | reasoning, 128k context |
| `@cf/openai/gpt-oss-20b` | 0.20 / 0.30 | cheaper sibling |
| `@cf/qwen/qwen3.8-27b` | 0.45 / 3.20 | 262k context, reasoning |
| `@cf/deepseek-ai/deepseek-v4-flash-0731` | 0.44 / 1.32 | 1M context |
| `@cf/zai-org/glm-4.7-flash` | 0.06 / 0.40 | cheap floor |
| `@cf/google/gemma-4-26b-a4b-it` | 0.10 / 0.30 | cheap floor |

Free allocation 10,000 neurons a day, then $0.011 per 1,000 neurons. READ.

### 2.2 Others

- **Claude through the SAME binding.** Since 2026-08-07 `env.AI.run()` takes
  third-party ids through AI Gateway with Unified Billing, no provider key in
  the Worker: `anthropic/claude-haiku-5.5` ($0.10 / $0.50 short context),
  `anthropic/claude-sonnet-5.5` ($2 / $10), `anthropic/claude-opus-5.5` ($4 /
  $20). READ, https://developers.cloudflare.com/ai-gateway/features/unified-billing/
  and the model pages under https://developers.cloudflare.com/ai/models/anthropic/.
  So trying Claude is a model id in the wish worker's allowlist plus prepaid
  credits, not a new secret. ⚠️ Credits are a paid external spend, so nothing
  here called it.
- **In the browser.** `plans/plan-browser-models.md` §7 already refused Chrome's
  Prompt API for /wish/ (desktop only, about 4 GB, five languages without
  Estonian, slower than the Worker for a short answer). Code generation does
  not change any of the three reasons. A WebGPU model (WebLLM and similar) was
  not investigated here; INFERRED that a 1 to 3B coder in a tab would fall
  below the hosted 30B class on rare languages, and it would be desktop GPU
  only. Not worth a slice before §6 says what the hosted models do.

### 2.3 What was measured, and by whom

No Workers AI model was called (§0.5). What was measured instead is the other
half: how often a program written to each contract gets through OUR
validators. **The author of every program is this agent, first shot, with no
compile before writing**, under the contract a system prompt would carry. Eight
sentences per language. The scripts are in the session scratchpad, not the
repository.

⚠️ This is a sample of one model at n = 8, written by an author who had just
read the subset's whitelist and wrote the checks too. It bounds what a
capable model told the contract can do; it says nothing about llama-3.3-70b.

**SuperCollider, through `sclang-lite.mjs`'s `compile()` in node.** MEASURED.

| set | compiled | what failed |
| --- | --- | --- |
| written to the subset contract | **7 / 8** | the wobble bass: `.range is not in this subset` |
| the same eight as ordinary SuperCollider (`SynthDef(...).add`, `Out.ar`) | **0 / 8** | 7 at `expected the { that opens the function`, 1 at the backtick of `Klank` |
| ordinary, after a mechanical unwrap of `SynthDef` and `Out.ar` | **1 / 8** | `.range` (2), `Pluck`, `Klank`, `Splay`, `Env.asr`, an array of arrays |

Compile time 0.2 to 2.7 ms per program. MEASURED. The gap list is the
subset's coverage of everyday SuperCollider: **`.range` / `.exprange` appeared
in 3 of 8 ordinary programs**, and it is a multiply and an add, so it is the
cheapest gap to close. `Splay`, `Pluck`, `Klank`, `FreeVerb`, `MoogFF`,
`LFNoise2`, `DetectSilence` and `Env.asr` were the rest.

**Faust, through the vendored libfaust in node** (the boot path of
`demo/resources/build-faust-aot.mjs`), each one rendered offline: middle C,
velocity 100, half a second, 8 voices, 48 kHz. MEASURED.

| sound | compile ms | RMS | peak | verdict |
| --- | --- | --- | --- | --- |
| warm pad | 68 | 0.032 | 0.095 | sounds |
| plucked string, `pm.ks(pm.f2l(freq), 0.5, gate)` | 49 | **28.25** | **29.92** | **clips, 30x full scale** |
| acid bass | 38 | 0.073 | 0.207 | sounds |
| bell | 15 | 0.289 | 0.727 | sounds |
| hi hat | 15 | 0.045 | 0.458 | sounds |
| wobble bass | 25 | 0.281 | **1.419** | **clips** |
| supersaw lead | 22 | 0.152 | 0.701 | sounds |
| organ | 14 | 0.264 | 0.482 | sounds |

**8 of 8 compiled, 6 of 8 a bounded non-silent half second.** The compiler
booted in 53 ms in node. The pluck is the shape the Faust documentation warns
about (*"wrong argument order in library calls that compile but implement
incorrect DSP"*, READ https://faustdoc.grame.fr/manual/llm/): the gate, held at
1, excites the string as a step and the waveguide rings at 30 times full
scale. **A compiler cannot catch it. An offline render can, in tens of
milliseconds.**

**GLSL, in headless Chrome's WebGL2 (SwiftShader)**, each body with
`#version 300 es` prepended, linked against the mirror's vertex shader, drawn
at 160 by 90 at two times. MEASURED.

| picture | compiled | luminance sd | change between frames | automatic verdict |
| --- | --- | --- | --- | --- |
| ocean waves | yes | 35.7 | 1.7 | alive |
| kaleidoscope of fire (uses `uSegments`) | yes | 20.4 | 23.3 | alive |
| pulsing dots | yes | 97.9 | 37.7 | alive |
| aurora | yes | 55.6 | 14.1 | alive |
| tunnel | yes | 99.6 | **0.0** | flagged, falsely |
| pastel plasma | yes | **2.5** | 44.7 | flagged, falsely |
| rain on a window (uses `uPrev`) | yes | 16.2 | 2.4 | alive |
| rotating checkerboard | yes | 127.5 | 129.2 | alive |

**8 of 8 compiled.** Both flags are the checker's fault, read off the code:
the tunnel's pattern repeats every 0.25 of `uT`, and the two sample times 1.0
and 2.5 are 6 periods apart; the plasma varies in hue at nearly constant
luminance. ⚠️ So a liveness check must sample at incommensurate times and
measure per channel, or it refuses good pictures. The Chrome process exited by
itself (`--dump-dom`) and `pgrep -fl "Google Chrome.*--headless"` printed
nothing afterwards.

**Sizes.** SC 208 to 376 characters (mean 310), Faust 181 to 404 (mean 329),
GLSL 349 to 722 (mean 473). All far under the Pi's 4,000 (SC) and 12,000
(GLSL) caps. MEASURED. INFERRED at about 4 characters a token: 60 to 200
output tokens per program.

### 2.4 Cost per request

INFERRED arithmetic from §2.1 and §2.2 prices. One attempt is about 1,000
input tokens (the contract, the current program, the sentence) and 250 output
tokens; the SC contract with its UGen table is nearer 2,000 input.

| model | one GLSL attempt | notes |
| --- | --- | --- |
| glm-4.7-flash | $0.00016 | |
| gemma-4-26b | $0.00018 | |
| claude-haiku-5.5 | $0.00023 | needs credits |
| gpt-oss-120b | $0.00054 | plus its reasoning tokens at $0.75/M |
| llama-3.3-70b | $0.00086 | today's /wish model |
| qwen2.5-coder-32b | $0.00091 | |
| kimi-k2.7-code | $0.00195 | |
| claude-sonnet-5.5 | $0.0045 | needs credits |
| claude-opus-5.5 | $0.009 | needs credits |

With a cap of three attempts the worst case is about three times the row.
Every Workers AI row is under a tenth of a cent a picture. **Cost does not
decide this; quality and latency do**, the same conclusion
`research/cf-models-speech-to-patch-2026-09-21.md` §4 reached for patches.

## 3. The loop

1. **Generate.** The worker gets `{ language, text, current, contract }` and
   returns the source as one string. A JSON schema with ONE string field is
   safe; a union schema is not: an `anyOf` per transform took the 70B from
   **1.6 s to 10.2 s** and made it loop (MEASURED 2026-09-21,
   `research/cf-models-speech-to-patch-2026-09-21.md` §7.2). Do not try to
   express a grammar in JSON schema.
2. **Adapt mechanically, and say so.** Cheap rewrites before the compiler,
   each one reported like `relabel`'s `fixed` list
   (`workers/wish/src/wish.mjs:150-176`):
   - GLSL: strip a `#version` line; map Shadertoy names (`iTime` to `uT`,
     `iResolution` to `uRes`, `mainImage(out vec4 fragColor, in vec2
     fragCoord)` wrapped by a `main`). INFERRED: Shadertoy is the corpus these
     models learned GLSL from (READ, the 44k render passes of
     https://huggingface.co/datasets/Vipitis/Shadertoys), so this is the most
     likely first-shot miss. Unmeasured.
   - SC: unwrap `SynthDef(\x, ...).add` and `Out.ar(out, X)`. MEASURED above to
     move 0 of 8 to 1 of 8, so it is necessary and far from sufficient.
3. **Compile locally, in the tab, before anything plays.** GLSL `build`,
   `sclang-lite` `compile`, `faustCompile`. 0.2 to 68 ms per program MEASURED
   (Faust's first press also fetches the 6.2 MB compiler).
4. **Check that it does something, before it reaches a speaker or a screen.**
   - Audio: an offline render of half a second; refuse NaN, refuse peak above
     1, refuse silence. This is the check that caught the pluck. Faust has
     `createOfflineProcessor` (used above); for SC in the tab an
     OfflineAudioContext render is INFERRED to work and is unmeasured.
   - Picture: two frames at incommensurate times, per channel variance and
     frame difference, as the corrected §2.3 rule says.
5. **On failure, feed the error back.** The second request carries the
   source and the compiler's message. sclang-lite's messages already list the
   alternatives, which is what a retry needs. **Cap at three attempts**, the
   same as Incant Audio (READ, https://github.com/Losera/incant-audio); AI
   Co-Artist uses five (READ, https://arxiv.org/html/2512.08951v1).
6. **The last good program keeps running** throughout. Every target already
   does this (§1).

**How a failure is said.** One line in the page's log, in words, with the
compiler's own line kept: *"the picture did not change: three tries did not
compile, the last said 'undeclared identifier iTime' at line 4. The old
shader keeps running."* And for the render check: *"it compiled and was
refused before it reached the speakers: half a second of it peaked at 29.9
times full scale."* The text stays in the code box, so a person can fix it by
hand, which is the page's normal way of working.

**Latency budget.** MEASURED for patches: the 70B took 1.6 s for 52 output
tokens. A program is 60 to 200 tokens (§2.3), so INFERRED 2 to 6 s on the same
model, unmeasured. Compile and check add under 0.1 s after the first Faust
fetch. **Target: a first picture or sound within 5 s of the press at the
median, and give up at three attempts or 15 s**, whichever comes first. A
reasoning model (gpt-oss, qwen3.8) may spend its budget thinking; §6 measures
it rather than assuming.

## 4. Prior art

READ, 2026-10-15. None of it was run here.

- **Shader Spec Eval** (https://github.com/Husienvora/shader-spec-eval):
  visual specifications to GLSL, rendered headlessly and checked against
  measurable properties (repetition, symmetry, radius, colour, edges,
  animation). Frozen run, temperature 0.7, 10 seeds: **90.8% compiled, 67.5%
  met every property.** Qwen3-coder 100% / 79%, Gemini-3.7-flash 92% / 75%,
  Grok-4.5 99% / 66%, Kimi-k2.7-code 73% / 51%. ⚠️ Kimi-k2.7-code is on Workers
  AI and was the weakest of the four. This is the evaluation shape §6 copies.
- **AI Co-Artist** (https://arxiv.org/html/2512.08951v1): GPT-4 evolving
  shaders, compiled in WebGL in an off-screen sandbox before a person sees
  them, up to five retries, then a base shader. **Under 3% compile failure
  after retries.** Novices made 4.2 shaders against 0.6 in Shadertoy.
- **ShaderEval and the Shadertoys datasets**
  (https://huggingface.co/datasets/Vipitis/Shadereval-inputs): 467 function
  completions; the de facto shader code benchmark, about completion, not about
  text to picture.
- **14islands** (https://www.14islands.com/journal/ai-generated-glsl-shaders):
  a prompt to fragment shader prototype; *"not all models will generate valid
  GLSL code all the time"*.
- **Faust's own LLM page** (https://faustdoc.grame.fr/manual/llm/): the loop
  is *"prompt, generated Faust, compile, inspect JSON/SVG, listen/measure,
  targeted correction, repeat"*; a `llms.txt` of the libraries; an MCP server
  (https://github.com/sletz/faust-mcp); its list of failure modes (invented
  library functions, wrong arities, unsafe `~` feedback, ranges that clip or
  self-oscillate, argument orders that compile and are wrong). No success
  rates.
- **Incant Audio** (https://github.com/Losera/incant-audio): text to a VST3
  effect or synth through Faust, JIT through libfaust and LLVM, swapped without
  a dropout; compiler stderr fed back **up to 3 repair retries**; a fixed 64
  slot parameter pool. The closest existing thing to the audio half of this
  plan.
- **ai-faust-dsp-effects** (https://github.com/ALH477/ai-faust-dsp-effects):
  Faust effects generated by several models, as training data.
- **SuperCollider.** No benchmark or project found. The scsynth forum, June
  2023: ChatGPT's SuperCollider was *"full of errors. Not huge ones. Minor
  stuff"*, and it *"knows the API quite well"* but *"is really bad with
  supercollider"* (https://scsynth.org/t/supercollider-and-chatgpt/7802). A
  KVR thread the same year (https://www.kvraudio.com/forum/viewtopic.php?t=592656)
  reports help-file examples returned instead of new SynthDefs. Old models; no
  number since.
- **Live coding neighbours.** Text to Strudel exists in several forms
  (https://github.com/KimDaehyeon6873/text-to-strudel,
  https://github.com/phildougherty/strudel-mcp-bridge). Patterns, not DSP.

What nobody has, read across all of it: the generated program as a node's
input in a patch, the same program running in a tab and on a board in another
building, and a validator that is ALSO the board's own compiler.

## 5. How it fits the patchbay

### 5.1 The node

A **`writer`** node (kind `person`, the same kind as `code`), with one
`program-out` whose shape is `{ of: 'glsl' }`, `{ of: 'sclang' }` or
`{ of: 'faust' }`, and a face that is a sentence box plus the code it wrote.
Its output event is exactly the code box's: `{ of: 'program', source, at }`
(`demo/shader/remote/index.html:734`). So a model is not a new mechanism; it is
another way of filling `web:code`. The bay's shape check refuses a `sclang`
program into a `glsl` port before anything compiles. INFERRED from
`nodes.mjs`'s `shape: { of: 'glsl' }` pattern.

What has to exist first, READ from §1:

| target | today | missing |
| --- | --- | --- |
| `web:shader` | runtime, code box, `program-in` declared | a `program-in` delivery in `rt-shader.mjs` (a few lines: `shader.build(e.source)` and set the code box) |
| `pi-1:shader` | `program-in` wired on /shader/remote/ | nothing on the board |
| `web:collide` | runtime, code box | a `program-in` port in `nodes.mjs` and its delivery; `.range` in sclang-lite; a limiter |
| `pi-1:collide` | `sc.load`, limiter, caps | a `program-in` on the board's graph node |
| `web:fau` | a page, no /connect/ runtime | the adapter `NOT_YET` names, a `program-in`, a limiter, the render check |

### 5.2 Consent

- **In the tab, the press is the consent.** On /connect/ today a typed or
  spoken sentence is built without a second confirm (`buildAsked`,
  `demo/connect/index.html:485-512`), and that is defensible for a shader in
  the tab: it can freeze a picture and nothing else. For sound, the render
  check of §3.4 plus a limiter is what makes the same rule safe.
- **The Pi is never written by a model directly.** The program runs in the
  tab first; reaching `pi-1` needs a separate person's press (*Send to the
  Pi*), AND the sentence rule /connect/ already has (`NAMES_PI`: a Pi link
  only when the sentence names the Pi, the studio or remote). Three reasons:
  the relay is tokenless (§1.4), so the page is the only gate the content gets;
  other people may be listening in `studio-1`; and the board has no render
  watchdog (§1.1).
- **What a model writes is shown before it plays.** It lands in the node's
  code box, so the person sees the text, and can edit it, which is the third
  wall of the patch research (a person) applied to code.

### 5.3 The self-check

The page's rule stands: a self-check asks the wish worker nothing (the
existing assert *"the self-check asked the wish worker nothing"*,
`demo/connect/index.html:1280`). Canned programs instead:

- a canned good shader is delivered on `program-in`, compiles, and the screen
  shows it (positive control);
- a canned bad shader is refused with the GL's line, the retry counter moves,
  and the previous picture keeps drawing (negative control);
- a canned clipping Faust or SC program is refused by the render check before
  `audio-out` carries it (negative control, and the reason the check exists);
- nothing reaches `pi-1` without a press.

### 5.4 Logging

The device log already takes `[typed]`, `[voice]`, `[pill]`, `[feedback]` and
`[page ...]` lines through `logAsk` (`demo/connect/index.html:403-511`). Add
`[code]`: the sentence, the language, the model, attempts, ms, tokens, the
final verdict (`ran`, `refused: <first line>`, `clipped`, `flat`), and the
source's length and hash. **Not the source itself by default**: the log is a
public URL (`pub.positron.studio/logs`) and a program can be long. The hash
lets a later session match a log line to a program a person saved.

## 6. What to measure, and how

No Workers AI model has written code here. The measurement, designed:

1. **An evaluation set, written before any model is compared**, as
   `research/cf-models-speech-to-patch-2026-09-21.md` §3 asked for patches. 30
   sentences per language: 10 plain (*"blue waves"*), 10 musical or visual
   vocabulary (*"a squelchy acid bass"*, *"a kaleidoscope that breathes"*), 10
   that the subset cannot say (*"a reverb"* in SC, a 3D raymarched scene), whose
   right answer is a polite refusal or the nearest thing. Some in Estonian.
2. **A runner with no deploy**: `demo/wish-local.mjs` already calls Workers AI
   with wrangler's OAuth session on this machine
   (`research/cf-models-speech-to-patch-2026-09-21.md` §7). A `--code` mode
   there, plus the three validators from §2.3 (node for SC and Faust, one
   headless Chrome for GLSL, closed in a `finally`).
3. **Models**: llama-3.3-70b (today's), qwen2.5-coder-32b, gpt-oss-120b,
   kimi-k2.7-code, glm-4.7-flash, gemma-4-26b; and claude-haiku-5.5 and
   claude-sonnet-5.5 through the same binding if the owner adds credits.
4. **Per answer**: compiled first shot, compiled within 3, render check passed,
   attempts, ms to the first good program, tokens.
5. **By a person**: the owner rates a blind sample by eye and ear, 1 to 5 for
   *does it look or sound like the sentence*. Shader Spec Eval's property
   checks are the automatic half of this; the ear has no automatic half.

Spend: 30 sentences, 3 languages, 3 seeds, 6 Workers AI models, about 1.5
attempts each, is about 2,400 calls at under $0.002: **under $5**, most of it
inside the free neurons on a quiet day. INFERRED from §2.4.

## 7. Recommendation

**Shaders first, on `web:shader` in /connect/, then the Pi's shader, then
SuperCollider, and Faust last.**

Why GLSL first:
- the harm of a wrong answer is a wrong picture;
- the port is declared, the runtime exists, the delivery is a few lines;
- the contract fits in a short prompt, and the Shadertoy adapter is mechanical;
- the outside evidence is the strongest (§4), and the Pi already takes the
  same body, so the second step is a press, not a port.

Why SuperCollider second and not Faust: `collide` already runs on /connect/
and on the Pi with the strongest guards of the three, and sclang-lite's errors
are the best retry material; `fau` has no /connect/ runtime at all. Faust is
the most expressive and the easiest to compile, which is precisely why it
needs the render check and a limiter before any model may touch it.

**The smallest slice:**
1. `workers/wish/src/wish.mjs`: a `/code` path in `handle()`, an allowlist of
   writing models, a GLSL contract generated from `mirror-shader.mjs`'s
   uniforms (never typed twice, the way the transform table comes from
   `bay.mjs`), one string field out, `max_tokens` about 1,000. Shared by the
   Worker and `wish-local.mjs` as `/wish` is.
2. `demo/shell/rt-shader.mjs`: deliver `program-in` to `shader.build` and set
   the code box.
3. A `writer` node with a sentence box and `program-out` `{ of: 'glsl' }`, on
   /connect/ only, with the loop of §3 (adapt, compile, check, retry up to 3).
4. The self-check controls of §5.3 and the `[code]` log line of §5.4.
5. Measure §6 for GLSL only before any audio target, and pick the model from
   the table rather than from this document.

What to look at when it ships: on https://positron.studio/connect/, link the
writer to the mirror shader, type *"slow blue waves"*, and the screen should
change within about 5 s with the new program in the shader's code box. A
sentence whose program fails three times leaves the old picture running and
says the compiler's line in the log.

## 8. What is not settled, and what would settle it

| unknown | how to settle |
| --- | --- |
| how any Workers AI model does on code (every compile number here is one author) | §6 |
| how well, by eye and ear, which no compiler measures | the owner's blind rating in §6.5 |
| latency for a 60 to 200 token program on each model | §6, from a browser on this desk, the way §7.1 of the speech research timed Whisper |
| whether the Shadertoy adapter moves first-shot compile | §6 with the adapter on and off |
| what a pathological shader does to the tab (context loss) and to the Pi (a stalled render thread) | one deliberate `for` loop of 1e8 in `/shader/mirror/` locally, and on the Pi only with the owner present |
| whether an OfflineAudioContext render of a sclang-lite SynthDef is cheap enough as a check in the tab | one timing on /code/collide/ |
| whether sentences in Estonian write as well as English ones | 10 of the 30 in §6.1 |
| whether `.range` in sclang-lite is enough, or Splay and a reverb are the next real gaps | the SC run of §6 counts refusals by name |

## 9. Cost of this investigation

Reading: the six plans and research files named in the brief, the shader,
collide and Faust runtimes, `sclang-lite.mjs`, the board's shader and collide
handlers, the relay header, the wish worker, /connect/'s ask path. Measuring:
one sclang-lite test run, 24 programs written and compiled (8 per language),
8 Faust renders, one headless Chrome run, all local, zero external API spend.
Searches: Cloudflare's documentation, and the web for §4.

## 10. Slice 2, built 2026-10-15: a sentence writes a SuperCollider synth (/code/write/)

Built locally, not committed, not deployed. Page: `demo/code/write/index.html`.

- **One loop for both languages.** `demo/shell/code-writer.mjs` (`writeLoop`) asks, adapts, tries and
  judges; `glsl-writer.mjs` and the new `sclang-writer.mjs` hand it an adapter, a trial and a judge.
  /shader/write/'s self-check is 15/15 on the shared loop, `glsl-writer-test.mjs` 36/36 unchanged.
- **The contract is sclang-lite's own tables** (`sclangContract()`: every UGen with its arguments and
  defaults, the Env methods, the methods, minus `NOT_FOR_KEYS`, the eight buffer and bus UGens a key
  cannot use). Examples only on a retry or a revision, as GLSL.
- **`.range` and `.exprange` are in sclang-lite**, read off UGen.sc: bipolar unless the class says
  unipolar (Impulse and Dust in the subset); `.range` is the MulAdd, `.exprange` a bare `LinExp`.
  The Pi compiles the same file and needs a push to have them.
- **Safety before sound.** Every answer that compiles plays one held note (middle C, velocity 100,
  0.5 s) on a second scsynth in the page's context wired to no speaker (`sclang-trial.mjs`); NaN, a
  peak above 1 and a peak under 0.001 are refused and never sent on program-out. The page's output
  runs through a compressor and a hard clip at -1 dBFS (0.891). MEASURED: a program peaking at 5.09
  was refused three times; the same program handed straight to program-in left the limiter at 0.8913.
- **A copy of the contract's shape is refused** before any render: qwen3-30b answered the shape
  unchanged for 9 of 10 sentences in the first run, and every compile and sound number called it a
  success.

**MEASURED, ten sentences per model through the real page against `node demo/wish-local.mjs`**, second
run (after the copy refusal and a `60.midicps` fold in the adapter), first run in brackets:

| model | first-shot compiled | compiled within 3 | sound check passed | mean attempts | ms median | ms max | tokens median | distinct programs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gpt-oss-120b (low effort) | 8/10 (8) | 10/10 (10) | **10/10 (10)** | 1.2 | 9408 | 17434 | 1787 | 10 of 10 |
| qwen2.5-coder-32b | 7/10 (9) | 10/10 (9) | 9/10 (9) | 1.4 | 6299 | 18013 | 1342 | 9 of 9 |
| kimi-k2.6 (thinking off) | 7/10 (6) | 9/10 (9) | 8/10 (9) | 1.4 | 8300 | 18620 | 1397 | 8 of 8 |
| qwen3-30b-a3b-fp8 | 10/10 (10) | 10/10 (10) | 10/10 (10) | 1.3 | 2648 | 4024 | 1309 | 9 of 10 (2 of 10) |

Default for `lang: 'sclang'` is gpt-oss-120b (`CODE_DEFAULT` in wish.mjs): 20 of 20 ran, distinct,
and the most worked programs read (a kick with a pitch envelope and a noise click). qwen3-30b is
fastest but, even after the copy refusal, mostly swaps one oscillator in the shape. Not settled: how
any of it sounds, which needs an ear (section 6.5). Both runs cost about $0.10 in total.
