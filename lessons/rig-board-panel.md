# rig/board/panel.mjs

## header

Asked 2026-10-15, after the screen and keys were wired: *"lets not do its ui yet, just a testing demo for patchbay"*. So the board draws only a message and the key labels, and the patchbay test page `/devices/text/` is the subject; the status screen in `plans/plan-pi-oled.md` §3.2 waits.

- Frames go out through `i2ctransfer` (i2c-tools), nine writes a frame (the address window, then one per page), async, because the same process streams audio. The plan's `oledpush` C helper (§2.1) is not built; this is enough for a message at human pace.
- The drawing is `oled-ui.wasm`, the firmware's `ui.c` compiled with no imports, the bytes the kit pages draw. `push.sh` ships it, since nothing imports it.
- Keys are `gpiomon` (gpiod 2.2.1, already on the board), 10 ms debounce, under `stdbuf -oL`: into a pipe gpiomon buffers its lines and a press sat in the buffer until the process ended. MEASURED 2026-10-15: two 30 s runs gave no event, the same run under stdbuf gave ^ and v down and up, about 230 ms apart.
- Measured by press the same day: K1 ^ (GPIO5), K2 v (GPIO6), K3 # (GPIO13), K4 * (GPIO26); the module pulls each line up and a press reads low (GPIO13 and 26 read high against the Pi's own pull-down at rest).
- `close()` turns the panel off (0xAE), so a stopped program does not leave a frozen picture that reads as alive. The owner saw exactly that at the end of a test and asked.

## live layout

Asked 2026-10-15: *"can we run simulator screen also in https://positron.studio/devices/text/ do develop it live? run local dev"*, then *"pushing to pi: find a way to keep it in sync perhaps?"*. The layout is `demo/shell/panel-screen.mjs` alone; the page's `web:oled` and the Pi's `pi-1:oled` both call its `drawPanel` through the same `oled-ui.wasm`. `panel.mjs` re-imports it under `?v=<mtime>` when the file changes, and `rig/board/panel-sync.mjs` copies it over on every save. MEASURED: save to `layout reloaded` on the Pi in about a second, the copy 270 to 310 ms. `push.sh` names the module and the wasm explicitly, because its import scan only finds a static `from '../../...'`: the first push without them left the board saying `no screen`.
The tab's copies are named as mirrors, `web:oled` and `web:keys` (asked: *"why can it not be a mirror of web:<name> pi:<name> ?"*), as `/synth/dots/` names its emulated Pico's screen `web:oled`.

## rings and the bus speed

The dot piano on the same screen (`/devices/dots/`, 2026-10-15): `screen.note` turns the panel to `rings.mjs`, the Pico firmware's rings generalised, and `panel.mjs` redraws every 66 ms while anything is alive, the whole 1024 byte frame in one i2ctransfer after the address window. MEASURED that day: 227 ms a frame on the Pi's default 100 kHz bus, 35 ms after `dtparam=i2c_arm_baudrate=400000` in `/boot/firmware/config.txt` and a reboot (the clock read back as 400000 from `/sys/bus/i2c/devices/i2c-1/of_node/clock-frequency`). Asked: *"can you fix i2c bus speed?"*. config.txt is edited by hand on the board, never by setup.sh (plan-pi-oled §2.5).

## screen-camera

The Pi's USB camera on its own OLED (`rig/board/screen-camera.mjs`, `/devices/camera/`, 2026-10-15), asked *"work with the demo when you take P's camera and output it into P's screen. It likely needs some new node types, etc."*

ffmpeg reads the camera at 320x240 by v4l2, crops the centre to 2:1 (`crop=iw:iw/2`), area scales to 128x64 and writes one grey byte a pixel (`-f rawvideo -pix_fmt gray`) at 12 frames a second. `demo/shell/dither-oled.mjs` stretches the picture's 2nd to 98th percentile to full scale (a one bit picture of a dim room is otherwise all dark) and packs it page major as the SSD1306 takes it: byte `(y >> 3) * 128 + x`, bit `y & 7`, bit 0 on top. `panel.mjs` `frame(bytes)` draws the 1024 bytes as they are (`mode: 'raw'`), and a frame that arrives mid draw collapses to the newest, the way every other mode does.

MEASURED 2026-10-15 on the Pi 4 with `testsrc2` in place of the camera (the C925e was not plugged in that afternoon: `lsusb` listed no Logitech and `findCamera` answered `no camera on this board`): 12.1 frames a second, ffmpeg 2.3 per cent of one core, node 1.5 per cent, the dither 0.40 ms a frame. A real camera adds the v4l2 read and a YUYV conversion at 320x240, not measured. The panel's own 35 ms a frame (one i2ctransfer for the window, one for the bytes) is the ceiling, about 28 a second; 12 leaves the bus half idle for the board's other traffic.

**Keyed, never in the open room.** `camera.mjs` says why there is no camera verb in `board.mjs`'s `handle()`: `studio-1` is tokenless and anybody can speak in it. A 128x64 one bit picture is still a picture of the room, so the screen camera follows the same rule. It opens its own socket to `<room>-cam` with `BOARD_CAM_KEY`, starts only on a `screen.camera { on: true }` heard there, and sends each frame there as `screen.frame { n, fps, b64 }` (1024 bytes base64, about 1.4 KB a message, 12 a second, so about 17 KB/s to every keyed socket). A frame is dropped rather than queued when the socket holds more than 256 KB.

**A lease, as the H.264 camera has.** A page renews every 5 s while it is visible; nobody renewing for 15 s (`LEASE_MS`) stops ffmpeg, as does the last `on: false` or the board losing the room. The screen then reads `camera off`.

**One camera, two readers, and the H.264 picture wins.** A USB camera streams to one reader. `screen-camera.mjs` refuses while `camera.running()`. The other way round needs no code: `camera.mjs`'s `begin()` SIGKILLs every `ffmpeg ... -f v4l2` it finds before it starts (`sweepStrayCameras`), which includes this capture, and a SIGKILL exit is reported to the page as *the camera was taken for the picture on /remote/circuit/*. The same sweep at the board's start clears an orphan of this capture.

A CSI camera (`rpicam-vid`) is refused in words: none is on this board, so nothing about its raw output was measured.

## screen-camera-dither

Ordered 4x4 Bayer rather than Floyd-Steinberg. Error diffusion gives the better still picture at 128x64, but every pixel's error moves its neighbours, so one count of sensor noise in a corner reshuffles the dots across the frame and a still scene shimmers at 12 frames a second. Bayer decides each pixel against a fixed threshold of its own, so a still scene stays still and only what moved changes, and it costs one comparison a pixel. The thresholds are `(t + 0.5) * 16` for `t` 0 to 15, so mid grey (128) lights exactly half the pixels, which `rig/board/screen-camera-test.mjs` checks along with black, white and where pixel (5, 10) lands.
