# Kit lessons: canvas-font

The longer comments cut from `demo/shell/canvas-font.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-canvas-font.md#<anchor>`.

<a id="header"></a>

## `canvas-font.mjs` module header

```text
demo/shell/canvas-font.mjs: the site's two faces, for a canvas.

🔴 A CANVAS CANNOT READ `var(--mono)`. `ctx.font` is parsed with no element
behind it, so a token there is invalid and the assignment is silently
ignored (the xy-pad note in positron-ui). Until 2026-10-12 four pictures
typed a system stack instead (`ui-monospace, Menlo, monospace`), so after the
font switch they drew Menlo or SF Mono beside a page set in JetBrains Mono.
This reads the token's COMPUTED value, which is the `@font-face` family plus
its fallbacks, so a canvas names the same face the stylesheet does and
follows it if the token ever changes.

🔴 AND A ONE SHOT PICTURE HAS TO DRAW AGAIN ONCE THE FACE ARRIVES. A canvas
does not reflow: text drawn before the woff2 has loaded is drawn in the
fallback and stays that way. `whenFaces(fn)` asks for both weights of the
face by name (`document.fonts.ready` alone waits only for fonts already
loading, and nothing may have asked for this one yet) and calls `fn` when
they are in, so a picture painted early repaints once. A picture that
redraws every frame does not need it.
```
