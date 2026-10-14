# Kit lessons: rt-shader-dither.mjs

The long comments cut from `demo/shell/rt-shader-dither.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-shader-dither.md#<anchor>`.

<a id="header"></a>

## rt-shader-dither.mjs, file header

demo/shell/rt-shader-dither.mjs: the runtime of a `shader-dither` node on
/connect/ (node-runtime.mjs): /video/shader/'s ordered dither
(dither-shader.mjs). A screen at the far end of its video-out pulls a
frame; it pulls one from whatever is linked into its video-in, dithers it at
the `size` arriving on value-in, and hands its canvas on.
