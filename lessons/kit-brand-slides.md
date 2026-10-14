# Kit lessons: brand-slides

The longer comments cut from `demo/shell/brand-slides.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-brand-slides.md#<anchor>`.

<a id="header"></a>

## `brand-slides.mjs` module header

```text
demo/shell/brand-slides.mjs: the brand's slides, one by one, for /kit/logo/.

🔴 THEY WERE A DECK AND ARE A KIT PART NOW, 2026-10-06. Asked: *"add kit/logo
page and use individual slides from the brand slides. rm brand slids after
it"*. The `brand` deck that played on the front page (`decks.mjs`) is gone;
its six slides and everything that draws them moved here VERBATIM, and
`demo/kit/logo/index.html` shows each one as a block of its own. The CSS
that was brand-only moved with them, to `brand-slides.css`.
⚠️ `drawMark` LIVES HERE NOW. It drew the β+ `demo/favicon.ico` that p.s
replaced on 2026-10-14 (the favicon note in `shell.mjs`).
⚠️ NOTHING HERE OPENS ANYTHING. A slide is drawn from its data; the only
file one costs is the slide face's Greek subset, from this origin, fetched by
the browser when a β is laid out.
```

<a id="logo-wordmarks"></a>

## `brand-slides.mjs` the logo and the wordmarks

```text
THE BRAND SLIDES, the first deck until 2026-10-06. Its first slide is the logo, moved out of
/kit/'s BRAND part on 2026-10-06 (*"a first slidedeck Brand where you move
our positron logo attempt"*). A positron is the particle of beta plus decay,
so the mark is `β+`: β at step 6, the largest step the scale has, and
positron and studio under it at step 4 (3 on 2026-10-05, then *"for β+ logo
make wordmark + 1 step larger"* on 2026-10-06). The accent is on the `+` alone,
because the charge is what makes it a positron. The β comes from JetBrains
Mono's Greek subset, which slide.css declares and the browser fetches only
when a β is laid out. `slide.css` sets the three lines solid and raises the +.

Then the wordmarks, asked the same day as *"experiment with wordmarks"*
with two grids typed out: `positron.studio` cut into rows of five and of
three. A mono face makes the cut a grid with every letter in a column. Both
at step 4, the largest at which five rows fit the inset (74 per cent of the
height), so the wordmark is one size on every slide (*"same font size on
each slide workdmarks"*), the logo's included.
Centred on the slide (the default `stack` layout with no headline), asked
as *"center workmarks slide 2 and 3"*; the rows are the same width in a
mono face, so centring them keeps every letter in its column.
The dot wears the accent (*"on workmarks color . to yellow"*), as the + does on the logo.
```

<a id="icons"></a>

## `brand-slides.mjs` icons

```text
ICONS, asked 2026-10-06: *"add icons simulations to brand slides (ico and
pwa) using β+ (no superscript?) try both actually"*. β+ drawn into canvases
at the pixel sizes the icons really have, so a 16 px favicon shows the
pixels a tab would get rather than a picture of them, and every slide puts
the two marks side by side: the + raised as on the logo, and the + inline.
⚠️ WHOLE NUMBER SCALES ONLY for anything drawn larger than it is, the rule
the OLED slides follow: a 16 px icon enlarged is shown at 4x or 5x, never
at 4.6x, or its pixels come out uneven and the simulation lies.
```

<a id="favicon"></a>

## `brand-slides.mjs` favicon

```text
The favicon at 16 and 32 px, as they are drawn. The enlarged 16 and the mock
tab went the same day (*"no need for icon on tab and largtest icon"*). The INLINE mark only since 2026-10-06, chosen with a screenshot of
its 16 and 32 px: *"keep these for icons"*. At 16 px a raised + is two
yellow pixels; inline it stays a plus.
```

<a id="appicon"></a>

## `brand-slides.mjs` appIcon

```text
The installed app: the rounded square iOS draws and the circle Android masks
to, with the name under. The RAISED mark only since 2026-10-06, chosen from
the two with a screenshot of it: *"keep these for app logos. add hor gap a
biiit"*; the favicon slide still compares both.
```

<a id="logorow"></a>

## `brand-slides.mjs` logoRow

```text
THE LOGO, HORIZONTAL, asked 2026-10-06 as *"add horizontal versoin for brand
slide 1"*: the same β+ at step 6 with the + raised, and positron over studio
at step 4 beside it instead of under it, the two blocks centred on each
other. Built from the slide's own type classes (`sl-t6`, `sl-t4`), so every
size is still a step of the slide's scale.
```
