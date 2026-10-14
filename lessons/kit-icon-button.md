# Kit lessons: icon-button

The longer comments cut from `demo/shell/icon-button.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-icon-button.md#<anchor>`.

<a id="header"></a>

## `icon-button.mjs` module header

```text
demo/shell/icon-button.mjs, a square button whose face is one icon.

🔴 ASKED 2026-10-10: *"Use transport icons on all our concepts. Keep them
square. Kit iconbutton (group?)"*. The concept pages drew their play, stop
and record as font glyphs (► ■ ●) and centred them with `symbol.mjs`, which
measures each glyph's ink in whatever face arrived. An icon from `icons.mjs`
is a drawn picture on a 24 unit grid in `currentColor`, so it has no advance
and no baseline to correct and the box IS the picture: centring the svg
centres the ink.

⚠️ THE SQUARE IS THE KIT'S SQUARE, NOT A NEW ONE. `data-glyph="1"` is what
`shell.css` already makes 34 px, and `pos-sm` with it is `--ctl-sm`. No pixel
here is a size of the button; the only numbers are the icon's own, 16 in the
big square and 14 in the small one, the pair `/kit/icons/`'s IN A BUTTON
block measured centred to the hundredth.

⚠️ THE NAME IS THE LABEL, ALWAYS. A picture is not a name, so `label` is
required and becomes `aria-label` and `title`; the svg is aria-hidden. A
missing label throws, and so does an unknown icon, BEFORE the face changes,
so a bad swap leaves the old face standing rather than an empty square.

🔴 THE GROUP IS `createButtonGroup`, GIVEN AN `icon` PER BUTTON, AND NOT A
SECOND GROUP COMPONENT. The join, the busy sweep, the disabled-with-a-reason
rule and the harness contract all live there already, and the concept pages
already build their transports with it. A `createIconButtonGroup` would be a
second copy of all four. `setIcon` below is the one function both use, and
it also re-faces a button somebody else built, which is how a transport
bar's `extras` button wears an icon without the bar changing.
```
