# Kit lessons: rt-sequencer.mjs

The long comments cut from `demo/shell/rt-sequencer.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-sequencer.md#<anchor>`.

<a id="header"></a>

## rt-sequencer.mjs, file header

demo/shell/rt-sequencer.mjs: the runtime of a `sequencer` node on /connect/
(node-runtime.mjs). Its face is /drums/machine/'s transport and step grid
(rt-drums.mjs); every step it plays leaves on sequencer:midi-out, and a whole
pattern arriving on sequencer:value-in sets the grid (a picture's squares on
/drums/camera/).
