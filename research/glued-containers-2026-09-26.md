<!-- research/glued-containers-2026-09-26.md -->
<!-- Produced 2026-09-26 by a web research agent. Every CSS block is from a real
     source file (raw.githubusercontent.com, npm tarballs, spec drafts), never
     reconstructed; blog measurements, bug reports and inference are labelled as
     such, and section 8 lists what was NOT verified in a browser. It is the
     third of four strands behind the composition skill written the same day,
     after ui-corrections-taxonomy-2026-09-26.md and layout-systems-2026-09-26.md.
     The pattern this repository calls "gluing" has nine names across the
     industry and no single one, which is why it keeps being reinvented. -->

# Gluing: how the industry builds one surface out of stacked rounded sections

Research done 2026-09-26. Every CSS block below was pulled from a real source file (raw.githubusercontent.com, npm tarballs, or a spec draft), not reconstructed. Where something is a blog measurement, a bug report or my own inference, it is labelled. Four parallel researchers plus my own fetches; disagreements between them are resolved in the text and flagged.

---

## 0. What the pattern is called

There is no single industry name, which is why it keeps getting reinvented. The names that actually exist, each of which is the same object:

| Name | System | Source |
| --- | --- | --- |
| **Inset grouped list** / grouped style | Apple, `UITableView.Style.insetGrouped`, `.listStyle(.insetGrouped)` | https://developer.apple.com/documentation/uikit/uitableview/style-swift.enum/insetgrouped |
| **Boxed list** | GNOME libadwaita, `.boxed-list` style class | https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/boxed-lists.html |
| **Bordered box** / BorderBox | GitHub Primer, `.Box` + `.Box-row` | https://primer.style/view-components/components/beta/borderbox/ |
| **List group** (and `list-group-flush`) | Bootstrap | https://getbootstrap.com/docs/5.3/components/list-group/#flush |
| **Card with header/body/footer** | Bootstrap, Ant, Polaris | https://getbootstrap.com/docs/5.3/components/card/ |
| **Structured list** | IBM Carbon | https://carbondesignsystem.com/components/structured-list/style/ |
| **Settings card / SettingsExpander** | WinUI / Windows Community Toolkit | https://learn.microsoft.com/en-us/dotnet/communitytoolkit/windows/settingscontrols/settingsexpander |
| **Preferences group** | libadwaita `AdwPreferencesGroup` | https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.PreferencesGroup.html |
| **Segmented control / button group / toggle group** | the same thing rotated 90 degrees | see section 5 |

Apple's own doc for the SwiftUI style is the clearest one-sentence statement of the goal: "the inset grouped list style displays a continuous background color that extends from the section header, around both sides of list items in the section, and down to the section footer. This visually groups the items to a greater degree than either the inset or grouped styles do." (https://developer.apple.com/documentation/swiftui/liststyle/insetgrouped)

---

## 1. Canonical implementations, and the outer-clips vs children-round question

### The tally

**Children round their own first and last corners** (majority): Bootstrap (list-group, card, accordion, card-group), GitHub Primer BorderBox, Ant Design (Card, Descriptions, Collapse), GNOME libadwaita, Radix's own live accordion demo, shadcn Table, Apple's grouped lists.

**Outer container clips**: Tailwind's documented `overflow-hidden rounded-lg` idiom, Shopify Polaris's current `Card`, Material Design's Card (a single element, so it can).

**Sidesteps the question**: IBM Carbon (stays square, no radius at all), Atlassian (no radius in the component, pushed up to whatever wraps it), shadcn's default Card (permanent `py-6` padding so children never touch the frame).

### Why children-round wins, with evidence rather than taste

The systems that hand-roll per-child radius all do so because something inside a row legitimately needs to paint outside its own rectangle, and an `overflow` ancestor would silently eat it:

- Bootstrap gives `.list-group-item.active` `z-index: 2` with the comment "Place active items above their siblings for proper border styling", and `.accordion-button:focus` gets a raised z-index for its focus ring.
- Primer's `.Box-row` carries hover, focus and drag-handle states.
- libadwaita rows use `@include focus-ring($offset: -1px)`, a deliberately *negative* offset so the ring survives being near the card edge.

A clipped focus ring is a WCAG 2.4.7 failure, not a cosmetic one. `overflow: hidden` is safe exactly where the children are inert (an image, composed content with no per-row interactive chrome), which is precisely where Tailwind and Polaris use it.

**Verdict: the outer owns the radius as a value; the children own the radius as a declaration.** Declare it once on the container as a custom property, have the first and last children read it back. Bootstrap does this literally with `border-radius: inherit`, which is the single best idea in this whole survey (section 2).

### Bootstrap, the richest primary source

`scss/_list-group.scss` (fetched verbatim from https://raw.githubusercontent.com/twbs/bootstrap/main/scss/_list-group.scss):

```scss
.list-group {
  @include border-radius(var(--#{$prefix}list-group-border-radius));  // radius lives HERE
}

.list-group-item {
  border: var(--#{$prefix}list-group-border-width) solid var(--#{$prefix}list-group-border-color);

  &:first-child { @include border-top-radius(inherit); }     // children INHERIT it
  &:last-child  { @include border-bottom-radius(inherit); }

  &.active {
    z-index: 2; // Place active items above their siblings for proper border styling
  }

  & + .list-group-item {
    border-top-width: 0;                       // one join, one line. No negative margin.
    &.active {
      margin-top: calc(-1 * var(--#{$prefix}list-group-border-width));
      border-top-width: var(--#{$prefix}list-group-border-width);
    }
  }
}

.list-group-flush {
  @include border-radius(0);
  > .list-group-item {
    border-width: 0 0 var(--#{$prefix}list-group-border-width);
    &:last-child { border-bottom-width: 0; }
  }
}
```

Three rules worth stealing outright:

1. **`border-radius: inherit` on `:first-child` and `:last-child`.** The radius is declared once, on the container. No second token, no drift.
2. **`& + .list-group-item { border-top-width: 0 }`.** Every item carries a full border; each one after the first drops its top edge. One join, one line, no negative margin, exact layout. This is the cleanest de-doubling technique found anywhere.
3. **`.list-group-flush`** is the answer to "glued stack inside an already-rounded card": zero the stack's own radius, reduce items to a bottom hairline, and let the card own the frame.

`scss/_card.scss` shows the header/footer half and the explicit de-doubling where two seam-owning blocks meet:

```scss
.card-header {
  border-bottom: var(--#{$prefix}card-border-width) solid var(--#{$prefix}card-border-color);
  &:first-child {
    @include border-radius(var(--#{$prefix}card-inner-border-radius) var(--#{$prefix}card-inner-border-radius) 0 0);
  }
}
.card-footer {
  border-top: var(--#{$prefix}card-border-width) solid var(--#{$prefix}card-border-color);
  &:last-child {
    @include border-radius(0 0 var(--#{$prefix}card-inner-border-radius) var(--#{$prefix}card-inner-border-radius));
  }
}
// Due to specificity of the above selector (`.card > .list-group`), we must
// use a child selector here to prevent double borders.
> .card-header + .list-group,
> .list-group + .card-footer { border-top: 0; }
```

Bootstrap's accordion adds one subtlety worth knowing, with its own comment in the source: the last item's *inner* radius only applies while `.collapsed`, because an open panel needs square inner corners where the body butts against it.

### GNOME libadwaita, the closest thing to a reference implementation

`src/stylesheet/widgets/_lists.scss` and `_misc.scss`, `$card_radius: 12px`:

```scss
.card {
  background-color: var(--card-bg-color);
  border-radius: $card_radius;
  box-shadow: 0 0 0 1px RGB(0 0 6 / 3%),        // the "border" is a 1px spread shadow
              0 1px 3px 1px RGB(0 0 6 / 7%),
              0 2px 6px 2px RGB(0 0 6 / 3%);
  @include focus-ring($offset: -1px);
}

%boxed_list_row {
  border-bottom: 1px solid var(--card-shade-color);
  @include focus-ring($offset: -1px, $transition: $row_transition);
}

list.boxed-list {
  @extend %card;
  > row {
    &, &.expander row.header { @extend %boxed_list_row; }
    &:first-child { border-top-left-radius: $card_radius;    border-top-right-radius: $card_radius; }
    &:last-child  { border-bottom-left-radius: $card_radius; border-bottom-right-radius: $card_radius;
                    border-bottom-width: 0; }
  }
}

list.boxed-list-separate {
  background: none;
  > row { @extend %card; border: none; margin-bottom: 12px; &:last-child { margin-bottom: 0; } }
}
```

Four things here that nobody else does as cleanly:

- The outer hairline is a **zero-offset, zero-blur, 1px-spread `box-shadow`**, not a border. It is layout-neutral and follows the radius for free.
- The seam colour token is `--card-shade-color`, named after the surface it divides, not "border". The outer ring and the interior seams are deliberately different strengths.
- The last row is closed with `border-bottom-width: 0`, not `border: none`, so the shorthand's colour survives a theme change.
- `.boxed-list` and `.boxed-list-separate` ship as **two style classes over the same markup**: glued, or separated into individual cards. That is the right API shape. Source: https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/boxed-lists.html

### GitHub Primer BorderBox

`app/components/primer/beta/border_box.pcss`. Note: `.Box-row` no longer exists in `@primer/css` v22; the pattern survives only in `primer/view_components`.

```css
.Box { border: var(--borderWidth-thin) solid var(--borderColor-default);
       border-radius: var(--borderRadius-medium); }

.Box-header { margin: calc(var(--borderWidth-thin) * -1) calc(var(--borderWidth-thin) * -1) 0;
              border: var(--borderWidth-thin) solid var(--borderColor-default);
              border-top-left-radius: var(--borderRadius-medium);
              border-top-right-radius: var(--borderRadius-medium); }

.Box-row { margin-top: calc(var(--borderWidth-thin) * -1);
           border-top: var(--borderWidth-thin) solid var(--borderColor-muted);
           &:first-of-type { border-top-left-radius: var(--borderRadius-medium); ... }
           &:last-of-type  { border-bottom-left-radius: var(--borderRadius-medium); ... } }
```

Two observations: the seam uses `--borderColor-muted` while the outer frame uses `--borderColor-default`, a weaker interior line than exterior, same instinct as libadwaita. And Primer pulls each row up by exactly one border-width so the join is one line, the negative-margin variant of Bootstrap's `border-top-width: 0`.

One footgun: Primer uses `:first-of-type`/`:last-of-type`, which match by *element type*, not by class. A `.Box-header` div before the rows changes what `:first-of-type` means. Use `:first-child`/`:last-child` unless you specifically want type matching.

### Apple

`.insetGrouped` rounds **each edge cell**, not a container, and it has no choice: `UITableView` recycles cells, so there is no persistent outer view to clip against. That architectural constraint, not a design preference, is why Apple is on the children-round side.

The important Apple finding is **separator insets**. Separators align to the text origin, not the container edge. Vendor-documented in SwiftUI since iOS 16 via `.listRowSeparatorLeading` / `.listRowSeparatorTrailing` alignment guides (https://developer.apple.com/documentation/swiftui/view/listrowinsets(_:)), and before that via `separatorInset` / `separatorInsetReference` in UIKit. A full-bleed separator in a settings-shaped list is the standard non-native tell.

The second important Apple finding is **two separator colours**, both vendor-documented:

- `UIColor.separator`: "The color for thin borders or divider lines that allows some underlying content to be visible. This color may be partially transparent to allow the underlying content to show through." https://developer.apple.com/documentation/uikit/uicolor/separator
- `UIColor.opaqueSeparator`: "The color for borders or divider lines that hides any underlying content. This color is always opaque." https://developer.apple.com/documentation/uikit/uicolor/opaqueseparator

That distinction is the one most CSS implementations get wrong. A translucent seam composites correctly over rows with different backgrounds (selected, hovered, tinted); an opaque one does not. Pick deliberately.

**iOS 26 / Liquid Glass did change the grouped list**, and it is documented in the migration guide rather than the HIG component page (which has not been touched since June 2023). From https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass: "organizational components like lists, tables, and forms have a larger row height and padding. Sections have an increased corner radius to match the curvature of controls across the system." Same page on the general principle: "using rounded shapes that are concentric to their containers."

Caveat worth passing on: **the widely repeated "10pt" corner radius for `insetGrouped` is folklore.** It comes from a private KVC key (`sectionCornerRadius`) and Apple has never published it. Do not build a token on it.

Counterpoint from Apple itself, on *boxes* rather than lists (https://developer.apple.com/design/human-interface-guidelines/boxes): "Consider using padding and alignment to communicate additional grouping within a box. A box's border is a distinct visual element, adding nested boxes to define subgroups can make your interface feel busy and constrained." So Apple endorses gluing for lists and forms and argues against it for boxes. That is a coherent line, not a contradiction: rows in a list are a set; arbitrary boxes are not.

### Material Design 3

M3's divider guidance answers the "when is a divider needed" question directly, and it is the best-argued statement anyone has published:

- "Use full-width dividers to separate larger sections of unrelated content... use full-width dividers sparingly, as too many divider lines will make an interface look cluttered."
- "Use inset dividers to separate related content within a section... should be used with anchoring elements such as icons or avatars, and align with the leading edge of the screen."
- **"List items with repetitive formats may not require an inset divider, in which using only the margin between items is acceptable."**

Source: https://m3.material.io/components/divider/guidelines. Specs give `outline-variant` as the colour role, 16dp inset on one side for "inset", 16dp both sides for "middle-inset" (https://m3.material.io/components/divider/specs). Card default corner is the Medium shape token, 12dp (https://m3.material.io/styles/shape/corner-radius-scale).

The shipped implementation, verified first-hand at https://raw.githubusercontent.com/material-components/material-web/main/divider/internal/_divider.scss, is a **divider as its own element**:

```scss
:host { box-sizing: border-box; color: map.get($tokens, 'color');
        display: flex; height: map.get($tokens, 'thickness'); width: 100%; }
:host([inset]), :host([inset-start]) { padding-inline-start: 16px; }
:host([inset]), :host([inset-end])   { padding-inline-end: 16px; }
:host::before { background: currentColor; content: ''; height: 100%; width: 100%; }
```

Note the spec-to-code gap: M3's vocabulary has "middle-inset"; the Material Web API has no such attribute. It is `inset-start` plus `inset-end`.

### The rest, briefly

- **IBM Carbon**: zero `border-radius` in `_structured-list.scss` and `_accordion.scss`. Carbon opts out of the pattern by staying square, and uses `border-block-start` on every row plus an extra `border-block-end` on `:last-child` to close the stack. https://github.com/carbon-design-system/carbon/blob/main/packages/styles/scss/components/structured-list/_structured-list.scss
- **Ant Design**: children round their own corners everywhere. `Card.Grid` is the interesting case, because a 2D grid cannot use borders without doubling; Ant draws every join with a combination of outset and inset `box-shadow` at `lineWidth` offsets and sets `border-radius: 0` on every cell. There is a live bug trail on exactly the corner problem (https://github.com/ant-design/ant-design/issues/56198, fixed by adding a `:has()` selector to reset the Card radius when there is no head).
- **Radix accordion**, the current live demo: `.AccordionItem { overflow: hidden; margin-top: 1px }` with `:first-child { margin-top: 0 }`, and the seam is the Root's background showing through the 1px gap. Item radius is 4px against the Root's 6px. Source: https://raw.githubusercontent.com/radix-ui/website/main/components/demos/accordion/css/styles.css. Radix's older design-system example uses plain borders instead, so two official Radix examples disagree.
- **shadcn/ui**: has no glued-stack component. `Card` is `rounded-xl border py-6` with permanent padding so children never touch the frame; `AccordionItem` is `border-b last:border-b-0` with no wrapper frame at all. The glued look people associate with it is a recipe, not a default.
- **Atlassian**: `@atlaskit/menu` `Section` has a `hasSeparator` boolean that toggles `border-block-start`, and a sibling-combinator margin correction `[data-section] + ._n7cnyjp0 { margin-block-start: -6px }` when there is no separator. **No `border-radius` anywhere in the component.** Rounding is entirely the wrapper's job.
- **Shopify Polaris**: `Card.Section` is gone from the code entirely. The replacement is `Card` + `BlockStack` + a manual `<Divider />` (a plain `<hr>` with `borderBlockStart`). See section 4 for the important part of Polaris's Card, which is that it uses `overflow: clip`, not `hidden`.

---

## 2. Nested corner radius

### The formula, and its authoritative source

Everyone quotes it as design folklore. It is actually **normative CSS**, and the browser already does it for you in one place. CSS Backgrounds and Borders Level 3, section 4.2 Corner Shaping (https://drafts.csswg.org/css-backgrounds-3/#corner-shaping), verbatim:

> "The padding edge (inner border) radius is the outer border radius minus the corresponding border thickness. In the case where this results in a negative value, the inner radius is zero. (In such cases the center of the border's inner curve might not coincide with that of its outer curve.) Likewise the content edge radius is the padding edge radius minus the corresponding padding, or if that is negative, zero."

So the rule designers call "nested radius" is the same rule the rendering engine applies to a box's own border and padding edges. Stated once:

```
inner radius = outer radius - (border width + padding + gap), clamped at 0
```

Cloud Four's geometric explanation is the clearest write-up: `border-radius` places a circle at each corner, and two concentric circles differ in radius by exactly the gap between them. https://cloudfour.com/thinks/the-math-behind-nesting-rounded-corners/

### What breaks when you violate it

Same radius on both layers means the gap between the curves is **not constant**: it is correct along the straight edges and visibly thicker through the corner arc. This is the "wobble". Cloud Four: "the space between elements increase awkwardly in the corners." It is one of those defects that nobody can name and everybody sees.

### CSS with custom properties

The clamp is not optional. A negative `border-radius` is invalid, so a bare `calc()` that goes negative throws the whole declaration away:

```css
.card {
  --radius: 12px;
  --border: 1px;
  --pad: 8px;
  --inner-radius: max(0px, calc(var(--radius) - var(--border) - var(--pad)));

  border: var(--border) solid var(--edge);
  border-radius: var(--radius);
  padding: var(--pad);
}
.card > .panel { border-radius: var(--inner-radius); }
```

Bootstrap does exactly this systematically, in Sass, for card, accordion, dropdown, popover and modal (`scss/_variables.scss`):

```scss
$card-border-radius:       var(--#{$prefix}border-radius) !default;
$card-inner-border-radius: subtract($card-border-radius, $card-border-width) !default;
$accordion-inner-border-radius: subtract($accordion-border-radius, $accordion-border-width) !default;
$modal-content-inner-border-radius: subtract($modal-content-border-radius, $modal-content-border-width) !default;
```

**For a glued stack specifically, the gap is usually zero.** A glued section is flush with the container edge, so `inner = outer - 0 = outer`. That is why Bootstrap's list group uses `border-radius: inherit` rather than a calculation, and why libadwaita's first and last rows take the full `$card_radius`. **Only subtract when there is actually something between the two curves.** The most common mistake I would expect in a hand-rolled kit is applying the subtraction where the gap is zero and getting corners that are visibly too tight.

Primer's segmented control shows the other real-world deviation, from `segmented_control.pcss`:

```css
border-radius: calc(var(--borderRadius-medium) - var(--segmentedControl-item-padding) / 2);
/* and on focus: */
border-radius: calc(var(--borderRadius-medium) - var(--segmentedControl-item-padding) / 1);
```

They subtract *half* the padding at rest and the *full* padding on focus. The formula is a starting point that a designer's eye then adjusts. Worth knowing before you defend a computed value against someone who says it looks wrong.

### `border-radius: inherit`, and its limits

For the zero-gap case, the child can just take the parent's value:

```css
.row:first-child { border-top-left-radius: inherit; border-top-right-radius: inherit; }
.row:last-child  { border-bottom-left-radius: inherit; border-bottom-right-radius: inherit; }
```

Use the four longhands. The shorthand cannot be partially inherited. https://css-tricks.com/preventing-child-background-overflow-with-inherited-border-radii/

`inherit` does not subtract, so it is wrong the moment there is padding or a border between the curves. The CSS Working Group has an open issue for a keyword that would do the subtraction automatically, proposed as `match-nearest-parent`, still unresolved: https://github.com/w3c/csswg-drafts/issues/7707. A closer-to-shipping alternative is the `inherit()` function in CSS Values 5, which would let a child read the parent's computed custom properties and do its own arithmetic:

```css
.card__inner {
  border-radius: calc(inherit(--card-radius, 1.5rem) - (inherit(--card-padding, 1rem) * 0.5));
}
```
https://www.alwaystwisted.com/articles/making-context-aware-corners

### The overlapping-curves trap, which nobody writes about and which bites glued stacks

Same spec, section 4.5, verbatim:

> "Corner curves must not overlap: When the sum of any two adjacent border radii exceeds the size of the border box, UAs must proportionally reduce the used values of all border radii until none of them overlap. ... Let f = min(L_i / S_i) ... If f < 1, then all corner radii are reduced by multiplying them by f."
>
> "Note: This formula ensures that quarter circles remain quarter circles and large radii remain larger than smaller ones, **but it may reduce corners that were already small enough, which may make borders of nearby elements that should look the same look different.**"

That note describes the glued-stack failure exactly. If the first section of your stack is shorter than twice the radius, the browser silently shrinks **all four** of its radii by a factor, and it will not match the last section. Nothing warns you. The fix is to guarantee a minimum section height of `2 * radius`, or to accept it.

### Squircles, and why the formula stops working

`corner-shape` shipped in Chrome 139 in 2025 (`round`, `squircle`, `bevel`, `superellipse(k)`). https://developer.chrome.com/blog/implementing-corner-shape and https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/corner-shape-value

**The nested formula does not survive it.** A circle offset inward is a smaller circle; a superellipse offset inward is not a smaller superellipse. Subtract the gap and the inner corner stops tracing the outer one. There is no clean number that lands, and the CSSWG has an open issue about it (https://github.com/w3c/csswg-drafts/issues/10993). Gate it behind `@supports` and judge by eye. https://shedsgns.me/radius

Apple solved this natively in iOS 26 with `ConcentricRectangle` and `.containerShape(_:)`, which resolve a child's radius from the container's radius and the inset, per corner, with `isUniform` and a `minimum` radius option:

```swift
ZStack {
    ConcentricRectangle().fill(.thickMaterial)
    VStack {
        ConcentricRectangle(corners: .concentric, isUniform: true).fill(color.gradient)
        Text(text)
    }
    .padding(12)
}
.containerShape(.rect(cornerRadius: 24))
```
https://nilcoalescing.com/blog/ConcentricRectangleInSwiftUI/

Also worth knowing: **Apple's "continuous" corner is not the CSS `squircle`.** `UICornerCurve.continuous` eases the curvature in over roughly a 1.5286 radius run-up; the CSS superellipse still has a sharp junction between the flat edge and the arc. If you are matching an iOS screenshot, `corner-shape: squircle` gets you closer than `round` but is not the same curve.

### One shipped design rule that follows from all this

Polaris's `Card` takes `roundedAbove = 'sm'` and renders with **zero radius below that breakpoint**:

```tsx
const hasBorderRadius = Boolean(breakpoints[`${roundedAbove}Up`]);
<ShadowBevel borderRadius={hasBorderRadius ? '300' : '0'} ...>
```

A card that is flush with the viewport edge should not be rounded, because there is nothing for the corner to be inset from. That is Ahmad Shadeed's conditional border radius trick (https://ishadeed.com/article/conditional-border-radius/) shipped as a component prop, which is the better way to express it.

---

## 3. Seams and dividers

### The rounding rule is now specified, and it is asymmetric

CSS Values and Units Level 4, "snap a length as a line width" (https://drafts.csswg.org/css-values-4/#snap-a-length-as-a-line-width), verbatim:

> "To snap a length as a line width given a length len: 1) If len is an integer number of device pixels, do nothing. 2) If the absolute value of len is greater than zero, but less than 1 device pixel, round it away from zero to 1 or -1 device pixel. 3) If the absolute value of len is greater than 1 device pixel, round it towards zero to the nearest integer number of device pixels."

Under 1 device pixel rounds **up**; over 1 device pixel **truncates**. This applies to `border-width`, `outline-width` and `column-rule-width`, and Chrome 147 (2026) aligned to it explicitly (https://developer.chrome.com/release-notes/147).

**`box-shadow` is not covered by it.** Measured side by side: at DPR 1.5, `border: 5px solid` paints 7 device pixels while `box-shadow: inset 0 0 0 5px` paints the full 7.5. https://patrickbrosset.com/articles/2024-06-21-invasion-of-the-border-snappers/

Practical consequences at the ratios you asked about:

| DPR | 1px border |
| --- | --- |
| 1.5 | 1 device px, thinner than a true CSS px would map to (measured) |
| 3 | 3 device px exactly, no snapping (measured) |
| 1.25 | 1.25 device px, over 1, truncates to 1 (spec applied, not separately measured) |
| 2.25 | 2.25 device px, truncates to 2 (spec applied, not separately measured) |

And the "disappears on some rows and not others" case is real and documented. Firefox bug 1173358 (still open) quotes Boris Zbarsky on `border-spacing`: "We need 8 spacings to take up 7 CSS pixels, if each one is 7/8 px. So we draw 6 of them at 1px width and two at 0.5px width." Deliberate averaging, visible as wrinkles. https://bugzilla.mozilla.org/show_bug.cgi?id=1173358

Chromium has a filed report of a 1px border computing to 0.640px (https://issues.chromium.org/issues/40888720), arithmetically consistent with 125% OS scale times 125% page zoom compounding. A Chromium engineer confirmed on the public list that "Chrome uses the display scale setting as an additional input to zoom", so HiDPI and page zoom are the same mechanism. https://groups.google.com/a/chromium.org/g/chromium-discuss/c/HNZHuk8Zk50

Firefox tried rounding sub-device-pixel borders up at computed-value time, shipped it in 79, and **reverted it as WONTFIX** after it caused "dark lines between toolbar and page content on non-100% DPI". https://bugzilla.mozilla.org/show_bug.cgi?id=477157. There is no fix that does not trade one artifact for another.

There is no shipped `hairline` keyword. The CSSWG issue asking for one ("the thinnest width that the UA believes is recognizable, snapped to the nearest whole number of device pixels") is still open: https://github.com/w3c/csswg-drafts/issues/3720. Every technique below is a workaround for that gap.

### The five techniques compared

| | Rounds like a border? | Affects layout? | Survives a hidden section? |
| --- | --- | --- | --- |
| **A. `border-bottom: 1px`** | Yes, snapped to whole device px | Yes | Only with the right selector |
| **B. `box-shadow: inset 0 -1px 0`** | No, paints at raw subpixel size, can look softer | **No** | **Yes, trivially** |
| **C. `gap: 1px` over a coloured parent** | Not a line-width property | Yes, adds (N-1)px | **Yes, structurally** |
| **D. `divide-y` selectors** | Same as A, it emits a real border | Yes | Depends on which form |
| **E. pseudo-element** | Not a line-width property | No, if absolutely positioned | Only with the right selector |

**A. Real border.** Crisp because it snaps, and it is what Bootstrap, Primer, Carbon, Ant and libadwaita all use. Cost: it participates in layout, so `height: calc(3rem - 1px)` compensation can be wrong once the *snapped* device-pixel width differs from the literal 1px you subtracted.

**B. Inset box-shadow.** Layout-neutral, follows the element's own `border-radius` for free, and disappears with the row when the row is hidden. Carbon uses it for the outer edges of the content switcher (`box-shadow: inset 1px 0 0 0 $border-inverse` on the first child, `inset -1px 0 0 0` on the last), and libadwaita uses it for the whole card's outer ring. Cost: it is not snapped, so at fractional DPR it anti-aliases rather than landing on a whole pixel, and comparative testing reports visible discrepancy against a real border "particularly at corners and with border-radius" (https://1px.com/1px-css-borders/).

**C. `gap: 1px` over a coloured parent.** Radix's own accordion demo uses the margin variant of this. It survives hidden sections structurally, because `display: none` removes an element from layout entirely so no gap is counted. Costs, quoted from the Chrome team's own critique: you cannot set the line's length; an empty cell leaks the container background; it fails if the page background is not a solid colour; and "it introduces structural dependencies for visual styling", meaning your seam colour is welded to your background architecture. https://developer.chrome.com/blog/gap-decorations

**D. `divide-y`, and the premise in your question is now backwards.** Tailwind v3 was:

```css
.divide-y > :not([hidden]) ~ :not([hidden]) { border-top-width: 1px; }
```

Tailwind v4 is not. I pulled the current source (`packages/tailwindcss/src/utilities.ts`) and it emits:

```css
:where(& > :not(:last-child)) {
  border-bottom-style: var(--tw-border-style);
  border-top-style: var(--tw-border-style);
  border-top-width: calc(1px * var(--tw-divide-y-reverse));
  border-bottom-width: calc(1px * calc(1 - var(--tw-divide-y-reverse)));
}
```

The change was made for selector-match performance. The PR description says the `~` form was "_fucking_ slow" on large DOM trees and the replacement is "almost 2000x faster", and it documents the regression openly: "when the final child element has the `hidden` attribute, spacing now appears below it", justified with "hidden elements are never the very last element. They are almost always the very first element." https://github.com/tailwindlabs/tailwindcss/pull/13459

That bet did not hold. Two reports since: an extra border on a hidden last child (https://github.com/tailwindlabs/tailwindcss/issues/17078) and `divide-*` breaking when DOM order and visual order diverge via CSS `order`, which a maintainer closed as "an expected side-effect of the documented breaking change" (https://github.com/tailwindlabs/tailwindcss/discussions/18266).

**So: the v3 sibling-combinator form is the correct one and Tailwind abandoned it for speed.** If your stack can have hidden sections, use the v3 form, not today's `divide-y`.

**E. Pseudo-element.** The only technique that gives you an *inset* seam that is also layout-neutral, which is why Primer and Carbon both use it for segmented controls (section 5). It has the same orphan-line problem as A unless you gate it with a visibility-aware selector.

For a true 1-device-pixel line on retina, the pseudo-element plus `transform: scaleY(0.5)` deliberately routes around the snapping algorithm, because the algorithm looks at the authored `border-width`, not the transformed result:

```css
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .row::after { transform: scaleY(0.5); transform-origin: 0 100%; }
}
```
https://annualbeta.com/blog/1px-hairline-css-borders-on-hidpi-screens/

You need a different factor per DPR (1/DPR), and **none of the public write-ups give a ladder covering 1.25, 1.5 or 2.25**. That is a genuine gap in the literature, not just in this research.

Worth knowing: WebKit shipped `0.5px` borders specifically for the Web Inspector's own interior dividers in 2015, with the reviewer writing "Interior borders (like in the styles sidebar) would be fine to use 0.5px" while keeping 1px on structural edges. https://bugs.webkit.org/show_bug.cgi?id=146619. Even WebKit treats sub-pixel as an interior-seam technique, which is exactly your case.

### `outline` is not an escape hatch

Per Chrome 147's release note, `outline-width` is subject to the same snapping as `border-width`. Outline buys you layout neutrality and nothing else, and it cannot be applied to one edge, so it rarely helps for a seam.

### The double-border problem and its precedents

Tables solved it structurally: `border-collapse: collapse` merges two adjacent cell borders into one and resolves conflicts by documented precedence (wider wins, then style, then source order). https://developer.mozilla.org/en-US/docs/Web/CSS/border-collapse. **There is no `border-collapse` for flex or grid boxes.** That absence is why every system in section 1 hand-rolls a de-doubling rule.

The three hand-rolled forms, in order of how much I would trust them:

```css
/* 1. Drop one side. Exact layout, one line, nothing painted outside the parent. */
.row + .row { border-top-width: 0; }              /* Bootstrap list-group, shadcn ToggleGroup */

/* 2. Border on one side only, plus a closing border on the last. */
.row { border-top: 1px solid; }                    /* Carbon, Ant Descriptions, old Radix */
.row:last-child { border-bottom: 1px solid; }

/* 3. Negative margin to overlap. Needed only when a row must raise its OWN full border. */
.row { border-top: 1px solid; margin-top: -1px; }  /* Primer, Bootstrap btn-group */
```

Form 3's failure mode is documented: Bootstrap issue #36794, "The left border of the first `input` in a `btn-group` is drawn outside parent, potentially being clipped if parent is using `overflow-hidden`". https://github.com/twbs/bootstrap/issues/36794

### The new answer: CSS Gap Decorations

`row-rule`, `column-rule` and `rule` now work in flex and grid, not just multi-column. **Stable in Chrome and Edge 149** (https://developer.chrome.com/blog/gap-decorations-stable), after shipping behind a flag in 139 in 2025. Spec: https://drafts.csswg.org/css-gaps-1/

```css
.settings-panel {
  display: grid;
  gap: 1px;
  row-rule: 1px solid var(--seam);
  rule-inset: 16px;              /* the Apple inset separator, declaratively */
  rule-visibility-items: between;
}
```

This is the first mechanism that does all four things at once: the line is owned by the *layout*, not by a child; it disappears correctly when a child is removed from layout; `rule-inset` sets its length, which the coloured-gap trick never could; and no child needs a first/last selector. The spec says decorations "do not take up space and are painted just above the border of the container."

**Not verified**: whether gap decorations are subject to the line-width snapping algorithm, and how they interact with the container's `border-radius` and `overflow`. Neither the spec text I read nor the Chrome articles address either. Chromium-only, so it is a progressive enhancement today, not a foundation.

### Ranked recommendations

**Vertical seam, sections always visible:** real `border-bottom` with a sibling or `:not(:last-child)` selector. Crisp because it snaps, and it is what every surveyed system does. Second choice `box-shadow: inset 0 -1px 0`, if layout neutrality matters more than crispness.

**Seam that must survive a hidden section:** `box-shadow` per row (nothing to orphan), or `gap: 1px` in grid (`display: none` removes the element from layout), or a border with the **Tailwind v3** form `> :not([hidden]) ~ :not([hidden])`. Do not use today's `divide-y`.

**Seam that must not change layout height:** `box-shadow` or an absolutely positioned pseudo-element. Both are outside the box model.

**Seam that must be inset from the edges:** pseudo-element today, `rule-inset` when you can rely on it.

---

## 4. Overflow inside a rounded container

### The clipping rule, and the parenthetical that matters

CSS Backgrounds 3, section 4.3 Corner Clipping (https://drafts.csswg.org/css-backgrounds-3/#corner-clipping), verbatim:

> "other effects that clip painting or event handling to the border, padding, or content edge must clip to their respective curves. For example, backgrounds clip to the curve specified by background-clip, **overflow values other than visible to the curved padding edge (when overflow on both axes is not visible)**, replaced element content to the curved content edge, pointer events to the curved border edge, etc."
>
> "Note: As border-radius reduces the interactive area of an element authors should make sure the remaining interactive area conforms to recommended minima for the platforms they target."

That parenthetical is load-bearing and it was chased down to a resolution. **Mixed-axis overflow clips as a rectangle, not the curve.** CSSWG resolved this closing issue #7434 on 2023-02-15. Fantasai in the thread: "the border/background/etc are still rounded as normal, we just don't clip the content to the radius when there's overflow in one axis." dbaron: "this is just a bugfix in the spec because nobody thought about it." https://github.com/w3c/csswg-drafts/issues/7434, minutes at https://lists.w3.org/Archives/Public/www-style/2023May/0018.html

There is a shipped conformance test: WPT `css/css-overflow/rounded-overflow-visible-clip.html`, titled "Border radius should not round the clipping region when mixing overflow: visible and clip", whose passing render is "4 100x100 green squares (no rounded corners)".

### `overflow: hidden` breaks `position: sticky`, and the mechanism is precise

`hidden` is a **scrollable value**. CSS Overflow 3: "The scroll, auto, and hidden values are known as the scrollable values of overflow. They cause the box to be a scroll container." And CSS Position 3: a sticky box's insets "represent insets from the respective edges of the scrollport of the nearest scroll container with a matching scrollable axis."

So your rounded card becomes the nearest scroll container. Its scrollable overflow is already at rest, the stick range collapses to zero, and the sticky child never sticks. It is not disabled; it is sticking correctly to the wrong container.

**The fix is `overflow: clip`**, which is not a scrollable value and does not create a scroll container:

```css
.card { border-radius: 12px; overflow: clip; }
.card .sticky-header { position: sticky; top: 0; }
```

`clip` is safe to ship: evergreen Chrome and Firefox since 2021-2022, Safari 16. The one cost is that `clip` forbids scrolling "through any mechanism", including programmatic `scrollTo`/`scrollIntoView`, which `hidden` still allows.

**Shopify Polaris already ships this.** `Card` passes `overflowX="clip" overflowY="clip"` to its Box, and `ShadowBevel.module.css` is `overflow: clip` plus `z-index: 0` with the comment "Explicitly set `0` to create a local stacking context." That is a first-party production system choosing `clip` over `hidden` for exactly this component.

`overflow-clip-margin` is **not** dependable in 2026: MDN marks it not Baseline, Chromium only honours it when both axes are `clip`, Firefox only supports the length form.

### The horizontally scrolling row inside a rounded box

**The structural finding, and it is the important one: you cannot get real horizontal scrolling and real vertical escape out of one element.** Per CSS Overflow 3's computed-value rule, `scroll`, `auto` and `hidden` are all scrollable values that force a `visible` partner axis to compute to `auto`. So `overflow-x: auto; overflow-y: visible` silently computes to `auto auto` and you get an unwanted vertical scroll container. Only `clip` is exempt, and `clip` cannot scroll.

Therefore: **rounded wrapper with no scrolling overflow, plain non-rounded child with `overflow-x: auto`, and anything that must escape vertically taken out of flow entirely** (fixed positioning or a portal). One element will not do it.

The Reel pattern, from Every Layout (the original page is paywalled; this is from an open reproduction, so treat the custom-property names as approximate):

```css
.reel { display: flex; overflow-x: auto; overflow-y: hidden;
        scrollbar-color: var(--thumbColor) var(--trackColor); }
.reel > *     { flex: 0 0 var(--itemWidth); }
.reel > * + * { margin-left: var(--space); }
.reel.overflowing { padding-bottom: var(--space); }
```

`overflow-x: auto` rather than `scroll` so nothing is reserved when nothing overflows, and the `.overflowing` class is JS-toggled on `scrollWidth > clientWidth` so the bottom padding only appears when a scrollbar actually takes space.

Scroll snap inside a rounded box needs `scroll-padding`, because a snapped-to-start item otherwise lands behind the corner curve:

```css
.reel { scroll-snap-type: x mandatory; scroll-padding-inline: 1rem; }
.reel > .item { scroll-snap-align: start; }
```

Set `scroll-padding-inline` to about your radius. `mandatory` means the browser must come to rest on a snap point; `proximity` means it may, based on velocity.

`scrollbar-gutter: stable` mostly helps: without it a classic scrollbar appearing shifts your rounded content by its width, which reads as the frame jumping. It mildly hurts at a tight radius, because the reserved gutter is a rectangle and your corner is a curve, so you can see an unrounded notch. (That trade-off is a straightforward consequence of the two definitions, not an independently sourced claim.)

Platform difference to plan for: macOS uses **overlay** scrollbars that reserve no space and, with "Always show scroll bars" off, ignore your `scrollbar-color` track styling until you actively scroll. Windows Chrome uses **classic** scrollbars that always reserve 15-17px. Standard `scrollbar-color`/`scrollbar-width` landed in Chrome 121 and only in Safari 26, and there is a live compat report of it still not working reliably on Safari 26.3 (https://github.com/mdn/browser-compat-data/issues/29315). Keep `::-webkit-scrollbar` as a fallback, but not on the same element, because browsers ignore the `::-webkit-scrollbar` family on any element whose computed `scrollbar-color` is not `auto`.

Edge fading composes fine with the rounded clip on the same element:

```css
.reel { mask-image: linear-gradient(to right, transparent, black 24px,
                                    black calc(100% - 24px), transparent); }
```

If the fade needs to reach past the curve into a differently coloured page background, put the mask on a wrapper one level up.

### The corner bleed workarounds are almost all obsolete

The "composited child ignores the parent's rounded clip" bug is fixed everywhere evergreen:

- WebKit #68196 (with #98538 as a duplicate), RESOLVED FIXED, WebKit commit 254253, 2022-09-07, first in Safari Technology Preview 156.
- Chromium 40292078, fixed around milestone 57, early 2017. Fix note: "When a child of an overflow:hidden object is composited (and the ancestor is not) the border-radius clip was failing to apply."

So in 2026: `-webkit-mask-image: -webkit-radial-gradient(white, black)`, `transform: translateZ(0)` and `will-change: transform` as rounded-clip fixes are **cargo cult**. Anyone still hitting it is on a pre-2022 WebView, not a current browser. `isolation: isolate` is the one worth keeping if you must support old WebKit, because it forces a stacking context without the GPU compositing side effects. `-webkit-overflow-scrolling: touch` has been a no-op since iOS 13 and can be deleted.

Still genuinely useful: giving the parent the same background colour as the child, for the sub-pixel anti-aliasing sliver at the curve, which can occur even when clipping is correct.

### Accessibility

A scrollable region must be keyboard-reachable. W3C ACT rule "Scrollable content can be reached with sequential focus navigation": "Each test target is either included in sequential focus navigation or has a descendant in the flat tree that is included in sequential focus navigation." https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/ and axe-core's `scrollable-region-focusable`. The fix is `tabindex="0"` on the scrolling element, or a naturally focusable descendant. This bites glued panels specifically: if the only interactive content is inside the scrolling section and the panel chrome is inert, a keyboard user can never reach past the fold.

---

## 5. Horizontal glue

Four systems, four different answers, and the choice turns on one question: **does an individual segment ever need to raise its own complete border?**

### If yes: negative margin plus z-index (Bootstrap)

From `scss/_button-group.scss`, verbatim:

```scss
.btn-group, .btn-group-vertical {
  position: relative; display: inline-flex;
  > .btn { position: relative; flex: 1 1 auto; }

  // Bring the hover, focused, and "active" buttons to the front to overlay
  // the borders properly
  > .btn-check:checked + .btn, > .btn-check:focus + .btn,
  > .btn:hover, > .btn:focus, > .btn:active, > .btn.active { z-index: 1; }
}

.btn-group {
  @include border-radius($btn-border-radius);

  // Prevent double borders when buttons are next to each other
  > :not(.btn-check:first-child) + .btn,
  > .btn-group:not(:first-child) { margin-left: calc(-1 * #{$btn-border-width}); }

  // Reset rounded corners
  > .btn:not(:last-child):not(.dropdown-toggle),
  > .btn.dropdown-toggle-split:first-child,
  > .btn-group:not(:last-child) > .btn { @include border-end-radius(0); }

  > .btn:nth-child(n + 3),
  > :not(.btn-check) + .btn,
  > .btn-group:not(:first-child) > .btn { @include border-start-radius(0); }
}
```

Every button keeps a full border; each one after the first is pulled back by exactly one border-width so the two overlap into one line; and `z-index: 1` on hover, focus, active and checked lets that button's complete border sit above its neighbours'. That last part is the whole reason for the negative margin. Cost: the first button's left border is painted one pixel outside the group, which gets clipped by any `overflow: hidden` ancestor (issue #36794).

Note `border-start-radius` / `border-end-radius`: Bootstrap's mixins are **logical**, so the group flips correctly in RTL. Do the same, with `border-start-start-radius` and friends, Baseline since September 2021.

### If no: drop one side (shadcn, and Bootstrap's own list-group)

shadcn's `ToggleGroupItem`, verbatim from the v4 registry:

```
"w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
"data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none
 data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md
 data-[spacing=0]:data-[variant=outline]:border-l-0
 data-[spacing=0]:data-[variant=outline]:first:border-l"
```

`border-l-0` on every item, `first:border-l` to put it back on the first. One join, one border, layout exact, nothing painted outside the parent. They still keep `focus:z-10 focus-visible:z-10` so the focus ring is not covered by the neighbour.

This is the better default. Use the negative margin only when you have a state that needs its own full outline.

### If the segments have no borders at all: a pseudo-element seam (Primer, Carbon)

Primer's `segmented_control.pcss` puts one background and one radius on the track, no border on the items, and draws each seam with a pseudo-element inset vertically so the line does not touch the top and bottom edges:

```css
.SegmentedControl-item:not(:first-child)::before {
  position: absolute;
  inset: 0 0 0 -1px;
  margin-top: var(--control-medium-paddingBlock);
  margin-bottom: var(--control-medium-paddingBlock);
  content: '';
  border-left: var(--borderWidth-thin) solid var(--borderColor-default);
}

.SegmentedControl-item--selected::before { border-color: transparent !important; }
.SegmentedControl-item--selected + .SegmentedControl-item::before { border-color: transparent; }
```

Carbon's content switcher is the same idea with the outer edges drawn as inset box-shadows, and it hides the seam next to the selected, hovered *and* focused item:

```scss
.cds--content-switcher-btn::before {
  position: absolute; z-index: 2; display: block;
  background-color: $border-subtle;
  block-size: rem(16px); inline-size: rem(1px); inset-inline-start: 0;
  content: '';
}
.cds--content-switcher-btn:first-of-type::before { background-color: transparent; }

.cds--content-switcher-btn:focus::before,
.cds--content-switcher-btn:focus + .cds--content-switcher-btn::before,
.cds--content-switcher--selected::before,
.cds--content-switcher--selected + .cds--content-switcher-btn::before {
  background-color: transparent;
}

.cds--content-switcher:not(.cds--content-switcher--icon-only) .cds--content-switcher-btn:first-child {
  border-end-start-radius: rem(4px);
  border-start-start-radius: rem(4px);
  box-shadow: inset rem(1px) 0 0 0 $border-inverse;
}
```

Three rules to take from these:

1. **A seam next to an active segment is redundant and both systems delete it.** The active segment's own fill already separates. This is Apple's segmented control behaviour and it is why a hand-rolled control looks subtly wrong next to a native one.
2. **The seam is shorter than the segment.** 16px in a 32-40px button for Carbon, inset by the block padding for Primer. A full-height seam reads as a table, not a control.
3. **`background-color: transparent` rather than `display: none`.** The box stays, so nothing reflows and the selector chain stays simple.

### Material Android

`MaterialButtonToggleGroup` "overrides the start and end margins of any children added to this layout such that child buttons are placed directly adjacent to one another" and "overrides any shapeAppearance... such that only the left-most corners of the first child and the right-most corners of the last child retain their shape appearance or corner size". Same house rule, enforced by the container at runtime rather than by selectors. https://developer.android.com/reference/com/google/android/material/button/MaterialButtonToggleGroup

### The Apple guidance worth having

From the HIG (https://developer.apple.com/design/human-interface-guidelines/segmented-controls): "Within a segmented control, all segments are usually equal in width." "Aim for no more than about five to seven segments in a wide interface and no more than about five segments on iPhone." "Prefer using either text or images, not a mix of both, in a single segmented control." "Keep control types consistent within a single segmented control. Don't assign actions to segments in a control that otherwise represents selection state."

Accessibility, from USWDS: `role="group"` on the parent, `aria-label` for context, real `<button type="button">` elements. https://designsystem.digital.gov/button-group/button-group--segmented/

---

## 6. Disagreements, and who has the better argument

**1. Tailwind v3 versus Tailwind v4 on `divide-y`.** v3's `:not([hidden]) ~ :not([hidden])` is correct by construction; v4's `:not(:last-child)` is ~2000x faster to match and knowingly wrong when the last child is hidden or when `order` reorders items. **v3 has the better argument for a component kit**, where a stack has a handful of sections and the match cost is irrelevant. Tailwind's trade was right for a framework shipping to arbitrary page sizes and wrong as a default for a glued panel.

**2. Apple's boxes guidance versus everyone else.** Apple says "adding nested boxes to define subgroups can make your interface feel busy and constrained" while Apple's own grouped lists, Material's cards and Material's "divider inside a card" all endorse stacking. **Apple is right about arbitrary boxes and everyone is right about lists**, and the dividing line is whether the sections are a set of like things. M3 states the usable version of it: repetitive-format rows need only margin; dissimilar content needs a line.

**3. Children-round versus outer-clips.** Covered in section 1. **Children-round wins wherever a row has its own focus, hover, drag or active state**, because `overflow` clips all of them. Outer-clip wins for inert content. Apple is on the children-round side by architectural necessity, not by choice, which is worth discounting when counting votes.

**4. Carbon versus everyone.** Carbon opts out by staying square. That is a legitimate position with a real payoff: no nested-radius arithmetic, no overlapping-curves reduction, no corner anti-aliasing, no `overflow` decision at all. If the corners are not doing work for you, this is the cheapest correct answer.

**5. Polaris versus everyone on responsibility.** Polaris kept only the outer clip and pushed dividers onto the app author as a manual `<Divider />`. It is the only surveyed system where removing a section can leave a visibly wrong result with no built-in guard, because everyone else's guard is structural CSS. **Worse for this pattern**, even though it is a smaller API.

**6. Radix disagrees with itself.** The live demo uses a 1px margin gap over the root's background; the older design-system example uses real borders. Two official examples, two techniques, depending on which tutorial someone copies.

---

## 7. What this adds up to for a `gluing` component

Stated as rules, each traceable to a source above:

1. **Declare the radius once on the container**, have the first and last sections read it with `border-radius: inherit` on the four longhands. Subtract only when there is a real gap, and clamp with `max(0px, ...)`.
2. **Guarantee each section is at least `2 * radius` tall**, or accept the spec's proportional reduction silently shrinking one section's corners.
3. **Use `overflow: clip`, never `hidden`**, if you clip at all. Polaris ships this.
4. **Do not clip at all if any section has focus, hover or drag chrome.** Let the children round their own edges and keep the frame unclipped.
5. **Draw the seam as a real border on one side only**, dropped on the first or last with an adjacent-sibling selector, not `:not(:last-child)`, unless sections can be hidden, in which case use `> :not([hidden]) ~ :not([hidden])`.
6. **Give the interior seam a weaker token than the outer frame.** Primer, libadwaita and Apple all do, with different names for the same idea.
7. **Make the seam translucent** unless it must hide what is behind it. Apple ships both colours for exactly this choice.
8. **Inset the seam** when the rows have a leading glyph column. Full-bleed is the non-native tell.
9. **Horizontal: drop one side, do not use negative margins**, unless a segment needs to raise its own complete border, in which case negative margin plus `z-index` and accept the 1px overhang.
10. **Use logical properties throughout** (`border-start-start-radius`, `inset-inline-start`, `border-block-end`). Bootstrap, Carbon and Polaris all do.
11. **Ship a `separate` variant next to the glued one**, over the same markup, the way libadwaita ships `.boxed-list` and `.boxed-list-separate`.

---

## 8. What is not verified

Flagged honestly, because several of these would change an answer:

- **Gap decorations and rounded containers**: no source states whether `row-rule` is subject to line-width snapping, or how it interacts with `border-radius` and `overflow` on the container. Chromium-only today.
- **DPR 1.25 and 2.25**: derived by applying the spec's snapping algorithm, not separately measured. DPR 1.5 and 3 are measured.
- **No retina-hairline scale ladder exists publicly** for 1.25, 1.5 or 2.25. The `scaleY(1/DPR)` trick is documented only for 2 and 3.
- **The "10pt" iOS `insetGrouped` radius is folklore**, from a private KVC key, never published by Apple.
- **Browser bugs were read from trackers, not reproduced.** The "fixed by Safari 17/18/26" conclusions come from fix dates (2017 Chromium, 2022 WebKit) predating current versions, not from a live test.
- **The Every Layout Reel CSS is from an open reproduction**, since the original is paywalled.
- **Polaris's exact `Card.Section` removal version** could not be pinned; the migration guides do not name it.
- **Nothing in this report was tested in a browser**, because the task was research only. The claims most worth a five-minute check before you build on them are the gap-decoration ones and the mixed-axis rectangular clip.
