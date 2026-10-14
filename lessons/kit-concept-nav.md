# Kit lessons: concept-nav

The longer comments cut from `demo/shell/concept-nav.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-concept-nav.md#<anchor>`.

<a id="header"></a>

## `concept-nav.mjs` module header

```text
demo/shell/concept-nav.mjs: previous and next links in a concept page's header,
on the same line as `← positron`, walking the order in concept-list.mjs.
`← positron` goes to the front page, which is the concepts index since
2026-10-13 (*"move concepts to frontpage"*), and every link here is a
/<group>/<slug>/ address, never a number.
```

<a id="code-rows"></a>

## `concept-nav.mjs` CODE_ROWS

```text
How many lines a concept page's code box shows before it scrolls, one number
for every page. Asked 2026-10-12: *"too little h. fix is something sensible
on all code wins"*, after half of each page's own count left four lines.
Then 2026-10-13: *"make code boxes 1/3 less h"*: 14 to 9 lines.
```

<a id="heading"></a>

## `concept-nav.mjs` heading

```text
The heading is the concept's title from concept-list.mjs, never a number.
Asked 2026-10-12: *"use real title. rm numbers from titles and <> pagers"*.
```

<a id="description"></a>

## `concept-nav.mjs` description

```text
The card's description under the title, on every concept page, from the
one list the cards read. Asked 2026-10-12: *"Add convepts descs under each
concept totle in each concept page"*. A page that set its own `what` keeps it.
```

<a id="edges"></a>

## `concept-nav.mjs` prev and next edges

```text
Next keeps the right edge and previous the left, whether or not the other
exists. Asked 2026-10-13 on a phone shot of Keyboard, the first page, where
the lone next link sat on the left: *"Next link always to right"*.
```

<a id="cc-nav"></a>

## `concept-nav.mjs` cc-nav style

```text
Prev and next as the titles are written, bigger, and on a phone their
own row right under the back link, spread to both edges. Asked
2026-10-12: *"Move prev next closer to vackling, bigther, sentence
case, justify between"*. The row keeps the back link's air under it,
so the links inside it give up their own.
```

<a id="pos-code"></a>

## `concept-nav.mjs` pos-code style

```text
Code boxes on concept pages: three times the kit field's 7px 9px.
Asked 2026-10-12: *"make code win 1/2 less h and add 3x padding. same
on other code wins"*; the pages halve their own `rows`.
Then *"30% less padding on code boxes. 15% more line height"*: 15px
19px, and the code field's 1.45 times 1.15. MEASURED: the kit sets it
in `.pos-field.tall.code textarea` (0,3,1), so this ties that weight
and wins by coming later. Then *"5% less lineheight"*: 1.67 to 1.59.
```
