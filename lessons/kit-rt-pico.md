# Kit lessons: rt-pico.mjs

The long comments cut from `demo/shell/rt-pico.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-pico.md#<anchor>`.

<a id="header"></a>

## rt-pico.mjs, file header

demo/shell/rt-pico.mjs: the runtime of a `pico` node on /connect/
(node-runtime.mjs): /synth/dots/'s emulated Pico (pico.mjs
`createPicoDevice`), the rings firmware on an RP2040 in a worker. Notes in on
pico:midi-in; every screen it draws leaves on pico:video-out, handed only to
the runtimes that link reaches (an OLED). Its face says what it is doing and
starts it; nothing is fetched before that press or the first note.
