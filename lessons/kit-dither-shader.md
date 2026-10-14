# Kit lessons: dither-shader

The longer comments cut from `demo/shell/dither-shader.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-dither-shader.md#<anchor>`.

<a id="header"></a>

## `dither-shader.mjs` module header

```text
demo/shell/dither-shader.mjs: /video/shader/'s ordered dither as an engine,
a picture in and a picture out. Lifted 2026-10-14 from that page for
/connect/ (plans/plan-connect-ui.md slice 4, the convergence rule).

`draw(src, size, { out })` renders one frame of `src` (a playing <video> or
a canvas) into `canvas` and answers whether there was a picture to dither;
`out: false` clears to the page's ground, as a picture with no link out.
The WebGL2 context is made here; with none, the log says so and `draw`
does nothing.
```

<a id="fragment-shader"></a>

## `dither-shader.mjs` fragment shader

```text
Brightness per cell of uSize pixels, a little contrast, then one Bayer
threshold: below it the page's ground, above it warm off-white, which
leans toward --hi only in the brightest cells. Outside the contained
frame there is no input.
```
