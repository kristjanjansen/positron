# demo/shell/steps-oled.mjs

## header

A drum step pattern on the Pi's 0.96" 128x64 OLED, drawn through `oled-ui.wasm`'s calls from `drawPanel`'s `steps` mode, for `/devices/drums/` and the board's `screen.steps`. Written 2026-10-15.

Lit pixels on dark only. The owner, the same day, about the patch boxes: *"field boxes ... are quite unreadable because the light overwhelms the thin typography inside it. So if you can, do not do inverted boxes at all."* So no label is ever cut out of a fill: a lit 6x10 block is a step that is on and carries no text, the playhead's column draws its off steps as outlines, and the playhead itself is a bar in a lane under the grid, filled while playing and hollow (a cursor) while stopped. The row the keys edit is a small triangle left of its two letter label.

Geometry: labels at x 4 in the 5x7 font (two letters, ink to x 14), the grid from x 16 at a 7 px pitch, so step 16 ends at x 126; rows share 52 px (13 px pitch for four), the lane at y 56, beat ticks on the last line but one. An off step is a 2x2 dot on a beat and one pixel elsewhere, so the bar's four beats read without rules.
