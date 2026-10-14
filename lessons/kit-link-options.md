# Kit lessons: link-options.mjs, link-options-test.mjs

The long comments cut from `demo/shell/link-options.mjs` and `demo/shell/link-options-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-link-options.md#<anchor>`.

<a id="header"></a>

## link-options.mjs, file header

demo/shell/link-options.mjs: settings a link carries that are not transforms.

🔴 WHY THESE ARE NOT TRANSFORMS (2026-10-09, plans/plan-site-names.md §4e).
The board's picture was asked for at 1280x720 and 30 a second, hard coded in
`openers.mjs`. The size and the rate belong to the LINK, because two links to
one encoder are the place where they could disagree. They are written in the
same body as transforms, `pi-1:gpu:video-out -> web-xx:screen:video { w 640,
h 360, fps 15 }`, but they are a different thing:
  - a transform is a MIDI operation applied to every event (`apply`), and
    `bay.mjs` refuses any transform on a non-MIDI link in words;
  - an option is read ONCE, by whatever opens the link, and changes what it
    asks the far end for. Nothing per event.
Making them transforms would have meant an `apply` that does nothing to
them, and a MIDI-only rule with an exception in it. So they sit beside the
transforms as `link.options`, and only the medium that has them may carry
them.

⚠️ ABSENT IS TODAY. A link with no options prints exactly as before and opens
exactly as before, because every default here is the value that was hard
coded: 1280, 720, 30.

🔴 THE CEILINGS ARE THE BOARD'S, READ FROM `rig/board/board.mjs`
`case 'video.start'` ON 2026-10-09: `Math.min(msg.w ?? 1280, 1920)`,
`Math.min(msg.h ?? 720, 1080)`, `Math.min(msg.fps ?? 30, 60)`. The board
CLAMPS rather than refusing, so a page asking 2560 would get 1920 and go on
believing 2560. Refusing at the link is what makes the number on the link the
number on the wire.
⚠️ THE FLOORS AND THE EVEN RULE ARE NOT THE BOARD'S, AND NOT MEASURED. The
board passes any value through to `rig/vis/v3dpipe` (`atoi`, no check) and to
ffmpeg as `-s WxH` with `-pix_fmt yuv420p`, and yuv420p halves both axes for
chroma, so an odd size is refused by ffmpeg rather than by anything here. The
floor of 16 and the even rule are this file's, so nothing below that has ever
been asked of the hardware encoder. Nothing between 16 and 1280 has been
measured on the Pi either: 1280x720 at 30 is the one size `video.mjs` records.

<a id="timing"></a>

## link-options.mjs, `TIMING`, ahead and follow

🔴 TWO TIMING OPTIONS ON EVERY LIGHT LINK, SINCE 2026-10-12
  (plans/plan-routing-time.md §4.3, asked as BACKLOG "Sync as concepts").
    ahead N    the SENDER stamps each event `at` = its shared clock now plus N ms,
               and the RECEIVER fires it when its own shared clock reads `at`.
               Two places on one shared clock then land together, whatever the
               relay leg did to each message on the way.
    follow X   the RECEIVER waits out the lag of the heavy link X as observed
               HERE (`timebase.mjs`), so a cue lands on the frame or the beat it
               belongs to rather than when its message did. X is whatever id the
               receiver's timebase knows that link by: a bay link id or the
               heavy port's id. The bay refuses an X it knows to be light.
  ⚠️ NO DEFAULT, AND ABSENT IS TODAY. A link with neither delivers on arrival
  exactly as before, which is the plan's *as it happens* mode, so nothing that
  exists changes until a link says otherwise.
  ⚠️ THE CEILING OF 10 s IS THIS FILE'S, NOT MEASURED. The plan's budget is
  the light plane's p95 plus margin, 250 ms (§4.4); ten seconds is far past any
  honest use and short enough that a typo of 150000 is refused rather than held.

<a id="test-header"></a>

## link-options-test.mjs, file header

demo/shell/link-options-test.mjs: a video link's size and rate, with no
browser, no socket and no board.

  node demo/shell/link-options-test.mjs

What is graded: the option table, the refusals in words, the text form
round trip through `bay.mjs`'s `parseLink`/`printLink`, that the bay stores
and refuses options per medium, and that a link with no options asks the
board for exactly the message `openers.mjs` hard coded before.
What is NOT graded here: `openers.mjs`'s `video()` itself, which needs a
document, a WebSocket and a board. Its one claim gradable from source (no
literal size left in it) is asserted over code with the comments stripped.

NEGATIVE CONTROLS: 13 of them, each a value or a line that must be refused,
and each asserts the REASON, because a checker that refuses everything for
one reason is the same bug from the other side.
MEASURED 2026-10-09 against 34 green, one fault at a time on a scratch copy:
  range check removed in checkOptions            6 of 34 red
  even check removed                             1 of 34 red
  bay.mjs validate ignores checkOptions          4 of 34 red
  checkOptions ignores the medium                2 of 34 red
  default width changed to 1920                  2 of 34 red
