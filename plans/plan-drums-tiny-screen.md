# plan-drums-tiny-screen: a drum machine on 128x64 pixels and four keys, from the basics up

Status (2026-10-15): open. Research and plan only. Nothing in `demo/`, `rig/` or `workers/` was changed, nothing was pushed to the Pi, built, deployed or committed.

> Asked 2026-10-15, verbatim in `BACKLOG.md` under `## Open`: *"do good reseach
> on drums on tiny screens. we need to build it up from basics"*.
>
> Every claim carries one label, the same set `plans/plan-pi-oled.md` uses:
>
> - **MEASURED**: measured by this repository, on the named machine, in the file
>   named or in this document. "MEASURED today" means on the Mac on 2026-10-15,
>   with the real `oled-ui.wasm` in node; **nothing in this document was measured
>   on the Pi**.
> - **READ**: a file in this repository (path), or an outside document (link),
>   read 2026-10-15. Outside pages were read through a summarising fetch or a
>   search result, so a number somebody builds on deserves one look at the raw page.
> - **INFERRED**: reasoning, arithmetic or general knowledge, checked by nobody.
>   Arithmetic says `(arithmetic)`.
> - **MEMORY**: what the author knows of a product and could not confirm from a
>   source today. Treat as a lead, not a fact.

---

## 0. Verdict

1. **Almost every drum machine keeps the pattern off the screen.** The TR family,
   the Volca, the Elektron boxes, the Circuit, the Polyend Play and the K.O. II
   show the pattern on lit keys or pads, one key per step, and use the small
   screen only for parameters (READ, section 1). The machines that draw the
   pattern on a screen and edit it with a few buttons are the Game Boy trackers
   (nanoloop, LSDj), the norns scripts and the DIY OLED boxes. **The Pi has four
   keys with no lights, so it belongs to the second family**, and its nearest
   relative is nanoloop: a 16 step pattern drawn on the screen, a cursor, two
   action buttons. Nanoloop has eight buttons. We have four, so we need one
   modifier key (Elektron's FUNC, the PO's held key) to get the missing gestures.
2. **What exists, `/devices/drums/`, draws well and edits badly.** The grid on
   the OLED reads (MEASURED today, the real frame dumped in section 3). But with
   the machine stopped, the only way to move the cursor is `#`, which also flips
   the step it leaves, so **a hit on step 9 cannot be placed without flipping
   steps 1 to 8 on the way** (READ, `demo/devices/drums/index.html`, `onKey`). And
   the pattern, the clock and the sound all live in the browser tab: the Pi's keys
   reach them over the relay and the screen comes back over it, so with no tab
   open the Pi's keys do nothing, and when the tab is hidden its
   `requestAnimationFrame` loop stops sending frames (READ; INFERRED for the
   browser behaviour).
3. **The first three rungs to build, in order** (section 4): (1) editing that
   works with four keys, a cursor that moves without editing, a status line, a
   chord for the track; (2) accent and mute, which changes the drum machine's data
   from on/off to a level and so is shared kit work, done once; (3) the board owns
   the pattern and the clock, so the Pi is a drum machine on its own and a tab is
   a mirror of it. Before (3), one cheap measurement: key to screen time on the
   real Pi.

---

## 1. Prior art: how others show and edit drums on small screens with few keys

### 1.1 The table

"Presses for one hit" is the cost of putting one hit on one step of the current
track, from the normal editing state.

| machine | screen | keys | pattern shown on | playhead | step level, accent | presses for one hit | source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TE Pocket Operator PO-12 | custom segment LCD, an animation and the bpm "in the upper right corner" | 16 step keys, sound, pattern, bpm, write, fx, play, 2 knobs | the LCD (how exactly: not in the guide) | not in the guide | none per step; "hold write while turning knob A or B" records knob motion | 1 in write mode | READ [PO-12 guide](https://teenage.engineering/guides/po-12/en) |
| TE OP-1 | AMOLED 320x160, colour, 60 fps | 24 keys, 4 encoders, function keys | depends on the sequencer: endless, finger, tombola, pattern | drawn | per sequencer | endless: play a key while holding shift, the sequencer moves on | READ [B&H review](https://www.bhphotovideo.com/explora/pro-audio/hands-review/teenage-engineering-op-1-portable-synthesizer) |
| TE EP-133 K.O. II | "super segment hybrid" LCD, 66 icons and digits | 12 pads, record, erase, shift, 2 knobs, fader | the pads light: "When a pad is recorded to a given step it will light up" | BAR, BEAT, STEP as three digits | velocity per step with shift and knobs | 2: "Hold (RECORD) and press a pad" | READ [TE guide](https://teenage.engineering/guides/ep-133/play-and-record), [timing map](https://www.spongefile.com/k-o-ii-ep-133-timing-map/) |
| Elektron Model:Samples | "128 x 64 pixel LCD screen" | 16 TRIG keys with LEDs, 6 pads, FUNC, 6 knobs | the 16 TRIG key LEDs; the screen shows bank and pattern, active track, pan, level, name | the LEDs; `<PATTERN PAGE>` LEDs, the playing page flashes | pads velocity sensitive; per track CHANCE 0 to 100 per cent, SWING 50 to 80 per cent | 1 in GRID RECORDING (enter with RECORD, track with TRACK + pad) | READ [manual OS 1.13](https://www.elektron.se/wp-content/uploads/2024/10/Model-Samples-User-Manual_ENG_OS1.13_241030.pdf), sections 6.1, 7.1, 8.3.2, 9.2.11, 9.2.12 |
| Elektron Digitakt | OLED 128x64 | 16 trig keys with LEDs, 8 knobs, page keys TRIG SRC FLTR AMP LFO | the trig keys | the keys | trig conditions, parameter locks | 1 | READ [Digitakt manual](https://www.elektron.se/wp-content/uploads/2024/09/Digitakt_User_Manual_ENG_OS1.51_231108.pdf), search summary |
| Polyend Tracker | 7" TFT, 800x480 | many | the screen, as a tracker | a row | per row columns | cursor and keys | READ [MusicTech review](https://musictech.com/reviews/hardware-instruments/the-big-review-polyend-tracker/) |
| Polyend Play | a small split screen (resolution not found) | an 8 by 20 pad grid, 128 sequencer pads | the pads, 8 tracks by 16 steps at once | the pads | per step, on the screen | 1 | READ [Sound On Sound](https://www.soundonsound.com/reviews/polyend-play), search summary |
| Novation Circuit (the one on this desk) and Circuit Tracks | none | 32 RGB velocity pads, 4 by 8 | the pads | a moving pad | Velocity View: "one of 16 Velocity values" shown on pads; probability; 6 micro steps between steps | 1 | READ [Circuit Tracks guide v3](https://fael-downloads-prod.focusrite.com/customer/prod/downloads/circuit_tracks_user_guide_v3_en.pdf), search summary |
| monome norns | OLED 128x64, **16 grey levels** (`screen.level` "0-15 (0=off, 15=white)") | 3 keys, 3 encoders | per script; cyrene puts the pattern on a monome grid and pages on the screen, E1 picks the page | per script | per script | per script | READ [screen API](https://monome.org/docs/norns/api/modules/screen.html), [cyrene](https://norns.community/cyrene) |
| Korg Volca Drum | none | 16 step buttons with LEDs, 6 parts | the step LEDs | the LEDs | ACCENT mode toggles accent, "while holding a step button, the LEVEL knob sets the amount of accent"; hold step + LEVEL sets probability; SLICE is a ratchet, up to 16 | 1 in EDIT/STEP | READ [Manuals+ owner's manual](https://manuals.plus/korg/volca-drum-digital-percussion-synthesizer-manual), [Sound On Sound](https://www.soundonsound.com/reviews/korg-volca-drum) |
| Roland TR-8S | a small display (resolution not found) | 16 TR-REC pads, BD to RC instrument buttons | the pads | the pads | ACCENT step mode on the pads; SUB step 1/2, 1/3, 1/4 | 1 | READ [TR-8S manual](https://static.roland.com/assets/media/pdf/TR-8S_eng03_W.pdf), search summary |
| 1010music Blackbox | 3.5" colour touch (Blackbox 2: 4") | touch, few buttons | the touch screen, a 4 by 4 grid in Seqs mode | drawn | per step | 1 tap | READ [Sound On Sound](https://www.soundonsound.com/reviews/1010music-blackbox), [1010music](https://1010music.com/product/blackbox-2) |
| nanoloop (Game Boy) | 160x144, 4 greys | d-pad, A, B, start, select (8) | **the screen: "a matrix of 4 x 4 squares with the currently playing step marked in slightly darker color"** | a darker square | the "edit parameter" named in the top right corner, B + up and down changes it | at most 4 moves on a 4 by 4 grid, then 1 | READ [nanoloop 2.8 manual](https://www.nanoloop.com/two/nanoloop286.html) |
| LSDj (Game Boy) | 160x144, 4 greys | the same 8 | the phrase screen, 16 steps as 16 rows, numbers in hex "to save screen space" | a row marker | columns per row; KIT instruments for drums | cursor moves, then A | READ [LSDj 9.2.6 manual](https://www.littlesounddj.com/lsd/latest/documentation/LSDj_9_2_6.pdf) |
| Dirtywave M8 | 2.8" IPS | the Game Boy's 8, laid out the same | the screen, LSDj style | a row | columns | cursor, then a key | READ [Dirtywave](https://dirtywave.com/), [m8c](https://github.com/laamaa/m8c) |
| PicoStepSeq (DIY, todbot) | **0.96" SSD1306 128x64, the same part as the Pi's** | 8 step keys with LEDs, 1 encoder | the keys' LEDs, and the OLED's top part ("8 notes with gate info") | the keys' LEDs | hold a key and turn for pitch | 1 | READ [picostepseq](https://github.com/todbot/picostepseq) |
| Pico drum machine (Raspberry Pi blog) | none | 6 buttons that trigger samples | no pattern | none | none | not a sequencer | READ [Raspberry Pi news](https://www.raspberrypi.com/news/raspberry-pi-pico-powered-drum-machine/) |
| LMN-3 (DIY, Pi 4) | HyperPixel 4, 800x480, not an OLED | a keyboard of keys and encoders | the screen | drawn | per step | n/a | READ [Hackaday](https://hackaday.com/2022/06/14/lmn-3-putting-the-op-in-open-source-synthesizers/) |
| Synthstrom Deluge | 7 segment or a small mono OLED (MEMORY: 128x48) | 128 RGB pads, 16 by 8, and 2 columns | the pads | the pads | per pad | 1 | READ [Deluge open source](https://synthstrom.com/open/); resolution MEMORY |
| Erica Synths LXR-02 | mono OLED | 16 step keys | the keys | the keys | probability, retrigs, step loops | 1 | READ [Erica Synths](https://www.ericasynths.lv/news/drum-synthesizer-lxr-02/) |

### 1.2 What to take from it

1. **One key per step is what makes drum entry one press.** Every machine with
   1 press for a hit has 16 step keys and lights on them. The Pi has neither,
   so a hit at a chosen step costs a cursor walk. Only two ways round it are in
   the table: **write while playing** (TR "tap write", the OP-1 finger, the K.O.
   II's record + pad live), which is 1 press but needs a short key to sound path;
   and **a 2D layout** (nanoloop's 4 by 4), which needs four direction keys.
2. **The playhead is a mark on a step, never a separate cursor, on every
   machine.** Nanoloop darkens the square, LSDj marks the row, the LED machines
   blink the key. On one bit we have no "darker", so it has to be a shape:
   `steps-oled.mjs` already uses a filled bar in a lane under the grid, and an
   outline in the playhead's column (READ). Good.
3. **Velocity and accent are a mode or a hold, never a separate screen.** The
   Volca and TR have an ACCENT mode that re-uses the step keys; the Elektrons and
   the Volca use hold-a-step-and-turn. With four keys, "hold `#` on a step" is
   the hold, and a tap cycle (off, hit, accent) is the mode.
4. **Probability is often per track, not per step.** Model:Samples has one
   CHANCE per track (READ, 9.2.12), and trig conditions as the per step form.
   Per track is one number in a menu, far cheaper with four keys.
5. **Mute is a modifier plus a track key**, and the screen only confirms it:
   Model:Samples mutes with FUNC + pad and shows "a grayed out volume bar"
   (READ, section 6.1 note). On one bit, "grayed" has to become a shape.
6. **norns has 16 grey levels and we have 2.** Every norns idiom of a dim off
   step and a bright playhead has to be translated to size, outline or dither
   here. That is the main difference between our screen and the nearest
   community of 128x64 music software (READ).
7. **Modes are named on screen.** Nanoloop names the channel top left and the
   edit parameter top right; norns pages through E1; Elektron has page keys. With
   four keys, a mode word in a status line is the cheap way to say what `^ v #`
   mean right now.
8. **Hex and abbreviations exist to save width**, LSDj says so in its manual.
   Two letter track names (BD SD CH OH) are already this repository's choice
   (READ, `SHORT` in `demo/devices/drums/index.html`).

---

## 2. The basics, as a ladder

### 2.1 The budget: what 128x64 one bit and four keys allow

**Physical size.** The module is 0.96" (READ, `plans/plan-pi-oled.md`). A
typical 0.96" SSD1306 has an active area near 21.7 by 10.9 mm, so one pixel is
about 0.17 mm (INFERRED from typical datasheets; not measured on this module).
At 50 cm a 0.17 mm pixel is about 1.2 arc minutes, the edge of normal acuity
(arithmetic). **So a lone 1 px dot is at the limit of sight, and anything that
must be read should be 2 px or more.** The 2.42" SSD1309 is the same 128x64 and
the same protocol (READ, `research/pi-screens-estonia-2026-10-04.md`), 2.5 times
larger, and would move that limit.

**Fonts compiled into `oled-ui.wasm`** (READ, `rig/pico/firmware/ui.c` line 24 to 36):

| font | cell | advance | capital height | two letters wide |
| --- | --- | --- | --- | --- |
| glcd5x7 (the default) | 5x8 | 6 | 7 | 11 px ink, 12 px advance |
| misc5x7 | 5x7 | 5 | 6 | 10 |
| spleen5x8 | 5x8 | 5 | 6 | 10 |
| misc4x6, tomthumb | 4x6 | 4 | 5 | 8 |
| petme8x8 | 8x8 | 8 | 7 | 16 |

`ui.textBig` draws the current font at 2x (READ, `ui.h` line 65). A three digit
tempo is 18 px wide and 7 px tall in glcd5x7, 36 by 14 at 2x (arithmetic).

**Width.** 16 steps at a 7 px pitch (6 px lit, 1 px gap) is 112 px. That leaves
16 px for a two letter label in glcd5x7 (12 px) plus a 3 px row marker, which is
exactly what `steps-oled.mjs` does (labels at x 4, grid from x 16, step 16 ends
at x 126; READ). If the key symbols down the right edge are kept (14 px, as in
the text mode of `panel-screen.mjs`), 16 steps must drop to a 6 px pitch (5 lit,
1 gap, 96 px) and labels to tomthumb (8 px) (arithmetic). **Recommendation: do
not keep the key column in the drum screen; spend the width on steps, and name
the mode in a status line instead.**

**Height.** 64 px. A status line in glcd5x7 costs 7 px plus a 2 px gap. A
playhead lane costs 4 px plus 1 gap. A row of beat ticks costs 2. What is left
for rows, and how many rows fit (arithmetic):

| rows of steps | pitch | lit height (pitch minus gap) | with a status line? | labels in |
| --- | --- | --- | --- | --- |
| 1 | 30 | 30 | yes | glcd5x7 |
| 4 | 13 | 10 | no (today) | glcd5x7 |
| 4 | 11 | 9 | yes | glcd5x7 |
| 6 | 8 | 5 (labels 7 px overflow the cell) | no (today) | glcd5x7 |
| 6 | 7 | 5 | yes | tomthumb |
| 8 | 6 | 5 | yes, in tomthumb | tomthumb |
| 10 and more | 5 or less | 3 or less, a lit step near the 2 px limit | no | none fit |

**So the honest ceiling is 8 tracks of 16 steps with a status line**, all in
the 4x6 font, and 4 tracks is the comfortable size. Six rows today is already
cramped: the 7 px labels sit in 5 px cells (MEASURED today, section 3).

**What one bit can encode in a cell** (no inverted boxes, no text cut out of a
fill, asked 2026-10-15 and recorded in `lessons/kit-steps-oled.md`):

| encoding | reads as | good for |
| --- | --- | --- |
| filled block | on | a hit |
| block height (full, two thirds, one third) | how strong | accent, hit, ghost |
| outline | "here", a frame | the cursor, the playhead's column |
| 2x2 dot or 1 px dot | an off step, a beat | the empty grid |
| flattened 2 px bar at the cell's foot | present but quiet | a muted track |
| dither (checker, sparse) | partly | probability, MEASURED today to draw; whether it reads on the real 0.96" panel is not measured |
| blinking at 2 Hz | pending | a pattern queued for the next bar |
| a shift of 1 to 3 px | late | swing, but only with a 4 px wide cell (arithmetic: at 7 px pitch a 6 px cell has 1 px to move) |

**What four keys can say.** The keys are `^ v # *`, K1 to K4 (MEASURED
2026-10-15 by press, `rig/board/panel.mjs` `KEYS`), and the board reports both
edges, debounced 10 ms by gpiomon (READ). From edges, four gestures per key are
possible: tap, hold (repeat), long press, and a chord with another key. Six
chords of two keys exist. The prior art's answer is one modifier key held
(Elektron FUNC, PO "hold X and press"). **Proposed: `*` is the modifier.** A
tap of `*` alone is play and stop; `*` held with another key is a second layer.
The cost is that play and stop must fire on `*`'s RELEASE (so a chord can be
told from a tap), which adds the length of the press, about 100 to 200 ms, to
starting the machine (INFERRED). That cost is measured in rung 3.

**Frame cost.** MEASURED 2026-10-15 on the Pi (`lessons/rig-board-panel.md`):
**35 ms a whole frame at 400 kHz**, the 1024 bytes in one `i2ctransfer` after a
window write, so **at most about 28 frames a second**. The board writes the
whole frame every time (READ, `panel.mjs` `draw`). Drawing the frame in
`oled-ui.wasm` is cheap: **6.0 µs a frame on the Mac** (MEASURED today, 5000
steps frames in node); on the Pi 4's A72, a few times slower, still tens of µs
(INFERRED). So the bus, not the drawing, is the budget. The bytes alone are
about 23 ms at 400 kHz (READ, `ssd1306.h`, the firmware author's arithmetic),
so **about 12 ms of each 35 ms is the two process spawns of `i2ctransfer`**
(INFERRED from the difference, never measured on its own). A drum screen redraws
once per step and once per key edge:

| tempo | steps a second | bus busy with whole frames (arithmetic) |
| --- | --- | --- |
| 60 bpm | 4 | 14 per cent |
| 120 bpm | 8 | 28 per cent |
| 180 bpm (the drum machine's maximum, READ `drum-machine.mjs`) | 12 | 42 per cent |

Plus 2 frames per key press (down and up) and 2 a second for a blink. So the
bus is fine for everything on the ladder; a 32 step page at 180 bpm is the same
12 frames a second. CPU: the screen camera at 12 frames a second cost node 1.5
per cent of one core including its dither (MEASURED, `lessons/rig-board-panel.md`),
so a drum screen at 8 to 12 frames a second should be near 1 per cent
(INFERRED), not counting the `i2ctransfer` children.

### 2.2 The ladder

Each rung says what is drawn (at true scale where it matters, rendered through
the real `oled-ui.wasm` in node today, `#` lit, `.` dark), which keys do what,
what the board and the patch need, and what it costs. Rungs 0 to 3 can run with
the pattern in the tab as today; rung 4 moves it onto the board, and rungs after
it are easier there.

#### Rung 0. One track, 16 steps, a playhead

The smallest useful thing: one row, a hit is a tall block, an off step is a dot,
beats are 2x2 dots, the playhead is a filled bar in a lane underneath, and the
tempo and the play state are in a status line. MEASURED today, rendered with
accents on steps 1 and 9 (full height), hits on 5, 12, 13 (18 px), the playhead
on step 6:

```
####..####..............................................#....###...###....................................................#.....
#...#.#...#............................................##...#...#.#...#...................................................##....
#...#.#...#.............................................#.......#.#..##...................................................###...
####..#...#.............................................#....###..#.#.#...................................................####..
#...#.#...#.............................................#...#.....##..#...................................................###...
#...#.#...#.............................................#...#.....#...#...................................................##....
####..####.............................................###..#####..###....................................................#.....
................................................................................................................................
........######..................................................######..........................................................
   (rows 9 to 25: the two accents continue)
........######......................######......................######...............######.######..............................
   (rows 27 to 42: all five blocks continue to y 43)
........######...##.....##.....##...######...##.....##.....##...######...##.....##...######.######...##.....##.....##...........
................................................................................................................................
...........................................######...............................................................................
...........................................######...............................................................................
................................................................................................................................
........##..........................##..........................##..........................##..................................
```

- **Keys:** `*` play and stop. Nothing else.
- **Board:** `screen.steps` as today, plus `bpm` and the play state in the
  message (`panel.mjs` `steps()` passes only `voices, pattern, step, voice,
  playing` today, READ).
- **Patch:** `web:sequencer:value-out` to `pi-1:screen:value-in`;
  `pi-1:keys:value-out` to `web:sequencer:value-in`. Both exist (READ,
  `demo/devices/drums/index.html`).
- **Cost:** one frame per step, 28 per cent of the bus at 120 bpm (arithmetic).

#### Rung 1. Edit one track with four keys

- **Drawn:** rung 0 plus a cursor, a hollow bar in the lane when stopped, and
  a 1 px box around the cursor's cell.
- **Keys, stopped:** `^` cursor left, `v` cursor right (wrapping), **neither
  edits**; `#` toggles the step under the cursor and **does not move it**; `*`
  tap plays. Hold `^` or `v` to repeat (after 300 ms, every 80 ms; INFERRED
  values, to be tuned by hand).
- **Keys, playing:** `#` writes a hit on the step **nearest** the moment of the
  press, not the step that is sounding, so a press 10 ms early lands on the
  beat it meant (the convention of live record on the TR, the Circuit and the
  K.O. II, which quantise; INFERRED that all three round to nearest). The cursor
  follows the playhead.
- **Presses:** a hit at step n while stopped, from step 1: at most 8 moves
  (wrapping either way) plus 1 (arithmetic), or one hold of about a second. While
  playing: 1 press, at the right moment.
- **Board and patch:** nothing new; key edges already arrive with `down`
  (READ). The latency of the press matters for writing while playing: see
  section 3.3 and rung 4.

#### Rung 2. Four tracks, and choosing one

- **Drawn:** four rows at an 11 px pitch under the status line, the chosen row
  marked by the small triangle that exists today. MEASURED today, with a status
  line (`STEP` mode, pattern `A1`, `120`, playing), SD chosen with the cursor box
  on step 7, the playhead filled at step 10, CH muted (rung 3):

```
.###..#####.#####.####....................#.....#.......................#....###...###....................................#.....
#...#.#.#.#.#.....#...#..................#.#...##......................##...#...#.#...#...................................##....
#.......#...#.....#...#.................#...#...#.......................#.......#.#..##...................................###...
.###....#...####..####..................#...#...#.......................#....###..#.#.#...................................####..
....#...#...#.....#.....................#####...#.......................#...#.....##..#...................................###...
#...#...#...#.....#.....................#...#...#.......................#...#.....#...#...................................##....
.###....#...#####.#.....................#...#..###.....................###..#####..###....................................#.....
................................................................................................................................
................................................................................................................................
................................................................................................................................
................######..................................................######..................................................
....####..####..######..................................................######..................................................
....#...#.#...#.######..................................................######..................................................
....#...#.#...#.######......................######......................######......................######......................
....####..#...#.######......................######......................######......................######......................
....#...#.#...#.######......................######......................######......................######......................
....#...#.#...#.######......................######......................######......................######......................
....####..####..######...#......#......#....######...#......#......#....######...#......#......#....######...#......#......#....
................######......................######......................######......................######......................
................................................................................................................................
.........................................................########...............................................................
............................................######.......#......#...................................######......................
.....###..####..............................######.......#......#...................................######......................
#...#...#.#...#.............................######.......#......#...................................######......................
##..#.....#...#.............................######.......#......#...................................######...............######.
###..###..#...#.............................######.......#......#...................................######...............######.
##......#.#...#.............................######.......#......#...................................######...............######.
#...#...#.#...#.............................######.......#......#...................................######...............######.
.....###..####....##.....#......#......#....######...#...#..#...#..#......##.....#......#......#....######...#......#....######.
..................##........................######.......#......#.........##........................######...............######.
.........................................................########...............................................................
................................................................................................................................
................................................................................................................................
.....###..#...#.................................................................................................................
....#...#.#...#.................................................................................................................
....#...#.#...#...............######......................######......................######......................######........
....#...#.#####...............######......................######......................######......................######........
....#...#.#...#...............######......................######......................######......................######........
....#...#.#...#...............######......................######......................######......................######........
.....###..#...#...##.....#....######...#......##.....#....######...#......##.....#....######...#......##.....#....######...#....
..................##..........######..........##..........######..........##..........######..........##..........######........
................................................................................................................................
................................................................................................................................
................................................................................................................................
.....###..#...#.................................................................................................................
....#...#.#...#.................................................................................................................
....#.....#...#.................................................................................................................
....#.....#####.................................................................................................................
....#.....#...#.................................................................................................................
....#...#.#...#.................................................................................................................
.....###..#...#.######.######.######.######.######.######.######.######.######.######.######.######.######.######.######.######.
................######.######.######.######.######.######.######.######.######.######.######.######.######.######.######.######.
................................................................................................................................
................................................................................................................................
................................................................................................................................
................................................................................................................................
..........................................................######...............######...........................................
..........................................................#....#...............######...........................................
..........................................................######...............######...........................................
................................................................................................................................
................................................................................................................................
................................................................................................................................
................##..........................##..........................##..........................##..........................
................................................................................................................................
```

  Two things this rendering shows: the playhead filled and the cursor hollow can
  share the lane, and the playhead's column outline on off steps (today's design)
  is dropped here because the cursor box now uses the outline (MEASURED today,
  `lit 1080 of 8192` pixels).
- **Keys:** `*` + `^` and `*` + `v` choose the previous and next track (2 chords
  to reach track 3 from track 1). `^ v #` keep rung 1's meaning.
- **Presses:** track 3, step 9, from track 1 step 1, stopped: 2 chords, 8 moves,
  1 toggle, **11** (arithmetic). Today: not possible without flipping steps on
  the way (section 3). The PO, TR, Elektron: 2 (track, step).
- **Board and patch:** the `*` chord is decided in the page from `down` and `up`
  edges, which already arrive (READ). No new link.
- **Cost:** a chord press is 4 edges and the board redraws on each edge today (a
  waste, section 3.2), so 4 frames, 140 ms of bus (arithmetic).

#### Rung 3. A status line, mute and accent

- **Drawn:** the status line names the mode word (`STEP`), the pattern (`A1`),
  the tempo, and the play state as a small triangle (playing) or two bars
  (stopped). A **muted track draws its hits flattened** to 2 px bars at the foot
  of the cell (the CH row above). An **accent is a full height block, a hit is
  two thirds** (6 of 9 px in the rendering above, the BD and SD rows).
- **Keys:** `#` on a step cycles off, hit, accent, off (accent costs 2 presses,
  the Volca's ACCENT mode re-uses the step key the same way). `*` + `#` mutes and
  unmutes the chosen track.
- **Board:** `pattern` rows carry `0 1 2` instead of `0 1`; `rowOn` in
  `steps-oled.mjs` and the `steps()` sanitiser in `panel.mjs` read three values
  (READ: both read `1` or `x` as on today). A `muted` list.
- **Patch, and the sound:** the drum machine's grid is on/off (READ,
  `createStepGrid`, `grid.set(r, s, true)`), so accent is a change to
  `demo/drums/drum-machine.mjs` and `demo/shell/step-grid.mjs`, the shared kit
  every drum page uses. The voices already take `amp` (READ, `voices.mjs`:
  `{ |amp = 0.8| ...`), and `sc.hit` already carries `args` (READ,
  `board-collide.mjs` `hits`), so an accent is an `amp` argument on the hit, on
  both renderers. Mute has no home in `drum-machine.mjs` today (READ, no match
  for "mute").
- **Cost:** none on the bus; a pattern stays one character per step (64 for
  four rows), plus a short mute list.

#### Rung 4. The board owns the pattern and the clock

This is where "a drum machine on a tiny screen" stops being a remote display of
a browser drum machine.

- **Drawn:** the same as rung 3; the difference is where it comes from.
- **Keys:** the same; but a key goes to a sequencer in the board's own process
  instead of over the relay to a tab. Writing while playing (rung 1) becomes
  usable: the press is timestamped on the Pi, quantised there, and sounds on the
  Pi's own scsynth.
- **Board:** a sequencer in `rig/board/` (new file, about the size of the
  pattern logic in the page today): the pattern, the tempo, a clock that
  schedules `sc.hit` on the board's scsynth with a look-ahead (scsynth plays a
  timestamped hit sample accurately, READ `scollide.mjs` `sc.hit` with `at`;
  INFERRED that a 100 ms look-ahead covers node's timer jitter). The drum voices
  are compiled from text today only when a tab sends `sc.load` (READ,
  `board-collide.mjs` `load`), so the board has to load `demo/drums/voices.mjs`
  itself at start (INFERRED that `push.sh` ships it, as it ships what
  `rig/board` imports; to be checked).
- **Where the sound goes:** the board has a Fast Track Pro on its USB hub with
  playback at 48 kHz (READ, `HANDOFF.md`, "What is on the desk, measured on the
  Pi"), and `boardGraph` announces the card as a `device` with an `audio-in`
  whose link is a JACK connection to `system:playback_1` and `_2` (READ,
  `graph-registry.mjs` line 216). Whether anything audible is plugged into its
  outputs is not recorded.
- **Patch:** new on `pi-1`, all local to the board:
  `pi-1:keys:value-out` to `pi-1:sequencer:value-in`;
  `pi-1:sequencer:value-out` to `pi-1:screen:value-in`;
  `pi-1:sequencer:midi-out` to `pi-1:drums:midi-in` (the `drums` node exists,
  READ `graph-registry.mjs` line 157);
  `pi-1:drums:audio-out` to the card's `audio-in` (a JACK link).
  And for a tab: `pi-1:sequencer:value-out` to `web:sequencer:value-in` (the tab
  mirrors) and `web:sequencer:value-out` to `pi-1:sequencer:value-in` (the tab
  edits). Two gaps make this real work rather than wiring: **`screen` and `keys`
  are not in `boardGraph`** (READ, `lessons/page-devices.md`: "Not in
  `boardGraph` yet"), they are added by each page to its own bay; and **the board
  has no router for light links between its own nodes**: `patch.apply` is ALSA
  MIDI and `jack.mjs` is audio (READ, `board.mjs` `patch.apply`). Steps 5 and 6
  of `plans/plan-pi-oled.md` (announce the panel, `bay.event` on the board) are
  the prerequisite and are still open.
- **Cost:** the sequencer is a timer and a few sends a step; the voices are
  scsynth's (the board already runs them for `/drums/remote/`). Key to sound on
  the Pi: gpiomon's 10 ms debounce, node, scsynth's next block (one JACK period,
  21.33 ms at 1024 frames, READ `research/pi-drum-machines-2026-09-21.md`; on the
  card the period is the card's), so about 15 to 40 ms (INFERRED, unmeasured)
  against about 100 to 165 ms for the screen to answer a key today (section 3.3).

#### Rung 5. Tempo, and a menu

- **Drawn:** the mode word changes to `BPM`, the tempo at 2x
  (`ui.textBig`, 36 by 14 px), the grid stays below it.
- **Keys:** `*` held alone for 600 ms opens the menu (INFERRED value); in it
  `^ v` change the value (tempo plus or minus 1, held repeats), `#` moves to the
  next field (tempo, swing, length, pattern), `*` tap closes. `#` tapped in time
  in `BPM` could be tap tempo (four taps).
- **Board:** the sequencer's tempo (the drum machine's own range is 60 to 180 in
  steps of 5, READ `drum-machine.mjs`; a menu can be finer).
- **Cost:** no more frames than a key press.

#### Rung 6. Patterns and switching on the bar

- **Drawn:** `A1` in the status line; a queued pattern blinks as `A1>A2` at 2 Hz
  until the bar ends (the Elektron page LED flashes the playing page, READ).
- **Keys:** in the menu, field `PAT`: `^ v` choose, the change lands at the next
  bar; `#` copies the current pattern to the next slot.
- **Board:** four patterns of 4 tracks by 16 steps at 2 bits a step is 512 bits
  (arithmetic); kept as JSON on the board's disk so a restart keeps them.
- **Cost:** a blink is 2 frames a second, 7 per cent of the bus (arithmetic).

#### Rung 7. Fills

- **Drawn:** `FILL` replaces the mode word while held.
- **Keys:** while playing, hold `^` and `v` together: fill for as long as both
  are held (a momentary performance key, like Model:Samples' PAGE key, which
  "also activates Fill mode", READ section 7).
- **Board:** a fill is a second pattern played instead of the bar's, or a rule
  (every hit doubled, the last beat all snares). The Elektron form is a condition
  per step (`FILL` and `NOT FILL` trig conditions, READ 8.12.3); a rule is cheaper
  to edit with four keys.

#### Rung 8. Probability

- **Drawn:** per track first (one number in the menu, `CH 75%`), as Model:Samples
  does. Per step later, as dither in the cell. MEASURED today, rendered at 100,
  75, 50 and 25 per cent:

```
........######......................######......................#.#.#.......................#.#.#...............................
........######......................#.#.#........................#.#.#..........................................................
........######......................######......................#.#.#.......................#.#.#...............................
........######......................#.#.#........................#.#.#..........................................................
```

  The 25 per cent pattern is 1 px dots, which section 2.1 puts at the limit of
  sight, so per step probability needs a look at the real panel before it is
  trusted (not measured).
- **Keys:** per track in the menu; per step as `#` held on a step plus `^ v` in
  quarters (hold then move, the Volca's "while holding a step button" form).

#### Rung 9. Swing

- **Drawn:** a number in the status line (`SW58`). Drawing it as a shift of the
  off beats needs a cell of 4 px or less to leave room (section 2.1), so not on
  the 6 px cells.
- **Keys:** menu field `SW`, 50 to 75 per cent (Model:Samples allows 50 to 80,
  READ 9.2.11).
- **Board:** the sequencer delays every second 16th by `(swing - 0.5) x 2 x step`
  ms (arithmetic); the tab's drum machine has no swing today (READ, no match).

#### Rung 10. More than 16 steps, more than 4 tracks

- 32 steps as two pages of 16, a page mark in the status line (two small bars,
  the one playing filled), the Elektron `<PATTERN PAGE>` form.
- 8 tracks in tomthumb at a 6 px pitch. MEASURED today: it draws (975 of 8192
  pixels lit) and is the most that fits; whether 4x6 letters read on 0.96" is
  not measured.

---

## 3. Where /devices/drums/ is today, measured from the code

Open it at https://positron.studio/devices/drums/ (the Pi is reached only on
the first play).

### 3.1 What it does

READ, `demo/devices/drums/index.html`, `demo/shell/steps-oled.mjs`,
`rig/board/panel.mjs`, `rig/board/board.mjs` line 990:

- The drum machine is `/drums/machine/`'s (`createDrumMachine`, four
  SuperCollider voices, kick, snare, open hat, closed hat), **running and sounding
  in the browser tab**.
- The tab sends `{ voices, pattern, step, voice, playing }` along
  `web:sequencer:value-out` to `pi-1:screen:value-in` (the board's
  `screen.steps`) and to `web:screen:value-in` (the same frame drawn in the
  page), whenever the JSON changes, from a `requestAnimationFrame` loop.
- The Pi's keys arrive as `panel.key` on `pi-1:keys:value-out`, linked to
  `web:sequencer:value-in`: `^` and `v` choose the row, `#` toggles a step, `*`
  plays and stops.
- The OLED draws 4 rows at a 13 px pitch with 10 px cells, two letter labels,
  a playhead bar in a lane at y 56 and beat ticks at y 62. The real frame,
  MEASURED today by `ui.frame({ mode: 'steps', ... })` in node, the start
  pattern, the playhead on step 6, SD chosen:

```
................######......................######.######...............######......................######......................
....####..####..######......................######.#....#...............######......................######......................
....#...#.#...#.######......................######.#....#...............######......................######......................
....#...#.#...#.######......................######.#....#...............######......................######......................
....####..#...#.######......................######.#....#...............######......................######......................
....#...#.#...#.######...#......#......#....######.#....#...#......#....######...#......#......#....######...#......#......#....
....#...#.#...#.######......................######.#....#...............######......................######......................
....####..####..######......................######.#....#...............######......................######......................
................######......................######.#....#...............######......................######......................
................######......................######.######...............######......................######......................
   (rows 10 to 12 dark; SD, OH, CH rows follow at y 13, 26, 39, each 10 px)
   (rows 49 to 55 dark)
...................................................######.......................................................................
   (the playhead bar, y 56 to 59)
................##..........................##..........................##..........................##..........................
```

### 3.2 What is wrong or missing

1. **Editing while stopped cannot reach a step without flipping others.** `#`
   toggles the cursor's step and then moves the cursor one on; nothing else moves
   it (READ, `onKey`: `if (!a.playing()) { cursor = (cursor + 1) % g.steps; ... }`).
   So step 9 is reachable only by flipping steps 1 to 8. This is the most
   important fix and it is rung 1.
2. **Writing while playing takes the step that is showing when the message
   arrives, not the nearest step to the press** (READ: `g.step()` at the time
   `onKey` runs in the tab). The press has travelled Pi to relay to tab first
   (section 3.3), about 40 ms or more, so at 120 bpm (125 ms a step) a press in
   the last third of a step lands on the next one, and a press just before a beat
   lands on the step before it (INFERRED).
3. **The pattern lives in the tab.** With no tab open the Pi's keys do nothing,
   and the screen shows whatever it last drew. In a hidden tab
   `requestAnimationFrame` is paused by browsers (INFERRED, general browser
   behaviour), and the page's `tick()` is the only thing that sends
   `screen.steps`, so the Pi's screen freezes while the tab may go on playing.
4. **Nothing on the screen says what the keys do.** The steps mode returns
   before the key column of the text mode is drawn (READ, `drawPanel`), and
   there is no mode word. On the Pi, the keys' meanings are only in the page.
5. **No tempo, no play state, no pattern on the screen.** The message carries
   `playing` only as the lane bar filled or hollow (READ).
6. **The board redraws on every key edge even in steps mode**, where the held
   keys are not drawn: `watch()` calls `draw()` after every edge (READ,
   `panel.mjs`). That is two wasted 35 ms frames a press, and a real update that
   arrives during one waits up to 35 ms more (the `busy` and `again` flags).
7. **On/off only.** No accent, no velocity, no mute, no probability, no swing,
   one pattern (READ, `drum-machine.mjs`, `step-grid.mjs`).
8. **Six rows are cramped.** At 6 rows the cell is 5 px and the 7 px glcd labels
   overflow it, and 11 px at the bottom go unused (MEASURED today, rendered). At 4
   rows, 7 rows of pixels (y 49 to 55) go unused (MEASURED today). Both say the
   status line fits without losing anything.
9. **A shape over 16 steps is cut**: the board keeps 16 steps and 6 rows
   (READ, `panel.mjs` `steps()`), and `drawStepsOled` draws no playhead past
   step 16, so a 32 step pattern would show a playhead for half of each bar
   (READ; `/devices/drums/` offers no shape control today, so it is latent).
10. **The sound is in the tab, the screen and keys are on the Pi.** The person
    at the Pi hears the tab's speakers, wherever they are. Whether that is the
    point (a remote display) or a stop on the way to a Pi drum machine is the
    owner's call; rung 4 is the second reading.

### 3.3 Key to screen, today, as a sum of parts

| stage | ms | label |
| --- | --- | --- |
| gpiomon debounce | 10 | READ, `-p 10ms` |
| Pi to relay to tab, one way | about 32 to 35 | INFERRED from 64 to 69 ms Mac to Pi round trip (MEASURED 2026-09-14, `research/pi-drum-machines-2026-09-21.md`) |
| tab: until the next animation frame | 0 to 16 | INFERRED, 60 Hz |
| tab to relay to Pi, one way | about 32 to 35 | as above |
| a draw already on the bus (often the wasted one, 3.2 item 6) | 0 to 35 | MEASURED frame time |
| the frame | 35 | MEASURED |
| **press to the step lit on the Pi** | **about 110 to 170** | arithmetic, never measured |

At 120 bpm that is about one step. The direct path that `/remote/` pages use
(3 to 8 ms network against 110 to 125 ms on the relay, READ `BACKLOG.md`) is not
used by this page; with it the sum would be near 60 to 90 ms (arithmetic).
Rung 4 removes both network legs.

---

## 4. Recommendation: the first three rungs, in order

### Step 0. Measure before building (one session, no code change on the Pi)

Press `#` on the Pi with `/devices/drums/` open and read, per press, the time
from the board's `panel.key` `at` (the board stamps it, READ `board.mjs` line
286) to the board's next `screen.steps` arriving and to `panel.status().frameMs`
after it. Needs a log line on the board or `ask.mjs --room studio-1
panel.status`. Settles section 3.3, which decides how urgent rung 4 is.

### First: rung 1 and the status line of rung 3 (editing that works)

- `demo/devices/drums/index.html`: `onKey` with edges, not only downs: `^ v`
  move the cursor stopped (with repeat), `#` toggles without moving, `*` plays on
  release unless it was a chord, `*` + `^ v` choose the track; while playing,
  `#` writes at the nearest step, compensated by the measured key latency of
  step 0. The self check's assert `v then # ... moves the cursor` changes with it
  (positron-verify: a control change moves asserts).
- `demo/shell/steps-oled.mjs`: the status line (mode word, tempo, play state),
  rows at an 11 px pitch under it, the cursor box, and the lane shared by the
  filled playhead and the hollow cursor.
- `rig/board/panel.mjs`: `steps()` passes `bpm`, `cursor` and `mode` through;
  `watch()` skips the redraw on a key edge when the mode is `steps`.
- `lessons/kit-steps-oled.md`, `lessons/page-devices.md`: the new geometry and
  keymap, and the page's `what` text in the same commit (CLAUDE.md, *a change in
  what a page does is a change to what it says*).
- Testable with no Pi: the simulated screen and keys on the page are the same
  bytes (READ, `panel-screen.mjs`). On the Pi: after `push.sh`, one press test.

### Second: rung 3's accent and mute (the drum machine learns levels)

- Shared kit, done once by one agent before any page work:
  `demo/drums/drum-machine.mjs` (a step holds 0, 1 or 2; the hit carries `amp`;
  a mute per row), `demo/shell/step-grid.mjs` (the browser grid draws an accent:
  every drum page uses it, so `/drums/machine/`, `/drums/knobs/`,
  `/drums/samples/`, `/drums/camera/` and `/drums/remote/` are checked after).
- `demo/shell/steps-oled.mjs` (block height, flattened muted rows),
  `rig/board/panel.mjs` (`steps()` accepts `0 1 2` and a mute list).
- `demo/devices/drums/index.html`: `#` cycles off, hit, accent; `*` + `#` mutes.

### Third: rung 4, the board owns the pattern

- Prerequisite: `plans/plan-pi-oled.md` steps 5 and 6, `screen` and `keys` in
  `boardGraph` (`demo/shell/graph-registry.mjs`) and `bay.event` on the board.
- `rig/board/steps.mjs` (new): the pattern, tempo, clock with look-ahead, the
  keymap from the first step moved here, patterns saved to disk.
- `rig/board/board.mjs`: the panel's `onKey` goes to the sequencer when it owns
  the screen; `rig/board/scollide.mjs`: hits from the board's own clock, and the
  voices loaded from `demo/drums/voices.mjs` at start.
- `demo/devices/drums/index.html`: becomes the mirror and second editor, its
  links to `pi-1:sequencer` instead of its own sequencer feeding the Pi.
- Then `/devices/drums/` plays on the Pi with the tab closed, which is the test.

Rungs 5 to 10 follow on the board's sequencer, in the order of section 2.2.
None of them is worth doing before rung 4, because each adds a key gesture whose
feel depends on the key latency.

---

## 5. What is uncertain, and what would settle it on the real Pi

1. **Key to screen time today** (section 3.3), a sum of parts. Settled by step 0.
2. **How much of the 35 ms is `i2ctransfer` being spawned twice.** Time one
   `i2ctransfer` of 1 byte on the Pi; if it is near 6 ms, a long lived helper
   (the `oledpush.c` of `plans/plan-pi-oled.md` section 2.1) or a partial window
   write (only the pages and columns that changed) would cut a playhead move to
   a few ms. Not needed for any rung above, needed only past about 20 frames a
   second.
3. **What reads on the 0.96" panel by eye**: 1 px dots, the 25 per cent dither,
   tomthumb's 4x6 letters, a 1 px cursor box. One photograph per specimen at the
   distance the owner stands, or the owner's look.
4. **Whether `*` on release feels late for play.** One afternoon with the keys.
   The alternative is play on press, and the chords moved to `#` as the
   modifier.
5. **Auto repeat and long press timings** (300 ms, 80 ms, 600 ms here) are
   guesses.
6. **Whether anything audible is plugged into the Fast Track Pro's outputs**
   at `pi-1`, which rung 4 needs. One look, or one JACK link and a listen.
7. **Whether the board can load the drum voices with no tab**: whether
   `push.sh` ships `demo/drums/voices.mjs` and whether the board's `sc.load` path
   compiles it without a browser (READ that it compiles text to a definition with
   no sclang, `plans/plan-drum-twin.md` section 6.1; not tried for these voices).
8. **Scheduling jitter of a node clock with look-ahead on the Pi**, under the
   board's other traffic. `sc.stats` and a recording of the card output would
   settle it.
9. **The pocket operator and TR-8S screens** in section 1.1 were not confirmed
   from a manual (the PO guide does not say how the LCD draws the steps; the
   TR-8S display resolution was not found); the Deluge's 128x48 is MEMORY. None
   of the plan depends on them.

## Sources

Outside, read 2026-10-15:

- [Teenage Engineering PO-12 guide](https://teenage.engineering/guides/po-12/en)
- [Teenage Engineering EP-133 guide, play and record](https://teenage.engineering/guides/ep-133/play-and-record)
- [K.O. II EP-133 timing map](https://www.spongefile.com/k-o-ii-ep-133-timing-map/)
- [OP-1 hands on review, B&H](https://www.bhphotovideo.com/explora/pro-audio/hands-review/teenage-engineering-op-1-portable-synthesizer)
- [Elektron Model:Samples user manual, OS 1.13](https://www.elektron.se/wp-content/uploads/2024/10/Model-Samples-User-Manual_ENG_OS1.13_241030.pdf)
- [Elektron Digitakt user manual, OS 1.51](https://www.elektron.se/wp-content/uploads/2024/09/Digitakt_User_Manual_ENG_OS1.51_231108.pdf)
- [Polyend Tracker review, MusicTech](https://musictech.com/reviews/hardware-instruments/the-big-review-polyend-tracker/)
- [Polyend Play review, Sound On Sound](https://www.soundonsound.com/reviews/polyend-play)
- [Novation Circuit Tracks user guide v3](https://fael-downloads-prod.focusrite.com/customer/prod/downloads/circuit_tracks_user_guide_v3_en.pdf)
- [norns screen API](https://monome.org/docs/norns/api/modules/screen.html), [cyrene](https://norns.community/cyrene), [norns docs](https://monome.org/docs/norns/)
- [Korg volca drum owner's manual, Manuals+](https://manuals.plus/korg/volca-drum-digital-percussion-synthesizer-manual), [Sound On Sound review](https://www.soundonsound.com/reviews/korg-volca-drum)
- [Roland TR-8S owner's manual](https://static.roland.com/assets/media/pdf/TR-8S_eng03_W.pdf)
- [1010music Blackbox review, Sound On Sound](https://www.soundonsound.com/reviews/1010music-blackbox), [blackbox 2](https://1010music.com/product/blackbox-2)
- [nanoloop 2.8 manual](https://www.nanoloop.com/two/nanoloop286.html)
- [LSDj 9.2.6 manual](https://www.littlesounddj.com/lsd/latest/documentation/LSDj_9_2_6.pdf)
- [Dirtywave](https://dirtywave.com/), [m8c](https://github.com/laamaa/m8c)
- [PicoStepSeq](https://github.com/todbot/picostepseq)
- [Raspberry Pi Pico drum machine](https://www.raspberrypi.com/news/raspberry-pi-pico-powered-drum-machine/)
- [LMN-3 on Hackaday](https://hackaday.com/2022/06/14/lmn-3-putting-the-op-in-open-source-synthesizers/)
- [Synthstrom Deluge open source](https://synthstrom.com/open/)
- [Erica Synths LXR-02](https://www.ericasynths.lv/news/drum-synthesizer-lxr-02/)

In this repository: `demo/devices/drums/index.html`, `demo/shell/steps-oled.mjs`,
`demo/shell/panel-screen.mjs`, `rig/board/panel.mjs`, `rig/board/board.mjs`,
`rig/board/scollide.mjs`, `rig/pico/firmware/ui.h`, `rig/pico/firmware/ui.c`,
`demo/drums/drum-machine.mjs`, `demo/drums/voices.mjs`,
`demo/shell/graph-registry.mjs`, `demo/shell/board-collide.mjs`,
`lessons/kit-steps-oled.md`, `lessons/page-devices.md`,
`lessons/rig-board-panel.md`, `plans/plan-pi-oled.md`, `plans/plan-drum-twin.md`,
`research/pi-drum-machines-2026-09-21.md`,
`research/pi-screens-estonia-2026-10-04.md`, `HANDOFF.md`.

The renderings in sections 2 and 3 were made with the real
`demo/resources/pico/oled-ui.wasm` and `loadPanelUi` in node on the Mac, by two
scratch scripts outside the repository; the rung mockups draw with the kit's own
`fill` and `text`, not with `steps-oled.mjs`, which does not yet draw them.
