# Kit lessons: kit-parts

The longer comments cut from `demo/shell/kit-parts.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-kit-parts.md#<anchor>`.

<a id="header"></a>

## `kit-parts.mjs` module header

```text
demo/shell/kit-parts.mjs, which block of the kit lives on which part page.

🔴 THE BLOCK MAP, 2026-10-06, FOR THE KIT SPLIT (plans/plan-kit-split.md
section 2.4). `/kit/` was one page of eight tabs and every block on it had an
address, `/kit/#keyboard`, so links to blocks exist in this repository and in
people's notes. Once the parts are pages of their own at `/kit/<part>/`, an
old address has to be told where its block went, and this is where that is
written down.
⚠️ IT IS A SECOND COPY OF WHAT THE PAGES BUILD, SO BOTH ENDS ASSERT IT. Every
part page compares the ids its `section()` calls produced against its row
here, in order (`checkPage()` in `kit-page.mjs`), so a block added to a page
without being added here goes red on the page that added it. The forwarder,
which is `demo/kit/index.html` since step 4 of the plan, reads it and grades
only the lookup, because it builds nothing.
⚠️ THE ORDER IS THE TAB ORDER `/kit/` HAD, and the order inside a row is the
order of the blocks on that page, which is newest first.
⚠️ THE `slides` ROW WAS RE-DERIVED WHEN SLIDES MOVED TO `/kit/slides/` (step 4,
the same day) from that page's own `section()` and `slideBlock()` calls, and
that page asserts it like every other.
⚠️ AN ID IS THE TITLE, LOWER CASE, WITH EVERY RUN OF OTHER CHARACTERS A DASH,
which is `idFor` below and the same function the monolith used.
⚠️ `logo` IS THE NINTH PART, 2026-10-06 (*"add kit/logo page and use
individual slides from the brand slides"*): the logo left `/kit/`'s BRAND
tab for a `brand` deck on the front page, and came back as this part when
that deck was removed, one block per slide.
⚠️ `icons` IS THE ELEVENTH, 2026-10-10 (*"see ../eccm icon system. We need
one from icones. Make a sample sheet in one of kit pages called icons."*):
the Feather set vendored as demo/shell/icons.mjs, drawn whole. Its newest
block, ICON BUTTON, is `demo/shell/icon-button.mjs`, the same day.
```

<a id="chat"></a>

## `kit-parts.mjs` chat part

```text
⚠️ `chat` IS THE TWELFTH, 2026-10-11 (*"make it a kit page too and keep it
update while we work on chat for chat components"*): demo/shell/chat-ui.mjs,
the pieces the /room/ concept pages draw their chat with.
```

<a id="frontpage"></a>

## `kit-parts.mjs` frontpage part

```text
`frontpage` IS THE THIRTEENTH, 2026-10-12 (*"add new kit card / page. name
it fronpage. lets work on it. first do typograpy sampler"*): the faces the
site is set in today, and the sans faces measured against the brand mono.
Archived 2026-10-13 (*"Archive frontoage kit"*): still served and its
blocks still resolve, off /kit/'s cards, listed on /archive/.
```

<a id="share"></a>

## `kit-parts.mjs` share part

```text
`share` IS THE FOURTEENTH, 2026-10-13 (*"Build frontpage og card and apply
to all pages"*): the share card, demo/shell/share-card.mjs, as it ships.
```
