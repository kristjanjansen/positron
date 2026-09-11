# rig/vis — what the board can draw

Three small C programs that produced every number in `plan-visuals.md` §3.
⚠️ **They were written into `/tmp` on the board and were one reboot from gone.**
A measurement whose instrument cannot be rebuilt is an anecdote, so they live
here now.

    scp rig/vis/*.c positron@<board>:/tmp/ && ssh positron@<board> '
      cd /tmp && gcc -O2 -o v3dbench v3dbench.c -lEGL -lGLESv2 -lgbm &&
                 gcc -O2 -o v3dpipe  v3dpipe.c  -lEGL -lGLESv2 -lgbm'

Needs `libgbm-dev libegl1-mesa-dev libgles2-mesa-dev` — about 19 MB, already on
the board.

## How it draws anything at all, with no screen

The board is headless: both HDMI ports are disconnected and there is no X
server, so the ordinary way in — a window, a swapchain — does not exist. The
DRM/KMS path fails outright (`glmark2-es2-drm`: *"Failed to find a suitable
connector"*), which is the wrong lesson to draw from, because it is about
finding a **display**, not about the GPU.

The way in is **EGL surfaceless over GBM on the render node**:

    open("/dev/dri/renderD128")      the GPU without a display attached
    gbm_create_device(fd)
    eglGetPlatformDisplay(EGL_PLATFORM_GBM_KHR, …)
    eglCreateContext(…)              no surface, no window, no connector
    glBindFramebuffer(…)             render into an FBO and read it back

That gets the **real `v3d` driver** — `V3D 4.2.14.0`, OpenGL ES 3.1, GLSL ES
3.10 — not a software rasteriser. Checking which one you got is not optional:
the software fallback is 218% of one core for half the work, and it renders
*faster than the real GPU* on a laptop, which is how a GPU test can pass while
measuring nothing (§5.1).

## The three programs

| | |
|---|---|
| `v3dbench.c` | fps for one shader at one size, `glFinish` per frame. The shader is a real generative pass — 8-segment kaleidoscope fold, three octaves of value noise, a domain-warp displacement, and a feedback tap from the previous frame — chosen because it is the thing being asked about rather than a synthetic fill. |
| `v3dpipe.c` | the whole chain: render → `glReadPixels` → raw RGBA on stdout. Pipe it into ffmpeg. Reports wall clock, fps and its own CPU split to stderr. |
| `v3dcompute.c` | GLES 3.1 compute shaders, which nobody here had checked the board for. They work: 262,144 particles integrated at 183 dispatches a second, verified by mapping the buffer back rather than by trusting the dispatch to have happened. |

## The numbers, and the one that matters

    ./v3dpipe 1280 720 900 1 | ffmpeg -f rawvideo -pix_fmt rgba -s 1280x720 \
      -r 30 -i - -pix_fmt yuv420p -c:v h264_v4l2m2m -b:v 2M -y out.h264

**29.6 fps at 720p for 30 s, alongside the running instruments, zero audio
dropouts** — 18.6% user + 14.0% sys of 400%, 79 MB, `throttled=0x0`.
`h264_v4l2m2m` is the board's **hardware** encoder on `/dev/video11`; the render
is 19.76 ms, the readback 8.21 ms, the write 5.81 ms.

Per frame at 720p: the generative pass is 18.31 ms (54.6 fps), three extra blur
passes cost ~5.7 ms each, and reading 3.7 MB back costs 7.59 ms — **486 MB/s**,
which is what makes the box-encodes-and-streams path viable at all.

**It is ALU-bound, not fill-bound.** The generative shader holds ~50 Mpix/s at
both 720p and 480p while a flat fill does ~400–460. The GPU is not running out
of pixels, it is running out of arithmetic — so **the lever is shader
complexity, not resolution.**

⚠️ **Set the CPU governor to `performance` before taking any number.** Not
mainly for the 6–13% it is worth, but because under `ondemand` two runs of the
same thing disagree by 7%: a GPU-bound workload does not look busy to a CPU
governor, so the clock it gets depends on whatever ran just before it. That is
how the first governor A/B in `plan-visuals.md` went wrong, and the mistake is
recorded there rather than quietly corrected.

🔴 **None of this works on a Pi 5.** Broadcom removed the H.264 block from
BCM2712 — encode *and* decode — and Raspberry Pi's own docs say the Pi 5 uses
software encoders whose latency "can sometimes be an issue for real-time
streaming applications". `plan-hardware` §4 recommends a Pi 5; for visuals that
is the wrong board.
