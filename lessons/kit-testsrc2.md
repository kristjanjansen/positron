# Kit lessons: testsrc2.mjs

The long comments cut from `demo/shell/testsrc2.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-testsrc2.md#<anchor>`.

<a id="header"></a>

## testsrc2.mjs, file header

demo/shell/testsrc2.mjs: ffmpeg's `testsrc2`, drawn by a browser.

🔴 WHY IT EXISTS. Asked 2026-09-30: *"try to generate 1:1 same graphics +
timecode bar as in container ffmpeg examples"*. The container legs paint
`testsrc2` and then the burned clock over it; `/moq/` publishes from a canvas
and painted a flat field. This is the field it was missing, so a MoQ picture
and an LL-HLS or WHEP picture of the same instant look like one pattern.

🔴 `testsrc2` IS NOT A SPEC, IT IS A C FUNCTION, AND THIS IS A PORT OF IT.
Every line below is `test2_fill_picture` in FFmpeg's
`libavfilter/vsrc_testsrc.c`, read off master on 2026-09-30, with the
blend arithmetic from `libavfilter/drawutils.c` (`blend_pixel`,
`ff_blend_mask`). The integer arithmetic is kept, rounding included:
`av_rescale` rounds half away from zero, and the motion is a function of the
frame number and nothing else, so frame N here and frame N out of ffmpeg are
the same picture. What that claim is worth was MEASURED, not assumed: see the
note at `drawTestsrc2`.

⚠️ IT DRAWS INTO RGB, WHICH IS THE ONE FORMAT WHERE THE PORT CAN BE EXACT.
ffmpeg negotiates a pixel format per graph, and in a YUV one every rectangle
edge is rounded to the chroma grid and every colour goes through a matrix.
A canvas is RGB, so the comparison is against `format=rgb24`, where
`ff_draw_round_to_sub` is the identity.

⚠️ AND THE CORNER COUNTER IS COVERED, NOT DRAWN, BECAUSE THE CONTAINER COVERS
IT. `workers/pub/container/server.mjs` paints a 240x48 box over testsrc2's
own timecode and frame number (asked 2026-09-29 as *"rm top left
counters"*), red then green at the first bar edge since 2026-09-30. Drawing
the VGA font only to paint over it would be work nobody sees, so this paints
the same box and stops.

<a id="corner"></a>

## testsrc2.mjs, testsrc2Pixels, the corner box

── top left: testsrc2 prints a timecode and a frame number here ───────────
The container paints them out, so this paints the same box and draws no
text. `corner: false` leaves the bars showing instead.
Red then green, split at the first bar edge, as server.mjs paints it since
2026-09-30. It used to be black.

<a id="draw-testsrc2"></a>

## testsrc2.mjs, drawTestsrc2

Paint frame `frame` of testsrc2 into a 2d context, whole frame, opaque.

MEASURED 2026-09-30 against ffmpeg 9.0.1, `testsrc2=size=1280x720:rate=30,
format=rgb24` with the container's corner `drawbox`: **0 of 921,600 pixels
differ** at frames 0, 1, 37, 300, 1234 and 5000. The instrument can fail:
this port's frame 36 against ffmpeg's 37 differs in 64,758 pixels, and
leaving the corner uncovered differs in 11,520, which is 240 x 48.
⚠️ THAT IS THE SOURCE PICTURE, NOT THE PICTURE A VIEWER GETS. Both then go
through an encoder, and an encoder does not keep a single pixel exact.

Call `burn(ctx, w, h, frame, { field: false })` from `pattern.mjs` over it:
the burned clock's bed is opaque black, so nothing painted here can reach
the row `readBurned` decodes.
