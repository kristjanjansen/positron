# Kit lessons: segment.mjs, segment-test.mjs

The long comments cut from `demo/shell/segment.mjs` and `demo/shell/segment-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-segment.md#<anchor>`.

<a id="header"></a>

## segment.mjs, file header

demo/shell/segment.mjs — a seven segment display, drawn from its parts.

  createSegment({ digits: 3 }).set(127)

Asked for 2026-09-21: *"do we have lcd font (made of parts/lines)? its 3
digits"*. We did not. `/kit/` had 25 sections and none of them was a display,
`/evo/`'s `.evo-lcd` is a monospace text box that reads as an LCD because of
its two colours and nothing else, and the only font files in this repository
are Gabarito for `/weight/`.

🔴 DRAWN, NOT A VENDORED FONT, AND THE GHOSTS ARE THE REASON. What makes a
panel read as an LCD rather than as coloured text is that every UNLIT segment
is still faintly there: you can see the `8` behind the `1`. Drawn, that is one
opacity on the off set and nothing else. In a font it is a dimmed `8` stacked
behind every digit and kept in register with it, at every size, forever.
A drawn digit is also a fixed box BY CONSTRUCTION, which this project has a
rule about (nothing that redraws live may change how much room it takes), and
it avoids a licence question and a third file to deploy.

🔴 SVG RATHER THAN CSS, AND HERE IS THE ARGUMENT SO IT IS NOT RE-OPENED.
A segment is a hexagon with mitred ends. In CSS each one is a `clip-path:
polygon(...)` on a box, which is the same point list with the coordinate
system taken away: every number becomes a percentage of a box sized somewhere
else, so changing the bar thickness means re-deriving seven lists of
percentages by hand. In SVG the thickness is `GEO.T`, typed once, and all
seven polygons are generated from it by `bars()` below. The whole field then
scales from ONE number, because a `viewBox` scales: a CSS build has to
re-derive every length from a font size, and at small sizes the rounding
shows up on a polygon's edge where it would not on a border.
⚠️ THE ONE THING SVG COSTS IS THAT A PAGE'S TYPE RULES CANNOT REACH IT.
`font-size` and `letter-spacing` do nothing to a display. That is the feature:
a readout must not change width because a page changed its type.

🔴 IT IS `.pos-disp`, NOT `.pos-seg`, AND THAT NAME WAS ALREADY TAKEN.
`.pos-seg` is the SEGMENTED ROW join in shell.css, which carries
`.pos-seg > * { border-radius: 0 }` and `.pos-seg > * + * { margin-left:
-1px }`. A display called `.pos-seg` would have had its digits overlapped by
one pixel each and its corners squared, by rules written for a row of
buttons, with nothing in either file pointing at the other. Found before
shipping by grepping the name.

── SEVEN SEGMENT, N DIGITS, AND NO LETTERS ON SPEC ────────────────────────

The caller says how many digits. `/evo/` wants three. Fourteen segment is NOT
built: letters in general need it, and a page that needs to spell something
is the moment to build it rather than now. What IS here is the closed list of
characters seven segments really draw, in `GLYPHS`, so a panel can say `ON`,
`OFF`, `rEC`, `SEt`, `HI`, `LO` and the hex digits.
⚠️ ANYTHING OUTSIDE THAT LIST IS REFUSED, NEVER APPROXIMATED TO THE NEAREST
SHAPE. A `K` drawn as an `H` is a display telling a reader something that is
not so, which is worse than a display saying it cannot.
⚠️ `I` AND `O` ARE DELIBERATELY ABSENT. Seven segments draw them identically
to `1` and `0`, so a field reading `10` would be unreadable as `IO`, and both
turn up inside strings that look like numbers. `S` is kept even though it is
identical to `5`, because `SEt` and `StoP` need it and nothing spells a
number with an S in it. That collision is the only one in the table and
`segment-test.mjs` asserts it is the only one.

── TWO THINGS THAT WERE OPEN, AND WHAT THEY WERE DECIDED TO ──────────────

🔴 1. A SECOND SMALLER FIELD IS TWO DISPLAYS, NOT AN OPTION ON ONE.
The real MK-425C has a three digit field and a small two digit one in the
same window. This component does NOT take a `sub:` option, and a page that
wants that panel builds two displays and puts them in one box of its own
(`/kit/` shows exactly that arrangement). The reason is that two fields are
two independent values, so an option would have bought two `set` calls, two
blank policies and two overflow policies inside one component, and the
caller would still have had to say which one it was talking to. What a
display IS is one field of N digits; how two of them sit on a panel is a
LAYOUT claim, and this project already keeps those on the page.
✅ WHAT MAKES THAT WORKABLE IS `frame: false`, which drops the border and the
backlight so two bare displays can share one window the page draws. Without
it the decision would have been a refusal rather than a decision, because two
framed boxes are not a panel.

🔴 2. A NUMBER TOO WIDE FOR THE FIELD SHOWS DASHES AND SAYS SO. It does NOT
show the low digits. An odometer rolling `1234` into three digits shows
`234`, which is a wrong number printed confidently, and the reader has no way
to know. So every cell shows its middle bar, the field takes a `.over` class,
the tooltip becomes the value that would not fit, and `set()` RETURNS
`{ over: true, asked, why }` so the page can log it.
⚠️ DASHES AND BLANK ARE DIFFERENT ON PURPOSE, which is the whole reason the
ghosts matter. `---` means *this value does not fit here*. A field with every
segment off, ghosts showing, means *nothing has been measured yet*, which is
this project's readout rule: nothing unmeasured prints as `0`, because a zero
reads as a very confident measurement of nothing.

── WHAT IS NOT HERE, AND WHY ─────────────────────────────────────────────

No lean. A real calculator's digits are skewed, and a skew changes the width
of the box, which is the one thing this component guarantees.
No `pad: '0'`. Nobody has asked for `007`, and a caller who wants it passes
the string `'007'`, which the table draws as typed.
No label option. A caption is furniture and belongs to the page around it;
the control layout contract in shell.css is about controls, and this is a
picture. Nothing here takes a pointer.
No `destroy`. There is no timer, no listener and no socket in it.

<a id="glyphs"></a>

## segment.mjs, GLYPHS

Character to the bars it lights, as a string of segment letters.

    aaa
   f   b
   f   b
    ggg
   e   c
   e   c
    ddd

⚠️ CASE IS LOAD-BEARING AND `segmentsFor` SMOOTHS IT OVER. Some of these
letters only exist in one case on seven segments: a capital `B` is an `8` and
a capital `D` is a `0`, so the table holds `b` and `d` lowercase. A caller
writing `'ON'` or `'B'` still gets the right shape, because `segmentsFor`
tries the character as given and then both cases of it.

<a id="segments-for"></a>

## segment.mjs, segmentsFor()

The bars a character lights, or `null` if this display cannot draw it.

⚠️ IT RETURNS `''` FOR A SPACE, WHICH IS FALSY AND IS NOT AN ABSENCE. Every
caller compares against `null`, never on truthiness: a blank cell lights
nothing and that is a correct answer, while `K` has no answer at all.

<a id="round2"></a>

## segment.mjs, round2()

⚠️ ROUNDED, BECAUSE THESE NUMBERS BECOME A `viewBox` AND A `translate`.
`12 + 3.4` is not 15.4 in binary, so three of them less one gap came out as
42.800000000000004 and the test comparing one digit's worth of width against
the difference between two fields read as a real failure. Two decimal places
is finer than a hundredth of a glyph and nothing here needs more.

<a id="field-w"></a>

## segment.mjs, fieldW()

How wide the whole field is, in `viewBox` units.

⚠️ THE TRAILING SLOT IS KEPT ON A DECIMAL DISPLAY AND DROPPED OTHERWISE. A
dot after the last digit is a thing a display really shows (`125.`), so the
room for it has to be inside the picture. With no dots there is nothing to
reserve, and leaving the gap in would have laid the field 2 px left of the
centre of its own frame.

<a id="blank"></a>

## segment.mjs, layout(), blank

🔴 NOTHING MEASURED IS BLANK, NEVER A ZERO. The readout rule, in the one
place a display could get it wrong: `''`, `null`, `undefined` and `NaN` are
four ways of saying we have not looked, and a field reading `000` is a very
confident measurement of nothing.

<a id="infinity"></a>

## segment.mjs, layout(), infinity

⚠️ AND AN INFINITY IS NOT THE SAME FACT. It is a measured value with no
room on any field, so it overflows rather than going blank.

<a id="decimal-point"></a>

## segment.mjs, layout(), the decimal point

🔴 A DECIMAL POINT RIDES THE CELL BEFORE IT AND COSTS NO CELL, which is how
hardware does it and is why `12.5` fits a three digit field. Counting the
dot as a character is the obvious implementation and it would overflow a
reading that a real display shows without trouble.

<a id="thickness"></a>

## segment.mjs, bars(), thickness

🔴 THICKNESS IS A PARAMETER SINCE 2026-09-23, ASKED ON `/evo/` AS
"segmented should be skinnier numbers"*. Everything else in `GEO` is the
    GLYPH, which every display on the site shares so that two fields side by
    side are the same typeface; the bar's weight is the only part of it that is
    a look rather than a shape, and a panel mirror wants a lighter one than a
    meter does. It defaults to `GEO.T`, so every existing caller is untouched.

<a id="schemes"></a>

## segment.mjs, SCHEMES

🔴 TWO KINDS OF LIQUID CRYSTAL DISPLAY, AND THEY ARE NOT EACH OTHER'S THEME.
Asked 2026-09-21: *"have iption on segmentdisplay to inverse color:
green-grayish"*.

A **backlit** display glows: a lamp behind the glass, so a lit bar is bright
and the field behind it is dark. That is the default here and it is what the
Circuit and the MK-425C have.

A **reflective** one does not glow at all. It has no lamp, it borrows the
light in the room, and the crystal goes DARK where it is driven, so the
picture is inverted: near black bars on a pale grey green field. That is a
calculator, a multimeter, a Nokia, and almost every panel with a small
readout made before about 2005.

⚠️ THEY ARE A PROPERTY OF THE OBJECT BEING DRAWN, NOT OF THE PAGE'S THEME.
A page in a dark theme showing a reflective display is correct, because the
real instrument on the desk is pale in a dark room. So this is a caller's
choice about what it is a picture OF, and nothing here reads
`prefers-color-scheme`.

⚠️ AND THE UNLIT BARS MOVE WITH IT, WHICH IS THE HALF THAT IS EASY TO MISS.
On a backlit display an unlit bar is a bit of unlit glass and is nearly
invisible. On a reflective one it is the SAME pale field as the background
with only the faintest tint, and a reader sees it clearly, because the
contrast between driven and undriven crystal is low. Copying the backlit
ghost value across gives a reflective display that reads as a much cheaper
one, so each scheme carries its own.
🔴 AND THE BACKLIT ONE IS NEARLY NEUTRAL, WHICH IT WAS NOT UNTIL
  2026-09-21. Asked: *"reduce blue hue a lot in segm control"*. It was
  `#8fb6ff` on `#0d1830`, which is a **fully saturated** blue ink (HSL
  saturation 100 per cent) on a 57 per cent field, and at that strength the
  colour was the loudest thing about any panel carrying one.
  MEASURED, before and after: ink saturation **100 -> 14 per cent**, field
*57 -> 23**, and the blue-minus-red spread **112 -> 22** on the ink and
*35 -> 12** on the field. What did NOT move is the legibility: contrast
*8.65:1 -> 8.28:1**, so the readout is as readable as it was.
  ⚠️ A TRACE OF BLUE IS KEPT ON PURPOSE. Taken to a true neutral this stops
  reading as a lamp behind glass and starts reading as an LED, and the two
  kinds of display are the distinction this whole table exists to draw.

<a id="scheme-for"></a>

## segment.mjs, schemeFor()

The scheme a name asks for, or null for a name nothing answers.
⚠️ IT REFUSES RATHER THAN FALLING BACK, for the reason the glyph table
refuses a character it cannot draw: a display quietly showing the wrong
colours is a display lying about which instrument it is.

<a id="create-segment"></a>

## segment.mjs, createSegment()

A SEGMENT DISPLAY. A picture of a field of N digits, with every unlit bar
still faintly drawn.

@param {object} [o]
@param {number} [o.digits=3]     how many cells
@param {number} [o.decimals=0]   places drawn for a number; turns the dot on
@param {boolean} [o.dot]         reserve a decimal point slot per cell
@param {number|string} [o.value] what to show at birth; blank by default
@param {number} [o.size]         glyph height in px, as `--disp-h`
@param {string} [o.ink]          lit colour, as `--disp-ink`
@param {string} [o.back]         backlight, as `--disp-back`
@param {number} [o.thick]        how heavy a bar is, in the glyph's own units
 against `GEO.T`'s 2.6. The GLYPH is shared by every display on the site so
 two fields read as one typeface; the bar's weight is the one part of it
 that is a look rather than a shape.
@param {number} [o.ghost]        how visible an unlit bar is, as `--disp-ghost`
@param {'backlit'|'reflective'} [o.scheme='backlit']  which kind of display
 this is a picture of. `reflective` is the inverted grey green one with no
 lamp behind it. `ink`, `back` and `ghost` each override whichever is chosen,
 so a caller can take a scheme and change one thing about it.
@param {boolean} [o.frame=true]  false drops the box, so two can share one
@param {string} [o.title]        the standing tooltip
@param {string} [o.cls]
@returns {{el:HTMLElement, svg:SVGElement, digits:number, decimals:number,
          dot:boolean,
          set:(v:any)=>ReturnType<typeof layout>,
          value:()=>any, text:()=>string, reading:()=>ReturnType<typeof layout>,
          lit:()=>number}}

<a id="scheme-overrides"></a>

## segment.mjs, createSegment(), scheme then overrides

The scheme is written first and the three explicit options over the top of
    it, so `{ scheme: 'reflective', ink: '#000' }` means what it reads like.
    ⚠️ A NAME NOTHING ANSWERS IS A THROW RATHER THAN THE DEFAULT. Silently
    drawing a backlit display for `scheme: 'reflctive'` is the typo surviving
    as a design, which is this project's most repeated shape of defect.

<a id="over-tooltip"></a>

## segment.mjs, set(), the overflow tooltip

🔴 THE TOOLTIP IS WHERE A VALUE THAT DID NOT FIT SURVIVES, and it beats
the caller's own title at that one moment, because what matters while a
field reads `---` is the number that is not on it. `set()` returns the
same fact, so a page can log it too.

<a id="test-header"></a>

## segment-test.mjs, file header

demo/shell/segment-test.mjs — the segment display's arithmetic, with no
browser and no picture at all.

  node demo/shell/segment-test.mjs

`GLYPHS`, `segmentsFor` and `layout` are pure, and they are where every
decision this component makes lives: which bars a character lights, what a
value too wide for the field does, and what a field shows when nothing has
been measured. None of that needs a DOM.

🔴 A SEGMENT MAP IS THE SHAPE OF CODE THAT PASSES A NAIVE TEST BY ACCIDENT.
A table returning "every bar on" for every character draws a field full of
`8`s and satisfies any check that only asks whether something lit up. So the
asserts below name the EXACT bars, and the ones marked NEGATIVE CONTROL are
written so that a specific wrong implementation fails them:

  NC1  an all-on table                  fails 2, 3, 5 and 7
  NC2  blank treated as zero            fails 10 and 11
  NC3  overflow printing the low digits fails 15
  NC4  the two schemes given the same palette fails 30 and 32

All three were run before this file was committed and the counts are in the
report.

⚠️ NO MIDDOT IN THE OUTPUT, unlike its older siblings in this directory. The
separator rule in CLAUDE.md covers a log line, a middot is what the em dash
sweep changed costume into, and a file born after the rule starts without it.

<a id="test-schemes"></a>

## segment-test.mjs, the two kinds of display

── the two kinds of display ──────────────────────────────────────────────

🔴 THE CLAIM IS NOT THAT THE PALETTES DIFFER, IT IS THAT ONE IS THE OTHER
INVERTED. Two tables of different hex would satisfy "they are not the same"
while both being light on dark, which is the defect worth catching: a
reflective display drawn light on dark is not a reflective display, it is a
backlit one in an odd colour. So the assert computes LUMINANCE and compares
the ink against its own field.

<a id="test-lum"></a>

## segment-test.mjs, lum()

Relative luminance of `#rrggbb`, 0 for black and 1 for white.
⚠️ COMPUTED HERE RATHER THAN IMPORTED, so the test cannot agree with the
module by sharing its arithmetic. That is the two-independent-sources rule:
a check derived from the thing it is checking passes while being wrong.
