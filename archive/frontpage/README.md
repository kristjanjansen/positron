# archive/frontpage: the front page before the concepts took it

Retired 2026-10-13 on *"when all is done, move concepts to frontpage. use
http://127.0.0.1:8890/kit/frontpage/ on top THE HERO, LARGE. rename all with
group/slug, rm numbers"*, then *"keep same boxes style"*. Nothing in here is
loaded, imported or deployed.

- `menu.html` was `workers/view/menu.html`, the deployed front page:
  `workers/view/build.mjs` replaced its `<!--DEMOS-->` and `<!--NOTES-->` markers
  with `byGroup(DEMOS).map(groupHTML)` and `NOTES.map(noteHTML)` from
  `demo/manifest.mjs`, and its script ran `markIndex()` (caps.mjs, a row the
  browser cannot run un-linked with the reason in words, and the headset offer)
  and `mountDecks()` (the slide decks under `slides`).
- `demo-index.html` was `demo/index.html`, the dev server's copy of the same
  page, rendering the same rows with the same functions in the browser.

What replaced them is `demo/index.html`: THE HERO, LARGE (`demo/shell/hero.mjs`)
over the concept cards of `demo/shell/concept-list.mjs`, which the build copies
as it is. The manifest's `byGroup`, `groupHTML` and `noteHTML` are still in
`demo/manifest.mjs` and have no caller now; the decks and the headset offer are
not on the new front page. `/concepts/` answers 302 to `/`.
