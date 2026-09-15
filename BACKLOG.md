# Backlog — what was asked for and not yet done

🔴 **THIS FILE EXISTS BECAUSE REQUESTS WERE BEING LOST.** They were tracked in a
session's head across a long run of small reports, which works until the run is
long: two were dropped and the second report of one was *"do you have it in yr
backlog or you keep losing them"*. A request that arrives while other work is in
flight goes in HERE first and is worked from here, not from memory.

⚠️ **Not the same file as `HANDOFF.md`.** That one is the state of the project at
the end of a session, written once. This is a queue, written the moment
something is asked for and struck off the moment it is done. A line leaves this
file by being finished or by being refused in writing, never by being forgotten.

---

## Open

- 🔴 **`/tapes/`, ASKED 2026-09-15, FIVE THINGS AND ONE IS A REPEAT.**
  *"zoom to 1h"*, *"reduce space between tapes to 1px"*, *"add 2x height to
  timeline (same tape h)"*, *"scrubbimign shows 2 flickering cursors"*, and
  🔴 *"page load still trggers play!!!!"* — which has now been reported THREE
  times (*"plays on load and then stops"*, *"loading still stars and stops"*,
  this). The gate that was added is not holding and the next attempt has to
  prove it with a check that fails before it passes, not by reading the code.
- **`/videoradio/`: blend several stations at once, and loop far more.**
  *"way more looping. can you blend multiple station loops?"*. Today one mount
  is decoded at a time and one loop buffer is kept. Several stations looping
  against each other is a different instrument and a real one: the relay
  carries eight mounts and two of them are IDA. Not started.
- **Video art reading for `/videoradio/`.** *"look for video art inspiration"*.
  The scan landscape now in the page came from the Rutt-Etra processor and the
  Vasulkas, which was applied rather than researched. A proper look at what
  else is worth stealing has not been done.

- 🔴 **THE STATION NEEDS TEN MINUTES OF A REAL IPHONE, AND THE PROBE IS BUILT.**
  Open <https://positron-probe-station.kristjan-jansen.workers.dev/> on the
  phone, add to Home Screen, press play, LOCK THE SCREEN, wait ten minutes,
  then read <https://pub.positron.studio/logs?format=text> for lines tagged
  `station-probe`. It reports one line per TEN SECONDS OF AUDIO rather than of
  wall clock, so the line count is itself the answer.
  Four things only a real phone can settle: does it keep playing with the
  screen off, does the lock screen show it (this repo has never used
  `mediaSession` anywhere), does iOS enforce the ID3 PRIV tag that desktop
  WebKit ignores, does the silent switch mute it. The dropdown switches the
  three packing variants, so the ID3 question is a tap.
  ⚠️ DELETE IT AFTER: `npx wrangler delete --name positron-probe-station` and
  `npx wrangler r2 bucket delete positron-probe-station`.
  Written up in `research/station-one-source-2026-09.md` (626 lines, every
  claim tagged MEASURED with a timestamp, READ with a source, or INFERRED).

- 🔴 **`/videoradio/` REDESIGN, ASKED 2026-09-15.** Seven things, verbatim:
  *"buttons under video inside box, fullscreen on right"*, *"show video canvas
  immideately"*, *"visualization is so so boring. muddy yellow. pointless
  scanline. go 90deg for hoziz vintage scanlines feel"*, *"whole thing should
  strobing fulcuating thing in rythm, glitch, multicolored (figure out how to
  made it related to sound)"*, *"rm logs"*, *"add how it works (deep into
  detail)"*, *"add glow postprocessing (synthwavy)"*.
  ⚠️ Sound is explicitly NOT in scope: *"sound is ok bw"*.

- **The stutter is NOT the decoder, MEASURED on a real iPhone (iOS, 2026-09-15).**
  `?report=1` shipped the numbers back. The stream layer is clean on IDA:
  **underruns 0, dropped 0, errors 0**, 468 of 468 frames decoded, settled
  `317 vs 320 kbps nominal`, `framing adts`, `mp4a.40.2`. The phone ran the
  page's own **16 asserts green**, which is a path `verify.mjs` cannot reach at
  all, so IDA on iOS is now proven rather than assumed.
  ⚠️ `skipped` reaching 53 is NOT the fault: the burst trim is windowed to the
  first four seconds of a stream (`startingUp`), and outside it the ceiling
  becomes `MAX_AHEAD` and nothing is discarded. Each `startedAt` jump in the log
  is a station switch rebuilding the decoder, which is expected.
  🔴 **What is thin is the MARGIN.** `no gap past a 1 s buffer` passed while
  reporting `worst 345 ms over 54 reads`, and `buffered` was **0.534 s** at its
  tightest, below the 600 ms `floorMs` it is supposed to hold. A 345 ms arrival
  gap against a 534 ms cushion leaves 189 ms. That does not underrun and it is
  not comfortable, and 320 kbit/s is 2.5x every other mount.
  The lever is a per-station `floorMs`, sized like `NOMINAL_KBPS` already is,
  rather than one constant for a 128 and a 320 kbit/s stream. NOT DONE: it is a
  real change to a shared module and the cause is a margin rather than a fault.
- **`keep` fails 13/14 on a 409, and it is not ours.** Cloudflare refuses a WHIP
  input that is already in use. MEASURED by A/B: identical 13/14 with and
  without this session's `timeline/strip.mjs` change, and it fails run after run
  when nothing else is running. Something holds that input; the page reports it
  as a console error, which is the harness noticing correctly.
- **Uneven x axis on `/tapes/`, as an option.** *"or support uneven x acis just
  as markers"*. Ticks at each tape's start rather than at regular intervals, so
  every label names something. Offered as an alternative to the relative time
  ruler that is there now; not built, and worth looking at the built one first.
- **The em dash sweep is all but done.** 418 reader-facing strings across 62
  files, and the two FORMATTERS that were stamping a fresh one onto every
  failing assert (`shell.mjs`'s assert log and `verify.mjs`'s ok/FAIL printer),
  which no sweep of strings could have reached. What remains is only what was
  agent-held at the time: `radio1965` (23), `tapes` (4), `resources` (2), and
  four in `shell.mjs` that are not the formatter.

## Done, with what it was measured at

⚠️ These stay. A struck line is how a repeat request is recognised as a
repeat, and several of these were asked for more than once.

- ✅ **DONE. Space between the walk buttons and the scrub knob.** *"add space
  between"*, with a picture of them almost touching. `.tbar-head` is 10 px wide
  and centred on its position, so at 0 it hangs 5 px past the track's left edge
  and at the end 5 px past the right. The row's `gap: 8px` is measured to the
  TRACK, which is invisible, so what was actually between the button and the
  knob was **3 px**. The track now carries `margin: 0 5px`, the knob's own
  radius, so the ink you can see gets the 8 px every other member gets.
  ⚠️ Not a bigger row gap: that gap is shared by every member and was tuned to
  8 to stop the bar wrapping to two rows, so raising it to fix one edge would
  push the rate group onto a second line on the pages that only just fit.
- ✅ **DONE. `buffer` and `lost` are on screen, and they are a PAIR.**
  The readout went four cells to six rather than swapping one out: five is not
  available (`mount()` throws on an odd count) and `moving` was not the weakest
  cell, it just looked like it beside two counters nobody could see.
  `lost` is `underruns + dropped`, what went missing after the stream settled.
  ⚠️ `skipped` is deliberately NOT in it: that is the opening burst trim,
  windowed to four seconds, and it reads 53 on a perfectly healthy start. A
  number that alarms every time is a number nobody reads twice.
  🔴 And `buffer` is the cell that earns its place, because `lost` reads 0 on a
  healthy stream while `buffer` moves the whole time and falls FIRST. A new
  assert grades the distance the old one could not see: `no gap past a 1 s
  buffer` passes at 345 ms and at 990 ms alike. MEASURED on this desktop,
  **515 ms of sound in hand at the tightest against a 112 ms worst gap, 403 ms
  spare** — and 515 is under the 600 ms floor here too, so the iPhone was not
  special and the per-station `floorMs` item below is the right next move.
  It doubles as the plumbing check: `tightest` is written only where the two
  cells are written, so a finite value proves they were fed rather than left at
  one em dash.
- ✅ **FIXED, AND IT NEEDED A MASTER GAIN RATHER THAN ONE MORE WIRE.** `sink`
  was fed by the station's path and the loop's gain while the engine left the
  page by a route of its own, so with the fader hard over to the granulator the
  meter read **0.0000 over a signal that was playing perfectly** and every check
  standing on it passed by measuring nothing. `speakers` is now the one way out
  and the analyser hangs off it alone.
  ⚠️ Graded three ways at once, because each kills a different vacuous pass: the
  meter reads the grains, the station's gain is at zero so the grains are what
  it read, and the same window with the output muted reads under an eighth.
- ✅ **IDA STAYS ON THE RELAY. DECIDED, do not re-litigate.** The agent that
  wired it recommended fetching direct, since IDA has TLS and CORS and needs no
  proxy. Overruled for ONE PIPELINE: `srcOf(id)` is one path for every station
  and nothing branches on which, so a station fetched another way would be a
  second path only one station takes.
  ⚠️ And the hop is not a cost. MEASURED, time to first byte, three runs each:
  relayed 0.185 / 0.325 / 0.256 s against direct 0.397 / 0.447 / 0.444 s. The
  relay is FASTER every time, because Cloudflare's edge is nearer than their
  server. What it does cost is egress: 320 kbit/s is 144 MB per listener-hour.
  Written up in `workers/shout/NOTES.md`.
- ✅ **DONE. Varispeed with inertia on the walk buttons.** Playing: the rate eases
  to a 0.0625 floor over 260 ms, the reel changes at the bottom, and it climbs
  back over 420 ms. Measured from outside: floor at 255 to 265 ms, full speed at
  689 to 693 ms against 680 declared. `preservesPitch = false`, so the pitch
  follows and the speed buttons are varispeed too.
  ⚠️ PAUSED, THERE IS NO ARC AT ALL. Nothing standing still has momentum, and a
  ramp over silence is a control that visibly does nothing while costing two
  thirds of a second. Asserted either side.
  ⚠️ AND INERTIA IS TOLD APART FROM A STALL BY MEASUREMENT: the climb's rate
  curve has a known mean, so the tape it SHOULD have moved is known and compared
  with what `currentTime` actually moved. 0 ms of 289 on a cold reel, 290 to 294
  of 289 when the tape was there.
- ✅ **DONE, and the time was not where the comments assumed.** `await
  audio.play()` was the flake: it settles when the DECODER has started, not when
  playing is allowed, measured 1.1 s warm and **5.9 s cold**, and awaited twice.
  That is CLAUDE.md's "never let sound gate the work" inside this repo's own
  file. Also: the loop check was seeking 20% into a 200 MB archive.org file, so
  a range request stalled `readyState` for up to 12 s; its marks are at the head
  now, where the page has already buffered. Ready time median **3626 to 2472 ms**,
  worst **9189 to 5529**, ten runs each. No check was weakened.
- ✅ **CLEARED, and the diagnosis held.** MEASURED now: all EIGHT stations up,
  `radio1965` 200 included, plus both IDA channels. It was between Cloudflare's
  edge and ERR for three mounts, exactly as the two-mounts-still-200 control
  said, and it needed nothing from us.
  `/radio1965/` re-run against the REAL relay is **43/43 green**, naming Radio
  1965 itself rather than falling back, with the tempo lock reading
  `23.00000 whole laps, 0.000 thousandths out`. The presets had only ever been
  verified against a stand-in; they are now verified for real.
  ⚠️ And IDA plays on the DEPLOYED page: 816 frames in, 816 decoded, 0 errors,
  framing `adts`, codec `mp4a.40.2`.
- ✅ **FIXED, AND IT WAS FAR WORSE THAN 32 AND 30.** The shell's two asserts at t+0 disarmed `verify.mjs`'s first-assert wait on EVERY shelled page, so the page reported **2 of 43** and the suite said `13/13 green`. The shell publishes `shellAsserts` now and the harness asks the question it means. 43/43. LESSONS #95.
- ✅ **DONE, and without the clock**, which was cut on instruction (*"jsut back to back tapes"*). The 24 tapes run end to end from nought, each as wide as it really is, one lane declared the way `/loops/` declares its lanes. The `LANES` table, `buildLanes()` and the `packRows` packer are all gone.
- ✅ **DONE. The loop's three marks on the wave.**
- ✅ **DONE. The speed row is gone and replaced.** Not repurposed this time: the
  `0.0625 … 1` lattice came off the transport adapter and a four-cell `loop` row
  took its place, greyed until a loop runs. Each cell is a different MECHANISM,
  not a different number of one: `round` the kept seconds as they arrived,
  `back` the same samples mirrored, `half` the same lap an octave down and
  bit-exact at 768000 samples, `chop` a sixteenth of the lap with the grains
  retuned to it. Three of the four are things a live stream cannot do at all.
  ⚠️ `drift` was REFUSED: a wandering tape cannot be told from a broken clock by
  ear, and it would unpick the tempo lock.
- ✅ **FIXED. The push path was broken in BOTH directions by one missing value.**
  `FCM_TOPIC` was not in `workers/items/wrangler.jsonc` at all, so `announce()`
  threw on every publish AND `POST /subscribe` had no topic to join a device to.
  Nothing had ever been subscribed to a correctly named topic, which is why
  choosing one was safe. It is a `var` rather than a secret: a topic name is a
  public channel name every subscriber must know, and `FIREBASE_SA` beside it is
  the thing that must stay secret.
  MEASURED after: `has_topic: true`, and a probe published into the real room
  came back with **`announced_at=1789484181710`**, the first stamp that room has
  ever carried. Probes cleared; the room hands over empty.
  ⚠️ The name is `positron-items`. Changing it means every device re-subscribes.
- ✅ **Lane label. DONE.** The swatch is now as tall as the text beside it (9 px
  for a name alone, 14 where there is a sub-label under it), the name sits
  higher when it is alone, and it carries the lane's own colour mixed 42% into
  the ink. The name used to be `T.ink` on every lane, so on a strip of six the
  names were six identical greys beside six coloured ticks and joining them up
  was the reader's job.
- ✅ The 14 corpus corrections survive a rebuild. The values live in
  `proto/deck/ingest.mjs` (twelve) and `demo/resources/build-corpus.mjs` (two),
  both generators reproduce them, and three guards refuse rather than drop them.
  Every `proto/aikajana` reference is gone from the two generated files and from
  `proto/deck/verify.mjs`, which had been navigating to a 404.
- ✅ 🔴 And the rebuild found a second, larger defect: the `kurenniemi` ->
  `resources` rename matched BARE WORDS inside `build-corpus.mjs` and corrupted
  twelve string literals, including three record filters and two live host
  paths. A full rebuild returned **285 rows instead of 334**, with Zenodo
  keeping 0 of 28 and archive.org 0 of 15. Repaired; 334 again.
- ✅ `/resources/` reads `when.how` and `when.note`. The date cell says who the
  date comes from and how wide the bracket is, in two short lines; the row says
  what the record is and why its date is not narrower.
- ✅ `/tapes/`: playhead off the map, loaded tape ringed and the rest dimmed, press
  a mark to load, rate control fixed, load blip gated, loop freezes the wave
  instead of rescaling it, labels legible with real padding.
- ✅ `held`: the sentence across four walls, size from word length, sentence case,
  textarea of three lines, live rebuild on every keystroke, readout removed.
- ✅ Live loop with a blinking button and no scrollbar; frozen waveform playhead;
  both joined on `/radio1965/` and `/tapes/`.
- ✅ `/radio1965/`: it now KEEPS the audio and plays it back, measured at the
  destination. Boxes fade in together on first sound. Scope window widened to
  the granulator's buffer, which had been silently dropping the oldest quarter.
- ✅ Diagrams: 1 px border on every kind, less saturated edges, centred ties,
  no hue on a name whose box paints none, no articles in labels, notes name the
  technology, service worker inside the phone, two phones for the fan-out.
- ✅ Tables: `/wire/` and `/items/` on `table.mjs`, no header fill, more padding,
  and the component added to `/kit/` with its negative control.
- ✅ `/kit/`: mounts the shell, 8 asserts, graded by the suite for the first time.
- ✅ `mirror`: hold-to-quit badge, and the LOOK control swapped to `createPicker`.
- ✅ Readouts removed from `items`, `held`, `wire`.
- ✅ `shout` carries Radio 1965's recordings at `/rec/<name>.mp3`.
- ✅ `NOTES` emptied, both essays moved to `research/`, `/notes/` no longer built.
- ✅ `LESSONS.md` renumbering, and the rule about it.
