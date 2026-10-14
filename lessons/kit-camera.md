# Kit lessons: camera

The longer comments cut from `demo/shell/camera.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-camera.md#<anchor>`.

<a id="header"></a>

## `camera.mjs` module header

```text
demo/shell/camera.mjs: this tab's camera, started and stopped by a person.
Lifted 2026-10-14 from /video/camera/ and /video/shader/, which carried it
line for line, for /connect/ (plans/plan-connect-ui.md slice 4, the
convergence rule). /video/recorder/, /video/webrtc/, /video/llhls/,
/video/moq/ and /drums/camera/ still carry their own copy.

🔴 NOTHING OPENS UNTIL `start()`, WHICH IS A PERSON'S PRESS. The device list
is read after the first start, because labels are empty before the camera
has been allowed. Every track is stopped on `stop()`.

A page keeps what is its own in `onOn` and `onOff`: its labels, its frame
loop, its patchbay. The element is `video`, what a screen or a shader reads.
```
