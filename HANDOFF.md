# Handoff, 2026-09-18, session 34

**DEPLOYED AND CONFIRMED ON THE EDGE: `BUILD 8b06e8b-142710-e4a1`.** Confirmed by
reading the stamp back off `positron.studio`, not by the deploy saying so. 9
commits, working tree clean apart from a build stamp, 357 unpushed. 81 entries
still open in `BACKLOG.md`.

**The board is still the one thing not deployed**, and it cannot be from here: it
answers over the relay and refuses ssh. `cd rig/box && ./push.sh`.

## The two real finds were both in SHARED code, and both wore a page's clothes

🔴 **`mediaMaster` DOES NOT RUN ITSELF, AND `/stage/` NEVER TICKED IT.** Reported
as *"there is not caret in arvhice playback"* and diagnosed wrongly TWICE as a
MediaRecorder file carrying no cues. The file was fine the whole time. MEASURED:
the element went to 1.00s of a 3.45s recording, `ended` false, `seekable`
0.00..3.45, while the deck sat at 3.45s. The line that settled it was
**`master ticks 0, backstop 0, driving false`**: printing three counters answered
in one run what guessing had not in three.
⚠️ **THE SEEK CHECK PASSED THROUGHOUT**, because it asks the ELEMENT where it
went. Every assert about that archive sat on the one side of the join that
worked.
⚠️ **AND A SECOND GAP FELL OUT OF IT**: `mediaMaster` listened only for
`timeupdate`, which a paused element never fires, and it produces no rvfc frames
either. Seek a paused master and every sensor goes quiet at once. It listens for
`seeked` now.

🔴 **BOTH ERR PAGES WERE BLIND TO THE REFUSAL BOUNDARY, AND ONLY SABOTAGE SAID
SO.** With `fake-err.mjs`'s `serves()` forced to `return true` they read FULLY
GREEN, because no assert in either page named a refusal, a 403 or a served
segment. `/flipper/` had the blocked minutes in a READOUT CELL, and a cell is not
an assert. Both assert it now and the same sabotage takes **4 red, 2 per page**,
while the negative controls stay green. **Four instances of one pattern, counting
`fake-tapes.mjs`: a stand-in makes a page runnable without making it graded.**

## What landed

**`/now/` and `/flipper/` contact nobody.** `demo/fake-err.mjs` is the third
stand-in after `fake-station` and `fake-tapes`, and they were the last pair still
pointed at a broadcaster. **58/58 with the only hosts being the dev server and
the stand-in**, re-run independently rather than taken on report. It reproduces
the REFUSALS, not just the stream.
⚠️ **UNTIL THIS SESSION'S COMMIT, GIT HEAD HAD NO `errUrl` AT ALL**, so a fresh
checkout of `/now/` would have gone to `live.err.ee`. The protection existed only
in a working tree.

**`/now/` plays through a refused live edge**, which is exactly what ERR was
measured doing to ETV: 7 asserts red and a black picture before, 0 red of 23
after. `findServedEdge` came out of `/flipper/` into `err-live.mjs` and both
pages call it.

**`/flipper/` goes red against a server that is not there**: it read 8/8 at a
closed port because `open or loading` was satisfied by `!!c.hls`. The repair is
not a better instant, because `readyState` is an instant too and a WORKING page
read `readyState=1` one line after a seek. **`totalVideoFrames` is cumulative and
a seek does not reset it.**

**A public domain film is behind the stage**, Melies' `Le Voyage dans la Lune`
(1902), four minutes of twelve, 4.07 MB, **two independent public domain grounds**
rather than one. Its audio was removed and that is a LICENCE decision: the 1902
film is silent, so any sound on the upload is a modern score carrying its own
copyright. That is the OPPOSITE call from the Dickson film it replaced, where the
sound WAS the 1894 artefact and stripping it was the mistake.
⚠️ **AND IT IS GRADED, NOT JUST DEPLOYED.** Forcing `field: true` so the flat
fill paints over it leaves the element perfectly healthy (480x360, playhead
advancing, no 404, no console error) and the frame spanning **0 of 255**.
**Nothing else in the suite sees that one.**

**`/stage/` is 39/39, up from 28.** Also: follow tracks the write head during a
show rather than the playhead; the archive opens on a 30s window with zoom out
bounded at 4x it; start and stop are a transport bar; `How it works` moved into
the control room and the archive; the recorder picks 700 kbit/s instead of the
browser's 2,500; `diagram cuts: [object Object]` is gone.

## Rules that cost real time this session

🔴 **A SETTING THAT READS AS CORRECT AND DOES NOTHING, FOUR TIMES IN ONE DAY.**
`mediaMaster` built and never ticked. `__demo.transport` being whichever bar was
BUILT LAST rather than the one the page means. `verify.mjs` clicking
`document.querySelector(".tbar-toggle")` while asserting about
`__demo.transport`, which are the same element only on a one-bar page. And
`.mp4` missing from `build.mjs`'s allowlist, so the film shipped its provenance
JSON and not itself while the build said `copied 182 files`.

🔴 **A CHECK IS BLIND AT THE WIDTH IT RUNS AT.** `/stage/` reported SIX diagram
cuts on a phone and `nothing had to be shortened to fit` in the harness, on the
same build. Then the diagrams moved into tab panels, where
`getComputedTextLength()` answers 0 under a hidden ancestor and every string
"fits". Assert on `dg.measured` first.

🔴 **A LABEL THAT SPELLS A VALUE GOES STALE SILENTLY.** `the archive opens on a
fifteen second window` outlived its constant by hours. Nothing type-checks a
sentence.

⚠️ **AN EXPIRED SEGMENT LOOKS EXACTLY LIKE A REFUSED ONE.** `err-live.mjs` fact 2
says to probe only segments from the playlist just read, and that is necessary
and NOT sufficient: a thirteen point sweep takes seconds and the window slides
while it runs. MEASURED `#.......#####`, two boundaries drawn where there is one.
Membership has to be checked at PROBE time.

⚠️ **I HID A BUILD FAILURE FROM MYSELF** with `node build.mjs >/dev/null 2>&1`,
then lost a run to a `BG is not defined` that was my own unterminated comment
swallowing two `const`s. Both mine, both avoidable.

## Open and worth knowing

- **`.gitignore` had a blanket `*.mp4`**, so the first film reached the deployed
  edge and would have been absent from every clone: `build.mjs` copies the
  WORKING TREE rather than the index. There is an exception for
  `demo/resources` now.
- **The harness still points `/now/` at the default arrangement** rather than at
  `/wall`. That is a choice this time, not a setting standing in for a fix:
  `/flipper/` at `/wall` grades a picture playing through a wall and `/now/` on
  the default grades one at a live edge, so both modes run every time.
- **A dead server leaves `/flipper/`'s first control busy for the harness's full
  40 s cap**, because `await c.media.play()` on an element whose source never
  loads neither resolves nor rejects. Pre-existing, not fixed.
- **Five requests for a different project** arrived mid-session (a gig calendar:
  sidebar top border, a 100% dark selection outline, remove a dark underline,
  remove a sold-out strikethrough, translucent sold-out titles). They are NOT in
  this repo and nothing was done for them.
