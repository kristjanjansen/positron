# plan-panel-component: the hardware panel layout, extracted into the kit

> 🔴 **NOTHING IN THIS FILE IS BUILT.** No page was changed, no module was
> added, `demo/shell/shell.css` was not touched, `/kit/` was not touched,
> nothing was committed and nothing was deployed. The only file written is this
> one. It exists so that the extraction is a half hour of mechanical work rather
> than a day of rediscovery.
>
> ✅ **EVERYTHING NUMERIC BELOW WAS MEASURED TODAY, 2026-09-21**, in headless
> Chrome against this checkout, with throwaway probes in the session scratchpad.
> Every rect is a `getBoundingClientRect` and every "matches nothing" is a
> `querySelectorAll().length`. Where a claim is a READING of a declaration
> rather than a measurement, it says so in those words.
>
> 🔴 **AND THE GROUND MOVED WHILE THIS WAS BEING WRITTEN.** Two other agents are
> writing in this checkout. `demo/evo/index.html` grew from 1594 to 1690 lines
> mid-survey and the block this plan is about gained two tokens
> (`--pan-pad`, `--pan-gap`) and moved its vertical inset off the card onto its
> two children; `demo/shell/shell.css` gained `--ctl-off`; `demo/kit/index.html`
> and `demo/shell/segment.mjs` are also dirty. **So the executing agent re-reads
> `/evo/`'s PART ONE block before copying anything out of it**, and treats the
> declarations quoted here as evidence of shape rather than as text to paste.
> The structural measurements are unaffected by that edit and were re-taken
> after it.

---

## 0. The ask, verbatim

> *"generalize the evoltion layout to reusable components / use from others.
> same patters"*, then *"do it and add to kit"*.

---

## 1. How many copies there actually are, and it is three live ones

🔴 **THREE PAGES, NOT FOUR, AND THE FOURTH IS `/evo/` COUNTED TWICE.**
`/evo/`'s own banner says *"THIS IS THE FOURTH COPY OF THAT IDEA"* and then
names three: `/twelve/`, `/circuit/` and *"this page called them `.evo-wrap` and
`.evo-strip`"*, which is the predecessor of the rebuild that is now in the file.
So the live callers are **`/twelve/`, `/circuit/` and `/evo/`**, and the fourth
copy is the one the rebuild replaced.

⚠️ **`/keys/` IS NOT A FIFTH CASE BECAUSE IT NO LONGER EXISTS.** MEASURED:
there is no `demo/keys/` directory. `demo/manifest.mjs` records the retirement,
2026-09-17, *"keys seems to be dead. bring keyboard to knobs and archive keys"*;
the page is at `archive/keys/`.

⚠️ **AND `/knobs/` IS NOT A SIXTH CASE.** MEASURED: `demo/knobs/index.html` has
**no `<style>` block at all** and builds no layout container of its own. It is a
keyboard plus the shell's own control row, which is the right shape for what it
is. Nothing to convert.

⚠️ **NO OTHER PAGE IS A CANDIDATE EITHER.** Of the eight pages carrying an
`overflow-x: auto` (`bay`, `circuit`, `evo`, `mirror`, `model`, `notes`,
`score`, `wish`), the five that are not panel replicas are a patch bay listing,
a kaleidoscope, two timeline pages and an AI patch page. The `hardware` group in
`demo/manifest.mjs` holds seven rows and the four that are not panels
(`wish`, `bay`, `shape`, `dump`) draw no instrument face.

---

## 2. What the three pages actually do, measured

All three at 1280 px, `?selfcheck=1`, `.pos-body` 688 px wide.

### 2.1 `/evo/` (Evolution MK-425C): a cased panel, fixed column on the LEFT, scroll INSIDE the card

| element | x | y | w | h | scrollW | clientW |
|---|---|---|---|---|---|---|
| `.pan` | 296 | 318.3 | 688 | 503.03 | 686 | 686 |
| `.pan-wrap` | 317 | 319.3 | 646 | 501.03 | 646 | 646 |
| `.pan-fixed` | 317 | 319.3 | 193 | 501.03 | 192 | 192 |
| `.pan-strip` | 526 | 319.3 | 437 | 501.03 | **1018** | **437** |
| `.pan-flow` | 526 | 339.3 | 1018.47 | 461.03 | 1018 | 1018 |
| `.pan-row` | 526 | 339.3 | 1018.47 | 111 | | |
| `.evo-keys` | 526 | 466.3 | 1018.47 | **334.03** | | |

- The card fills the page column. The **strip** scrolls: 1018 px of content in a
  437 px window. `--pan-pad: 20px`, `--pan-gap: 16px`, `.pan-flow` row gap 16.
- The **fixed column drives the depth**. Its four groups add to exactly the
  flow's height: display 54 + 12 + keypad 215 + 12 + wheels 168.03 = **461.03**,
  and the strip's own content is 111 + 16 + 334.03 = **461.03**.
- `align-items: stretch` on `.pan-wrap`, so both children measure 501.03.
- Border on the fixed column's **right** edge, 1 px, the edge of the scroll
  region.
- Nameplate **inside the flow**, `.pan-plate` at x 996, 73.5 by 33 px, two
  stacked lines.

### 2.2 `/twelve/` (TASCAM Model 12): no case, fixed column on the RIGHT, nameplate above everything

| element | x | y | w | h | scrollW | clientW |
|---|---|---|---|---|---|---|
| `.rack-unit` | 296 | 219.3 | 688 | 490.69 | 688 | 688 |
| `.rack-brands` | 296 | 219.3 | 688 | 11 | | |
| `.rack-wrap` | 296 | 240.3 | 688 | 469.69 | | |
| `.rack-row` | 296 | 240.3 | 450 | 465.69 | **1033** | **450** |
| `.rack-lane` | 746 | 240.3 | 238 | 465.69 | 236 | 236 |
| `.strip-one` (first of 9) | 296 | 240.3 | 130 | 465.69 | | |

- **There is no outer card.** Each of the eight channel strips and the master
  lane paints its own `--card` and its own 1 px border, glued at the seams, only
  the outer corners rounded. `.rack-unit` has no background and no border.
- The **scroller is on the left** and the **fixed lane on the right**, the mirror
  of `/evo/`. The border sits on the lane's **left** edge, same reason in mirror.
- The **nameplate sits above the boxes**, `space-between` across the whole unit,
  10 px above the wrap, which is a quarter of `--pos-gap` and is asserted as
  such.
- Scrollbar room is reserved as `padding-bottom: 4px` on the **wrap**, not on the
  scroller, so both children keep one height. That repair is recorded in the
  page: *"a reservation that only one of two equal things makes is a reservation
  that breaks them."*

### 2.3 `/circuit/` (Novation Circuit): a cased panel with NO fixed column, and the WHOLE CARD scrolls

| element | width 1280 | width 390 |
|---|---|---|
| `.circ-scroll` | x 296, w 688, client 688, scroll 688 | x 16, w 358, client **358**, scroll **644** |
| `.circ` (the card) | x 296, w 688 | x 16, **w 644** |
| `.circ-brands` | x 317, w 646, h 11 | x 37, w 602 |
| `.circ-panel` | x 317, w 646, h 469.3, `display: grid`, `justify-content: center` | |

- **No fixed column and no strip.** `.circ-panel` is a three column grid
  (`var(--ctl-w) max-content var(--ctl-w)`) with `align-items: start`, centred in
  the card. Nothing stretches and there is no slack.
- The card carries `min-width: max-content`, so on a phone **the card itself is
  what overflows** and slides out of `.circ-scroll`.
- Nameplate **inside the card, above the grid**, `space-between` across the
  card.
- `--pan-gap`'s equivalent here is `gap: 22px` on the card and `--ctl-gap: 14px`
  inside the panel, so the per instance numbers really do differ between pages.

### 2.4 🔴 The one measured DEFECT the comparison turns up, and it is on `/circuit/`

`/circuit/` asserts `the panel box starts and ends where the rest of the page
does`, reading `card.left` and `card.right` against `.pos-body`. MEASURED at two
widths:

| page | width | card left minus page left | card right minus page right | assert |
|---|---|---|---|---|
| circuit | 756 | 0.0 | 0.0 | passes |
| circuit | **390** | 0.0 | **+286.0** | **false** |
| evo | 756 | 0.0 | 0.0 | passes |
| evo | 390 | 0.0 | 0.0 | passes |
| model | 756 | 0.0 | 0.0 | passes |
| model | 390 | 0.0 | 0.0 | passes |

🔴 **So on a phone `/circuit/`'s card runs 286 px past the page, and its own
assert cannot see it, because `demo/verify.mjs` runs at 756 px where the panel
fits.** That is the standing rule about a phone layout this project cannot
grade, arriving as a concrete number. Two of the three pages already put the
scroll boundary INSIDE the card and are correct at every width. The document
does not drag sideways on any of them (`documentElement.scrollWidth` equals
`clientWidth` at both widths on all three), so the `min-width: 0` discipline is
in place everywhere.

---

## 3. The contract

The candidate in the brief was *a nameplate, a fixed column that does not
scroll, and a scrolling strip of controls beside it, inside a card*. **Measured
against all three, that is the union of the three pages rather than their
intersection, and it has to be stated as four independent pieces.**

| piece | `/evo/` | `/twelve/` | `/circuit/` | verdict |
|---|---|---|---|---|
| a nameplate | inside the flow, stacked, centred | above the boxes, `space-between` | inside the card, `space-between` | **every panel has one. Its PLACEMENT is optional and is one of three.** |
| a scrolling region with `min-width: 0` | the strip | the row | the whole card | **every panel has one. WHAT scrolls is optional.** |
| a fixed column beside it | yes, left | yes, right | no | **optional, and the SIDE is an option.** |
| a card around the lot | yes | no, per child | yes | **optional.** |
| a group box and a window | `.pan-group` x2, `.pan-win` | no | no (it has `.circ-pair` instead) | **optional furniture.** |
| printed label inks | `.pan-cap`, `.pan-sub` | none | `.circ-pair-lab`, a near twin | **optional furniture, and see §9.3.** |

So the contract, restated:

1. **A panel is a container with exactly one scrolling region in it, and the
   page never scrolls.** `overflow-x: auto` plus `min-width: 0` on the same
   element, always both. MEASURED at 390 px on this project once as 141 px of
   page overflow when the second half was missing.
2. **A panel may have a fixed column, on either side of the scroller.** It is a
   SIBLING of the scroller, never `position: sticky` inside it, for the reason
   both `/evo/` and `/twelve/` write down: a sticky child needs a background to
   hide what passes under it, a shadow to say it is over its neighbours, and it
   lands on top of the scrollbar, while two flex children need none of that.
3. **Where there is a fixed column, the wrap is `align-items: stretch` and the
   two children are one depth.** Not `flex-end`: bottom alignment makes them END
   together and says nothing about their heights, which is what `/twelve/` was
   reported for with a screenshot.
4. **The column's width is its widest child and nothing else.** MEASURED on
   `/evo/`: 176 px of content, set by the keypad group, with the display and the
   wheels stretching to it. A caller that wants a different width changes what is
   IN the column.
5. **One 1 px border, on the fixed column's edge facing the scroller, and it is
   the edge of the scroll region.** It is the one line on a panel that survives
   the *separation is spacing, not lines* rule, because it says *the thing on
   this side stays put while the thing on that side moves under it*, which
   spacing cannot carry. Both pages that have it say so independently.
6. **Two published measurements, `--pan-pad` and `--pan-gap`, declared on the
   panel and not at `:root`.** On the panel because everything that reads them is
   a DESCENDANT, so a page with two panels can give one different proportions;
   the `--fdr-foot` lesson is about a SIBLING needing a value and does not apply.
   ⚠️ **On an uncased panel `--pan-pad` resolves to 0 and every other rule is
   unchanged**, which is what makes `/twelve/` fit the same stylesheet.
7. **The nameplate is one ink rule and three layouts.** The ink is
   `font: 600 11px var(--mono); letter-spacing: .14em; color: var(--dim2);
   text-transform: uppercase`, which all three pages already share to the
   declaration. What is NOT shared, read off the three stylesheets: `/evo/` adds
   `line-height: 1.5` and `white-space: nowrap` because it stacks two lines
   (MEASURED 33 px tall), `/circuit/` adds `align-self: center` because it is a
   grid child, `/twelve/` adds nothing (MEASURED 11 px tall). So `line-height`
   belongs to the placement and not to the ink.
8. 🔴 **THE SCROLLING REGION IS INSIDE THE CARD, NOT AROUND IT.** This is the
   one place the contract CORRECTS a live page rather than describing it, and
   §2.4 is the measurement.
9. **Exactly one child of the flow absorbs the slack, and it says so.** §4.

---

## 4. 🔴 THE FORCED DECISION: WHICH CHILD ABSORBS THE SLACK

This is the paragraph the rest of the plan is in service of.

### 4.1 The measurement, which is what decides it

The fixed column is taller than the strip's natural content on both pages that
have a fixed column, and **the two amounts differ by more than an order of
magnitude.**

**`/evo/`, measured by switching the absorber off in the live page**
(`.evo-keys` from `flex: 1 1 auto` to `flex: 0 0 auto`, and `.pan-flow`'s
`height: 100%` to `auto`, then putting both back):

| | `.pan` | `.pan-fixed` | `.pan-flow` | `.evo-keys` |
|---|---|---|---|---|
| as it ships | 503.03 | 501.03 | 461.03 | **334.03** |
| absorber off | 503.03 | 501.03 | **151** | **24** |

**Slack absorbed: 310.03 px, which is 67 per cent of the flow's depth.**

🔴 **AND THE KEYBOARD HAS NO INTRINSIC HEIGHT ON THAT PAGE AT ALL.** With growth
off it measures **24 px**, not the kit's 74. `.evo-keys .k { height: auto }`
replaces the component's own key height, so the absorber is not a polish on top
of a working keyboard: it is the only thing giving the keyboard a size. Switch it
off and the page draws a 24 px keyboard with 310 px of empty card under it, which
is the defect the rebuild was handed in the first place.

**`/twelve/`, measured by switching `align-items: stretch` to `flex-start`:**

| | natural | as it ships |
|---|---|---|
| `.rack-row` | 440.69 | 465.69 |
| `.rack-lane` | 465.69 | 465.69 |

**Slack: 25.00 px, which is 5.4 per cent of the depth**, and the lane is the
taller of the two. It is absorbed as AIR, by `margin-top: auto` on each channel
strip's `.pos-crow`, whose computed `margin-top` reads **exactly 25px**.

**`/circuit/`: no fixed column, no stretch, no slack.**

### 4.2 Why the cause is a scale mismatch, stated exactly

A kit white key is **74 px** and a kit pad is **46 px**, a ratio of **1.6:1**,
and both numbers are playable targets rather than drawings. On a real MK-425C a
key is about 15 cm and a keypad button about 1 cm, a ratio of **15:1**. A replica
at a tenth of the object's size cannot carry the object's proportions, which is
the same conclusion `/circuit/` reached from the other end when it drew its
filter and master pots at one size (*"single size knobs weverywhre"*). So on a
panel with a keyboard the keys are the part allowed to grow into the depth of the
case, and shrinking the panel to match a 74 px key is the wrong direction:
MEASURED, the keys are 28 to 98 per cent of the case's depth on the real object.
`/circuit/` and `/twelve/` never meet this because neither has a keyboard.

### 4.3 The five options, and what each costs

**A. The component names no absorber and the caller declares one by convention.**
`.pan-flow { height: 100% }` plus a documented requirement. Cost: the thing
`/evo/` cannot survive without becomes a line on a page, which is exactly the
`/blocks/` shape recorded in `positron-xr` and in `CLAUDE.md`: a required call
that no browser check can see when it is MISSING, because in the broken state
nothing throws and nothing looks wrong until somebody opens the page. That page
had no way out of it at all and every other page had the line, so no shared code
was wrong and nothing could disagree with anything.

**B. The component takes the absorbing child as an argument and refuses
silence.** `createPanel({ grow })`, or a published `.pan-grow` class the caller
applies, PLUS a build time report when a flow's children come to less than its
height and no child grows. Cost: one more argument, and a report channel. Gain:
the requirement is greppable rather than conventional, and the failure is named
at the author rather than discovered by a reader.

**C. The slack always becomes air.** `justify-content: flex-start`, no growth
anywhere. Cost, measured: `/evo/` ships a 24 px keyboard and 310 px of empty
card. **Refused on the measurement.**

**D. The slack always becomes growth on the last child.** Cost: on `/twelve/` the
last thing in a channel strip is its fader block, so 25 px would stretch a fader
lane whose length is a deliberate expression (`4 * --ctl-w/2 + 3 * --ctl-step`,
the length of four buttons and three steps) and which is asserted to end on one
line with the FX fader. And "last child" is a fact about source order rather than
a statement about the panel, which is the argument the transport bar's
`publish: false` already rests on. **Refused.**

**E. The fixed column stops driving the depth.** `align-items: flex-start`.
Cost: `/twelve/` was reported by screenshot for precisely this, *"the panels are
glued together, no gap, same h"*, and `/evo/` asserts `the left column is the
full depth of the panel` on purpose. **Refused on two pages' reports.**

### 4.4 🔴 THE RECOMMENDATION: B, and the guard is a report rather than a throw

**Publish one class and one rule:**

```css
.pan-flow { height: 100%; }                       /* already there */
.pan-grow { flex: 1 1 auto; min-height: 0; }      /* the absorber */
```

⚠️ **`min-height: 0` IS NOT OPTIONAL AND IS THE HALF THAT GETS LEFT OUT.**
Without it a flex child will not shrink below its content, and on `/evo/` it is
what lets the keyboard go from 24 px to 334.03. It is the vertical twin of the
`min-width: 0` rule already written down three times in this repository for a
scrolling flex row.

**The factory applies it**, so the requirement arrives as an argument:
`createPanel({ grow: keysBox })` sets the class and nothing is typed on a page.

**And the component REPORTS a flow with slack and no absorber**, on the same
`cuts` channel `createDiagram` already uses for a label it had to cut: a list the
page can assert on and a visible line under the specimen. **A report and not a
throw**, because `/twelve/`'s 25 px of trailing air is legitimate and a panel with
no fixed column has no slack at all, so refusing the build would break two of the
three callers. The condition is checkable from the DOM at build time: the flow
has a definite height, its children's heights sum to less than it, and no child
carries `.pan-grow`.

**Why not have the component measure and set a height in JavaScript:** an
inline style beats every stylesheet, which is this project's fourth measured dead
rule (`stage.style.aspectRatio` against
`.pos-vp[data-full] .pos-vp-stage { aspect-ratio: auto }`), and it would have to
re-run on every resize. A component that varies a property per instance sets a
custom property, never the property.

**What `/twelve/` does under this contract:** nothing changes. It has no flow, its
slack is 25 px, and `margin-top: auto` inside a channel strip stays exactly where
it is, because it is a claim about where a fader block sits on a Model 12 panel
(*"Knobs and REC at the top, the fader and its buttons in the lower block, and
the air between them is the gap the hardware has too"*) rather than a slack
policy that happens to work.

---

## 5. The second decision: the card, the scroll boundary, and the name

### 5.1 The card is additive and the factory defaults it on

`.pan` carries the layout and the two tokens and paints **nothing**. `.pan-case`
adds `background: var(--card)`, the 1 px border, the radius and
`padding: 0 var(--pan-pad)`. Two of three callers want it, so the factory applies
it unless told `cased: false`.

**Additive rather than a `.pan-bare` that removes**, because a border stripped by
a rule nobody wrote is the shape this repository has measured five times, and
`/evo/` already carries an assert on its border's COMPUTED width for exactly that
reason. A class that only ever adds cannot produce that failure.

On an uncased panel `--pan-pad: 0`, and then `.pan-fixed`'s
`padding: var(--pan-pad) var(--pan-gap) var(--pan-pad) 0` and `.pan-strip`'s
`padding-block: var(--pan-pad)` are already correct for `/twelve/` with no second
rule. ⚠️ **That is only true since the edit that landed today**, which moved the
vertical inset off the card onto its two children so the divider could reach the
card's edges. Before it, the inset was on `.pan` and an uncased panel would have
needed its own rules.

### 5.2 The scroll boundary: recommend moving `/circuit/`, in its OWN change

§2.4 measures that `/circuit/`'s card runs 286 px past the page at 390 px and
that its own assert cannot see it. Converting it to the `/evo/` shape fixes that
and makes the assert true at every width.

⚠️ **AND IT IS A VISIBLE BEHAVIOUR CHANGE THAT REVERSES AN INSTRUCTION, SO IT
DOES NOT TRAVEL IN THE SAME COMMIT AS A RENAME.** *"make it overflow on mobile"*
was answered with a card that overflows, and *"these corners to line up with the
page content leftmost rightmost edges"* was answered with a card at page width.
Those two asks are in conflict at 390 px and the code satisfies the second only
above the panel's own width. Putting the scroll inside the card satisfies both,
and it changes what moves under a visitor's finger: the printed names `NOVATION`
and `CIRCUIT` stop sliding off and the controls scroll under them. That is worth
a screenshot and a decision, not a bundle.

**So: the rename and the furniture convert now; `/circuit/`'s scroll boundary is
a second, separately reviewable change**, and this plan recommends making it.

### 5.3 🔴 The class prefix is a real decision, because `/twelve/` has a PAN knob

MEASURED: `demo/twelve/index.html` builds `createKnob({ label: 'pan' })` on all
eight channels, and the page's own comments discuss PAN at length (*"PAN is
RELATIVE, not absolute"*, *"the panel legend reads PAN C BAL"*). After the
conversion that page would carry `.pan-strip` and `.pan-fixed` beside a control
called PAN, so `grep -n pan demo/twelve/index.html` stops being a useful search.

- **Option 1, keep `.pan-*`.** Cheapest: the names are already written in
  `/evo/` and the prefix is consistent with the kit's existing unprefixed
  families (`.sld-*`, `.tbar-*`, `.kpad-*`, `.strip-*` are all in `shell.css`
  without a `pos-` prefix, 40 of them, so no `pos-` rename is owed).
- **Option 2, `.panel-*`.** Unambiguous, still short, the word everybody uses.
  Costs one mechanical rename of 12 class names inside one file, done by the same
  agent in the same change.

**Recommend option 2**, on the grep argument alone. `.panel`, `.panel-case`,
`.panel-wrap`, `.panel-fixed`, `.panel-strip`, `.panel-flow`, `.panel-grow`,
`.panel-row`, `.panel-group`, `.panel-plate`, `.panel-plate-l`, `.panel-win`,
`.panel-cap`, `.panel-sub`.

### 5.4 🔴 THE MODULE CANNOT BE `panel.mjs` AND CANNOT EXPORT `createPanel`

**Both are taken.** `demo/shell/panel.mjs` already exists and is something else
entirely: a canvas with a footer of real numbers under it, for the XR room, and
`createPanel({ width, height, title, scale })` is called twice by
`demo/mirror/index.html`. `build.mjs` refuses a build when two sources collide on
one destination, so this is the sort of collision that stops the site rather than
degrading it.

**Recommend `demo/shell/panel-layout.mjs`**, exporting `createPanelLayout` and
`createNameplate`, with the collision named in the module header so the next
reader does not "tidy" it. ⚠️ `hardware.mjs` is also taken (`createHardware`, the
one gesture that buys audio and MIDI) and `xr-panel.mjs` is taken as well.

---

## 6. Per page conversion

### 6.1 `/evo/`: a rename plus a deletion, nothing visible

Everything above the second banner moves to `shell.css`. Rule counts are from the
stylesheet with comments stripped.

| now | becomes | rules |
|---|---|---|
| `.pan` | `.panel` + `.panel-case` | 1 |
| `.pan-wrap` | `.panel-wrap` | 1 |
| `.pan-fixed` | `.panel-fixed` | 2 |
| `.pan-strip` | `.panel-strip` | 1 |
| `.pan-flow` | `.panel-flow` | 1 |
| `.pan-row` | `.panel-row` | 1 |
| `.pan-group` | `.panel-group` | 1 |
| `.pan-plate`, `.pan-plate-l` | `.panel-plate`, `.panel-plate-l` (ink only, see §3.7) | 2 |
| `.pan-win` | `.panel-win` | 1 |
| `.pan-cap`, `.pan-sub`, and `[data-off]` on both | `.panel-cap`, `.panel-sub` | 3 |
| `--pan-pad`, `--pan-gap` | `--panel-pad`, `--panel-gap` | on `.panel` |

**Stays, because it is the MK-425C:** `.evo-fixed`, `.evo-row`, `.evo-wheels`,
`.evo-win`, `.evo-keypad` (2 rules), `.evo-snapbox`, `.evo-wheelrow`,
`.evo-wheelmid`, `.evo-fn-row`, `.evo-fn-lab`, `.evo-fn-pair`, `.evo-oct`
(3 rules), `.evo-oct-row`, `.evo-oct-lab`, `.evo-rot` (2 rules),
`.evo-rot-div`, `.evo-keys` (8 rules), `.evo-plate`, `.evo-strip`, `.evo-flow`.

**Deletions available, both MEASURED:**

- 🔴 **`.pan.evo { gap: 0 }` AND `.evo-wrap { gap: 0 }` ARE INERT TODAY.**
  MEASURED: both compute to `0px`, and setting them back to `normal` in the live
  page leaves the panel at **503.03 by 646, identical to the digit**. Neither
  `.pan` nor `.pan-wrap` declares a gap, so they set a property to the value it
  already has. ⚠️ **They are DEFENSIVE rather than dead, and the distinction
  matters**: `.pan-flow` gained `gap: var(--pan-gap)` earlier today, so a gap
  arriving on `.panel` or `.panel-wrap` tomorrow is not hypothetical. Either keep
  them with a comment saying what they are guarding, or delete them and let the
  panel's own asserts catch a gap that arrives. Do not delete them silently.
- 🔴 **`.evo-log { margin-top: 0 }` MATCHES NOTHING.** MEASURED:
  `document.querySelectorAll('.evo-log').length === 0`. The MIDI log is
  `createMidiLog()` appended to `d.el` and never carries that class. A dead rule.
- ✅ `.evo-keys .kbd .kpad` matches **1** and `.evo-keys .kbd .pad` matches
  **0**, which confirms the sixth dead rule was really repaired rather than
  reported as repaired.

**Visible change on `/evo/`: none.** Every rule keeps its declarations and its
selector's shape.

### 6.2 `/twelve/`: the hard one, and the contract has to grow for it in exactly two places

**It fits, with two additions:** the card becomes optional (§5.1) and the
nameplate's placement becomes an option (§3.7). Nothing else about it is
special.

| now | becomes | rules that name it |
|---|---|---|
| `.rack-unit` | `.panel` with `cased: false` (`--panel-pad: 0`). Its own `gap: 10px` STAYS: it is the nameplate to instrument distance and the page asserts it against `--pos-gap / 2`. | 1 |
| `.rack-brands` | `.panel-plate` with `place: 'ends'`, spanning the unit | 1 |
| `.rack-brand` | `.panel-plate-l` | 1 |
| `.rack-wrap` | `.panel-wrap`. Its `padding-bottom: 4px` is a decision, see below. | 1 |
| `.rack-row` | `.panel-strip` with `side: 'right'` for the fixed column | **9** |
| `.rack-lane` | `.panel-fixed` + its own `.panel-case` (it paints its own card) | **10** |

🔴 **NINETEEN RULES, AND ONE OF THEM NAMES BOTH.** The exact selectors, because
this is the single largest risk in the extraction and none of them is
type-checked:

```
.rack-row                                  .rack-lane                      (x2)
.rack-row > .strip-one > .pos-crow   (x3)  .rack-lane .pos-knob
.rack-row > .strip-one                     .rack-lane .strip-master        (x3)
.rack-row > .strip-one + .strip-one        .rack-lane .pos-fdr
.rack-row > .strip-one:first-child         .rack-lane .pos-crow
.rack-row > .strip-one:last-child          .rack-lane .pos-crow > .pos-knob
.rack-row > .strip-one, .rack-lane   (one rule, both names)
```

Four of them are inside the `@media (max-width: 560px)` block, which **this
project cannot grade**: `demo/verify.mjs` runs at 756 px, so a mistake in the
phone rules is invisible to the suite. Those four are
`.rack-row > .strip-one > .pos-crow`, `.rack-lane .pos-crow`,
`.rack-lane .pos-crow > .pos-knob`, and the combined
`.rack-row > .strip-one, .rack-lane`.

**Stays, because it is a Model 12:** `.strip-one` (9 rules), `.strip-master`
(4), `.strip-btns` (2), `.strip-outs` (1), `.transport-row` (1), and the whole
phone block, which is a redesign asked for in those words (*"max 2 buttons side
by side. knobs sepate row, single buttons centerd, slider / controls columns:
flatten, controls on top. align all to bottom"*) rather than a reflow.

**Two hazards on this page that the conversion should fix while it is in there:**

- ⚠️ **`.pos-crow .pos-fdr { --fdr-lane-h: ... }` HAS NO PAGE PREFIX AND MATCHES
  EIGHT ELEMENTS.** MEASURED. It is scoped only by living in this page's
  stylesheet, and it declares a Model 12 fader length. On a page with two panels
  it would reach both. Give it a `.strip-one` ancestor.
- ⚠️ **`.strip-*` IS `shell.css`'s OWN PREFIX.** `.strip`, `.strip-mini`,
  `.strip-deep` and `.strip-auto` are the timeline strip view's height classes,
  set by `demo/shell/strip.mjs`. MEASURED: `.strip` matches **0** elements on
  `/twelve/` today and `.strip-body` matches 0, so the collision is latent rather
  than live, and `.strip-body` was already this project's fifth measured dead
  rule. A `.strip-one` added to `shell.css` tomorrow would silently reach eight
  channel strips. Renaming `/twelve/`'s five `.strip-*` classes is not required by
  this extraction and is worth doing in the same pass.

**Visible change on `/twelve/`: none intended.** The one thing that could move is
the scrollbar reservation, see §11.

### 6.3 `/circuit/`: furniture now, scroll boundary second

| now | becomes | rules |
|---|---|---|
| `.circ` | `.panel` + `.panel-case`. Keeps `--panel-gap: 22px` and its own `padding-bottom: 34px`. | 3 |
| `.circ-brands` | `.panel-plate` with `place: 'ends'` | 1 |
| `.circ-brand` | `.panel-plate-l` (keeps `align-self: center`, which is grid placement) | 1 |
| `.circ-scroll` | **deleted** in the second change, when the scroll moves inside the card | 1 |

**The per instance numbers, which is what the tokens are for:** `--panel-gap` is
16 on `/evo/` and 22 on `/circuit/`; `--ctl-gap` is overridden to 14 inside
`.circ-panel` against the `:root` value of 8. Both are legitimate and both stay.
⚠️ `/circuit/`'s foot is `34px` against 20 on the other three sides, asked for
twice, because the bottom row of pads carries no label under it. **Keep it as a
page rule with its comment** rather than growing the token an asymmetric form:
the reason is instrument specific.

**Stays, because it is a Circuit:** `.circ-panel`, `.circ-macros` (3 rules),
`.circ-macro-even`, `.circ-mid` (3), `.circ-side`, `.circ-side-pads` (+2 child
rules), `.circ-grid` (2), `.circ-row` (4), `.circ-pair`, `.circ-pair-row`,
`.circ-pair-lab` (2), and the four grid area rules `.circ-vol` / `.circ-macros`
/ `.circ-filt` / `.circ-left` / `.circ-mid` / `.circ-right`.
⚠️ `.circ .pos-pad-top, .circ .pos-pad-bot, .circ-pair-lab { text-transform:
none }` stays and is instrument specific: a Circuit prints `Tap` and `Sessions`
in mixed case, an MK-425C prints `CHANNEL`.

🔴 **AND ONE MEASURED DEAD RULE ON THIS PAGE, WHICH WOULD BE THE SEVENTH IN THIS
REPOSITORY.** `.circ > .pos-knob { align-self: end }` matches **0 elements**.
MEASURED: `.circ` has exactly two children, the nameplate row and
`.circ-panel`, so no knob is ever a direct child of it. The comment above it
reads *"the knob row sits on the bottom of its own row, level with each other"*,
which is now done by `.circ-panel { align-items: start }` plus the explicit grid
areas. It reads as correct and does nothing. ⚠️ **AND `.circ .pos-pad-bot`
MATCHES 0 TOO**, while `.circ .pos-pad-top` matches 60: half of that rule is
forward looking rather than defective, which is a different thing and should not
be deleted on the same reasoning.

---

## 7. The assert budget, and the selectors at risk

### 7.1 🔴 THE BASELINE, MEASURED ONCE

```
node demo/verify.mjs twelve circuit evo kit
```

**219/219 green, 0 failures**, run 2026-09-21 at the start of this survey:

| page | asserts |
|---|---|
| `circuit` | **33** |
| `model` | **37** |
| `evo` | **47** |
| `kit` | **102** |
| total | **219** |

⚠️ **AND THIS NUMBER IS ALREADY STALE FOR `evo` AND `kit`, BECAUSE TWO AGENTS
ARE WRITING IN THOSE TWO FILES.** `demo/evo/index.html` gained 96 lines and
`demo/kit/index.html` 34 after the run. **The executing agent re-runs that one
command as its FIRST act, records the four numbers, and diffs against its own
baseline rather than against this table.** A count carried over from a survey is
the thing this repository keeps paying for.

⚠️ The run warned `1 other headless Chrome already running`. Nothing here needs
the relay, the board or bandwidth, and nothing went red, so it did not matter on
this run.

### 7.2 Selectors at risk, by name

**Asserts that read a layout class as a STRING. These are the ones that move:**

| page | what | line at survey time |
|---|---|---|
| `/twelve/` | `document.querySelector('.rack-lane')` in *the master lane is glued to the channels and is the same height* | ~1120 |
| `/twelve/` | `document.querySelector('.rack-lane')` in *the nameplate spans the mixer and sits closer to it than a block would* | ~1180 |
| `/evo/` | `card.querySelectorAll('.pan-sub, .pan-cap')`, which stamps `data-off` on all 15 printed labels | ~1032 |

MEASURED: `.pan-sub` matches **14** elements and `.pan-cap` **1**, and
`[data-off]` is present on all 15, so that one line is load bearing for the
dimming behaviour that shipped today. Rename it and 15 labels stop dimming with
their dead controls, with nothing red.

**`/circuit/` names no layout class in any assert.** All 33 read element
variables.

🔴 **AND ONE NEGATIVE ASSERT CANNOT TELL A DELETION FROM A RENAME.** `/evo/`,
around line 1487:

```js
card.querySelectorAll('.evo-bar, .pos-sec-h, .evo-join, .evo-snap-brk, .evo-oct-brk').length === 0
```

MEASURED: all five match **0** today, which is what makes the assert pass. It is
correct precisely BECAUSE those selectors are dead, so if the extraction renames
anything in that list the assert stays green while measuring nothing. **Re-read
those five names by hand after the rename** and confirm each one is still the
name of a thing that was deliberately removed.

### 7.3 What the extraction gets for free, and it is most of the safety

✅ **Nearly every panel geometry assert on all three pages reads an element
VARIABLE rather than a selector**, so a class rename leaves them running against
the right elements. That is the difference between this rename and the
`.strip-body` one. On `/evo/` those are `fixed`, `strip`, `keysBox`, `flow`,
`plate`, `oct`, `rot`, `wheelRow`, `keypadBox`, `win`, `card`; on `/twelve/`,
`rackRow`, `brands`, `rack[i]`, `master`, `outs`; on `/circuit/`, `circScroll`,
`circ`, `brands`, `grid`.

**The four asserts that will catch a botched extraction, named so the executing
agent watches them:**

1. `/evo/`: *the left column holds still while the strip scrolls* (scrolls the
   strip by up to 180 px and puts it back).
2. `/evo/`: *the left column's right border is where the scrolling starts*
   (reads the COMPUTED `borderRightWidth`, plus `scrollWidth - clientWidth > 40`).
3. `/evo/`: *the left column is the full depth of the panel* (the `stretch`
   claim, within 1.5 px).
4. `/twelve/`: *the master lane is glued to the channels and is the same height*
   (seam within 1 px AND heights within 1 px).

**Two asserts that SHOULD be added by this change, because nothing grades them
today:**

- 🔴 **THE SLACK ABSORBER.** No page asserts that the flow's growing child is the
  one that grew. The check that cannot be satisfied by an accident is: the flow's
  children's heights sum to the flow's height AND exactly one of them carries
  `.panel-grow` AND its height exceeds its own `scrollHeight` with growth off.
  The negative control is the sabotage already run for this plan: force
  `flex: 0 0 auto` and the keyboard goes 334.03 to 24, so the assert must go red.
- 🔴 **THE CARD'S EDGES AGAINST THE PAGE, AT A PHONE WIDTH.** `/circuit/` has
  the assert and the harness cannot reach the width where it is false (§2.4).
  Since `demo/verify.mjs` runs at 756 px with no viewport override, this has to
  be measured another way or declared unmeasured in words. See §11.

### 7.4 What moves in `/kit/`'s own counts

Adding one `section()` call changes two DETAIL lines and no verdicts:

- *every part of this page holds blocks, and between them they hold all of them*
  reads `HARDWARE 6` and `38 blocks on the page of 38 built` today, and becomes
  `HARDWARE 7` and `39 of 39`.
- *the part holding the newest block is the only one marked, and the block is
  first in it* reads `SEGMENT DISPLAY is the newest block, hardware holds it`
  today, and names the new block instead. The marked tab does not change, because
  both blocks are in `hardware`.

🔴 **AND A PANEL BLOCK THAT THROWS TAKES THAT SECOND ASSERT RED AS WELL AS
LANDING IN `failed`.** `built[0]` is the first block that BUILT, so a broken new
first block makes `built[0]` the old one while `firstIn` is still the new one's
id, and the two stop agreeing. Two asserts move on one broken block, which is
worth knowing before reading the output.

---

## 8. What `/kit/` should show

**One section, in the `HARDWARE` tab, as the FIRST `section()` call in the
file**, which is what makes it the newest block and moves the mark with nothing
typed. Heading typed uppercase: `PANEL`.

⚠️ **A BLOCK THAT MOVES TAKES WHAT IT NEEDS WITH IT.** Any `const` the specimen
needs is declared with the other holders near the top of the file, not beside the
block. This file has already been taken out twice by a block that moved and left
its `const` in a temporal dead zone, where `section()` swallowed the throw into
`failed` and the page died much later with a message about a different line.

### 8.1 The smallest honest demonstration

**Two panels in one `.kit-box`, each under its own `.kit-cap`**, which is the
established multi specimen pattern on that page (`.kit-box > * + .kit-cap` exists
with a 44 px margin for exactly this).

**Specimen 1, `WITH AN ABSORBER`:** a cased panel whose fixed column is three
real controls stacked (a knob, a pad and a fader is enough to make the column the
taller child), beside a strip holding one short `.panel-row` of four pads and,
under it, a plain `.kit-blk` dashed block carrying `.panel-grow`. A nameplate.

**Specimen 2, `NO ABSORBER`, the negative control:** the same panel with the
`.panel-grow` class left off, so the reader SEES the trailing air and the block
sitting at its own height. That is the sabotage that produced the 310.03 px
measurement, made permanent as a picture.

### 8.2 🔴 Why the specimen has no keyboard, which is a real cost

A keyboard is the honest demonstration of the slack, because it is the only
caller that has one and it is where the 15:1 scale mismatch lives. **It is still
the wrong thing to put in the specimen, for two reasons.** `/kit/` already has a
`KEYBOARD` block in the `input` tab, and two keyboards on one page is the kind of
furniture the tab row exists to avoid. And a panel with a two octave keyboard in
it measured **1018 px wide** on `/evo/`, against a `.kit-box` inside a 688 px
page column, so the specimen would be a scroller inside a scroller and the thing
being shown would be lost in the thing showing it.

**A dashed block absorbing the slack shows the mechanism and not the instrument**,
which is what a sandbox is for. ⚠️ **AND IT MEANS THE SPECIMEN CANNOT
DEMONSTRATE THE 15:1 MISMATCH.** Say that in the block's `note`, and point at
`/evo/` as the page where it is real, the way the diagram blocks already point at
the pages that bought their options.

### 8.3 The measuring window, and the one thing that would break it

`measure()` runs at line ~567, before every `section()`, and `settle()` after
them at ~2864; `.kit-measuring .pos-tabs-p[hidden] { display: block }` at (0,2,1)
beats the browser's own `[hidden]` at (0,1,0). So a specimen built inside a
`section()` callback has REAL rects even in a closed part, and a panel built there
will measure.

🔴 **THE ONE RULE: NO `await` ANYWHERE IN THE BLOCK.** The window holds no
`await` on purpose, because JavaScript here is single threaded and no frame can
be rendered between `measure()` and `settle()`, which is what makes an ungated
window safe for a visitor. A `paintedOpen` counter grades it and sabotage of that
counter is already in the page's report. Every call the panel specimen needs
(`createKnob`, `createPad`, `createFader`, `createPanelLayout`) is synchronous.

### 8.4 What the block should assert

Four, all of them the kind only that page can make, and all of them reading real
rects:

1. The fixed column and the strip measure one depth, within 1.5 px, and the
   column is the taller child's own content height.
2. The absorbed slack is the difference, and it lands on the child carrying
   `.panel-grow` rather than anywhere else. Negative control: specimen 2's flow
   children sum to LESS than its height and it carries no `.panel-grow`.
3. The strip's `overflow-x` computes to `auto` and its `min-width` to `0px`, and
   the document's `scrollWidth` does not exceed its `clientWidth`.
4. The border is on the fixed column's facing edge, COMPUTED, and there is
   something to scroll behind it (`scrollWidth - clientWidth > 0`).

---

## 9. What must NOT travel

### 9.1 Anything naming a real control

`.evo-keypad`, `.evo-snapbox`, `.evo-wheelrow`, `.evo-wheelmid`, `.evo-fn-row`,
`.evo-fn-lab`, `.evo-fn-pair`, `.evo-oct*`, `.evo-rot*`, `.evo-keys`,
`.circ-macros`, `.circ-macro-even`, `.circ-side*`, `.circ-grid`, `.circ-row`,
`.circ-pair*`, `.circ-vol`, `.circ-filt`, `.strip-one`, `.strip-btns`,
`.strip-outs`, `.strip-master`, `.transport-row`. **A component that travels
with one instrument's proportions is a component with one caller.**

### 9.2 The arithmetic that is about one object

- `/evo/`'s keypad `padding: 10px` and its half height buttons, bought by a
  measurement of that grid (268 px going to 176) and an instruction.
- `/evo/`'s `.evo-wheelmid`, including the `4px` that is a reservation the kit
  does NOT publish: `.pos-fdr-lane` carries `margin: 4px 0 5px`, so a fader's top
  edge to its lane's top edge is `--ctl-head` plus four and the control contract
  has no token for the four. That number is typed once, beside the thing it
  governs, and a component copying it would be a second copy of a measurement.
- `/evo/`'s eight keyboard overrides, including `.evo-keys .k.sharp { height:
  62% }`, which is a PERCENTAGE rather than the component's 46 px precisely
  because the ratio is what the component means.
- `/evo/`'s `.evo-fn-lab` / `.evo-fn-pair` absolute positioning, every offset
  derived from `--i` and the shared pitch.
- `/circuit/`'s `repeat(8, var(--ctl-w))`, its zig zag offset, its `18px` seams
  and its `34px` foot.
- `/twelve/`'s `--fdr-lane-h: calc(4 * calc(var(--ctl-w) / 2) + 3 *
  var(--ctl-step))`, twice, which is the claim that a fader spans four buttons
  and three steps on a Model 12.
- `/twelve/`'s entire phone block.

### 9.3 The shared legend, and it needs its own measurement first

⚠️ **`/circuit/`'s `.circ-pair-lab`, `/evo/`'s `.evo-oct-lab` and `/evo/`'s
`.evo-fn-pair` are three answers to ONE question**, which is how a panel prints a
name over more than one control. All three are absolutely positioned or margin
corrected against `--ctl-head`, and all three have a different geometry:
`.circ-pair-lab` is `min-height: 12px` with `margin-bottom: calc(var(--ctl-head)
- 12px)`, `.evo-oct-lab` is `position: absolute; left: -20px; right: -20px`, and
`.evo-fn-pair` derives its left from `--i`. **It is a real component and it does
not travel in this change**, because merging three geometries needs a measurement
of all three and this plan has not made one. Record it and stop.

### 9.4 The near twin that must not be merged with `.pos-cap`

`shell.css` already has `.pos-cap`, the house caption for a picture:
`font: 500 9.5px/1.6 var(--mono); letter-spacing: .1em; color: var(--dim2);
display: block; margin-top: 3px`. The panel's labels are
`font: 500 8px/11px var(--mono)`, `pointer-events: none`, and `.panel-cap` takes
`.16em` while `.panel-sub` takes `.1em` and `text-align: center`. **They are
different things and the `margin-top: 3px` is the tell**: a printed label on a
panel is positioned by its group, and a caption that brings its own margin would
move it. Name the near twin in the module header so nobody folds them together.

---

## 10. Dead and inert rules found on the way, all measured

This repository's count of measured dead CSS rules stood at six. The survey adds
two clear ones and one that is not a defect.

| page | selector | matches | verdict |
|---|---|---|---|
| `/circuit/` | `.circ > .pos-knob { align-self: end }` | **0** | 🔴 dead. `.circ` has two children and neither is a knob. Would be the seventh. |
| `/evo/` | `.evo-log { margin-top: 0 }` | **0** | 🔴 dead. No element carries the class. |
| `/circuit/` | `.circ .pos-pad-bot` | **0** | not a defect: the `.pos-pad-top` half of the same rule matches 60, and this half is forward looking. |
| `/evo/` | `.pan.evo { gap: 0 }`, `.evo-wrap { gap: 0 }` | 1 each | inert, MEASURED: removing both leaves the panel 503.03 by 646 to the digit. Defensive, not dead. Decide in writing. |
| `/twelve/` | `.strip`, `.strip-body` | **0** | latent collision with `shell.css`'s timeline strip, not live today. |
| `/evo/` | `.evo-keys .kbd .pad` | **0**, against `.kpad` at 1 | the sixth dead rule, confirmed repaired. |

⚠️ **Fixing `.circ > .pos-knob` and `.evo-log` is a deletion of two rules that do
nothing, so it changes no pixel and no assert.** It belongs in this change
because this change is the one reading every rule on those pages.

---

## 11. What this plan could NOT settle

🔴 **Written as its own section because a plan that hides its uncertainty is the
kind this project keeps paying for.**

1. **Whether the scrollbar reservation is needed at all.** `/twelve/` reserves
   `padding-bottom: 4px` on the wrap and `/evo/` relies on the case's own
   `padding-block: 20px`. MEASURED: `.pan-strip`'s client height equals its
   content height (473 and 473 at survey time), so **the overlay scrollbar on
   macOS takes zero pixels and neither reservation is doing anything here**. On a
   platform with a classic scrollbar it would, and this repository cannot measure
   that: headless Chrome on this machine has overlay scrollbars. So the component
   should keep one reservation, on the wrap, where the measured bug was fixed, and
   the plan cannot say whether 4 px is the right number. Nobody has looked at
   either page on Windows or on a Linux desktop.
2. **The phone case for every panel, and it is a real gap.** `demo/verify.mjs`
   runs at 756 px with no viewport override, so **every assert on all three pages
   passes without entering a media query**. §2.4's 286 px was found with a
   throwaway probe, not by the suite, and after this change there will be nothing
   in the suite that could find it again. Options nobody has priced: a second
   harness pass at 390 px, a `DEMO_WIDTH` on `verify.mjs`, or a `/kit/` block that
   puts a panel inside `.kit-phone` (320 px) and measures it, which is the cheapest
   and covers the component rather than the pages.
3. **What `/evo/` at 390 px is actually like to use.** MEASURED: the fixed column
   stays at 193 px of the 316 available, 61 per cent, leaving a **107 px window on
   a 1018 px panel**. The page does not drag sideways and nothing is red. Whether
   that is a usable phone layout or the next screenshot report is a question for
   somebody holding a phone, and no rule in this repository answers it. `/twelve/`
   answered the same question with a redesign rather than a reflow.
4. **Whether `/circuit/` should keep its scroll boundary.** §5.2 recommends
   moving it and says why it is a separate change. The recommendation rests on a
   measurement of the page's own assert and on a reading of two instructions that
   conflict at 390 px. A person has to look at it.
5. **Whether `--panel-gap` should be two tokens.** It currently does two jobs on
   `/evo/`: the horizontal gutter between the fixed column and the strip (beside a
   1 px border) and the vertical air between rows of the flow. MEASURED both are
   16 px. They are not obviously the same distance, and the second one was raised
   today for a reason the first does not share (*"more space on top of keyboard"*).
   Splitting them is one line and nobody has asked.
6. **Whether the `.panel-*` rename is worth it.** §5.3's grep argument is real and
   the cost is a mechanical rename of about forty occurrences in one file. It is a
   judgement, not a measurement.
7. **The nameplate's `shown()` helper is copied three times** and the survey did
   not settle where it should live. MEASURED: the same seven line
   `textTransform`-aware reader appears in `/twelve/`, `/circuit/` and `/evo/`, and
   two of the three use it for the identical assert *the panel prints the maker and
   the model, both in uppercase*. It reads what the browser RENDERS rather than what
   is typed, which is the whole point of it, so it belongs beside `createNameplate`.
   Whether it is exported or inlined into a `plate.assertUppercase()` is unasked.

---

## 12. The order of work, for one agent in one change

1. `node demo/verify.mjs twelve circuit evo kit`. **Record the four numbers
   first**, because §7.1's are already stale.
2. Re-read `/evo/`'s PART ONE block in the file as it stands. It is still being
   edited.
3. `demo/shell/shell.css`: add the `.panel-*` family and `.panel-grow`, verbatim
   from `/evo/`, comments included. **Verbatim and not summarised**: the
   measurements, the dates and the quoted reports are the reason a rule survives
   being argued with.
4. `demo/shell/panel-layout.mjs`: `createPanelLayout` and `createNameplate`, the
   `grow` argument, the `cuts` report, and a header naming the `panel.mjs`
   collision.
5. `/evo/`: rename, delete the two dead rules, decide the two inert ones in
   writing. Re-read the five names in the negative assert by hand.
6. `/twelve/`: the 19 rules, the 2 asserts, the unprefixed `.pos-crow .pos-fdr`.
7. `/circuit/`: nameplate and card only. Delete `.circ > .pos-knob`. Leave
   `.circ-scroll` for the second change.
8. `/kit/`: the `PANEL` block as the first `section()` call, `hardware` tab, two
   captioned specimens, four asserts, holders declared with the others at the top.
9. `node demo/check-html.mjs` on each of the four pages, then
   `node demo/verify.mjs twelve circuit evo kit` ONCE, and **account for every
   assert that moved**. A count that went up by less than the four new `/kit/`
   asserts means something stopped running, and asserts do not fail when they stop
   running.
10. Report the diff in assert counts per page, not just the total.
