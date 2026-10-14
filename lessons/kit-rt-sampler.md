# Kit lessons: rt-sampler.mjs

The long comments cut from `demo/shell/rt-sampler.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-sampler.md#<anchor>`.

<a id="header"></a>

## rt-sampler.mjs, file header

demo/shell/rt-sampler.mjs: the runtime of a `sampler` node on /connect/
(node-runtime.mjs): /code/piano/'s SuperCollider sampler (code/sc-sampler.mjs)
in the page's one context, playing the Salamander piano and the Rhodes from
our own bucket. Notes and program changes in on sampler:midi-in, sound out
on sampler:audio-out.
🔴 A RECORDING IS FETCHED ONLY FOR A NOTE PLAYED, and only while a store is
linked into sampler:file-in; with none, a note says so and sounds nothing.
