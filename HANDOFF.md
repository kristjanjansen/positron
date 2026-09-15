# Handoff — 2026-09-16, session 29

Deployed and confirmed on the edge at **`665f313-220813-3f93`**. **Nothing is
committed**; the working tree carries the whole of this session.

---

## 🔴 READ FIRST: ERR told us we corrupted their listener statistics

Relayed to Kristjan on 2026-09-16: *"ERRil oli ka probleem, et nende
kuulajastatistika läheb sassi"*. That is a different and worse kind of damage
from the load reported in session 28. A broadcaster's audience figures are what
it reports to its board and its funders, and a few dozen headless Chromes
holding mounts open for hours are counted as listeners who never leave. It
cannot be undone by stopping, only by not adding to it.

**The rule is no longer about the value of a check.** It is: every connection
this repo opens to an ERR mount appears in a public broadcaster's audience
measurement, so open one only when a person is going to listen to it. `/radio/`
and `/videoradio/` both rotate four ERR mounts, which covers every harness run,
every reload in a development loop, and every tab left open on a second monitor.
Written into CLAUDE.md under the existing rule.

🔴 **AND THE RELAY DOES NOT TEE, WHICH IS WHY THE COUNT IS WHAT IT IS.** Read
off the code, not remembered: `workers/shout/worker.mjs` does a fresh
`fetch(upstream)` per request with `cacheEverything: false`, so **N browsers are
N listeners at the broadcaster**. A Durable Object holding ONE upstream per
mount and teeing it to every subscriber would make this whole site exactly one
listener per mount however many people are on it. It is the top line of
`BACKLOG.md` and it is the single highest-value thing left.

⚠️ ERR is now invisible on the front page: the section named after them is gone,
`reel` moved to the headset group, the two live channel pages moved to
`technologies`, and the name is out of three descriptions and two tag lists. The
PAGES are unchanged and still reachable.

---

## What shipped

**`radio1965` is now `/radio/`** — slug, directory and every reference, across
52 files. The deployed `/radio1965/` is GONE and no redirect was written, so any
link anybody kept 404s. Only `archive/` still says the old name, on purpose.

**`/radio/`'s looper**, four asks in one:
- The playhead follows the mode. Pingpong was the real defect: the voice reads
  one buffer of `2 x the kept seconds`, the fraction was taken against a picture
  one length wide, so the line crossed once and then **sat against the right
  edge for the whole return half**. It folds at the turn now. A mode change also
  picks the sound up where it already was rather than restarting.
- The wave is frozen, not chipped. Two clocks: the picture was drawn against
  `frozenAt` while `feed()` went on trimming against `now()`, eating the wave
  from the left at one second of picture per second of loop. `grain-scope.mjs`
  copies its columns at the instant it freezes.
- `[LOOP|→]`, one button cycling → ← ⇆, glued to the right of LOOP by a shared
  edge, and on the bar with no loop running so the direction can be chosen
  first. It survives a loop ending.
- The loop is GREY. Band, ends, wraps and live edge are `--dim2`, the playhead
  is `--fg`, and `--hi` is left for the grain ticks. Two checks had to move with
  the stylesheet: `headInk()` looked for yellow and would have read zero.

**One crash explained three complaints.** `shareLabelColumn()` still read
`loopRow.el` after `loopRow` was set to `null`. It threw inside `applyPatch`
during boot, so the patch was never named (SOUND read `—`), `boxesReady`
was never called (the picture and controls sat dark for the full 6 s deadline
and lit saying *the granulator never arrived*), and the granulator's asserts
never ran.

**`createPicker.options()` never drew the name it selected**, so `/mirror/`'s
LOOK read `—` with ten shaders loaded. Fixed in the component, with an assert on
`/mirror/` that reads the cell rather than the select.

**`/blocks/` was dead** with `q is not defined`: `q` was a `const` inside a
block and a later check read `q?.label`. Optional chaining guards a null VALUE,
never an undeclared NAME. 49/49 after.

**`/tapes/`, all four outstanding asks**, each proved by sabotage:
- The gate opened on a press anywhere on the transport row, and `if (asked)
  start()` then played the page at the visitor seconds later. It is the play
  button only now, plus the space bar, which `transport-bar.mjs` handles on the
  window and which used to run the transport at gain zero.
- **The old assert passed vacuously on `asked ||`** — in a real visitor's
  session it excused itself from the one case worth grading. There is a second
  assert on the ROUTING, which needs no trusted event.
- Opens on an hour (`OPEN_SPAN_MS`); the old assert required the whole run, so
  the ask could not be done without a green check going red.
- `barGap` 3 -> 1.
33/33, and both sabotages went red exactly where expected.

**The front page**: no articles in the act or group titles, title is
`positron: media art experiments`, 38 px of air above the name on desktop, the
empty `notes` heading is gone, and there is a Feedback button (the panel titles
itself *general feedback*).

**The feedback panel**: top padding was never wrong, the CLOSE BUTTON was,
inheriting `height: 34px` from the global `button` rule. Send is the default
button (Return, or Cmd/Ctrl+Return from the message box) and is now secondary,
because `.pos-pri`'s `box-shadow: 0 0 0 1px` made it two pixels taller than the
field beside it. The sandbox notice is gone.

**`/videoradio/`**: the look picker is gone and `quartz` is the look; `?look=`
and the comparison page stay.

**WebXR**: `xr-panel.mjs` takes a `surface` — a floor the page draws in the
session's own context, handed the clear colour so a fade cannot drift from the
ground it fades into. `preview()` gained a `profile` across one eye so a check
can tell a ramp from a plate. `/videoradio/` has Run in VR under its
description and a sea: a second `makeField` in the session's context fed the
SAME bytes as the window's, drawn on a 36 m plane with a world-space radial
fade. **Stage A of `plan-videoradio-xr.md`. The displaced mesh is stage B.**

**`/earshot/`** — new, 24/24, the WebXR audio probe. Three arms, two negative
controls, three guards proved by breaking them. It touches no third-party mount:
it decodes from our own station Worker.

**`demo/check-html.mjs`** — parses every module block in a page with no browser,
mapping line numbers back to the page. `node demo/check-html.mjs demo/*/index.html`
reads 47 blocks in 47 files. This is what to run after editing a page the rules
say not to verify.

---

## Open, in rough priority

1. 🔴 **`shout` does not tee.** See above. It is the fix for the ERR problem.
2. 🔴 **The sea has never been run.** Its asserts are written and they live
   inside `/videoradio/`, which no harness may open. They will not run until
   somebody deliberately runs that page. Stage B is the displaced mesh.
3. ~~`/earshot/` needs a real Quest~~ **DONE 2026-09-16, and all four answers
   are in CLAUDE.md.** Audio survives an immersive session on a Quest and costs
   nothing: the context stays running, the latencies do not move, `AudioDecoder`
   decodes with zero errors, a main-thread callback keeps up, and 90.0 fps held
   for 3322 frames with all of it going at once. Two small defects the run
   exposed are in `BACKLOG.md`.
4. **`/videoradio/` drops out of full screen after 22 to 25 seconds.** Unchanged
   from session 28 and still unproven. Next step is one line at the morph
   boundary.
5. **`/crate/`**: click a name to play, highlight the active row, delete. Needs
   row-click and per-row actions in `table.mjs` and a delete route.
6. **The crate store is 18/21 my own test uploads** and has no retention sweep.
7. **`/radio/` has three diagram arrows it deleted.** They can come back now.
8. **Media durations are not in `corpus.json`**: 26 time-based items, none with
   a duration, so `/tapes/` cannot draw a record as long as it is.
9. `BACKLOG.md` holds the rest, including one line nobody has explained:
   *"v2in: station"*.

---

## What cost the most time, so it is not repeated

**Three separate reports were one line of code**, and each had been described in
terms of the thing the reader could see: a slow fade, a missing patch name, a
red check. None of them named the crash in the log that caused all three. Read
the log before theorising about the symptom.

**Optional chaining made two different bugs look safe.** `loopRow?.disabled()`
beside `loopRow.el`, and `q?.label` on a `q` that was never declared in that
scope. `?.` guards a VALUE that is null. It does nothing for a name.

**A colour test inside a check is a copy of a stylesheet value.** Greying the
loop furniture would have left `headInk()` hunting for yellow and reading zero
about a picture with a playhead plainly in it.

**An assert that excuses itself is worse than no assert.** `asked || opened === 0`
passed in exactly the case it existed to catch, and under the harness `asked` is
always false, so it read green for three sessions while the report kept coming
back from a real browser.
