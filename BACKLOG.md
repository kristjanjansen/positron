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

- 🔴 **THE ARCHIVE'S PLAYHEAD MOVES AND ITS PICTURE DOES NOT, AND THE FIX IS
  ALREADY IN THIS REPO.** MEASURED 2026-09-18 on `/stage/`: seeking the archive
  from 0.794s to 3.177s moves `currentTime` to both positions EXACTLY, and
  `readBurnedFrom` returns the identical millisecond at both.
  🔴 **THE CAUSE IS THE FILE, NOT THE PAGE.** MediaRecorder WebM carries no cues
  and no SeekHead, so a browser reports the position it was asked for and keeps
  showing the frame it already had. Every seek control on that tab is therefore
  honest about where it is and wrong about what it shows.
  ✅ **`proto/selfrec/indexer.mjs` IS THE ANSWER AND IT IS WRITTEN**: a
  zero-dependency EBML parser that walks the clusters and emits
  `[{tMs, chunkSeq, offsetInChunk, byteOffset}]`, so replay becomes Range
  requests plus MSE. `plan-stage-live.md` §4.5 names it as what replaces the
  blob and step one deliberately did not build it.
  ⚠️ **THE CHECK SAYS THE TRUE THING RATHER THAN THE FLATTERING ONE.** It grades
  the playhead, which is the half the page is responsible for, and the page logs
  the other half in words. Asserting the picture would be a permanently red
  suite; asserting nothing would be dropping the claim the page was built to
  make. **`plan-stage-live.md` §10.6 is therefore NOT met.**


- ✅ **THE TEST FRAME'S LAYOUT, REWORKED IN SEVEN ASKS ON 2026-09-18.** Two
  clocks side by side at 64 px, numbers sitting on the row with the same `PAD`
  above the bed as below it, labels 80 px up, and a **30x30** square at the top
  `PAD` from the edge, crossing the run between the strip's own margins.
  ⚠️ **EVERY NUMBER IS DERIVED FROM `PAD` AND `ROW`, NEVER TYPED**, which is
  what made the asks composable: *"same space as the timecode"* is one constant
  in both places rather than two 60s that can drift.
  ⚠️ **AND THE SQUARE TOOK THREE GOES**, which is worth keeping: *"same h and w
  as timecode strip h"* has two honest readings, the black bed at 96 and the
  white blocks at 56, and it was neither. A number settled it.
  🔴 **ALL THREE RENDERERS MOVED TOGETHER**: `burn()`, `ffmpegFilters()` and
  `workers/pub/container/server.mjs`. **A REAL DRIFT WAS FOUND DOING IT**: the
  ffmpeg copies convert a canvas BASELINE into a box TOP with a hand typed
  offset, and when the number shrank from 84 to 64 the offset stayed, so the
  container drew it **25 px too low** and nothing said so. Derived now, from the
  0.774 ratio read back off the numbers the file shipped with.
  ⚠️ **NOTHING COMPARES THE THREE RENDERINGS.** That is the standing risk here,
  and it is why the drift above survived: the container's output is only ever
  seen inside a container.

- 🔴 **THE CONTROL ROOM'S START AND STOP BECOME A STANDARD TRANSPORT BAR. ASKED
  2026-09-18:** *"start the show | stop: standard trasport bar"*. Two ad-hoc
  `<button>`s were built for it, which is the fourth-copy mistake CLAUDE.md
  names: build from `/kit/` and stop and ask rather than hand-roll a control
  that exists.
  ⚠️ **`/radio/` IS THE SHAPE**, not `/replay/`: `live: true` replaces the clock
  with a LIVE chip, and the toggle is start and stop rather than a claim about a
  position inside a recording, which is the distinction `transport-bar.mjs`'s
  own header is about.


- 🔴 **AN ERR ARCHIVE CLIP AS THE STAGE SOURCE. ASKED 2026-09-18:** *"can you
  stream this to the feed? https://arhiiv.err.ee/video/vaata/op-489 from 10:40
  15:39"*. A 4 minute 59 second excerpt, played into the feed the control room
  publishes.
  ⚠️ **THIS IS THE ONE SHAPE THE ERR RULE EXPRESSLY ALLOWS**, and it is worth
  writing down so the next reader does not treat it as an exception being made.
  CLAUDE.md's rule is *"open one only when a person is going to listen to it"*:
  the harm it exists to prevent is a broadcaster's audience figures being
  corrupted by unattended machines, and a deliberate attended one-off by the
  person who owns the project is precisely the case it carves out. *"Leave err
  alone"*, said earlier the same day, was about the automatic connections.
  🔴 **SO IT IS NEVER THE DEFAULT SOURCE AND NEVER REACHED BY A HARNESS.** It is
  opt-in on a query parameter, the generated test picture stays the default, and
  no suite run may ever select it.
  ⚠️ **AND TWO THINGS THE ASK DOES NOT MENTION.** Re-publishing a public
  broadcaster's archive through our own Cloudflare feed is redistribution rather
  than viewing, which is a rights question rather than a load one and is the
  user's to answer, not an agent's. And **4:59 will not fit R2 on the open
  tier**: 24 MiB a session is about four minutes at 800 kbit/s, so the recording
  half of this either ends early or needs the trusted tier, whose caps are
  half-wired (see the `workers/ingest` entry).


- 🔴 **`workers/ingest`'s TRUSTED TIER IS HALF-WIRED, AND IT DECIDES HOW LONG A
  SHOW CAN BE.** Found 2026-09-18 while planning `/stage/`. `/open` resolves its
  caps from the TIER (`TIERS[tier] || TIERS.open`), and `/seg` then reads the
  FLAT `LIMITS` in four places. So a token-holding caller is given the trusted
  TTL and is still refused at 24 MiB a segment, 45 segments and 64 MiB an hour.
  ⚠️ It reads as correct at both ends: `/open` genuinely consults the tier, and
  `/seg`'s constants are genuinely the published caps. Only holding the two
  together shows that the tier stops applying the moment anything is uploaded.
  🔴 This is load-bearing for the live `/stage/` plan, because it is what sets
  the maximum length of a recorded show.

- ⚠️ **`workers/selfrec` COMPARES A SECRET WITH `!==` AND ACCEPTS IT IN A QUERY
  STRING.** Found 2026-09-18. A plain inequality is not a constant-time
  comparison, and a secret in a query string lands in logs and referrers.
  ⚠️ **AND THE TWO WORKERS DISAGREE ABOUT IT IN WRITING**: `workers/ingest`'s
  own `lab/tier-test.mjs` asserts that the same secret in a query string must
  NOT grant trust. One of the two is wrong on purpose and neither says which.


⚠️ **AUDITED 2026-09-18, ALL OF IT, AGAINST THE CODE RATHER THAN AGAINST ITS
OWN WORDING.** Three entries went stale in one day, which is what prompted it.
**43 entries are genuinely open. Sixteen were found already finished** and are
marked ✅ with the evidence that showed it; thirteen of those were moved to the
bottom of this file, and the rest were left where they stand.

🔴 **AND THE COUNT ITSELF WAS WRONG BEFORE THE AUDIT, BY A LOT.** This file was
reported as holding 57 open entries. It does not and did not: the `### XR`
block below is ONE request that was dictated in one message, and its forty-eight
sub-items are ordinary `- ` bullets at column zero, indistinguishable from
top-level entries to anything counting them. Thirty-one of those forty-eight are
already ✅. **Any count of this file that does not treat the XR block as one
item is an overcount**, and that is a property of the file's own shape rather
than of anybody's arithmetic.

⚠️ A verdict of "done" here means somebody read the evidence. Where an entry is
struck, the proof is in it.


- 🔴 **THE 1969 PHOTO PEAK IN `archive/megatimeline/census.json` MAY BE AN
  ARTEFACT, AND IT IS THE KIND THAT LOOKS LIKE A FINDING.** Discovered
  2026-09-18 while harvesting the ERR catalogue: **undated items are all parked
  on 1969-12-31**, whatever decade they actually belong to (sampled and found
  spanning 1963 to 2003). So any query bounded to 1969 sweeps in the whole
  undated pile, and a census built by year would show a spike there that is a
  property of the CATALOGUE rather than of the century.
  ⚠️ This is the shape CLAUDE.md warns about twice over: a partial result that
  is too tidy, and measuring a quantity adjacent to the one in question. The
  peak was committed as data. Re-check it before anything is built on it.


- ⚠️ **`demo/verify.mjs` HAS A DEAD `isReady` AND A COMMENT DESCRIBING WHAT IT
  WOULD HAVE DONE.** Found 2026-09-18 while auditing the diagram-assert entry.
  `const isReady = ...` is declared and never used anywhere in the file, and the
  25-line comment above it claims *"THE WAIT IS ARMED BY `d.ready()`, NOT BY THE
  COUNT BEING ZERO"*, which the code below it does not do. So the harness's
  stabiliser is documented as doing something it does not do, in the one file
  whose job is deciding whether a page was graded. Either wire it up or delete
  both.

- ⚠️ **`/kit/` STILL CALLS A HEADED LINE A TIE.** Its caption says *"The line
  between the last two boxes is a tie: nothing was declared there"*, and an
  assert label says *"it replaces their tie"*. Since 2026-09-16 an undeclared
  gap is drawn WITH an arrowhead and only `set: true` gives a bracket, so the
  page teaching the convention describes the old one. The decision the old
  backlog entry asked for is moot; the wording is not.


- 🔴 **`/stage/` BECOMES A REAL VIRTUAL STAGE. PLANNED 2026-09-18, NOT BUILT.**
  `plan-stage-live.md`, 1025 lines. The ask is quoted in full there. Nothing was
  built, deployed, or spent; no Stream minute was used.
  ✅ **THE SOURCE QUESTION THE ASK REFUSED TO SETTLE IS ANSWERED WITH A
  RECOMMENDATION AND ITS REASONS: the control room browser first.** `whipPublish`
  is already a kit module, the credential-hiding proxy is already deployed, and
  `/keep/` already publishes WHIP on every suite run, so it costs nothing to
  try. It also keeps ONE CLOCK at both ends, because the publisher burns the
  time into the picture and the same machine reads it back; every other source
  puts the burner on another machine and buys a weaker claim.
  ✅ **SECOND SOURCE NAMED: the M1 under OBS.** `rig/obs-pro/stream.mjs` already
  publishes WHIP to this exact live input, MEASURED at connect 3.6 s, 876 frames,
  **0 skipped**, and 4K30 on software x264 at 6.2 Mbit/s with 0 dropped. What is
  missing is only a bridge to its obs-websocket from outside that building, and
  the pattern for one exists at p50 ~65 ms.
  🔴 **OBS ON A RASPBERRY PI: NO, AND THE REASON IS PACKAGING RATHER THAN
  HARDWARE.** Debian passes `-DENABLE_WEBRTC=FALSE` in both trixie and sid
  because `libdatachannel` is not packaged at all, so `apt install obs-studio`
  gives OBS with NO WHIP output. Behind that: OBS wants GL 3.3 and V3D gives
  3.1, no headless mode, no CEF on ARM. The Pi's WHIP path would be ffmpeg, and
  the board runs 7.1.5 while the WHIP muxer arrived in **8.0**. Determined by
  reading Debian's packaging source and the FFmpeg commit, WITHOUT touching the
  board.
  ✅ **AND THE RECORDING HALF IS ALREADY WRITTEN, IN A PLACE NOBODY LOOKED.**
  `proto/selfrec/` implements every guarantee the ask asks for: an IndexedDB
  elastic buffer so a chunk survives a dead tab, a per-chunk sha256 handed to R2
  for server-side verification, a HEAD availability proof, and a manifest
  carrying `missing`. It also has `indexer.mjs`, a pure-JS EBML cluster indexer
  that makes a long recording seekable by Range and MSE with no ffmpeg. The
  ask's own words *"single file you can overwrite"* are exactly what selfrec's
  client-chosen key gives and what `ingest`'s server-minted id does not.
  ✅ **LANE 2 IS THE ONLY NEW DRAWING AND IT NEEDS NO NEW RENDERER.** `/stage/`
  already draws lane 1 and lanes 3..n. Lane 2 is a `spans` lane with `durMs` to
  the next question, and the LAST question is left unterminated so the strip
  feathers its right edge, which says `never overridden` correctly.
  🔴 **WHAT IS NOT KNOWN, WITH WHAT EACH COSTS TO FIND OUT:** whether a canvas
  source survives the operator switching tabs (rAF throttles to ~1 Hz in
  background; one publish and one look, and it decides whether a browser can run
  a show unattended); whether Cloudflare accepts a SECOND WHIP publish to one
  input and what becomes of the first, which is what *"maybe there is a switch"*
  turns on; whether CF transcodes WHIP to WHEP at all; and whether a token may
  live in the control room, which decides whether a show can exceed about four
  minutes and changes what `/stage/` IS, because the control room stops being a
  page anybody can open.
  ⚠️ **AN AUDIENCE CEILING NOBODY HAS DECIDED:** 128 relay sockets, if answers
  travel the relay.

- 🔴 **`/reel/` OPENS TWO ERR CONNECTIONS ON EVERY VISIT, BEFORE ANYBODY PRESSES
  ANYTHING, AND IT IS NOT A SELF-CHECK.** Found 2026-09-18 during the self-check
  sweep and deliberately left alone, because it is outside what that sweep was
  allowed to touch. `play(openOn, true)` runs at load: it asks the archive API
  for a newsreel and the radio programme paired with it, then attaches hls.js to
  BOTH, which pulls two playlists and their first segments. The page's own
  comment says why, and the reason is a good one: *"Open on a day where BOTH
  survive, so the thing this page does is visible before anyone presses
  anything"*.
  ⚠️ **IT IS THE `/tapes/` SHAPE WEARING A BETTER MOTIVE.** The self-check rule
  does not reach it because no check is running; what reaches it is the ERR rule,
  which is about whose server it is rather than about which mechanism opened the
  socket. Every one of those connections appears in a public broadcaster's
  audience measurement, and this one fires for every visitor and every reload
  rather than only under a harness.
  ⚠️ **SO THE DECISION IS EDITORIAL AND IS NOT AN AGENT'S TO MAKE**: an opening
  frame that shows what the page is, against a page that opens dark until
  somebody asks. Worth knowing before choosing: `/radio/` faced the same trade
  and answered it with a stand-in rather than by going dark.


- 🔴 **A QUICK RECORD AND LOOP ON THE KEYBOARD.** Asked 2026-09-17 alongside
  hold-to-retrigger and explicitly deferred in the same breath: *"we could also
  do quc rec/loop thing later"*. Nothing is built. **The seam is named and it is
  the only one**: `press()` and `release()` in `demo/shell/keyboard.mjs` are the
  single funnel every note goes through — a finger, a slide across the keys, the
  QWERTY row, a page calling `api.press`, and every repeat of a held key — so a
  recorder attaches there and nowhere else. `/looper/` already captures from its
  own `onDown`/`onUp`, which is the same seam one layer out, and
  `demo/shell/looper.mjs` owns what a loop IS for the two pages that have one.
  ⚠️ **ASK WHAT IS BEING LOOPED BEFORE BUILDING IT.** `/looper/` loops NOTES and
  `/knobs/` would loop SOUND coming back off a board in another building, and
  those are different machines wearing one word.

- 🔴 **YOSHIMI HAS NO ENVELOPE OR GLIDE CONTROLLERS EITHER, MEASURED
  2026-09-17.** With a keyboard on `/knobs/` the interesting controllers should
  be the ones that act when a note STARTS, and `rig/box/note-test.mjs` was
  written for exactly that: short played notes, rise and fall measured,
  values interleaved. CC 73 attack, CC 72 release and CC 5 portamento time all
  move the rise by 1 to 3 ms against 8 to 18 ms of spread inside one arm, and the
  peak by less than its own noise. Nothing. Together with the held-note runs that
  rules out 1, 5, 7, 11, 72, 73, 76, 77 and 78, and leaves 74 cutoff, 71
  resonance, 75 bandwidth (rejected as noisy) and 7/11 level (rejected as
  pointless).
  ⚠️ **AND `note-test.mjs` NEVER MEASURED A FALL AT ALL** — every take reported
  `not enough takes gave a number`, so that half of the tool is a broken
  collector and its verdict on release is worth nothing either way. Fix the tail
  detection before trusting it.

- 🔴 **THE BOARD HAS TO BECOME PORTABLE, PACKAGEABLE AND PLUGGABLE.** Asked
  2026-09-17: the setup should be *"repeatable"* so *"my friends can also use
  it"*, and the open architectural question is *"Is it a board which a single
  person only uses for its own use? Or is it multi-user? How much it can take
  input from different users via relay, there are the limits."* Production may
  not be this checkout. **THE PLAN IS WRITTEN, NOT "being written": `plan-portable-board.md`, 971
  lines, and its own header says nothing in it is built.** Nothing IS built, so
  the entry stands; only that clause was stale.
  ⚠️ The multi-user question is not hypothetical and has already cost sound
  twice: `/knobs/` was found refused because a visitor had pressed `sampled`,
  and `/keys/` reloaded its patch every time anybody else in the room asked the
  board a question, because the relay forwards VERBATIM to everyone. One jackd,
  one capture, one instrument, one room.

- 🔴 **THE BOARD'S OUTPUT LEVEL HAS COLLAPSED, AND IT IS NOT THE PAGE, NOT MIDI,
  AND NOT THE INSTRUMENT.** Reported 2026-09-17: *"There is no sound on knobs"*.
  MEASURED the same hour, over the relay with no browser in the way: every patch,
  every velocity, peak **0.0010 to 0.0035** of full scale where the same probe
  read **0.0445** earlier the same day. About 40x down, which is inaudible.
  What was ruled out, each by a measurement rather than by reasoning:
  - **The page and the browser.** An analyser tapped onto the audio graph's
    OUTPUT reads peak 0.0018 against 0.0035 arriving, context `running` at
    48 kHz with a 164 ms cushion. The graph plays what it is given. This is the
    measurement every previous round of this bug was missing.
  - **MIDI level.** CC 7 volume and CC 11 expression at 127 change nothing.
  - **The instrument.** Three notes sum to 2.6x one note, so Yoshimi is working;
    the spectrum is right, only the level is wrong. An `audio.stop` and
    `audio.start` over the relay did not fix it.
  So the fault is on the board between Yoshimi's output and the capture: the
  JACK graph or the capture's gain. ⚠️ **IT NEEDS THE STUDIO LAN.** The board
  dials out to the relay, so it is reachable for verbs and unreachable for
  diagnosis: `ssh positron@192.168.1.213` does not answer from outside.

### XR, asked for 2026-09-17, in one message

Quoted verbatim below because this arrived as one dictated block and the detail
in it is the specification. **General, across every VR/AR page:**

✅ **BUILT 2026-09-17, AND NOT ONE LINE OF IT IS CONFIRMED IN A HEADSET.**
Everything below is done in code and graded where a laptop can grade it —
`node demo/verify-gl.mjs` reads **162/162** (`blocks` 47 page asserts, `held`
33, `floor` 29, `mirror` 34, `videoradio` 2) and
`node demo/shell/xr-pick-test.mjs` reads **48 ok, 0 failed** — but every claim
about how any of it LOOKS through a Quest is unverified. What was measured and
what still needs a device is written against each line.

- ✅ **ONE WAY OUT, AND IT IS THE ONLY ONE.** *"all vr/ar general  make one
  general way to get out. hold down any controller button for looooong enough
  then it quits. no other exit methods/ui's for now."* ⚠️ This replaces the
  current any-button-ends-the-session rule, which is written into CLAUDE.md as
  a safety property — a long hold is still a way the PAGE owns, so the rule
  survives, but the dead-man's timer and the tablet's quit button are not
  exits any more.
  ✅ **DONE, AND THE DEAD-MAN'S TIMER IS DELIBERATELY KEPT.** It is not a
  user-facing exit: it ends a session that has drawn NOTHING after four seconds,
  which is the case where the page threw and there is no ring, no badge and no
  render loop to draw one. CLAUDE.md records exactly what removing it puts back
  — a live session, nothing drawing, no way out, no log line. Every OTHER exit
  is gone: the grip on `/mirror/`, the tablet's `Hold to leave`, and the tap on
  any button. `xr-quit.mjs` takes **any button held 3 s**, with the ring drawn
  on BOTH hands from the first millisecond and cancelling to zero on release.
  ⚠️ **THE TRIGGER IS A BUTTON, AND ON `/blocks/` AND `/mirror/` IT IS ALSO THE
  DRAG.** A drag held past three seconds ends the session. The ring is the only
  warning and it is visible the whole time. **UNVERIFIED — if that turns out to
  be intolerable in a headset, excluding index 0 is one line** and the assert
  that would have to change says so by name.
- ✅ **Rays are global and grey.** *"use global rays, (white, ends faded). when
  something active happens lighten them up. no coloring of rays, grayscale."*
- ✅ **No controller geometry, no tablet, anywhere.** *"rm controller
  geometry/tablet on all (only if i am ask on specific demo so keep that code
  ready to pop into scene)"*. Keep both components, unreferenced and ready.
- ✅ **The tablet keeps existing, without its quit button.** *"rm quit button from
  tablet but keep that component around"*.
- ✅ **The slider stays, but never in an AR scene.** *"slider is ok. but again, do
  not show it on any vr/xr when showing ar scenes"*.
- ✅ **Dots follow the room.** *"map dots to room geometry always"*.
- ⚠️ **Doubled dots with moving panels. NOT REPRODUCED; ONE CAUSE REMOVED.**
  *"window seems to have doubled dots somehow when having moving panels (mirror
  demo)"*. It was not reproduced from here: `mirror`'s own off-screen preview
  draws ONE dot field per eye at every zoom down to single pixels, because a
  window session detects no planes and falls back to the page's single floor.
  What is certain is the mechanism that CAN produce one, and it is gone. The
  grid writes no depth and nothing opaque stands between its quads, so every
  detected surface is superimposed on every other one in the same look — and a
  Quest 3 handed over ELEVEN in this repo on 2026-09-13: `door 1 · ceiling 1 ·
  wall 4 · window 1 · bed 1 · shelf 2 · floor 1`. A bed at 0.5 m over a floor at
  0 is two parallel dot fields at two heights in one place. `boundaryOf` in
  `xr-room.mjs` dots the room's SHELL only: every wall, the lowest horizontal
  surface, and the ceiling. **A headset has to confirm it; if the doubling is
  still there, suspect stereo before geometry.**
- ✅ **Panels face the viewer in both axes.** *"make them always look at me not
  only horiz but also vertic"*.
- ✅ **The move bar is half the size and monochrome.** *"retuce movebar size under
  panel 2x. make it monochrome, just lightening up when needed."*

**`/held/`:** *"text input appears in vr/ar but 3d type does not change nof after
submit nor realtime"* and *"texts in xr seems to be behind to walls sometime"*.

✅ **THE FIRST IS FOUND, FIXED AND GRADED, AND IT WAS ONE LINE.** `liveRetext`
scheduled its rebuild on `window.requestAnimationFrame`, which does not fire
while an immersive session is running — so in a headset the callback was queued
and never ran, and the flag it had set stayed true for good, so every LATER
keystroke returned at the first line. That is both halves of the report: nothing
in realtime, and nothing on submit either, because Return does not rebuild
anything, it closes the field. It uses the session's own rAF now. **MEASURED:
reverting the fix takes the new check red with `the wall read UNCHANGED`, twice.**

⚠️ **THE SECOND IS A DIAGNOSIS PLUS A GUESSED NUMBER.** The room is 15 m across
with capitals up to 2.75 m tall, so in passthrough every word stood 7.5 m out —
through the wall of any ordinary room. A Quest composites passthrough with no
depth, so they stay visible out there, which is what "behind the walls" looks
like from inside one. The whole room now scales by `AR_SCALE` (0.30) in a
session that really composites, about EYE HEIGHT rather than about the floor, so
the words stay level with you instead of sinking to knee height. **The factor is
one constant and it is a guess; a headset has to say whether 30% is right.** The
honest alternative is `plane-detection`, which this page does not ask for.

**`/blocks/`:** *"in xr blocks are angled against wall, rotated a bit, not fully
against wall"*, and on the joystick reaching through walls, *"no, keeep them,
som some hilite or smt when pushed against wall"*.

✅ **BOTH BUILT.** Nothing rotates a brick: the bricks are square to the
REFERENCE SPACE, whose yaw is wherever the headset was looking when the session
started, and a real wall is at whatever angle somebody built it at. `wallYaw` in
`xr-room.mjs` reads the angle off the measured walls — a circular mean folded by
a quarter turn, weighted by area — the brick grid snaps and clamps in that
frame, and the room draws every thing turned by it. It is **0 with no walls
measured**, so the window and every VR session are byte-for-byte what they were.
The push through a wall is KEPT, and the brick brightens and grows the moment it
reaches one.
⚠️ **THE ANGLE IS WHAT A HEADSET HAS TO CONFIRM.** `wallYaw` is graded under
`node` with three negative controls and the page grades a drop in a room turned
23°; what nobody here can check is whether a Quest's plane normals come back on
the axis this reads them from. If the bricks end up 90° out, that is the +Y
versus +Z reading and the comment above `wallYaw` names it.

- ✅ **`/keys/` IS ARCHIVED AND ITS KEYBOARD IS ON `/knobs/`, 2026-09-17.**
  `archive/keys/` holds the page verbatim as it was retired; `demo/knobs/`
  imports `createKeyboard`. Commit `27d135a`.

- 🔴 **`/knobs/` NEEDS TWO REPLACEMENT CONTROLLERS, PICKED BY EAR. TWO ENTRIES
  MERGED 2026-09-18 BECAUSE THEY WERE ONE ITEM IN TWO COSTUMES.** One said
  *"two interesting controllers, and volume comes out"*; the other said *"the
  two new controllers come out and two others go in"*. Both describe the same
  outstanding move and keeping them apart is how somebody does it twice.
  ✅ **WHAT HAS LANDED:** volume is out (2026-09-17), and so are the two that
  were tried and rejected, `bandwidth` (CC 75, too noisy) and `fm depth`
  (CC 76). The page carries `cutoff` (CC 74) and `resonance` (CC 71) and nothing
  else, which is two sliders where four are wanted. `27d135a` says so in its own
  message: *"VOLUME IS OUT AND ITS REPLACEMENTS ARE NOT IN YET, which is the
  honest state."*
  🔴 **WHAT IS LEFT AND WHAT BLOCKS IT:** choosing the replacements needs a
  measurement with the notes being RE-TRIGGERED rather than held, and that is
  blocked behind the broken fall detector in `rig/box/note-test.mjs` (see the
  Yoshimi envelope entry). Fix the collector first: its `fallMs` has `NaN` in
  both branches of its own ternary, so it can never report a number, which is
  why every take said `not enough takes gave a number`.

- ✅ **`/knobs/` USES `board.mjs`, 2026-09-17.** `createBoard` is imported and
  drives the socket, the presence badge and the frame shape check. The page's
  own comment dates it and quotes the ask: *"Ahould board.mjs used by both?"*.

- ✅ **CLOSED BY ARCHIVAL RATHER THAN BY A FIX, AND THE DIFFERENCE MATTERS.**
  `/keys/` no longer exists. Two real faults were found and fixed while chasing
  it, and `archive/keys/README.md` records the honest ending: **the silence was
  never reproduced** across four CDP routes.
  🔴 **SO KEEP THE ONE INSTRUCTION IT LEFT FOR ITS SUCCESSOR.** If `/knobs/` is
  ever reported silent, build this FIRST rather than reasoning about the graph:
  hook `AudioWorkletNode.prototype.connect` and measure what actually reaches
  the destination. Every previous round of this bug measured something adjacent
  to the question.

- ✅ **REVERB AND CHORUS ARE OFF THE PAGE AND OFF THE BOARD, 2026-09-17.** They
  are at `archive/keys-space/`. The board half is the one worth confirming and
  it is confirmed: `box.mjs` records the reverb insert being removed, and no
  verb, no CC 91 and no CC 93 for either survives in `box.mjs` or
  `jacksynth.mjs`. The only `reverb`/`chorus` left under `demo/` is the generic
  MIDI controller name table in `cc-adapter.mjs`, which is unrelated.

- 🔴 **THE PLAYOUT TRIMS BECAUSE TWO CLOCKS DISAGREE, AND NO CUSHION SIZE CURES
  IT.** Found 2026-09-16 while chasing *"some vobbly sound, cutoffs, not nice"*.
  The arrival jitter is measured and is now covered: 992 frames in 20 s, nothing
  lost, p50 20.0 ms, worst gap 83.6 ms, against a 160 ms floor, and `ran dry`
  went to zero. What is left is the board's clock against the browser's: the
  buffer grows until the worklet cuts it back, and a trim discards tens of
  milliseconds mid-note, which is a click. MEASURED on one run: 0 dry, 8 trimmed.
  A bigger floor only moves where it happens. The repair is rate MATCHING rather
  than padding, which means resampling slightly or asking the worklet to trim a
  frame at a time instead of back to the floor. `/knobs/` asserts the half that
  is fixed and reports the half that is not.

- **`/crate/`'s READOUT RELOCATION HAS NEVER WORKED.** `demo/crate/index.html`
  queries `.pos-readout` inside `d.el`, and `d.el` is `.pos-body` while the
  readout is a SIBLING of it, so the query has always returned null: the class
  lands on nothing, the row is never moved into the upload block, and the
  `hidden` meant to keep four empty cells off the page until an upload runs is
  never set. ⚠️ **AND THIS ENTRY USED TO END "mount() now returns readoutEl, which is the
  one line repair", WHICH READS AS FINISHED AND IS NOT.** The SHELL half landed
  and the PAGE was never changed: `demo/crate/index.html` still does
  `d.el.querySelector('.pos-readout')`, and the readout is a sibling of the body
  rather than a descendant, so that still returns null, the row is still never
  moved, and the line that hides it still never runs. The one line repair is on
  the page, `const readout = d.readoutEl;`, and it is outstanding.
  🔴 A HALF-STRUCK ENTRY IS HOW THE REMAINDER GETS LOST. Found 2026-09-18 by
  audit, and it is the reason this file was audited at all.

- ✅ **THE EM DASH WORDING IS GONE FROM ALL THREE PLACES, 2026-09-18.** The
  code has rendered an EMPTY cell since 2026-09-13 and three comments went on
  describing an em dash: `CLAUDE.md` and two in `/kit/`.
  ⚠️ **THE ASSERT WAS RIGHT THE WHOLE TIME, WHICH IS WHY NOBODY NOTICED.** It
  asks whether the UNIT is hidden and never what the cell draws, so it stayed
  green while the sentence directly above it described a different page. A check
  that does not test the thing a comment claims cannot defend the comment.

- **SLIDER AUTOMATION, PLANNED AND NOT BUILT. ASKED 2026-09-16:** *"plan a work
  on slider automation each slider can possibly have a mode button like loop
  does (also looking similar in right) that allow pick 'invsible hand' moving
  slider. I want to have himanline, real abalog knob / slider feel and curve.
  See also draw. We can starr with simple sweep back and forth but be ready to
  more movement presets and maybe custom too in future. When you fix knobs demo
  add it to silders. Single sidebutton, on and off atm"*. `plan-slider-automation.md`,
  six steps, the first of which decides whether the human feel is real before a
  pixel moves.
  ✅ **STEPS 1 TO 5 ARE BUILT, 2026-09-16.** `demo/shell/hand.mjs` and
  `hand-test.mjs` (23 asserts, three negative controls, a sabotage caught by
  exactly one check, and three deliberate breakages taking 4, 6 and 7 of them
  red); `.pos-seg` lifted out of `.tbar-loopgrp`, `.step` and `.pos-pick-cell`
  and measured byte for byte identical before and after; `createSlider({ hand:
  true })` with a specimen in `/kit/`; `/knobs/` turning it on for both sliders.
  ✅ **AND `/radio/` TURNS IT ON FOR ALL FIVE, 2026-09-16**, on the instruction
  that removed its `Automate` tour: the blend and the four settings. Three
  asserts, one of which reads `msize` back off scsynth with `/s_get` at two
  points of one reach, so the claim is on the far side of the wire rather than
  about a handle. **52/52 green.**
  ⚠️ **STEP 6 IS OPEN**: a second movement preset, which exists to prove that
  adding one costs one row in `MOVES`, one glyph, one sentence and one index in
  `MOVE_TURN`, and turns the button into a three-way cycle with no new control.
  ⚠️ **AND NOBODY HAS WATCHED IT YET.** Every number in the plan and in the test
  is about the shape of a curve; that Beta(3,4) with peak speed at 0.400 is what
  a hand LOOKS like is judgement, and the ten defaults (`lapMs` 2200, `turnMs`
  130, `endJit` 0.030, `timeJit` 0.120, `over` 0.022, `wobble` 0.050) are a
  guess that wants an eye on it.

- 🔴 **`/draw/` AND `/grains/` PUT SLIDERS IN `.pos-controls`, AND THE HARNESS
  PRESSES EVERY BUTTON IN THERE.** Found while planning the automation, by
  reading rather than by a failure. Neither page declares them in its `controls`
  array: both build the row themselves (`demo/draw/index.html:990`,
  `demo/grains/index.html:1140`), which is a legitimate thing to do and puts
  them in the selector `verify.mjs` presses on every demo on every run. Today
  that is harmless. The moment either page gains a control that reaches the
  board, a suite run drives a shared Raspberry Pi. The rule is that a control
  inside `.pos-controls` is a control the harness will press, and it wants a
  page-level assert rather than a memory.
  ✅ **HALF ANSWERED, 2026-09-16, AND STRUCTURALLY RATHER THAN BY AN ASSERT.**
  A page-level assert protects the page that has one, which is never the page
  where the mistake gets made: neither `/draw/` nor `/grains/` would have
  carried it. So `createSlider` answers for itself. One frame after it is built,
  a slider with an invisible hand asks whether it landed inside `.pos-controls`,
  and if it did it disables its own button, says why on the button's face and
  puts a line in the page's log. PROVED BY BUILDING BOTH: the one in the row
  reads `running false, disabled true` and the identical one beside it reads
  `running true, disabled false`.
  ⚠️ **AND THAT COVERS HANDS ONLY.** Any OTHER control somebody puts in one of
  those two rows that reaches the board is the same hazard with nothing standing
  in front of it, which is what is left of this entry.

- 🔴 **TWO HOSTS ARE STILL INDEXABLE: `moq.` AND `feedback.positron.studio`.**
  The noindex work of 2026-09-16 covered `positron.studio` and shipped
  (`robots.txt` from the Worker, `X-Robots-Tag` on every response, the meta tag
  on all 50 pages). The same change is WRITTEN AND LOCALLY VERIFIED for the
  other two hosts that a crawler would keep, and NOT DEPLOYED, because that
  session was asked to deploy `workers/view` only. One command each:
  `cd workers/moq-safari && npx wrangler deploy`, same for `workers/feedback`.
  ⚠️ `moq.positron.studio` is the only other host serving real HTML;
  `feedback.positron.studio` answers 200 JSON at `/` and its own header calls it
  unlisted rather than secret, which is the thing an index undoes.

- ⚠️ **THE OTHER SIX HOSTS WERE LEFT ON PURPOSE AND ARE NOT COVERED.**
  `items`, `pub`, `store`, `shout` and the relay answer 200 JSON at `/` and a
  search engine will keep that; `ingest`, `instrument`, `rtc`, `selfrec`,
  `cues`, `osc` answer 404 or 403 and are self-limiting. Every one of them has
  a WebSocket 101 path, and a response wrapper that rebuilds a 101 breaks the
  upgrade, so this is its own pass with its own verification rather than a
  bundled edit. ⚠️ **AND `backlog.positron.studio` TAKES LIVE TRAFFIC WITH NO
  CONFIG IN THIS REPO** (49 requests in 7 days), so there is nothing to add a
  header to: an old script still deployed, or a DNS record that outlived one.
  ⚠️ THE CHEAP ANSWER TO ALL OF THEM IS ONE ZONE-WIDE RESPONSE HEADER TRANSFORM
  RULE setting `X-Robots-Tag` on `*.positron.studio`, which needs no worker
  edits and covers the orphan too. The wrangler OAuth token is NOT scoped to
  rulesets (measured: 403 on `GET /zones/<id>/rulesets`), so it is a dashboard
  click or an API token with Zone / Config Rules / Edit.

- ⚠️ **`proto/flipper/index.html` SHIPS TWO IDENTICAL VIEWPORT METAS.** Found
  2026-09-16 while adding the robots meta to the same build step, and it
  predates that work. `build.mjs`'s `REWRITES` still inserts the viewport line
  the comment says the proto lacks, and the proto has since gained its own, so
  the deployed copy carries it twice. Harmless to a browser, which takes the
  first. The rewrite and its comment are now both wrong and one of them should
  go. `build.mjs` guards against an anchor that VANISHES and cannot see one that
  became redundant.

- ✅ **`box.ping` IS FIXED IN THE REPO AND IS NOT ON THE BOARD YET (2026-09-18).**
  It sends `pongAt` now, one line in `rig/box/box.mjs`. The collision was
  confirmed by reading rather than assumed: `wire.mjs` declares
  `ENVELOPE = ['from', 'at', 'seq', 'by']` and `format()` throws on any payload
  key in it, `reply()` spreads the body into the message, so `{ at: … }` threw
  on every send and the wrapper in `ws.onmessage` answered `box.error`.
  ⚠️ **UNVERIFIED ON HARDWARE.** `ssh positron@192.168.1.213` does not answer
  from here, so this has never run on the board. The board IS in `studio-1` and
  answered `audio.status` over the relay on 2026-09-18, so a deploy can be
  confirmed with `node rig/box/ask.mjs --room studio-1 box.ping` the moment
  somebody on the studio LAN runs `rig/box/push.sh`.
  ⚠️ **NOTHING READ THE FIELD AND NOTHING SHOULD.** `live-test.mjs`,
  `relay-compare.mjs` and `yoshimi-test.mjs` all waited on the REPLY, which is
  what never came; each times the round trip in its own clock, which is the only
  clock that can measure it. Their comments now say so.
  ⚠️ Kept below because the page half is the part worth re-reading.
  ⚠️ **THE PAGE HALF IS DONE AND WAS NOT A WORKAROUND, IT WAS A DELETION.**
  `/keys/` timed a pong that never arrived into a variable NO CELL SHOWED and no
  check asked for, which is the more interesting half of this: a counter nobody
  displays is not instrumentation, and it could never have filled anyway. What
  it was for is answered by two better things: the presence badge, and
  `openWire`'s `/stats` question, which says whether a room was full or a relay
  unreachable, which a ping cannot answer at all.

- **`ctlMeter()` DOES NOT REPORT `ctrls`.** `plan-controller.md` §4.2 specifies
  `{in, out, folded, ctrls}` and step 2 shipped `{in, out, folded, forMs, on,
  channel}`. Without the map, a page cannot assert that the last value it sent
  is the last value the board holds, and a page that reconnects cannot re-sync
  from the board's own state. A small change to `rig/box/box.mjs`.

- ⚠️ **`/rack/` MAY BE CLIPPING AT FULL SCALE, UNVERIFIED.** It posts an
  `Int16Array` straight into `pcm-playout`, whose ring is a `Float32Array` that
  stores what it is given; `/keys/` divides by 32768 first. Noticed while reading
  the playout for `/knobs/`, not measured. ⚠️ That page's own comment records
  *"it sounded noisy for an hour while six measurements said the stream was
  perfect"*, which is what this would look like.

- ⚠️ **`d.logs` DOES NOT EXIST**, only `window.__demo.logs` and `d.api.logs`.
  `/rack/` reads `d.logs.length` at line 255, on exactly the branch that runs
  when the studio Mac is off, so it throws a TypeError there.

- ✅ **STEP 0 IS ANSWERED, ON THE REAL BOARD, 2026-09-16.** `rig/box/cc-test.mjs`
  holds note 40 on bank 95 program 6 and measures the spectral centroid of what
  comes back. **CC 74 moves it 6.18 octaves**, 162 Hz to 11727 Hz, monotonically
  brighter, against a measured drift floor of 0.03 octaves from the negative
  control (the same patch twice with the controller unmoved). **CC 71 moves it
  1.12 octaves**, monotonically darker, while the PEAK doubles, 0.046 to 0.094,
  which is what resonance does: it narrows the band and concentrates the energy.
  So the plan's load-bearing unknown is closed and both sliders are real.
  ⚠️ Steps 4 (the diagram), 5 (the measurements), 6 (the SuperCollider voice)
  and 7 (`audio.start {onlyIfIdle:true}`) are still outstanding.

- **`audio.status` ANSWERS `audio.started`.** Not a bug, but it cost nine
  seconds of silence and a report that no board was in the room while writing
  `cc-test.mjs`. Anything waiting on the name of the QUESTION waits forever.

- ✅ **PAPPUS IS OUT AND THE PAGE IS RETIRED, SO THIS IS CLOSED TWICE OVER.**
  Three of the four asks landed before `/keys/` was archived: Pappus out of the
  path (zero matches in the archived page, code at `archive/box-pappus/`), the
  diagram redrawn, and the capture box named in real technology (`JACK`,
  `ffmpeg`). ⚠️ **THE FOURTH IS IMPOSSIBLE AND IS REFUSED IN WRITING**: three
  instruments side by side cannot be drawn, because FluidSynth and hexter left
  the board on 2026-09-16 and a diagram of what is there has one instrument in
  it.

- **A CONTROLLER PERFORMANCE SYNTH ON THE BOARD, PLANNED FIRST. ASKED
  2026-09-16:** *"do reseach on 'controller perfomance' synth that shows off the
  cc slider controls, keyboard is not that important. can be yoshimi patch or
  smth where controllers play heavy role, moog-y stuff, huge fitler etc. need to
  show how we handle cc in pi. use infra similar to box demo but a separate
  pipeline -- you tell me what is feasible. initially like 2 sliders only (filer
  / resonance?) to show off the pipeline. do plan and report it here in
  detail when ready"*. A PLAN, reported in detail, before any code.
  `plan-controller.md` is that plan and its build order has eight steps.
  **Steps 1, 2 and 3 are built.** Step 1 is the send gate in
  `demo/shell/cc-adapter.mjs` (`makeCcSend`), graded 13/13 by
  `node demo/shell/cc-send-test.mjs`. Step 2 is `ctl.set` and `ctl.meter` in
  `rig/box/box.mjs`. Step 3 is `/knobs/` (the slug is `knobs`, asked for on
  2026-09-16, not the plan's `knob`), 14 asserts, 20/20 through
  `node demo/verify.mjs knobs`.
  ⚠️ **NOT DONE, AND NAMED SO THEY ARE NOT LOST.** Step 0 was SKIPPED: nobody
  has measured whether Yoshimi's CC 74 and 71 actually move a chosen patch on
  this board, which plan-controller §2.4 calls the single load-bearing unknown
  and §7.1 says fails SILENTLY, with every counter on the page reading correct
  while the sound does not change. Step 4 is the diagram. Step 5 is the
  measurements (`lag` by a centroid crossing, the board's own frame stamp read
  for the first time, the cushion priced at 100 ms and at 60). Step 6 is the
  SuperCollider voice, only if step 0 says it is needed. Step 7 is
  `audio.start {onlyIfIdle:true}`.
  🔴 **AND NOTHING HAS EVER BEEN SENT TO THE BOARD FROM ANY OF IT.** A person
  has not said the board is free, so `/knobs/` holds every board action back
  under `?selfcheck=1` and the suite has never started Yoshimi. The first
  person to press Play on a free board is the first time this path makes a
  sound.

- ✅ **THE LOOP STOPPED TALKING, 2026-09-16 (`ca5c225`).** Both sentences are
  off the transport badge and `looper.mjs` makes no `log()` call at all. What
  survives is a `title` on a DISABLED button, which is a tooltip on a control
  rather than a message about state.
  ⚠️ Two pages still log about loops and were deliberately not swept: `/looper/`,
  whose subject IS loops, and `/videoradio/`. Decide those separately or not at
  all.

- ✅ **ONE PRESS IS ENOUGH AND THE END CLOSES THE LOOP, 2026-09-16 (`ca5c225`).**
  Both halves in `transport-bar.mjs`: a press on a stopped deck with no mark
  down plays, a press parked at the end restarts from the top, and
  `closeAtEnd()` is called from the position watcher and from `hitEnd()`.

- ✅ **`/draw/` HAS THE THREE LOOP DIRECTIONS, 2026-09-16 (`7d9a804`).**
  `loopWays: true`, with the comment quoting the ask and naming the `/replay/`
  contrast, which is the page that cannot have them.

- ✅ **THE TIMELINE DRAWS THE LOOP, ALL FOUR REQUIREMENTS, 2026-09-16
  (`7d9a804`).** `timeline/strip.mjs` reads `deck.loopView`, washes the band
  under everything at `globalAlpha = 0.12` (the wave's own alpha for that band,
  not a number chosen here), draws one edge armed and two when on, and nothing
  when off.
  ⚠️ One seam left, and it is small: the loop colour is declared in `strip.mjs`
  rather than imported from the wave, so the two pictures match BY VALUE rather
  than from one place. That is the shape of drift this project has been bitten
  by before.

- 🔴 **`/draw/` CLAIMS TWO THINGS A REAL HAND REFUTES, AND BOTH ARE STILL
  ASSERTED.** Found 2026-09-16 from a photograph of a visitor's log. `one record
  of a moving point beats two records of a moving number, at every rate this
  page offers` read **0.5x to 0.9x** on a scribble at 100 ms, so two records
  were CLOSER at every rate on the ladder; the suite's smooth synthetic drag
  reads 2.0x to 7.6x the other way. `the playhead puts the hand where the record
  says it was` failed on its third clause, `held > rec * 5`: refusing to
  interpolate cost **3.9x** rather than 5x, because a coarse record leaves
  interpolation less to rescue. Both thresholds are UNCHANGED on purpose, since
  a threshold widened until it goes green cannot be told from a page that works.
  The question for the page is whether the claim is about any gesture or about a
  smooth one, and the honest answer may be to grade it per gesture and say which
  kind of line it was.

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
  🔴 **AND IT WAS REMOVED THE SAME DAY, ON INSTRUCTION:** *"rm 'automate' button
  from radio demo (and functionaitu) and bring in automated sliders we made"*.
  The button, the tour, its check and its three asserts are in
  `archive/radio-automate/`; every slider under the picture now carries the
  kit's own hand button instead. **52/52 green** after.
  ⚠️ **WHAT WENT WITH IT IS NOT A DETAIL AND IS OPEN WORK IF ANYBODY WANTS IT
  BACK.** A hand sweeps ONE lane between its two ends. `/radio/` can no longer
  walk its twelve sounds by itself, move five controls in step, breathe the
  blend against where the sound is (a hand takes the blend to 0 and to 1, which
  the tour deliberately never did), or step what cannot be interpolated. Five
  hands switched on at once are five independent sweeps, not an arrangement.
  `/videoradio/` still does the whole thing unattended and was checked before a
  line was removed: it carries its own inline copy of the tour clock and imports
  nothing that went.

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

- ✅ **`/items/` HAS ITS FIXED HEIGHT AND NO EMPTY MESSAGE, 2026-09-18. IT LOOKED
  DONE FOR FOUR DAYS AND STYLED NOTHING.** MEASURED: the list box is **192 px**,
  exactly eight rows, with or without anything in it, and no empty element is
  rendered.
  🔴 **THE RULE NAMED A CLASS THE PAGE HAD STOPPED PRODUCING.** It styled
  `.logbox .pos-msgs`, written 2026-09-14, TWO DAYS BEFORE the ask it appears to
  answer; in between the page moved to `createTable`, whose body is
  `.pos-tbl-body`. A selector matching nothing is silent, so the code read as
  done and the entry read as open and both were right. That is CLAUDE.md's
  component-swap rule firing for the third recorded time.
  ⚠️ **`height`, NOT `max-height`.** The component's own default is
  `max-height: var(--tbl-h, 420px)`, which still grows from nothing to full and
  moves everything under it, which is the entire thing the ask was about.

- ✅ **THE FORTY PAGES ARE SWEPT, 2026-09-18.** (`seek` was in the list of 41
  and is retired, so forty.) The gate is a kit module now, `demo/shell/selfcheck.mjs`:
  it was one line copied into four pages and the other forty-one never grew it,
  and one import is greppable, which is the half that makes a sweep finishable.
  **Thirteen pages needed no change at all** and were left exactly alone, because
  everything costly in them already sat behind the press a visitor makes:
  click, cues, flipper, items, lanes, looper, loops, score, transport, moq, room,
  webrtc, patch, wire, jam, record.
  **The worst of what a visitor was paying for**, all of it now gated:
  - `floor` fetched `arhiiv.err.ee` and played an HLS film for up to six seconds
    ON EVERY VISIT, plus a grey upload over layer 0 of the live tile texture and
    100 frame-loop steps.
  - `now` fired up to 30 range GETs at ERR segments nobody was going to watch,
    then a ten minute back-seek pulling a different stretch of the DVR.
  - `blocks` rolled three rooms past the reader at load, then a fourth to undo it.
  - `held` ran about twenty off-screen renders with `readPixels` and typed words
    over the wall and back.
  - `grains` dropped a SHARED Raspberry Pi's material to -60 dB and emptied its
    ring, heard by whoever had `/knobs/` open in another building.
  - `feedback` woke the recorder, opened a socket and WROTE A NOTE into the room.
  - `mirror` laid out five figures every frame, lowering the frames per second
    the page exists to report while somebody reads it.
  🔴 **AND THE LOAD-BEARING FIX WAS IN THE HARNESS, NOT IN A PAGE.**
  `verify-gl.mjs` and `verify-quest.mjs` NEVER APPENDED `selfcheck=1`; only
  `verify.mjs` did. So gating any `gl: true` page would have switched its checks
  off everywhere at once, silently. `/videoradio/` already carried its own gate
  and its comment named this exact file as *"a harness to fix rather than a
  reason to work a visitor's controls"*, which means its checks have been
  running NOWHERE.
  ⚠️ **PROVED, NOT CLAIMED.** `DEMO_QUERY=selfcheck=0` lands ahead of the
  harness's own flag, so the page is a visitor's while the harness still presses
  every control: blocks 47 to 8, held 33 to 15, draw 15 to 2, kit 38 to 30,
  memento 14 to 10, capture 8 to 7, replay 10 to 8. Under `selfcheck=1` every
  count is identical to baseline, which is the property that says the harness
  lost nothing.
  ⚠️ **WHAT IS LEFT, CORRECTED BY AUDIT 2026-09-18.** This said "thirteen" and
  then listed sixteen; sixteen is right. Those pages carry no `selfcheck` string,
  so `grep -L selfcheck demo/*/index.html` lists them and reads as a ledger of
  unswept pages when it is not.
  🔴 **AND THAT GREP RETURNS EIGHTEEN, NOT SIXTEEN. ONE OF THE TWO EXTRAS
  MATTERS.** `demo/notes/index.html` is harmless (it fetches a local file).
  **`demo/reel/index.html` is not**: it carries no gate at all and opens TWO
  connections to `arhiiv.err.ee` at load, then attaches hls.js to both. That is
  not a self-check, which is why the sweep correctly left it alone, and it is
  the same cost wearing a different hat. It has its own entry above. What this
  line is for is the honesty of the claim: forty pages were swept for
  SELF-CHECKS, and that is not the same statement as "no page reaches ERR
  unasked".

- 🔴 **`node demo/verify-gl.mjs videoradio` NOW COSTS ERR, AND IT DID NOT
  BEFORE.** Consequence of the harness fix above, written down because it is
  exactly the kind of change that surprises somebody later. That page rotates
  four ERR mounts and its checks had been running nowhere at all; they run now.
  Every connection to an ERR mount appears in a public broadcaster's audience
  measurement, so that command is not a development-loop command.

- ⚠️ **A PRE-EXISTING FLAKE IN `/floor/`, IN A BLOCK NOBODY TOUCHED.** *"and
  every one of them runs at the film's frame rate"* failed twice (`worst of 8 is
  38.3 ms from 41.7`, the autocorrelation saturating at the top of its 20 to
  80 ms lag range) then passed three times (`1.7 ms`). `createProjector` draws
  `Math.random()` for its jitter and only about five clatters fit the 0.24 s
  offline render, so the statistic is marginal by construction rather than
  wrong. Found during the sweep.

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
  ⚠️ **THAT PARAGRAPH IS STALE AND WOULD SEND THE NEXT READER LOOKING FOR A
  BUTTON THAT IS NOT THERE. CORRECTED 2026-09-18.** The disabled button was
  REMOVED entirely on 2026-09-16, on the instruction *"when page does no support
  looper modes (relay) rm the loop mode button"*, with the reasoning that a
  permanently impossible control is furniture rather than a disabled control.
  The REFUSAL above still stands unchanged; only the description of what
  `/replay/` shows was wrong.
  What would remove this line is a second mechanism inside `looper.mjs` for a
  loop whose material is frames rather than samples. It can honestly offer
  `round` and `half` (`video.playbackRate`), and it can never offer `back` or
  `pingpong` without decoding the whole lap into memory, which for 190 s of
  video is not a thing to do on a phone.

- ✅ **`/tapes/` AND `/radio/` DRAW THE LOOP THE SAME WAY, AND RADIO IS THE ONE
  THAT SURVIVED.** The divergence was real: session 28 shipped
  `freezeOnLoop: false` on `/tapes/` plus both loop calls on one line. It was
  undone in `415f3a6`. The three calls are now in the same places in the same
  order on both pages, and both share the same `onLoopPos`.
  ⚠️ The entry warned that `HANDOFF.md` and another line in this file
  CONTRADICTED each other on the point, so neither was evidence. The code was,
  and it was read rather than argued about.

- ✅ **THE 3-D SCENE IS OFF THE DESKTOP `/videoradio/`, 2026-09-16 (`31f1744`).**
  The sea that stood under the screen and the headset half are both at
  `archive/videoradio-xr/`.

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

- ✅ **THE DIAGRAM SWEEP IS DONE, 2026-09-18, AND IT WAS ALMOST EMPTY.** All
  eight pages carrying a `createDiagram` were dumped, every `sub` and `label`.
  The only real hit was `/grains/`, twice: `four settings` is now `4 settings`.
  `/station/`, which is what prompted the rule, was already short-form.
  ⚠️ **A COUNT IS NOT A MEASUREMENT AND WAS LEFT ALONE**: `one worker, one
  bucket`, `one element`, `one value per 20ms` all read as prose about how many
  things there are rather than as a figure to be read at a glance, which is what
  the rule is about.

- ✅ **MOOT: `/earshot/` IS ARCHIVED.** It was a demo for one evening and is at
  `archive/demos/earshot-index.html`. The offending line survives only there,
  and the pattern does NOT exist in the shared XR modules: `xr-panel.mjs` sets
  the view count inside the frame and reports it on the same line.

- 🔴 **A CHECK CALLS `FAIL` ON SOMETHING NOBODY IS OBLIGED TO DO, AND IT IS NOT
  ON THE ARCHIVED PAGE. RE-AIMED 2026-09-18.** This was filed against
  `/earshot/`, which has since been archived, and closing it on that basis would
  have been wrong: the check lives in the KIT, at `demo/shell/xr-hands.mjs`,
  which is imported by `blocks`, `xr-room`, `xr-tablet`, `xr-panel`, `xr-pick`
  and `hand.mjs`. It still emits `FAIL hands ... has not happened` with a `bad`
  log line, off a table of things a wearer is under no obligation to do (one row
  is `the ray on the tablet` after 25 s).
  ⚠️ The message was SOFTENED since the report, so it now names both readings
  instead of diagnosing. That is not the fix. The word `FAIL` about an
  unperformed optional gesture is the thing, and a page that says FAIL at a
  person who has done nothing wrong is teaching them to ignore it.

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
  🔴 **AND THE SWEEP'S OWN INSTRUMENT COULD NOT SEE NINE OF THEM. FOUND
  2026-09-18.** Seven prose em dashes were written `\u2014` in string literals,
  so every grep for the character answered clean about files that had them. That
  is `timeline/transport.mjs`'s NUL lesson in a new costume: **a search that
  comes back empty is evidence about the search first.** All seven are fixed
  (`keep` x4, `instrument`, `click`, `jam`); the two remaining escapes in `keep`
  are no-value marks and are meant to stay.
  🔴 **`corpus.json` CARRIES 58 EM DASHES IN FIELDS TWO PAGES RENDER, AND THAT
  IS THE BIG ONE.** `title` 39, `note` 17, `licence` 2, across **152 of 334
  rows**. `/resources/` puts `title`, the licence and the note straight into its
  table; `/tapes/` prints `it.title` into its log and onto its marks. They are
  GENERATED, by 84 string literals in `demo/resources/build-corpus.mjs`, so the
  fix is there and not in the JSON, and `--offline` rebuilds without asking
  anybody's server. ⚠️ A further 110 sit in `holder`, which nothing displays;
  leave them.
  ⚠️ **AND A PATTERN WORTH COPYING RATHER THAN A DEFECT:**
  `demo/shell/presence.mjs` THROWS when an em dash would reach a visitor. That
  guard is what the rest of this sweep has been doing by hand.

## Done, with what it was measured at

- ✅ **DONE. `/tapes/` HAS A STAND-IN, AND `node demo/verify.mjs tapes` COSTS
  archive.org NOTHING.** Asked because that harness pulled twenty-four real
  recordings on every run, including the runs where somebody typed no arguments
  at all, against the 2026-09-16 instruction *"stil: super careful with external
  sources, better avoid"*. `demo/fake-tapes.mjs` is the same answer
  `fake-station.mjs` gave `/radio/`: real MP3 frames, real `content-length`,
  `accept-ranges: bytes`, working Range replies and archive.org's CORS headers,
  at the exact lengths `corpus.json` measured. `/tapes/` takes a `?base=` the way
  `/radio/` does and `verify.mjs` starts the server and points the page at it.
  **MEASURED: 38/38 green, 26 page asserts, and the only hosts the run touched
  were the dev server and the stand-in.** The instrument is new too:
  `DEMO_HOSTS=1 node demo/verify.mjs <slug>` prints the hosts each demo
  contacted, off `Network.requestWillBeSent`, so "no bytes left this machine" is
  checkable rather than claimed.
  ⚠️ **AND IT EXPOSED TWO VACUOUS PASSES IN THE PAGE'S OWN CHECKS, WHICH ARE NOT
  FIXED.** A stand-in serving every recording at HALF its corpus length reads
  38/38, because every geometry assert takes its lengths from the corpus and
  none of them ever compares that against the file the element loaded. And a
  stand-in serving SILENCE also reads 38/38: `the page makes no sound until
  somebody presses play` printed `ran 265 ms of tape at 0.000 and the speakers
  got 0.0000`, which cannot tell a shut gate from nothing to gate, and
  `backwards is the same samples mirrored` reported `4 of 4` zeros matching
  zeros. Both need a real measurement to sit behind, and the tolerance for the
  first one cannot be chosen here: the corpus durations came from ffprobe on a
  header, so what a browser reports for the same file is unmeasured and may not
  be measured without asking archive.org for the files.

- ✅ **THE PAGE IS A STACK OF BLOCKS AND THE STACK OWNS THE AIR BETWEEN THEM.**
  Asked twice on 2026-09-16, the second time as a diagnosis rather than a
  request: *"same vert space beween as we establised in knob (make a rule and
  uptada others in bg: make it easy to change later)"*, then *"you can not
  follow spacing tule. make reusable layout component?"*. `demo/shell/stack.mjs`
  plus `.pos-stack` in `shell.css`; the number is `--pos-gap` on `:root` and
  nothing else states it. MEASURED on 38 pages before and after: every gap
  between two blocks is now exactly 40 px, where before there were 0, 10, 12,
  14, 16, 18, 40 and 53.5. `/keys/` was the photograph (0.0 px between the
  transport bar and the keyboard) and `/knobs/` was the reference and did not
  move, gap for gap.

- ✅ **AN IDLE LOOP PAIR WEARS THE SAME EDGE AS THE BUTTONS BESIDE IT.** Asked
  2026-09-16 with a photograph: *"global: loop buton borders as rest of
  button"*, the fourth report about this pair. MEASURED on `/draw/` before the
  repair: the pair read `rgb(106, 114, 128)` (`--dim2`, text grey) while every
  rate button and every ordinary button read `rgb(43, 53, 70)` (`--line2`). The
  repair was to DELETE the declaration rather than restate a colour: both halves
  are `<button>` and the base rule already gives them the edge. `/draw/` now
  asserts it, and the assert goes red when the old declaration is put back.

- ✅ **`/keys/` OPENS ON `AddSynth Morph`.** Asked as *"addsynth morph as default
  patch"*. Bank 115, program 32, addressed by bank and program rather than by a
  position in a flattened list of 911. It is SENT as well as pointed at, and the
  page says in its log which patch it opened on, or says so when that bank and
  program are not in the board's library.

- ✅ **FLUIDSYNTH AND HEXTER ARE OFF THE BOARD AND OUT OF THE PAGE**, to
  `archive/box-fluidsynth-hexter/`. Asked as *"lets remove fluidynth and hexter
  code and move to arvhice (in browser and in board). update board."* There is
  ONE jackd, ONE capture and ONE room on that board, so an instrument picker was
  a control that took the sound away from somebody in another building: `/knobs/`
  was found refusing to start because somebody had pressed `sampled`. Board
  restarted 22:44:41 and yoshimi confirmed up, `jack: true`, `yoshimi:left`,
  50 frames/s. MEASURED that the deploy landed: `md5` of `box.mjs` and
  `jacksynth.mjs` identical board against local, and the board's own copy of
  that file answers `JACK_SYNTHS: yoshimi`.
  ⚠️ It found a real defect on the way past: `/grains/` asked the board for
  `fluidsynth` while waiting for a reply naming `yoshimi`, so `wantSource` was
  never cleared and the mark it gates stayed armed for a whole visit.

- ✅ **THE `box` DEMO IS `keys`.** Asked as *"rename box demo to keys"*. 119
  references in 30 files, swept on the URL form rather than the word, so
  `rig/box/` is untouched: the BOARD is still the box. The source file did not
  move and `LAYOUT.md` rule 2 is why. The deployed `/box/` is gone and no
  redirect was written, same as `radio1965`.

- ✅ **`demo/shell/board.mjs`: ONE MODULE FOR THE RASPBERRY PI.** Asked as
  *"share code with knobs"*. `/keys/` stopped hand-rolling its WebSocket, its
  12-byte frame header, its int16 conversion, its `pcm-playout` worklet, its
  cushion and its counters; it GAINED three things it never had, because the
  module is the better of the two halves rather than the average — a full room
  told apart from a dead relay, a frame checked against the shape the board
  publishes, and the board identified by the messages only it sends.

- ✅ **ONE DIAGRAM, TWO VARIATIONS.** Asked as *"current box diagram is so much
  nicer. unify the diagrams to look best and have knobs and keys variations of
  this"*. Both draw the same ring now: out along the top, down the board, back
  along the bottom. `/knobs/` gained the split relay that makes it read one way
  round, `/keys/` gained the JACK and ffmpeg split. Both report `cuts: 0`.

- ✅ **`/keys/` HAS A TRANSPORT BAR WITH NO PLAY BUTTON.** Asked as *"bring
  transport bar to keys but no play button, just online badge. plush
  readout+logs"*. `transport-bar.mjs` takes `toggle: false`, in the same family
  as `scrub: false` and `loop: false`, and `demo/verify.mjs` reads
  `api.toggles` before pressing a button that may not be there.

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

- ✅ **`/keys/`: A DIAGRAM, A LAG READOUT, AND DROP THE COLLECTION LINE. ASKED
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



## Moved out of Open by the audit of 2026-09-18

Struck because the work exists, with the evidence that showed it.

- ✅ **THE LIVE BADGE IS OFF THE ARCHIVE PANEL, 2026-09-18.** MEASURED across
  the three panels: audience `live`, control room `live`, archive empty.
  ⚠️ **NOT RE-WORDED TO `archive`, WHICH WAS THE TEMPTING FIX.** A presence
  badge answers whether the thing feeding the picture is ANSWERING. Nothing
  feeds this one: it is a recording of a show that finished, so there is no
  liveness to report and a re-worded badge would be the same lie in a better
  costume. `left: false` is the panel's own way of saying a slot has nothing to
  put in it, and the footer keeps its other two.

- ✅ **STAGE AND THEATRE OUT OF THE ERR ARCHIVES, 2026-09-18.**
  `research/err-stage-theatre-2026-09-18.md`, 498 lines. **161 requests, all to
  the catalogue, NO MEDIA OF ANY KIND**: no manifest, segment, mp3, mp4 or
  thumbnail, and `vod.err.ee` / `heli.err.ee` / `arhiiv-images.err.ee` were never
  contacted. Spaced 1.8 s, every response cached, and the API refused nothing.
  **10,185 rows harvested complete** in the archive's own `Lavastuslik`
  category (5,609 video, 4,576 audio), dated **1928-07-15 to 2026-09-14** over
  84 distinct years, plus 30,243 or more photos, which is a floor because the
  count saturates.
  ⚠️ **IT IS A DOCUMENT AND NOT A `stage.json`, AND THE REASON IS THE FINDING.**
  The rows were harvested and then measured: only **15.7%** say anything about a
  stage, and `content=etendus` finds MORE theatre in `Kultuur` (2,377) than in
  `Lavastuslik` (1,079), because one holds the productions and the other holds
  the writing about them. There is no honest membership rule, so a corpus file
  would have shipped a set already proved wrong. The recipe that regenerates the
  rows in 22 requests is in the document.
  🔴 **AND THE `keywords` PARAMETER IS INERT, WHICH IS A BROKEN COLLECTOR
  CAUGHT BY ITS OWN TIDINESS.** Ten different theatre terms returned exactly
  30,000 / 10,000 / 10,000 / 10,000. Identical numbers from ten different words
  is not a finding, and a year-bounded control proved it. `category` and
  `content` do work.
  ⚠️ **THE METADATA SHAPE HAS MOVED** since `research/err-archives-2026-08.md`:
  `metadata.technical[]` is now `metadata.data[]` with three groups, and
  `makers` is empty on every audio item.

- ✅ **THE ARCHIVE TIMELINE IS THREE TIMES HIGHER, AND IT IS NOT A RULE,
  2026-09-18.** Four messages settled it: *"Make archive timeline 3x higher"*,
  *"Make it a rule"*, *"Ita ok to have empty space in timelime, def min
  height"*, then *"No rule just min height"*. MEASURED at **50 px** before and
  **150 px** after, which is 3x to the pixel, and the floor is `STRIP_MIN_H` in
  `demo/shell/strip.mjs` rather than a number typed on a page.
  ⚠️ **A FLOOR, NEVER A HEIGHT.** Lanes needing more than 150 still get more, so
  a page cannot clip its own content by asking for it, and the empty space under
  the last lane was explicitly accepted rather than packed out.
  ⚠️ **AND IT IS OPT-IN, WHICH THE MEASUREMENT DECIDED BEFORE THE RETRACTION
  DID.** Every `auto` strip in the project was measured first: kit 44, stage 50,
  draw 68, lanes 72, instrument 100, click 104, loops 116. A blanket floor would
  have reshaped all seven, and `/kit/`'s 44 px specimen is 44 px on purpose.
  🔴 **IT ALSO BROKE A CHECK, AND THE CHECK WAS RIGHT TO COMPLAIN.** `/stage/`'s
  "no black rule between the lanes" assert sampled to the bottom of the canvas,
  found the new empty ground under the last lane and reported a drop of 21.
  `timeline/strip.mjs` now keeps `lanesH` (how far down anything was drawn)
  apart from `contentH` (how tall the canvas is); they were one number until a
  floor existed. The check bounds itself to `lanesH` and reads a drop of 0 over
  63 rows, with its three lanes still present so the subject has not gone
  missing.

- ✅ **LOOP AND RATE ARE OFF THE ARCHIVE TRANSPORT, 2026-09-18.** MEASURED: no
  loop button in the bar, 0 rate buttons. It is play and nothing else.
  ⚠️ **THE TWO CAME OFF IN DIFFERENT PLACES AND THAT IS NOT AN INCONSISTENCY.**
  `loop: false` is the bar's own option, beside `scrub: false` and `time:
  false`. The RATES are not the bar's to refuse: they are the intersection of
  every `caps.rates` its deck's kinds declare, and the bar already draws them
  only when that intersection holds more than one value. So the honest way to
  have none is for the DECK to stop claiming four, which is what its adapter now
  says. A `rates: false` option would have put one fact in two places and let
  them disagree.

- ✅ **THE LOG IS OFF `/stage/`'S AUDIENCE TAB, 2026-09-18.** MEASURED: on the
  audience tab the log reads `hidden: true, display: none`; on the archive tab
  it reads `display: grid`. The other two tabs keep it, because they are worked
  by the person running the show, who is who a log is for.
  🔴 **AND `hidden` ALONE DID NOTHING, WHICH IS THE PART WORTH KEEPING.**
  `.pos-log` sets `display: grid`, and ANY author rule beats the browser's own
  `[hidden]`, so setting the property would have left a log on screen and a flag
  that reads as set. `.pos-glue[hidden]` already existed three hundred lines up
  in the same stylesheet for exactly this reason. `.pos-log[hidden]` now does
  too, at (0,2,0) so it cannot lose to `.pos-log`.
  ⚠️ **THE FIRST `go()` IS QUIET, SO `onPick` DOES NOT FIRE ON LOAD.** The page
  opens on the audience tab, so leaving the initial state to the callback would
  have shown the log to exactly the reader it is being taken from until they
  touched a tab. It is applied once by hand.

- ✅ **GLUE IS OUT OF THE DOCS AND THE FOUR REAL ONES ARE GLUED, 2026-09-18.**
  Asked as *"i see no poiint in glue, it looks off and pointless in docs. just
  glue the 4 we have properly"*, and the four were CONFIRMED rather than guessed
  before any of it was written.
  The `/kit/` section is gone, along with its two grey specimen boxes reading
  `a block` and `and another` and the `.kit-glue-demo` rule that styled them. It
  demonstrated the mechanism and none of the reason for it, which is what made
  it read as furniture. `node demo/verify.mjs kit` is **45/45 before and after**,
  so removing it moved no button the harness presses by position.
  The four, each LOOKED AT rather than assumed, because the complaint was
  visual: `/stage/` archive (bar + strip, already done), `/radio/` (bar + scope),
  `/replay/` (bar + strip), `/tapes/` (scope + bar). 52/52, 60/60 and 45/45
  green across them.
  ⚠️ **`/tapes/` IS THE SCOPE AND THE BAR, NOT THE STRIP AND THE BAR.** Its
  strip runs edge to edge past the page margins while the scope and bar are
  inset, so a box round the strip and the bar would have to reconcile two widths
  and put its seam across a block the tape's own picture already crosses.
  ⚠️ **AND `createGlue` PUTS NOTHING ANYWHERE.** It re-parents its blocks into a
  box and hands the box back, so a page that only calls it loses both blocks off
  the page. Every one of these captures its anchor BEFORE the call, because a
  node read after it can already be detached and `insertBefore` throws on that.

- ✅ **THE FIVE BLACK KEYS ARE WHERE A PIANO PUTS THEM, AND THIS LINE OUTLIVED
  THE WORK BY A DAY.** The move landed in `8bdd489` on 2026-09-17 and was never
  struck off. VERIFIED BY MEASUREMENT 2026-09-18 rather than by reading the
  diff: `SHARP_OFF` keys off the PITCH CLASS as §4.1 asked, `--k-off` is
  consumed by `shell.css`, and `/kit/` reports the narrowest white strip at
  **27.0 px, 0.551 of a white key**, against 0.401 when the keys were centred
  and 0.439 in GarageBand. That is the predicted 27.00 to the digit.
  ⚠️ **THE STACKING ASSERT WAS RE-DERIVED TOO, AND BETTER THAN ASKED.** The
  worry was that it sampled symmetrically about the join and so could not see
  the change. What shipped does not measure a centre at all: it measures the
  STRIP a finger lands on between two black keys, which is the quantity the
  offsets exist to change. Its own comment records the old centred-on-join
  assert going red at 7.33 px, so it is a check proved against both states
  rather than against one.

- ✅ **`/stage/` IS BUILT AND THIS LINE OUTLIVED IT BY A DAY.** Every clause of
  the dictated spec is met and MEASURED: three tabs, three panels each showing
  the same generated test picture, `node demo/verify.mjs stage` at **21/21**
  including `three panels, one for each tab` and `the fullscreen button is
  square, 34.0 by 34.0 px`. The sentence that ENDED MID-WAY, *"Make a generic
  component with"*, was answered without being guessed at: it is
  `demo/shell/video-panel.mjs`, with l/c/r slots, `left` defaulting to presence,
  `right` to a square fullscreen button, an empty centre, and `FULL_MODES =
  ['hover', 'footer', 'bare']` covering the two modes the message did describe.
  ⚠️ And `tabs.mjs` finally has its first real use, which the entry correctly
  predicted was the test that component had never had.

- ✅ **THE GMAIL HTML HALF WAS ALREADY FIXED, AND THE REAL FINDING IS THAT
  NOTHING GRADED IT. SETTLED 2026-09-18 BY CAPTURING THE MESSAGE.** The raw of
  both real messages was pulled from the sender's own mailbox and they are now
  fixtures, byte for byte, at 542 and 539 bytes (Gmail's own size estimate for
  each). Run against the SHIPPED `firstText`, the 19:54:32 message returns
  exactly `hello!`. So the room entry was written by the build BEFORE the repair:
  the two messages are two minutes apart, the deploy went out between them, and
  the 19:56 message came out clean and labelled while the 19:54 one did not.
  ✅ **AND THAT IS NO LONGER AN INFERENCE.** `wrangler deployments list` on
  2026-09-18 reports the previous deployment created at **19:55:59.807Z**, which
  falls between the two messages (19:54:32 and 19:56:17). The reasoning from the
  fixtures and the deploy record agree, and they were arrived at independently.
  ⚠️ **THE LESSON WAS THE ONE THE ENTRY PREDICTED, IN A PLACE NOBODY LOOKED.**
  `firstText` lived inside `index.js` beside a `fetch` and a WebSocket, so
  nothing could import it and it had ZERO asserts, while `spam.mjs` next door had
  51. It is `workers/mail/src/body.mjs` now, graded by 8 body fixtures and a
  sweep asserting that no message hands back any part of its own envelope. The
  suite is **75/75**, up from 51.
  ⚠️ AND THREE REAL DEFECTS CAME OUT OF WRITING THE FIXTURES, none of which the
  room had shown: a nested `multipart/mixed` (an attachment) handed the whole
  inner structure back as the person's words, a message with no closing
  delimiter lost its only part to `slice(1, -1)`, and a message whose line
  endings had been normalised to LF matched no `\r\n\r\n` and returned its own
  headers as the body.

- ✅ **A SUBJECT FROM OUTSIDE ENGLISH IS DECODED AND DEPLOYED, 2026-09-18.**
  RFC 2047 in `workers/mail/src/body.mjs`: both encodings, adjacent words joined
  with no space added between them, and charsets that are not UTF-8. Graded on
  the exact string from the entry above this one, `=?utf-8?B?a8O1aWdlIGjDpHN0aQ==?=`,
  which now reads `kõige hästi`.
  ⚠️ **THE BODY WAS BROKEN THE SAME WAY AND THE ENTRY DID NOT SAY SO.** A subject
  is MIME-encoded because the alphabet forced it, and the same message's BODY
  arrives `quoted-printable` or `base64` for the same reason, so decoding only
  the subject would have left `K=C3=B5ige h=C3=A4sti` under a heading that now
  reads correctly. Both halves are decoded and both are fixtures.
  ⚠️ **AND A DECODED HEADER IS FLATTENED TO ONE LINE.** A subject is the first
  line of a note whose other lines are the body, so an encoded word carrying a
  newline could forge a line of our own output. That is the only place in this
  worker where a stranger's text reaches a structured format, and there is an
  assert that plants exactly that and requires it not to work.
  ✅ **DEPLOYED 2026-09-18** as version `50a78731` at 100%. This entry carried a
  red line saying it was in the repo and not on the edge, which was true for
  about an hour and then was not.

- ✅ **THE VERDICT SAYS WHICH SIGNAL DECIDED IT, DEPLOYED 2026-09-18.**
  `auth.via` already held the answer and went only to `console.log`, where nobody
  was looking. It is a chip now: `[ok · via Authentication-Results]` against
  `[ok · via ARC]`, so the four characters that could not tell the two apart have
  become a label that says which. Graded with the negative control that gives it
  meaning: a fixture with a real stamp and one with only a forwarded ARC set must
  come out DIFFERENT, and a message with no stamp at all must name no source
  rather than invent one.
  ⚠️ **IT IS EMITTED ON THE ORDINARY CASE TOO, BREAKING THIS FILE'S OWN RULE
  ABOUT CHIPS ONLY WHERE THEY BEAR ON THE VERDICT, AND THAT IS DELIBERATE.** A
  chip that appears only in the interesting case cannot be told apart from a
  build that does not have the chip yet, which is the identical argument that put
  `[ok]` on ordinary mail to begin with.
  ⚠️ **WHAT IS STILL NOT KNOWN IS WHAT DECIDED THE 19:56 MESSAGE.** That cannot
  be recovered from here: the room holds only the label, and the sender's copy
  carries no `Authentication-Results` because the receiving side adds it. The
  worker's own log for that delivery would answer it and observability is on.
  The next message answers it by itself.

- ✅ **INCOMING EMAIL AT `positron@positron.studio` IS BUILT, DEPLOYED AND
  RECEIVING. THE MOST STALE LINE IN THE FILE.** It said *"nothing is built and
  no DNS or zone setting has been touched"*. `workers/mail/` is a complete Email
  Worker routing mail into the feedback room over the relay, graded **75/75** on
  20 spam fixtures and 8 body fixtures, live as version `50a78731`. The proof it
  receives is elsewhere in this same file: the two real messages that arrived at
  19:54:32 and 19:56:17 on 2026-09-17, which three other entries reason about.
  ⚠️ **AND THE QUESTION THE ENTRY CALLED LOAD-BEARING WAS ANSWERED**, in
  `wrangler.jsonc`'s own header, quoting the ask: *"I just need an email address
  people can contact. That's it. And uh, the agent should be reading it"*. What
  it is for is the feedback room, and that is why there is no second store.

- ✅ **THE TWO VERBS ARE WRITTEN AND NEITHER HAS MET A JACK SERVER
  (2026-09-18).** `jack.graph` reports `jack_lsp -c` as structure, a `pgrep -cx`
  count of the five processes that make the sound, jackd's own command line,
  what the box BELIEVES is running, and the chain it should have against the one
  it has (`want`, `missing`, `extra`, `intact`). `jack.rebuild` patches the
  DIFFERENCE and nothing else. Both answer in their own names, because
  `audio.status` answering `audio.started` cost nine seconds and a false
  conclusion that no board was in the room.
  ⚠️ **THE SHARING DECISION, WRITTEN DOWN IN `rig/box/README.md`:** the board
  cannot see a listener (the relay forwards verbatim, `webSocketClose()` is
  empty, a page holding PCM says nothing), so the rebuild is a diff that runs
  zero commands on a healthy graph, kills no process, says out loud who else is
  in the room when it does cut a link, and refuses on `onlyIfIdle: true`. A
  SERVICE restart is deliberately still not a verb: `audio.stop` then
  `audio.start` already does that, at about thirteen seconds of silence for
  everybody.
  ⚠️ **UNVERIFIED.** No ssh from here, so nothing has been run against real
  `jack_lsp` output. `node rig/box/test.mjs` is 92/92 with 25 new checks on the
  parse and the chain against `fixtures/jack-lsp-c.txt`, and two deliberate
  sabotages take it to 88/92 and 90/92. What is still open: that this board's
  real `jack_lsp -c` parses as the fixture does, and that a real `jack_connect`
  repairs a real drift. Deploy with `rig/box/push.sh` and confirm with the md5s
  it prints, which now cover `jacksynth.mjs` as well as `box.mjs`.
