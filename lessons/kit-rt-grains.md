# Kit lessons: rt-grains.mjs

The long comments cut from `demo/shell/rt-grains.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-grains.md#<anchor>`.

<a id="header"></a>

## rt-grains.mjs, file header

demo/shell/rt-grains.mjs: the runtime of a `grains` node on /connect/
(node-runtime.mjs): /granulator/grains/'s grain ring (grain-ring.mjs
`createRingEngine`), on scsynth in the page's one context. What arrives on
grains:audio-in is written round its eight second ring; its grains leave on
grains:audio-out, and every grain the engine reports is counted.

<a id="suspended"></a>

## rt-grains.mjs, start(): boot once the context runs

Reported 2026-10-15 in the device log of an end to end run of /connect/ (device 1291ae):
`the granulator did not come up: the ring buffer was not allocated`, 6.4 s after "granulate it"
built `web:grains:audio-out -> web:speaker:audio-in`, after the sampler and the synth had run.

The guess was a SuperCollider pool, one per runtime, or an allocation racing the pool's grow as
the sampler's did (lessons/page-code.md#sc-sampler-pool). MEASURED 2026-10-15 with canned
answers and no model, headless Chrome: keys and the synth, one key, then "start new", then
grains. The context read `running` after the key and `suspended` after start new, because the
last runtime closing releases the page's one context (node-runtime.mjs `audio.release`, and
audio.mjs suspends a context nobody holds). The grain ring then booted into the suspended
context: `SuperCollider up in 517 ms`, then `did not answer /notify within 1 s`, then the ring
buffer not allocated at the 5 s timeout. A suspended context pulls no worklet, so nothing the
engine is sent is ever answered. NEGATIVE CONTROL, the same run without start new: the context
stayed `running` and `the granulator up 564 ms after Play`.

So the engine waits for the context's `statechange` to `running` (a key press, the drum
machine's Play), says `the granulator starts with the sound` meanwhile, and a runtime closed
while waiting boots nothing.
