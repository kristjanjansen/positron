# Handoff, 2026-09-19, session 35

**NOT DEPLOYED. The edge is still on `BUILD 8b06e8b-142710-e4a1`**, which is where
session 34 left it. Everything below is committed and built into
`workers/view/public`, and one `node workers/view/deploy.mjs` away from being
live. 361 commits unpushed. Working tree clean.

**The board is still the one thing that cannot be deployed from here**: it
answers over the relay and refuses ssh. `cd rig/box && ./push.sh`.

## The one that mattered: there was no way out of `/blocks/` in a headset

🔴 **REPORTED AS *"i was not able to get out"*, AND IT WAS ONE MISSING LINE.**
The page built the quit badge, compiled its shader and drew it at both hands on
every frame, and **never once called `update`**. So the hold could not advance,
the ring could not fill, and `onQuit` could not fire. `/held/`, `/floor/` and
`xr-panel.mjs` all had the call, which is why nothing in the repo could disagree
with anything: no shared code was wrong.
⚠️ **IT LOOKED CORRECT FROM EVERY ANGLE THAT CAN BE LOOKED FROM.** The object
existed, `prepare()` reported the shader built, the badge was drawn every frame,
and the page reported a way out as present.

🔴 **`node demo/shell/xr-quit-test.mjs` IS NEW, 9 CHECKS, AND IT REFUSES THAT
SHAPE.** The defect is a line that is NOT there, and no browser check can see
one: a harness cannot enter an immersive session, and inside one, `update` not
being called is indistinguishable from nobody pressing a button.
🔴 **ITS FIRST BUILD WAS WORTHLESS AND ONLY SABOTAGE SAID SO.** It matched
`/\.update\s*\(/`, and `/blocks/` updates its room, its hands and its document,
so putting the real bug back left it **fully green**. It matches the ARGUMENT
now (`inputSources`, which nothing else in this repo is handed) and the same
sabotage takes it red. This is the substring rule CLAUDE.md already carries three
bugs from, met while writing a check whose own comment quoted it.

⚠️ **STILL UNCONFIRMED IN A HEADSET.** What is true now is that the call exists
and the ring is drawn. That it FIRES is a claim only a Quest can settle.

## What landed

**`/stage/` reworked over sixteen asks, every one against a screenshot. 42/42,
up from 39.** The picture is **1280x1008**, the film's own 4:3 plus 5%: at
exactly 4:3 nothing is cropped, so a box 5% TALLER is what trims 5% off the
width. One constant, `STAGE_OVER`, and the panel box, the empty card, the canvas
and every pixel read derive from it. The generated test picture no longer reaches
the screen at all. The film waits for the record button and both directions are
asserted. The control room has no LIVE chip, a timeline, the question form under
it, no recording lane in it, a two-state badge, and a red ● that is a kit option
(`verb: 'record'`) rather than a page hack.

**The `/stage/` diagram**: one Cloudflare machine holding Stream, R2 storage and
the Relay object; the audience browser holds a video and an answer with **no
connector between them**, because a picture arriving does not produce a press;
WebRTC on the wires with WHIP and WHEP explained in the notes; the archive return
lane dropped, because three return paths under one picture could not be followed.

**`/blocks/` brightens and never grows** (*"do not make blcoks bigger on hilite"*).
The kit's `TOUCH` table is untouched on purpose: its size channel is right for a
PANEL and wrong for a brick, whose size means something. There is an assert on
all four states, because the scale it forbids lives in shared code this page only
overrides.

**`/held/`'s mark is grey and comes off after an edit.** Nothing on that page has
a hue now.

**The quit badge lost its words.** Nothing is drawn until something is held; the
arc is the badge.

**A new run clears the last one on `/stage/`**, and there is no Clear control:
the recording, its blob URL, the questions, the answers, the option lanes and the
poll standing in both footers. 43/43, and disabling the call takes it red with
the defect in the detail line.

## Rules that cost real time this session

🔴 **A STRIP BUILT INSIDE A HIDDEN TAB PANEL MEASURES A CANVAS OF ZERO WIDTH**,
so the `fit` it is given does not take. The control room axis read **30 to 55
seconds** on a page where nothing had happened, and I blamed follow chasing a
creeping playhead TWICE before suspecting the panel. Both strips re-fit when
their tab is shown. Same family as the diagram measuring every string as fitting
inside a hidden panel, which is still open in `BACKLOG.md`.

🔴 **A BROWSER TAB I CANNOT SEE IS NOT AN INSTRUMENT.** A `<video>` that never
left `readyState 0` was read as a preload bug and two comments were written
claiming it as measured. The tab was `visibilityState: hidden`, where Chrome
defers media entirely and runs no animation frames. Both comments were corrected
to say what was actually measured. **Check `document.visibilityState` before
believing anything about media or rAF in an automated tab.**

🔴 **A CHECK KEYED ON A COLOUR BREAKS WHEN THE COLOUR CHANGES, AND IT REPORTS THE
PAGE AS BROKEN.** `/held/` counted marked pixels as `blue < 64`, which is a test
for yellow. Making the mark grey took it red with *no word changed colour* about
a page that was working. It compares SHOTS now and derives its threshold from the
two constants: MEASURED 971 pixels in the mark's band in an unmarked room (the
antialiased edges of white type), 13002 more when a word is marked, 0 difference
after unmarking. **Requiring a zero there would have been requiring the type not
to be antialiased.**

⚠️ **`.mp4` WAS MISSING FROM `demo/server.mjs`'s MIME TABLE.** The comment above
that table predicts exactly this class of bug: the deploy sets the type from the
extension itself, so a missing entry is invisible until somebody develops against
the dev server, and then it looks like a browser being fussy about a page.

## Open and worth knowing

- **One ask from this session is NOT done**: *"videpanel borders are mess"*,
  **not reproduced**. The computed styles rule out the obvious candidates
  (`.pos-vp` carries the only radius and clips with `overflow: hidden`, the stage
  and footer have none, and the control room's boxes sit 22 px apart rather than
  the 1 px the crop shows), and two attempts to place the crop both landed on the
  wrong element. Ask which page and which element before changing any radius.
- **A `Clear` button was asked for and withdrawn the same minute** in favour of
  *"New run clears"*, which is built and graded. Worth knowing because a second
  press of record **did nothing at all** before this: `startShow` returned early
  unless `phase === 'before'`, so once a show had stopped the button was inert.
  Nobody reported that; it was found while wiring the clear.
- **`/stage/`'s film loads over a dev server that does not honour Range.** It
  works, because the file is faststart and 4 MB, but nothing here has tested it
  over a slow link.
- **Nothing was deployed this session.** Two sessions of `/stage/` work are now
  sitting behind one deploy command, so the first person to run it should confirm
  the BUILD stamp on the edge rather than trusting the deploy's own output.
