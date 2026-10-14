# Kit lessons: pico-worker.mjs

The long comments cut from `demo/shell/pico-worker.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-pico-worker.md#<anchor>`.

<a id="header"></a>

## pico-worker.mjs, file header

demo/shell/pico-worker.mjs: one emulated Pico, paced to real time, off the
page's main thread. Driven by `createPicoRunner` in pico.mjs; nothing else
should post to it.

🔴 A WORKER AND NOT A SLICE ON requestAnimationFrame, AND THE NUMBER IS WHY.
MEASURED 2026-10-04 in Node on this laptop: the router firmware runs at about
0.6 x real time FLAT OUT (38 million emulated instructions a second against
the 64 million a second the firmware's own busy loop asks for). On the main
thread a page could give it at most about 10 ms of each 16.7 ms frame, which
is about 0.36 x and a page that stutters while it does it. Here it gets a
whole core and the page gets all of its own.

⚠️ IT IS PACED, NOT FLAT OUT. Each slice runs the board to where real time
says it should be, so on a machine fast enough to keep up it idles rather
than racing ahead, and the screen moves at the firmware's own speed. Behind
by more than 100 ms it forgives the debt rather than sprinting to repay it,
so a slow machine runs slow and smooth rather than in bursts.

⚠️ A KEY IS HELD FOR AS LONG IN BOARD TIME AS THE PERSON HELD IT IN WALL
TIME. Down goes to the pin at once; up is applied when the board's clock has
counted the same hold, and never sooner than 40 ms, which clears the
firmware's 20 ms debounce. So a one second press on OK is a one second press
to the firmware, which is what makes it a deny, however slow the emulator is
running, and a click with no hold at all is still a tap.
