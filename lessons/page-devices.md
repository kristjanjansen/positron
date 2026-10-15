# demo/devices/

## screen

`/devices/screen/` (2026-10-15; `/remote/oled/` until the devices group was made that evening, asked *"oled is not a good name. i need a group for it"*): the Pi's OLED and keys as `pi-1:screen:value-in` and `pi-1:keys:value-out` in the page's own bay, the way `/remote/circuit/` draws the Circuit. Delivery into `oled:value-in` is a `board.ask({ type: 'oled.text' })`; a key on the Pi is a `panel.key` sent to the whole room, which the page puts on `keys:value-out`. Not in `boardGraph` yet, so another page does not see the panel; that and `bay.event` on the board are steps 5 and 6 of `plans/plan-pi-oled.md`.
