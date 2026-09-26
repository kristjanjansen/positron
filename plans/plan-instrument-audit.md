# plan-instrument-audit: nine instruments against `positron-compose`, and the one to convert first

**2026-09-26. An assessment, not a change.** The ask, verbatim: *"now audit all
instruments to the new rules we make. pick one. do not do anything just assess
and propose."*

**What was read:** `.claude/skills/positron-compose/SKILL.md` in full,
`positron-ui` in the sections it points at, `demo/shell/glue.mjs`,
`demo/shell/instrument-panel.mjs`, the `:root` tokens and every read of
`--edge`, `--r`, `--inset`, `--rows-pad` and `--rows-gap` in
`demo/shell/shell.css`, the `<style>` block and the panel-building code of all
nine pages, and the five phone shots in `tmp/shots/`.
**What was not run:** no browser, no `verify.mjs`, no `shot.mjs`. Every number
below is read off a file or off a picture taken this morning, and every
sentence that would need a browser to become a fact says so.

⚠️ **THE SHOTS ARE FIVE OF THE NINE, NOT SIX.** `tmp/shots/` holds `circuit`,
`evo`, `knobs`, `nola` and `twelve` at 390, plus the kit's instrument panel at
390 and 1280, plus `stage`, which is not one of the nine. `/tom/`, `/shape/`,
`/muta/` and `/fau/` have never been photographed on a phone. And 390 is the
width the shots were taken at; the skill says 375 since the same day
(*"use iphone mini size for mob testing"*), so what a shot shows is 15 px more
generous than what the rule asks for.

## How things were counted

The skill's one test: *"if the number says how two things relate, it is a bug
waiting... If the number says how big a thing is for a person, type it."* So:

- **A typed relationship number** is a literal `gap`, `margin`, `padding`,
  `top`, `left`, offset, or a `var()` fallback that repeats a component's own
  figure. A key height, a touch floor, a font size, a colour, a duration and a
  proportion (`62%`) are body numbers and are not counted.
- **A page-local repair to a shared component** is a rule in a page's
  `<style>` whose selector reaches a kit class or element (`.kbd`, `.keys`,
  `.k`, `.pos-pad*`, `.pos-knob*`, `.pos-fdr*`, `.pos-field*`, `.panel-*`,
  `textarea`) to change how the component draws.
- **Own size or stretched** is what the page's outermost surface does:
  `fit-content` against the page, or the page's width.
- **Rule lines** are the page's `<style>` with comments stripped
  (`scratchpad/rules.mjs`, not committed).

| page | rule lines | typed relationship numbers | page-local repairs | outer surface | shot at 390 |
| --- | --- | --- | --- | --- | --- |
| `/nola/` | 68 | 11 | 2 | own size | yes |
| `/knobs/` | 0 | 0 | 0 | stretched | yes |
| `/evo/` | 56 | 17 | 12 | stretched | yes |
| `/twelve/` | 40 | 8 (4 are copies of `--edge`/`--r`) | 4 | own size | yes |
| `/circuit/` | 52 | 13 occurrences, 8 distinct | 7 | page width, own size when wider | yes |
| `/tom/` | 10 | 1 (a fallback typed twice) | 2 | stretched | no |
| `/shape/` | 3 | 1 | 1 | stretched | no |
| `/muta/` | 30 | 3 | 4 | stretched, and asserted so | no |
| `/fau/` | 7 | 2 | 6 | stretched | no |

Assert counts today, `grep -c 'd.assert('`: nola 98, evo 56, muta 47, shape
42, fau 41, knobs 37, tom 37, twelve 30, circuit 26.

## Part 1: the nine, one paragraph each

**`/nola/`** breaks §1 most visibly: air typed onto elements rather than onto
the relationship, `.nola-home-h { margin-bottom: 8px }` (`demo/nola/index.html:4788`),
`.nola-rec { gap: 10px; margin-top: 10px }` (:4809), `.nola-pad { gap: 10px;
margin-top: -4px }` (:4959, and the `-4` is a nudge with no source beside it),
and `gap: 12px` typed on two unrelated containers (:4969, :5023). It breaks §9
twice, `.nola-chord-k .kbd { margin: 0 }` and `.nola-chord-k .keys { margin: 0 }`
(:4994-4995), which are a page taking a keyboard's own bottom margin off; the
chart keys at `44px`/`27px` (:4992-4993) are body numbers with the proportion
argued beside them and stay. The instrument itself is right by §3: the roll
and the keys are one `.kbd` glue at `fit-content`. **The shot** shows the
backlog's defect A exactly: `N D − + 0` on one line and `Loop Sustain Notes
off` right-aligned under it, which is `.kbd-foot`'s `justify-content:
space-between` (`shell.css:3788`) with no phone form (one rule in the file,
no media query names it), so it is `keyboard.mjs`'s and reaches ten pages. The
keys cut at C4 with no closure (§4), and under them an empty eight-column roll
of about 250 px and an empty `A WAY HOME` table paint edges around nothing,
which is §7 at phone scale, in a state a visitor lands in. The panel header
names this page's footer as keyboard-owned; converting it would move the eight
asserts about *"a footer inside the keyboard's own box"* for no gain the shot
shows.

**`/knobs/`** has no page CSS at all, zero typed numbers and zero repairs, and
is still the page whose shot shows the most: `RESONA…` (defect C, `knob.mjs`'s
label at `--ctl-w`), `CC OUT SOUND OUT ROUND TRIP` then `BUFFER` alone (defect
D, the readout's `ceil(n / 6)`), keys cut at G3 with no closure (E), the case's
top inset holding one word `knobs` in a 31 px band above the knobs, and a foot
whose `enable midi` button is stretched to the full width by `shell.css:6831-6832`
(`.panel-head-on .pos-pres, .panel-head-mid > * { width: 100% }`), which is §6
answered by stretching rather than by going linear at the control's own size
(§3). The case is stretched: the comment at `demo/knobs/index.html:~885-900`
records `full: true` measured reaching nothing, *"the keyboard 992.0 px, the
flow 992.0 px and the case 686.0 px"*. Everything wrong here lives in a shared
component, so a conversion of this page removes nothing and fixes nothing in
its shot. The panel header names the 992 px flow as its reason to stay.

**`/evo/`** carries the most typed relationship numbers of the nine, 17, and
the prohibited form twice: `.evo-keypad { background: none; border: 0;
border-radius: 0; padding: 0 }` (`demo/evo/index.html:147-148`) and `.evo-keys
.kbd { --kbd-pad: 0px; background: none; border: 0; border-radius: 0 }` (:396),
which is §5's *"a `.pos-glue > X` patch that strips a border may not be
written"* wearing a page class; the `--kbd-pad: 0px` half is the right form and
the other three declarations are what `--edge: 0; --r: 0` inherit. The function
row draws five labels over pairs of buttons with `--fn-top: 26px; --fn-bot:
24px; width: 82px; margin-left: -41px` (:225-230), which `panel-layout.mjs`'s
own header names as one of *"three answers to ONE question"* that nobody has
measured into a component (§2). Two `var()` fallbacks repeat component numbers,
`--fdr-lane-h, 120px` (:172) and `--k-min, 49px` (:409), and `calc(var(--ctl-head)
+ 4px)` (:173) is a nudge on a token. Twelve page rules reach into the keyboard,
the pad and the fader. **The shot** shows the fixed column at about 210 px, the
strip cut at D♯3 with no closure (E), and a bordered void of about 200 px under
the instrument (B, undiagnosed in `BACKLOG.md`). The keys grow to the case by
`panel.grow`, which the header names, and that is a real reason: this page is a
replica with a column and a strip, not a stack of rows.

**`/twelve/`** is a horizontal glue written by hand. `.strip-one { padding:
14px; border: 1px solid var(--line); border-radius: 4px }` (`demo/twelve/index.html:214`)
declares the edge and the corner literally, so this surface does not read
`--edge` or `--r`, which §5 now calls *"not a surface of this kit"*; `.rack-row
> .strip-one + .strip-one { border-left: 0 }` (:191) is Bootstrap's
de-doubling typed out, and `:first-child { border-radius: 4px 0 0 4px }` (:192)
with `.rack-lane { border-radius: 0 4px 4px 0 }` (:130) are the corners a
container should hand down with `border-radius: inherit`. `margin-top: auto`
on `.pos-crow` (:162) and `.strip-master` (:154) and their phone undoing
(:332-333) are §2 corrections on children, and the whole phone block is a
viewport query (`@media (max-width: 560px)`, :273) for a component's own box
(§6). The `14` is stated three times as a fact about a Model 12 (:119-131) and
the comments say so, so it is a body number typed three times rather than a
relationship. Own size: the strips are `inline-flex` at their width and the
uncased panel scrolls them. **The shot** shows 3 of 8 strips beside the fixed
lane (E) and the same 200 px void (B). The header names the uncased columns;
`createGlueRows` glues vertically and has no horizontal form, so there is
nothing here to convert to yet.

**`/circuit/`** is the page the skill holds up (*"draws zero seams"*) and the
one with the most numbers typed twice: `--panel-gap: 22px; gap: 22px` in one
rule (`demo/circuit/index.html:116`), `padding: 20px 20px 34px` (:132) on a
`.panel-case` that already pads `0 var(--panel-pad)` at 20, `gap: 18px` on two
containers (:229, :254), and `12px` three times in `.circ-pair-lab` (:341-342),
which is the `--sld-col` defect in miniature (§1). The 34 is kept with its
reason and the taxonomy already agreed it could be `--ctl-foot`. It hides the
pad's reserved head slot in three places, `.pos-pad-top { display: none }`
(:253, :269, :358), which is the 75 px drift story told from the other side:
the page pays per row for a slot the component reserves on purpose (§2, §9).
`width: 100%; min-width: max-content` (:115) makes it page-wide on a desk and
its own size when wider. **The shot** cuts at knob 5 with the `CIRCUIT` plate
off-screen (E) over a 200 px void (B). The scroller sits outside the case by
design and the header names it; this page's lattice is not rows, and the fix
its shot asks for is closure, which is shared.

**`/tom/`** has ten rule lines and two of them are the repairs the skill was
written about. `.tom > .panel-plate { position: absolute; top:
var(--panel-pad, 20px); right: var(--panel-pad, 20px); padding: 0 }`
(`demo/tom/index.html:109-112`) floats the plate over the case, and `/muta/`
carries the identical rule (`demo/muta/index.html:126-142`) with the identical
comment (*"`/muta/` made the same change for the same reason"*), which by
`positron-ui`'s own test is a plate placement nobody has noticed is an option
(§9); the `20px` fallback is `--panel-pad` typed twice. `.tom-fixed {
border-right: 0; padding-right: 0 }` (:85) is a page beating a specificity tie
between `.pos-pg-labs` and `.panel-fixed-l`, written *"under protest"* with the
component fix named in the comment (§8). Stretched: a cased panel at page
width. No shot exists; the strip scrolls by the comment at :630-633. Nothing
here is row-shaped.

**`/shape/`** is the cleanest of the nine: three rules, one typed gap
(`.shape-bar { gap: 10px }`, `demo/shape/index.html:65`) and one reach into a
component, `.shape-rack .sld-head { box-sizing: content-box; width: var(--lab,
auto) }` (:118), with eighteen lines arguing why the head and not the grid.
Stretched, and rightly: sliders are lanes and a lane fills its row. No shot.
Nothing to convert.

**`/muta/`** is two instruments on one page and the runner-up below. It draws a
seam itself, `.plai-knobs > :first-child { border-right: 1px solid var(--line);
padding-right: var(--panel-gap); margin-right: var(--panel-gap) }`
(`demo/muta/index.html:161-165`), a literal `1px` where `--edge` is the token
and a vertical seam inside a row, which is §5's horizontal case (*"drop one
side"*); the owner asked for the divider in as many words, so the ladder's
first rung was tried and refused. `--muta-knob-air: 17px` (:94) is a
relationship number with a source, *"half the difference between the pitch and
the dial"*, whose comment explains why it cannot be a `calc`: the pitch is
written onto a child and *"a custom property does not travel upward"*, which is
what subgrid is for (§2). The plate is floated (:126-142, Bucket 11's incident,
*"it took three rounds"*), the knob arc colour is set per instance by class
(:110-119) rather than by a custom property (§8), and the `Test tone` button is
placed by column inside `.panel-head`'s grid with three placements across two
viewport queries (:228-250, §6). Stretched, and asserted so at :2613. No shot;
the comment at :179-193 hand-measures 390: *"the top row comes to 342 px inside
a 316 px scroller"*, which is why the pitch drops to 8 below 560.

**`/fau/`** has seven rules and six of them are repairs to `field.mjs` or to
`panel-layout.mjs`. `.fau-src textarea { border-radius: 0; border-width: 0 }`
(`demo/fau/index.html:1922`) is the exact prohibited form, and its cause is the
exact diagnosis the rule gives: `.pos-field input, .pos-field textarea` reads
`border: 1px solid var(--line2); border-radius: 4px` literally (`shell.css:2748`),
so the field is not a surface of this kit and a glue cannot flatten it by
inheritance. `.pos-field.fau-src textarea { padding: 14px 14px 14px 16px }`
(:1935) is double-classed to tie the component's weight (§8, argued as a tie
and not an escalation, still a page fighting its own sheet) and carries the
page's two typed numbers, of which the `16` has no recorded source. `.fau-src
textarea { display: block }` (:1952) is the replaced-element strip that
`.pos-rows-r` now cures by being flex, and `shell.css:989-991` cites this page's
own measurement for it (*"wrapper 557.5, textarea 556.0"*), so the component
carries fau's hardest fix while fau still carries its own copy (§9). `.fau-src
.pos-field-l { display: none }` (:1879) hides a label the page built, and
`.fau-panel .panel-strip > .pos-field` (:1848) sizes a child of a strip the
comment admits is empty. The keyboard sits outside the instrument in
`.fau-keys { min-width: 0; overflow-x: auto }` (:1957). Stretched. No shot.

## Shared findings, which no page conversion fixes and which the shots are mostly about

- **Defect A** (`/nola/`, and `/fau/` the moment its keys join a surface):
  `.kbd-foot` is `justify-content: space-between` (`shell.css:3787-3794`) and
  has no phone form. The linear rule committed today (`4d978e6`) exists for
  `.pos-rows-r[data-align="between"]` and not for the keyboard's foot.
- **Defect B** (`/evo/`, `/twelve/`, `/circuit/`): undiagnosed in `BACKLOG.md`
  and not diagnosable from a shot; the skill says print the rect pair.
- **Defects C, D, E** are `knob.mjs`, the readout's cap rule and the absence
  of closure on every scroller. `/knobs/` shows all three with no page CSS.
- **The header's phone rule stretches** the presence button and the patch
  control to `width: 100%` (`shell.css:6831-6832`); §6 says linear, §3 says own
  size.
- **The field does not read the three tokens** (`shell.css:2746-2749`, `:2772`).
  This is the one that decides the pick below. And it is not alone: `grep`
  finds ten literal `1px solid var(--line2)` declarations left in the file
  (`:561, :878, :1683, :2748, :2820, :2859, :3447, :4587, :4609, :5939`), so
  the `--line2` family was outside today's token refactor. Some of those are
  controls, which the skill exempts; the field's is the one a glue meets.
  ⚠️ And the kit's `isControl` list (`demo/kit/index.html:5444`) counts
  `textarea` as a control whose border is its shape, while fau's record says
  that border doubled the seam and had to go. The field's rule and the kit's
  list should say one thing, and today they say two.
- **Two `.pos-glue > X` patches remain by name with typed insets**:
  `.pos-glue > .pos-scope { padding: 10px 12px }` (`shell.css:2977`) and
  `.pos-glue > .pos-ngrid { padding: 10px 12px }` (`:3000`), against a row inset
  of 16/20. Two insets for one idea, and both say *"nothing is patched by name"*
  is not yet true.
- **The floated plate** is written on two pages (`tom:109`, `muta:126`) with
  the same comment. That is a placement option for `createNameplate`, or a
  panel option, and not a page rule.

## Part 2: the pick is `/fau/`

**Why fau.** By the skill's own terms: §9 says *"if the defect is in the
component, the fix is in the component"*, and six of fau's seven rules are
that defect, the highest proportion on any page. §5 says a border stripped by
name means *"the component is not reading `--edge`, and that is what to fix"*,
and `shell.css:2748` is that component. The panel's header says the picture
row exists because *"`/muta/` and `/fau/` both had to pass theirs as a glue
part OUTSIDE the case to get edge to edge. That is what a picture row gives by
construction."* And `.pos-rows-r` is flex because of a measurement taken on
this page. So every primitive fau needs was built with fau in view, and fau is
the page that has not been moved onto them. On risk: **41 asserts and not one
of them reads a rect** (`grep` for `Rect`, `getComputedStyle`, `offsetTop`:
nothing), so no assert moves by label; three drive `inst.online` (:1476-1482,
:1766-1773, :1819) and need one identifier renamed.

**Why not `/muta/`, the runner-up.** It would remove more lines (about 12 of
30) but it is two instruments, at least seven of its 47 asserts measure
geometry (*"two by two"*, *"divided from the added ones by a drawn line"*,
*"a square lattice"*, *"the header holds its status at one end"*, *"the test
tone button sits on PLAITS, between"*, *"the case starts and ends where the
rest of the page does"*, *"insets the rotaries equally"*), its 2 by 2 | 3 by 2
divider is a horizontal seam inside a row for which `createGlueRows` has no
primitive, and its `Test tone` button lives in the header's grid by column. It
is the second conversion, once fau has settled the foot row for both: fau,
muta (twice), knobs and shape all build `header: { at: 'foot', plate: false,
online, patch }`, the same foot.

**Why not `/knobs/` or `/nola/`.** Knobs shows the most in its shot and has
nothing to remove; every defect in it is shared. Nola is 98 asserts around a
footer the header says is the keyboard's, and its shot's defect is
`.kbd-foot`'s, which the conversion would not touch.

### Every page-local rule and what it becomes

| rule | line | becomes |
| --- | --- | --- |
| `.fau-panel .panel-strip > .pos-field { flex: 1 1 100%; min-width: 0 }` | 1848 | deleted. No strip, no case. The viz row's `:only-child { flex: 1 1 auto; min-width: 0 }` (`shell.css:1038`) is the same declaration, owned by the row |
| `.fau-src { gap: 0 }` | 1878 | deleted. With `label: ''` no span is built (`field.mjs:73`, `if (label)`), so there is no gap to zero; the `aria-label` at :860 stays |
| `.fau-src .pos-field-l { display: none }` | 1879 | deleted, same reason |
| `.fau-src textarea { border-radius: 0; border-width: 0; resize: vertical }` | 1922 | deleted. Border and radius go flat by inheritance once the field reads `--edge`/`--r` (shared change 1); `resize: vertical` is already `.pos-field.tall textarea`'s (`shell.css:2773`) |
| `.pos-field.fau-src textarea { padding: 14px 14px 14px 16px }` | 1935 | a token. The well's inset, published by the field as `--field-pad` the way `.kbd` publishes `--kbd-pad`, and set to `var(--rows-gap) var(--rows-pad)` for the viz row so the first glyph of code sits on the inset every other row keeps. See the unsettled question below |
| `.fau-src textarea { display: block }` | 1952 | deleted. The row is flex |
| `.fau-keys { min-width: 0; overflow-x: auto }` | 1957 | deleted. The keys row: `.keys` scrolls itself (`shell.css:1679`), `.kbd` is `max-width: 100%`, the row is `min-width: 0` |
| `keysHost.style.setProperty('--k-min', '44px')` | 882 | kept. A finger, set on the keyboard's host as the component asks |

Seven of seven CSS rules leave the page. One JavaScript number stays with its
reason.

### `createInstrumentPanel`, and why not the other two

**It becomes `createInstrumentPanel({ viz: source, keys: keys.el, plate:
{ name: 'FAU', patch: <picker>, status: <power> } })`**, with no control rows.
Not `createGlueRows` directly, because the order is the sketch's and
`p.shape()` gives the page a one-line assert (`['viz', 'keys', 'plate']`) that
the kit already grades on four specimens; and because if fau ever grows a row
of knobs, `addRow` lands it above the keys without the page knowing where that
is. Not `createPanelLayout`, because fau has no fixed column, no scroller and
nothing in its case: the case today holds one word, and the comment at
:1881-1901 records it measured as *"a 71 px band holding one word, with an empty
40 px strip inside it"*. The header's five named breakages (evo's grower, knobs'
992 px flow, twelve's uncased columns, circuit's outside scroller, nola's
keyboard-owned footer) name none of fau's parts.

**Two shared changes come first, done once, by one agent, before the page.**

1. **The field reads the three tokens.** `shell.css:2748` becomes
   `border: var(--edge); border-color: var(--line2); border-radius: var(--r)`
   and the padding at `:2749` and `:2773` reads a published `--field-pad`.
   This also settles, for the field, whether a text box is a control with its
   own edge or a surface; the kit's `isControl` list at
   `demo/kit/index.html:5444` then has to agree with it.
   Same computed values everywhere outside a glue (1 px, `--line2`, 4 px); inside
   a row the border and corner go by inheritance, which is what the keyboard,
   the synth view and the display already do. Blast radius, counted: `crate`,
   `fau`, `items`, `kit`, `nola`, `stage` build a field, and `feedback.mjs`
   builds a four-row one beside every demo title. The procedure is the skill's:
   assert counts on those pages before and after, and one computed border read
   per page.
2. **The plate row takes a control at each end.** Today the plate is text and
   `patch()` rewrites text. The sketch says `name patch` and the owner's four
   foot-bar pages put a switch and a picker there. The smallest form: `patch`
   may be an element as well as a string, and `status` is an optional control
   after the name; `patch(text)` throws when the patch end is an element. One
   kit specimen and one kit assert with it, *"the foot holds the switch at the
   start and the picker at the end"*. ⚠️ Where `FAU` goes is a decision, not a
   fact: `instrument.mjs` argued on 2026-09-22 that *"a nameplate at the BOTTOM
   of a case names it after a reader has already read it"* and kept it in the
   top inset; the sketch of 2026-09-26 puts the name in the foot. The later
   instruction wins here, and it is written down as overruling the earlier one.

### What its phone shot shows now, and what the rules say at 375

No shot of `/fau/` exists. The nearest evidence is `tmp/shots/kit-390-instrument-panel.png`,
the sketch specimen, which is the same three rows fau would have (a picture, a
keyboard, a foot): the panel takes the phone's width, the picture runs edge to
edge, the keys cut at A3 with no closure (E), the keyboard's own foot wraps
into `N D − + 0` and a right-aligned `Notes off` (A), and the plate row sits on
one line. So fau at 375 would show A and E, both shared, and neither would be
the page's. The rules say: the foot row goes linear below `--row-min` (the
committed `4d978e6` rule, `shell.css:1013-1015`), the keys scroll inside their
row and the document must not widen (`shot.mjs` prints sideways overflow), the
code wraps because `.pos-field.tall.code textarea` is `pre-wrap` and the
stylesheet says that was *"PHOTOGRAPHED"* at 390 for this page, and defect B
does not apply because fau's readout has four cells with values.

### The asserts

41 today. **0 move by label**: none measures geometry. **3 change one
identifier**: `inst.online.el.click()` and `inst.online.state()` at :1476-1482,
:1766-1773 and :1819, because the power switch is built by
`createPresenceButton` (`presence.mjs:631`) directly rather than reached through
`createInstrument`; the labels (*"the switch is the one press that fetches the
compiler..."*, *"switching it off takes the instrument off the audio thread..."*,
and the third) do not change. **4 to add**, because the page grades none of
its own geometry today: *the panel is a picture, keys and a foot, in that
order* (`p.shape()`); *the text runs edge to edge of the surface* (a rect pair,
textarea against the surface, one border apart); *the foot holds the power
switch at the start and the patch selector at the end* (muta's :2560 wording,
so the two pages assert one claim in one sentence); *the first line of code
sits on the inset the keys and the foot keep* (ink: the textarea's left padding
plus border against `--rows-pad`). 45 after.

### Estimate

Three sessions: one for shared change 1 with its six-page re-run, one for
shared change 2 with its kit specimen and assert, one for the page. **The thing
most likely to take longer is the textarea's inset inside a padless row**,
because two of the skill's rules meet there and disagree. §5 says a container
that strips a border strips the padding too, *"padding on a box that no longer
has a border is a margin the component invented"*, and the kit's own assert
(`demo/kit/index.html:5453-5456`) names any row child with padding and no border
as an offender, control or not. Fau's record says the opposite for a box that
paints its own well: *"AIR INSIDE A BOX BELONGS TO THE BOX"* (:1909), measured
after shipping it the other way and being shown *"a mess"*. A textarea in a
`pad: false` row with `--bg` behind it is a well, not a margin in disguise, and
its text needs an inset that the row's `--inset: 0px` must not zero. Today the
kit assert would pass fau's panel only because the textarea sits one level down
inside `label.pos-field` and the assert reads direct children, which is the
wrong reason to pass. Whether the answer is a `--field-pad` the row leaves
alone, or a padded row with a transparent well, is a look and not a derivation.

### What could not be settled without running it

1. **The surface's width.** By §3 the panel is as wide as the keyboard:
   15 white keys at `--k-min` 44 plus 14 gaps at the default `--k-gap` 3 is
   about 702 px, so the code box narrows from the page's width to that. `full:
   true` exists on the component for a strip across a page. Which one the code
   box wants is a look at 1280.
2. **The foot's depth.** A plate row insets `var(--rows-gap) var(--rows-pad)`,
   16/20, where the bar it replaces is `padding: 8px` (`shell.css:6786`), and
   `positron-ui` records 20 making *"a header two and a half times the thing it
   is glued to"*. The kit's specimens have this foot and it was approved as a
   sketch, not measured against a switch and a picker.
3. **Whether the picker fits beside the switch at 375.** The picker measured
   315.5 px wide on `/muta/`; a 375 px foot has 335 px inside the inset. The
   linear rule handles the overflow, but whether it triggers is unmeasured.
4. **Shared change 1 on the feedback box.** Same computed values expected on
   every page; one `getComputedStyle` per page is the check, not the diff.
5. **The kit assert after shared change 2**, if the power switch or the picker
   is a direct child of the plate row: both match `isControl`, so their borders
   are exempt and their padding sits inside a border, and the assert should
   stay green. Should, not does.

## File and line index

`demo/fau/index.html:834-866, 878-882, 917-935, 1004-1011, 1124-1170,
1187-1224, 1848-1957`; `demo/shell/shell.css:47-215 (tokens), 975-1039
(rows), 1674-1682 (keys), 2740-2797 (field), 2976-2977 and 3000 (glue
patches), 3648-3706 (kbd), 3787-3794 (kbd-foot), 6181-6232 (panel), 6785-6832
(header)`; `demo/shell/glue.mjs`; `demo/shell/instrument-panel.mjs`;
`demo/shell/instrument.mjs:239-372`; `demo/shell/field.mjs:69-74`;
`demo/kit/index.html:1220-1290, 5418-5463`; `BACKLOG.md:160-210`;
`research/ui-corrections-taxonomy-2026-09-26.md`, buckets 1, 2, 4, 9, 11.
