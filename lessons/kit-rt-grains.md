# Kit lessons: rt-grains.mjs

The long comments cut from `demo/shell/rt-grains.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-grains.md#<anchor>`.

<a id="header"></a>

## rt-grains.mjs, file header

demo/shell/rt-grains.mjs: the runtime of a `grains` node on /connect/
(node-runtime.mjs): /granulator/grains/'s grain ring (grain-ring.mjs
`createRingEngine`), on scsynth in the page's one context. What arrives on
grains:audio-in is written round its eight second ring; its grains leave on
grains:audio-out, and every grain the engine reports is counted.
