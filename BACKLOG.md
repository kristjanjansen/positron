# Backlog: what was asked for and not yet done

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

- ✅ **DONE, AND IT WAS THE SAME FAULT `/replay/` HAD THIS WEEK.** LOOP marked
  two positions on a deck of 1965 and wrapped the PLAYHEAD between them while
  the film ran on to its end: the bar wraps by seeking, and with no `command` a
  seek goes to the deck rather than to the thing making the picture. Every verb
  drives the element now and the deck follows, with `mediaMaster` anchored to
  whichever clip is up, so a mark on the line is an offset into the film.
  MEASURED against a local stand-in film with zero bytes from ERR: the picture
  ran 4.00 to 6.43 s and came back 4 times in 12 s, against 6.90 to 18.46 s and
  0 times with the `command` taken away, which is the reported bug exactly.
  ✅ **AND THE SPACE ABOVE `NEWSREEL | RADIO`**: the block carried a `margin`
  shorthand whose implied `margin-top: 0` beat `.pos-body > * + *` on source
  order, so it sat at 14 px under the line. It takes the shell's 22 px now.

- 🔴 **`/reel/` CAN BE GRADED WITHOUT ERR, AND THE RECIPE IS PROVEN BUT NOT IN
  THE REPO.** The loop above was measured by intercepting every `*err.ee*`
  request in CDP: the item API is fulfilled with
  `{data:{media:{src:{hls:'<local>/film.m3u8'}}}}` and everything else to that
  host is failed before it leaves the browser, with the stand-in film made by
  `ffmpeg -f lavfi -i testsrc ... -f hls -hls_time 2 -hls_playlist_type vod`.
  That is `demo/fake-station.mjs`'s trick for the other half of the problem, and
  it would take `/reel/` from ungradable to gradable the same way. Promoting it
  to `demo/fake-arhiiv.mjs` plus a `standInFor` entry in `verify.mjs` is the
  open work; `floor`, `flipper` and `now` want the same thing.

- ✅ **DONE. IT WAS THE GRAIN SCOPE'S OWN CAPTION ON `/radio/`, AND IT SAID
  `Pappus, chewing the radio`.** Asked as *"rm 'pappus chewin radio' erc
  label"*, and `erc` is `src`: `createGrainScope` has a `source(name)` setter
  that paints one line of text inside the bottom-left of its canvas. The page
  set it twice. `the radio, as it arrives` at the top, then this one the moment
  the granulator came up, about a second later. The second call is deleted.
  ⚠️ THE FIRST CALL STAYS AND IS STILL TRUE: that canvas is fed from
  `srcNode` through `analyser`, which is the station's own audio for the whole
  life of the page, so nothing about the picture changes when Pappus starts.
  ⚠️ Why two sessions could not find it: the quoted phrase is not a string
  anywhere. `chewin` had to be searched short and case-insensitively, and the
  word a reader sees is `chewing`. Nothing reads the caption back, so no assert
  and no readout cell carried it either.

- ✅ **DONE, AS ONE CONTROL THAT IS OFF UNTIL PRESSED.** `Let it play itself`
  runs the same tour `/videoradio/` runs: 22 s on a sound, 9 s sliding to the
  next, the blend breathing 0.25 to 0.92, and the fader and four settings
  visibly travelling while the slide is on. The clock is SHARED now, exported
  from `radio-gran.mjs` rather than copied. A hand on the sound row takes it
  straight back on `pointerdown`, so nothing can move under a finger, and the
  log says *"the instrument is yours now"*. MEASURED 47/48 before (one stale
  red, see below) and **51/51 after**. Sabotage: deleting the hand-back call
  takes that assert red while the other stays green, so the two discriminate.
  ⚠️ **IT DOES NOT CHANGE STATION, AND THAT WAS REFUSED ON PURPOSE**: the page
  carries a standing *"do not switch channels if I do not"*, and every mount
  belongs to a broadcaster whose listener figures count what we open.
  ⚠️ **AND IT FOUND A CHECK THAT HAD BEEN RED FOR REAL**: `the station moves the
  granulator` hard-coded `msize` on the argument that `four seconds ago` routes
  the follower onto grain length. True until the page was told to open on `dub`,
  whose routes are `sos`, `drive` and `spray`, so it sampled a control nothing
  moved and read a flat 0.000 every run. It reads the destination off the sound
  that is playing now.

- ~~**`/radio/` SHOULD MOVE BY ITSELF THE WAY `/videoradio/` DOES. ASKED
  2026-09-16:** *"can you have simular cool movement you had on videoradio to
  the radio granulator too?"*, to be done in the background. `/videoradio/` is
  the same machine with the decisions given to a clock: a tour sliding from one
  sound to the next, a blend that breathes, a station that changes on its own.
  `/radio/` is the one you play by hand, so whatever it gets has to be something
  a person can take back the moment they touch a control.~~

- ~~**`/draw/`: DEFAULT ZOOM 2.0, AND THE BLUE LINE CANNOT BE SEEN. ASKED
  2026-09-16:** *"draw timeline: zoom 2.0 by default. find a way to see blue
  line on drawing (no enough contrast am blue on white). perhaps on drawing no
  blue line, fade it in when stopped and fade my drawed line into some
  semitransparent state"*. The last sentence is a suggested mechanism rather
  than the requirement: the requirement is that both lines can be told apart.~~
  DONE 2026-09-16, the suggested mechanism and it works. The strip opens at
  twice `fit()`, so half the recording is on screen. While a hand is down the
  reading is not drawn at all; lifting it fades the capture to 0.26 over 260 ms
  while the reading fades to full. MEASURED off the pad's own pixels: the two
  lines are **3.47:1** apart where they were **1.40:1**, and with a hand down
  there are **0 blue pixels**. 23/23 before and **26/26 after**, 11 page
  asserts to 14. Sabotage: `OPEN_ZOOM` 1, `READ.live` 1 and `INK.settled` 0.5
  each take their own assert red.

- **`/items/`: FIXED HEIGHT ON THE LIST BOX, AND NO EMPTY MESSAGE. ASKED
  2026-09-16 WITH A SCREENSHOT:** *"have fixed height on this box / table and rm
  empty message"*. The box holding the published items grows from nothing to
  however many rows there are, so everything under it moves, and when it holds
  none it says *"nothing published yet"* inside a bordered box that is itself
  the message.

- 🔴 **41 PAGES STILL RUN THEIR SELF-CHECKS FOR VISITORS. SWEEP THEM.** The rule
  landed in CLAUDE.md 2026-09-16 (*"rip those selfchecks out of user experience
  and make rule about it"*) and four pages obey it: `/radio/`, `/crate/`,
  `/tapes/` and `/videoradio/`. COUNTED off the tree, every page that calls
  `d.assert(` and contains no `selfcheck` gate:
  blocks, capture, click, cues, draw, feedback, flipper, floor, grains, held,
  instrument, items, jam, keep, kit, lanes, llhls, looper, loops, memento,
  mirror, moq, now, patch, rack, record, reel, replay, resources, room, score,
  seek, show, station, strip, take, transport, typist, vclick, webrtc, wire.
  ⚠️ **NOT ALL 41 ARE HARMFUL AND THE SWEEP IS NOT MECHANICAL.** A read-only
  assert over data the page already holds costs a visitor nothing and should
  keep running. What has to move behind the gate is anything that opens a file,
  makes a sound, presses a control, or moves the picture. The test is CLAUDE.md's:
  if a person were watching this page, would they see it happen? Pages worth
  reading first are the ones that record, upload or play: take, keep, record,
  memento, capture, replay, mirror, grains, jam.


- 🔴 **`/tapes/` NEEDS A STAND-IN LIKE `demo/fake-station.mjs`.** Its harness
  pulls real recordings off archive.org, so every run spends somebody else's
  bandwidth, and 2026-09-16 the instruction was *"stil: super careful with
  external sources, better avoid"*. `fake-station.mjs` did exactly this job for
  `/radio/` and took it from ungradable to 48/48 at no cost to anybody. What is
  needed here is smaller: a local host serving a few short MP3s with the right
  `content-length`, `accept-ranges` and CORS headers, and a `?base=` on the page
  the way `/radio/` already has. Until it exists, `node demo/verify.mjs tapes`
  is a thing to run once before shipping, not in a loop.

- 🔴 **THE LOOPER CANNOT OWN A LOOP ON A MEDIA ELEMENT, AND `/replay/` IS THE
  FIRST PAGE THAT NEEDED ONE. REFUSED IN WRITING 2026-09-16.** Asked as *"does
  not have global loop button with mode, just a single loop. it shoudl be global
  no?"*. `demo/shell/looper.mjs` owns a loop by HOLDING THE SOUND: the ring, the
  kept `AudioBuffer`, the mirrored copy, the joined copy, one
  `AudioBufferSourceNode` reading a lap. Backwards and there-and-back exist at
  all only because the samples can be reversed, which is exactly what no media
  element can do. `/replay/` loops a `<video>` with no `AudioContext` anywhere
  on the page, so it was given the kit's BUTTON and not the kit's mechanism: the
  same `→`, in the same `tbar-loopgrp` glued to LOOP, disabled with the reason
  on it, the way `looper.sayTooLong()` already greys a loop longer than the ring.
  What would remove this line is a second mechanism inside `looper.mjs` for a
  loop whose material is frames rather than samples. It can honestly offer
  `round` and `half` (`video.playbackRate`), and it can never offer `back` or
  `pingpong` without decoding the whole lap into memory, which for 190 s of
  video is not a thing to do on a phone.

- 🔴 **`/tapes/` AND `/radio/` DRAW A LOOP DIFFERENTLY, AND RADIO IS THE ONE
  THAT IS RIGHT. ASKED 2026-09-16:** *"tapes viz handles loop differently than
  radio. is this same component?! radio should be it"*. Both draw through
  `demo/shell/grain-scope.mjs`, so the divergence is options or call order
  rather than two pictures. Radio's behaviour is the one to keep.

  ⚠️ `HANDOFF.md` (session 29) and the `shout` line further down this file
  CONTRADICT EACH OTHER on exactly that point, so neither is evidence.

- **`/videoradio/`: REMOVE the 3-D scene from the desktop page. ASKED
  2026-09-16:** *"also lower 3d scene in desktop page"*, then, against the
  deployed result, *"i still see 3d viz below top one. remove bottom one"*.
  ⚠️ THE FIRST MESSAGE WAS READ AS "make it shorter" AND SHIPPED AS 240px ->
  150px. It meant the LOWER of the two pictures. The second message settles it:
  the sea goes, and it goes to `archive/videoradio-xr/` with the headset half it
  was built to stand in for.


- **`/held/`: a `type scale` slider on the tablet.** Asked 2026-09-16: *"make it
  a slider in left tablet (type scale) in vr (held)"*. Shipped today as two
  constants, `SCALE_BIG 1.5` / `SCALE_SMALL 1.2`, which is 36/36. Making it a
  control is kit work rather than page work: `createXRTablet` builds from
  `DEFAULT_CONTROLS` and has no way for a page to add one of its own
  (`const controls = DEFAULT_CONTROLS`). ⚠️ AND THE ROOM HAS A CEILING: at 2.5
  the page's own check reported `talk reaches 7.9 m of the 7.5 m half-wall`, so
  the slider's top end has to be bounded by the wall rather than by taste, or it
  is a control that can put a word through a wall.

- ✅ **MET IN THE WILD ON `/replay/`, 2026-09-16, AND IT COST 7 OF 10 ASSERTS
  WHILE READING GREEN.** The page reported `page asserted something · 3`. Its
  diagram asserted at load, which disarmed the first-assert budget; every check
  below it sits behind a 2.4 s guard, so they all landed after the harness had
  stopped collecting. Moving that one assert behind the first slow one took it
  to 22/22 and 10 page asserts. **The general item below is still open**: nothing
  in the harness says which pages are near this edge, and `/station/` still
  asserts at load.

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

- **`/radio/` has an assert that excuses itself, seen 2026-09-16 on the first
  run against the stand-in.** `the transport can stop the stream · nothing was
  playing to stop` passed green while grading nothing. The harness pauses the
  transport a few steps earlier (`pause holds position`), so by the time the
  page's own check runs there is nothing left to stop. It is the shape CLAUDE.md
  names: an assert that excuses itself is worse than no assert, because it reads
  green in exactly the case it exists to catch. Fix it by having the check START
  the stream itself, or by saying in words that this run could not grade it.

- **The looper is a kit module and is in no `/kit/` section.**
  `demo/shell/looper.mjs` is used by `/radio/` and `/tapes/`, and `/kit/` has no
  transport bar at all, so the way button that cycles → ← ⇆ is demonstrated
  nowhere. CLAUDE.md says build from `/kit/` and say so when you cannot: this is
  saying so. It needs a transport-bar section on that page, which is more than a
  component drop, and `/kit/` is the one page the suite cannot grade.

- ✅ **THE TEE IS BUILT AND THIS LINE WAS DANGEROUSLY STALE.** It said `shout`
  opens one upstream per client and does not tee, READ OFF THE CODE 2026-09-16.
  That was true of an older `worker.mjs` and false by the time it was written:
  session 29 shipped `class Mount`, one Durable Object per station holding ONE
  upstream and copying it to every subscriber, with `?direct=1` deliberately not
  offered. `GET /tee/<id>` reports `upstreamConnections`, which must read 1
  whenever anybody is listening.
  ⚠️ **A STALE LINE HERE CONTRADICTED `HANDOFF.md` FOR A DAY**, and the next
  person to ask *"are we a single listener?"* had two files disagreeing. Read
  the code; neither document is evidence.

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
  which no sweep of strings could have reached. `tapes` (3) is done, 2026-09-16.
  What remains is `radio` (about 23), `resources` (2), and four in `shell.mjs`
  that are not the formatter.
  🔴 **AND A WARNING FOR WHOEVER FINISHES IT: NOT EVERY EM DASH IN `radio` IS
  PROSE.** Counted while sweeping `tapes`: a good half of radio's are the
  NO-VALUE MARK — `${G.gates ?? '—'}`, `HTTP ${m.status || '—'}` — which is
  CLAUDE.md's own convention for a number nothing measured and MUST NOT be
  swept. A blind replace would turn "we did not look" into a comma.

## Done, with what it was measured at

- ✅ **IDA AND RADIO 1965 ARE BACK, LAST IN THE LIST, ON THE TEE.** Asked as
  *"bring ida's back to radio (if single listener)"*, *"bring ida to videoradio
  too"* and *"bring back radio65 stream as last. we are single user connected?"*.
  The condition was checked off the code, not remembered. NEITHER OPERATOR HAS
  BEEN RE-ASKED: what changed is the size of the claim, not their permission.
  Both are LAST because being at the front is what did the damage.

- ✅ **THE `/videoradio/` HEADSET HALF AND ITS SEA ARE ARCHIVED**, to
  `archive/videoradio-xr/` with the plan and a README of what the three device
  runs bought. Stage B was never written and now never will be here.

- ✅ **A RATE LATTICE OF ONE DRAWS NOTHING.** `buildRates()` tested
  `lattice.length`, so a cue lane declaring `caps: { rates: [1] }` produced a
  single armed radio button with nothing to choose it against: *"what this
  disconnected 1 does here?"*. Checked before changing it that `jam` and `kit`
  are the only other single-rate declarations and neither asserts on the row.


- ✅ **`/seek/` IS RETIRED.** *"rm seek demo"*. `git mv` to
  `archive/demos/seek-index.html`, its row out of `DEMOS`, and 5 real slug
  references swept of 30 slug-shaped candidates: the manifest row, the manifest
  prose that paired it with `replay`, a `verify.mjs` comment citing its 700 ms
  sweep, and a plan pointer. The other 25 are `st.reason === 'seek'` in the
  transport and history in old plans, which an archive is allowed to keep.
  ⚠️ IT ORPHANED NO COVERAGE, checked rather than assumed: its comment claimed
  *"exactly one page has to prove it works"* about the shared loop check, and
  `replay`, `radio` and `tapes` all press `pressLoop()` and assert on the wrap.
  MEASURED after: 46 rows, 43 built, `seek` absent, scratch build passes with no
  missing import, and the archived page still parses.

- ✅ **`/replay/`, ALL SIX.** 18/18 before, 22/22 after; page asserts 6 to 10.
  The lone yellow `1` was a rate radio group with ONE option, from a cue lane
  declaring `caps: { rates: [1] }`. The loop bug was real: the bar wraps by
  seeking, the deck is a `mediaMaster` FOLLOWER of the video, so every wrap was
  undone by the master's next tick while the clock climbed. It passes
  `command: { play, pause, seek }` now, the way `/tapes/` already did. Load and
  Play are gone, the transport's play does it. `what` is the manifest's `one`
  line. A diagram, `cuts` asserted at 0. Sabotage: deleting the one line that
  writes `video.currentTime` takes it red at `1.99 s against a ceiling of 1.25`.
  ⚠️ THE LOOPER WAS REFUSED IN WRITING AND CORRECTLY: it owns a direction by
  holding the sound, and `/replay/` loops a `<video>` with no `AudioContext` on
  the page. It got the kit's BUTTON without the kit's mechanism, disabled with
  the reason on its face. The lift is in this file.

- ✅ **ISOLATED DEPLOYS, PLANNED AND ANSWERED NO.** `plan-isolated-deploys.md`.
  46% of deployed bytes are shared and 45 of 46 pages import `shell.mjs`, so
  per-slug subdomains cost 44 Workers and about 179 MB a deploy to buy TIMING
  isolation over code that stays shared BY SOURCE. `wrangler versions upload
  --preview-alias` instead, which is wired as `workers/view/preview.mjs` and
  MEASURED at 11 s with production untouched.

⚠️ These stay. A struck line is how a repeat request is recognised as a
repeat, and several of these were asked for more than once.

- ✅ **DONE. `/replay/`, ALL SIX, ASKED 2026-09-16 WITH A SCREENSHOT.**
  MEASURED: **18/18 before, 22/22 after**, `node demo/verify.mjs replay`.
  1. *"transport loops but video does not, time keeps increasing"* was real and
     is fixed. The bar wraps a loop by SEEKING, and with no `command` a seek
     goes to the deck; the deck on that page is a FOLLOWER of the picture, so
     `mediaMaster` undid every wrap within a quarter of a second while the show
     ran on. The page now passes `command`, so play, pause and seek all drive
     the `<video>` and the deck follows, which is what `/tapes/` already did.
     GRADED: the check sets a loop through the real button, plays two laps and
     watches `video.currentTime`. Green it reads *the picture ran 0.81 s from
     the loop start and reached 95.81 s, against a ceiling of 96.25 s*; with the
     one line that seeks the element deleted it reads **1.99 s against a ceiling
     of 1.25 s** and goes red.
  2. *"what this disconnected 1 does here?"* was the rate radio group with ONE
     option in it, from the cue lane declaring `caps.rates: [1]`. The lane no
     longer declares a lattice, because a playhead that follows a picture has no
     speed to arm. The bar's half of it is open above.
  3. *"rm load and play, transport play should do it"*. Gone. ▸ attaches the
     manifest, starts the picture and starts the playhead; `play()` is fired and
     never awaited. The page now declares no controls at all.
  4. *"does not have global loop button with mode, just a single loop"*. The
     kit's `→` is on the bar in the kit's group, disabled with the reason on it.
     The refusal and what would lift it are open above.
  5. *"desc: single sentence only"*. The `what` is the index's own `one` line.
  6. *"add 'how it works' section"*. A `createDiagram` picture, last on the page,
     seven boxes in two machines, asserting its own `cuts` at 0.
  ⚠️ The manifest row grew `settleMs: 6000`: with no controls the page's checks
  hang off a press the harness makes BEFORE its control loop, and that number is
  what sizes the wait for a page's first assert.

- ✅ **DONE. THE L
- ✅ **SESSION 31 CLEARED THESE, ALL DEPLOYED AT `b2bddd2-092128-ad26`.**
  The full account, with what each one cost, is in `HANDOFF.md`.

- ✅ **`/videoradio/` VR IS TO BE ARCHIVED. ASKED 2026-09-16:** *"arvhice
  videoradio vr, it did not worked out"*. The headset half comes out of the live
  page and goes to `archive/`: the `Run in VR` control and its row, `makeXR`,
  `xrPreview`, the `createXRPanels` import, the session's own sea and the two
  asserts that go through `preview()`. The WINDOW sea stays, because the same
  message asks for it to be changed rather than removed.

- ✅ **MOVE `/videoradio/` TO THE `vain` GROUP. ASKED 2026-09-16:** *"move
  videoradio to vain group"*. Front-page grouping, in `demo/shell/manifest.mjs`.

- ✅ **REMOVE THE LEAVE-FULL-SCREEN BUTTON ON `/videoradio/`. ASKED 2026-09-16:**
  *"rm \"back from fullcreen\" button in videoraio"*. The `⤡` in the bottom
  left of the pane (`outBtn`).

- ✅ **THE LOOP PAIR IS TWO DIFFERENT BORDERS AND THE ARROW IS NOT SQUARE. ASKED
  2026-09-16 WITH A SCREENSHOT:** *"loop buttons should have same border color.
  arrow button square size"*. In the picture `LOOP` carries a dim border and the
  → glued to it carries a bright one, so one control reads as two, and the arrow
  half is wider than it is tall. `demo/shell/looper.mjs` owns both.

- ✅ **`dub` AS THE DEFAULT PRESET. ASKED 2026-09-16:** *"dub as default preset"*.

- ✅ **THE PLAY BUTTON CHANGES SIZE WHEN IT BECOMES PAUSE. ASKED 2026-09-16 WITH A
  SCREENSHOT:** *"play button is always square"*. `▶` and `❚❚` are different
  widths, so a button sized by its content resizes on every press.

- ✅ **`/videoradio/` SHOULD USE THE STANDARD TRANSPORT BAR. ASKED 2026-09-16 WITH
  A SCREENSHOT:** *"use standard transport bar here (LIVE badge as in radio).
  fullscreen button replaces loop"*. Today it has a hand-rolled `.vr-bar` of two
  buttons, which is the fourth-copy-of-a-component failure CLAUDE.md names.
  `createTransportBar` with `live: true` draws the LIVE chip `/radio/` uses, and
  the ⛶ goes in the slot the LOOP button occupies there.

- ✅ **`/tapes/` STILL LOADS AND PLAYS ON PAGE LOAD. REPORTED 2026-09-16 AGAINST
  THE DEPLOY**, <https://positron.studio/tapes/>: *"tapes still does some
  loading and playback on page load"*, and *"omg you still do not get it"*,
  which is the second half of the report and says this has been asked before.
  ⚠️ THE LAST SESSION FIXED A DIFFERENT THING AND CLAIMED THIS ONE. What it
  removed was twenty-four `preload = 'metadata'` requests to archive.org, and
  the handoff then wrote *"the page opens NO media elements at load"*. A visitor
  is still getting sound and still getting a fetch, so whatever is doing it was
  never the thing that was measured.

- ✅ **CHROME DROPS OUT OF FULL SCREEN WHEN THE RADIO SOURCE CHANGES. NAMED
  2026-09-16:** *"chrome drops out of fullscreen when radio source changes. just
  take it as a fact and try to work to avoid it. or do tests around to replicate
  and find solution."* This is almost certainly the same fault as the standing
  *"`/videoradio/` drops out of full screen after 22 to 25 seconds"* item, which
  has been open since session 28 and unexplained: the tour changes station on
  roughly that period, so the clock everyone was looking for was the station
  rotation rather than a timer.
  ⚠️ **THE TERMS OF THE WORK WERE SET WITH IT AND THEY ARE NOT OPTIONAL:** *"be
  very gentle make sure proxy tee work and no assersions on live items. this is
  very gentle r&d"*. So: no assert loops against live mounts, and whatever is
  built has to confirm the tee is still holding one upstream.

- ✅ **`/box/`: A DIAGRAM, A LAG READOUT, AND DROP THE COLLECTION LINE. ASKED
  2026-09-16:** *"add diagram to box demo. i want lag readout. rm
  Will_Godfrey_Collection · 657 of 878"*, then *"add 'patch' label to patch
  selector"*.

- ✅ **`/crate/`: CLICKING A FILE PLAYS IT. ASKED 2026-09-16:** *"no table rework.
  just make clickin files playable"*. Narrows the older three-part ask to one
  part and explicitly refuses the rest: leave the table alone.

- ✅ **`/tapes/`: THE NO-WAVEFORM LINE IS UNREADABLE AND THE EMPTY BOX LOOKS
  BROKEN. ASKED 2026-09-16:** *"what does it mean. many kureniemis do not
  play"*, against `Computer Music: its host will not share this file with a
  page, so it plays with no waveform`, printed in the log's FAULT colour with a
  blank bordered box above it.

- ✅ **`/replay/` DOES NOT SAY WHERE THE CUES COME FROM. ASKED 2026-09-16:**
  *"https://positron.studio/replay/ does not say where from the cues come"*.
  The page draws eight operator cues on the strip and nothing on it says who
  made them or when.

ENGTHS ARE MEASURED AND THEY ARE IN THE CORPUS.** Asked as
  *"also do measure file lengths gently and write to corpus and use them"*.
  `demo/resources/measure-durations.mjs` asked all 26 time-based files with
  ffprobe, ONE AT A TIME, two seconds apart, at `-probesize 65536` so it reads a
  header rather than half a recording: **26 of 26 answered**, including a 990 MB
  AVI (52 min) and a 225 MB MPEG program stream (4 min). They live in
  `demo/resources/durations.json`, `build-corpus.mjs` merges them, and
  `corpus.json` now carries `durationMs` on those 26 rows and a `durations`
  block saying who measured them and when.
  ⚠️ MERGED THROUGH THE GENERATOR WITH `--offline`, which asks no source
  anything: MEASURED byte for byte identical to the committed file apart from
  its timestamp, then 26 rows changed and every change was the new field alone.
  ⚠️ AND `/tapes/` USES THEM: the run is drawn at its real length in the first
  frame and the page opens no media elements at load. It was twenty-four
  `preload = 'metadata'` requests to archive.org on every visit, correcting the
  picture over the following seconds. 24 of 24 measured, 1.2 to 13.8 minutes.

- ✅ **DONE. THE LOOPING UI IS GLOBAL AND `/tapes/` HAS IT.** Asked as *"make it
  use same looping ui as radio (make it global)"*. `demo/shell/looper.mjs` owns
  the ring, the kept buffer, the mirror, the voice, the head fraction and the
  button that cycles → ← ⇆; `/radio/` lost 222 lines to it and `/tapes/` gained
  the whole instrument. MEASURED: radio **48/48** against the stand-in and tapes
  **37/37**, with the tape's own check proving backwards is the same samples
  mirrored (4 of 4) and a sabotage of `reversedCopy` taking it red.
  ⚠️ `/tapes/` keeps the FIRST LAP off the tape and plays every lap after it off
  the ring, because a media element has no negative playback rate.

- ✅ **DONE. THE DRAWN TAPE HEIGHT IS GRADED, IN PIXELS.** The 2026-09-15 ask
  *"add 2x height to timeline (same tape h)"* was implemented and graded by
  nothing. The check scans the canvas for the tallest run of ink inside the lane
  rather than re-deriving `height - barPad * 2`, which would have been comparing
  an answer with itself: **22 px of tape over 122 columns in a 64 px lane**, and
  `barPad: 8` takes it to 48 px and red.

- ✅ **DONE. `/tapes/` SAYS IT IS LOADING, AND THE PICTURE MOVES ITSELF.** Asked
  as *"Loading on entry, selfmiving zoom"*. The name line says `finding the
  recordings` until there is something to name, the strip pulses until it has
  bars, and once the run is known the window opens on the WHOLE two and a half
  hours and closes onto an hour over 1.2 s, then slides along with the tape and
  stops at both ends of the run. MEASURED: **38 frames from 142 minutes wide
  down to 60, 16 of them in between**; a playhead at 118.5 min brings the window
  from -1.2 to 81.2 min. Both stop the instant a hand touches the strip, and
  both go red under sabotage.

- ✅ **DONE, AND IT UNBLOCKED A PAGE NOBODY WAS ALLOWED TO RUN.**
  `demo/fake-station.mjs` is an Icecast mount that is nobody's radio station:
  real MP3 frames, real ICY headers, a real text channel, a `/health` route in
  the relay's shape, paced at 128 kbit/s. `verify.mjs` starts it itself whenever
  `radio` is in the run. **48/48 green with zero bytes from ERR**, which is how
  the looper refactor was graded at all.

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
  spare**, and 515 is under the 600 ms floor here too, so the iPhone was not
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
