<!-- research/layout-systems-2026-09-26.md -->
<!-- Produced 2026-09-26 by a web research agent, RULE / SOURCE / CSS throughout,
     with confidence flagged where a source could not be read first hand and a
     contradictions section at the end. Every Layout's component CSS is quoted
     from the authors' own publicly served downloads, never from a scan. It is
     the second of four strands behind the composition skill written the same
     day; the first is ui-corrections-taxonomy-2026-09-26.md. Kept whole because
     the sources, the flagged folklore and the disagreements are the part that
     survives being argued with. -->

# Layout as a system, not as arithmetic

Research report. Every finding is RULE / SOURCE / CSS. Confidence is marked where a source could not be read first hand. Contradictions are collected in section 8 and again inline where they bite.

A note on sourcing before anything else. The twelve Every Layout primitive pages are paywalled, but the authors serve the finished component code publicly and unauthenticated at `https://every-layout.dev/downloads/<Name>.zip` (Stack, Box, Center, Cluster, Sidebar, Switcher, Cover, Grid, Frame, Reel, Imposter, Icon, Container, all HTTP 200). Every piece of CSS quoted in section 1 is from those official files or from the four free pages (Stack, Sidebar, Switcher, and all six rudiments). Nothing in this report comes from a pirated book scan.

---

## 0. The thesis, in one paragraph

Your owner is describing three separate systems that people usually conflate:

1. A **layout system**: a small closed set of composable containers that each solve one arrangement problem, applied by nesting rather than by writing new CSS. That is Every Layout.
2. A **compositional system**: a rule about which layer of the stylesheet owns which decision, so that layout never fights colour and a component never re-implements a gap. That is CUBE CSS.
3. A **white space hanging system**: space that is owned by the relationship between two things rather than by either thing, drawn from one named scale, where the *ratio* between a within-group gap and a between-group gap carries the meaning, not the absolute values.

The single sentence that makes all three work: **a number in your CSS should be derived, inherited or chosen from a named list. It should never be typed because a screenshot looked better.**

---

## 1. Every Layout (Heydon Pickering and Andy Bell)

### 1.1 The axiom argument

RULE: An axiom is a short sentence about the whole design, expressed in a property and unit that makes the browser enforce it everywhere without you applying it by hand.

SOURCE: https://every-layout.dev/rudiments/axioms/ (free). Verbatim: *"even the most complex geometries are founded on simple, irreducible axioms (or postulates). Unless your design is founded on axioms, your output will be inconsistent and malformed."* The worked example is measure: *"the measure should never exceed 60ch"*.

The anti-magic-number argument in their own words, and it is a precise one, not a vibe: *"We may be able to judge, by eye, that 700px creates a reasonable measure for the given font-size. But the given font-size is really just the font-size our screen happens to be displaying at the time. It's our parochial view of our own design. Because there is no relationship between character length and pixel width, we do not have an algorithm that can guarantee the correct maximum measure value."*

That is the exact shape of your failure mode. 700px is not wrong. 700px is *unrelated to the thing it is trying to control*, so it goes stale the moment anything else moves.

CSS, the axiom made pervasive with an exception list rather than an application list:

```css
:root { --measure: 60ch; }
* { max-inline-size: var(--measure); }
html, body, div, header, nav, main, footer { max-inline-size: none; }
```

RULE (exception-based styling): Write the far-reaching rule first, then list what escapes it. Do not list what receives it.

SOURCE: same page. *"An exception-based approach to CSS lets us do most of our styling with the least of our code. If you are not taking an exception-based approach, it may be because making exceptions feels like correcting mistakes. But this is far from the case."* They cite Harry Roberts' ITCSS: specificity inversely proportional to reach.

RULE (designing without seeing): Axioms do not produce visuals, they produce *characteristics* of visuals, and some results will surprise you. That is not a bug.

SOURCE: same page. *"Instead of thinking of designing for the web as creating visual artefacts, think of it as writing programs for generating visual artefacts."* And from the companion post, https://every-layout.dev/blog/algorithmic-design/: *"We make many of our biggest mistakes as visual designers for the web by insisting on hard coding designs."*

### 1.2 The modular scale, which is where your numbers come from

RULE: Derive every spacing value by multiplying or dividing one base by one ratio, and pick the ratio from your body line-height because text dominates the page.

SOURCE: https://every-layout.dev/rudiments/modular-scale/ (free) and the Stack page. Verbatim from the Stack: *"The vertical spacing of your design should be based on your standard line-height because text dominates most pages' layout, making one line of text a natural denominator. If the body text line-height is 1.5 it makes sense to use 1.5 as the ratio for your modular scale."*

CSS, the actual scale their components consume:

```css
:root {
  --ratio: 1.5;
  --s-5: calc(var(--s-4) / var(--ratio));
  --s-4: calc(var(--s-3) / var(--ratio));
  --s-3: calc(var(--s-2) / var(--ratio));
  --s-2: calc(var(--s-1) / var(--ratio));
  --s-1: calc(var(--s0) / var(--ratio));
  --s0: 1rem;
  --s1: calc(var(--s0) * var(--ratio));
  --s2: calc(var(--s1) * var(--ratio));
  --s3: calc(var(--s2) * var(--ratio));
  --s4: calc(var(--s3) * var(--ratio));
  --s5: calc(var(--s4) * var(--ratio));
}
```

The closing line of that page is the one to keep: *"Some believe the specific ratio used for one's modular scale is important, with many adhering to the golden ratio of 1.61803398875. But it is in the strict adherence to whichever ratio you choose that harmony is created."* Which ratio does not matter. Having one does.

They also flag `pow()` as the future shape: `font-size: pow(var(--ratio), 3)`.

### 1.3 Units

RULE: `rem` for block-level sizing, `em` for inline things and icons, `ch` for measure, `ex` for x-height, and never `px` for anything a user might scale.

SOURCE: https://every-layout.dev/rudiments/units/ (free). *"As a rule of thumb, em units are better for sizing inline elements, and rem units are better for block elements. SVG icons are perfect candidates for em-based sizing, since they either accompany or supplant text."* They cite Evan Minto's finding that more users adjust their default font size than use Edge or IE, so `px` fonts are as impactful an exclusion as dropping a browser.

Directly aimed at your failure mode: *"A lot of folks busy themselves converting between rem and px, making sure each rem value they use equates to a whole pixel value. There's no need to do precise conversion, since browsers employ sub-pixel rendering and/or rounding to even things out automatically."*

They also reject width media queries outright: *"In Every Layout, we eschew width-based @media queries. They represent the hard coding of layout reconfigurations, and are not sensitive to the immediate available space actually afforded the element."*

### 1.4 Intrinsic vs extrinsic sizing (you asked specifically)

RULE: Let content determine size. Offer the browser a *suggestion* (`flex-basis`, `min-height`, `max-inline-size`) rather than a *prescription* (`width`, `height`).

SOURCE: https://every-layout.dev/rudiments/boxes/ and the Sidebar's aside on Intrinsic Web Design (Jen Simmons' term), https://every-layout.dev/layouts/sidebar/. Verbatim from Boxes: *"The lesson here is the dimensions of our elements should be largely derived from their inner content and outer context. When we try to prescribe dimensions, things tend to go amiss. All we should be doing as visual designers is making suggestions as to how the layout should take shape."* And: *"The CSS of suggestion is at the heart of algorithmic layout design."*

From the Sidebar: *"The CSS Box Sizing Module was formerly called the Intrinsic & Extrinsic Sizing Module... Generally, we should err on the side of intrinsic sizing. We are outsiders."*

From the Switcher, the cleanest statement of the difference: *"A declaration of `width: 20rem` means just that: make it 20rem wide, regardless of circumstance. But `flex-basis: 20rem` is more nuanced. It tells the browser to consider 20rem as an ideal or 'target' width."*

Operationally, for your instrument panels: a readout cell's width should come from its content plus padding, not from a percentage you tuned against one screenshot. If cells must align across rows, that is a Grid, not a set of widths.

### 1.5 Composition over inheritance

RULE: A named component (`.dialog`) is where CSS bloat comes from, because everything under that namespace has to be re-written for the next component. Build the dialog out of unnamed primitives instead.

SOURCE: https://every-layout.dev/rudiments/composition/ (free). *"since everything here is namespaced under .dialog, when we come to make the next component, we'll end up duplicating would-be shared styles. This is where most CSS bloat comes from."* And on what a primitive is: *"a primitive is something without its own meaning or purpose as such, but which can be used in composition to make something meaningful."*

The boxed aside that matters most to you: *"Each layout in Every Layout is intrinsically responsive... You may feel compelled to add @media query breakpoints, but these are considered 'manual overrides' and Every Layout primitives do not depend on them."*

### 1.6 The primitives, one at a time

Each entry: what it solves, the official CSS (from the public component downloads), the props it exposes, and the axiom underneath.

**THE STACK** (free page: https://every-layout.dev/layouts/stack/)

Problem, stated better than anywhere else I found: *"design systems conceive elements and components in isolation. At the time of conception, it is not settled whether there will be surrounding content... We are in the habit of styling elements directly: we make style declarations belong to elements. Typically, this does not produce any issues, but **margin is really a property of the relationship between two proximate elements**."*

The failure it names: `p { margin-bottom: 1.5rem }` produces a redundant margin on a `:last-child`, which then combines with the parent's padding to produce double the intended space.

Official CSS (Stack.css plus the generated block from Stack.js):

```css
stack-l { display: flex; flex-direction: column; justify-content: flex-start; }
stack-l > * + * { margin-block-start: var(--s1); }
```

Recursive variant, drop the child combinator:

```css
.stack * + * { margin-block-start: 1.5rem; }
```

Their own warning on recursion: *"You're likely to find the recursive mode affects unwanted elements. For example, generic list items that are typically not separated by margins will become unexpectedly spread out."*

Nested variants, which is the approach they prefer over recursion:

```css
[class^='stack'] > * { margin-block: 0; }
.stack-large > * + * { margin-block-start: 3rem; }
.stack-small > * + * { margin-block-start: 0.5rem; }
```

Per-element exception inside one Stack:

```css
.stack > * + * { margin-block-start: var(--space, 1.5em); }
.stack-exception, .stack-exception + * { --space: 3rem; }
```

*"This works because `*` has zero specificity, so `.stack > * + *` and `.stack-exception` are the same specificity."*

Splitting (push a group to the bottom of a card):

```css
.stack { display: flex; flex-direction: column; justify-content: flex-start; }
.stack > * + * { margin-block-start: var(--space, 1.5rem); }
.stack > :nth-child(2) { margin-block-end: auto; }
.stack:only-child { block-size: 100%; }
```

Critical detail they call out: *"despite now setting some properties on the parent .stack element, we're still setting the --space value on the children, not 'hoisting' it up. If the parent is where the property is set, it will get overridden if the parent becomes a child in nesting."*

Props: `space` (default `var(--s1)`), `recursive` (bool), `splitAfter` (number).

Scope: *"The potential remit of the Stack layout can hardly be overestimated. Anywhere elements are stacked one atop another, it is likely a Stack should be in effect."*

**Origin, and the axiom argument at full strength.** The owl is from Heydon's 2014 A List Apart piece, https://alistapart.com/article/axiomatic-css-and-lobotomized-owls/. Read it; it is the best single source for the mindset you are asking for. Verbatim:

- *"margins are something that exist between elements. Simply giving an element a top margin makes no sense, no matter how few or how many times you do it. It's like applying glue to one side of an object before you've determined whether you actually want to stick it to something or what that something might be."*
- The axiom: *"All elements in the flow of the document that proceed other elements must receive a top margin of one line."*
- *"Instead of writing styles, we've created a style axiom: an overarching principle for the layout of flow content. It's highly maintainable, too; if you change the line-height, just change this singular margin-top value to match."*
- On nesting: *"no first or last element of a set will ever present redundant margin. Whenever you create a subset of these elements, by wrapping them in a nested parent, the same rules that apply to the superset will apply to the subset. No margin, regardless of nesting level, will ever meet padding."*
- The diagnostic to steal: *"If you find yourself overriding the owl selector frequently, there may be deeper systemic issues with the design."*
- On `em`: *"by harnessing the em unit in our margin value, margins already adjust automatically according to another property: font-size... one-line spaces remain one-line spaces."*

**WHY THE STACK BEATS `gap`, AND WHERE IT DOES NOT. This is the sharpest finding in the whole report and it contradicts the simple version of your question.**

Every Layout's second edition (June 2021) is *specifically about moving to `gap`*, and they moved Cluster, Sidebar, Switcher and Grid onto it. Source: https://every-layout.dev/blog/second-edition/. Their argument for `gap` is nesting:

> *"Margins are applied to child elements and child elements become parent elements when nesting... `0.5em` applies to the nested component's children as intended, but also overrides the `1em` value that should be applied to itself. This isn't what we want. The `gap` property, on the other hand, is defined on the parent but applied between the children. This difference is critical: there are no longer competing values for the same elements."*

And the caveat in the same post: *"Not everything should use gap just because it now exists."*

The Stack did **not** move. I verified this against the current published `Stack.css` and `Stack.js`: it is still `> * + *` with `margin-block-start`. The three reasons, from the material:

| Capability | Owl margin | `gap` |
| --- | --- | --- |
| Per-child exception (`.stack-exception + *` gets a bigger space above it) | yes, because the value lives on a child and the cascade can reach it | no, one value for the whole container |
| `splitAfter` (auto margin pushing a group to the bottom) | yes, `margin-block-end: auto` on one child | no |
| Recursive spacing at any nesting depth from one parent | yes, drop the `>` | no, `gap` is one level only |
| Nesting without the parent's own spacing being clobbered | no, this is the failure the 2nd edition names | yes |

So the operational rule is not "owl beats gap". It is:

RULE: Use `gap` for a row or a grid where every gutter is the same and the container may be nested inside another of its own kind. Use the owl for a vertical flow where individual children need to argue with the default space, or where one child must be pushed to an edge.

**THE BOX**

Problem: a generic padded container whose padding and border come from the scale, and which survives Windows High Contrast Mode (where `border` can be dropped but `outline` is not).

Official CSS (Box.css):

```css
box-l {
  display: block;
  padding: var(--s1);
  border-width: var(--border-thin);
  /* ↓ For high contrast mode */
  outline: var(--border-thin) solid transparent;
  outline-offset: calc(var(--border-thin) * -1);
}
```

Plus, from Box.js, `background-color: inherit` and an `invert` prop that does `background-color: var(--color-light); filter: invert(100%)`.

Props: `padding` (default `var(--s1)`), `borderWidth`, `invert`.

Axiom: padding is a scale point, not a number. The transparent outline trick is worth stealing wholesale for a dark instrument panel, because your borders are load-bearing for grouping.

**THE CENTER**

Problem: horizontally centre a block and cap its measure, without `text-align: center` and without a wrapper per use.

Official CSS (Center.css):

```css
center-l {
  display: block;
  box-sizing: content-box;
  margin-inline: auto;
  max-inline-size: var(--measure);
}
```

Props: `max` (default `var(--measure)`), `andText`, `gutters`, `intrinsic`. `gutters` adds `padding-inline`; `intrinsic` adds `display: flex; flex-direction: column; align-items: center` to centre children on their own content widths.

Axiom, and it is the exception to their own `border-box` rule: `content-box` is deliberate, because the measure must be measured on the *content*, not on content plus padding. From the Boxes rudiment: *"There are exceptions to the border-box rule-of-thumb, such as in the Center layout where measurement of the content is critical."*

**THE CLUSTER**

Problem: a group of items of unknowable number and width (tags, a button bar, a transport row) that must wrap without leaving orphan gutters at the edges.

Official CSS (Cluster.css plus Cluster.js):

```css
cluster-l {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
  gap: var(--s1);
}
```

Props: `justify`, `align`, `space` (default `var(--s1)`).

First edition did this with symmetric margins on children plus a negative margin on an intermediary wrapper plus `overflow: hidden`. That whole apparatus is gone. This is the single biggest practical win of `gap`, and it is exactly the primitive you would use for a control row.

**THE SIDEBAR** (free page: https://every-layout.dev/layouts/sidebar/)

Problem: two adjacent elements, one fixed-ish, one taking the rest, that stack vertically when there is not room, with no media query, responding to the *container* rather than the viewport.

Official CSS, from the free page:

```css
.with-sidebar { display: flex; flex-wrap: wrap; gap: 1rem; }
.sidebar {
  /* ↓ The width when the sidebar _is_ a sidebar */
  flex-basis: 20rem;
  flex-grow: 1;
}
.not-sidebar {
  /* ↓ Grow from nothing */
  flex-basis: 0;
  flex-grow: 999;
  /* ↓ Wrap when the elements are of equal width */
  min-inline-size: 50%;
}
```

The mechanism, verbatim: *"Because the .not-sidebar element's flex-grow value is so high (999), it takes up all the available space. The flex-basis value of the .sidebar element is not counted as available space and is subtracted from the total."* And on the threshold: *"The value can be anything, but 50% is apt since a sidebar ceases to be a sidebar when it is no longer the narrower of the two elements."*

Omit `flex-basis` on the sidebar and its width becomes its content's width. That is the intrinsic mode.

Props: `side`, `sideWidth`, `contentMin`, `space`, `noStretch`.

**THE SWITCHER** (free page: https://every-layout.dev/layouts/switcher/)

Problem: N elements that should be one row or one column and *never* an awkward intermediate state where one item has wrapped and grown and now looks "picked out".

Their reason for its existence, verbatim: *"Any element that has wrapped and grown to adopt a different width could be perceived by the user as being 'picked out'; made to deliberately look different, or more important. We should want to avoid this confusion."*

Official CSS (the gap-era version, from the free page):

```css
.switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  --threshold: 30rem;
}
.switcher > * {
  flex-grow: 1;
  flex-basis: calc((var(--threshold) - 100%) * 999);
}
```

The trick, which is the "Flexbox Holy Albatross": `30rem - 100%` is positive when the container is narrower than the threshold and negative when wider, multiplied by 999 to saturate. *"A negative flex-basis value is invalid, and dropped. Thanks to CSS's resilient error handling this means just the flex-basis line is ignored."*

Quantity threshold (go vertical past N items):

```css
.switcher > :nth-last-child(n + 5),
.switcher > :nth-last-child(n + 5) ~ * { flex-basis: 100%; }
```

Proportions: `.switcher > :nth-child(2) { flex-grow: 2; }`.

Props: `threshold` (default `var(--measure)`), `space`, `limit`.

**THE COVER**

Problem: a vertically centred element with optional header and footer, in a box with a minimum height.

Official CSS (Cover.css plus Cover.js):

```css
cover-l { display: flex; flex-direction: column; min-block-size: 100vh; padding: var(--s1); }
cover-l > * { margin-block: var(--s1); }
cover-l > :first-child:not(h1) { margin-block-start: 0; }
cover-l > :last-child:not(h1)  { margin-block-end: 0; }
cover-l > h1 { margin-block: auto; }
```

Props: `centered` (a selector, default `h1`), `space`, `minHeight` (default `100vh`), `noPad`.

Axiom: centring is `margin: auto` on the chosen child, not `justify-content`, because that keeps the header and footer honest when they are absent.

**THE GRID**

Problem: a responsive grid with no breakpoints, where the *cell width* is what you declare and the column count is derived.

Official CSS (Grid.css plus Grid.js):

```css
grid-l {
  display: grid;
  grid-gap: var(--s1);
  align-content: start;
  grid-template-columns: 100%;
}
@supports (width: min(250px, 100%)) {
  grid-l {
    grid-template-columns: repeat(auto-fill, minmax(min(250px, 100%), 1fr));
  }
}
```

Props: `min` (default `250px`), `space`.

Two details worth keeping. The `min()` inside `minmax()` stops overflow when the container is narrower than `min`. The `@supports` wrapper plus the `grid-template-columns: 100%` fallback means the single-column layout is the base state, not the override.

Note: `auto-fill`, not `auto-fit`. `auto-fit` collapses empty tracks and stretches the last row; `auto-fill` keeps the track rhythm. For an instrument panel where cells should stay the same size regardless of how many are present, `auto-fill` is the right one.

**THE FRAME**

Problem: force an aspect ratio on media, cropping rather than distorting.

Official CSS (Frame.css):

```css
frame-l {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}
frame-l > img, frame-l > video {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}
```

Props: `ratio` (default `16:9`, parsed as `n:d`). The component also warns in the console if it has more than one child.

First edition used the `padding-bottom: calc(var(--n) / var(--d) * 100%)` plus absolutely-positioned-child hack. `aspect-ratio` replaced it entirely. If you have that hack anywhere, it is dead weight.

**THE REEL** (the one you need)

Problem: a horizontally scrolling row of items, with a visible and styled scrollbar, whose item widths are declared and whose container adds bottom padding only when it actually overflows.

Official CSS (Reel.css plus the generated block from Reel.js, defaults folded in):

```css
reel-l {
  display: flex;
  block-size: auto;                 /* `height` prop */
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-color: var(--color-light) var(--color-dark);
}

reel-l > * { flex: 0 0 auto; }       /* `itemWidth` prop; auto = content width */

reel-l > img { block-size: 100%; flex-basis: auto; inline-size: auto; }

reel-l > * + * { margin-inline-start: var(--s0); }   /* `space` prop */

reel-l.overflowing { padding-block-end: var(--s0); }  /* only when it scrolls */

/* noBar variant */
reel-l[noBar] { scrollbar-width: none; }
reel-l[noBar]::-webkit-scrollbar { display: none; }

/* the styled bar, which is the bit people copy */
reel-l::-webkit-scrollbar { block-size: 1rem; }
reel-l::-webkit-scrollbar-track { background-color: var(--color-dark); }
reel-l::-webkit-scrollbar-thumb {
  background-color: var(--color-dark);
  background-image: linear-gradient(
    var(--color-dark) 0,      var(--color-dark) 0.25rem,
    var(--color-light) 0.25rem, var(--color-light) 0.75rem,
    var(--color-dark) 0.75rem);
}
```

Props: `itemWidth` (default `auto`), `height` (default `auto`), `space` (default `var(--s0)`), `noBar` (bool).

Three things to know before you build yours.

1. **The Reel uses the owl, not `gap`.** `> * + *` with `margin-inline-start`. It was not converted. Given the 2nd edition's own argument, `gap` would be cleaner here and I can see no reason it would break; the spacing is uniform and there is no per-item exception. Flagging this as a place where Every Layout is inconsistent with its own second-edition reasoning, not as a rule to copy blindly.
2. **The `overflowing` class is set from JavaScript**, by a `ResizeObserver` and a `MutationObserver` both calling `elem.classList.toggle('overflowing', this.scrollWidth > this.clientWidth)`. The purpose is to reserve space for the scrollbar only when a scrollbar exists, so a non-overflowing Reel has no phantom gap under it. There is no CSS-only way to do this today.
3. **Every Layout's Reel has no scroll snapping.** For a transport or a tape row you almost certainly want `scroll-snap-type: inline mandatory` on the container and `scroll-snap-align: start` on the children, plus `scroll-padding-inline-start` matching your container padding. That is an addition, not something they got wrong; their Reel is deliberately minimal.

The `overflow-y: hidden` alongside `overflow-x: auto` is not decoration. `overflow-x: auto` alone computes `overflow-y` to `auto` as well, which produces a phantom vertical scrollbar. Set both.

**THE IMPOSTER**

Problem: place an element centred over another, with a guarantee it cannot grow past its container, and scroll instead.

Official CSS (Imposter.css plus Imposter.js, margin default `0px`):

```css
imposter-l {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  transform: translate(-50%, -50%);
  max-inline-size: calc(100% - (0px * 2));
  max-block-size: calc(100% - (0px * 2));
  overflow: auto;
}
imposter-l[fixed] { position: fixed; }
```

Props: `breakout` (bool, drops the max sizes and the overflow), `margin`, `fixed`.

Axiom: an overlay that can be taller than its container is a content-loss bug. The `max-block-size` plus `overflow: auto` pair is the whole point; `translate(-50%, -50%)` is the well-known part.

**THE ICON**

Problem: an inline SVG that matches the text it sits in, at any font size, forever.

Official CSS (Icon.css plus Icon.js):

```css
icon-l svg {
  height: 0.75em;
  height: 1cap;
  width: 0.75em;
  width: 1cap;
}
/* when a `space` prop is given */
icon-l { display: inline-flex; align-items: baseline; }
icon-l > svg { margin-inline-end: var(--space); }
```

Props: `space` (default null, meaning natural word spacing is kept), `label` (sets `role="img"` and `aria-label`).

Two rules in four lines. First, the double declaration is a progressive enhancement: `0.75em` is the fallback, `1cap` is the real answer, and browsers that do not know `cap` drop the second line. Second, `align-items: baseline`, not `center`. An icon accompanying text aligns on the baseline.

From the Units rudiment, on why 0.75 and not 1: *"The actual value, in ems, of the icon height/width must be adapted to the accompanying font's own metrics... The Barlow Condensed font used on this site has a lot of internal space to compensate for, hence the 0.75em value."* Which is to say: the fallback number is font-specific and you must measure it for your own monospace face. `1cap` removes the need.

Cross-reference to section 6: `cap` is Firefox-only as of 2026, so the `0.75em` fallback is doing real work on your Chrome and Safari harnesses today.

**THE CONTAINER** (thirteenth primitive, added since; page also paywalled)

```css
container-l { display: block; container-type: inline-size; }
container-l[name] { container-name: <name>; }
```

Props: `name`. This is the honest admission that the `flex-basis: calc((threshold - 100%) * 999)` trick was always a container query in disguise, and now there are container queries.

---

## 2. CUBE CSS (Andy Bell)

Sources, both read in full: https://cube.fyi/ (the docs, one page per letter) and https://piccalil.li/blog/cube-css/ (the original essay, 26 May 2020).

The premise, verbatim from the essay: *"the CUBE methodology is very much an extension of good ol' CSS, rather than a reinvention... The core of this methodology is that most of the work is already done for you with global and high-level styles. This means that before you even start thinking about components, your typography is mostly set, your colours are working great and your elements are working harmoniously with each other. We use the rest of the methodology not to style everything, but instead, to provide contextual styles that deviate from the common, global system."*

### Composition vs Block, which is what you actually asked

| Layer | Owns | Never owns |
| --- | --- | --- |
| Composition | high-level flexible layout, how elements interact with each other, consistent flow and rhythm | colour, font style, shadows, patterns, pixel-perfect anything |
| Utility | one job, one property (or a tight related group), design tokens applied | a large group of unrelated properties, specificity hacks via blanket `!important` |
| Block | the small remainder that is genuinely specific to this component, "running against the grain" of the layers above | more than a handful of rules (they give a hard number: max 80 to 100 lines), more than one contextual problem per file |
| Exception | a state variation, via a data attribute | a variation so large the thing is unrecognisable, and never a CSS class |

Verbatim from https://cube.fyi/composition.html on what composition must not do: *"Provide visual treatment such as colour or font style. Provide decorative styles such as shadows and patterns. Force a browser to generate a pixel-perfect layout instead of a flexible, progressive layout."*

Verbatim from https://cube.fyi/block.html on why the block stays small: *"A block is skeletal because by the time you get to the block-level in CUBE CSS, most of the work has already been done by the global CSS, composition and utility layers. This means that a block's role is less like BEM, where everything is styled inside a block, but instead, it is a mechanism of running against the grain of the global CSS, composition and utility layers."*

**WHY THIS SPLIT REDUCES CASCADE FIGHTS.** Three distinct mechanisms, and it is worth being precise because "separation of concerns" is not the answer:

1. **Property disjointness.** Composition touches `display`, `gap`, `margin`, `grid-template`, `flex-*`. Utilities touch `color`, `background`, `font-size`. Blocks touch the leftovers. Two layers cannot fight over a property neither of them writes. Most cascade fights are two rules setting the same property with similar specificity; CUBE makes that structurally rarer rather than resolving it politely.
2. **Custom properties as the override channel.** `--flow-space` is set on a *descendant* rather than overriding the `margin-top` rule itself. Verbatim from the 24ways piece: *"custom properties also participate in the cascade, so we can utilise specificity to change it if we need it."* A variable override is not a specificity battle; the winning rule is the same rule.
3. **Exceptions leave the class attribute entirely.** `data-state="reversed"` cannot collide with a class-based utility and reads as a state to both CSS and JS. From https://cube.fyi/exception.html: *"an exception should only occur in exceptional circumstances (the clue is in the name)."*

### The Flow utility, the composition-layer version of the Stack

SOURCE: https://cube.fyi/composition.html and Andy Bell's 24ways article, https://24ways.org/2018/managing-flow-and-rhythm-with-css-custom-properties/

```css
.flow { --flow-space: 1em; }
.flow > * + * {
  margin-top: 1em;                  /* fallback */
  margin-top: var(--flow-space);
}
```

Contextual override without a modifier class:

```css
.card__content { --flow-space: 1.4rem; }
h2              { --flow-space: 3rem; }
```

Verbatim on why `em` at the utility level and `rem` at the override: *"Notice also how I switch over to using rem units? I want to make sure that these overrides are always based on the root font size."*

And the trap, which is the same one the Every Layout second edition names: *"the custom properties cascade in the same way that other CSS values do, so you've got to keep that in mind. We've got a great example of that where because we've got the flow utility on our .features component, which has a --flow-space override, the child elements of .features will inherit that value, so we've had to set another value on the .features__list element."* Setting `--flow-space` on a container leaks to grandchildren. Set it on the element that needs it.

### Grouping

```html
<article class="[ card ] [ section box ] [ bg-base color-primary ]" data-state="reversed"></article>
```

Order: primary block class, subsequent block classes, standard utilities, design-token utilities. The brackets are optional (pipes work); the point is that a reader can see which layer each class comes from. https://cube.fyi/grouping.html

---

## 3. Spacing systems

### 3.1 The 8pt grid

RULE: Every spacing and dimension value is a multiple of 8, with 4 as a sub-step for small components, icons and type metrics.

SOURCE: Bryn Jackson, "8-Point Grid", https://spec.fm/specifics/8-pt-grid. Verbatim: *"Most popular screen sizes are divisible by 8 on at least one axis, usually both."* And on the real benefit, which is decision reduction not rendering: *"removing 7 of every 8 spacing options... reduces the amount of fiddling available to you and subsequently reduces speed to code."*

What snaps: dimensions, padding, margin, icon frames. What is exempt: letterform rendering itself, which needs sub-pixel freedom for anti-aliasing.

Material's version (https://m2.material.io/design/layout/spacing-methods.html, read via search excerpts because the page is a JS shell, so treat the wording as paraphrase and the numbers as reliable): components on an 8dp grid, icons and some in-component elements on 4dp, and the one rule worth copying, **font size may be any value but line-height must land on a multiple of 8** (their example: 15px type with 24px line-height).

Apple: 8pt base increment, 16pt/20pt screen-edge margins, 44x44pt minimum tap target. CONFIDENCE FLAG: `developer.apple.com/design/human-interface-guidelines/layout` is JS-rendered and would not yield body text to any fetch attempt. The 44pt figure is Apple's own long-documented number and is solid; the explicit "8pt grid" framing is triangulated from secondary compilations and Apple's own text is more principle-based than Material's. Do not cite Apple as a source of a numeric grid without checking in a real browser.

Why 8 and not 10: 8 halves cleanly four times (8, 4, 2, 1), matching 1x/1.5x/2x/3x densities and responsive halving; and the common viewport widths (320, 360, 768, 1024, 1280, 1440, 1920) all divide by 8. That is the honest version. The stronger claims about 10 being mathematically broken do not hold up.

### 3.2 Modular scales for spacing

RULE: Generate the scale geometrically (multiply by a ratio) rather than arithmetically (add a constant), so steps stay tight at the small end where 2px matters and spread at the large end where 2px is invisible.

SOURCE: Tim Brown, "More Meaningful Typography", A List Apart, 2011, https://alistapart.com/article/more-meaningful-typography/. Verbatim: *"A modular scale, like a musical scale, is a prearranged set of harmonious proportions."* And: *"By using culturally relevant, historically pleasing ratios to create modular scales and basing the measurements in our compositions on values from those scales, we can achieve a visual harmony not found in layouts that use arbitrary, conventional, or easily divisible numbers."* Brown explicitly extends it past type: *"type sizes, line height, line length, margins, column widths, and more."*

https://modularscale.com/ offers 17 named ratios: minor second 1.067, major second 1.125, minor third 1.2, major third 1.25, perfect fourth 1.333, perfect fifth 1.5, minor sixth 1.6, golden 1.618, major sixth 1.667, minor seventh 1.778, major seventh 1.875, octave 2, major tenth 2.5, major eleventh 2.667, major twelfth 3, double octave 4, and root-2 1.414.

### 3.3 Utopia

RULE: Name your steps, then let each step's *value* be fluid between a minimum and maximum viewport via `clamp()`, so nothing jumps at a breakpoint.

SOURCE: https://utopia.fyi/space/calculator/ and Gilyead and Mudford, Smashing Magazine, April 2021, https://www.smashingmagazine.com/2021/04/designing-developing-fluid-type-space-scales/. Verbatim: *"Taking 'Step 0' from the fluid type scale as our base unit, we deploy a set of multipliers to create a selection of space units. To keep things simple, we refer to them as T-shirt sizes."*

Nine named steps: `3xs 2xs xs s m l xl 2xl 3xl`, with `s` as the base.

Real generated output from the calculator (min viewport 320px):

```css
--space-s:   clamp(1.125rem, 1.0739rem + 0.2273vw, 1.25rem);
--space-s-m: clamp(1.125rem, 0.8182rem + 1.3636vw, 1.875rem);
--space-s-l: clamp(1.125rem, 0.5625rem + 2.5vw,    2.5rem);
```

**One-up pairs** are the part worth understanding. Each step is also paired with the next step up (`2xs-xs`, `xs-s`, `s-m`), so a gap can grow at a *different rate* than the base scale rather than in lockstep. Verbatim: *"Out of the box, Utopia creates 'single-step pairs' that take one step up the ladder of sizes... you can also create any number of custom pairs, which can create incredibly steep slopes (XS -> 3XL)... or even reverse slopes."* A reverse slope (`2xl-xs`) is spacing that *shrinks* as the viewport grows, which is exactly what a dense panel wants on a phone.

Zero media queries in the entire output.

### 3.4 What real design systems name their steps

Confidence key: [P] read first hand with real body content, [S] triangulated from search results because the docs site is a JS shell.

| System | Naming | Steps | Values | Conf |
| --- | --- | --- | --- | --- |
| IBM Carbon | `spacing-01`..`spacing-13` | 13 | 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160 px | [P] |
| Tailwind | numeric multiplier of 0.25rem | ~35 | 0, 1px, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 96 ... 384 px | [P] |
| Open Props | `--size-1`..`--size-15` plus a fluid family | 15 + 10 fluid | .25, .5, 1, 1.25, 1.5, 1.75, 2, 3, 4, 5, 7.5, 10, 15, 20, 30 rem | [P] |
| Shopify Polaris | legacy t-shirt, new `space-100` = 4px | 7 legacy | none, 4, 8, 12, 16, 20, 32 px | [P] |
| Salesforce Lightning | t-shirt `xxx-small`..`xx-large` | 8 + none | 2, 4, 8, 12, 16, 24, 32, 48 px | [S] |
| Radix Themes | `space-1`..`space-9` | 9 | 4, 8, 12, 16, 24, 32, 40, 48, 64 px | [S] |
| GitHub Primer | `base-size-N`, N is the px value | ~19 | 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 64, 80, 96, 112, 128 px | [S] |
| Atlassian | `space.NNN`, 100 = the 8px base | ~10 + negatives | .025=2, .050=4, .100=8, .200=16, .300=24, .400=32 px | [S] |
| Adobe Spectrum | `spacing-50`..`spacing-1000` | 10+ | 2, 4, 8, 12, 16, 24, 32, 40 ... 96 px | [S] |
| Utopia | t-shirt, 3xs..3xl | 9 + pairs | fluid `clamp()` | [P] |
| Material 3 | numeric tokens, 4dp base | ~5 common | 4, 8, 16, 24, 32 dp | [S] |

The trend, and it is clear: t-shirt names lose to numeric-multiplier names once a system passes about eight steps, because `4xl` carries no information while `space.200` literally says "200% of the base". Pure indices (`spacing-01`, `space-1`) sit in between: ordered and unambiguous, but you always need the table open.

**And the fact that matters most for you: not one of these eleven systems ships a raw modular ratio for component spacing.** Every one uses small linear steps at the bottom (2, 4, 8, 12, 16, all clean grid multiples) widening into roughly geometric growth at the top (24, 32, 48, 64, 96), always landing on a multiple of 4 or 8. Strict ratios are reserved for typography, where fractional rem values are normal.

### 3.5 The case for a small named scale

RULE: A bounded palette turns spacing from an open search into a pick-from-N, and an off-scale value reads to a viewer as a mistake rather than as an intention.

SOURCE: Refactoring UI, "Establish a spacing and sizing system" (p60). The rule with the number in it, quoted consistently across three independent reader summaries: *"make sure no two values in your scale are never closer than about 25%"*, and *"16px is a great number to start with because it divides nicely, and also happens to be the default font size in every major web browser."* The reasoning: *"12px vs 16px is a big difference, but 500px vs 520px won't make a big difference."*

SOURCE: Nathan Curtis, "Space in Design Systems", EightShapes, https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62 (Medium 403s bots; readable at https://nathanacurtis.substack.com/p/space-in-design-systems-188bcbae0d62). His contribution is that **a size name is only half a name**. He defines six spatial roles:

| Role | What it is |
| --- | --- |
| inset | padding on all four sides, *"like the matte of the framed photo on a wall"* |
| inset-squish | an inset with top and bottom reduced, *"in our case by 50%"*, for pills and compact rows |
| inset-stretch | the inverse, vertically elongated, for text areas |
| stack | vertical space between flow siblings. *"The overwhelming majority scroll vertically. And that means one thing: we stack things."* |
| inline | horizontal space between wrapping siblings |
| grid | the layout-level spacing tying the rest together |

And on how many steps is enough, which is the answer to your question: he favours doubling (2, 4, 8, 16, 32, 64) and explicitly ridicules both a too-fine linear scale (*"4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44... when do I use 24 or 28? I dunno"*) and an over-permissive one (*"3s, 4s, 6s, 8s, 9s, 12s, 15s, 16s, 18s, 21s, 24s, 32s... Really? All these options?"*). The test: **once two adjacent steps are close enough that nobody can say when to use one over the other, the scale has stopped making decisions and started causing arguments.**

CSS shape, role-scoped:

```css
--space-inset-md: 1rem;
--space-inset-squish-sm: 0.25rem 0.5rem;
--space-stack-md: 1rem;
--space-inline-sm: 0.5rem;
```

---

## 4. White space as a design material

### 4.1 Macro vs micro, active vs passive

RULE: Macro white space is between major blocks and is noticed. Micro white space is inside and between small elements and works below notice. Both must be intentional.

SOURCE: Mark Boulton, "Whitespace", A List Apart, 2007, https://alistapart.com/article/whitespace/. This is the canonical source for the split. He adds a second, more useful axis: **passive white space** is ordinary breathing room (margins, leading), **active white space** is space deliberately used to isolate one thing and make it the subject. He insists unintentional gaps are a failure, not neutral emptiness.

CSS mapping: macro is your layout tokens (section `margin-block`, grid `gap`, page gutters); micro is `line-height`, `letter-spacing`, and the small `gap` inside a control.

### 4.2 Space belongs to the relationship

RULE: A component must not hardcode its own outer margin, because the right margin is a fact about the layout it happens to be in.

SOURCES, and they are convergent from two different worlds:

- Heydon Pickering, A List Apart 2014 (quoted in full in section 1.6): *"It's like applying glue to one side of an object before you've determined whether you actually want to stick it to something."*
- Max Stoiber, "Margin considered harmful", https://mxstbr.com/thoughts/margin. Three arguments: margin breaks encapsulation (it renders outside the component's own boundary), it kills reusability (one hardcoded value cannot serve every context), and it is the wrong mental model (designers think about space *in relation*, specific to a layout). His fix is a `Stack`/`Spacer` owned by the parent, citing Braid's `<Stack space={3}>` and Tailwind's `space-y-*`.

Two independent lineages, component-API and plain-CSS, arriving at the same rule. Cite them together.

### 4.3 The proximity ratio

RULE: The gap within a group must be visibly smaller than the gap around it, and the *ratio* is what communicates, not either number.

SOURCE: Refactoring UI, "Avoid ambiguous spacing" (p83): *"Whenever you're relying on spacing to connect a group of elements, always make sure there's more space around the group than there is within it."*

No authoritative source gives a required multiplier. NN/g's proximity article gives no measurements at all (confirmed by direct read). Jakob Nielsen's own newsletter at uxtigers.com says only "visibly smaller". The Interaction Design Foundation's demonstration figure is roughly 3 to 4 times. One practitioner blog works an example at 8px within and 24px between, a 3:1 ratio, explicitly tied to that author's own scale.

**So: the qualitative rule is universal, the number is not codified, but every illustrative example lands in the 3x neighbourhood.** On a 1.5 modular scale that is two steps (1.5 squared is 2.25) to three steps (3.375). On an 8pt grid it is 8 inside and 24 between. Treat "one group gap is at least two scale steps above the within-group gap" as a defensible house rule, not as a citation.

```css
.field { display: flex; flex-direction: column; gap: var(--s-2); }  /* label to input */
.field + .field { margin-block-start: var(--s1); }                   /* field to field */
```

### 4.4 Butterick's numbers

SOURCE: https://practicaltypography.com, read directly.

| Thing | Butterick's range |
| --- | --- |
| Point size | 10 to 12pt print, 15 to 25px web |
| Line spacing | 120% to 145% of point size |
| Line length | 45 to 90 characters including spaces |
| Page margins | 1.5 to 2.0 inches at 12pt, and explicitly conditional on point size |

He rejects the word-processor 1-inch default as a monospaced-typewriter leftover. Note his line-length range is wider than Bringhurst's 45 to 75, which is what Every Layout cites for the `--measure: 60ch` axiom. Both are defensible; 60ch sits comfortably inside both.

### 4.5 The 20% comprehension claim is folklore, and you should say so

RULE: Do not repeat *"white space increases comprehension by almost 20% (Lin, 2004)"*. It is fabricated by citation drift.

SOURCE: Carl Myhill traced it, https://www.linkedin.com/pulse/lin-2004-did-discover-margins-white-space-increase-20-carl-myhill. The chain: Galitz's 2007 UI textbook attributed a 20% figure to "Lin, 2004"; the actual Lin 2004 paper is *"Evaluating older adults' retention in hypertext perusal"*, a study of 24 Chinese-speaking adults aged 62 to 80 comparing hypertext presentation formats, containing nothing about white space or margins. Professor Lin, contacted directly, confirmed in writing that the paper *"has nothing to do with whitespace, not to mention the so-called increase of comprehension by 20%."*

This is the same failure shape your own project keeps paying for: a confident sentence that outlived its facts, repeated because it had a citation stapled to it. There is no controlled study establishing a comprehension percentage for white space. The honest claim is that adequate leading and margins aid reading, per the typography literature, with no number attached.

---

## 5. Gestalt, applied to UI

Every principle below is from Nielsen Norman Group's Gestalt series unless noted, and each of theirs comes with a named product failure, which is why they are worth citing over the psychology textbooks.

| Principle | RULE | The CSS decision it governs | Documented failure |
| --- | --- | --- | --- |
| Proximity | Things close together read as one group; distance alone is enough to group. | the ratio between within-group and between-group `gap` | California EDD put an "Add" button in a row of unrelated Next/Save/Cancel buttons. iTunes put an "Update Available" button far from the app icons it applied to: *"I didn't notice this button because the action is simply too far removed from the objects it applies to."* Transport for London had two related links side by side on desktop that stacked on mobile, losing the cue entirely. |
| Similarity | Shared appearance is a promise of shared behaviour. | whether two controls share a class or a colour token | Tribute.co put a decorative red icon beside a red button; users read them as one control. Synchrony Bank styled Cancel, Submit and Add Attachment as three identical green buttons, so nothing said which was primary or destructive. |
| Common region | A shared boundary or background groups things regardless of distance. | `border`, `background`, card | see below, this is the main event |
| Continuity | The eye follows an alignment and keeps grouping along it. | a single `grid-template-columns` so every label and field shares one left edge | No named branded case exists. The generic failure is ragged form fields: unaligned left edges break the implicit line so each field reads alone. Flagging this as a real gap in the literature rather than inventing an example. |
| Closure | People complete a partial shape, so you do not have to draw every edge. | deliberate cropping at a scroll container's edge | Target's carousel crops the next card at roughly 40%, which reads as "more, swipe". HelloFresh's peek is so small it is *"very easy to miss"*. Headspace's Sleep page looks complete above the fold so users do not scroll. Closure working against the designer. |
| Figure/ground | Contrast, overlap, shadow and sharpness decide what is actable and what is backdrop. | `box-shadow`, `z-index` plus a dimming overlay, visible link styling | NN/g's 71-participant eyetracking study across 9 site pairs: weak-signifier (flat) pages took **22% more time** and produced **25% more eye fixations**, both p < 0.05. On Brilliant Earth, only 12 of 24 users followed the expected scan path when a link matched static text styling, versus 25 of 29 when it looked like a link. |
| Uniform connectedness | An explicit connector (a line, a stroke) groups more strongly than proximity or similarity. | a shared `border-left` accent, a `::before` rule through a stepper | transit maps threading one coloured stroke through every station. IxDF treats this as distinct from common region: the connector is active, the region is passive. |

Sources: https://www.nngroup.com/articles/gestalt-proximity/, /gestalt-similarity/, /common-region/, /principle-closure/, /articles/closeness-of-actions-and-objects-gui/, /articles/flat-ui-less-attention-cause-uncertainty/, https://ixdf.org/literature/topics/gestalt-principles

### 5.1 COMMON REGION vs PROXIMITY, which is your actual question

**The finding: when the two conflict, common region wins. This is experimentally established, not a designer's preference.**

SOURCE: Stephen Palmer, "Common region: a new principle of perceptual grouping", Cognitive Psychology, 1992, https://pubmed.ncbi.nlm.nih.gov/1516361/. Dots inside a drawn boundary group together *even when they sit closer to dots outside it*. CONFIDENCE FLAG: PubMed full text was behind a CAPTCHA, so this is from the abstract and its secondary citations, not a verified read of Palmer's body text. A 2017 follow-up, "Common region wins the competition between extrinsic grouping cues", Psychonomic Bulletin & Review, https://link.springer.com/article/10.3758/s13423-017-1254-3, asserts the same in its title; Springer's login wall blocked the body, so the paper's existence and its title's claim are what is reported.

NN/g's working example, https://www.nngroup.com/articles/common-region/: on the Food Network tablet app, user ratings sat closer to the wrong recipe than the right one. Wrapping each recipe in a card fixed the misreading **with no change to any spacing**. That is your rule in one case study: when proximity has already failed and you cannot afford the space to fix it, a region is the tool.

**WHEN TO DRAW THE LINE, AND WHEN SPACE DOES THE JOB.** NN/g's actual guidance, extracted:

Use a container (border or background) when:
- white space alone does not sufficiently signal the relationship
- you need to show **two grouping relationships at once** in the same view (their example: a comparison table with row groups *and* column groups). This is the strongest single trigger and it is the one people miss. Space has one axis of strength; a region can carry a second grouping on top of it.
- testing showed people were actually confused without a boundary
- the information is dense or complex

Prefer space alone when there is only one grouping relationship to communicate and there is room. Verbatim: *"using whitespace alone to create clear groupings reduces the visual complexity."*

Their Wellington City Council example is the nuance: a search-label-to-icon confusion *"could be improved by using either proximity or common region"*. At the margin the two are interchangeable and the choice is a budget question. How much visual noise are you willing to add versus how much space are you willing to spend.

**THE COST OF OVERUSING IT, which is your other half.** Dave Rupert, "Pitfalls of Card UIs", https://daverupert.com/2018/04/pitfalls-of-card-uis/, names the mechanism under a heading called "Hierarchy arms race": *"Once something is a card, it has a border, now everything else craves a border. Over a few iterations, everything becomes a card."* He also describes cards becoming *"Baby Webpages"*: a container that starts as a preview and accumulates menus and CTAs until it is a page, defeating the grouping it was drawn for.

DesignerUp, https://designerup.co/blog/ui-design-tips-boxes-and-borders/: *"Outlines are meant to contain your content, not imprison it."* Borders only slightly darker than the background, or brand-tinted, never black; shadows as a full substitute in most cases.

**THE LADDER.** No single source states this as a named four-rung hierarchy. It is my synthesis of convergent guidance from NN/g, Refactoring UI, uxtigers and the Palmer line, and I am flagging it as synthesis rather than citation. Weakest and cheapest first:

1. **Space.** Nielsen calls proximity *"the cheapest grouping tool"*. One axis. No ink. Try it first.
2. **Background tint.** A region with no edge. Groups without adding a line to the composition.
3. **Shadow / elevation.** A region plus a figure/ground cue. Refactoring UI's stated first alternative to a border.
4. **Border.** The strongest, because it is the one proven to override every other cue. Reach for it last, precisely because its strength is what makes it spread.

Refactoring UI's own ordering, from "Use fewer borders" (p206), is exactly this: box shadow first, then two slightly different background colours, then extra spacing, and only then a border. (Triangulated from three independent reader summaries; the book's primary text is paywalled and a Medium excerpt fetch returned 403.)

**THE OPERATIONAL TEST for your components, which is what you asked for:**

> Count the grouping relationships this region has to express. If it is one, and you can afford two scale steps of space, use space. If it is two at once, or the space is not available, draw the region. If you have already drawn a region around the parent, the child gets space, never a second region.

The last clause is the boxes-in-boxes rule. Common region overrides proximity, so nesting regions means the inner one competes with the outer one for the same job and the reader gets two answers to one question.

CONFIDENCE NOTE, worth keeping straight: the *override effect* (Palmer, the 2017 study) is a lab finding. The *"prefer space over border"* convention (Refactoring UI, Rupert, DesignerUp) is convergent professional advice built on top of it, not itself experimentally validated.

---

## 6. Optical vs geometric alignment

### 6.1 What is actually true, and what is repeated without a source

The honest summary first, because this area is thick with numbers nobody can trace.

**Solid:**
- A circle must be scaled to **112.84%** of a square of the same width to read as equally weighted. This is a real geometric derivation: 1/sqrt(pi/4), compensating for a circle filling only about 78.5% of its bounding box. SOURCE: Bjango, "Formulas for optical adjustments", https://bjango.com/articles/opticaladjustments/, which is a credible design-tooling source and notably **does not** offer a universal "X% above centre" rule; its whole stance is per-shape formulas, not one constant.
- Round letterforms (O, C, S) are drawn 1 to 3% taller than flat-topped ones (H, I) to look the same size. This is established type-design fact, the same overshoot principle. SOURCE: Fonts.com Fontology, "Display Margins & Centering", https://www.fonts.com/content/learning/fontology/level-2/display-typography/display-margins-centering, and Pangram Pangram, https://pangrampangram.com/blogs/journal/optical-vs-mathematical-alignment.
- Material's 24x24dp icon canvas carries 2dp padding on all sides, giving a 20x20dp live area, specifically so an icon's optical size matches surrounding text rather than filling its box. SOURCE: https://m2.material.io/design/iconography/system-icons.html
- IBM Carbon's tracking rule, which is a real checkable design-system rule: **no letter-spacing on display sizes; tracking is reserved for 14px and below.** 16px body gets +0.16px; small labels and captions up to +0.32px. SOURCE: https://carbondesignsystem.com/elements/typography/type-sets/

**Folklore, flagged:**
- The "optical centre is 45% / 46% down rather than 50%" figure. It circulates across SEO design content with no traceable primary measurement. Same shape of problem as Lin 2004.
- The "1/8 to 1/10 of height" nudge. It appears in practitioner blogs (e.g. The Paper Mill Store) as a rule of thumb, never as a measurement.
- An npm package, `optical-center` / opticalcenter.dev, claims a "3.5% upward shift" as *"a well-documented perceptual bias"* and cites six vision-science papers spanning 1966 to 2005. The citation list has the shape of generated plausibility rather than a literature review, attached to a small single-maintainer SVG tool. Do not cite the 3.5% or its validation numbers without reading the underlying papers yourself.

The directional claim (a geometrically centred thing reads slightly low, so nudge it up) is universally agreed. The magnitude is not sourced anywhere credible. Treat it as an eye judgment, not a constant.

### 6.2 The specific cases

**Play triangle in a circle.** Align by centroid, not bounding box; for an equilateral triangle the centroid, incentre, circumcentre and orthocentre coincide, so this is computable rather than eyeballed (Bjango). Concrete offset, from Adam Arant, https://adamarant.com/en/blog/optical-alignment-in-ui-7-spacing-fixes-math-gets-wrong: shift **3 to 6% of icon width toward the point**, which on a 24px icon is about 1px. There is a dissenting piece worth reading before you cargo-cult this, https://medium.com/@punchycherish/the-play-button-is-not-optical-alignment-4cea11bda175, arguing the "shift right by X%" advice is applied without checking the specific icon's geometry.

```css
.icon-play { transform: translateX(1px); }  /* ~4% of a 24px icon, toward the point */
```

CONTRADICTION FLAG: Arant's 3 to 6% and Bjango's 112.84% are measuring different things (point offset vs area matching). Do not average them.

**Icons in buttons.** An icon set to the literal font-size reads too big, because icons carry ink differently than glyphs and usually ship with built-in safe-area padding. The professional answer is to size against cap height, not the em square, which is precisely what Every Layout's Icon does with `1cap`. Padding is asymmetric for the same reason: the icon's silhouette fills less of its box than text does, so symmetric padding makes the icon side look wide. Arant's number: trim 2 to 4px from the trailing padding, or trim the SVG viewBox. SOURCE: https://blog.damato.design/posts/button-size-styles/ and Slava Shestopalov, https://medium.com/design-bridges/optical-effects-9fca82b4cd9a

```css
.btn-icon {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  padding-inline: 1rem 0.875rem;   /* trailing trimmed */
}
.btn-icon svg { inline-size: 1cap; block-size: 1cap; }
```

**Text in circles and pills.** Round glyphs read smaller than flat ones at the same box height, so a badge containing `0` and one containing `1` are not optically identical, and a two-character pair has its own combined-bounding-box asymmetries. GAP FLAG: no source gives a numeric offset difference for one character vs two. The claim is directionally supported and quantitatively unsourced. `font-variant-numeric: tabular-nums` at least makes digit pairs consistent width, which is the one thing CSS can do here.

**Hanging punctuation.** Real property, real spec, effectively Safari-only:

```css
p { hanging-punctuation: first last allow-end; }
```

Grammar: `none | [first || [force-end | allow-end] || last]`. MDN (page last modified April 2026) marks it **not Baseline**, with Chrome, Edge and Firefox not supporting it. So for a cross-browser pull quote the answer is still a `::before` with a negative margin, or negative `text-indent`.

**Tracking.** Carbon's rule above. Arant gives compatible numbers for a different family: +0.04em to +0.06em on 12px uppercase labels, zero at body sizes, -0.01em to -0.02em above 40px. Same direction, different constants, because tracking is family-specific. For a monospace instrument panel this matters more than usual: uppercase keys and labels in a mono face almost always want positive tracking, and your readout numerals almost certainly want none.

**Uppercase vertical centring.** All-caps has no descenders and a taller relative cap height, so line-box centring puts it visually low relative to the same text in sentence case. The effect is old enough to appear in typesetting-apparatus patents. GAP FLAG: no modern design-system source states a numeric offset. The real fix is to stop centring against `line-height` and start centring against cap height, which is what the next item is for.

### 6.3 What can actually be automated

| Problem | CSS answer | Support, 2026 |
| --- | --- | --- |
| Half-leading, so a text box hugs cap height and baseline | `text-box-trim` / `text-box-edge`, shorthand `text-box` | **Baseline 2026, newly available** per MDN (August 2026). Chrome/Edge 133+, Safari 18.2+. Firefox is the remaining gap. |
| Size an icon to cap height | `1cap` | Firefox only. `rcap` nowhere. Keep an `em` fallback. |
| Hanging punctuation | `hanging-punctuation` | Safari only, not Baseline. |
| CJK-width equivalent of `ch` | `ic` | most browsers, Firefox lagging |
| x-height | `ex` | broad (falls back to 0.5em) |
| Optical letterform selection at display vs text size | `font-optical-sizing: auto` | broadly shipped, on by default for variable fonts with an `opsz` axis |
| Vertical centring of icon and text in a button | `align-items: center` | universal, and it solves the *box* problem only |
| Icon ink weight, triangle offsets, round-vs-square area | nothing | manual per asset, baked into the SVG or a `transform` |

```css
h1 {
  text-box: trim-both cap alphabetic;   /* shorthand */
  /* long form: text-box-edge: cap alphabetic; text-box-trim: trim-both; */
}
```

Spec: CSS Inline Layout Level 3, https://drafts.csswg.org/css-inline-3/#text-box-trim. Pre-native equivalent: Capsize, https://capsizecss.com, which reads a font's own metrics tables and computes font-size, line-height and margin corrections. Still useful as a Firefox fallback and as an explanation of the mechanism.

**`text-box-trim` is the single most valuable item in this report for your kind of interface.** A dark panel with tight rows lives or dies on whether a label's box is its ink or its line-height, and until now it was hand-tuned margins. It now has a property.

### 6.4 The professional rule

RULE: Math is the default and the starting point. The eye is the final check and the per-asset override. The exceptions are specific and enumerable (round shapes, triangle points, punctuation at a flush margin, caps-vs-mixed vertical centring), not a licence to abandon the grid.

SOURCES: Pangram Pangram, https://pangrampangram.com/blogs/journal/optical-vs-mathematical-alignment (*"good typography typically favours the optical"*, framing mathematical alignment as *"objective, calculated, and automated"* and optical as *"interpretive"*); Design With FontForge, http://designwithfontforge.com/en-US/Trusting_Your_Eyes.html, which is stronger than a blog because it is operational documentation from inside glyph drawing.

None of these sources argue for discarding systematic spacing. That is the distinction that keeps "trust your eye" from becoming the pixel-nudging you are trying to get out of.

---

## 7. Refactoring UI (Wathan and Schoger)

The book is paid. I read the authors' own free chapter in full, https://refactoring-ui.nyc3.cdn.digitaloceanspaces.com/Refactoring%20UI%20-%20Start%20with%20too%20much%20white%20space.pdf (text also at archive.org), which also carries the complete table of contents. Everything marked [S] below is triangulated from three or more independent reader summaries that agree closely (ajnisbet.com, maibuith.com, iamaatoh.com, the selcukcihan gist), not a verified page-and-line read.

### 7.1 Spacing

**Start with too much white space (p56).** [P, read in full] The rule, verbatim: *"One of the easiest ways to clean up a design is to simply give every element a little more room to breathe."*

The mechanism, and this is the part that is actually operational: *"When designing for the web, white space is almost always added to a design. If something looks a little too cramped, you add a bit of margin or padding until things look better. The problem with this approach is that elements are only given the minimum amount of breathing room necessary to not look actively bad."*

**The inversion: *"A better approach is to start by giving something way too much space, then remove it until you're happy with the result."*** And why it works: *"what might seem like 'a little too much' when focused on an individual element ends up being closer to 'just enough' in the context of a complete UI."*

And they explicitly carve out your case, which matters because a positron panel is a dashboard: *"if you're designing some sort of dashboard where a lot of information needs to be visible at once, packing that information together so it all fits on one screen might be worth making the design feel more busy. The important thing is to make this a deliberate decision instead of just being the default. **It's a lot more obvious when you need to remove white space than it is when you need to add it.**"*

That last sentence is the whole chapter. Additive spacing has no stopping signal, so you tune forever. Subtractive spacing has one, so you stop.

**Establish a spacing and sizing system (p60).** [S] Base 16px because it divides nicely and is every browser's default. Build with factors and multiples. **No two adjacent values closer than about 25%.** The reasoning: 12 vs 16 is a big difference, 500 vs 520 is not. The scale attributed to the book across sources: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 640, 768.

**Avoid ambiguous spacing (p83).** [S] *"Whenever you're relying on spacing to connect a group of elements, always make sure there's more space around the group than there is within it."*

**You don't have to fill the whole screen (p65).** [S] Fixed max widths beat stretching. **Grids are overrated (p72):** *"There are situations where it makes more sense to give an element a fixed width instead of relative width."* **Relative sizing doesn't scale (p79):** *"Let go of the idea that everything needs to scale proportionately."* Their example: a headline shrinks by a different ratio than body text between desktop and mobile (a 2:1 heading-to-body ratio on desktop becomes about 1.7:1 on mobile, with body reduced 20%).

CONTRADICTION FLAG, and it is a real one: "Grids are overrated" and "relative sizing doesn't scale" sit directly against Every Layout's intrinsic-sizing axiom. Refactoring UI is a book by designers about making a specific comp look right; Every Layout is a book by engineers about making an unknown comp not break. My read: Refactoring UI is correct that a *sidebar* should have a max width rather than a percentage, and Every Layout agrees (that is literally the Sidebar's `flex-basis`). Where they genuinely diverge is on media queries, and Every Layout has the better argument for your case because your pages are viewed on a phone, a desktop and a headset.

### 7.2 Hierarchy

**Not all elements are equal (p30) / Size isn't everything (p32).** [S] *"Every action on a page sits somewhere in a pyramid of importance."* Stick to 2 or 3 text colours (dark primary, grey secondary, lighter grey tertiary) and 2 font weights (400 to 500 for normal, 600 to 700 for emphasis). Avoid weights below 400; use a lighter colour or smaller size instead.

**Emphasize by de-emphasizing (p39).** [S] The rule, and it is the one you asked for: *"When the main element isn't standing out enough and you can't add anything to it to emphasize it, try de-emphasizing other elements that are competing with it."* Reworded by another summary: *"change the secondary stuff to make the primary stand out, instead of focusing on the primary's attributes."*

Why this matters more than it sounds: emphasis is additive and therefore unbounded. If the primary button gets bigger, the secondary one eventually does too, and you are back in the hierarchy arms race Rupert described for borders. De-emphasis is bounded because there are only so many steps down to the background.

```css
/* wrong: escalate the primary */
.btn-primary { font-size: 1.25rem; font-weight: 700; }
/* right: recede the others */
.btn-secondary { color: var(--muted); background: none; border: none; }
```

**Don't use grey text on colored backgrounds (p36).** [S] *"Grey on white is reduced contrast"*, and that is why it works there. On a coloured background grey is a different hue fighting the background, so it reads washed out or disabled. Reduced-opacity white has the same problem: *"it often results in text that looks dull, washed out, and sometimes even disabled."*

The fix: hand-pick a colour with the **same hue as the background**, then adjust saturation and lightness until the contrast is right.

```css
/* wrong */
.panel { background: hsl(210 40% 16%); }
.panel .muted { color: #888; }
/* right: same hue, walked toward the background */
.panel .muted { color: hsl(210 22% 62%); }
```

For a dark instrument panel this is the single highest-value rule in the book. Your background is not white, so every grey you inherited from a light-mode habit is wrong, and it will read as "disabled" on a control that is not.

**Separate visual hierarchy from document hierarchy (p46) / Semantics are secondary (p52).** [S] An `h1` does not have to be the biggest thing. Gmail's `h1` is not 72px.

**Labels are a last resort (p41).** [S] If the value is self-evident ("Kristjan Jansen" is obviously a name), the label is noise. If you must label, make the label the de-emphasized half, not the value.

### 7.3 Padding and border relationships

**Use fewer borders (p206).** [S] The alternatives, in their stated order of preference: box shadow (works best when the element is not the same colour as the background), two slightly different background colours for adjacent elements, extra spacing. Border last.

**Padding relationship.** [S] Connected components need less space between them than disconnected ones. In practice this is the proximity ratio expressed as padding: a card's inner padding should be smaller than the gap between cards, or the cards visually merge.

**Line-height is proportional (p105).** [S] Line height is inversely proportional to font size. 1.5 for body, tighter for display, looser for small text. Do not set one line-height globally.

**Keep your line length in check (p99).** [S] 45 to 75 characters. Consistent with Bringhurst and with Every Layout's `--measure: 60ch`.

**Use letter-spacing effectively (p115).** [S] Tighten headlines, open up all-caps, leave everything else alone. Consistent with Carbon.

**Supercharge the defaults (p192).** [S] Replace bullets with icons, style checkboxes and radios in brand colours, give links a thick coloured underline that partially overlaps the text. This is the chapter that answers "make it look designed rather than defaulted": **a default is a place where no decision was made, and the eye can tell.** The repair is one deliberate choice per default, not a redesign.

**Use shadows to convey elevation (p158) / Shadows can have two parts (p163).** [S] A small tight shadow for ambient occlusion plus a larger diffuse one for elevation; bigger shadows for dialogs. `box-shadow: inset 0 1px 0 hsl(...)` for a subtle top highlight, `box-shadow: 0 1px 3px hsla(...)` for depth.

**Ditch hex for HSL (p119) / You need more colors than you think (p123) / Define your shades up front (p129).** [S] HSL because you can reason about it. The grey-on-coloured fix above is only writable in HSL.

---

## 8. Contradictions, collected

**1. Owl margin vs `gap`.** Every Layout's own second edition moved most primitives to `gap` and argued margin-on-children is broken under nesting, while keeping the Stack on margin. Both are right about different things. Resolution in section 1.6: `gap` for uniform gutters in nestable containers, owl for flow where individual children need exceptions or an auto margin. The Reel still uses the owl and probably should not; that is Every Layout being inconsistent with itself.

**2. 8pt grid rigidity vs modular-scale ratios.** A 1.618 scale from 16px gives 16, 25.9, 41.9, 67.8, none of which are multiples of 8 or even integers. **Not one of the eleven verified design systems ships a raw ratio scale for spacing.** They all use grid-multiple values chosen to *approximate* geometric growth: linear at the bottom (2, 4, 8, 12, 16), roughly 1.3 to 1.7 between consecutive steps at the top (24, 32, 48, 64, 96), always landing on 4 or 8. Strict ratios are reserved for typography, where fractional rem is normal and the whole-pixel-edge rationale does not bind. Material captures the split exactly: font-size can be anything, line-height must land on the grid. Every Layout's `--s1: calc(1rem * 1.5)` gives 24px, `--s2` gives 36px, `--s3` gives 54px, which is not grid-aligned past `--s2`, and Every Layout would say that is the point.

**3. Utopia's `clamp()` vs snapping to a fixed grid.** Not a real contradiction. Utopia answers "how does one named step change across viewports"; the token scales answer "how many steps exist at any one viewport". A Utopia consumer still uses `s`, `m`, `l`; only the value behind each name is fluid.

**4. Refactoring UI's "grids are overrated" and "relative sizing doesn't scale" vs Every Layout's intrinsic sizing axiom.** Discussed in 7.1. They partly agree (max-width beats percentage) and genuinely diverge on media queries. For a site viewed on a phone, a desktop and a headset, Every Layout has the better argument.

**5. Border as a grouping device: strongest cue vs last resort.** Both true and both load-bearing. Common region overrides proximity (Palmer), which is exactly why Refactoring UI, Rupert and DesignerUp all say reach for it last. Its strength is the reason for its restraint, not an argument against it.

**6. The proximity ratio has no codified number.** Universal qualitative rule, no standardised multiplier. Every illustrative example lands near 3x. Use that as a house rule, not as a citation.

**7. Optical-centring magnitudes.** The direction is agreed by everyone. Every specific number (45%, 46%, 3.5%, 1/8 of height) is either untraceable or thinly sourced. The only rigorously derived number in the area is Bjango's 112.84% circle-to-square, and it answers a different question.

**8. Lin 2004 / 20% comprehension is fabricated.** Traced to source and confirmed by the cited author in writing. Do not repeat it.

**9. Material Design 3 and Apple HIG figures in this report are secondary.** Both sites are JS-rendered SPAs that serve no body text to a fetch. Apple's 44x44pt is independently solid; the rest of their numbers, and Material 3's token table, are triangulations. Re-verify in a real browser before either becomes a rule in a skill.

---

## 9. The distilled rule set, for the skill

Ordered as decisions, not as topics.

**Sizing**
1. No `px` for anything a user can scale. `rem` for block sizing, `em` for inline and icons, `ch` for measure, `1cap` (with an `em` fallback) for icons beside text.
2. Prefer a suggestion to a prescription. `flex-basis`, `min-block-size`, `max-inline-size` over `width` and `height`.
3. Declare the *cell* size, let the browser derive the *count*. `repeat(auto-fill, minmax(min(<cell>, 100%), 1fr))`.
4. `box-sizing: border-box` universally, with `content-box` as the named exception where a measure is being measured.

**Space**
5. One base, one ratio, named steps, and nothing typed that is not on the list. Set the ratio from your body line-height.
6. Space belongs to the relationship. A component does not own its outer margin. Either the parent injects it (owl or `gap`) or it does not exist.
7. `gap` for uniform gutters in a nestable container. Owl (`> * + *`) for vertical flow that needs per-child exceptions or an auto-margin split.
8. Override space with a custom property on the child, never by writing a more specific selector.
9. The gap within a group must be at least two scale steps below the gap around it. That ratio is the grouping, not the numbers.
10. Start with too much and remove. Adding has no stopping signal; removing does.

**Grouping**
11. Count the grouping relationships. One relationship plus available space means space. Two relationships at once, or no space, means a region.
12. Ladder: space, then background tint, then shadow, then border. Reach down the ladder only when the rung above has failed.
13. Never a region inside a region. A boxed parent gives its children space, not a second box.
14. Similarity is a promise. Two things that look the same must behave the same.

**Composition**
15. Layout layer owns `display`, `gap`, `margin`, `grid-template`, `flex-*`. It owns no colour, no font, no shadow, no border.
16. A block file that passes 80 to 100 lines is two blocks, or it is doing the layout layer's job.
17. A state is a `data-` attribute, not a class.
18. Write the far-reaching rule, then list the exceptions. Never list the recipients.

**Hierarchy**
19. De-emphasize rather than emphasize. Emphasis is unbounded, de-emphasis is not.
20. No grey text on a coloured background. Same hue as the background, walked in saturation and lightness.
21. Two or three text colours, two font weights. Never a weight below 400.
22. A default is a decision nobody made, and it shows. One deliberate choice per default.

**Optical**
23. Trust the math, then override per asset at the four known divergences: round shapes against square ones, a triangle's point, punctuation at a flush margin, and caps against mixed case.
24. Use `text-box-trim` for label rows. It is Baseline 2026 with Firefox outstanding, and it replaces hand-tuned margins on tight interfaces.
25. Tracking positive on small caps and labels, zero at body size, slightly negative above about 40px. Never on numeric readouts.

**And the one that governs all of them**
26. If you are changing a number to make a screenshot look right, the number is in the wrong place. Find the relationship it should have been derived from, and name that instead.

---

## 10. Sources

Every Layout
- https://every-layout.dev/rudiments/axioms/
- https://every-layout.dev/rudiments/boxes/
- https://every-layout.dev/rudiments/composition/
- https://every-layout.dev/rudiments/units/
- https://every-layout.dev/rudiments/modular-scale/
- https://every-layout.dev/rudiments/global-and-local-styling/
- https://every-layout.dev/layouts/stack/
- https://every-layout.dev/layouts/sidebar/
- https://every-layout.dev/layouts/switcher/
- https://every-layout.dev/blog/second-edition/
- https://every-layout.dev/blog/algorithmic-design/
- Component code, publicly served: `https://every-layout.dev/downloads/{Stack,Box,Center,Cluster,Sidebar,Switcher,Cover,Grid,Frame,Reel,Imposter,Icon,Container}.zip`
- https://alistapart.com/article/axiomatic-css-and-lobotomized-owls/

CUBE CSS
- https://cube.fyi/ and its composition, utility, block, exception and grouping pages
- https://piccalil.li/blog/cube-css/
- https://24ways.org/2018/managing-flow-and-rhythm-with-css-custom-properties/

Spacing
- https://spec.fm/specifics/8-pt-grid
- https://m2.material.io/design/layout/spacing-methods.html
- https://alistapart.com/article/more-meaningful-typography/
- https://modularscale.com/
- https://utopia.fyi/space/calculator/
- https://www.smashingmagazine.com/2021/04/designing-developing-fluid-type-space-scales/
- https://nathanacurtis.substack.com/p/space-in-design-systems-188bcbae0d62 (mirror of https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62)
- https://www.ibm.com/standards/carbon/guidelines/spacing/
- https://v3.tailwindcss.com/docs/customizing-spacing
- https://raw.githubusercontent.com/argyleink/open-props/main/src/props.sizes.css

White space
- https://alistapart.com/article/whitespace/
- https://mxstbr.com/thoughts/margin
- https://practicaltypography.com
- https://www.linkedin.com/pulse/lin-2004-did-discover-margins-white-space-increase-20-carl-myhill

Gestalt
- https://www.nngroup.com/articles/gestalt-proximity/
- https://www.nngroup.com/articles/gestalt-similarity/
- https://www.nngroup.com/articles/common-region/
- https://www.nngroup.com/articles/principle-closure/
- https://www.nngroup.com/articles/closeness-of-actions-and-objects-gui/
- https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/
- https://ixdf.org/literature/topics/gestalt-principles
- https://pubmed.ncbi.nlm.nih.gov/1516361/ (Palmer 1992, abstract only)
- https://link.springer.com/article/10.3758/s13423-017-1254-3 (title claim only)
- https://daverupert.com/2018/04/pitfalls-of-card-uis/
- https://designerup.co/blog/ui-design-tips-boxes-and-borders/

Optical
- https://bjango.com/articles/opticaladjustments/
- https://adamarant.com/en/blog/optical-alignment-in-ui-7-spacing-fixes-math-gets-wrong
- https://pangrampangram.com/blogs/journal/optical-vs-mathematical-alignment
- http://designwithfontforge.com/en-US/Trusting_Your_Eyes.html
- https://www.fonts.com/content/learning/fontology/level-2/display-typography/display-margins-centering
- https://carbondesignsystem.com/elements/typography/type-sets/
- https://m2.material.io/design/iconography/system-icons.html
- https://drafts.csswg.org/css-inline-3/#text-box-trim
- https://capsizecss.com/
- MDN: `hanging-punctuation`, `text-box-trim`, `text-box-edge`, `<length>`

Refactoring UI
- https://refactoring-ui.nyc3.cdn.digitaloceanspaces.com/Refactoring%20UI%20-%20Start%20with%20too%20much%20white%20space.pdf (the authors' free chapter, read in full, also carries the complete TOC)
- https://www.ajnisbet.com/blog/refactoring-ui
- https://maibuith.com/notes/refactoring-ui
- https://iamaatoh.com/essays/refactoring-ui.html

No files were created or edited. Research only.
