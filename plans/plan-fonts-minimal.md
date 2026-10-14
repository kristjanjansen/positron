# The minimal font set

Status (2026-10-14): done. demo/shell/shell.css loads only JetBrains Mono and Geist at 400 and 600, and demo/shell/vendor/ holds just those four files plus the Greek 600 subset.

Asked 2026-10-12: *"make a plan what to cut from fonts. lets have absolutely
minimal set for out use cases."*, then *"cut our font list"*, then about the
accidentals *"no bravura needed i hope. can we do without?"*. The session
recommended the set below to the owner the same afternoon. This plan is
written to be executed straight after it, step by step, smallest first.

Tags: **MEASURED** (run today, numbers from a browser, a parsed font file or
`wc -c`), **READ** (from a file in this tree today), **INFERRED** (reasoned,
not run).

## 1. The verdict: two faces, two weights each

| face | files | bytes | sets |
| --- | --- | --- | --- |
| **JetBrains Mono 400 and 600** | `demo/shell/vendor/jetbrains-mono-latin-{400,600}-normal.woff2`, already shipped | 43,028 MEASURED | anything that NAMES: titles, headings, eyebrows, and every control, readout, log, key, table and slide headline. `--mono` becomes this face, so `--brand` is the same thing and stays as an alias |
| **Geist 400 and 600** | `demo/shell/vendor/geist-latin-{400,600}-normal.woff2`, already in the tree | 26,328 MEASURED | anything READ THROUGH: lines, body text, cards, kit notes, slide body. `--sans` becomes this face and `ui-sans-serif` goes |

**Nothing else on the site.** Two things sit at the edge of that sentence and
are decided in section 4: the 4,308 byte **Greek 600** subset of JetBrains
Mono (the logo's β, the same face and weight, recommended kept), and
**Gabarito** on `/weight/` (an artwork's material, recommended kept on that
one page, with the cut priced).

In the tree: **69,356 bytes in 4 files for the site**, 73,664 in 5 with the
Greek file, 120,204 in 7 with Gabarito, **down from 523,232 in 32**
(MEASURED, `wc -c` over `demo/shell/vendor`, `demo/slides/vendor`,
`demo/weight/vendor`). **Cut by this plan: 403,028 bytes in 25 font files**, plus 13 licences and one script
(MEASURED): the five sans candidates not chosen (181,476), the six archive
slide faces (174,016), the archive's byte-identical second copy of
JetBrains Mono (43,028, `cmp` says same for 400 and 600) and Bravura
(4,508).

Not web fonts and out of scope: the OLED pixel font
(`demo/shell/oled-font.mjs`, a bitmap in a module), and the test picture's
face (`demo/shell/pattern.mjs:151`, and `FFMPEG_FONT` DejaVu Sans Mono at
`:529`), which **must not change**, because the burned picture is read back
by `readBurned` and the ffmpeg filter is generated from that module
(positron-ui, *the test picture*).

### The proposal in the brief, tested

- **Brand mono for everything mono: ACCEPTED, no third weight.** The brief
  said JetBrains Mono is wider than the system mono, so `ch` reservations
  and tables would shift. **MEASURED, it is not wider:** the advance of `0`
  at 100 px is **60.00** in JetBrains Mono and **60.21** in the system
  `--mono` (headless Chrome on this Mac), 0.35 per cent narrower. A 22 ch
  picker cell gets 0.8 px narrower at 13 px. Nothing reserved in `ch` moves.
- **Weight 500 needs no file.** 57 rules in `shell.css` and 92 across
  `demo/` ask for 500 (READ), including the base `button` at `shell.css:649`
  (`font: 500 13px/1 var(--mono)`). With only 400 and 600 vendored, 500
  resolves to 400. **MEASURED as canvas ink, 13 px, `Start HLS 0123`:**
  system mono 400 = 270, system mono **500 = 270** (identical: in this Chrome
  the system mono has no medium), JetBrains 400 = 292, JetBrains 600 = 357,
  JetBrains variable at 500 = 335. So every button that says 500 is drawn
  regular today, and JetBrains 400 is 8 per cent darker than what is on
  screen. The variable file (40,404 bytes MEASURED by HEAD,
  `@fontsource-variable/jetbrains-mono` 5.3.0) would make 500 real and every
  button 24 per cent heavier than today; that is a look change, so it is a
  question (section 7), not part of the cut.
- **Geist as the one sans: ACCEPTED.** The sampler agent recommended Manrope
  with Geist second; the owner asked for brand mono plus Geist pairings and
  the session recommended Geist. If the pick changes, every step holds with
  the name swapped.
- **Bravura: CUT.** Section 3.
- **The six archive slide faces and five sans candidates: CUT.** What each
  removal breaks is in section 2.

### The one family alternative

The absolute minimum is JetBrains Mono alone, no sans (the hero's pairing D
on `/kit/frontpage/`, "Mono throughout"), 26,328 bytes less. Not recommended,
because the owner asked for a sans (*"we need sans serif to match our brand
mono"*). Said so the choice is visible.

## 2. Every cut, its reason and its bytes (MEASURED, `wc -c`)

| cut | bytes | reason | what it breaks |
| --- | --- | --- | --- |
| Manrope, IBM Plex Sans, Schibsted Grotesk, Onest, Space Grotesk, 400 and 600, plus 5 licences | 181,476 | a sampler of candidates, one won | the CANDIDATES rows on `/kit/frontpage/` and its asserts at `:429` and `:603`. Nothing else loads them (READ, build list `build.mjs:308-320` and the page's `@font-face` at `:22-31` are the only references) |
| Atkinson Hyperlegible Mono, Fira Code, Geist Mono, IBM Plex Mono, Intel One Mono, Source Code Pro, plus 6 licences | 174,016 | read only by the archived `/slides/` deck's face picker and by the sampler | `/slides/?face=<id>` falls back to JetBrains (READ `deck.mjs:459` already does for an unknown id); the archive's per face checks run over one face; the plex block `deck.mjs:896-905` goes; the sampler's archive rows `:35-46,179` |
| `demo/slides/vendor/jetbrains-mono-*` and its licence | 43,028 | byte-identical second copy | nothing once `deck.css` points at `/shell/vendor/` |
| Bravura accidentals and `LICENSE-bravura` | 4,508 | three glyphs, one of them used; section 3 | keyboard key names read `F#3` instead of `F♯3` |
| system `--mono` as the primary face | 0, kept as fallback | one mono everywhere | risks 1, 2, 3, 5 |
| system `--sans` as the primary face | 0, kept as fallback | one sans, matched to the mono | risks 1, 2 |
| `ui-sans-serif` in `kit-page.css:28` | 0 | a second spelling of the system sans | nothing |

Cold visit, INFERRED from what each page lays out: today about 43 KB (the
title and the line under it in the brand face, plus Bravura on a keyboard
page). After: the same 43 KB for the mono, plus Geist 400 (12,956) on every
page with body text, plus Geist 600 (13,372) where there are card titles:
**56 to 69 KB**, all from this origin and cached across pages. The sans is
the only thing that adds bytes, and it is the thing that was asked for.

## 3. Bravura: cut, and the keys say `#`

**Where it is used, READ:** the `@font-face` `positron-accidentals` at
`shell.css:3936-3941` (bound to `unicode-range: U+266D-266F`), and three
rules that name it: `.k .kn` (`:1893-1894`, the note name on a piano key),
`.roll-label` (`:4480`) and `.kpad-chord` (`:4593`). The chord labels
already print ASCII: `chords.mjs:182` is `['C', 'C#', 'D', ...]`, so those
two rules never draw a Bravura glyph. **The only Bravura glyph a visitor
sees is the `♯` in `keyboard.mjs:461`**, `NOTE_NAMES`. `♭` and `♮` appear in
no UI string (READ, grep: `♮` only in comments, the sampler and the subset
script).

**Do our two faces carry the accidentals? MEASURED by reading each woff2's
`cmap`** (a node script that Brotli-decodes the WOFF2 stream and walks the
format 4 and 12 subtables; positive controls: it finds `#` and `b` in the
Latin files, β in the Greek file and all three accidentals in Bravura):

| file | U+266D ♭ | U+266E ♮ | U+266F ♯ |
| --- | --- | --- | --- |
| `jetbrains-mono-latin-400-normal.woff2` | no | no | no |
| `jetbrains-mono-latin-600-normal.woff2` | no | no | no |
| `geist-latin-400-normal.woff2` | no | no | no |
| `geist-latin-600-normal.woff2` | no | no | no |
| full JetBrains Mono 2.304 Regular, not vendored | **yes** | no | **yes** |
| full Geist Regular, not vendored | no | no | no |

So neither vendored face draws them, and @fontsource's Latin subset is
what dropped them from JetBrains Mono.

**What `♯` becomes with Bravura gone and the label left alone:** it falls
PER GLYPH to the next family in `--mono`. On a Mac and an iPhone that is
`ui-monospace`, SF Mono, which carries all three (READ, the measurement in
the `shell.css:3928` comment). **MEASURED here at 100 px:** SF Mono's `♯`
is 60.2 wide (one advance) and its ink sits **2.1 px above the baseline**
with its top at 71 against a cap height of 73, so it floats slightly off
the line of the letter beside it. On Windows the stack reaches Consolas,
which INFERRED does not carry U+266F, so the glyph comes from whatever
symbol face Windows substitutes (Segoe UI Symbol, INFERRED), at a different
advance and baseline. On Android, Roboto Mono or a Noto symbols face,
INFERRED. Three platforms, three shapes, none of them ours.

**The alternatives, measured against the line:**

| label | width of `F?3` at 100 px | `?` ink, top and bottom | on the line |
| --- | --- | --- | --- |
| `#` in JetBrains Mono | **180.0** | **73.0 and 0.0**, exactly the `F` beside it (73.1 and 0) | yes, by construction: same face, same advance, same cap height and baseline |
| `♯` falling to SF Mono | 180.2 | 71.0 and +2.1 above baseline | 2 px high per 100 px |
| `♯` in Bravura (today) | 152.4 | 80.5 and 10.2 below baseline | notation proportions: narrower, taller, descends |
| a JetBrains subset rebuilt with ♭ ♯ added | 180 INFERRED | the face's own | yes, but needs `subset-font`, which is not installed (READ `subset-bravura.mjs:19`) and this is a managed machine where toolchain installs are asked first |

**Recommendation: `#` in JetBrains Mono.** It is zero bytes, zero files and
zero tooling; it is the same character the chord labels on the same pad
already print (`chords.mjs:182`), so a key reading `F♯3` above a chord
reading `F#maj7` stops being two spellings of one note; it is what most
DAWs print; and it is the only option MEASURED to sit exactly on the line.
`keyboard.mjs:456-461` chose `♯` over `#` on 2026-09-23 so that a sharp is
drawn as notation rather than as punctuation; the owner's question reverses
that, and the comment there must say so in its place rather than be
deleted. What `#` gives up is the notation shape, which is a taste call
(section 7). The flat is not needed: no key or label in the kit spells one.

**What gets wider:** `F#3` is 180 against Bravura's 152.4 at 100 px, 18 per
cent wider (MEASURED), so at a key label's size a sharp name is about 2.8 px
wider per 10 px of type (INFERRED from the ratio). The September defect on
narrow keys (`C3` losing its `3` under `C#3`, READ `shell.css:1885-1892`) was
fixed horizontally with `--kn-x`, and it was photographed when the labels
were `#`, so this is the width that fix was made for. Still checked by eye
at 375 px (step 3).

## 4. The two edges of "nothing else"

**The Greek 600 subset, 4,308 bytes: KEEP.** It is JetBrains Mono 600, the
same face and weight as the set, in the subset that holds β, declared with
@fontsource's own `unicode-range` (READ `slide.css:23-29`), so a page fetches
it only when it lays out a β. That is `/kit/logo/` and the brand slides
(READ `kit/logo:109`, `brand-slides.mjs:49`); the favicon is a pre-rendered
`.ico` (READ `shell.mjs:795`). Cutting it draws the logo's β in the system
mono, which changes the mark on every platform differently. If the owner
wants it gone anyway: the β+ mark drawn once as an SVG path, which needs a
glyph outline exported from the font, priced separately.

**Gabarito on `/weight/`, 46,540 bytes: owner's call, recommended KEEP.**
READ `weight/index.html:10-75` and `text.mjs:85-91,203-213`: the piece draws
each word as a texture at `DISPLAY_WEIGHT = 900` (the axis tops out at 800)
and body text at 400, through two aliases (`weight-display`, `weight-text`)
that never name the face, and ships `latin-ext` because Estonian Š Ž are
outside `latin`. Gabarito has a weight axis only, no width, so the piece does
not depend on a variable width; it depends on a heavy display weight and on
Š Ž. Neither is in the set: Geist 600 is the heaviest kept and Geist Latin
lacks Š Ž (MEASURED below). It is loaded by no other page. Cut path if wanted:
point the four `src` lines at `geist-latin-600-normal.woff2`, drop three
build lines and the two files, and accept the words lighter and Š Ž in a
system face, or add a Geist `latin-ext` 600 (7,996 bytes MEASURED by HEAD),
which is a fifth file.

## 5. Where each face is used today (READ, grep 2026-10-12)

- **`--mono`** `shell.css:360`, `ui-monospace, SFMono-Regular, Menlo,
  monospace`; `var(--mono)` 189 times in 39 files, 91 in `shell.css`. All 88
  `font:` shorthands with `--mono` in `shell.css` carry an explicit line
  height. Ten page rules do not (the shorthand sets `normal`):
  `archive/index.html:31,33`, `archive/note.html:20`,
  `concepts/index.html:22,50,59,61,63`, `parts/index.html:28,32`.
- **Canvas reading the token**, which follows for free: `synth-view.mjs:399`,
  `xr-tablet.mjs:704`, `xy-pad.mjs:159-160`, `bay-view.mjs:88`,
  `concepts/radio/020:257`, `concepts/radio/030:287`,
  `concepts/draw/000:54`, `kit/logo:121`, `grain-scope.mjs:710`.
- **Canvas with the system stack typed in**, which does not:
  `panel.mjs:60,63,170,181`, `held/index.html:542,598,835`,
  `partitur/wall.mjs:70,79`, `sync/follow.mjs:221`; and `pattern.mjs:151`,
  which stays. Left alone because they never load `shell.css`:
  `workers/view/build.mjs:733`, `src/index.html`, `src/demo.html`,
  `workers/moq-safari/src/index.js:293`.
- **`--brand`** `shell.css:489`, on `.pos-name` and `.pos-what`
  (`:492,496`), `chat-ui.mjs:59`, the typist pages (a typewriter, stays mono)
  and `/kit/frontpage/`.
- **`Slide JetBrains Mono`** `slide.css:19-29` (`font-display: block` on
  purpose), `:46,178`, `brand-slides.mjs:47`, `concepts/misc/020:66`; asserted
  by `kit/slides:1225`, `kit/logo:109,122`, `slide-test.mjs` (three URLs).
  Same files as the brand face, so no change.
- **`--sans`** `shell.css:361`, on `body` `:383`, `:2983`, `:4766`, the cards
  `:4983-5016`, `:5108`, slide body `slide.css:208,459`,
  `brand-slides.css:29`, `bay-view.mjs:395`, `llhls:52`,
  `videoradio/looks/compare.html:18,27`.

## 6. Risks, and where each one bites

1. **First paint swaps face.** With `font-display: swap` a page paints in the
   system face and changes when the file lands. MEASURED widths bound it:
   mono **0.35 per cent** (no horizontal reflow), sans **0.4 per cent** on a
   109 character sentence at 15 px (757.7 px Geist, 760.6 system), but Geist
   digits are wider (`0` 66.3 against 60.6 at 100 px), so a line can rewrap
   once on a cold load. Titles already do this today.
2. **Taller line boxes where line height is `normal`.** MEASURED ascent plus
   descent at 100 px: JetBrains 132 against system mono 117, Geist 130
   against system sans 118. The ten page rules in section 5 grow about 1.8 px
   a line at 12 px (INFERRED from the ratio). The concepts cards are where to
   look: their min-height went to 115 this morning for three line
   descriptions.
3. **JetBrains Mono's code ligatures.** INFERRED from the face's own
   documentation: `->`, `=>`, `!=`, `<=` join through contextual alternates
   (`calt`), on by default. Logs, `/fau/`'s Faust source, `code-box.mjs` and
   readouts would draw `->` as one arrow. One declaration turns it off and
   leaves Geist's ordinary ligatures alone: `font-variant-ligatures:
   no-contextual` on `:root`.
4. **Glyphs outside the Latin subset.** READ from @fontsource's range
   (`U+0000-00FF`, `U+2000-206F` and a few more): `◄ ► ■ ● → ← ≈ ∞ ≤ ≥`, the
   accidentals (section 3) and Estonian `Š š Ž ž` fall per glyph to the
   system face. The transport glyphs are SVG since today (BACKLOG,
   *transport buttons as proper icon buttons*). Š Ž occur in data
   (`reel/1965.json`, `resources/held-in-human.json`,
   `resources/mimproject-measured.json`, `floor/tiles.json`), so an Estonian
   name can show one letter in the system face. `latin-ext` would fix it at
   7,336 + 7,512 bytes for the mono and 7,828 + 7,996 for Geist (MEASURED by
   HEAD), fetched only when such a letter is laid out. Outside the set.
5. **Canvas text drawn once before the file lands** stays in the fallback
   face. Strips and scopes redraw every frame and heal; one shot pictures
   (the XR tablet texture, `panel.mjs` plates) may not. The advance matches
   to 0.35 per cent, so measured layouts hold; only the face differs.
   Step 7.
6. **Weight 500 on an iPhone.** The ink numbers are headless Chrome on this
   Mac. INFERRED: iOS Safari's `ui-monospace` is SF Mono with a real medium,
   so on a phone today's buttons may be a touch heavier than JetBrains 400.
7. **Checks that name faces:** `slide-test.mjs`, `kit/slides:1225`,
   `kit/logo:109-122` (with JetBrains first in `--mono` the β still falls to
   the system face, because the Brand family declares no Greek, so that
   assert keeps its meaning, INFERRED), every assert on `/kit/frontpage/`,
   and `concepts/radio/040:464`, whose key name regex already accepts both
   `♯` and `#` (READ). Request filters already allow
   `/shell/vendor/*.woff2` (READ `deck-checks.mjs:79`, `kit/slides:2073`).

## 7. What needs the owner's eye

1. **Keys read `F#3`.** The recommended answer to *"can we do without?"*,
   measured on the line; the notation shape is what is given up.
2. **The line under a page title.** The session's split puts lines in Geist;
   the owner's 2026-10-06 instruction (*"use brand font for page titles and
   subtitles everywhere"*, BACKLOG) put `.pos-what` in the brand mono. This
   plan leaves `.pos-what` and `.pos-tabs-about-t` on `--brand` until the
   owner says which wins.
3. **Buttons at JetBrains 400** (today's weight, 8 per cent darker) or a real
   500 through the variable file (24 per cent heavier). Look at `/kit/` at
   the desk and on the iPhone.
4. **JetBrains' arrow ligatures:** off recommended.
5. **The logo's β** (keep the 4,308 byte Greek subset, recommended) and
   **Gabarito on `/weight/`** (keep, recommended).
6. **The archived `/slides/` deck:** one face (this plan), or the whole deck
   moved to `archive/` with its seven faces as a record.

## 8. Steps, smallest first

Every step: agents do not commit; `node demo/check-html.mjs` on each page
touched; the per page assert COUNT compared with before; then
`cd workers/view && node build.mjs`, whose `checkVendorUrls()` refuses the
build if any quoted `/vendor/` URL still points at a deleted file (READ
`build.mjs:362`), which is the safety net for every deletion below. Close
every Chrome started.

**Step 0, preconditions.** The `/kit/frontpage/` agent has finished (its last
commit is `5dd66a09`, *kit: frontpage hero, titles and slide pairings of the
brand mono and Geist*), because steps 1 to 6 all edit that page; and the
owner has said Geist.

**Step 1. `.kit-n` stops spelling the system sans twice.** 0 bytes.
- `demo/shell/kit-page.css:28`: the stack becomes `var(--sans)`.
- `demo/kit/frontpage/index.html:199`: drop the `kit-prose` row of `IN_USE`.
- Verify `node demo/verify.mjs kit kit/frontpage`.

**Step 2. The five sans candidates go.** 181,476 bytes, 15 files.
- Delete `demo/shell/vendor/{manrope,ibm-plex-sans,schibsted-grotesk,onest,space-grotesk}-latin-{400,600}-normal.woff2`
  and `demo/shell/vendor/LICENSE-{manrope,ibm-plex-sans,schibsted-grotesk,onest,space-grotesk}`.
- `workers/view/build.mjs:308-320`: the list becomes `['geist']`, and the
  comment says Geist is the site's `--sans` from 2026-10-12.
- `demo/kit/frontpage/index.html`: delete `:22-31` except Geist's two rules,
  the five non-Geist `CANDIDATES` entries `:168-182`, and adjust the counts in
  the asserts at `:429` and `:603`.
- Verify `node demo/verify.mjs kit/frontpage`, then the build.

**Step 3. Bravura goes, the keys say `#`.** 4,508 bytes, 3 files.
- `demo/shell/keyboard.mjs:461`: `NOTE_NAMES` becomes
  `['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']`, and
  the comment at `:456-460` is rewritten in place: asked 2026-10-12 *"no
  bravura needed i hope. can we do without?"*; `#` in the mono face sits on
  the line by construction (MEASURED, ink 73.0 to 0.0 against the `F` at
  73.1 to 0); it matches `chords.mjs:182`; the 2026-09-23 choice of `♯` was
  for the notation shape and is reversed, not forgotten.
- `demo/shell/shell.css`: delete the block `:3901-3941` (comment and
  `@font-face`); `:1894` becomes `font-family: var(--mono);`; `:4480`
  `font: 500 9.5px/1 var(--mono);`; `:4593` `font: 500 11px/1 var(--mono);`;
  the note at `:4548-4550` (*"THE ACCIDENTALS FACE STAYS"*) is rewritten to
  say it left on 2026-10-12 and why.
- Delete `demo/shell/vendor/bravura-text-accidentals.woff2`,
  `demo/shell/vendor/LICENSE-bravura`, `demo/resources/subset-bravura.mjs`;
  `workers/view/build.mjs:277-294`, the block; the mention in
  `demo/resources/fetch-chord-corpora.mjs:11`.
- `demo/kit/frontpage/index.html:201-202`: the accidentals row, and the
  comment at `:17`.
- Verify `node demo/shell/chords-test.mjs`, `node demo/verify.mjs kit/input
  nola fau concepts/radio/040 concepts/synth/000` (keyboard pages, the radio
  key reader), and `node demo/shot.mjs nola 375 1280`: a sharp name on a
  black key and on a narrow white key reads whole.

**Step 4. The archive deck keeps one face.** 217,044 bytes, 21 files.
- Delete `demo/slides/vendor/` (14 woff2, 7 licences).
- `demo/slides/deck.css:8-41`: one comment and two rules, `'SL JetBrains
  Mono'` 400 and 600 at `/shell/vendor/jetbrains-mono-latin-{400,600}-normal.woff2`.
- `demo/slides/deck.mjs`: `FACES` (`:26-40`) holds JetBrains only; the face
  picker `:457-485` goes (a choice of one is not a choice) and `?face=` is
  ignored; the plex block `:896-905` goes; `:650` says the face loads from
  `/shell/vendor/`; the header `:5` stops saying seven. The loops over
  `FACES` at `:745-884` stay correct with one entry.
- `workers/view/build.mjs:385-397`: delete the block.
- `demo/kit/frontpage/index.html:35-46` and the rows built at `:179`.
- Verify `node demo/shell/slide-test.mjs` (it reads `deck.mjs` only for its
  document listener at `:216`), `node demo/verify.mjs slides kit/frontpage`.
- If the owner prefers the archive move (section 7, item 6), this becomes
  `git mv demo/slides archive/slides` with its build block, priced then.

**Step 5. `--sans` is Geist.** 0 new bytes in the tree.
- `demo/shell/shell.css`, beside the brand block at `:485`:
  ```css
  @font-face { font-family: 'Brand Geist'; font-weight: 400; font-style: normal; font-display: swap;
    src: url('/shell/vendor/geist-latin-400-normal.woff2') format('woff2'); }
  @font-face { font-family: 'Brand Geist'; font-weight: 600; font-style: normal; font-display: swap;
    src: url('/shell/vendor/geist-latin-600-normal.woff2') format('woff2'); }
  ```
- `shell.css:361`: `--sans: 'Brand Geist', -apple-system, BlinkMacSystemFont,
  "SF Pro Text", Segoe UI, Roboto, sans-serif;`
- Verify `node demo/verify.mjs kit kit/slides concepts llhls`, and
  `node demo/shot.mjs concepts 375 1280` plus the front page at both widths:
  card heights against the 115 px min-height.

**Step 6. `--mono` is JetBrains Mono.** 0 new bytes.
- `shell.css:360`: `--mono: 'Brand JetBrains Mono', ui-monospace,
  SFMono-Regular, Menlo, monospace;`
- `shell.css:489`: `--brand: var(--mono);`, kept as an alias so its users do
  not move.
- `shell.css` `:root`: `font-variant-ligatures: no-contextual;` unless the
  owner wants the arrows.
- `/kit/frontpage/`: the `mono` and `sans` rows of `IN_USE` (`:195-198`)
  describe the vendored faces; the sampler shows the final set only
  (JetBrains Mono, Geist, and Gabarito labelled as `/weight/`'s if kept), and
  the candidate prose becomes one line recording the choice.
- Verify, targeted: `node demo/verify.mjs kit kit/slides kit/logo
  kit/frontpage tom fau concepts archive parts` (badge width spread, picker
  cells, tables, the logo's β, the ten `normal` line heights),
  `node demo/shell/slide-test.mjs`, `node demo/verify-safari.mjs kit` for the
  second engine, and `node demo/shot.mjs kit 375 1280`, `fau 375 1280`,
  `tom 375 1280`: buttons, readout keys, the log, `/fau/`'s source box,
  table columns.

**Step 7, optional. Typed-in canvas stacks follow the token.** 0 bytes.
`panel.mjs:60,63,170,181`, `held/index.html:542,598,835`,
`partitur/wall.mjs:70,79`, `sync/follow.mjs:221` read `--mono` through the
`tok()` the other canvases use, and a one shot picture redraws on
`document.fonts.ready` as `symbol.mjs` already does. `pattern.mjs` is not
touched. Verify `node demo/verify.mjs held partitur sync evo twelve circuit
tom`.

**Then:** the BACKLOG line struck with these numbers; the session commits
with path-limited `git commit -- <paths>`; deploy and quote the build stamp.
What to look at: `https://positron.studio/kit/` (buttons, readouts and logs
in JetBrains Mono, the notes in Geist), `https://positron.studio/`
(cards in Geist), `https://positron.studio/nola/` (keys read `C#4`, on the
line), `https://positron.studio/kit/frontpage/` (two faces listed),
`https://positron.studio/slides/` (one face, no picker).

## 9. What this could not settle

- How 500 looks on an iPhone today (risk 6). Needs the phone.
- Whether `#` reads well enough on a black key at 375 px. Measured as a
  width ratio, not yet looked at; step 3's screenshot answers it.
- Windows and Android fallbacks for `♯` are INFERRED, not seen, and stop
  mattering if step 3 lands.
- The variable files were measured by HEAD and one ink run, not rendered
  against the statics pixel for pixel.
- The cold-load reflow of Geist body text was not measured on a throttled
  connection; its size is bounded by the widths in risk 1.
