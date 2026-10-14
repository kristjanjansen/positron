# Kit lessons: rt-rec.mjs

The long comments cut from `demo/shell/rt-rec.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-rec.md#<anchor>`.

<a id="header"></a>

## rt-rec.mjs, file header

demo/shell/rt-rec.mjs: the runtime of a `rec` node on /connect/
(node-runtime.mjs): /synth/recorder/'s recorder (note-recorder.mjs). What
reaches rec:midi-in while Record is on is taken; Play sends the same notes
out of rec:midi-out at the times they came. Its face is Record, Play and the
table of what was taken.
