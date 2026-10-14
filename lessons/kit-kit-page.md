# Kit lessons: kit-page

The longer comments cut from `demo/shell/kit-page.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-kit-page.md#<anchor>`.

<a id="header"></a>

## `kit-page.mjs` module header

```text
demo/shell/kit-page.mjs, the scaffolding every `/kit/<part>/` page stands on.

🔴 ONE PAGE PER PART, 2026-10-06. Asked as *"for ui, we are pressing limits
of tabs in kit page. for your testing you have page size issue. i am
proposing split page up to separate ones, link from frontpage cards"*, then
*"no link to #, separate /kit/x pages"*, and planned in
`plans/plan-kit-split.md`. `/kit/` was 13,600 lines in one file with eight
tabs; each part is now a page of its own at `/kit/<part>/`, and what every
one of those pages did the same way lives here once.

⚠️ WHAT MOVED HERE, AND IT IS THE PART OF `/kit/` THAT WAS NOT A BLOCK:
  - `section(title, note, src, build, { bare })`, the same function less its
    first argument, because a page holds one part and has nothing to name;
  - `out(t)`, the box's footer line;
  - the page level checks that every part ran in the monolith (every block
    built, nothing drags the page sideways, two blocks keep the one gap, the
    newest block is first, every block has an address) in `checkPage()`;
  - landing on a block named in the address, which the tab row used to do.
⚠️ WHAT DID NOT MOVE, BECAUSE A PAGE WITH ONE PART HAS NO USE FOR IT: the tab
row, `GROUPS`, the measuring window (`measure()`, `settle()`, `paintedOpen`
and the `.kit-measuring` rule) and the asserts about them. The window
existed only because a closed tab has no width, and a part page has no
closed tab. With it goes the one argument ever made for running a check for
a visitor here, so EVERY check, the page level ones included, is behind
`?selfcheck=1` (CLAUDE.md: a self-check never runs for a visitor).
⚠️ `/kit/` ITSELF IS UNCHANGED UNTIL STEP 4 OF THE PLAN and keeps its own
copy of all of this.
```

<a id="backlink"></a>

## `kit-page.mjs` mount backlink

```text
back to the kit, saying so: *"kit backlinks should say kit not demos"*
```

<a id="heading"></a>

## `kit-page.mjs` heading

```text
🔴 THE HEADING IS THE PART ALONE, ASKED 2026-10-06: *"no need to "kit/..."
   in titles"*. `mount()` takes no display title, so the heading it drew is
   re-worded here; `__demo.name`, `document.title` and the feedback slug keep
   `kit/<part>`, because the name is the identity `verify.mjs` checks
   against the manifest row and the address the feedback is filed under.
```

<a id="section"></a>

## `kit-page.mjs` section

```text
🔴 A SECTION THAT THROWS IS THE DEFECT THIS PAGE EXISTS TO FIND, so it is
caught and RECORDED rather than allowed to stop the page. A component that
will not build takes every block below it with it when the error escapes,
which turns one broken control into a blank page and hides which one it
was. Both lists are asserted at the bottom.

🔴 `bare`: NO BOX, NO READOUT, THE SPECIMENS ARE BLOCKS OF THE PAGE. Asked
2026-09-26 about the PANEL part: *"don't wrap things in another wrappers
because instruments are already wrappers so it's unnecessary. information
footer is unnecessary. let the panels be the panels just extending to the
layout"*. An instrument panel has a border and a ground of its own; a
`.kit-box` round it is a bordered box round a bordered box, which is the
doubled edge `.pos-glue` and `.pos-report` both exist to avoid, one level
up. So `build` is handed `add` instead of a box, and every block it adds is
a child of the page's own stack, spaced by the page's one rhythm with
nothing typed.
```

<a id="section-element"></a>

## `kit-page.mjs` section element

```text
🔴 ONE ELEMENT PER SECTION, WHICH IS WHAT A STACK ASKS FOR. These four
used to be four children of the page, and a stack puts the project's one
gap between every pair of its children, so a title would have stood
40 px away from the sentence explaining it. A heading, its note, its
snippet and its specimen are one block; the air belongs BETWEEN blocks.
See demo/shell/stack.mjs.
```

<a id="land"></a>

## `kit-page.mjs` land

```text
🔴 A LINK TO A BLOCK LANDS ON THE BLOCK. Every section has an id off its
title, so `/kit/<part>/#slider` scrolls to it. It is not a check, it is
what a reader following a link gets, so it runs for everybody. Call it
once, after the last block is built.
```

<a id="overflow"></a>

## `kit-page.mjs` page overflow

```text
🔴 NOTHING DRAGS THE PAGE SIDEWAYS. `min-width: 0` missing from a
scrolling row makes it push the whole document instead of scrolling inside
itself: MEASURED at 390 px, a tabs row produced 141 px of page overflow.
The document, not the element, is the thing to measure, because the element
looks fine in exactly the case that is broken.
```

<a id="one-gap"></a>

## `kit-page.mjs` one gap

```text
🔴 THE BLOCKS KEEP THE PROJECT'S ONE GAP. In the monolith this was
   measured between the sections of the open tab; here the page's own stack
   holds them, so it is every pair of neighbours in `.pos-body`, a `bare`
   block's specimens included, against `--pos-gap` read off the root rather
   than typed here. A part with one child has no gap and says so.
```

<a id="addresses"></a>

## `kit-page.mjs` block addresses

```text
🔴 EVERY BLOCK HAS AN ADDRESS, AND THE ADDRESSES ARE THE MAP'S. The map
   in `kit-parts.mjs` is what the forwarder at `/kit/` sends an old link
   by, so it is a second copy of what this page builds, and a second copy
   is graded against the first: same ids, same order, each one resolving
   to exactly one element on this page.
   ⚠️ AND THE NEGATIVE HALF: a name no block has resolves to nothing.
```
