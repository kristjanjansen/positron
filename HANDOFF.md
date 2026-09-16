# Handoff, 2026-09-16, session 29

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
