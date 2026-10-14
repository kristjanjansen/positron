# Kit lessons: deck-checks

The longer comments cut from `demo/shell/deck-checks.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-deck-checks.md#<anchor>`.

<a id="header"></a>

## `deck-checks.mjs` module header

```text
demo/shell/deck-checks.mjs: the synths deck's own checks, plans/plan-live-slides.md section 7.

🔴 THEY LIVED ON /kit/slides/ UNTIL 2026-10-06, when the deck left that page,
asked as *"SYNTHS DECK - rm from slides kit page"*. They run on the deck's own
page now, https://positron.studio/slides/synths/, from `deckPage` in
`decks.mjs`, behind `?selfcheck=1` like every check, and AFTER that page's own
three, because these are the only ones that fetch anything: Start imports the
Faust runtime and fetches the compiled program, and after an edit the live
compiler loads. The visit and a step open nothing, asserted before the press.
⚠️ ONE CHECK DID NOT MOVE: the half width player's footer showing the deck's
title as a link. That player is the front page's, and the deck page plays the
deck at full width with the ordinary count, which `deckChecks` asserts.
Every reading is the far side of a boundary: the resource list the browser
keeps, the count of contexts `audio.mjs` has made, an analyser on the graph,
the context's own `state`.
```

<a id="quiet-ms"></a>

## `deck-checks.mjs` QUIET_MS

```text
🔴 NO STRETCH OF THESE CHECKS IS SILENT FOR LONGER THAN THE HARNESS
WAITS. `verify.mjs` stops collecting after 2.0 s with no new assert, and
on 2026-10-06 a wedged AudioContext made slide 3's three level waits run
out back to back, 4.7 s of silence, so the six asserts after them were
never made and the run read 92/94 rather than 92/100. Every wait here
is cut to what is left of QUIET_MS since the last assert, so a red lands
as a red and the asserts after it still run. The longest quiet stretch
is measured and printed on the last assert, so a check creeping towards
the limit is visible before it is cut.
```

<a id="c1"></a>

## `deck-checks.mjs` check 1: the visit

```text
1. a visit loaded no engine and made no sound device, and the opening is a
   title slide in the positron deck's style (2026-10-07, *"use same style
   for synths slide 1"*): the name, and one line under it on the bottom edge
```

<a id="wait-660"></a>

## `deck-checks.mjs` 660 Hz wait

```text
⚠️ UNTIL THE READING IS 660, NOT A FIXED FEW FRAMES: compiled before the
press, Start sounds at once, and the analyser still holds the earlier
440 tone from before the context was suspended, so a reading four
frames in measured a mix (444 to 492 Hz) twice on 2026-10-06
```

<a id="c9"></a>

## `deck-checks.mjs` check 9: slide 3

```text
9. SLIDE 3, the sine's 0.5 as a slider, drawn as a knob between the code
and the plate (*"slode 3: make 0.5 into knob 0..1"*). Every level is read
off the analyser, every value the node holds off the node itself.
```

<a id="splits"></a>

## `deck-checks.mjs` splits 1:2

```text
the synths deck's splits are 1:2 with the words on the foot of their
column (*"use 1:2 cols layout"*, *"align text to bottom of slide"*)
```

<a id="headline-top"></a>

## `deck-checks.mjs` headline top

```text
⚠️ THE HEADLINE'S TOP ON EVERY INSTRUMENT SLIDE, each read while it
is shown: the longest words are the ones that climb out of the column
```

<a id="one-scale"></a>

## `deck-checks.mjs` one scale

```text
slides 2, 3 and 4 draw the instrument at ONE scale (*"2 and 3 use
same size of fau"*), PANEL_H being the tallest of them. ⚠️ EACH HEIGHT
IS READ WHILE ITS SLIDE IS SHOWN: a hidden slide's panel measures 0,
and until 2026-10-06 this compared slide 2 at 0 px, which any height
passes
```

<a id="panel-h"></a>

## `deck-checks.mjs` PANEL_H

```text
ONE PANEL HEIGHT since 2026-10-06 (*"keep same fau size!!! knobs
condense code area"*): every panel is PANEL_H tall, a knob row
takes its height from the code row
```

<a id="volume-wait"></a>

## `deck-checks.mjs` volume wait

```text
⚠️ THE NODE'S VALUE IS AN AudioParam's, WHICH MOVES WHEN THE CONTEXT
RENDERS: read once, it said 0.5 over a silent tone on 2026-10-06
```

<a id="knob-edit"></a>

## `deck-checks.mjs` knob row edit

```text
an edit that takes the slider out takes the knob row out; putting it back brings the row back.
⚠️ TWO ASSERTS AND NOT ONE: each edit is 600 ms of idle and a compile,
and two of them before one assert was more silence than the harness
waits (2.0 s), so the first run lost this check without a word
```

<a id="c10"></a>

## `deck-checks.mjs` check 10: slide 4

```text
10. SLIDE 4, slide 3's program plus one line, its 440 on a second slider
(*"slide 4 is freq"*, *"this order, progressing"*): volume then freq,
one row, each knob in its own hue. Every frequency is read off the
analyser, every value the node holds off the node itself.
```

<a id="wait-880"></a>

## `deck-checks.mjs` 880 Hz wait

```text
⚠️ AND THE LEVEL TOO: the analyser's window still holds the silence
from before Start for a few frames, which read RMS 0.1774, half, on
2026-10-06 while the frequency in the sounding half was already right
```

<a id="c10b"></a>

## `deck-checks.mjs` check 10b: filter and LFO

```text
10b. THE FILTER AND THE LFO ON IT, 2026-10-06 (*"do filter, lfo (for
filter?)"*). The filter slide is the saw through a two pole low pass at
`cutoff`: the offline render reads RMS 0.2663 at its 2000 Hz default
(`build-faust-aot.mjs`), and at 100 Hz a 440 Hz saw keeps almost nothing,
so the level read off the analyser has to FALL, which only a filter that
is really in the signal can do. The LFO slide is graded on what it adds:
two more knobs from the text and a sound from its own artefact.
```

<a id="c11"></a>

## `deck-checks.mjs` check 11: slide 6

```text
11. SLIDE 6, slide 4's program with a third control, an `nentry` whose
`[style:radio{...}]` the slot draws as the kit's choice (*"how to make
it a radio (sawtooth?)"*): volume, freq and wave in one row, in that
order, wave in its own hue. Every level is read off the analyser, every
value the node holds off the node itself. A sine of amplitude 0.5 is
RMS 0.354 and the band limited saw 0.286 (`build-faust-aot.mjs` EXPECT).
⚠️ ONLY WHILE THE SLIDE IS IN THE DECK: `wave` is hidden since 2026-10-06
```
