# demo/shell/panel-screen.mjs

## header

The layout of the Pi's 0.96" OLED (`drawPanel`), shared by `rig/board/panel.mjs` on the device and `/devices/text/`'s simulated screen, both through `oled-ui.wasm`, so the tab and the panel make the same 1024 bytes. Its own small wasm wrapper rather than `pico.mjs`'s `createOledUi`, because importing `oled-view.mjs` or `pico.mjs` loads the Pico emulator (the vendored rp2040js, 216 KB) for a page that only draws.

Decided with the owner on 2026-10-15, one ask at a time: no header (*"its unreadable in small size"*); the keys down the right as on the module; ^ and v as matching pixel chevrons, not a caret and a v; no rules round the keys, a 14 px square that fills while held; * held lights every pixel (*"for testing"*). The simulator's lit ink `#40dcfa` was sampled from a photo of the real panel (lit text 51 to 79, 222, 250), unlit black.
