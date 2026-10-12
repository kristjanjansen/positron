# Sustain (concept sampler/015), archived 2026-10-12

Asked: *"arcive/move to md the sampler015"*. The page is gone from the site and
from the tree. Its last version is `demo/concepts/sampler/015/index.html` in
commit `a1e3ceb5` (`git show a1e3ceb5:demo/concepts/sampler/015/index.html`),
586 lines, one file with no module of its own. It lived for one day: first
commit `2078e5c3` and nine commits in all, every one on 2026-10-11.

## What it was for

A debugger for a real sustain pedal, between 010 (the sampler) and 020 (the
looper whose only control is CC 64). Asked: *"do 015 with sustain debuggind.
what you get from the port, timings, "gestures""*. The owner's looper on
`/concepts/sampler/020/` was dropping presses and the question was whether the
foot, the pedal or the keyboard was to blame.

## What it showed

- **Every message off every MIDI input**, notes too (*"show alwats
  everything"*), in a table: `at ms` (the event's own `timeStamp`, never
  rounded), `bytes` in hex, a `reading`, `gap ms` since the previous message
  on the same controller of the same port, `ch`, `port`. 12 rows minimum,
  sticky, capped at 1000 rows on screen and 5000 kept. Clock and active
  sensing were counted and not listed.
- **A readout for the pedal that last spoke on CC 64**: messages, presses,
  last press length in ms, message rate during it, values seen, distinct
  values, a `type` guess and a `polarity` guess.
- **Gestures**, as a table (6 rows minimum) and as marks on a strip: press and
  release exactly as 020 reads them, and tap, hold, double, half pedal and
  bounce on top. Each press row also said what 020's looper would do with it
  (*"020 would loop 0.132 s"*, *"020 would ignore it, ... springing back"*).
- **A timeline strip** with two lanes: `CC 64` as a stepped line per port (a
  controller holds its value until the next message, so a slope would draw
  values nobody sent), a dot per message unless dense, and `gestures` as
  lettered ticks (P press, T tap, H hold, D double, ~ half, B bounce). It
  followed now over a 4 s window and came back to now 3 s after the last touch.
- **A Copy log button**, the only button left after Follow, Clear and the
  message filter went (*"just add copy button"*). The log is a per port
  summary line, then every message and every gesture as tab separated rows.
- **The on-screen keyboard** with a latching Sustain button (127 down, 0 up)
  and the piano sampler, so the pedal was heard, and a patchbay.
- **Two warnings in the log**: a port that reads `inverted` (020 would then
  loop on the release; an MK-425C senses polarity at power up, so power it
  with the pedal up), and a controller other than 64 that only ever said 0 and
  127 (a pedal mapped to the wrong CC).

## The thresholds, used nowhere else

| name | value | rule |
| --- | --- | --- |
| press | `PEDAL_ON` (64) | CC 64 crossing from below 64 to 64 or above; state before a port's first message is 0, as in 020 |
| release | 64 | crossing back below |
| `TAP_MS` | 250 ms | a release under this after its press is a tap, otherwise a hold |
| `DOUBLE_MS` | 400 ms | a tap whose press came under this after the previous tap's release |
| `HALF_MS`, `HALF_BAND` | 200 ms, 16 | value inside 1..126 and inside a 16 wide band for 200 ms is half pedal |
| `BOUNCE_MS` | 20 ms | a crossing under this after the previous one |

020's looper rules were copied in so the page could say what 020 would do:
`SPRING_MS = 70`, `MIN_LOOP_MS = 500`, `CLEAR_HOLD_MS = 3000`, and
`pressAction(state, t1, releasedAt, now)` returning `spring`, `short`,
`close`, `overdub`, `keep` or `start`. A hold of 3 s or more said that 020
removes the newest overdub or clears a loop of one layer if no note was played
during it; 015 did not follow notes, so it said which way it went rather than
guessing.

**The guesses.** `type`: only 0 and 127 seen is a switch, six or more distinct
values is continuous, fewer is unsure. `polarity`: the first CC 64 message from
a port is taken as the first press. For a switch, 64 or above is normal and
below is inverted; for a continuous pedal, the direction of its first change
decides. A second vote, time spent on each side, was tried and removed: on the
synthetic script a normal switch held a second at a time read `unsure`, and so
did an inverted one.

## How it was built

- **MIDI opened directly, not with `createMidi`, on purpose.**
  `/shell/midi.mjs` never hands a page the port name, and it owns
  `port.onmidimessage`. 015 used `navigator.requestMIDIAccess({ sysex: false })`
  and `addEventListener('midimessage')`, and `/shell/midi-decode.mjs` for the
  reading, as `/dump/` does.
- **Kit modules**: `shell.mjs` (`mount`, `el`), `/concepts/nav.mjs`
  (`conceptNav`), `keyboard.mjs` (`createKeyboard`, `keyRange(21)`, base 48,
  `sustain: true`), `pedal.mjs` (`PEDAL_ON`, `SUSTAIN_CC`), `midi-decode.mjs`
  (`decode`), `bay.mjs` (`createBay`, `classOf`, `CLASSES`), `patchbay.mjs`,
  `table.mjs`, `transport-bar.mjs`, `strip.mjs` (`createStripView`), `glue.mjs`,
  `button-group.mjs`, `/timeline/transport.mjs` (`createDeck`, a deck that
  plays nothing and only holds a range and a playhead that is always now),
  `/timeline/strip.mjs` (`registerRenderer('pedal-step', ...)`) and
  `/concepts/sampler/sampler.mjs` (`createSampler`, `PIANO`).
- **The patch.** The debug node is a listener beside the sampler, not a stage
  in front of it, so what reaches the sampler is exactly what the port sent.

      web:keys:midi-out -> web:pedal-debug:midi-in
      web:midi:midi-out -> web:pedal-debug:midi-in
      web:keys:midi-out -> web:sampler:midi-in
      web:midi:midi-out -> web:sampler:midi-in
      cf-r2:piano:file-out -> web:sampler:file-in
      web:sampler:audio-out -> web:speaker:audio-in

  The `web:midi` node's label became the plugged in port names.
- **Nothing fetched on a visit.** MIDI access was asked for on load (the
  browser's prompt), the samples on the first note.
- **`window.__demo.pedal`** was the check's way in: `feed(bytes, at, port)`
  through the same `emit` a real port used, `clear`, `text`, `messages`,
  `gestures`, `sources()`, `shown`.

## What it taught

From one free run the owner pasted on 2026-10-11 at 15:23, analysed offline in
Node. Full numbers in `plans/plan-sustain-pedal.md` and
`research/sustain-pedal-pressing-2026-10-11.md` section 5.

- **74 CC 64 messages, 37 presses**, MK-425C USB MIDI Keyboard, channel 2,
  values 0 and 127 only (a switch), polarity normal, no repeated values.
- **The MK-425C reads its pedal jack about 15.2 times a second.** Every message
  lay within 1.81 ms of a 65.95 ms grid (phase lock 0.9974 over all 74). That
  was visible only because 015 kept each event's own `timeStamp` unrounded.
  So every pedal time on that keyboard is right only to plus or minus 66 ms,
  a tap shorter than one tick can be missed, and the fastest double is 132 ms
  press to press.
- **Press lengths in ticks**: 1 tick 13 times, 2 ticks 16, 3 ticks 6, 4 or 5
  ticks 2. Bursts: 18, of which 6 single, 6 double, 5 triple, 1 quadruple.
- **Three re-presses one tick after a release** (43.72 s, 45.30 s, 47.68 s),
  the spring back shape, and 015's *"020 would loop 0.132 s"* and *"0.199 s"*
  rows showed the damage they did to 020.
- **That became 020's rules**: ignore a press within about 70 ms of a release
  (`SPRING_MS`), no loop under 0.5 s (`MIN_LOOP_MS`), and a hold rather than a
  double for clear. 015 then mirrored each rule as 020 gained it, up to overdub
  and the 3 s hold clear (`plans/plan-looper-accuracy.md` section 9).
- **015's own double was too strict**: press under 250, up under 400, press
  under 250 sits at or past what a foot does; the research note proposed a
  1000 ms press to press window and splitting `TAP_MS` from a `HOLD_MS`. Not
  built.
- `plans/plan-looper-accuracy.md` tags its measured numbers as coming from the
  015 export, and its step 6 proposes replaying an export through both rule
  sets *"the way 015 reports 020 would loop"*.

## Left open when it went

- Whether the MK-425C's notes sit on the same 66 ms grid, or only the pedal.
  One run with a few key presses would have settled it.
- The four short tests in the research note (polarity, fastest taps, counted
  presses, steady beat) were never run as such.
- Which edge, press or release, is steadier for this foot.
