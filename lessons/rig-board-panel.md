# rig/board/panel.mjs

## header

Asked 2026-10-15, after the screen and keys were wired: *"lets not do its ui yet, just a testing demo for patchbay"*. So the board draws only a message and the key labels, and the patchbay test page `/devices/screen/` is the subject; the status screen in `plans/plan-pi-oled.md` §3.2 waits.

- Frames go out through `i2ctransfer` (i2c-tools), nine writes a frame (the address window, then one per page), async, because the same process streams audio. The plan's `oledpush` C helper (§2.1) is not built; this is enough for a message at human pace.
- The drawing is `oled-ui.wasm`, the firmware's `ui.c` compiled with no imports, the bytes the kit pages draw. `push.sh` ships it, since nothing imports it.
- Keys are `gpiomon` (gpiod 2.2.1, already on the board), 10 ms debounce, under `stdbuf -oL`: into a pipe gpiomon buffers its lines and a press sat in the buffer until the process ended. MEASURED 2026-10-15: two 30 s runs gave no event, the same run under stdbuf gave ^ and v down and up, about 230 ms apart.
- Measured by press the same day: K1 ^ (GPIO5), K2 v (GPIO6), K3 # (GPIO13), K4 * (GPIO26); the module pulls each line up and a press reads low (GPIO13 and 26 read high against the Pi's own pull-down at rest).
- `close()` turns the panel off (0xAE), so a stopped program does not leave a frozen picture that reads as alive. The owner saw exactly that at the end of a test and asked.

## live layout

Asked 2026-10-15: *"can we run simulator screen also in https://positron.studio/devices/screen/ do develop it live? run local dev"*, then *"pushing to pi: find a way to keep it in sync perhaps?"*. The layout is `demo/shell/panel-screen.mjs` alone; the page's `web:oled` and the Pi's `pi-1:oled` both call its `drawPanel` through the same `oled-ui.wasm`. `panel.mjs` re-imports it under `?v=<mtime>` when the file changes, and `rig/board/panel-sync.mjs` copies it over on every save. MEASURED: save to `layout reloaded` on the Pi in about a second, the copy 270 to 310 ms. `push.sh` names the module and the wasm explicitly, because its import scan only finds a static `from '../../...'`: the first push without them left the board saying `no screen`.
The tab's copies are named as mirrors, `web:oled` and `web:keys` (asked: *"why can it not be a mirror of web:<name> pi:<name> ?"*), as `/synth/dots/` names its emulated Pico's screen `web:oled`.
