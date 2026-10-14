# Kit lessons: decks

The longer comments cut from `demo/shell/decks.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-decks.md#<anchor>`.

<a id="header"></a>

## `decks.mjs` module header

```text
demo/shell/decks.mjs: the slide decks, played on the front page.

🔴 A DECK IS PLAIN DATA, PLAYED IN PLACE ON THE FRONT PAGE. Asked 2026-10-06,
after a first deck had been built as /brand/ with a card linking to it: *"use
2col slidedeck here. no separate page"*. So the front page puts one half
width player per deck under its `slides` heading, two a row, one below
560 px of the row's own width (the container query `/cam/` and the kit's
HALF WIDTH PLAYERS use). Both front page renderers call `mountDecks`:
demo/index.html locally and workers/view/menu.html on the edge, so there is
one copy of it.
⚠️ AND SINCE LATER THE SAME DAY A DECK ALSO HAS A PAGE, `/slides/<name>/`
(`deckPage` below), which the half width player's footer links to. The
card is still the player; the page is where a deck is played at full width.

⚠️ NOTHING HERE OPENS ANYTHING. A slide is drawn from its data; the only
files a deck costs are the slide face's, from this origin.
⚠️ AND THE `synths` DECK KEEPS THAT ON A VISIT. Its second slide draws a
scope, code and a plate; the Faust runtime and the compiled program are
fetched by a `Test tone` press and by nothing else, the live compiler only
by a press after the code was edited, and the only AudioContext is the
page's shared one, made by that press (`demo/shell/slide-synth.mjs`).
```

<a id="synths"></a>

## `decks.mjs` synths deck

```text
SYNTHS IN CODE, asked 2026-10-06: *"do slide deck Synths in code in the fau
examples ... keep it simple. add to frontpage"*, and cut to TWO SLIDES the
same day: *"rm fau slides c-f. first layout Synths / in code (better desc),
no body text"*, then a split with the title and what is going on on the
left and one instrument panel on the right (`demo/shell/slide-synth.mjs`).
The intro sets its two lines the way the brand logo sets its three
(`brand-slides.mjs`), declared `lines` at step 6, the largest the scale has, solid, on the left
edge, with only a caption under them. The program is compiled ahead of time
(`demo/resources/build-faust-aot.mjs`), so `Test tone` costs a few kB and no
compiler until somebody edits the code.
```

<a id="words"></a>

## `decks.mjs` WORDS

```text
Each program's words on its slide, by `id`: what a line of the code does
and what to try, asked 2026-10-06 as *"make useful slide texts"*. The third
slide the same day: *"slode 3: make 0.5 into knob 0..1"*, and the fourth:
*"slide 4 is freq"*.
```

<a id="no-titles"></a>

## `decks.mjs` WORDS no titles

```text
NO TITLES ON THE STEPS, 2026-10-06: *"rm titles from 2-4, not useful"*,
after *"slide titles make no sense. its educational step by step
material"*. The sentence is the slide. A name or a piece of code in
backticks is set in mono, and a knob's name wears its knob's hue
(`hueVars` in slide.mjs, called by the slot from its hue book).
```

<a id="wave"></a>

## `decks.mjs` WORDS wave

```text
slide 6, asked as *"how to make it a radio (sawtooth?)"*
```

<a id="title-slide"></a>

## `decks.mjs` synths title slide

```text
the positron deck's title slide, the name and one line on the bottom edge,
asked 2026-10-07 as *"use same style for synths slide 1"*; it was two
`lines` at step 6, then 5, with a caption
```

<a id="split"></a>

## `decks.mjs` split layout

```text
a third for the words and two for the instrument, the words on the
foot of their column, asked 2026-10-06 as *"use 1:2 cols layout"* and
*"align text to bottom of slide"*
```

<a id="textstep"></a>

## `decks.mjs` textStep

```text
one step down, asked 2026-10-06 as *"use smaller text size"*
```

<a id="positron-words"></a>

## `decks.mjs` POSITRON_WORDS

```text
WHAT IS POSITRON, 2026-10-07, asked as *"what-is-positron.md make slides.
shorten speaker notes to body text"*. The headings are the talk's own; each
body is one sentence cut from that slide's speaker notes, and the notes
themselves are kept whole in `notes`, which is not drawn. The source's
format line (`MIDI · audio · ...`) is not on a slide: a row of facts glued
with middots is the thing this repository does not print.
```

<a id="setup-prompt"></a>

## `decks.mjs` SETUP_PROMPT

```text
THE PROMPT ON THE LAST SLIDE, asked 2026-10-07 as *"add actual prompt (see
readme) that merges cf and positron skill lookup, put it into code box"*.
VERBATIM from README.md's `Build one like it`, which is where it is kept and
explained: Cloudflare's own setup line, then the positron-studio-start skill. If
one changes, change the other.
⚠️ READ ONLY, and a URL is coloured as a string so the two lookups stand out.
```

<a id="positron-title"></a>

## `decks.mjs` positron title slide

```text
🔴 TEN THINGS TO DO, 2026-10-07, asked as *"rename slides to 10 things you
can do with Positron. make descs be useful, see slodes skills. cut 2ns
slide. add first interactive element"*. So the deck is its title and ten
slides, each heading a thing a visitor can do, each body what to press and
what changes, each caption the page where it is done. Every body is read
off that page's own manifest line or source the same day. The first thing
was done ON the slide (the synths deck's volume step) until it was cut the
same day: *"rm Build a synth from shared parts slide"*.
⚠️ NO SUBTITLE NOW: the three line name and the two line subtitle spilled
the title slide (MEASURED by the deck's own spill check), so the subtitle
went to the notes rather than the name being cut
⚠️ NINE SINCE 2026-10-08: the synth slide's cut left nine things under a
title that said ten, so the title follows the count
```

<a id="positron"></a>

## `decks.mjs` POSITRON

```text
every inner slide's headline at step 3, asked 2026-10-07 as *"iside slides use
lesser text size"*; the title slide keeps the title's own step
```

<a id="decks"></a>

## `decks.mjs` DECKS

```text
🔴 ONE DECK SINCE 2026-10-06. The `brand` deck went the same day, asked as
*"add kit/logo page and use individual slides from the brand slides. rm brand
slids after it"*: its six slides are blocks of `/kit/logo/` now, drawn by
`brand-slides.mjs`. `title` is the name a half width player shows in its
footer. A deck page has NO sentence under its heading, asked the same day as
*"no desc on slides pages"*: the deck is the page.
```

<a id="parked"></a>

## `decks.mjs` positron deck parked

```text
the positron deck is PARKED since 2026-10-08, asked as *"rm 9 things slides
for now"*: its words stay above as `POSITRON`, and bringing it back is
`{ name: 'positron', title: '9 things you can do with Positron', slides: POSITRON }`
here, its `slides/positron` row in `manifest.mjs` and `demo/slides/positron/`
out of git (last at e403b38). It went FIRST, asked 2026-10-07 as *"reverse their order"*
```

<a id="mountdecks"></a>

## `decks.mjs` mountDecks

```text
One player per deck into every `[data-decks]` holder under `root`.
🔴 ITS FOOTER NAMES THE DECK, asked 2026-10-06: *"add slides/(slug) page on
each slode deck. title is on footer on 1/2 w it replaces page count and
becomes link to slides/(slug) page"*. So the count's slot holds the deck's
title as a link to its page, which plays it at full width with the count.
```

<a id="lazy"></a>

## `decks.mjs` lazy build

```text
🔴 BUILT WHEN IT NEARS THE SCREEN, NOT ON LOAD, 2026-10-06 (*"show the
frame, lazyload ocntents"*): a deck is every slide's code box, knobs
and scope, and a visitor who never scrolls to it pays for none of it
```

<a id="see-slides"></a>

## `decks.mjs` See slides link

```text
the link reads See slides rather than the deck's name, asked 2026-10-07 as
*"in 1/2 w replace title with "See slides" link in footer"*: the name is
on the slide above it already
```

<a id="deckpage"></a>

## `decks.mjs` deckPage

```text
🔴 A DECK'S OWN PAGE, `/slides/<name>/`, the same day and the same ask. The
page is a manifest row `slides/<name>` and three lines that call this, so a
new deck is a `DECKS` entry, a row and a copy of `demo/slides/synths/`. It
mounts the shell, plays the deck at the page's full width with the ordinary
`N / M` count, and grades that behind `?selfcheck=1` only.
⚠️ THE HEADING IS THE DECK'S NAME ALONE, the way a kit part's is its part:
`__demo.name` and `document.title` keep `slides/<name>`, which is the
identity `verify.mjs` checks against the manifest row.
```

<a id="no-log"></a>

## `decks.mjs` no log

```text
no log under the deck, asked 2026-10-07 as *"rm logs on slide pages"*
```

<a id="sound-checks"></a>

## `decks.mjs` synths sound checks

```text
🔴 THE SYNTHS DECK'S SOUND CHECKS, moved here from /kit/slides/ on
2026-10-06 (*"rm from slides kit page"*). After `ready`, because they
take about twenty seconds and `ready` is also the harness's boot wait;
each one asserts within its silence limit, so the count is collected.
```

<a id="evidence-spill"></a>

## `decks.mjs` evidence spill

```text
⚠️ AND THE EVIDENCE REGION'S OWN CHILDREN, 2026-10-07. `.sl-ev` centres
what it holds, so evidence taller than the room the headline leaves
overflows UP over the headline and DOWN over the caption while `.sl-in`
reports no spill at all. MEASURED on three text decks written 2026-10-07
and removed the same day (*"rm new slides. not useful"*): a three line headline drawn through by its own text, a
four row table over its caption, and this assert green on both.
```
