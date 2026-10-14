# Kit lessons: rt-keys.mjs

The long comments cut from `demo/shell/rt-keys.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-keys.md#<anchor>`.

<a id="header"></a>

## rt-keys.mjs, file header

demo/shell/rt-keys.mjs: the runtime of a `keys` node on /connect/
(node-runtime.mjs). Its face is the kit keyboard, C3 to A4 as on
/synth/keyboard/; what it plays leaves on keys:midi-out, what arrives on
keys:midi-in lights a key.

The first press on it starts the page's sound (plans/plan-connect-ui.md D4).
`pointerdown` is listened for as well as `onDown`, because the keyboard
decides a press two frames later and a context made there is outside the gesture.
