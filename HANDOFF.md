# Handoff, 2026-09-16, session 31

**DEPLOYED AND CONFIRMED ON THE EDGE AT `b2bddd2-092128-ad26`.** The relay went
out separately (`positron-shout`, version `9e029e2e`).

🔴 **NOTHING IS COMMITTED. 67 files are dirty and every BUILD stamp this session
reads `b2bddd2`, which is the PREVIOUS commit.** The stamp's tree digest is the
only thing telling two of today's builds apart. Committing is the first job of
the next session, in coherent pieces, and `demo/manifest.mjs` was edited by
three agents so read it before staging.

⚠️ **`workers/view/preview.mjs` EXISTS NOW AND I SHOULD HAVE USED IT.** It runs
the same build and interlock and then `wrangler versions upload --preview-alias`,
MEASURED at 11 s with production untouched. Twice this session a deploy went out
while a background agent was still writing, which is exactly what it is for.
⚠️ Wrangler printed no preview URL, so Preview URLs may not be enabled on the
Worker. That is a dashboard toggle nobody has flipped and I did not flip it.

---

## 🔴 READ FIRST: THREE RULES CHANGED, AND ONE REVERSED

**A self-check never runs for a visitor. No exceptions.** Instructed as *"rip
those selfchecks out of user experience and make rule about it"*. In CLAUDE.md
with both excuses that were used here and what each cost. Four pages obey it;
**41 do not** and are listed by name in `BACKLOG.md`. That sweep is not
mechanical: a read-only assert costs a visitor nothing, what has to move is
anything that opens a file, makes a sound, presses a control or moves the
picture.

**Inner diagram boxes get ARROWHEADS now.** This reverses the old tie rule,
which was correct and still lost: a headed line, then a headless one, then a
headed one down one column reads as a head that fell off, reported twice. There
are THREE answers on a container and CLAUDE.md names them: an arrow (default),
`set: true` (a bracket, for a machine whose children are a set), and
`join: false` (nothing at all).

**The diagram heading is `How it works`**, from `HOW` in `diagram.mjs`, on every
page. It was three treatments across six pages when the day started.

---

## What shipped, by page

**`/tapes/` stopped loading and playing on page load.** Reported three times,
the third as *"omg you still do not get it"*. The self-check suite was running
for every visitor: it opened a 12 MB recording from archive.org, played it and
looped it four ways inside three seconds. The two previous repairs were both
real and both about something else (one shut the sound gate, the other stopped
the duration probes), which is why it survived. 38/38, and the new assert goes
red under sabotage naming the exact URL it opened.
⚠️ **Every run walks the visitor's path first**, including the suite's, then the
suite opens a file on purpose. The obvious `load: SELFCHECK` would have let the
suite take a different path from the visitor, which is how this lived so long.

**`/videoradio/`**: the headset half archived to `archive/videoradio-xr/` with
its plan and a README of what the three device runs bought; the sea removed
entirely (*"remove bottom one"*, after I misread *"lower"* as "make it shorter"
and shipped that); the standard transport bar in its own box with the LIVE chip
and ⛶ in a real `loopSlot`; moved to the `vain` group.

**`/radio/`**: `Automate` landed and was **removed the same day** on instruction
(*"rm 'automate' button from radio demo (and functionaitu) and bring in
automated sliders we made"*, agent-built both ways). The tour, its check and its
three asserts are in `archive/radio-automate/`; the page declares no controls at
all again, and all five sliders under the picture carry the kit's hand button
instead. ⚠️ A sweep is not a tour: nothing walks the twelve sounds by itself any
more, and the README says what else went. Also IDA and Radio 1965 back, `dub`
the default preset, short station labels, the wet/dry judder fixed, `speakers`
out of the diagram, and the reserved control slot no longer over-reserves by
112 px above 720 px wide. **52/52.**

**`/keys/`**: a diagram, press-to-sound `lag`, a `patch` label, the patch line
gone. The diagram took four rounds and every round was a real renderer fault.

**`/replay/`** (agent): all six asks, 22/22, plus a `cue log` box saying where
the cues come from.

**`/crate/`**: rows play on press, the live row is lit, the upload block merged.

**`/seek/`** retired to `archive/demos/` (agent), 5 real references swept of 30
slug-shaped candidates.

**`/items/`**: a red check that was a race, not a bug. See below.

---

## 🔴 IDA AND RADIO 1965 ARE BACK, AND HERE IS THE EXACT STANDING

Both were removed on 2026-09-15 at their operators' request: roughly 100
concurrent clients each, traced to positron.studio. They are back on
instruction, on the user's own condition *"(if single listener)"*, and the
condition is met: `class Mount` in `workers/shout/worker.mjs` holds ONE upstream
per mount and fans it out, `?direct=1` is deliberately not offered, and
`GET /tee/<id>` reports `upstreamConnections`.

⚠️ **NEITHER OPERATOR HAS BEEN RE-ASKED.** What changed is the SIZE of the
claim, not their permission. The code says so in those words.
⚠️ **BOTH ARE LAST IN THE LIST AND MUST STAY THERE.** A page opens the first
entry it finds; being at the front is what did the damage.
⚠️ The other half is fixed too: `demo/fake-station.mjs` means the suite opens
nothing of anybody's.

---

## 🔴 AND THE RULE GOT WIDER: EVERY EXTERNAL SOURCE, NOT JUST ERR

Instructed after I called an archive.org harness "safe": *"stil: super careful
with external sources, better avoid"*. The mistake was reading the ERR rule as
being about that specific harm rather than about whose server it is.
`node demo/verify.mjs tapes` pulls real recordings and must not run in a loop.
`/tapes/` needs a stand-in like `fake-station.mjs`; it is in `BACKLOG.md`.

---

## What cost the most time, so it is not repeated

🔴 **I REPORTED THE SAME `/crate/` BUG FIXED TWICE BECAUSE I REASONED INSTEAD OF
MEASURING.** Three separate faults were hiding in one symptom, and each had a
definitive answer available in seconds:
- **CSS pasted INSIDE a rule.** My `.pick` and `.on` rules landed between
  `.pos-tbl-row {` and its declarations. Nested rules are ignored, so every
  visual change was inert AND I had broken that rule's own layout. One look at
  the file showed the brace.
- **`key` is not `name`.** The sidecar carries both: `key` is
  `vain-dev/<stamp>/audio.wav` and answers **200**, `name` is the uploader's
  original filename and answers **404**. Two `curl`s settled it. I had guessed.
- **The failure was silent**, so it presented as a transport bug. The page
  logged `playing …` for an action it had not managed to take.

**A page that gains its first control moves every OTHER control's harness
press.** `settleMs` lands on control 0 only. Adding `Automate` moved the
looper's single click from t+1 s to t+31 s, into the middle of another check,
intermittently. The symptom is a failure in a check with nothing to do with what
you added. In CLAUDE.md. ⚠️ **AND IT MOVES BACK WHEN THE CONTROL LEAVES**:
`Automate` was removed hours later and the same click returned to t+0. The
repair that survived both is the one in the check itself, which confirms where
it landed instead of assuming when the press arrives.

**`d.button(id)` searched the control row only**, so any page that MOVES a
control got null back. `/videoradio/` and `/tapes/` both move controls and had
the same latent fault. The shell keeps a map of what it built now.

**`/replay/` reported 3 of 10 asserts and read GREEN.** Its diagram asserted at
load, which disarms `verify.mjs`'s first-assert budget; every real check sits
behind a 2.4 s guard and landed after the harness stopped collecting. This is
the trap already written in `BACKLOG.md`, met in the wild. `/station/` still
asserts at load.

**`/items/`'s red check was a race in the CHECK.** It captured its baseline the
instant the row went live, and the worker publishes in two steps with an
`announce()` fetch between them: **a Durable Object's input gate does not cover
a non-storage await**. Announcing is an allowlist of one room, so a harness room
reads null on both sides and passes however the race falls. Only a real run can
fail it.

**An empty flex child still eats a gap.** `/videoradio/`'s ⛶ measured 9 px from
top, bottom and left and **17 from the right**: two zero-width members after it,
each still separated by the 8 px gap. Same family as an empty readout painting
its own border.

**`scope.source()` set a string that was never drawn.** `/radio/` had been
calling it into the void for weeks. A setter with no reader is the same shape as
a control that looks live and is inert.

**A flag added to a diagram node must be carried to the render node.** `box()`
builds a fresh object rather than spreading the spec, so `set` was invisible to
the painter and read as an option that did nothing. Two runs.

**`back: true` is an AUTHOR flag that nothing infers.** A return link without it
is laid out as a forward step, which drew a line straight through `playout` and
put its head on the far left of the Browser.

---

## Open, in rough priority

1. 🔴 **COMMIT THIS SESSION.** 67 dirty files, three agents' work mixed in.
2. 🔴 **The 41 pages whose self-checks still run for visitors.** `BACKLOG.md`.
3. **`/draw/`**: default zoom 2.0, and the blue line has no contrast on white.
   Asked with a suggested mechanism (no blue while drawing, fade it in when
   stopped, fade the drawn line to semitransparent, and that semitransparent
   state applies during playback too). NOT STARTED.
4. **`rm 'pappus chewin radio' erc label`** — I could not find that string
   anywhere a reader sees it. Asked where it is; unanswered.
5. **Why no push notification arrived on `/items/`.** The worker is healthy
   (`announcing: true, has_key: true, has_topic: true`) and the row was stamped,
   but **an FCM topic send succeeds with zero subscribers**, so a stamp proves
   we published, not that a device is on the topic. The log showed NO subscribe
   line either way, so that step did not run. Needs a full log from 0.00.
6. **The twelve sounds are typed twice**, in `demo/radio/index.html` and
   `demo/shell/radio-gran.mjs`, measured character for character identical. A
   contained 437-line deletion plus an import.
7. `BACKLOG.md` holds the rest.

---

# Handoff, 2026-09-16, session 29 (previous)

Deployed and confirmed on the edge at **`b5a7d0f-232956-32a1`**. Committed to
`session-28-station-videoradio` up to `b5a7d0f`, with one commit of the evening's
last hour still to make.

---

## 🔴 READ FIRST: ERR said we corrupted their listener statistics, and the
## relay now tees

Relayed to Kristjan on 2026-09-16: *"ERRil oli ka probleem, et nende
kuulajastatistika läheb sassi"*. That is worse than load. A broadcaster's
audience figures are what it reports to its board and its funders, and a few
dozen headless Chromes holding mounts open are counted as listeners who never
leave. It cannot be undone by stopping, only by not adding to it.

**The relay opened one upstream per client and now does not.** A Durable Object
addressed by `idFromName(station)` holds ONE connection per mount and copies the
bytes to everyone. MEASURED against the deploy, three listeners on
`vikerraadio`: `upstreamConnections 1`, 602 KB served out of 424 KB pulled, the
ICY title parsed out of the single upstream and written back into each
subscriber **at its own byte offset**, because a late joiner's byte 0 is not the
origin's. `GET https://shout.positron.studio/tee/<station>` is the readout and
`upstreamConnections` must be 1 whenever anybody is listening. The last listener
leaving closes the origin after a 20 s linger, or the tee is a permanent
listener nobody is hearing.

⚠️ **Four pages still reach ERR DIRECTLY, not through that relay**: `floor`,
`flipper`, `now`, `reel`, via `demo/shell/err-live.mjs`. That is HLS, which is
cacheable in a way a held Icecast socket is not, so the fix there is a cached
proxy rather than a tee. NOT DONE. It is in `BACKLOG.md`.

⚠️ ERR is invisible on the front page now: the section is gone, `reel` moved to
the headset group, the two live channel pages to `technologies`, and the name is
out of three descriptions and two tag lists. The pages are unchanged.

---

## What shipped

**`radio1965` is `/radio/`**, across 52 files. The deployed `/radio1965/` 404s
and **no redirect was written**.

**The looper**: pingpong's playhead crossed once and sat against the right edge
for the whole return half; the frozen wave was eaten from the left because the
picture was drawn against one clock while `feed()` trimmed against another; one
cycling button `[LOOP|→]`; the loop's furniture is grey and `--hi` is left for
the grains.

**One crash explained three reports.** `shareLabelColumn()` read `loopRow.el`
after `loopRow` was set to `null`, so the patch was never named, the boxes
waited out the full 6 s deadline, and the granulator's asserts never ran.

**`createPicker.options()`** filled the select and never drew the name.
**`/blocks/`** was dying on `q is not defined`. Optional chaining guards a null
VALUE, never an undeclared NAME.

**`/tapes/`**, all four outstanding asks, each proved by sabotage. 33/33.

**A Quest answered the four audio questions** (`/earshot/`, now archived at
`archive/demos/earshot-index.html`): the context survives an immersive session,
the latencies do not move, `AudioDecoder` decodes with zero errors, a
main-thread callback holds 11.9/s, 90.0 fps for 3322 frames with all of it
running. In CLAUDE.md.

**`/videoradio/` in a headset**, and it took three rounds:
- Stage A was a textured plane and it was a photograph of a landscape on the
  carpet. It is 46 solid wave fronts now, lit along their top 7 cm, with
  curtains that write depth so a wave behind a crest is simply behind something.
- **`window.requestAnimationFrame` does not fire in an immersive session**, so
  the page's clock stopped and the data froze. The session's rAF drives it now.
- **The whole sea sat 3 cm under the floor**, which is why the dotted grid and
  the controller showed through it: `(h - valley)` borrowed from a shader whose
  picture has no ground to sink through. Every height is metres above the floor,
  added not subtracted.
- The dots, the controller models and the tablet are all off via `grid`, `hands`
  and `tablet` on the room. The quit badge survives all three.
- **The sea is drawn in the WINDOW too**, under the picture, from the same
  `makeSea()` and the same bytes. It exists because two device runs found
  nothing. MEASURED on a real load: 161 frames, 160 data uploads.

**Four diagrams say what they mean.** `/station/` sat above the log with no
heading and then with TWO; its Cloudflare-to-Browser arrow said `Range requests`
while pointing at the Browser; nothing showed a recording arriving in R2; and it
claimed chunks BECOME programmes, which `/close` does not do: it sets
`open: false` and touches no object. `/crate/` had no diagram and now has one,
30/30. `/items/` had a label reading `same push`.

**The quit badge** is 40 mm, stands off the button's own face rather than world
up, draws no ring until there is something to count, and says `Quit`.

**`demo/check-html.mjs`** parses every module block with no browser. It caught a
backtick inside a GLSL comment the first time it was pointed at one.

---

## Open, in rough priority

1. 🔴 **Sound on entering the headset, reported THREE times and still not
   fixed.** Every repair so far was reasoning about which branch should run.
   It now resumes the context again AFTER `enter()` resolves (the page goes
   hidden the moment the session presents) and **beacons the answer**: state at
   press time, then once a second for five seconds with `ctx.state`, the fader,
   whether a stream is open and the loudness byte. **Read
   `https://pub.positron.studio/logs?format=text` after the next run.** A zero
   with a stream open is a graph that is connected and silent, which is a
   different fault from a stream that never opened.
2. 🔴 **The four HLS pages still hit ERR directly.** See above.
3. **`/held/`: a `type scale` slider on the tablet.** Shipped as constants
   (1.5 / 1.2, 36/36). `createXRTablet` has no way for a page to add a control.
   ⚠️ The room has a ceiling: at 2.5 the page reported `talk reaches 7.9 m of
   the 7.5 m half-wall`.
4. **`/videoradio/` drops out of full screen after 22 to 25 seconds.** Unchanged
   since session 28 and still unproven.
5. **`/crate/`**: click a name to play, highlight the active row, delete.
6. **The crate store is 18/21 my own test uploads** and has no retention sweep.
7. **Media durations are not in `corpus.json`**: 26 time-based items, none with
   a duration, so `/tapes/` cannot draw a record as long as it is.
8. `BACKLOG.md` holds the rest, including *"v2in: station"*, which nobody has
   explained.

---

## What cost the most time, so it is not repeated

**A readback from a presented drawing buffer returns zeros, and it fooled me
twice in one session.** With no `preserveDrawingBuffer` the default framebuffer
is unreadable once the frame has been presented. My probe read `brightest 0` on
a canvas that was drawing 161 frames a second and I nearly reported the sea as
dead. `xr-panel.mjs`'s preview carries a warning about exactly this. **A counter
is readable at any moment; a pixel is not.** `window.__sea()` exists for that.

**A check that can only pass if the picture lies is worse than the thing it was
checking for.** `/station/`'s `ties === 0` could only be satisfied by an arrow
claiming chunks become programmes. Four boxes have three gaps and every real
flow ended at the Worker, so one bracket is arithmetic, not sloppiness. The
check counts brackets now and says why.

**Optional chaining made two different bugs look safe.** `loopRow?.disabled()`
beside `loopRow.el`, and `q?.label` on a `q` never declared in that scope.

**A colour test inside a check is a copy of a stylesheet value.** Greying the
loop furniture would have left `headInk()` hunting for yellow and reading zero
about a picture with a playhead plainly in it.

**An assert that excuses itself is worse than no assert.** `asked || opened === 0`
passed in exactly the case it existed to catch.
