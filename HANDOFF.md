# Handoff — 2026-09-15, session 28

Deployed: **`e5a8ad9-205829-6cdb`**, confirmed serving. Nothing is committed.

---

## 🔴 READ FIRST: we were hammering two people's radio servers

Their operator wrote to Kristjan: roughly **100 concurrent clients** against
their limit, traced to positron.studio. It was us, and specifically it was the
CHECKS rather than visitors.

**Two causes compounding.** IDA was moved to the FRONT of `STATIONS` that
afternoon so visitors would land on something that plays, which made it the
default connection for every page load and every harness run, at 320 kbit/s.
And **49 orphaned headless Chromes were still running**: a harness run that is
interrupted executes no cleanup, and a live page holds its stream open for ever,
so a few dozen runs became a hundred permanent listeners.

`idaidaida.net` and `live.uuu.ee` are removed from `workers/shout`,
`demo/shell/radio-gran.mjs`, `demo/radio1965/index.html` and
`demo/shell/mp3-frames-test.mjs` (that last opened two IDA mounts on EVERY test
run). The relay answers 404 for all three mounts. **Do not add them back
without asking them.** `/radio1965/` and `/videoradio/` now rotate four ERR
mounts, which are the ones that keep going down.

⚠️ **The standing rule named one page and that was not enough.** "Do not
re-verify /radio1965/" does not cover `verify-gl.mjs videoradio`, which opens
the same relay. The rule that matters is: **no CDP check against any page that
opens somebody else's stream.** `demo/harness-profile.mjs` sweeps DEAD profiles
and does not kill LIVE orphans; check `pgrep -f user-data-dir` before believing
anything about connection counts.

---

## What shipped

**`/videoradio/`** — ten named looks in a `LOOKS` constants table, pickable with
`?look=` and from a row in the control bar. `quartz` is the working one; `dune`
is it frozen before the swell. The picture is a Rutt-Etra scan landscape with
hidden-line removal, advection, three-band video feedback, bloom and a P7
phosphor ramp. Also: stop while playing, a clock over the picture, auto-hiding
footer, `?auto=1` kiosk mode, `?bare=1`, and a comparison page at
`demo/videoradio/looks/compare.html` (local only, not a slug).

**`/station/`** — new, live, 19/19. HLS playlist of byte ranges into whole R2
files; a Worker writes ~600 bytes of text every few seconds and never touches
audio. Retention sweep took a real 962 KB leak to zero and refuses to delete a
referenced chunk. `#EXT-X-DISCONTINUITY` fires and two players cross it.
`plan-station.md` and `workers/station/`.

**`/tapes/`** — 32/32. Play-on-load, two cursors and the timeline scale all
fixed, each by a check that failed before it passed.

**`/crate/`** — 28/28. Lists what is already in the store, droppable box, title
field, table header hidden when empty.

**Shared kit** — sibling links in diagrams now route with arrowheads; tooltips
wrap at 40 chars and stay on screen; choice labels never wrap; focus colours an
existing border instead of adding a second ring; an empty table draws nothing;
the feedback panel was retitled and its padding fixed.

---

## Open, in rough priority

1. 🔴 **`/videoradio/` drops out of full screen after 22 to 25 seconds.**
   MEASURED and narrowed, not solved. The log says `the window WAS focused ·
   visibility visible`, no navigation, and station switches report
   `fullscreenElement=yes` twenty seconds before an exit. `exit()` in
   `fullscreen.mjs` is reachable only from the button, so the page is not
   asking. Both exits landed at 28s and 27.4s since load; the tour dwells 22 s
   then slides 9 s, so both fall inside the first morph. That correlation is
   SUGGESTIVE AND UNPROVEN. Next step is one line shipping at the morph
   boundary. The page already beacons to `https://pub.positron.studio/log`
   (SINGULAR — `/logs` is the read path and silently discards writes).
2. **`/crate/`**: click a name to play, highlight the active row, delete button
   in a trailing actions column. Needs row-click and per-row actions in
   `table.mjs`, and a delete route on the worker. Neither exists.
3. **The crate store is 18/21 my own test uploads**, about 12 MB of `the self
   check`, and it has no retention sweep. `workers/station` got one; this did
   not.
4. **`/radio1965/` has three diagram arrows it deleted** because siblings could
   not be routed. They can come back now with no component work.
5. **The iPhone probe still needs ten minutes of a real phone**:
   `https://positron-probe-station.kristjan-jansen.workers.dev/`. Four questions
   in `research/station-one-source-2026-09.md` §8.
6. `BACKLOG.md` holds the rest.

---

## What cost the most time, so it is not repeated

**Reasoning instead of measuring.** Four separate defects were "explained" from
the code, fixed, and still wrong: the fade to black, the tapes autoplay, the
diagram label overlap, and the fullscreen drop. In each case the mechanism named
was real and was not the dominant one. Every one of them fell in minutes once
instrumented. The fade took three wrong fixes before a three-sample measurement
showed `field` and `shown` healthy while `final` collapsed, which located it
immediately.

**A backtick inside a GLSL comment closes the template literal.** Seven times.
`node --check` on the extracted module catches it every time; the script is in
the session scratchpad and should move into the repo.

**Restoring a look from a saved page failed twice**, both times returning a
shader block that compared as byte-identical while a constant OUTSIDE it
differed. That is why looks are a constants table now and why
`demo/videoradio/looks/pulsar.html` was deleted.
