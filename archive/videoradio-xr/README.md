# archive/videoradio-xr — the headset half of `/videoradio/`, retired 2026-09-16

Retired on instruction: *"arvhice videoradio vr, it did not worked out"*.

`xr-half.js` is the removed code, verbatim and in the order it stood in
`demo/videoradio/index.html`: the import, the `Run in VR` control, the row it
sat in, the session's own copy of the sea, the headless preview that graded it,
the `createXRPanels` options, the press that entered a session, and the two
asserts. `plan-videoradio-xr.md` is the plan it was built from.

**It is not a module and must not be imported.** Half of it closes over names
that exist only inside that page.

## What it was

The same picture the page draws in a window, on the ground, at arm's length in
every direction. Asked for as *"can we iplenent videoradio on vr? just on the
floor? as 'i am on a sea' fading out on all dirs?"*. Stage A of the plan: 46
solid wave fronts lit along their top 7 cm, with curtains that write depth, so a
wave behind a crest is behind something. Stage B, the displaced mesh with
skirts, was never written.

## What it cost, and what it bought

Three headset runs were spent on faults that were invisible from a laptop, and
each one is now a rule somewhere else in this repo rather than a thing to
rediscover:

- **`session.renderState.baseLayer` is null until the next animation frame.**
  Reading `framebufferWidth` one line after creating a session throws, the throw
  escapes the handler, and the render loop, the exit-on-any-button and the
  bail-out timer are all never registered. A live session, nothing drawing, no
  way out, no log line. In CLAUDE.md.
- **`window.requestAnimationFrame` does not fire in an immersive session.** The
  page's clock stopped, so the sea was a still photograph of the instant the
  session started. The session's own rAF drives it now, which is the `onFrame`
  line in the archived options.
- **The whole sea sat 3 cm under the floor**, which is why the grid and the
  controller showed through it: `(h - valley)` was borrowed from a shader whose
  picture has no ground to sink through.
- **`alpha: false` on the context makes passthrough impossible**, and
  `environmentBlendMode` rather than the session name is what says whether it
  composited. In CLAUDE.md.

The audio question it was blocked on was answered and that answer SURVIVES this
retirement: `/earshot/` measured on a real Quest that the `AudioContext`
survives an immersive session, the latencies do not move, `AudioDecoder` decodes
in there with zero errors, and 90.0 fps holds with the whole graph running. In
CLAUDE.md. Nothing about audio is why this was retired.

## Why it was retired

It was never run by anybody but its author. Its two asserts went through
`preview()` and opened no session, and they lived inside a page no harness may
open, so in practice the headset half was graded by hand on a device, three
times, and looked wrong each time in a different way. The window keeps the sea:
`makeSea()` stays in the page and draws under the picture, from the same shaders
and the same bytes, which is the one part of this that a reader can actually
see.

⚠️ **The standing full-screen fault is NOT this.** *"`/videoradio/` drops out of
full screen after 22 to 25 seconds"* was open before the headset work started
and is still open after it; 2026-09-16 named the likely cause as the station
changing under the page. It is in `BACKLOG.md` and has nothing to do with WebXR.
