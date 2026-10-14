# Kit lessons: rt-player.mjs

The long comments cut from `demo/shell/rt-player.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-player.md#<anchor>`.

<a id="header"></a>

## rt-player.mjs, file header

demo/shell/rt-player.mjs: the runtime of a `player` node on /connect/
(node-runtime.mjs): /granulator/'s recordings (grain-rig.mjs
`createSources`), decoded and looped into player:audio-out. Its face is
Play and the recording picker.
🔴 A RECORDING IS FETCHED ONLY ON PLAY, from our own bucket, and only from the
store linked into player:file-in; with none linked it says so and plays nothing.
