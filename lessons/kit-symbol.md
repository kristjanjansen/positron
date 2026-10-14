# Kit lessons: symbol.mjs

The long comments cut from `demo/shell/symbol.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-symbol.md#<anchor>`.

<a id="header"></a>

## symbol.mjs, file header

demo/shell/symbol.mjs — a button whose label is a picture, centred on its INK
rather than on its box.

🔴 `place-items: center` CENTRES THE WRONG RECTANGLE, AND THAT IS WHY ⛶ SAT
HIGH AND LEFT IN ITS SQUARE. A glyph in a button is laid out as text: it gets
an ADVANCE WIDTH, which usually has more air on one side than the other, and
a BASELINE, which sits wherever the font's ascent and descent put it. Centring
the element centres that box. The ink inside it is centred only by luck, and
U+26F6 SQUARE FOUR CORNERS is not lucky — it is drawn small and high in a box
sized for a capital, so a 34 px square button shows it a couple of pixels up
and to the left of where the eye expects. Reported by eye, on a zoom.

⚠️ THE FIX IS MEASURED, NOT TYPED. The obvious repair is `transform:
translate(1px, 1px)` on the one button somebody complained about — a number
with no source, right for one glyph in one font at one size, and silently
wrong for the next. The offset here is computed from the font's own metrics
through `measureText`, so it is correct for any glyph, any face and any size,
and it becomes correct again by itself when a stylesheet changes.

⚠️ AND IT WAITS FOR THE FONT. Measured against a fallback face the numbers
describe a glyph nobody will see, so every measurement re-runs on
`document.fonts.ready` — the same event `/radio1965/` uses to re-share its
label column.

<a id="centre-symbol"></a>

## symbol.mjs, centreSymbol

Nudge an element's glyph onto the middle of its own box.

⚠️ IT MOVES AN INNER SPAN, NEVER THE BUTTON. A transform on the button would
move its border and its focus ring with the ink, which is a control that
looks misaligned to fix a glyph that was.

<a id="set-symbol"></a>

## symbol.mjs, setSymbol

Change the glyph on a button that `centreSymbol` already owns, and re-centre.

🔴 IT EXISTS BECAUSE `host.textContent = ch` SILENTLY UNDOES THIS FILE.
`centreSymbol` puts the glyph in a `<span class="pos-sym">` and translates the
SPAN, so writing `textContent` on the button throws that span away: the new
glyph is laid out on its advance and its baseline again, which is the exact
misalignment this module was written to fix, and nothing anywhere reports it.
REPORTED as *"play button is always square"* on `/videoradio/`, whose play
control swaps `▶` for `❚❚` on every press.

⚠️ AND THE TWO GLYPHS ARE NOT THE SAME SHAPE, which is why re-centring is not
cosmetic here. `▶` is one code point drawn wide and low; `❚❚` is TWO
characters whose ink is narrow and tall. Centring measured for one of them is
wrong for the other by several pixels, in a 34 px box, in the one control a
visitor presses.

⚠️ IT FALLS BACK TO `centreSymbol` when the span is missing, so a caller does
not have to know whether the button was built by this module.
