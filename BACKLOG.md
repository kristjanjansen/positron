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

- **A diagram assert AT LOAD can silently cost a slow page its whole run.**
  Found 2026-09-16 while giving `/crate/` a diagram: `verify.mjs`'s first-assert
  budget only runs while the count is still at the shell's own two, so an assert
  fired at load pushes the page straight into the growth loop, which allows
  4.8 s in total. `/crate/`'s upload, sidecar and 60 s seek take longer than
  that, so its diagram asserts went into the end-of-run burst instead.
  `/station/` asserts its two at load and is short enough today. Nothing in the
  harness says which pages are near the edge, and a page that crosses it reports
  FEWER asserts while still reading green.

- **A container that mixes declared arrows with ties reads as a head that fell
  off, and `/kit/` currently teaches that as correct.** Found 2026-09-16 while
  fixing `/station/`: `diagram.mjs` ties every adjacent pair of children that no
  declared sibling link covers, so a container with three gaps and two declared
  arrows draws arrow, plain line, arrow down one column, in one weight of ink.
  That is exactly what was reported as a missing arrowhead. The renderer fix
  (drop every tie from a container that holds any declared link) was BUILT AND
  REVERTED: it turns `/kit/`'s `3 arrows, 1 ties` assert red and makes its
  caption false in words, and that behaviour is deliberate, demonstrated and
  graded. `/station/` was fixed by reordering its children instead, which is
  right for that page and leaves the trap for the next one. Decide whether
  `/kit/` should keep demonstrating the mixed form.

- 🔴 **SWEEP EVERY DIAGRAM FOR SPELLED-OUT QUANTITIES.** CLAUDE.md now says a
  number in a `sub` or a label is written short (`10s`, not `ten seconds`),
  reported 2026-09-16 on `/station/`. Only that page has been looked at. Every
  other page with a diagram needs the same read.

- **`/earshot/` reported `null view(s)` on a real Quest.** MEASURED 2026-09-16:
  the session line reads `session drawing · blend opaque · null view(s)` on a
  run that then drew 3322 frames in stereo at 90 fps, so the count is being read
  before the first animation frame has one. Same family as CLAUDE.md's
  `baseLayer` rule. `blend opaque` was right.
- **`/earshot/`'s hands check calls a FAIL on something nobody has done yet.**
  MEASURED on the same run: `FAIL hands · "the ray on the tablet" has not
  happened 25.0 s in` at 56.6 s, and the ray landed on the tablet at 67.1 s.
  Nobody had pointed at it, which is not a failure. A lane with no feedback must
  not count as a failure (CLAUDE.md); it should say it is still waiting.

- **`v2in: station`, asked 2026-09-16.** NOT UNDERSTOOD, and written down
  verbatim rather than guessed at. Ask before working it.

- 🔴 **`shout` OPENS ONE UPSTREAM PER CLIENT. IT DOES NOT TEE, AND THAT IS WHY
  ERR COUNTS US AS MANY LISTENERS.** READ OFF THE CODE 2026-09-16, not
  remembered: `workers/shout/worker.mjs:291` does a fresh `fetch(upstream)` on
  every request and hands the body straight back, with
  `cf: { cacheEverything: false, cacheTtl: 0 }` because a cached radio stream is
  a contradiction. So the relay is a pass-through and **N browsers are N
  listeners at the broadcaster**, plus one per harness tab and one per orphaned
  Chrome. Asked 2026-09-16: *"we have single listener atm, no?"* and the answer
  is no, not by design. The fix is a Durable Object holding ONE upstream
  connection per mount and teeing it to every subscriber, which would make this
  whole site exactly one listener per mount however many people are on it.
  `workers/shout/NOTES.md` already says a DO is *"worth doing if this is not
  enough"*; ERR's corrupted listener statistics are the evidence that it is not.
  ⚠️ It also has to handle the last subscriber leaving, or the tee becomes a
  permanent listener that nobody is hearing, which is worse than what we have.

- 🔴 **MEASURE THE MEDIA DURATIONS AND WRITE THEM INTO `corpus.json`.** Asked
  2026-09-16: *"just measure file lenghts?"*, *"and write to corpus json?"*,
  *"i mean duration"*. MEASURED NOW: `demo/resources/corpus.json` holds 334
  items, 129 with a `file`, of which **26 are time-based** (16 `audio/mpeg`,
  9 `video/mp4`, 1 `video/mpeg`) and **none of them has a duration field** —
  there is `bytes` and nothing else. `/tapes/` therefore cannot draw a record
  as long as it actually is. The generator is
  `demo/resources/build-corpus.mjs`; the amendment has to go through it or
  through a script it records in `amended`, never by hand-editing the JSON.
- **`/videoradio/` in a headset: stage A is written, stage B is not, and NEITHER
  HAS EVER BEEN RUN.** `xr-panel.mjs` takes a `surface`, `/videoradio/` has a
  Run in VR control and a sea (a second `makeField` in the session's context fed
  the same bytes as the window's, on a 36 m plane with a world-space radial
  fade). Its two asserts go through `preview()` and open nothing, but they live
  INSIDE `/videoradio/`, which no harness may open, so they will not run until
  somebody deliberately runs that page. Stage B is the displaced mesh and the
  skirts. `plan-videoradio-xr.md` §5.
  ⚠️ The audio half is ANSWERED: see CLAUDE.md, measured on a Quest 2026-09-16.
- **`/tapes/`: the lane height is right and NOTHING GRADES IT.** The 2026-09-15
  ask *"add 2x height to timeline (same tape h)"* is implemented at
  `demo/tapes/index.html` (`height: 64, barPad: 21` gives 22 px of tape), and no
  assert reads a drawn bar height, so it regresses silently. The other four
  asks from that day are DONE 2026-09-16, each with a check proved by sabotage.
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
  agent-held at the time: `radio` (23), `tapes` (4), `resources` (2), and
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
  `radio` 200 included, plus both IDA channels. It was between Cloudflare's
  edge and ERR for three mounts, exactly as the two-mounts-still-200 control
  said, and it needed nothing from us.
  `/radio/` re-run against the REAL relay is **43/43 green**, naming Radio
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
  both joined on `/radio/` and `/tapes/`.
- ✅ `/radio/`: it now KEEPS the audio and plays it back, measured at the
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
