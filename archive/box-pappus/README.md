# archive/box-pappus: the granulator half of `/box/`, removed 2026-09-16

This happened in **two passes on one day**, and the second reversed the two
exceptions the first one made.

| file | what it is |
|---|---|
| `page-half.js` | pass one: the picture and the narration of the granulator on `/box/` |
| `page-half-2.js` | pass two: the last message, the flag it set, and the log line |
| `box-err.js` | pass two: ERR's 1965 archive out of `box.mjs` and `jacksynth.mjs` |
| `pappus-err.js` | pass two: ERR's 1965 archive out of `pappus.mjs` |

**None of them is a module and none may be imported.** Most of the page code
closes over names that exist only inside that page.

Removed on instruction: *"plan and remove pappus from the
http://127.0.0.1:8890/box/ signal path. there is no ui to control it. arhvice
it. update diagram as well."*

`page-half.js` is the removed code, verbatim and in the order it stood in
`rig/box/listen.html`: the comment where the effect switch used to be drawn, the
`insert` variable the board's reports were followed into, the long comment above
the one message that clears the insert on connect, the two log lines that
narrated it, the `pappus` box in the diagram, and the two links it stood
between. **It is not a module and must not be imported.** Most of it closes over
names that exist only inside that page.

🔴 **THE BOARD HALF IS NOT ARCHIVED AND MUST NOT BE DELETED, AND THAT WAS
RE-CONFIRMED ON INSTRUCTION 2026-09-16: *"keep pi granulator for grains"*.**
`rig/box/pappus.mjs`, `pappusFx()` in `rig/box/jacksynth.mjs`, the `fx.pappus`
handler in `rig/box/box.mjs`, `source.set` and `rig/box/norns/Engine_Pappus.sc`
are all still live and still load-bearing: `/grains/` is a built demo whose
whole subject is the same granulator running in a browser tab and on the
Raspberry Pi, and it switches the board's insert on from its own handler. What
left is one page's drawing and narration of it, not the instrument. The ERR
archive that fed it a minute of 1965 is a different question and is answered
below.

## What it was

Pappus is a SuperCollider engine driven over OSC, 106 parameters and no note
numbers. It is an INSERT rather than an instrument: `pappusFx(true)` patches the
running instrument's JACK output into `SuperCollider:in_1` and `in_2`, and
`SuperCollider:out_1` and `out_2` into `posbox:input_1`, which is the capture
that sends audio back to the browser. Switching it off puts the instrument
straight back into the capture.

On `/box/` it was drawn as a box between `instruments` and `capture`, and that
was the whole of its presence there. The page has had no control for it since a
Csound reverb took its place in the controls: a grain cloud has no note-off, so
wrapping an instrument in one washed out the envelope, the attack and the patch
character before you heard any of them, and the patch arrows stopped doing
anything audible.

## Why it left

**A picture of a control nobody has.** A visitor pressing keys on this page
cannot change the granulator, cannot switch it in, and cannot switch it out. The
box in the diagram claimed a stage in the signal path that the page does not
own, and the log opened by talking about it: `insert` began `undefined`, the
board answered `fx: null` on its first heartbeat, and so an ordinary visit that
never met a granulator logged *"the granulator is out of the sound"* every time.

## Pass two: the message went too, and the board took the job

Instructed the same day as *"get rid of both"*, quoting the two exceptions
above. `page-half-2.js` is what left: `fx.pappus {on:false, onlyIfIdle:true}`
sent on connect, the `let insert` flag the board's reports were followed into,
and the one log line that fired when the board refused. After it,
`grep -c pappus rig/box/listen.html` answers **0**.

🔴 **THE GUARANTEE DID NOT GO WITH IT. IT MOVED ONTO THE BOARD, WHICH IS WHERE
IT SHOULD ALWAYS HAVE BEEN.** The argument for keeping the message was real and
it had a hole: it made the guarantee depend on somebody opening `/box/`, and
nobody has to. A `/grains/` tab closed at midnight left the board granulating
itself until the next person happened to load a page that sent one message.

`sweepInsert()` in `rig/box/box.mjs` runs on the five-second heartbeat and again
at the top of `startAudio()`. If the insert is in and the client that asked for
it has not been heard from inside `INSERT_HELD_MS`, it comes out, and a
`box.alive` carrying `insertState()` goes out at once rather than on the next
beat. There is no new message type: every page already reads that heartbeat.

⚠️ **A REAL SIGNAL WAS LOOKED FOR FIRST AND THERE IS NONE.**
`workers/relay/src/index.js` forwards every frame verbatim and never parses one,
so its Durable Object does not know any client's `from`; its `webSocketClose()`
is an empty method; `openWire` sends no farewell on unload; and
`/room/<name>/stats` reports idle times in an anonymous sorted array that cannot
say WHICH socket left. So it is an idle rule, and the 15 s is checked against
`/grains/`'s own 4 s poll rather than chosen.

`rig/box/insert-test.mjs` grades it, with the negative control that separates
"cleans up after itself" from "drops it on a timer regardless". **It has not
been run**: it touches a shared instrument in another building.

## Pass two: ERR's 1965 archive left the board

`box-err.js` and `pappus-err.js`. What went: `errSearch`, `errItem`,
`errExcerpt`, `errStatus` and `loadBuffers`; the `source.search`, `source.load`
and `source.clear` verbs; `archiveSource()`, `archiveNow` and the idle stop that
kept it from streaming to an empty room; and the `archive` entry in
`JACK_SYNTHS`, which played the broadcast into the JACK graph on
`-stream_loop -1` so that it never ended.

Three reasons:

- **No page in `demo/` called any of them.** Grepped, not remembered. `/grains/`
  uses `source.set` with a spec it makes itself, and `/box/` never offered the
  archive as an instrument.
- **`/box/`'s description stopped claiming an archive source weeks ago.** The
  code was live and undescribed, which is the state things rot in.
- **CLAUDE.md's standing rule.** Every connection this repo opens to ERR appears
  in a public broadcaster's audience measurement. An unused path to their
  archive, from a machine nobody is watching, is exposure with no benefit, and
  the looping instrument was the sharp end of it at about 28 MB an hour for as
  long as the board was up.

🔴 **`source.set` AND THE WHOLE MADE-SOURCE PATH ARE UNTOUCHED.** `PosSource`,
`sourceArgs`, `sourceFeed`, `madeSource`, the saw spec. That is a sound BUILT on
the board from a description `/grains/` sends, it touches nobody else's server,
and it is the whole point of that page.

⚠️ **READ `pappus-err.js` BEFORE WRITING ANYTHING LIKE IT AGAIN.** It carries
politeness this board earned the hard way after ERR blocked its address on
2026-09-11: a disk cache for a year that ended sixty years ago, a two-second
floor between requests, and a backoff that stopped asking when ERR said no. The
tests that graded all three are in
`git show 141d7f3^:rig/box/pappus-test.mjs`.

## What pass one said it was keeping, kept here as the record

**`fx.pappus {on:false, onlyIfIdle:true}` is still sent on connect**, and it is
what makes the removal true rather than merely undrawn. An insert left behind by
a `/grains/` tab that was simply closed goes on wrapping whatever `/box/` plays
and feeds its own delay: measured 2026-09-12, a steady -6.1 dBFS subsonic drone
while `box.alive` reported `voices: 0`, true about notes and false about sound.
One `fx.pappus {on:false}` took it to digital silence. Deleting the message
would have taken the picture and the sound in opposite directions.

**One log line is still there**, for the case where the board refuses. A live
`/grains/` tab holds the insert and the board answers `ok:true, on:true,
kept:true` with the holder and the ages. If the page said nothing there, its
diagram would be a confident lie in exactly the one situation where it is wrong,
and `rig/box/README.md` promises that both pages say so in words.

⚠️ **Both paragraphs above were true for about four hours.** They are kept
because the FAULT they describe is still real and is now the board's job.

## What replaced it in the picture

The `Raspberry Pi` box now holds the three instruments as a set, named after
what they actually are: `FluidR3 GM` (the 141 MB General MIDI collection played
by FluidSynth), `hexter` and `yoshimi`. Each of them arrows into `capture`,
which says `ffmpeg, JACK`. `plan-box-pappus.md` has the reasoning and the
signal path it was checked against.
