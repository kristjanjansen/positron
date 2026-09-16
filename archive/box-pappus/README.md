# archive/box-pappus: the granulator half of `/box/`, removed 2026-09-16

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

🔴 **THE BOARD HALF IS NOT ARCHIVED AND MUST NOT BE DELETED.**
`rig/box/pappus.mjs`, `pappusFx()` in `rig/box/jacksynth.mjs`, the `fx.pappus`
handler in `rig/box/box.mjs` and `rig/box/norns/Engine_Pappus.sc` are all still
live and still load-bearing: `/grains/` is a built demo whose whole subject is
the same granulator running in a browser tab and on the Raspberry Pi, and it
switches the board's insert on from its own handler. What left is one page's
drawing and narration of it, not the instrument.

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

## What did NOT leave, and why that is the point

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

## What replaced it in the picture

The `Raspberry Pi` box now holds the three instruments as a set, named after
what they actually are: `FluidR3 GM` (the 141 MB General MIDI collection played
by FluidSynth), `hexter` and `yoshimi`. Each of them arrows into `capture`,
which says `ffmpeg, JACK`. `plan-box-pappus.md` has the reasoning and the
signal path it was checked against.
