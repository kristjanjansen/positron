<!-- research/cascade-cures-2026-09-26.md -->
<!-- Produced 2026-09-26 by a web research agent with five parallel researchers.
     Support figures are read from api.webstatus.dev and browser-compat-data on
     the day (Chrome 154, Firefox 156, Safari 27), not from memory, because
     caniuse is stale on two of the features. Four scripts were WRITTEN AND RUN
     against real headless Chrome for section 5, and stylelint and css-analyzer
     were run read-only against shell.css for section 6. It is the fourth of
     four strands behind the composition skill written the same day. Section 0
     lists four premises of the brief that did not survive checking, the first
     of which corrected a sentence already in the skill: container queries fix
     the own-box half of the media query problem and not the ordering half. -->

# Cascade side effects: structural cures, measured 2026-09-26

Five researchers ran in parallel. Everything below was fetched or measured today. Browser stable versions on the day: Chrome 154 (2026-09-22), Firefox 156 (2026-09-15), Safari 27 (2026-09-14). Support figures come from the webstatus.dev API and MDN browser-compat-data, not from memory, because caniuse is stale on two of the features below.

Nothing in the repo was edited. One researcher did run stylelint and css-analyzer against `demo/shell/shell.css` read-only, and those numbers are in section 6.

---

## 0. Four premises in the brief that did not survive checking

Put these first because they change what to build.

**Container queries do not fix "a media query nothing can enter".** `@container` adds no specificity and is resolved by source order exactly like `@media`. A `@container` block placed above a plain rule of equal specificity loses in precisely the same way. What container queries fix is a different bug: the query asking about the viewport when the component wanted to know about its own available space. The cure for the ordering bug is `@layer`, or removing the second rule altogether with an intrinsic expression. Source: [MDN Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity), which states that at-rules are not selectors and contribute no weight, and that "if the competing selectors have the same values in all the three columns... the last declared style gets precedence."

**`gap` is never coming to block layout.** The CSSWG considered it in 2018 and declined, on the record. Tab Atkins in [csswg-drafts#3068 "[css-align] gap properties for block layout"](https://github.com/w3c/csswg-drafts/issues/3068): "Margin collapsing and floats and similar complexities of block layout make this much more complicated than for flex/grid/multicol, so we're not planning on trying to make it work." fantasai repurposed the issue into `margin-trim`, resolved 2018-10-22. [css-gaps-1](https://drafts.csswg.org/css-gaps-1/) still says "Applies to: multi-column containers, flex containers, grid containers, and grid lanes containers". Any plan resting on "gap will eventually work in flow layout" rests on something answered no eight years ago.

**`margin-trim`, the thing that shipped instead, is Safari-only in stable today.** caniuse lists Chrome 155, but Chrome 155 reaches stable on **2026-10-06**, ten days from now (chromiumdash milestone schedule). Today it is Safari 16.4+ and nothing else, 15.04% global, Baseline **limited**, Firefox prototyping behind `layout.css.margin-trim.enabled`. Rachel Andrew found eleven days ago that Safari's implementation covers block containers but not multicol while Chrome's covers both, and `@supports` cannot distinguish them: ["Remove start and end margins with the margin-trim property"](https://rachelandrew.co.uk/archives/2026/09/15/remove-start-and-end-margins-with-the-margin-trim-property/).

**`stretch` shipped in Chrome 138 (2025-06-24), not 129.** Chrome 129 was `calc-size()` and `interpolate-size`. Safari got `stretch` in 27, twelve days ago. Firefox has none at 156. Baseline limited.

---

## 1. Modern CSS that structurally prevents these bugs

### Support, all read today from `api.webstatus.dev`

| feature | Baseline | cross-browser since | "widely" since | Chrome / Firefox / Safari |
| --- | --- | --- | --- | --- |
| Cascade layers | widely | 2022-03-14 | 2024-09-14 | 99 / 97 / 15.4 |
| `:is()` / `:where()` | widely | 2021-01-21 | 2023-07-21 | 88 / 82 / 14 |
| Logical properties | widely | 2021-09-20 | 2024-03-20 | 89 / 66 / 15 |
| Container size queries | widely | 2023-02-14 | 2025-08-14 | 105 / 110 / 16 |
| `:has()` | widely | 2023-12-19 | 2026-06-19 | 105 / 121 / 15.4 |
| Subgrid | widely | 2023-09-15 | **2026-03-15** | 117 / 71 / 16 |
| CSS nesting | widely | 2023-12-11 | **2026-06-11** | 120 / 117 / 17.2 |
| Media query range syntax | widely | 2023-03-27 | 2025-09-27 | 104 / 102 / 16.4 |
| `@property` | **newly** | 2024-07-09 | not yet | 85 / 128 / 16.4 |
| `@scope` | **newly** | see note | not yet | 118 / 146 / 17.4 |
| Container **style** queries | **newly** | **2026-05-19** | not yet | 111 / 151 / 18 |
| `margin-trim` | **limited** | never | never | 155 (10 days away) / none / 16.4 |
| `stretch` | **limited** | never | never | 138 / none / 27 |
| `width: fit-content(<len>)` | **limited** | never | never | none / 91 behind a pref / none |
| CSS `if()` | **limited** | never | never | 137 / none / none |

`@scope` note: the engines are Chrome 118 (Oct 2023), Safari 17.4 (Mar 2024), Firefox 146 (2025-12-09), caniuse global **91.66%**. web-features dates Baseline to 2026-03-24 because the last sub-behaviour landed in Safari 26.4. All three engines have had it in stable for nine months or more, so it is usable now, with one caveat in 1.2.

Subgrid and nesting both crossed into "widely available" this year, in March and June. That is worth knowing: they are no longer the new thing.

### 1.1 `@layer`: the single highest-value change for this codebase

**Rule: a rule in a later layer beats a rule in an earlier layer no matter what the selectors say, so ordering replaces specificity as the thing you tune.**

[MDN @layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer): "once the layer order has been established, specificity and order of appearance are ignored." And the trap: "Styles that are not defined in a layer always override styles declared in named and anonymous layers."

```css
/* once, at the top of the file. This line alone fixes the order forever. */
@layer reset, base, layout, components, page, responsive;

@layer components {
  .panel { padding: 1rem 2rem; }        /* specificity 0,1,0, shorthand */
}
@layer page {
  .home-panel { padding-top: 0; }       /* 0,1,0 longhand, and it WINS */
}
@layer responsive {
  @media (width <= 40rem) { .panel { padding: 0.5rem; } }   /* position in the file no longer matters */
}
```

Four things about it that matter here:

- Layer order is fixed by the **first** declaration. A later `@layer utilities, base;` does nothing. [MDN Learn: Cascade layers](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Cascade_layers).
- `!important` **inverts** layer order. The first layer wins for important declarations. So a stylesheet that adopts layers and keeps its `!important`s gets a second, opposite ordering running underneath the first. The [Smashing retrofit piece, Sept 2025](https://www.smashingmagazine.com/2025/09/integrating-css-cascade-layers-existing-project/) says the author had to remove them methodically during migration: "any styles with an `!important` declaration suddenly shake things up".
- A `@media` block nested **inside** a named layer stays in that layer. A `@layer name;` statement placed inside a `@media` that does not match does not create the layer at all. Those are different things and only the second is a trap.
- No build step needed. `@import "x.css" layer(components);` works natively, and `@import` must precede everything except `@charset` and `@layer` statements ([MDN @import](https://developer.mozilla.org/en-US/docs/Web/CSS/@import)).

Miriam Suzanne's recommendation is to layer everything and treat unlayered CSS as a deliberate override tier rather than an accident. The Smashing author went further and refused unlayered styles entirely: "I like the idea of keeping all styles organized in explicit layers because it keeps things modular and maintainable."

`revert-layer` is the escape hatch, Baseline widely since March 2022 ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/revert-layer)): it rolls a property back to whatever the previous layer said, so a component can undo a page override without knowing what the override was.

**Cures incidents B (shorthand beat longhand) and C (media query below a plain rule).** Ahmad Shadeed's example is your incident B almost verbatim ([Hello, CSS Cascade Layers](https://ishadeed.com/article/cascade-layers/)):

```css
@layer components { .c-page-header { padding: 1rem 2rem; } }
@layer utils      { .p-0 { padding: 0; } }   /* lower specificity, still wins */
```

### 1.2 `@scope` and the donut

**Rule: `@scope (root) to (limit)` limits a rule's reach by DOM position instead of by selector specificity, and bare selectors inside it cost zero extra specificity.**

[MDN @scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope). The upper bound is inclusive, the lower bound exclusive. Adjust with `> *`:

```css
@scope (.article-body) to (figure) {
  img { border: 5px solid black; }     /* specificity 0,0,1, as if :where(:scope) were prepended */
  :scope img { /* 0,1,1, because :scope is a real pseudo-class at 0,1,0 */ }
}
```

The donut is the point: style a component's own chrome, its padding, its border, its header, and stop dead at nested components. Term coined by Nicole Sullivan in 2011, per the [Smashing Feb 2026 piece](https://www.smashingmagazine.com/2026/02/css-scope-alternative-naming-conventions/), which argues it replaces BEM-style naming: "it prevents the risk of broken styles if classnames change or are misused or if the HTML structure were to be modified."

`@scope` also adds a **new cascade step**, scoping proximity: with two competing scopes, the one whose root is fewer DOM hops away wins. MDN: "Scoping proximity overrules source order but is itself overridden by other, higher-priority criteria such as importance, layers, and specificity."

Caveat worth carrying: MDN warns "The specificity of `&` inside `@scope` blocks is handled differently according to the browser engine and release version." Use bare selectors or `:scope`, not `&`, inside `@scope`, until that settles.

**Helps incident A** (a component's padding should not have been reachable from four levels down in the first place) and **incident G** (a scoped rule dies visibly with its root rather than lingering as a dead global selector).

### 1.3 `:where()` and `:is()`

**Rule: `:where()` replaces its contents' specificity with 0-0-0; `:is()` takes the highest specificity of its arguments, and so does `:not()`, `:has()`, and the nesting `&`.**

[MDN Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity), verbatim: "The specificity-adjustment pseudo-class `:where()` always has its specificity replaced with zero, `0-0-0`."

```css
/* reset and base rules that anything can override without a fight */
:where(button, input, select) { font: inherit; }

/* grouping without an id leaking its weight in */
:is(#legacy, .modern) .row { }   /* 1,0,0 + 0,1,0 -- the #legacy weight applies even to .modern matches */
:where(#legacy, .modern) .row { } /* 0,0,0 + 0,1,0 */
```

[CSS-Tricks on the trick](https://css-tricks.com/where-has-a-cool-specificity-trick-too/): start with `:is()`, "back off to `:where()`" when the rule needs to be beatable. Both are forgiving selector lists, which is also how you ship a `:has()` rule that degrades instead of killing the whole block.

### 1.4 Container queries and the `cq*` units

**Rule: `container-type` turns an element into something its descendants can measure, so a component asks about its own available space rather than about the window.**

[MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries):

```css
.panel { container: panel / inline-size; }

@container panel (width > 40rem) { .panel__body { display: grid; grid-template-columns: 1fr 1fr; } }
.panel__title { font-size: max(1rem, 1.2cqi + 0.8rem); }   /* no breakpoint at all */
```

Units: `cqw` `cqh` `cqi` `cqb` `cqmin` `cqmax`, each 1% of the named dimension of the nearest query container. With no eligible container they fall back to small viewport units.

Three gotchas, all real:

- **An element cannot query itself.** Rules inside `@container` apply to descendants of the container. Every component that wants to respond needs a wrapper.
- **`container-type` changes layout.** MDN's current wording: `inline-size` applies **style** and **inline-size** containment, `size` applies style and size containment in both axes. `size` collapses the box unless you give it a block size. It also establishes an independent formatting context, which means **margin collapsing stops** inside it. Nothing in the syntax says so.
- **Chrome 129 changed it out from under the other engines.** Before 129, `container-type: inline-size` made the element a containing block for absolutely positioned descendants and a stacking context. Chrome removed both, calling the original spec a design mistake (Chromium issue 369781727). The CSSWG resolution is that "container-type does not force layout containment, but does force an independent formatting context". Firefox and Safari followed the old behaviour for a while. If a positioned descendant moves when you add a container, this is why, and `contain: layout` restores the old behaviour deliberately.

**Cures the underlying intent of incident C** but not the ordering. See section 0.

### 1.5 `:has()`

**Rule: `parent:has(child)` lets the ancestor take responsibility instead of the descendant fighting upward.**

Baseline widely since Dec 2023. Specificity is that of the most specific argument. Cannot be nested inside another `:has()`, and pseudo-elements are valid neither as the anchor nor inside the argument ([MDN :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)).

```css
/* incident A, as an ancestor opt-out rather than three child overrides */
.frame:has(> .bleed) { padding-inline: 0; }

/* per-child spacing in prose, which gap cannot express */
h1:has(+ h2) { margin-block-end: 0.25rem; }
```

Performance advice that is consistent across sources: constrain both sides. `A:has(B)` re-checks B's subtree on DOM mutation, so keep A narrow and B tightly scoped with a child combinator.

### 1.6 Logical properties

**Rule: `padding-inline` / `padding-block` are two longhands where `padding` is one shorthand, so you can set the axis you mean without clobbering the other.**

This is the real reason they reduce override count, and it is not the writing-mode argument. Writing `padding-block: 1rem 0.5rem; padding-inline: 2rem;` in the component leaves a page rule free to change one axis without a shorthand fight.

The cascade interaction is settled and worth knowing exactly. [css-logical-1](https://drafts.csswg.org/css-logical-1/): "paired properties share a computed value. This shared value is determined by cascading the declarations of both properties together as one... the computed value of both properties in the pair is derived from the specified value of the property declared with higher priority in the CSS cascade." So logical and physical do **not** sit in separate buckets. `margin-inline-start: 1px; margin-left: 2px;` in one block gives 2px in LTR, by declaration order. The spec notes this forced implementations to start preserving declaration order within a block, which they had not previously had to.

Stylelint now has this built in as `property-layout-mappings` (17.8.0), taking `"flow-relative"` or `"physical"`. See section 6.

### 1.7 Subgrid

**Rule: a nested component adopts the parent's tracks instead of guessing at them, so the layout owner stays the layout owner one level down.**

Baseline **widely available since March 2026**, available across browsers since September 2023 ([MDN Subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid)).

```css
.grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 20px; }
.item {
  display: grid;
  grid-column: 2 / 7;
  grid-template-columns: subgrid;   /* takes the parent's 5 columns; line numbering restarts at 1 */
  row-gap: 0;                       /* parent gaps are inherited and can be overridden */
}
```

Limits: the element must be a grid item and must itself be `display: grid`; a subgridded dimension cannot create implicit tracks, so extra items land in the last track.

### 1.8 CSS nesting, and the honest answer about specificity

**Rule: nesting raises specificity silently, because `&` takes the highest specificity in the parent selector list exactly like `:is()`.**

[MDN Nesting and specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting/Nesting_and_specificity) gives the worked case:

```css
#a, b { & i { color: blue; } }   /* & i is 1-0-1, because of the #a that never matched */
.foo i { color: red; }           /* 0-1-1, loses */
```

So nesting **hurts** unless you wrap: `:where(#a, b) { & i { } }` brings it back to 0-0-1. The other limitation: you cannot concatenate. `&Element` is invalid; it must be `Element&`.

Verdict for a 7000-line plain-CSS file: nesting is fine for organising, and it is a specificity risk exactly when the parent selector list is heterogeneous. Stylelint 17 now calculates specificity per the nesting spec, so `selector-max-specificity` will see this.

### 1.9 Style queries

**Rule: `@container style(--x: y)` branches on a custom property's computed value, which turns a mode into data that inherits instead of a class that has to be propagated.**

Baseline **newly available 2026-05-19**, four months old, when Firefox 151 landed. Chrome 111, Safari 18. This is the newest thing in this report that is usable at all.

```css
.mode { --scheme: dark; }
@container style(--scheme: dark) { .card { background: #111; color: #eee; } }
@container style(0 < --n < 10)   { .tally { font-variant-numeric: tabular-nums; } }
```

All elements are style containers by default; `container-type` is not required and `normal` does not disqualify. Only **custom properties** are queryable; `@container style(font-weight: bold)` is specced but not implemented anywhere. Registered and unregistered properties differ on the valueless form `style(--x)`: unregistered always returns true, registered returns true only when the value differs from `initial-value`. Do not apply, inside a style query, the property you queried on the element you are styling: infinite loop. Source: [MDN container size and style queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_size_and_style_queries).

**Directly relevant to incident E.** `@container style(--mode: on)` has no empty-string ambiguity, because it compares a computed value rather than testing for an attribute's presence.

### 1.10 `@property`

**Rule: registering a custom property gives it a type and an initial value, so a bad value falls back instead of poisoning the declaration.**

Baseline newly available since July 2024. Still not "widely" (that needs 30 months, so around January 2027).

The failure it prevents is specific and nasty. An unregistered custom property accepts nearly anything at parse time, so the error surfaces at `var()` substitution as **invalid at computed-value time**, and [MDN's rule](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties) is: "When the browser encounters an invalid `var()` substitution, then the initial or inherited value of the property is used." Not the previous declaration. So `--text-color: 16px` used in `color` does not fall back to the `color: blue` above it, it inherits or goes to black. Registering the property makes the bad value fall back to `initial-value` instead.

```css
@property --ar   { syntax: "<number>";  inherits: false; initial-value: 1.7778; }
@property --pad  { syntax: "<length>";  inherits: true;  initial-value: 1rem; }
```

`syntax` and `inherits` are both required. `initial-value` is required unless `syntax: "*"`, and must be computationally independent, so `200px` is legal and `3em` is not. Registered properties also become animatable and interpolatable, and stylelint's `declaration-property-value-no-unknown` reads the registrations.

### 1.11 CSS `if()`, and why not yet

Chrome and Edge 137 only. No Firefox, no Safari. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/if) banner: "Limited availability - This feature is not Baseline". It is the right shape for this problem, computing a value in one declaration instead of writing a second rule that can lose the cascade, but it is not shippable. If used at all, write the plain fallback first and let `if()` override it.

---

## 2. Margin collapsing, exactly

CSS2.2 §8.3.1 is still the only normative definition. [css-box-4](https://drafts.csswg.org/css-box-4/) says only "Note: Adjoining margins in block layout collapse. See CSS2§8.3.1 for details." So citing a 2011 spec here is correct, not lazy. Text: [w3.org/TR/CSS22/box.html#collapsing-margins](https://www.w3.org/TR/CSS22/box.html#collapsing-margins).

**The whole adjoining test, verbatim.** Two margins are adjoining if and only if both belong to in-flow block-level boxes in the same block formatting context, no line boxes / clearance / padding / border separate them, and they form one of exactly four pairs:

1. top margin of a box and top margin of its first in-flow child
2. bottom margin of a box and top margin of its next in-flow sibling
3. bottom margin of a last in-flow child and bottom margin of its parent, if the parent's computed height is `auto`
4. top and bottom margins of a box that establishes no BFC and has zero computed `min-height`, zero or `auto` `height`, and no in-flow children

Plus the recursion clause, which is why four or more margins can end up in one space: "A collapsed margin is considered adjoining to another margin if any of its component margins is adjoining to that margin."

Three global exceptions: the root element's margins never collapse; an element with clearance does not collapse into its parent's bottom margin; and a box with non-zero `min-height` and `auto` `height` does not pass a collapse through to its parent's bottom margin.

**The axis question is settled, and one researcher flagged it as open before I found the answer.** CSS2.2 says "vertical" and "Horizontal margins never collapse", which predates writing modes. [css-writing-modes-4](https://drafts.csswg.org/css-writing-modes-4/) resolves it: "The `margin-left` property still affects the lefthand margin, for example; however in a `vertical-rl` writing mode it takes part in margin collapsing in place of `margin-bottom`." So collapsing follows the **block axis**, and "only block-direction margins collapse" is a fact, not an assumption.

**Where margins never collapse at all**: floats (not even with their own in-flow children), elements establishing a BFC (not with their in-flow children), absolutely positioned boxes, inline-blocks, and flex and grid containers with their contents. The flexbox spec puts it plainly: "the flex container's margins do not collapse with the margins of its contents."

**What stops a collapse: two mechanisms, and conflating them is the usual mistake.**

Mechanism one, something physically separates the two margins: a line box, clearance, padding, or a border between them. Josh Comeau's framing in [The Rules of Margin Collapse](https://www.joshwcomeau.com/css/rules-of-margin-collapse/): "You can think of padding/border as a sort of wall. If it sits between two margins, they can't collapse... Even a 1px-wide border will stop the margins from collapsing." And the per-side qualifier that catches everyone: "If an element has `padding-top: 8px`, that won't stop its bottom margin from collapsing."

Mechanism two, a new block formatting context. The complete list is on a **different MDN page** from the collapsing page, which is why nobody has the whole thing: [Block formatting context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Block_formatting_context). Root element, floats, absolutely and fixed positioned elements, inline-blocks, table cells and captions, `display: flow-root`, flex and grid items, block elements where `overflow` is other than `visible` **and `clip`**, `contain: layout | content | paint`, **query containers (`container-type` other than `normal`)**, multicol containers, and `column-span: all`.

Two of those bite people who have never heard of margin collapsing: `overflow: clip` does **not** create a BFC while `overflow: hidden` does, and adding a container query to an element silently turns off margin collapsing inside it.

```css
.parent { display: flow-root; }   /* does exactly this and nothing else, no side effects */
.parent { overflow: hidden; }     /* also clips, also a scroll container */
.parent { padding-top: 0.05px; }  /* the pre-2018 hack */
```

**Negative margins, the exact algorithm**, CSS2.2 verbatim: "the resulting margin width is the maximum of the collapsing margins' widths. In the case of negative margins, the maximum of the absolute values of the negative adjoining margins is deducted from the maximum of the positive adjoining margins. If there are no positive margins, the maximum of the absolute values of the adjoining margins is deducted from zero." So: largest positive plus most negative. `{+72, +24, -30, -10}` gives 42. `{-25, -75}` gives -75. MDN and Comeau both agree.

**The empty block, worked.**

```css
p       { margin: 20px 0; }
.spacer { margin: 40px 0; }   /* no height, no padding, no border, no content */
```
```html
<p>One</p><div class="spacer"></div><p>Two</p>
```

The spacer's own 40 and 40 collapse through it, and that single 40 is adjoining to both paragraphs' 20s. Result: **40px total**, and the spacer contributes nothing of its own. Give it `height: 1px` and you get 20 + 1 + 40. And the positioning note that explains the weirdness: "the positions of elements that have been collapsed through have no effect on the positions of the other elements with whose margins they are being collapsed."

A `<br>` between two paragraphs is not this case. It generates a line box, so it blocks the collapse and you get 32 + 32 rather than 32.

**The case that starts the whole "who owns the space" argument:**

```html
<section class="blue"><p>Paragraph One</p></section>
<section class="pink"><p>Paragraph Two</p></section>
```
```css
.blue, .pink { /* no margin at all */ }
p { margin-top: 32px; }
```

The paragraph's 32px escapes to the outside of each coloured box. Comeau: "The trouble is that 0px margin is still a collapsible margin."

---

## 3. Who owns the space

### The canonical statement

Every Layout's [Stack](https://every-layout.dev/layouts/stack/), verbatim, and the argument is tighter than the summaries of it:

> "We are in the habit of styling elements, or classes of elements, directly: we make style declarations belong to elements. Typically, this does not produce any issues, but **margin is really a property of the relationship between two proximate elements**."

> "The trick is to style the context, not the individual element(s). The Stack layout primitive injects margin between elements via their common parent."

```css
.stack > * + * { margin-block-start: 1.5rem; }
```

Note `margin-block-start`, logical. Heydon's [2014 original](https://alistapart.com/article/axiomatic-css-and-lobotomized-owls/) used `margin-top`, and the update is the right one. His formulation is the memorable one:

> "margins are something that exist between elements. Simply giving an element a top margin makes no sense, no matter how few or how many times you do it. It's like applying glue to one side of an object before you've determined whether you actually want to stick it to something."

And the payoff that `gap` gives you for free but that nobody states as clearly: "**No margin, regardless of nesting level, will ever meet padding.**"

[CUBE CSS](https://cube.fyi/composition.html) names this as an architectural layer, Composition: "the composition handles how things stitch together, regardless of what component they happen to be." Its primitive is `.flow > * + * { margin-top: var(--flow-space, 1em); }`.

### The per-child exception, which is the answer to "gap cannot vary"

Every Layout's exception mechanism, which works because `*` has zero specificity so both rules tie and source order decides:

```css
.stack > * + *   { margin-block-start: var(--space, 1.5em); }
.stack-exception,
.stack-exception + * { --space: 3rem; }
```

Andy Bell's [`--flow-space`](https://24ways.org/2018/managing-flow-and-rhythm-with-css-custom-properties/) is the same idea keyed on the element: `h2 { --flow-space: 3rem; }`. He is a co-author of Every Layout and the author of CUBE, so this is the movement correcting itself rather than an outside critique. This is the single strongest argument against `gap` in prose: `gap` is one number for the whole container, and an `h2` legitimately wants more space above it than between two paragraphs, and wants that space to scale with its own font size (which `em` gives you and a container `gap` cannot).

### Tailwind, and its retreat

`space-y-<n>` compiles, in v4.3, to:

```css
& > :not(:last-child) {
  --tw-space-y-reverse: 0;
  margin-block-start: calc(calc(var(--spacing) * <n>) * var(--tw-space-y-reverse));
  margin-block-end:   calc(calc(var(--spacing) * <n>) * calc(1 - var(--tw-space-y-reverse)));
}
```

Their own Limitations section: the utilities "aren't designed to handle complex cases like grids, layouts that wrap, or situations where the children are rendered in a complex custom order rather than their natural DOM order", and "**it's better to use the gap utilities when possible**". Note what "when possible" is carrying: `gap` is not possible in block layout, and their stated fallback is margin plus a negative margin on the parent, which is hand-rolled `margin-trim`. Source: [Tailwind margin docs](https://tailwindcss.com/docs/margin#adding-space-between-children).

### Josh Comeau's reset, stated accurately

[My Custom CSS Reset](https://www.joshwcomeau.com/css/custom-css-reset/) has `*:not(dialog) { margin: 0; }` (the `dialog` exception preserves its `margin: auto` centring), with the reasoning "**In my opinion, margin is a design concern, and not something that should be applied by default.**" The reset page does **not** mention `gap` or layout ownership; that is a different article. "Comeau says use gap instead of margin" is a merge of two pieces and overstates him. What he actually says in the collapse article is: "I think layout components are awesome, but I also recognize that margin is **universal**."

### The critiques of the owl, ordered by what they actually cost

1. **Hidden elements still count as siblings. This is the real bug.** `display: none` removes the box, not the sibling relationship. If the first child of a Stack is CSS-hidden, the second matches `* + *` and gets stray space at the top of the container. `gap` cannot have this bug, because a `display: none` element generates no box and is not an item. In a framework, `{cond && <Thing/>}` is fine because nothing renders; `<Thing hidden/>` breaks it. Source: [LogRocket, modern guide to the owl selector](https://blog.logrocket.com/css-lobotomized-owl-selector-modern-guide/).
2. **`display: contents` wrappers break it entirely.** They exist for selector matching and generate no box. Same root cause: the selector matches the DOM, the layout uses boxes, and those are not the same list.
3. **Shadow DOM.** `::slotted()` accepts only compound selectors, so `* + *` cannot be expressed against slotted content. Heydon in 2014 cited Shadow DOM as a benefit; in practice the problem is the opposite.
4. **Scoped-CSS toolchains forbid it.** vanilla-extract and css-blocks disallow sibling combinators.
5. **Unscoped `* + *` hits `body`** (adjacent sibling of `head`). Every Layout and CUBE both scope it; only literal copies of the 2014 article break.
6. **Zero specificity cuts both ways.** It is the design, and it means anything at all silently wins, invisibly. The common "fix" `> *:not(:first-child)` raises specificity and breaks the `--space` exception trick.
7. **Performance is a non-issue and has been since 2014.** Heydon cites Souders and Frain: "sweating over the selectors used in modern browsers is futile." Nothing has contradicted it. Do not use this argument.

### The 2026 consensus, and where it actually diverges

Unanimous: a component does not set its own outer margin; in flex and grid use `gap` (Baseline widely since October 2017); reset default margins and reintroduce spacing at the layout layer; and in flow layout the owl or an equivalent container-owned rule is still how it is done, because `gap` does not work there and is not coming.

Divergent, and usually quoted as if it were one position:

- **Max Stoiber, ["Margin considered harmful"](https://mxstbr.com/thoughts/margin)**, four words: "Use spacers. Ban margin." Every Layout's Stack *is* margin; it only moves who writes it. Those are different positions and Stoiber's is unachievable in flow layout without converting containers to flex.
- **Kyle Shevlin, ["Prefer Gaps To Margins"](https://kyleshevlin.com/prefer-gaps-to-margins/)** has the cleanest one-liner in the corpus: margin is a child-to-sibling strategy, `gap` is a parent-to-children strategy.
- **Rachel Andrew** prescribes `display: flow-root` and now `margin-trim`, fixing collapsing where it hurts rather than abolishing margin: ["Margins in CSS"](https://www.smashingmagazine.com/2019/07/margins-in-css/).

### The honest counter-arguments

1. `gap` is one number and prose needs several (see `--flow-space` above).
2. `em`-based margins scale with type; a container `gap` gives a caption the same space as a heading.
3. Margin collapsing is a **feature** for documents. It is what stops a heading's bottom and a paragraph's top from doubling in hand-authored or CMS HTML where you do not control the element sequence.
4. **Converting a container to flex column just to get `gap` changes more than spacing.** You lose margin collapsing inside, change float containment, change `display: contents` child behaviour, and can change print and selection behaviour. This cost is almost never mentioned in the "prefer gap" pieces and is the main reason not to reach for it on a prose container.
5. Some components really do own their space, and `--space` exceptions keyed on the child are the parent granting the child a say, which is a more honest description than "the parent owns the space".
6. The hidden-sibling bug is real and `gap` does not have it.

### `margin-trim`, for completeness

```css
article { margin-trim: block; padding: 2lh; }
article p { margin-block: 1lh; }
```

Values `none | block | block-start | block-end | inline | inline-start | inline-end`, combinable. [WebKit's framing](https://webkit.org/blog/16854/margin-trim/): "The `margin-trim` property lets you tell a container to trim the margins off its children, any margins that push up against the container." Safari 16.4+ only in stable today. Chrome 155 lands 2026-10-06. Not Baseline, 15.04% global, and `@supports` cannot tell the partial implementation from the complete one. Worth knowing about; not worth shipping as the only answer.

---

## 4. Intrinsic sizing

### The keywords

**`min-content`** ([css-sizing-3](https://drafts.csswg.org/css-sizing-3/#intrinsic-sizes)): "the inline size that would fit around its contents if **all** soft wrap opportunities within the box were taken." Practically, the longest unbreakable thing. **Anything that removes wrap opportunities silently raises it to the full content width**: `white-space: nowrap`, a long URL, a `<pre>`, a fixed-size replaced element. That sentence is the whole of the flex truncation bug below.

**`max-content`**: "the narrowest inline size it could take while fitting around its contents if **none** of the soft wrap opportunities were taken." It never consults available space.

In the **block** axis both collapse: "for a box's block size, unless otherwise specified, this is equivalent to its automatic size." So `height: min-content` on an ordinary block is `height: auto`. They earn their keep in the block axis only in grid track sizing and flex.

**`fit-content`** (the keyword) is defined as `min(max-content, max(min-content, stretch))`. With min-content 80px and max-content 420px:

| available | result |
| --- | --- |
| 200px | 200px |
| 500px | 420px (shrink-to-fit, does not stretch) |
| 40px | 80px, overflows by 40, deliberately |

It is the only one of the three that looks at available space, and it is floored by min-content and will overflow rather than go below it.

**`fit-content(<length>)` as a width value works in no shipping browser.** browser-compat-data, read today: Chrome false, Safari false, Firefox 91 behind `layout.css.fit-content-function.enabled`. Baseline **limited**, WPT pass rate 0.059 in every engine. The grid track function of the same name has been fine since Chrome 57 / Firefox 52 / Safari 10.1. Write `width: fit-content; max-width: 40ch;` instead. They differ only when min-content exceeds the limit, and then something overflows either way; pick which.

**`stretch`**: "Applies stretch-fit sizing, attempting to match the size of the box's **margin box** to the size of its containing block." That is the whole difference from `100%`. With a 400px containing block and a child with 20px margins, 2px border, 10px padding, `width: 100%` overflows by 64px and `width: stretch` does not. Chrome 138, Safari 27, no Firefox. The fallback stack, from [CSS-Tricks, "We Completely Missed width/height: stretch"](https://css-tricks.com/we-completely-missed-width-height-stretch/):

```css
:root { --stretch: 100%; }
@supports (width: -moz-available)         { :root { --stretch: -moz-available; } }
@supports (width: -webkit-fill-available) { :root { --stretch: -webkit-fill-available; } }
@supports (width: stretch)                { :root { --stretch: stretch; } }
.child { width: var(--stretch); }
```

Firefox 146 understands `-webkit-fill-available` as an alias. caniuse's "Intrinsic & Extrinsic Sizing" entry is stale on this and still says Chrome has not unprefixed `stretch`; use webstatus.dev or browser-compat-data.

### The measure pattern

```css
.prose { max-inline-size: min(100%, 60ch); }   /* logical form, preferred */
p      { width: clamp(45ch, 50%, 75ch); }      /* Una Kravets' fluid measure */
```

MDN: "Despite its counterintuitive name, `min()` is commonly used to set a maximum size." It beats a media query for three reasons, and only the second is really about intrinsic design: there is no breakpoint value duplicated across two rules; **`100%` resolves against the containing block, not the viewport**, so the same declaration is correct in a full-width column and in a 300px sidebar where a media query is asking the wrong question; and it is one declaration instead of two that can be overridden separately.

Sources: [web.dev min(), max(), clamp()](https://web.dev/articles/min-max-clamp), [Ahmad Shadeed](https://ishadeed.com/article/css-min-max-clamp/), [Every Layout Axioms](https://every-layout.dev/rudiments/axioms/) for `--measure: 60ch`.

The `ch` caveat: css-values-4 defines it as "the used advance measure of the '0' (ZERO, U+0030) glyph". Sixty digit advances, not sixty characters, font-dependent, and it moves when a webfont arrives.

### Letting content decide

The auto-fit grid, and why the inner `min()` is not optional:

```css
.auto-grid {
  display: grid; gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
}
```

[Evan Minto's original](https://evanminto.com/blog/intrinsically-responsive-css-grid-minmax-min/): "Since each grid track has a _minimum_ size of `10rem`, they can't shrink below that size. That means when the container is smaller than `10rem`, the grid items overflow the container!" `minmax(A, B)` makes A a hard floor; `1fr` cannot take a track below its minimum, and `auto-fit` has already collapsed to one column by then. `min(100%, 20rem)` makes the floor itself conditional. Andy Bell's widely-copied `minmax(16rem, 1fr)` is 256px and **will** overflow a 240px container; cite Bell for the reasoning, Minto for the patch.

`auto-fill` versus `auto-fit`, from Sara Soueidan: `auto-fill` fills the row with as many columns as it can, and the new ones may be empty; `auto-fit` fits the currently available columns by expanding them and collapsing the empty ones. Invisible until the container is wider than your item count needs.

The Switcher, from [Every Layout](https://every-layout.dev/layouts/switcher/), free and not paywalled:

```css
.switcher { display: flex; flex-wrap: wrap; gap: 1rem; --threshold: 30rem; }
.switcher > * { flex-grow: 1; flex-basis: calc((var(--threshold) - 100%) * 999); }
```

A large negative `flex-basis` is invalid and is dropped, leaving items sharing the row; a large positive one makes each item demand the whole row and `flex-wrap` stacks them.

### The flex and grid automatic minimum size, which is the one you keep hitting

**The spec rule.** [css-flexbox-1 §4.5](https://drafts.csswg.org/css-flexbox-1/#min-size-auto), verbatim: "To provide a more reasonable default minimum size for flex items, the used value of a **main axis** automatic minimum size on a flex item **whose computed `overflow` value is non-scrollable** is its **content-based minimum size**; for main-axis scroll containers the automatic minimum size is zero, as usual." The content-based minimum is the larger of the content size suggestion (the min-content size in the main axis) and the transferred size suggestion (via aspect ratio), capped by the specified size suggestion. For replaced elements it is the **smaller** of those two, not the larger.

Two precisions almost every blog post gets wrong:

- **It applies in the main axis only.** In `row`, `min-width: auto` is content-based and `min-height: auto` is plain zero. In `column`, the reverse. That is why the row bug is a width bug and the column bug is a height bug, and why they need different properties.
- **The condition is on the computed `overflow` value**, not on actually being a scroll container. The spec change log says why: to avoid replaced elements whose scrollable overflow resolves oddly.

**Why it exists, in the editor's own words.** fantasai's design note, ["Flexbox Implied Minimum Size"](https://fantasai.inkedblade.net/style/discuss/flexbox-min-size/), is the primary source. Her four stated concerns:

1. "Flexbox should honor intrinsic sizes such that things that have a definite size in the author's mind don't get squashed unexpectedly."
2. "Overflowing the flex container with flex items is **better than** having the contents of flex items overflow into each other."
3. Content in scrollable items should not constrain flex item sizing, since "for scrolly things we don't really care how long the stuff is inside."
4. Authors should not be confused "by imposing the intrinsic size of something as its minimum size when it's been explicitly sized to be smaller."

Her worked cases were a nav bar whose items overlap illegibly at a zero minimum, a 120px image crushed to 20px beside wrapping text, and an explicitly 60px image that should stay 60px. The axis refinement came from Mozilla: Daniel Holbert pointed out that requiring both overflow sub-properties to be `visible` broke `overflow-y: auto` on a row item; Tab Atkins' reply on www-style, 2014-07-17: "Yup, you're right. I'll fix."

So the rule exists because overlapping unreadable content is a worse failure than an overflowing container.

**The grid version**, [css-grid-1 §6.6](https://drafts.csswg.org/css-grid-1/#min-size-auto), applies in **both** axes and adds a condition flex does not have: the item must span at least one track whose **min track sizing function is `auto`**. And grid is friendlier in a fixed track: an item spanning only fixed max track sizing functions has its content-based minimum clamped to the track size, so it cannot blow the track out.

**`1fr` means `minmax(auto, 1fr)`.** Spec, on the `<flex>` value: "When appearing outside a `minmax()` notation, implies an **automatic minimum** (i.e. `minmax(auto, <flex>)`)." Chain that with `auto`-as-a-minimum being the item's automatic minimum size and you have the grid blowout.

```css
.layout { grid-template-columns: 1fr 300px; }            /* a 1800px <pre> makes this 2100px */
.layout { grid-template-columns: minmax(0, 1fr) 300px; } /* fix at the track */
.layout > main { min-width: 0; }                          /* or fix at the item */
```

`minmax(0, 1fr)` works because it changes the min track sizing function from `auto` to `0`, failing §6.6's second condition. `min-width: 0` works because it replaces the `auto` the mechanism is defined on. Two different mechanisms, same outcome.

**The symptoms, all the same rule in different clothes.**

(a) Text that will not truncate. [Chris Coyier, "Flexbox and Truncated Text"](https://css-tricks.com/flexbox-truncated-text/): `white-space: nowrap` on the `h2` removes every wrap opportunity, so the `h2`'s min-content equals its max-content, so the **cell's** min-content is the whole headline, so the cell never shrinks, so the `h2` never gets a smaller box to ellipsize into. The `overflow: hidden` on the `h2` resets the `h2`'s own minimum, which nobody was asking about.

(b) `<pre>`, code blocks and long URLs: `white-space: pre` means no wrap opportunities at all.

(c) `<canvas>`, `<img>`, `<video>`: replaced, so the transferred size suggestion drags the aspect ratio in. A canvas sized by a `ResizeObserver` inside a flex child with `min-width: auto` is a one-way ratchet, because the observer sets the backing store from the element and the element cannot shrink below the backing store's contribution.

(d) **Nested flex containers compound it.** `min-width: 0` on the inner item is useless while an ancestor flex item still has `min-width: auto`, because the ancestor's own minimum is computed from the whole subtree. The fix has to be applied at **every** level from the flex root down.

**The `min-height: 0` column case, which is the one that bites.** The naive version works and the realistic one does not:

```css
/* works: .body IS a main-axis scroll container, so its automatic minimum is zero */
.app  { display: flex; flex-direction: column; height: 100vh; }
.body { flex: 1 1 auto; overflow-y: auto; }

/* breaks: .main has no overflow set, so min-height: auto is content-based */
.app  { display: flex; flex-direction: column; height: 100vh; }
.main { flex: 1; display: flex; flex-direction: column; }   /* <- the fault is HERE */
.list { flex: 1; overflow-y: auto; }                         /* <- the symptom is here */
```

`.main` refuses to shrink, `.app` grows past 100vh, the **page** gets a scrollbar, the header scrolls away, and `.list` never scrolls at all. The symptom reads as "my scroll container does not scroll" while the fault is two levels up. Fix: `min-height: 0` on `.main`, and per [flexbugs#241](https://github.com/philipwalton/flexbugs/issues/241) frequently on every intermediate wrapper.

**The cures, and what each one actually does:**

```css
.flex-child   { min-width: 0; }                 /* row flex, or grid item */
.column-child { min-height: 0; }                /* column flex */
.flex-child   { overflow: hidden; }             /* makes it a scroll container; also auto, also scroll */
.layout       { grid-template-columns: minmax(0, 1fr) 300px; }
.badge        { flex-shrink: 0; }               /* the opposite intent, and often the honest one */
```

**A trap in the old advice, and this one is worth a note in your own files.** Every article written before `overflow: clip` existed says "any value other than `visible` resets the automatic minimum size". That is now **false**. [css-overflow-3](https://drafts.csswg.org/css-overflow-3/#propdef-overflow): "The `scroll`, `auto`, and `hidden` values are known as the **scrollable values**... The `visible` and `clip` values are known as the **non-scrollable values**." Flexbox §4.5 keys on "non-scrollable", so **`overflow: clip` keeps the content-based minimum and keeps the bug**. If you have been reaching for `clip` to avoid making a scroll container, you kept the bug. (Spec-derived, not measured in a browser today; verify in your targets.)

Related consequence from the flexbox change log: a content-based minimum makes the element's size **indefinite** for intrinsic sizing, so percentages against it behave as `auto`. `min-height: 0` also fixes the "my percentage height does nothing" class of bug.

`min-width: 0` and `min-width: max-content` are opposite intents, not alternatives. The first says "I will handle the overflow myself". The second says "never wrap me, push the others instead", and it is a **stronger** statement than the default, since the default is min-content (longest word) and `max-content` is the whole string.

---

## 5. Debugging: which declaration won, and from which rule

This one has a definite answer and it is automatable from your existing CDP harness. A researcher wrote and **ran** four scripts against real headless Chrome; they are in the session scratchpad at `/private/tmp/claude-501/-Users-s32863-personal-positron/7cc3bd3d-b01c-45e1-a52a-75900587668f/scratchpad/cdptest/` as `probe.mjs`, `which-rule-won.mjs`, `ancestry.mjs`, `dbg.mjs`.

### The one-line answer

`getComputedStyle()` cannot tell you. `getMatchedCSSRules()` is gone from Chrome. **`CSS.getMatchedStylesForNode`** is the only complete source of truth, and its `matchedCSSRules` array is already sorted in cascade order lowest-first, **except that the order does not account for `!important`**. You have to apply importance yourself. That exception is the thing most hand-rolled versions get wrong, and it was measured.

### The DOM APIs and where each stops

- **`getComputedStyle()`** returns "the **resolved values** of all CSS properties" and carries no provenance field of any kind. Also note resolved-versus-computed: `getComputedStyle(el).padding` reads `5px` when the winning declaration said `0.3125rem`, so string-comparing a declaration against a computed value is unsound. The researcher hit this: winner `color: navy`, computed `rgb(0, 0, 128)`, naive `===` reported a disagreement that did not exist.
- **`Element.computedStyleMap()`** (Typed OM) gives typed values instead of strings and, per MDN, "the return value contains **computed values**, not **resolved values**", so a percentage stays a percentage. Still no provenance. Chromium-only; MDN flags it as not Baseline.
- **`getMatchedCSSRules()`**: **removed from Chrome in 64**. [Chrome 64 deprecations](https://developer.chrome.com/blog/chrome-64-deprecations): "It's now being removed because it's not on a standards track... Since there is currently no standards-based alternative, developers would need to create their own." Firefox never shipped it ([bug 438278](https://bugzilla.mozilla.org/show_bug.cgi?id=438278), open since 2008). Safari still has it, gated, author-only by default, with a standing removal bug; the WebKit IDL comment reads "Non-standard: For now we expose this to user worlds since Safari is using it, but we plan to remove it." Do not build on it.
- **The hand-rolled `document.styleSheets` walk** breaks in eight places, in this order of likelihood: cross-origin sheets throw `SecurityError` on `.cssRules` per the [CSSOM origin-clean flag](https://drafts.csswg.org/cssom/#dom-cssstylesheet-cssrules), which gives you a silent hole rather than an error you can attribute; **`@container` cannot be evaluated from script at all** (there is no `matchContainer()`, and CDP's `CSSContainerQuery` type notably carries no `active` boolean while `CSSSupports` does); `@scope` proximity is a sort key you cannot compute; `!important` is a re-banding, not a flag to sort on; layer ordering needs the whole document's layer statements collected first; nesting means `selectorText` is not the effective selector; `el.matches()` disagrees on stateful pseudo-classes; and shorthands enumerate inconsistently.
- `CSSStyleDeclaration.getPropertyPriority(name)` returns the string `"important"` or `""`, so test `=== 'important'`.

Real packages, checked against npm today: `css-rules-matcher` 0.0.8 (its own README says it "partially" restores the behaviour), `specificity` 1.0.0, `css-what` 8.0.0. `compute-specificity`, `get-matched-css-rules` and `matched-css-rules` **do not exist**.

### `CSS.getMatchedStylesForNode`, the exact shape

Read from the protocol JSON, not the rendered docs page (which is a JS shell and returns nothing to a fetcher): [browser_protocol.json](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json).

Non-experimental fields: `inlineStyle`, `attributesStyle`, `matchedCSSRules`, `pseudoElements`, `inherited`, `inheritedPseudoElements`, `cssKeyframesRules`, `cssPositionTryRules`, `activePositionFallbackIndex`, `cssPropertyRules`, `cssPropertyRegistrations`, `cssAtRules`. Experimental: `parentLayoutNodeId` ("Id of the first parent element that does not have `display: contents`") and `cssFunctionRules`.

Two corrections to the names in the brief: it is **`cssPositionTryRules`**, not `cssPositionFallbackRules`. There is **no `cssLayers` field**; layers arrive per rule on `CSSRule.layers` (experimental, innermost-first) and through the separate `CSS.getLayersForNode`. Specificity is not on `RuleMatch`; it is one level down on `rule.selectorList.selectors[i].specificity` as `{a, b, c, components?}`, experimental. `components` is an array of `SpecificityComponent {text, a, b, c}`, "Per-simple-selector contributions used to explain this specificity", which is the data source for the Chrome 151 tooltip.

The field that does the real work is `CSSProperty.longhandProperties` (experimental): "Parsed longhand components of this property if it is a shorthand."

### Ordering: measured, not assumed

The protocol does not document the order. Blink's `InspectorCSSAgent::BuildArrayForMatchedRuleList` walks the resolver's list backwards to dedupe and emits backwards again, restoring ascending order. The DevTools frontend confirms with a comment: `// Add rules in reverse order to match the cascade order.`

**Measured** on a crafted page with two layers, unlayered rules, an `!important` rule, an id rule, a media rule, a standalone longhand and an inline style, the array came back:

```
 0 user-agent  div
 1 user-agent  (the big UA block list)
 2 regular  layer=["base"]   .box  padding:1px
 3 regular  layer=["theme"]  .box  padding:2px
 4 regular  layer=[]         .box  padding:3px
 5 regular  layer=[]         .imp  padding:5px !important
 6 regular  layer=[]         .box  padding-left:9px
 7 regular  layer=[] media   .box  padding-top:7px
 8 regular  layer=[]         #only padding:4px
 9 regular  layer=[]         #only padding:6px
```

The sort key reads straight off: origin, then layer order, then specificity, then source order. Unlayered beats every layer. **And `.imp !important` sits at index 5, below `#only` at index 9, while the computed value is `5px`.** So taking the last matching rule is wrong whenever `!important` is in play, and it looks right on every test page that does not use it.

`CSS.getLayersForNode` on the same node returned `{name: "implicit outer layer", order: 2, subLayers: [{base, 0}, {theme, 1}]}`, so "unlayered wins" is a number you can sort on rather than a special case to hard-code.

### The working script

`which-rule-won.mjs <url> <selector> <property>`, raw CDP over Node's global `WebSocket`, no dependencies, matching the `demo/verify.mjs` idiom. Real measured output:

```
#only  {  padding-left  }
================================================================
  -  padding-left: 1px       | .box  | regular | layer=base | spec=0,1,0  <- via shorthand padding: 1px
       .../page.html:4:26 [inline sheet]
  -  padding-left: 9px       | .box  | regular | layer=-    | spec=0,1,0
       .../page.html:11:11 [inline sheet]
  -  padding-left: 6px       | #only | regular | layer=-    | spec=1,0,0  <- via shorthand padding: 6px
       .../page.html:10:11 [inline sheet]
WON  padding-left: 5px !important | .imp | regular | layer=- | spec=0,1,0  <- via shorthand padding: 5px
       .../page.html:9:11 [inline sheet]

computed: padding-left = 5px | agrees with WON: YES
```

Also verified green on a shorthand `!important` beating a `@media` longhand, on one beating an inline `style=""`, and on an inherited property resolving to the nearest declaring ancestor. The `<- via shorthand` annotation is **exactly your incident B**, made visible.

Three things to carry into any implementation, all measured rather than read:

1. **Sort the array yourself.** Ascending cascade priority ignoring `!important`.
2. **Expand shorthands.** The winner of `padding-left` is usually a `padding` declaration. Blink also emits parallel expanded longhand entries with no `range`, which must be skipped, which is what the frontend does with `if (style.range && !property.range) continue`.
3. **Inheritance stops at the nearest declaring ancestor.** Do not rank across depths. The researcher shipped `d < n && !inheritedFrom`, and `inheritedFrom = 0` is falsy, so it reported a grandparent's `color` as the winner over the parent's. The symptom was a plausible wrong answer, not an error.

Known limits not fixed: no `@scope` proximity ranking, no `@container` activity check (CDP does not report one), no shadow DOM tree-scope distance, no animation or transition styles (those need the separate experimental `CSS.getAnimatedStylesForNode`, which is where a value winning because of a running transition shows up).

**Playwright has no matched-styles API**; `browserContext.newCDPSession()` is Chromium-only. Puppeteer is the same. **No npm package wraps `CSS.getMatchedStylesForNode`.** Install `devtools-protocol` for the generated types.

### DevTools, manual

- The **Computed** pane, not the Styles pane, is the adjudication tool. Filter to the property, expand, read top to bottom: winner first, losers under it in descending priority, each with an arrow to source.
- Three visually distinct failure modes in the Styles pane and only one means the cascade beat you: **strikethrough with no icon** is overridden; strikethrough **plus a warning triangle** is invalid; **pale with an information icon** is Inactive CSS, valid but having no effect. Pale with **no** icon is a fourth thing entirely (inherited but not inheritable). [Find invalid, overridden, inactive CSS](https://developer.chrome.com/docs/devtools/css/issues).
- Specificity tooltips: hover a selector, Chrome 115. Chrome 151 added the per-simple-selector breakdown of how each class, id or element contributes to `(a, b, c)`.
- Cascade layers in the Styles pane since Chrome 101, with a "Toggle CSS layers view" button that shows layer order.
- **Shorthand versus longhand in the UI**: read from `CSSMatchedStyles.ts`, a shorthand competes in each longhand's own bucket, so `padding: 5px` registers as the active `padding-left` and a lower-priority `padding-left: 9px` is struck through. The shorthand does not announce which longhands it is eating. The Computed pane is the reliable way to see it. There is also the reverse case in the source, commented `// If every longhand of the shorthand is not active, then the shorthand is not active too`, where a shorthand is struck through despite "winning" its own name.
- **Badges** answer "which ancestor is doing this". `scroll` (Chrome 130) for "which ancestor is scrolling", plus grid, subgrid, flex, container, scroll-snap, top-layer, popover, starting-style. Right-click a node, Badge settings.

### Ancestor walking

`ancestry.mjs` injects one function and walks `parentElement`. Measured output on a fixture:

```
depth  element     padding-left  size      stacking-context / containing-block / BFC / clip
   0   p#target    0px           656x18
   1   div#d       0px           668x30    BFC(display:flow-root)
   2   div#c       12px          692x30    SC(position:relative + z-index:3, opacity:0.99)  CB(position:relative)
   3   div#b       4px           700x38    BFC(overflow:hidden)  overflow:hidden
   4   div#a       20px          740x78    SC(transform)  CB(transform)
   5   body        0px           740x78
   6   html        0px           756x94    SC(root element)

nearest ancestor establishing a stacking context : div#c
nearest ancestor that is a containing block      : div#c
nearest ancestor establishing a BFC              : div#d
```

The containing-block answer cross-checks against `el.offsetParent`, which independently said `div#c`. Keep that agreement as the script's self-test.

**This table is the direct cure for incident A.** One command prints every ancestor's padding and which one is the real one, instead of three failed overrides.

Prior art worth vendoring rather than reinventing: `@floating-ui/utils`'s `isContainingBlock()`, which carries an engine caveat you would not guess, that `filter` and `backdrop-filter` establish a containing block **everywhere except WebKit**. Also `getContainingBlock()` and `getOverflowAncestors()`. And the [CSS Stacking Contexts Inspector](https://github.com/andreadev-it/stacking-contexts-inspector) DevTools extension, which snapshots rather than tracking live.

---

## 6. Linting and guardrails, measured against your actual file

One researcher installed the tools and ran them against `demo/shell/shell.css` (**7,266 lines, 459 KB**). These are measurements, not readings.

### Baseline numbers for the file, today

**841 selectors, 766 rules, max specificity `[0,5,1]`, mean `0.00, 1.74, 0.16`, zero id selectors anywhere, 4 `!important`, 19 `@media`, 0 `@layer`, 0 `@supports`, 72 custom properties declared of which 12 are never `var()`d and 32 are `var()`d but never declared.** By the numbers that is a healthy sheet, and the zero-id count is why `selector-max-id: 0` costs nothing to adopt.

### Stylelint

**17.15.0, published 2026-09-04**, Node >= 20.19.0. `stylelint-config-standard` 40.0.0 turns on 82 rules. v16 did remove the stylistic rules ("We've removed the stylistic rules we deprecated in 15.0.0"), though the v16 guide itself does not phrase it as "in favour of Prettier". v17 (2026-01-15) is **ESM only**, defaults `--fix` to strict, and **now calculates specificity per the CSS Nesting spec**, so `&` counts as the largest parent selector. Retune any `selector-max-*` threshold set on v16. Problems print to **stderr** since v16, which silently produces an empty file if you redirect stdout.

The config actually run, which produced **95 problems** (`no-descending-specificity` 54, `no-duplicate-selectors` 25, `selector-max-specificity` 6, `declaration-no-important` 4, `selector-max-universal` 3, `no-unknown-custom-properties` 2, `shorthand-property-no-redundant-values` 1):

```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "no-unknown-custom-properties": true,
    "declaration-block-no-shorthand-property-overrides": true,
    "declaration-block-no-duplicate-properties": [true, { "ignore": ["consecutive-duplicates-with-different-syntaxes"] }],
    "declaration-block-no-duplicate-custom-properties": true,
    "shorthand-property-no-redundant-values": true,
    "selector-max-id": 0,
    "selector-max-universal": 2,
    "selector-max-compound-selectors": 4,
    "selector-max-specificity": ["0,5,1", { "ignoreSelectors": [":where", ":is"] }],
    "no-descending-specificity": [true, { "severity": "warning" }],
    "declaration-no-important": [true, { "severity": "warning" }],
    "custom-property-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
    "custom-property-no-missing-var-function": true,
    "declaration-property-value-no-unknown": true,
    "function-no-unknown": null,
    "unit-no-unknown": null,
    "no-invalid-position-at-import-rule": true,
    "no-duplicate-at-import-rules": true,
    "media-feature-name-no-unknown": true,
    "media-query-no-invalid": true,
    "no-duplicate-selectors": true,
    "selector-class-pattern": null
  }
}
```

Three deliberate choices with reasons from the measurement. The specificity ceiling is set at **today's worst** (`0,5,1`), not at an aspirational number, because a ceiling set at today's worst catches the next regression on the day it lands, and one set below it makes six existing legitimate selectors fail forever. `no-descending-specificity` is a **warning**, because 54 hits, mostly the deliberate base-state-then-hover-state pattern, would make the file permanently red and you would turn the rule off. `selector-class-pattern` is null, because the sheet mixes `.pos-fb-h`, `.k`, `.roll-cell`, `.tbar` and enforcing kebab-case is a rename job nobody asked for.

**The honest answer on `declaration-block-no-shorthand-property-overrides`, which is your incident B:** it only works **inside a single declaration block**. `a { background-repeat: repeat; background: green; }` is flagged. A shorthand in one rule beating a longhand in another rule is silent by design, and **no stylelint rule catches it**. That case needs the CDP script in section 5. Its companions `declaration-block-no-duplicate-properties` and `declaration-block-no-duplicate-custom-properties` cover adjacent cases.

**`no-descending-specificity` has a second limit that matters for incident C**: its own docs say it "only compares rules that are within the same media context", so a rule inside `@media` is never compared against a plain rule.

**`declaration-property-value-no-unknown` is not experimental** and is in the standard config. It validates against CSSTree and understands `@property` registrations. If you enable it, disable `function-no-unknown` and `unit-no-unknown`, which overlap and double-report. Its `propertiesSyntax`/`typesSyntax` options were deprecated in 17.5.0 in favour of `languageOptions.syntax`.

New rules through 17.x worth knowing: `property-layout-mappings` (17.8, takes `"flow-relative"` or `"physical"`, which supersedes the `stylelint-use-logical` plugin, now in maintenance mode by its own README), `selector-no-deprecated` (17.8), `unit-layout-mappings` and `value-keyword-layout-mappings` (17.10), `selector-no-unmatchable` (17.15).

Also: `--report-needless-disables` finds `stylelint-disable` comments that suppress nothing, which is the standing-file-goes-stale problem in lint form.

### Dead selectors: two techniques that fail in opposite directions

**The CDP way**, which is the one to build since you already drive Chrome. Three commands, verified against the protocol JSON: `CSS.startRuleUsageTracking` (no params), `CSS.takeCoverageDelta` (returns `coverage: RuleUsage[]`), `CSS.stopRuleUsageTracking`. `RuleUsage` is `{styleSheetId, startOffset, endOffset, used}`, and `used`'s own description is the caveat: "Indicates whether the rule was actually used by some element in the page."

**So "used" means a DOM element matched the selector at some instant while tracking was on.** It does not mean the rule changed a pixel or won a cascade fight. A rule that matched and lost every fight it entered still reads as used.

Measured on a 7-rule fixture:

```
DEAD  .dead-one
DEAD  .dead-two .nested
DEAD  button:hover
DEAD  .wide-only
4 of 7 rules never matched an element across 1 page(s)
```

Read that carefully. `.js-added`, a class JavaScript adds 50ms after load, was correctly marked **used**. `button:hover` was reported **dead although a `<button>` exists**, because nothing hovered it. `.wide-only` was dead because the viewport never reached its media query. **A rule reads as dead unless a gesture, a viewport or a state reached it during the recording.** That is most of a control kit, and it is the same shape as the green-suite-with-no-coverage rule already in your CLAUDE.md: print the gesture count next to the dead count or the number is unreadable.

Two implementation notes from running it: pass `about:blank` as the start page, or Chrome's New Tab Page contributes about eighteen `chrome://` sheets that are destroyed by the first navigate and then answer "No style sheet with given id found"; and call `CSS.enable` **before** navigating or `styleSheetAdded` is missed. Read each sheet's text with `CSS.getStyleSheetText` while the sheet is alive, because the next navigate destroys it.

**The static way**, `css-tree` 3.2.1 plus `cheerio` 1.2.0, both plain libraries with no build step. Strip state pseudo-classes before probing or you condemn every `:hover` rule you own. Measured on the same fixture, it failed in the **mirror image**: it got `button:hover` right and `.js-added` wrong.

**So take the intersection.** A selector is only safely dead if the static pass and a well-driven CDP pass both say so. Either alone will delete something that works.

Off-the-shelf: **PurgeCSS 8.0.0** is a word tokeniser, not a selector matcher. Its own docs say "every word of a file is considered a selector" and it "does not consider special characters such as `@`, `:`, `/`". Use `--rejected` for a candidate list to review; never for deletion on a hand-written sheet. **UnCSS is dead** (0.17.3, 2020-02-11). **`stylelint-no-unused-selectors` is stale** (2021-08-08, four stylelint majors behind).

### Custom properties

**Undeclared**: stylelint has a built-in rule, **`no-unknown-custom-properties`**, not in the standard config so you must turn it on. It understands `@property` registrations. Scope is the current file, widened by the **experimental** `referenceFiles` option added in 17.9.0, with a `loader` property in 17.11.0 for `postcss-import` resolution. The csstools plugin `stylelint-value-no-unknown-custom-properties` also exists but the built-in is one dependency fewer and by the same project.

**Unused**: no stylelint rule does this, correctly, since another file could consume the token. **`@projectwallace/css-analyzer` 9.9.3** does it out of the box: `analyze(css).properties.custom` carries `defined`, `used`, `unused`, `unknown`, `total`, `totalUnique`, `ratio`. Or twenty lines of `css-tree`, remembering the `@property` branch or every registered property reads as undeclared.

Your 12 unused: `--mi-magenta --mi-teal --mi-orange --mi-blue --mi-maroon --mi-teal-lit --mi-maroon-lit --pad-bar --ctl-step --pg-now --tbl-grow --span-n`.

Your 32 unknown: `--ro-cols --sf-lines --k-cols --k-min --k-max --k-gap --k-pad --k-off --kn-x --k-dot --sld-seam --tbl-h --tbl-rows --tbl-cols --reserve-rows --roll-row-h --roll-w --wrap --pad --dg-fill --dg-stroke --card-min --card-gap --pres-ch --vp-aspect --knob-num-w --knob-ring-f --knob-dial-r --pad-cols --fdr-lane-h --panel-rows --panel-row`.

Both lists need a question, not an action. The unknowns are very likely the ones JavaScript sets with `setProperty()`, which is legitimate. **This is the single highest-value follow-up**: grep `setProperty` across `demo/`, because the answer decides whether `no-unknown-custom-properties` goes in as an error or whether those 32 need `@property` declarations first. A registered property stops being "unknown" honestly rather than by switching the rule off.

### Magic numbers

Built in: **`declaration-property-unit-allowed-list`**, where an empty array means no units at all, which is how you enforce unitless `line-height`. Has `ignore: ["inside-function"]` so a `px` inside a gradient does not trip it.

**`stylelint-declaration-strict-value` 1.12.1** (2026-08-24) exists and is maintained. Rule name is **`scale-unlimited/declaration-strict-value`**, not guessable from the package name. Key option is `expandShorthand: true`, so `margin: 8px 0` is checked per side instead of as one opaque string. Turned on across 7,266 lines this produces hundreds of findings on day one. It is a ratchet, not a switch: scope it to one property family, clear it, add the next.

**`stylelint-plugin-defensive-css` 2.9.7** (2026-09-06) exists and ships **21 rules**, far more than a port of the article. Five matter most here: **`require-grid-minmax`** catches the `1fr` that should be `minmax(0, 1fr)`, which is section 4's most common failure; `require-dynamic-viewport-height` catches `100vh` on a phone; `no-accidental-hover` wraps `:hover` in `@media (hover: hover)`, a touch bug invisible on a desktop; `require-custom-property-fallback` intersects with your 32 unknowns; `require-prefers-reduced-motion` is a real gap on a site full of transports and meters. Start with `/configs/recommended`; `/strict` adds `require-named-grid-lines` and `no-fixed-sizes` and will be very loud.

### The specificity graph

[Harry Roberts' original](https://csswizardry.com/2014/10/the-specificity-graph/). Source position on x, specificity on y, in file order. The reading is not the maximum, it is the **shape**. A healthy sheet trends gently upward. **A spike in the middle is the diagnosis**, because every rule after it has to meet or beat it to override anything it set, so one early high-specificity selector silently raises the floor for the rest of the file. That is the mechanism behind an unmotivated-looking `!important` three hundred lines later.

You can plot yours today: `analyze(css).selectors.specificity.items` is an array of `[a,b,c]` tuples **in source order**, which is literally the y-values with x as the index. Hosted version at [projectwallace.com/analyze-css](https://www.projectwallace.com/analyze-css), no signup. The `specificity-graph` npm package was last published 2016; use Wallace.

### Source-order defeats, which was the real question

**No linter does this, and here is why.** `no-descending-specificity` only compares within the same media context; Biome's port has the same limitation. A media query adds zero specificity, it only gates when a rule is live, so a later plain rule of equal specificity wins unconditionally. Every linter is looking at specificity, which is not where the bug is.

So the researcher wrote one (`css-tree` only, no browser), ran it, **found a bug in their own version, fixed it, re-ran**. The bug is worth repeating because it is the trap in this whole class of check: the first version compared specificity only, without checking the two selectors could ever match the same element, and produced a page of confident findings like "`@media { .pos-pick }` sets display, but `.pos-knob-dial` is later at equal specificity". Those two have nothing to do with each other. Ten findings, all noise, each one sending somebody to read a rule that was fine. Requiring identical normalised selector text is conservative and sound.

**Measured: `demo/shell/shell.css` has 0 source-order defeats today.** The fixture still reports correctly, so the check is live rather than vacuously passing:

```
t.css:6  @media (min-width:40em) { .c } sets color
  later, unconditional, >= specificity: .c at line 7. The @media never wins.
1 source-order defeat(s)
```

Exit code 1 on a hit, 0 on none. Script at `.../scratchpad/csslab/order-defeat.mjs`, alongside `coverage.mjs` and `dead-static.mjs`.

What it still misses, stated plainly: a **different but overlapping** selector defeating the media block, such as `.pos-knob` inside `@media` beaten later by `.pos-knob.on`. Catching that needs selector subsumption reasoning, which is where the first attempt went wrong. The sound version is not a parser job, it is a browser job: `Emulation.setDeviceMetricsOverride({width: 375, ...})` plus `CSS.getMatchedStylesForNode`, asking the real cascade which rule won `display` at 375px and whether it was the one in the media query.

### Package names that do not exist

A web search offered **`@csstools/stylelint-plugin-cascade-layers`** and **`css-layer-lint`** with plausible descriptions. **Neither is real**; the npm registry returns Not found for both. What does exist is `stylelint-cascade-layers` 0.3.1 (one rule, `cascade-layers/require-layers`, no opinion on order, peer range `^15.11 || ^16` so it does not claim stylelint 17) and `defensive-css/require-at-layer`. **Nothing lints layer order, and nothing lints it across files.** Since the sheet currently has zero `@layer` at-rules, that is a future problem: if you adopt layers, the order guardrail has to be a script you write.

### Recommended adoption order

1. `npx stylelint` with the config above. Zero install beyond stylelint, zero build step, catches the within-block shorthand bug today.
2. `@projectwallace/css-analyzer` in a small script asserting on the numbers. Unused and unknown custom properties plus the specificity graph data in one call. Cheapest guardrail per line of code here.
3. The CDP coverage script, because you already drive Chrome and it is the only dead-selector answer that survives runtime classes. Print the gesture count next to the dead count.
4. The static matcher, and take the intersection before deleting anything.
5. `stylelint-plugin-defensive-css/configs/recommended` plus the built-in `property-layout-mappings`.
6. `stylelint-declaration-strict-value` last, one property family at a time.

---

## 7. Your seven incidents, and the cure for each

**A. Three child overrides, and a fourth ancestor's padding was the real one.**
Diagnostic: `ancestry.mjs` (section 5), one command, prints every ancestor's padding and which one establishes a containing block, a BFC and a stacking context. Structural cures, in order of preference: the ancestor opts out with `:has()` (`.frame:has(> .bleed) { padding-inline: 0 }`); the layout owner provides the escape hatch with [Josh Comeau's full-bleed grid](https://www.joshwcomeau.com/css/full-bleed/) (`grid-template-columns: 1fr min(42rem, 100%) 1fr` with `.full-bleed { grid-column: 1 / 4 }`); the padding is a custom property the child can read and negate; and `@scope ... to (...)` so the component's chrome cannot reach nested content in the first place. No rule a child writes can ever reach an ancestor's padding, so the correct move is always to change who is asked, never to write a fourth override.

**B. A `padding` shorthand at (0,2,1) beat a `padding-top` longhand at (0,1,1).**
Put the page in a later `@layer` than the component and specificity stops deciding. Stop writing shorthands for values meant to be overridden piecemeal: `padding-block` and `padding-inline` are two longhands where `padding` is one shorthand. `declaration-block-no-shorthand-property-overrides` catches it within a block only; across rules nothing does, and `which-rule-won.mjs` prints `<- via shorthand padding: 5px` next to the winner.

**C. A media query above a plain rule of equal specificity never applied.**
`@layer base, responsive;` and put every media query in `responsive`. Position in the file stops mattering. Better still, remove the second rule: `clamp()`, `min(100%, 60ch)` and `repeat(auto-fit, minmax(min(100%, 20rem), 1fr))` leave nothing to lose a tie. The `order-defeat.mjs` script catches the same-selector case statically; the sound version needs `setDeviceMetricsOverride` plus `getMatchedStylesForNode`. Container queries do **not** fix this on their own.

**D. `el.style.aspectRatio` from JavaScript.**
JS writes a custom property, CSS reads it: `el.style.setProperty('--ar', 1.7778)` and `aspect-ratio: var(--ar, 16 / 9)`. Register it, `@property --ar { syntax: "<number>"; inherits: false; initial-value: 1.7778 }`, so a bad JS value falls back to the initial value instead of being invalid at computed-value time and inheriting something unrelated. A custom property is not a style, it is data on the element's scope, and it lets `:hover` and media rules participate in a way an inline style cannot. The blunt cure also exists: per [MDN's complete cascade order](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Cascade), normal inline styles sit at position 10 and author `!important` at 12 to 14, so an author `!important` does beat a normal inline style. Only important inline styles are unreachable. Separately: `aspect-ratio` is ignored outright when neither width nor height is automatic.

**E. `[data-x]` matched an empty attribute.**
[MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors): `[attr]` "Represents elements with an attribute name of _attr_", value irrelevant, empty string included. Cures: match a value, `[data-x="on"]`; or exclude the empty case, `[data-x]:not([data-x=""])`; on the JS side use `toggleAttribute('data-x', on)` or `removeAttribute`, not `setAttribute('data-x', '')`. The structural version is a registered custom property plus a style query: `@container style(--mode: on)` compares a computed value and has no presence-versus-value ambiguity.

**F. An author `display` beat `[hidden]`.**
Monica Dinculescu, via [CSS-Tricks](https://css-tricks.com/the-hidden-attribute-is-visibly-weak/): "the `hidden` rule is a User Agent style, which means it's less specific than a moderate sneeze." Any author `display` other than `none` wins, at any specificity. The blunt cure is `[hidden] { display: none !important; }` in the reset. **The structural cure, which is better, falls out of `@layer`**: unlayered normal declarations beat every layered normal declaration, so put all component `display` rules inside layers and leave `[hidden] { display: none }` unlayered, and it wins with no `!important` anywhere. Per-component, `.thing[hidden] { display: none }` also works.

**G. A renamed class left a dead selector that read as correct for a week.**
Intersect the CDP rule-coverage pass (which handles runtime-added classes correctly) with the static `css-tree` plus `cheerio` pass (which handles `:hover` and media queries correctly). Either alone deletes something that works. `@scope` reduces the future exposure: a scoped rule dies visibly with its root instead of lingering as a dead global selector.

---

## 8. What is not safe to rely on today

- **`margin-trim`**: Safari-only in stable. Chrome 155 lands 2026-10-06. 15.04% global, Baseline limited, no Firefox, and `@supports` cannot distinguish Safari's partial multicol support from Chrome's complete one.
- **`stretch`**: Chromium 138, Safari 27 (twelve days old), no Firefox. Ship behind `@supports` with `-webkit-fill-available` and `-moz-available` beneath.
- **`width: fit-content(<length>)`**: works in no shipping browser by default. Zero implementations on webstatus.dev. Use `width: fit-content; max-width: <length>`. The grid track function of the same name is fine.
- **CSS `if()`**: Chrome and Edge only. Write the plain fallback first if you use it at all.
- **Container style queries**: Baseline since 2026-05-19, four months. Custom properties only; `@container style(font-weight: bold)` is specced and implemented nowhere.
- **`@property`**: Baseline newly, not widely until roughly January 2027. Safe on the engines you test, but it is a 2024 feature, not a 2020 one.
- **`@scope`**: all three engines have it in stable, but MDN warns the specificity of `&` inside `@scope` differs by engine and version. Use bare selectors or `:scope`.
- **`overflow: clip` does not reset the flex automatic minimum size.** Every article predating `clip` says "any value other than visible" and is now wrong. Spec-derived, not measured in a browser today.
- **caniuse is stale on two things here**: its "Intrinsic & Extrinsic Sizing" entry still claims Chrome has not unprefixed `stretch` (false since June 2025), and it lists Chrome 155 for `margin-trim` without noting that 155 is not stable yet. Prefer webstatus.dev or browser-compat-data.
- **Two package names a search will offer you do not exist**: `@csstools/stylelint-plugin-cascade-layers` and `css-layer-lint`.
- **No npm package wraps `CSS.getMatchedStylesForNode`.** If a small `which-rule-won` wrapper were published it would be the only one.

## 9. One thing not settled

Whether the 32 "unknown" custom properties in `shell.css` are set by JavaScript with `setProperty()` or are genuinely dead reads. Grepping `setProperty` across `demo/` is a five-minute job that was outside the research brief, and the answer decides whether `no-unknown-custom-properties` goes in as an error or whether those names need `@property` declarations first.

---

## Scripts produced (scratchpad only, nothing written to the repo)

`/private/tmp/claude-501/-Users-s32863-personal-positron/7cc3bd3d-b01c-45e1-a52a-75900587668f/scratchpad/`

- `cdptest/which-rule-won.mjs` (url, selector, property: every declaration for that property, its rule, file, line, layer, specificity, importance, whether it came via a shorthand, and which won; cross-checked against `CSS.getComputedStyleForNode`)
- `cdptest/ancestry.mjs` (the ancestor table in section 5, also paste-able into the DevTools console)
- `cdptest/probe.mjs`, `cdptest/dbg.mjs`
- `csslab/coverage.mjs` (CDP rule coverage, dead selectors)
- `csslab/dead-static.mjs` (`css-tree` plus `cheerio`, the mirror-image pass)
- `csslab/order-defeat.mjs` (source-order defeats, exit code 1 on a hit)
- `csslab/probe.json` (the stylelint config that produced the 95 problems)

They are working, measured code rather than sketches, and the first, fifth and sixth are the three worth moving into `demo/` if you want any of this as a standing check.