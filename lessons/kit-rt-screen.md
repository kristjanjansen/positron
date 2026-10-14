# Kit lessons: rt-screen.mjs

The long comments cut from `demo/shell/rt-screen.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-rt-screen.md#<anchor>`.

<a id="header"></a>

## rt-screen.mjs, file header

demo/shell/rt-screen.mjs: the runtime of a `screen` node on /connect/
(node-runtime.mjs). Its face is the kit's video panel; each frame it pulls a
picture from the runtime linked into screen:video-in (a camera, a shader)
and draws it contained, as /video/camera/ does. Unlinked, or with nothing
arriving, it shows the page's ground and counts nothing.
