---
name: positron-verify
description: Harnesses, asserts, self-checks, stand-ins and the traps that make a working page read as broken. Load before running or changing any verify harness, before adding or removing a control, before believing a red run, and before reporting a measurement or an absence.
---

# Grading this project, and the instruments that lie

The rule under most of this section is that a green suite can mean zero
coverage, and that the only thing separating a check from a decoration is
having broken it on purpose once.

## External sources, and the stand-ins that replace them

🔴 **DO NOT RE-VERIFY `/radio/` OR PROBE STATION HEALTH. ASKED TWICE.**
*"stop messing around with live stream assertions, you're wasting everybody's
time"*, then *"can we please stop assessing the radio, its killing me and my
budget"*. A run of that page costs minutes and a lot of tokens, it needs a
relay and eight mounts nobody here controls, and what it returns is a fact
about somebody else's server rather than about our code. Four of eight were
down the last time it was run, which is the normal state of it.
**Change the page, syntax-check it, ship it** (`node demo/check-html.mjs
demo/<slug>/index.html` parses every module block without opening a browser).
A red run on that page is not information until somebody asks for it.

✅ **AND SINCE 2026-09-16 IT CAN BE GRADED WITHOUT COSTING ANYBODY ANYTHING.**
`node demo/verify.mjs radio` starts `demo/fake-station.mjs` itself and points
the page at it with its own `?base=`: real MP3 frames, real ICY headers, a real
`icy-metaint` text channel and a `/health` route in the relay's shape, paced at
128 kbit/s. **MEASURED: 48/48 green with zero bytes from anybody's radio.** So
the rule above is now about the RELAY and the mounts, not about the page: run
the page freely, and never `curl` a mount, a health route or a live segment to
find out whether somebody else's server is up.
⚠️ It grades OUR code. A stand-in cannot tell you a mount is 403ing, and a page
green here can still meet one out there.
⚠️ `DEMO_QUERY=base=…` overrides it, which is the escape hatch for somebody who
has been ASKED to check the real relay.
🔴 **AND A STAND-IN CANNOT BE USED AGAINST THE DEPLOY. MEASURED 2026-09-20.**
`DEMO_BASE=https://positron.studio node demo/verify.mjs radio` starts
`fake-station.mjs` on `127.0.0.1` and points the page at it, and Chrome refuses:
*"Permission was denied for this request to access the `loopback` address
space"*. A secure public origin may not fetch a loopback address. It reads as
**4 red on a page where nothing is wrong**, two of them `no console errors` and
`no failed requests`, which is the worst possible face for a harness artifact.
⚠️ So `radio`, `tapes`, `now` and `flipper` are verified LOCALLY, and
`DEMO_BASE` is for pages whose sources are already public. MEASURED both ways:
`DEMO_BASE=… node demo/verify.mjs making items` is **61/61**, the same command
with `radio` appended is **72/76**, and `node demo/verify.mjs radio` on its own
is **14/14**.

🔴 **AND IT IS NOT ONLY ERR. EVERY EXTERNAL SOURCE, 2026-09-16:** *"stil: super
careful with external sources, better avoid"*, said in reply to
*"it uses archive.org, not ERR, so it is safe to run"*. That reasoning was the
mistake: the ERR rule is written about a broadcaster's listener statistics, and
it was read as though the SPECIFIC harm were the whole rule, so a harness that
pulls twenty-four recordings off archive.org on every run was called safe.
**The rule is about whose server it is, not about which harm has been named
yet.**

✅ **AND `/tapes/` HAS ITS STAND-IN SINCE 2026-09-18, SO THIS RULE NO LONGER
COSTS ANYBODY A PAGE.** `demo/fake-tapes.mjs` is an archive that is nobody's
archive: it reads its paths off `corpus.json` rather than a list, so it cannot
drift from the page, and it tiles one 8 s MP3 BY THE BYTE to any length (48 kHz
at 64 kbit/s makes `144*bitrate/rate` whole, 24.000 ms and 192 bytes a frame, so
every wrap lands on a frame boundary and a Range reply needs no frame table).
The 24 rows are 2 h 22 m and 68 MB, never allocated. `node demo/verify.mjs
tapes` starts it and points the page at it with its own `?base=`:
**MEASURED 38/38 with the only hosts contacted being the dev server and the
stand-in.** The instrument is not blind, which is the half that makes the claim
worth anything: pointed at a dead port the same run names that port and takes 5
asserts red.
⚠️ It grades OUR code, exactly as `fake-station.mjs` does. A stand-in cannot
tell you a recording is 403ing out there.
⚠️ **AND TWO HOLES IN `/tapes/`'S OWN CHECKS WERE FOUND BY SABOTAGING IT**: a
stand-in serving every recording at HALF its corpus length still reads 38/38,
and one serving SILENCE reads 38/38 too. Both are in `BACKLOG.md`.

✅ **AND `/now/` AND `/flipper/` HAVE THEIRS SINCE 2026-09-18, WHICH WAS THE
LAST PAIR STILL POINTED AT A BROADCASTER.** `demo/fake-err.mjs` is an HLS live
edge that is nobody's broadcaster: a master, a media playlist sliding with wall
clock at 2 s a segment over a 2 h window, one `PROGRAM-DATE-TIME`, MPEG-TS that
really decodes, Range, `#EXT-X-DISCONTINUITY` at the pool's one seam, the
schedule endpoint and the five radio mounts. `demo/shell/err-live.mjs` gained
`errUrl()` and a `?base=`, and `/flipper/` now imports `CHANNELS` from it rather
than holding a fourth copy. **MEASURED, AND RE-RUN INDEPENDENTLY: `now` and
`flipper` together 52/52 with the only hosts contacted being the dev server and
the stand-in.** Cold build 55.4 s and 105 MB, cached in the system temporary
directory. ⚠️ **IT REPRODUCES THE REFUSALS, NOT JUST THE STREAM**: 403 with no
`access-control-allow-origin`, in the three shapes measured on 2026-09-06,
verified by a 13-point sweep.
🔴 **AND BOTH PAGES ARE BLIND TO THEM.** Switching the refusal off entirely
leaves both fully green and changes only the harness's own summary line, `+33
upstream refusals` becoming `+3`. Corroborated separately: **no assert in either
page names a refusal, a 403 or a served segment.** So the boundary neither page
can work without is graded by nothing, which is the same hole already recorded
twice for `fake-tapes.mjs`. In `BACKLOG.md`.
⚠️ **NO BURNED CLOCK IN THAT PICTURE, AND THE REASON IS ALREADY IN THIS FILE.**
`ffmpegFilters()` needs `drawtext`, which needs libfreetype, and the ffmpeg on
PATH here reports zero `drawtext` filters. `src/publish.sh` pins `ffmpeg@7` for
exactly this and says so in a comment.

🔴 **AND THE COST IS NOT OURS TO PAY. ERR SAID SO, 2026-09-16, RELAYED TO
KRISTJAN:** *"ERRil oli ka probleem, et nende kuulajastatistika läheb sassi"* —
their LISTENER STATISTICS were being corrupted by us. That is a different and
worse kind of damage from load: a broadcaster's audience figures are what it
reports to its board and its funders, and a few dozen headless Chromes holding
mounts open for hours are counted as listeners who never leave. It cannot be
undone by stopping, only by not adding to it. So the rule is not *"a red run is
a fact about somebody else's server"* any more, which was an argument about the
VALUE of the check. It is: **every connection this repo opens to an ERR mount
appears in a public broadcaster's audience measurement, so open one only when a
person is going to listen to it.** `/radio/` and `/videoradio/` both rotate
four ERR mounts; that covers every harness run, every `verify-gl.mjs videoradio`,
every reload in a development loop, and every tab left open on a second monitor.
⚠️ Two stations were REMOVED over this and ERR was not: `idaidaida.net` and
`live.uuu.ee` are gone from the code and the relay 404s them. ERR is still in the
rotation, which means the exposure is still live and the only thing holding it
down is nobody running the page.
⚠️ The same goes for `curl .../health`, for re-running a demo to attribute a
flake, and for A/B'ing a failure that the rules already say is external. The
answer to "is it red because of me or because of them" is: SAY BOTH ARE
POSSIBLE AND MOVE ON.

🔴 **AND THE WORST SHAPE IS NOT A HARNESS, IT IS A PAGE THAT OPENS SOMETHING ON
LOAD. FOUND 2026-09-19 ON `/reel/`.** That page called `play(openOn, true)` on
its load path, so **every visit** asked arhiiv.err.ee for a newsreel and that
day's radio and then held a stream, for a first frame nobody had asked to see.
The `armed` flag beside it suppressed `.play()` and never suppressed the FETCH,
which is why it read as harmless. A harness run costs that too, and `/reel/` is
`built: true`, so it was in every full suite.
✅ **REPAIRED BY SPLITTING THE VERB.** `select()` moves the playhead, frames the
view and fills the caption and opens NOTHING; `play()` is the only half that
reaches ERR, and its callers are a press on a mark, a press of play on a day
already picked, and a step or a scrub that lands while something is already
playing. A visit, a step and a scrub across a stopped year are all somebody
reading the line, and none of them is a listener.
⚠️ **THE RULE IS NOT GATED ON THE HARNESS AND MUST NOT BE.** A page that behaves
one way for `?selfcheck=1` and another way for a person is a page nothing
grades. "Stepping while stopped opens nothing" is true for everybody.
⚠️ **AND THE AUDIT IS ONE WRAPPER, NOT A READING.** Every URL that can leave for
ERR goes through one counted function, so "a visit opens nothing" is an ASSERT
over a counter rather than a claim about a file. Six of the nine were media
source assignments rather than `fetch`, which a grep for `fetch` would have
missed entirely.


✅ **AND THE HOLE A STAND-IN LEAVES IS CLOSED BY SABOTAGING IT, NOT BY READING
IT.** 2026-09-18, on `/now/` and `/flipper/`: both were FULLY GREEN against
`demo/fake-err.mjs` with its `serves()` forced to `return true`, because no
assert in either page named a refusal, a 403 or a served segment. `/flipper/`
had the blocked minutes in a READOUT CELL, and a cell is not an assert. Four
instances of one pattern now, counting the two on `fake-tapes.mjs`: **a stand-in
makes a page runnable without making it graded.** The fix is the same every
time: break the stand-in on purpose, and whatever stays green was never being
measured. Both pages assert it now, and the same sabotage takes 4 red.
⚠️ **AND A NEGATIVE CONTROL IS THE HALF THAT PROVES THE INSTRUMENT.** A page
that reported a boundary whatever it was shown would pass "a boundary was
found". `fake-err.mjs` wears three measured shapes at once, so both pages survey
all three channels and assert BOTH that a walled channel is found AND that a
channel refusing nothing is reported as refusing nothing. The first goes red
under the sabotage; the second stays green, which is correct.
🔴 **A SEGMENT THAT EXPIRED LOOKS LIKE A SEGMENT THAT WAS REFUSED, AND
MEMBERSHIP HAS TO BE CHECKED AT PROBE TIME.** `err-live.mjs` fact 2 says only
ever probe segments from the playlist just read. That is necessary and NOT
sufficient: a thirteen point sweep takes seconds, the window slides while it
runs, and the OLDEST point comes back 403 for the other reason. MEASURED:
`#.......#####`, two boundaries drawn where there is one. Drop points no longer
in the freshest playlist, and say how many were dropped.

🔴 **A COUNTER BEATS A STATE WHEN A CHECK RUNS NEXT TO AN EVENT.** `/flipper/`
read 8/8 against a closed port because `the selected channel is open or loading`
was satisfied by `!!c.hls`, true the instant `new Hls()` returns. The repair is
not a better instant: `readyState` is an instant too, and a WORKING page read
`readyState=1` because the check runs one line after a seek, which empties the
buffer. **`totalVideoFrames` counts what the element has EVER decoded and a seek
does not reset it.** Ask what has happened, not what is happening.

## A self-check never runs for a visitor

🔴 **A SELF-CHECK NEVER RUNS FOR A VISITOR. NOT ONE, NOT EVER, ON ANY PAGE.**
Instructed 2026-09-16: *"rip those selfchecks out of user experience and make
rule about it"*. It is gated on `?selfcheck=1`, which `demo/verify.mjs` appends
to every demo it opens, and the DEFAULT IS OFF. There is no page that is an
exception, and the two arguments that were used to make exceptions are both
answered below.

✅ **THE GATE IS A KIT MODULE SINCE 2026-09-18: `demo/shell/selfcheck.mjs`, AND
ALL FORTY PAGES ARE SWEPT.** Import `SELFCHECK`, or `ifSelfcheck(fn, { log,
say })` where a visitor would otherwise be left with empty cells and no account
of why. It was one line copied per page for four pages and the other forty-one
never grew it; one import is greppable, which is the half that makes a sweep
finishable. ⚠️ Sixteen pages needed NO change, because everything costly in them
already sat behind the press a visitor makes, so they carry no `selfcheck`
string and `grep -L selfcheck demo/*/index.html` still lists them. That grep is
not a ledger of unswept pages.
🔴 **AND `verify-gl.mjs` AND `verify-quest.mjs` DID NOT APPEND THE FLAG UNTIL
THAT SWEEP.** Only `verify.mjs` did, so gating any `gl: true` page switched its
checks off in every harness able to reach it, silently. `/videoradio/` had
carried its own gate for two sessions with its checks running NOWHERE, and its
comment named that file as *"a harness to fix rather than a reason to work a
visitor's controls"*. Both append it now, after `DEMO_QUERY` so an override
still wins. ⚠️ **`node demo/verify-gl.mjs videoradio` THEREFORE COSTS ERR NOW
AND DID NOT BEFORE**: that page rotates four ERR mounts.

⚠️ **"NOBODY IS HOLDING THIS ONE" IS NOT AN EXCEPTION.** `/videoradio/` ran its
checks by default on exactly that reasoning: the page moves its own blend,
changes station and runs a loop unattended, so a check that does those things
was said to be indistinguishable from the page working. Everything in that
sentence is true and the conclusion was still wrong, because the check does
things the PAGE never does. It pressed full screen, which took a visitor out of
their own full screen about twenty seconds after they pressed play. That was
reported twice as a mystery timer (*"drops out of full screen after 22 to 25
seconds"*, then *"chrome drops out of fullscreen when radio source changes"*)
and was open for two sessions, because 22 s is also the tour's dwell and 71 s is
the station clock, so the real cause looked like two innocent ones.

⚠️ **"IT IS CHEAP HERE" IS NOT AN EXCEPTION EITHER.** `/tapes/` loaded a tape,
played it and looped it four ways inside three seconds of every visit, because
its checks were never gated at all. Reported as *"tapes still does some loading
and playback on page load"*, and *"omg you still do not get it"* on the third
report.

⚠️ **AND THE GATE HAS TO COVER THE WHOLE COST, NOT THE AUDIBLE PART.** Both
earlier repairs on `/tapes/` were real and neither was this: one shut the sound
gate, the other stopped the page asking archive.org for durations. A page can be
silent, ask nobody for a duration, and still spend a visitor's bandwidth on a
12 MB recording and run its transport in front of them. **A VISIT ASSERTS A
STRICT SUBSET** and that is the intended shape: everything gradable from data
already in hand still runs, anything that opens a file, makes a sound, presses a
control or moves the picture does not.

⚠️ **A CHECK THAT MUTATES IS THE TEST, NOT A CHECK THAT IS SLOW.** `/tapes/`'s
zoom check called `openFinish()` one frame into the opening animation, so the
self-moving zoom somebody had asked for was being destroyed by the thing
grading it. It waits for the move now. Ask of every check: if a person were
watching this page, would they see it happen?

## Measuring the right quantity

🔴 **A STATISTIC MEASURED OVER A WHOLE ARTEFACT MEASURES ITS PADDING.
2026-09-21, AND IT WAS PUBLISHED BEFORE IT WAS CAUGHT.** A Circuit session file
was written up as *"not seven bit, so it is not SysEx payload"* on the evidence
that **44,071 of its 53,248 bytes are above 0x7F**. The number is correct. The
bytes are **0xFF erasure**: the file's entropy is **0.91 bits a byte**, its real
payload is **9,180 bytes**, and **two** of those are above 0x7F. Counting high
bytes in a file that is four fifths erased flash measures the erasure.
⚠️ **THE TELL WAS AVAILABLE AND FREE**: entropy, a byte histogram and a run
length map all say *this is mostly one value* in one command each. **Ask what
the denominator is before dividing by it.**

🔴 **A JSON SCHEMA CONSTRAINS SHAPE AND CANNOT CONSTRAIN MEANING. MEASURED
2026-09-21 AGAINST WORKERS AI.** Asked for a patch, `llama-3.3-70b` returned
`{"op": "transpose", "to": 1}` on every run. **`transpose` takes `by`.** The
object was valid against the schema it was generated under, because that schema
listed every argument any transform could take and required only `op`, and the
code would have computed `note + undefined`, which is `NaN`: not a throw, not a
drop, a note number that does not exist arriving at an instrument from a link
the page called connected. **Validate the MEANING in ordinary code
(`checkTransforms`), never in the schema.**
⚠️ **AND A TIGHTER SCHEMA WAS MUCH WORSE, WHICH IS THE OPPOSITE OF THE OBVIOUS
FIX.** An `anyOf` with one branch per operation took the same model from
**1.6 s to 10.2 s** and made it repeat one transform until the tokens ran out,
three runs of three. **The loose schema plus an ordinary validator wins.**
✅ What a schema CAN do is identity: the list of real ports as an `enum` meant a
Moog and a Prophet, neither on the desk, came back as **no links at all in
496 ms** rather than as an invention.

🔴 **A MODEL PROPOSES AND A PERSON PRESSES, AND THE REASON IS MEASURED RATHER
THAN CAUTIOUS.** Asked to put the mod wheel on the master filter, and separately
to play the drums from the keyboard, that model produced **well formed patches
aimed at the wrong instrument**. Nothing in a validator can catch that, because
there is nothing invalid about them. A person reading one line can. **Anything
that turns words into actions here shows the action as text first.**

🔴 **`UNSUPPORTED` AND `FORBIDDEN` ARE TWO LISTS AND MERGING THEM BREAKS
EVERYTHING OR PROTECTS NOTHING.** `bay.mjs` had one `accepts` list, so a MIDI
source emitting six classes could never reach a synth that takes three: **every
real link on the desk was refused**. Split: a class a destination does not
handle is **dropped at the boundary and reported**, a class on `never` **refuses
the link outright**. The difference is between *I do not use that* and *that
damages me*, and only the second is worth an error.

## The traps, each one paid for

**Measure the quantity in question, not one adjacent to it.** An A/B where both
arms share the bug returns "identical", which reads as "fine". Before running a
comparison, ask what defect it could NOT detect.
🔴 **AND THE SHARPEST FORM OF IT IS TWO NUMBERS DERIVED FROM ONE FIELD.
MEASURED 2026-09-19 ON THE MIM CORPUS.** A build's lookup table was keyed by
FILE NAME, a re-encode changed one name, one of two tables was updated and the
other was not, so `NOT_OURS[file]` read `undefined` and **Kanuti Gildi SAAL's
recording was silently re-credited to MIMproject**, with a `holder` field saying
the file was ours. The build printed nothing and every file was present and
correct.
⚠️ **THE CHECK THAT SHOULD HAVE CAUGHT IT AGREED PERFECTLY WHILE BEING WRONG.**
It compared `theirs.length` against `counts.theirs`, and BOTH ARE DERIVED FROM
THE SAME FIELD, so the two halves moved together and the check passed. What
actually found it was a human reading the harness's DETAIL line, where `2 of 28`
had become `1 of 26`.
✅ **THE REPAIR IS TWO INDEPENDENT SOURCES, WHICH IS THE WHOLE RULE**: the page
now compares the NOTE, prose written by hand, against `source`, which comes from
the lookup table, so the two can disagree. And the build THROWS on a key
matching no measured file, proved by putting the old name back.
⚠️ **KEY BY `id`, NEVER BY FILE NAME.** A name is a thing a re-encode changes.

🔴 **A PAGE THAT GAINS ITS FIRST CONTROL MOVES EVERY OTHER CONTROL'S HARNESS
PRESS, AND `settleMs` ONLY EVER LANDS ON CONTROL 0.** MEASURED 2026-09-16 on
`/radio/`: adding one button made the looper's `→` control 1 instead of control
0, so the single press the harness gives it moved from t+1 s to **t+31 s**,
landing in the middle of the page's own loop check and taking it red
intermittently with a face that read `≠`. Nothing about either control changed.
⚠️ The symptom is an intermittent failure in a check that has nothing to do with
the control you added, which is the worst place to start looking. **After adding
or removing a control, re-run the page and diff the per-demo assert count**, and
if a check depends on WHEN a press lands, have it confirm where it landed rather
than assuming.

🔴 **AND A CONTROL YOU DISABLE IS A CHECK THE HARNESS CAN NO LONGER REACH.
MEASURED TWICE IN ONE DAY, 2026-09-19, ON TWO PAGES INDEPENDENTLY.** Both
harnesses drive a page by clicking every button in `.pos-controls`, so a page
whose checks sit behind a press loses them the moment that press stops
happening. `disabled` is not a style, it is a `return` in front of the handler.
- `/mirror/`: switching the VR and AR buttons off when the browser reports no
  headset meant `enterHeadset` was never called, and **ten** asserts about both
  session branches would have gone silent while the page read 41/41 green.
  Caught before shipping; the page now drives whichever mode nobody reached,
  behind `SELFCHECK`, with a map so a real press on a headset is never doubled.
- `/blocks/`: the same change took **six**, and those were reported and replaced
  rather than caught in advance. On a real headset all six come back.
⚠️ **IT IS NOT A REASON TO LEAVE A LYING CONTROL ENABLED.** A button that cannot
do the thing it names is the defect; this is the bill for fixing it. What it
costs is that the checks behind it have to be reachable another way, which they
always could have been, because a check that only a control can reach was
already a check that nobody runs on a machine without that capability.
⚠️ **AND A DISABLED CONTROL IS EXACTLY WHERE THE COUNT LIES QUIETEST.** The suite
stays green either way: those asserts do not FAIL, they simply never run. Diff
the per-page assert count after any change to what a control does, which is the
rule above, and account for every one that moved.

**A green suite can mean zero coverage.** `verify.mjs` reported 261/261 while a
demo was fatally broken on iPhone, because desktop Chrome never enters that
branch. After any change to `src/low-latency-player.js`, run
`demo/verify-native.mjs` too.

**Attribute a run to a build before iterating on it.** Every 06 log opens with
`BUILD <sha>-<hhmmss>`, substituted into the deployed `shell.mjs` by
`build.mjs`. Without it, "still broken" and "the fix never loaded" are the same
observation. **Confirm the stamp changed before asking anyone to retest** — the
edge serves the previous build for a few seconds after deploy.

**Being right about a mechanism says nothing about whether it dominates.** State
what you expect to see if your cause is the real one, then check that you see it,
before shipping a fix.

**When two hypotheses have opposite fixes, build the measurement that separates
them first.** Do not pick between them on plausibility.

**Never guard a patch on `s.includes(<substring>)`.** Three bugs in one day from
this — `BUILD` matched inside `REBUILD`; `LOG_KEEP` and `#log` were satisfied by
the code just inserted. Guard on the exact declaration, or assert the effect
afterwards. Printing "ok" is not evidence.

**`verify.mjs` stops collecting 400 ms after the last assert.** Its stabiliser
waits only while the count is still GROWING, so a check whose FIRST assert sits
behind a wait reports "asserted nothing" (a page that is working reads as
broken), and one that pauses mid-way silently loses every assert after the
pause. Slow work — going live, a recording, resolving a WebM duration — belongs
behind control 0, which is the only control that gets `settleMs`.

**`grep` returns nothing on `timeline/transport.mjs`.** It held two literal NUL
bytes (a cache-key separator typed raw instead of `\u0000`), so BSD grep called
the file binary and printed nothing — not "binary file matches", nothing. Every
search of the timeline core answered "not there", including for `createDeck`,
which is exported ~40 lines from where the search claimed nothing was. The NULs
are now escaped. If a search for a symbol you are sure exists comes back empty,
suspect the file before the symbol: `node -e "…indexOf(…)"` is the second
opinion.

**An engine switch invalidates the harness's HTTP cache.** A media element
loading `video.src = <m3u8>` stores a no-cors (opaque) entry for that URL; the
moment a page switches to hls.js, its XHR for the SAME url is served from that
entry and rejected as a CORS failure — on a URL that answers 200 with
`access-control-allow-origin: *`, and while the page's own `fetch` of it
succeeds in the same run. Two demos read red for exactly this and nothing in
either page was wrong. `verify.mjs` now deletes its profile's Cache before
every run.

**Never let sound gate the work.** `audio.play()` and `AudioContext.resume()`
both wait on a user gesture in a real browser, and neither REJECTS — awaiting
one before doing the real work is a hang, not an error. It cost two demos in one
session: shout spent five seconds buffering an element before its measurement
opened, pushing the whole run past the harness's settle, and vclick awaited a
suspended context and never compiled, never built its deck, never raised its
transport bar — while looking fine, because the readout had been filled at load.
Headless hides it: `--autoplay-policy=no-user-gesture-required` resolves both.
Fire them and move on; sound is allowed to be late, the timeline is not.

**"Is the XR object real" is not "is there a headset", and desktop Chrome is
the proof.** MEASURED while building `verify-quest.mjs`: desktop Chrome has a
genuinely **native `navigator.xr`** — an `XRSystem`, an accessor on
`Navigator.prototype`, every method `[native code]` — and answers
`immersive-vr: false`. So a nativeness test alone passes every laptop, and an
`isSessionSupported` test alone passes a polyfill that claims everything. They
catch disjoint things and BOTH are needed, plus `adb shell getprop` from
outside the browser entirely. The Immersive Web Emulator installs a JavaScript
`XRSystem`, and Meta markets its coverage as "on par with the Meta Quest
Browser" — which is the iPhone mistake in a new accent. `--self-test` runs all
three cases against headless Chrome and needs no device; sabotage
`nativeVerdict` and it goes 3/3 -> 0/3, which is how you know it is not
decoration.

**A second browser of your own is a harness that reads broken.** A full run
went 429/429, then 420/429 with nine failures, then 429/429 again with no code
between them — and all nine were in the three demos that depend on something
outside the machine (`carry`'s relay socket opened 0 times, `shout` read
`peak rms 0.0000`, `now` showed no frames). The cause was two probe Chromes of
mine still holding relay sockets and bandwidth while the suite ran. Re-running
just those three gave 57/57. So **before calling a red run a regression, run the
failing demos ALONE** — it costs a minute and it separates "my change broke it"
from "I was competing with myself", which look identical in the output.

🔴 **`claimProfile()` RETURNS AN OBJECT, AND FOUR SEPARATE THROWAWAY PROBES PUT
IT STRAIGHT INTO A TEMPLATE STRING ON ONE DAY.** `--user-data-dir=${claimProfile('probe')}`
stringifies to `[object Object]`, **which is a valid relative path**, so nothing
throws, nothing warns, Chrome starts perfectly, and a **156 MB profile appears in
the repository root in a directory literally called `[object Object]`**. MEASURED
2026-09-21: three background agents and the session all did it, two reported it
as a mystery, and one deleted it and it came back within the hour.
🔴 **AND `sweepStale()` IS STRUCTURALLY BLIND TO IT**, which is what makes it a
leak rather than a mess: the sweep decides a directory is stale by reading a PID
out of its NAME, and that name has no pid in it. In a project that has already
had a volume run out at 229 leftover profiles and about 20 GB.
✅ **THE OBJECT STRINGIFIES TO ITS OWN PATH NOW**, via `toString` and
`Symbol.toPrimitive`, so `${profile}` and `const { dir } =` both do the right
thing. **The lesson is the shape rather than the patch: a helper that returns an
object where every caller wants a string will be interpolated, and a wrong value
that happens to be a legal path is worse than one that throws.**

🔴 **A HARNESS THAT DOES NOT DELETE ITS OWN PROFILE FILLS THE DISK, AND THE
DISK FAILING LOOKS LIKE EVERYTHING FAILING.** Every harness here launches Chrome
with a per-run `--user-data-dir`, for reasons that are correct and written down
(a shared profile is a shared HTTP cache, and Chrome writes its real CDP port
inside it). None of them ever removed one. MEASURED 2026-09-14: **229 leftover
profiles, ~20 GB, and the volume down to 119 MB free** — at which point `find`
itself died with ENOSPC and no shell command would run. A profile is ~250 MB and
the suite gets run dozens of times a day, so this leaks about a gigabyte an
hour of ordinary use. ⚠️ **Cleaning up on the way out is not enough**: a run
that is Ctrl-C'd or killed executes no handler, and those are exactly the runs
that happen when something is already wrong. `demo/harness-profile.mjs` does
both halves — `claimProfile()` removes this run's directory on `exit` and on a
signal, and **sweeps directories whose pid is dead**, which is the half that
actually recovers a machine. It is safe because the pid is in the name, so a run
in another terminal keeps its own. ⚠️ And `kill()` ASKS; it does not stop —
with a plain `kill()` the handler deleted the directory and a still-shutting-down
Chrome recreated it, which is a cleanup that runs, reports nothing and does
nothing. SIGKILL and await the child's `exit` before removing. **Say how many
were swept**: a cleanup nobody is told about cannot be told apart from a leak.

**A harness and a dev server that share a port is a harness that reads broken.**
`node demo/verify.mjs` died with an unhandled `EADDRINUSE` three separate times
in one session because `node demo/server.mjs` was still holding 8890 — each
time looking like a broken suite rather than a busy port. `serve()` now takes
the next free port and says so, and the harnesses read `server.address().port`
rather than the one they asked for. The general form: **a fixed port is a
shared mutable global.** The same bug in a second costume is a fixed CDP port —
`verify-gl.mjs` attached to a Chrome left over from the previous run and
reported that run's flags, which is how a SwiftShader test reported ANGLE
Metal. Let the OS choose and read back what you got.

**A wedged hardware encoder cannot be killed, and looks like broken code.**
`/dev/video11` is a single exclusive V4L2 device, and when it wedges, ffmpeg
sits in uninterruptible sleep: `SIGTERM` does nothing, `SIGKILL` does nothing,
`timeout` does nothing, and `modprobe -r bcm2835_codec` answers "Module is in
use". Three ffmpegs stacked up behind it, each one reading from the outside as
"the encoder produces no bytes". Recovery is a reboot. **Check `pgrep -cx
ffmpeg` before concluding anything about an encode** — and `-x`, never `-f`,
because `pgrep -f h264_v4l2m2m` matches its own ssh command line and answers
"still held" about itself. That is LESSONS #39 in a new costume and it cost
twenty minutes twice.

**Ask the picture the right question.** `mirror`'s "there is a picture in it,
not a flat field" assert failed twice on a vivid kaleidoscope. First it sampled
four points — on an EIGHT-FOLD SYMMETRIC radial image, where any two samples at
similar radius are similar by construction, so it was measuring the symmetry of
the thing it was checking. Then it summed R+G+B over the whole frame and read
`9 of 765`, because the shader's colour is three cosines 120° apart and **three
cosines 120° apart sum to a constant**: the image varies almost entirely in HUE
at near-constant luminance. Per channel, red alone spans 26..254. A statistic
that is constant by construction over your subject is not a weak measurement,
it is a blind one.

**Prove a guard fires.** Break the thing on purpose once. And note `cmd | tail`
reports `tail`'s exit status, not `cmd`'s.

**When you implement somebody else's format, only their implementation can
grade you.** `timeline/csound.mjs` was 22/22 green for months with two real
defects, because the test compared it against a number derived from the SAME
formula the compiler implements — which catches a typo and can never catch a
misreading. Real Csound found both in an hour: the tempo ramp was 239 ms out at
beat 30 (Csound interpolates seconds-per-beat linearly in beat, not tempo), and
`^+x` resolved against the wrong note. The warning comment in that file was
worse than useless — its confident "118 ms early" was the distance between two
WRONG answers. `timeline/lab/csound-oracle.mjs`; it skips cleanly where the
reference is not installed, because a check nobody can run is a check nobody
runs.

🔴 **CHECK THE INSTRUMENT BEFORE REPORTING AN ABSENCE, AND THREE DIFFERENT
REFUSALS IN A ROW ARE THE INSTRUMENT.** MEASURED 2026-09-19 on two works
addressed on IPFS: one `curl -I` each at three gateways gave **429, 406 and
301**, and that was written up and REPORTED as *addressed, not retrieved*, with
the open question being whether anybody still pinned them. Every one was rate
limiting or a redirect. With a real user-agent, a **ranged GET rather than
HEAD** (HEAD is what those gateways throttle hardest) and six seconds between
calls, five gateways answer 206 and both 77.9 MB files came down in **under four
seconds**.
⚠️ Three hosts refusing in three different ways is not three facts about the
content, it is one fact about how you are asking. **An absence reported as fact
is the expensive kind, because nobody re-runs it.**

🔴 **AND A DOMAIN OUTLIVES THE PEOPLE WHO HAD IT.** A Wayback survey of
mimproject.org returned 67 pictures and four were adverts for a Thai online
casino: everything under `/uploads/2025/01/`, after the domain lapsed and was
picked up for gambling SEO. Nothing in a CDX row says who owned the host that
day, and **`a 2025 revival` was written into four files before anybody opened a
picture**. A site coming back and a site being taken are the same shape in an
index of URLs. Open the pictures; key any provenance claim on something other
than the URL.

**A partial result that is too tidy is a broken collector, not a finding.**
Exactly 4 of 5 events, exactly 0 across every case, exactly nothing on the
network scan. In one session: csound writes ANSI escapes so `grep '^EVT'` lost
most lines; `execFileSync` returns only stdout while csound's `prints` go to
stderr; and `.local` names do not resolve at all from this sandbox because mDNS
is multicast UDP. Check the instrument before believing the pattern.

**Long measurements: no pipes, no dangling promises.** `node x.mjs | tail` buffers
until exit and looks hung — write to a file. An un-awaited `fetch` keeps the
event loop alive forever.

**Read the comments already in the file.** `src/publish.sh` pins `ffmpeg@7`
("needs libfreetype for the clock overlay") and the publisher says "the key must
never be echoed". Both were correct and both were ignored, each costing a run.

**A recovery action is not free.** Rate-limit it, require it to have somewhere to
land, and make it yield rather than retry forever — see `low-latency-player.js`,
where a drift-seek every 2–3 s aborted the in-flight fragment loads it was trying
to recover.

## Assert both modes, and watch the assert COUNT

A demo that branches must assert every branch on every run. Adding a uniform
mode to grid silently dropped it from 11 asserts to 10 while still reading
green — and worse, because `verify.mjs` presses every control the toggle was ON
at check time, so only 6 of that page's 8 asserts ever ran in the suite.
(grid no longer branches: one grid, one quality, 8/8 run.) Diff per-demo
counts against the last known total after any change.

## A count is only evidence on the far side of the boundary

- **A count is only evidence on the far side of the boundary.**
  `createMidiLane`'s `scheduled()` counted what the page QUEUED and read
  identically to delivery — while every note was being scheduled fifty-six
  years out. Ask which side of the wire a counter is counted on before quoting
  it.
