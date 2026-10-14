# Kit lessons: bay-svg

The longer comments cut from `demo/shell/bay-svg.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-bay-svg.md#<anchor>`.

<a id="header"></a>

## `bay-svg.mjs` module header

```text
demo/shell/bay-svg.mjs: the patchbay picture as an SVG STRING, with no DOM.
The same boxes, port names and wires `createBayView` (bay-view.mjs) draws in
a page, laid out from the bay's own `nodes()`, `ports()` and `links()` and
from the site's font metrics (font-metrics.mjs, read off the TTFs by
workers/view/og/og-fonts.py) instead of a canvas `measureText`.

🔴 WHY IT EXISTS, 2026-10-13. The share card is drawn without a browser
(*"What headless chrome?!!? See ../eccm etc"*), the way eccm and trip draw
theirs: SVG written by our own code, rasterised by resvg. `createBayView`
needs `clientWidth`, a canvas, a ResizeObserver and a stylesheet, none of
which exist in Node or in a Worker. So this runs anywhere: Node at build
(workers/view/og/render.mjs), a Worker, and a browser (/kit/share/ draws the
card's SVG inline beside the PNG).

⚠️ EVERY ATTRIBUTE IS LITERAL. No class, no `var()`, no stylesheet: resvg has
no cascade, so a fill is a hex and a font is a family list. The colours are
shell.css's `:root` tokens and patchbay.mjs's MEDIUM_COLOURS, the values the
page's `.lv-*` rules resolve to (BAY_VIEW_CSS in bay-view.mjs).
⚠️ ONE GEOMETRY, TWO WRITERS. The layout is `layoutBay()` and
`acrossWire()` from bay-layout.mjs, the same calls bay-view.mjs makes. The
phone arrangement (stacked cards, wires in a right gutter, below 480 px) is
NOT ported: a width under STACK_BELOW throws rather than drawing something
bay-view would not.
```
