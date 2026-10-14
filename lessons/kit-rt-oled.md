# Kit lessons: rt-oled.mjs

The long comments cut from `demo/shell/rt-oled.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-oled.md#<anchor>`.

<a id="header"></a>

## rt-oled.mjs, file header

demo/shell/rt-oled.mjs: the runtime of an `oled` node on /connect/
(node-runtime.mjs): a 128x64 panel (oled-view.mjs), drawn with what arrives
on oled:video-in. A frame comes only along a link, from the runtime at its
other end (a Pico); unlinked, the panel keeps its last picture and counts nothing.
