# demo/shell/brand-slides.css: the comments that left the stylesheet

Every comment below was cut from `demo/shell/brand-slides.css` on 2026-10-14 and is kept here verbatim. The stylesheet keeps a short version where one was worth keeping, and a pointer `/* why: lessons/css-brand-slides.md#<anchor> */` to the section below. Line numbers are from before the cut.

<a id="file-header"></a>

### brand-slides.css `file header` (line 1)

````css
/* demo/shell/brand-slides.css: the rules only the brand slides need, moved out
   of slide.css with the slides themselves on 2026-10-06, when the `brand` deck
   became the blocks of /kit/logo/ (brand-slides.mjs). Each rule is scoped to
   `.brand-sl`, the class /kit/logo/ puts on every block holding one of these
   slides, at the weight the `.sl-player` form had, so it still beats the
   slide's own rules. */
````

<a id="brand-sl-sl-aria-label-logo-sl-line-sl-hi"></a>

### brand-slides.css `.brand-sl .sl[aria-label="logo"] .sl-line .sl-hi` (line 12)

````css
/* THE + AS A SUPERSCRIPT, as the positron is written, β⁺. Asked 2026-10-05:
   *"+ as superscript?"*. A span raised and made smaller rather than U+207A,
   which the vendored subsets do not carry. */
````

<a id="brand-sl-sl-aria-label-logo-sl-line-sl-line-not"></a>

### brand-slides.css `.brand-sl .sl[aria-label="logo"] .sl-line + .sl-line:not(.sl-line + .sl-line + .sl-line)` (line 16)

````css
/* ONE EMPTY LINE between β+ and the wordmark, asked 2026-10-06 as *"add one
   line bettween β+ and workmark"*, a line of the wordmark's own step (`1lh`). */
````

<a id="dk-apps"></a>

### brand-slides.css `.dk-apps` (line 26)

````css
/* the two app icons stand further apart, *"add hor gap a biiit"* */
````
