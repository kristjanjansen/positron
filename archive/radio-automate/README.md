# archive/radio-automate: the `Automate` button and its tour, removed 2026-09-16

| file | what it is |
|---|---|
| `page-half.js` | the tour, the self-check that drove it and the three asserts that graded it, verbatim, out of `demo/radio/index.html` |

🔴 **IT IS NOT A MODULE AND MUST NOT BE IMPORTED.** Every function in it closes
over names that exist only inside that page: `eng`, `modulator`, `patch`,
`PATCHES`, `applyPatch`, `routedNow`, `lockedRate`, `sliders`, `faderSld`,
`scanRange`, `setWet`, `granSlot`, `P`, `d`, `SELFCHECK`, `ask1`, `G`.

Removed on instruction: *"rm 'automate' button from radio demo (and
functionaitu) and bring in automated sliders we made"*.

## What it was

One button, `Automate`, declared in `mount()` and then moved by the page into
`.gran-slot` so it sat under the controls it drove. Pressing it gave the
instrument to a clock:

- **a tour** of the twelve sounds, **22 s** held on each and **9 s** sliding to
  the next, so a whole lap of the list took **6 min 12 s**. The slide was a real
  morph: everything behind a 20 ms `Lag.kr` was interpolated in its own lane and
  everything with no halfway (a `Select.kr` index, a chord in semitones, a
  sixteen-step gate figure) stepped once, at the middle.
- **a blend that breathed with it**, `0.25` to `0.92`, one cosine per slot, so
  the handover between two sounds always happened while the station was still
  audible. It rode the FRAME clock rather than the 25 Hz tick, because at 40 ms
  against a 16.7 ms paint the handle got one update on some frames and two on
  others and the movement read as juddery. That was a reported bug and its fix.
- **the fader and the four settings following**, written through a `shown` cache
  so a 22 s dwell cost no DOM at all.
- **a hand-back**: `pointerdown` or `keydown` anywhere inside `.gran-slot`
  stopped it in one frame and said so in the log, leaving the instrument exactly
  where the tour had got to.

It never changed station, for two reasons written out in the code: this page had
been asked in as many words not to move that row by itself, and every mount in
it is a public broadcaster's whose listener figures count each connection this
repo opens.

## Why it went, and what replaced it

Asked for. What arrived in its place is `demo/shell/hand.mjs` plus
`createSlider({ hand: true })`: one button glued to the right of each slider's
lane that sweeps **that one lane** between its two ends, off on arrival and
forever, yielding to a finger in one frame.

🔴 **A SWEEP IS NOT A TOUR AND THE PAGE DOES NOT PRETEND IT IS.** What `/radio/`
can no longer do:

- change sound by itself. The twelve sounds are still there and still reached
  with `‹`, `›` and the die; nothing walks them.
- move five controls in step. Five hands can be switched on at once and they
  will be five independent sweeps, each with its own seed, its own lap length
  and its own wander at the ends.
- breathe the blend against where the sound is. The blend's hand sweeps the
  whole lane end to end, so it goes to 0 (the granulator inaudible) and to 1
  (the station gone), which the tour deliberately never did.
- step what cannot be interpolated. A hand moves a continuous lane and nothing
  else; the split between the two halves of a patch write is not used here any
  more.

What it gains is that the thing which moves a control sits **against that
control**, which the one button three inches above them could not.

## What was NOT deleted, and why

**`demo/shell/radio-gran.mjs` is untouched.** `tourAt`, `breathe`, `SLOT_MS`,
`DWELL_MS`, `MORPH_MS`, `morphOf`, `basesOf`, `writeContinuous` and
`writeDiscrete` are all still exported. `/radio/` was their only caller, so they
are now exported, unreferenced and ungraded — kept because that module's own
header says `/videoradio/` carries an inline copy of the same arithmetic and
should be moved onto these, and deleting them removes the destination.

**`/videoradio/` is untouched and was checked before anything was removed.** It
does *not* import the tour clock: it declares its own `DWELL_MS`, `MORPH_MS`,
`SLOT_MS`, `DWELL_FRAC`, `tourPos`, `tourNow`, `wetFor` and `tourTick` inline,
and takes only the stations, the sounds, the lanes and the two write halves from
`radio-gran.mjs`. So the page that plays itself unattended still plays itself.

## The one rule that outlived the tour

`moveSetting` in `demo/radio/index.html` is the tour's `routedNow` skip, kept and
pointed at the sliders instead. Two writers on one control at 25 Hz is a square
wave rather than a glide: `createModulator` writes `base + modulation` for every
destination a patch routes, so a slider writing that control's raw value
alternates with it. A slider now moves the modulator's BASE and skips the direct
write where the modulator is writing. ⚠️ That was true of a **finger** on those
sliders the whole time the tour existed, and nothing had ever done it.

## What the suite said

`node demo/verify.mjs radio` was **51/51 green** before, with three of those
asserts about the tour. Three asserts about a slider that moves by itself
replaced them: that it sweeps and its neighbour does not, that what it moves is
read back off scsynth with `/s_get` at two points of one reach, and that a
finger takes the handle back while the button is what turns the sweep off.
