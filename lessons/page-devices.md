# demo/devices/

## text

`/devices/text/` (2026-10-15; `/devices/screen/` for an hour, then text when the dots page joined it; `/remote/oled/` until the devices group was made that evening, asked *"oled is not a good name. i need a group for it"*): the Pi's OLED and keys as `pi-1:screen:value-in` and `pi-1:keys:value-out` in the page's own bay, the way `/remote/circuit/` draws the Circuit. Delivery into `oled:value-in` is a `board.ask({ type: 'oled.text' })`; a key on the Pi is a `panel.key` sent to the whole room, which the page puts on `keys:value-out`. Not in `boardGraph` yet, so another page does not see the panel; that and `bay.event` on the board are steps 5 and 6 of `plans/plan-pi-oled.md`.

## dots

`/devices/dots/` (2026-10-15), asked *"next is dot piano renderer but jsut have a sample score with piano roll. based on devices/screen"* and *"lets generalize from pico"*. The renderer is `demo/shell/rings.mjs`, the Pico firmware's rings (`rig/pico/rings/main.c`) with its constants kept: C3 to G4 on radii 4 to 28, 0.7 rad/s, a 3 s fade as thinning. The score is the Ode to Joy theme over C3 and G3, played by a deck through `web:score:midi-out`, linked to `pi-1:screen:midi-in` (the board's `screen.note`) and `web:screen:midi-in` (the same rings in the tab). The piano roll is a `spans` lane with `slots` set to the twenty pitches and `slotOf` by pitch, so it is the kit's strip with no new component; it is fitted after the strip has a width, or it opened on 25 s for a 9 s score.
