<!-- research/ui-corrections-taxonomy-2026-09-26.md -->
<!-- Produced 2026-09-26 by a read-only survey of this repository's own record of
     UI corrections: positron-ui, LESSONS.md, BACKLOG.md, CLAUDE.md, shell.css,
     the page headers and git log. Every quote is the owner's, verbatim, as the
     files carry it. Nothing in it was measured in a browser; it is a reading of
     what was already written down. It is the empirical base for the composition
     skill written the same day, and it is kept whole because a condensed rule
     reads as an opinion. -->

# An empirical taxonomy of the repeated UI corrections in /Users/s32863/personal/positron

Read-only survey. No file changed, no browser, no harness. Sources mined in full: `.claude/skills/positron-ui/SKILL.md` (1838 lines), `LESSONS.md` (2846), `BACKLOG.md` (4514), `CLAUDE.md` (565), `demo/shell/shell.css` (7266), `demo/shell/glue.mjs`, `demo/shell/instrument-panel.mjs`, `demo/shell/panel-layout.mjs`, the per-page comment headers in `demo/*/index.html`, and `git log`.

The owner's hypothesis (alignment, inner padding, corner radius, glued containers) is confirmed and is incomplete. The evidence forces **four extra buckets**, and one of them (a number typed twice) is larger than any of the eight given.

---

## Scale of the corpus

Roughly **118 distinct recorded UI correction incidents** carrying **~175 correction events** (an incident re-reported three times counts as three). Every one has verbatim words attached because this repo quotes the owner in `*"..."*` and dates most of them.

The single most expensive hour in the file is recorded at `.claude/skills/positron-ui/SKILL.md:14`:

> **THIS SECTION EXISTS BECAUSE OF ONE SESSION, 2026-09-24, IN WHICH THE SAME `/fau/` PANEL WAS REPORTED FIVE TIMES AND FIXED WRONG THREE TIMES.** The verdict was *"you ui skills are pathetic"*, and it was earned.

The second is `SKILL.md:489`:

> **A LAYOUT CLAIM IS A MEASUREMENT, AND `/twelve/` WAS CORRECTED BY SCREENSHOT TWELVE TIMES IN ONE EVENING.**

---

## BUCKET 1. AIR ON THE WRONG ELEMENT

**14 distinct incidents, ~25 correction events, 6 of them repeats.**

Worst example, and it is the one the skill file leads with. `SKILL.md:73-78` / `BACKLOG.md:3329-3334`, `/fau/`, 2026-09-24:

> **4. AIR INSIDE A BOX BELONGS TO THE BOX.** Asked for *"padding on top"*, I put it on the wrapper, which also carried a background. The page then drew the case, a seam, **a second band of the same dark**, then the well: two bands of one colour with a line between them, reported as *"its a mess"*. Padding on a container with its own background is a STRIPE, not air.

Second worst, `/tom/`, `SKILL.md:1660-1671`, **four rounds**:

> **I READ `no top padding on titles` BACKWARDS AND SPENT FOUR ROUNDS REMOVING PADDING THAT WAS NOT THERE.** It meant the title HAS no padding and needs some. Every repeat after it said so again, in plainer words each time, and each time I took more off. The last report was `STILL NO TITLE PADDING`, in capitals, which is the same sentence as the first one.

The rest, with root causes as recorded:

| where | words | date | root cause recorded |
| --- | --- | --- | --- |
| `/kit/` `kit/index.html:44-60`, `SKILL.md:1675` | *"bottom pading same as top"* | 2026-09-21 | padding was **already 14/14 on all 39 boxes**; ink sat 15 from top and 29 from bottom because the last child carried its own `margin-bottom: 14px` stacking on it. Survey found 11 of 39 uneven and **only one of the eleven was the reported defect** |
| `/twelve/` `SKILL.md:495` | *"less h padding on strip"* | | padding already equal at 14 both ways; the **heading was 146 px**, leaving 50.2 px of air each side of the knob. "Changing the padding would have moved 4 px of a 50 px gap and it would have been reported again" |
| `/twelve/` `SKILL.md:498` | *"bottom uneven"* | | `padding-bottom: 4px` on the scroller and nowhere on the lane beside it. **"A reservation that only one of two equal things makes is a reservation that breaks them"** |
| feedback panel `shell.css:2961-2982` | *"poitless whitespace between lower text"* | | **Reported three times** as the padding not being fixed. `min-height: 0` was not enough: an empty block in a flex column still takes a line box AND still collects the column's 14 px gap |
| `/nola/` `shell.css:3798-3830` | *"add space on left of nona to be same as top and bottob paddings"*, then *"just add some padding to left of nola. i do not understand how to do nameplate properly"* | 2026-09-25 | **asked twice.** MEASURED: the two BOXES agreed to the pixel (+9.00 each) and the two LETTERS were 10.00 px apart. **"A reader sees ink, not boxes"** |
| `/twelve/` `twelve/index.html:144` | *"more space on top of right knob"* | 2026-09-21 | the row gap is measured between BOXES and the eye measures between INK; a button has 8 px inside its border before the glyph, a bare number has none |
| XR tablet `LESSONS.md:1814-1827` | reported from the headset as unequal, correctly | | one `PAD` used all four ways, equal in design px and in millimetres. The gap to the first VISIBLE thing is `48 + (ROW_CONTENT − laneH)/2` vertically against 48 across |
| `/muta/` `muta/index.html:120-130` | *"keep nameplate standard distance from edges"* | 2026-09-22 | **"AND NO PADDING, WHICH IS THE WHOLE BUG AND IT TOOK THREE ROUNDS"**: a floated plate earns its inset by position, not by `padding-block` |
| `/evo/` `evo/index.html:2258-2270` | *"more space on top of keyboard"* | 2026-09-21 | all three quantities measured ZERO (row foot, gap, keyboard head). The assert now requires the distance to equal the container's `row-gap` AND both children to contribute no margin |
| `/mirror/` `mirror/index.html:61-70` | *"add more space under them"* | | `.pos-controls` is one flex row with one gap, so raising it there would move every control row in the project for a claim about one relationship |
| `/reel/` `reel/index.html:35-42` | *"add space on top of newsreel | radio"* | 2026-09-16 | `margin: 14px 0 4px`, and the shorthand's implied `margin-top: 0` beat the rhythm on source order |
| `.panel-band` `shell.css:6733` | preemptive | 2026-09-25 | "a band may paint its own ground, and **padding inside a box with a background is a STRIPE rather than air**, which `positron-ui` records from `/fau/`" |

**The rule that would have prevented all fourteen:** *air belongs to the element a reader is looking at; a container that paints a ground may not also carry the air.* Before moving any inset, measure both rectangles and the ink inside them, and name which of the three contributors (this one's foot, the gap, the next one's head) is actually producing the distance. The repo states the operational half twice: `SKILL.md:56` "Walk from the element to the surface and print every ancestor's padding, border and rect. It is one loop and it ends the argument", and `LESSONS.md:1827` "spacing is measured to what is visible".

---

## BUCKET 2. A CHILD FIGHTING A PARENT'S INSET

**9 distinct incidents, ~16 correction events, 5 repeats.**

Worst example, `SKILL.md:45-57` and `BACKLOG.md:3300-3310`, `/fau/`:

> **2. COUNT THE BOXES BY WALKING THE ANCESTORS, NOT BY READING THE RULES YOU WROTE.** *"edge to edge"* was asked on 2026-09-23, answered by zeroing three insets, and asked again on 2026-09-24 because there were **four**. The fourth was `.panel-case`'s own `padding: 0 var(--panel-pad)` at 20 px, on the case, which no page rule touched. **A child cannot reach its way out of its parent's padding however many of its own rules say 0**, so the text was 20 px short at both ends for a day while every rule about it read as correct.
> **THE FIX WAS NOT A FOURTH OVERRIDE, IT WAS A DIFFERENT SLOT.** `add()` puts a block INSIDE the case, within its inset; `parts: [el]` makes it a glue member, a sibling of the case, with no padding left to fight. **When you are writing a third override to escape a parent, you are in the wrong container.**

The second ask carried *"as i told you"* (`BACKLOG.md:3285`), which `BACKLOG.md` flags as the part to read first.

The owner's sharpest words in the whole corpus are in this bucket, `BACKLOG.md:457-462`, 2026-09-25, `/nola/`:

> *"the border on top of footer goes edge to edge. in the life of me i don ot understand why you do not see it and build a soliutiojn that stays (glued panels) not invent custom css with measurements each time"*

Cause: `.nola-foot` hand-rolled `border-top: 1px solid var(--line)` while living inside `.kbd`, which is `padding: var(--kbd-pad)` at 9 px (`shell.css:3705`), so the rule stopped 9 px short of the box's border on both sides. The fix is `keyboard.mjs` owning its footer and the rule bleeding through `--kbd-pad` **derived from the token rather than copied as a number**.

Others:

- The piano roll highlight, **three asks in a row**, `shell.css:3938-3970`: *"hilite goes edge to edge"*, then *"rm padding"*, then *"still padded box, rm padding"* with a crop showing it had not worked. First attempt was a negative offset alone, and **a scroller cannot let one out**: `.roll` is `overflow-x: auto`, which clips anything reaching past its padding box, so `left: -9px` was drawn and then cut off at exactly the edge it was trying to escape. Plus a fourth, `shell.css:3905`, *"you still have top and bottom baddiong"*: the horizontal bleed landed and left the vertical one behind.
- `.panel-seam`, `BACKLOG.md:813` / `shell.css:6699`: *"on each button group have horizontal panel separator edge to edge"*. "**EDGE TO EDGE IS THE WHOLE DIFFICULTY AND IS WHY THIS IS NOT A `border-top`.**" The answer is `margin-inline: calc(-1 * var(--panel-pad))`, a token and a calc, never a typed `-20px`.
- `/knobs/`, `BACKLOG.md:759-773`: a seam in `.panel-flow` laid out **992 px against a 686 px case**, and a negative margin made it wider still and reached nothing, because **`scrollLeft` clamps at 0** so inline-start overflow inside `overflow-x: auto` is clipped for good. "Inside the scroller it is not hard, it is impossible."
- `.panel-head`, `shell.css:6818`: a `border-bottom` "was inside the case's padding and could never reach the sides, which is exactly how it was reported". Became the glue's own seam.
- `/circuit/`, `circuit/index.html:61-73` and `LESSONS.md:2532-2550`, *"same top and left and rigtj paddings"*: **three earlier attempts at "make the paddings equal" had each moved a padding that was already correct**, because `justify-content: center` splits the leftover width either side of a centred grid and that number changes with the window. "**No value written in the stylesheet could have matched it.**" It also reversed an explicit instruction from an hour earlier, and the file says so out loud: *"make the box fill the container"* and *"same top and left and right paddings"* cannot both hold while the controls are centred.

**The rule that would have prevented all nine:** *a child never escapes a parent's inset; it changes parent.* Count the boxes by walking the ancestors and printing each one's rect, padding and border. If the answer is a second override, the element is in the wrong slot; if it is a third, stop. When a component genuinely must reach its own box's edge, the escape is owned by the component and derived from the token it is escaping (`calc(-1 * var(--x))`), never typed, and never attempted from inside a scroller.

---

## BUCKET 3. ALIGNMENT

**22 distinct incidents, ~45 correction events, the largest count of repeats in the survey.**

Worst example is `/twelve/`, `SKILL.md:489-503` and `shell.css:163-195`: **twelve screenshot corrections in one evening**, of which three are itemised above, and a separate run of three about control rows:

> **SO A ROW OF DIFFERENT CONTROLS CANNOT BE ALIGNED BY A CALLER, AND THREE SCREENSHOTS IN ONE EVENING PROVED IT.** `/twelve/` was reported with buttons a label too low, then with two labels ending on different lines, then with a lane starting 30 px below the button beside it. **Every one was the page doing arithmetic about a component's insides.**

Root cause recorded as a contract failure, not a spacing failure: a hardware control has a working surface and furniture, only the furniture varies, and the furniture was invisible from outside. Fix is `--ctl-head: 15px`, `--ctl-foot: 17px`, `--ctl-step: calc(foot + gap + head)` published at `:root`, and then `.pos-crow` is plain `flex-end` and the browser does it. Two follow-on facts:

- `SKILL.md:582` "**THE DISTANCE BETWEEN TWO STACKED CONTROLS IS THREE THINGS, NOT ONE.** Counting two of them made a lane 115 px against the 145 it needed, and the error was exactly one reserved slot."
- `SKILL.md:574` "A page that writes its own margin correction here is a page that breaks the moment a component gains a label, which is exactly what happened: `/twelve/` lifted its button column by a foot's height, which was right until the pads grew one."

The other twenty:

- `/radio/` label column, `shell.css:2110-2116` and `SKILL.md:365-375`: **REPORTED THREE TIMES**, "and the third report was a different bug wearing the first one's clothes". A `12` typed in `shell.css` and a `0` typed in the page. A component swap (`createChoice` to `createPicker`) had already broken the fix for the first two, and `shareLabelColumn()` went on setting `--lab` on exactly the right element while **nothing consumed it**. Now `--sld-col`.
- `/grains/` four sliders, `LESSONS.md:1265` and `shell.css:2096`: "**A stack is not N controls in a div.** Four rows line up only if they share one set of COLUMNS, which nothing but a grid on the container can give them. **Per-element spacing cannot fix an alignment problem.**" After: label lefts all 16, lane lefts all 61, lane widths all 250 (was 96).
- `/circuit/` reserved slots, `LESSONS.md:2486`: round buttons drifted **75 px down a five row column** from 15 px of reserved top label slot per cell, after the legends came off on a direct ask. "**Three separate times in one session a reserved slot outlived its label.**" And: "A constant offset hides; a per-row offset announces itself at the bottom."
- `/circuit/` *"circle buttons need to align vert with pads"*, *"center filter to right circle buttons"* (a row carrying `--ctl-gap` 8 while the body uses 14, so a 6 px drift each end), *"bottomalign buttns"* (the pair reserved the label height TWICE, once for the shared legend and once inside each pad, so it stood 15 px taller than a plain button). `circuit/index.html:221,346,704`.
- `/evo/` *"align pitch / mod to centr"* (asked twice, `evo/index.html:94` and `:2352`): "**THERE ARE TWO CENTRES HERE AND THIS PANEL HAS BOTH, so which one is measured matters**", and the page asserts both rather than picking. Also *"(small/big) padd buttons shoudl align to knobs by center"* and *"all funtional,+0and c1-c8 control buttons should be vertcally centered, ther midpoints"* where `flex-end` had lined up their BOTTOMS.
- Optical vs geometric, stated explicitly twice. `shell.css:6771`, the instrument header: *"create instrumet header/glue ... center patch selector (optically center to the instrument)"*. "**`1fr auto 1fr` IS THE WHOLE ASK AND A FLEX ROW WOULD HAVE MISSED IT.** *Optically center to the instrument* means centred on the CASE, not balanced between two unequal neighbours." Same reasoning at `shell.css:5085` for the video panel footer.
- `symbol.mjs`, `SKILL.md:1270`: "**`place-items: center` CENTRES THE WRONG RECTANGLE**". A glyph gets an advance width and a baseline; U+26F6 is drawn small and high. Fix computed from the font's own metrics via `measureText`, and the file names the wrong answer explicitly: "The obvious repair is `transform: translate(1px, 1px)` on the one button somebody complained about: a number with no source, right for one glyph in one font at one size."
- `/videoradio/` *"play button is always square"*, `SKILL.md:1291`: `host.textContent = ch` throws away the centring span, and `▶` (one code point, wide and low) and `❚❚` (two characters, narrow and tall) are not the same shape.
- `.pos-pg-corner-said`, `shell.css:2576`: centred by line height and not by `align-items`, because `text-overflow` does not reach a flex item's text; the first build hard-clipped every name past `sample_9.wav` mid word.
- `/muta/` *"no. keep 2 x 2 group, then divider then 3 x 2 grouo"*, `SKILL.md:1723`: `flex-direction: column` inherited from when the container held two knob ROWS, so two GRIDS stacked and the panel came out four rows tall. Plus `align-items: start`, "or the shorter grid stretches and its knobs move off the lattice the taller one sets".
- `/circuit/` `:first-of-type` counts by TAG, `SKILL.md:1750`: a brand label became the first div, neither column rule matched, "**a 336 px drift and two different controls both sitting at x 608**".
- The pad-grid label column, `shell.css:6298`: a dead rule left `--panel-gap` plus a 1 px border eating the whole 22 px, so **64 of 64 labels were clipped** and 0 to 9 looked perfect while every two-digit number lost its second digit. Reported as *"you lost 2-digin numbers from tom demo"*. "**One dead rule produced two separate complaints**", because it also put back the divider that *"rm divider vert line next to pads"* had removed.
- `/kit/` *"still not aligned to vertical separated lanes"* and *"align channel strips horiztlly"*, `kit/index.html:305`.
- `/making/` *"align picure to left in table"*: "`3000x3000` is a SHAPE, with no last digit for a right edge to line up".
- `.pos-fdr-hand` seam, `shell.css:6018`: *"disconnectd from slider, to close to bototm label"*, and the lane's `margin: 4px 0 5px` meant a button joined under it sat 4 px away however negative its own top margin was.

Measurement discipline recorded alongside: `SKILL.md:505` "**THREE ALIGNMENTS THAT LOOK LIKE ONE ARE THREE ASSERTS.** Two of the three lined up while the third was 30 px out, and later the boxes matched perfectly while the faders inside them were 17 px apart. Arithmetic in a comment is not evidence." And `SKILL.md:511` "**MEASURE THE WORKING SURFACE, NOT THE WRAPPER.** An assert reading `el` reported a button 17 px low while the button was exactly right."

**The rule that would have prevented all twenty-two:** *things line up because they share a coordinate system, never because their spacing was adjusted.* One grid on the container, or one published head/foot contract on the components, and then the browser's own `flex-end`. Every per-element margin correction in this bucket was correct on the day it was typed and wrong the next time a component grew a label. And measure the ink, not the box, then assert each claim separately.

---

## BUCKET 4. BORDERS AND CORNERS

**20 distinct incidents, ~32 correction events.**

Worst example is the one the skill file was rewritten around, `SKILL.md:20-43` / `BACKLOG.md:3222-3246`, `/fau/` 2026-09-24. Six messages, verbatim, in order:

> *"double border, rm"* with a crop, *"add padding under nameplate"*, *"you ui skills are pathetic"*, *"its just nonrounded bonbordered texateea between 2 glues"*, *"fau on off is missing border"*, *"still double bottom border on fau textarea"*, *"add more left padding to textarea in fau"*

> **A REPORTED LINE IS NOT NECESSARILY A BORDER, AND CHECKING THE BORDERS FIRST IS THE TRAP.** Every element in that subtree measured `0/0/0/0` or was a control's own legitimate box, so the stylesheet had nothing to find and I removed a presence button's border on suspicion. That came straight back as *"fau on off is missing border"*: a real affordance, deleted, on a guess.
> **WHAT SAID IT, IN ONE LINE, WAS THE RECT PAIR OF THE ELEMENT AND ITS PARENT.** The field wrapper's bottom was **557.5** and the textarea's was **556.0**. **A `<textarea>` is `inline-block` and sits on a TEXT BASELINE**, so its block parent reserves descender space under it. That 1.5 px strip belongs to the wrapper, the wrapper was transparent, and **`.pos-glue` paints `--line` behind its children on purpose, because that is how the seam is drawn**. So the page rendered 1.5 px of seam colour, then the real 1 px seam, and a reader sees two lines.

And the generalisation, `SKILL.md:35`: "**INSIDE A GLUE, EVERY STRAY PIXEL OF LAYOUT BECOMES A VISIBLE LINE.** A replaced element in a glue (`textarea`, `input`, `img`, `video`, `canvas`, `iframe`, `select`) is the shape to check first."

The rest:

- `/pack/` and `/radio/`, **one fault reported from two pages**, `shell.css:3000-3033`: *"rm double bordering"* and *"rm thick borders round waveform and 'the radio as it arrives'"*. Canvas computes 1 px `--line`, its `.pos-glue` parent computes the same 1 px in the same colour, nothing between them, "**two 1 px lines touching is a 2 px line, which is why it reads as THICK rather than as double**". And the fix needed `> X` **and** `> * > X`, because a direct-child selector fixed one page and left the other exactly as reported.
- Feedback fields, `shell.css:380-390`: *"do not intruduce double outline. globally"*. The `:focus-visible` ring landed 2 px outside an input's own 1 px border, giving two concentric yellow rectangles. "**A CONTROL THAT ALREADY HAS A BORDER COLOURS IT. IT DOES NOT GROW A SECOND ONE.**"
- Pad grid focus ring, `shell.css:2493`: *"outline looks bad"*, a 2 px ring standing off a 16 px pad is wider than the 2 px gutter, so it drew over the two pads either side. `outline-offset: -1px`.
- The loop pair, `shell.css:4762-4800`, **four separate reports**: a photographed mismatch; then *"loop buttons should have same border color"* (the first fix had been reasoned about with the loop ON and was wrong in the state a visitor sees first); then *"arrow button square size"*; then *"global: loop buton borders as rest of button"*, MEASURED at `rgb(106,114,128)` (`--dim2`, text grey) against `rgb(43,53,70)` (`--line2`, button edge) for every other button on the page. It ends with **no rule at all**, because `button { border: 1px solid var(--line2) }` already states it once.
- Video panel, `shell.css:5089-5115`, **three reports** ending in *"boxes bg STILLLLLL not same"*: "MEASURED before the change: the border and the radius were both THERE, at 1 px `--line2` and 8 px. **What was wrong is that they were nobody else's numbers.**" The 8 px came from `/mirror/`'s `.pane`, which carries no border at all. "Copying the radius without the rest of the box is how one page's decision becomes a component's inconsistency."
- `.pos-fdr-cap`, `shell.css:5929`: "the radius drops to 3, **because a 4 px corner inside a 4 px corner leaves a sliver of track showing at each end of the handle**".
- `wave-view.mjs`, `SKILL.md:1561`: the border is on the WRAPPER and not on the canvas, "which is arithmetic rather than taste". `box-sizing: border-box` makes a bordered canvas render 2 px narrower than its backing store and stretch the picture 0.3 per cent, which on a 1.3 s sample is 4 ms of head position.
- `.pos-pg-pad`, `shell.css:2465-2477`: *"rm borders on pads"*, and `border: 0` rather than a transparent colour, because "a 1 px border was taking 2 px out of every pad's inside, and keeping it transparent would keep taking them".
- The stepper, `shell.css:2215`: three buttons each with a full border and four rounded corners, "**every join showed TWO borders side by side**". Became `.pos-seg`, a utility four components had each written out separately (`SKILL.md:1173`).
- `.pos-lr`, `shell.css:7096`: the first version used `border-left` on the second pane, which is INSIDE that pane's box, so the two pictures came out 327 and 326 px and their 16:9 wells 184.5 and 183.9 px tall. Now a `gap: 1px` over a coloured ground.
- `/knobs/`, `BACKLOG.md:876`: "**Three seams would have doubled two edges**", because `.panel-case` has a 1 px border and `createGlue` already puts 1 px between the case and the footer.
- The Send button, `SKILL.md:1605`: *"fields: have buttons heiht. use secondary button here"*. Both halves of that report are one cause: `button.pos-pri`'s `box-shadow: 0 0 0 1px` paints a ring OUTSIDE the border and reads as two more pixels of height and width **that no layout number accounts for**.
- `/evo/` *"rm box around it"* and *"rm panel around c1-8"*: "an edge round twelve buttons that are already twelve edges". `/nola/` *"rm border aroind inivible-hand-butotn"*. `/twelve/` *"rm divider vert line next to pads"* (twice). `/muta/` *"no. keep 2 x 2 group, then divider then 3 x 2 grouo"*, a recorded **reversal** of "separation is spacing, not lines" whose scope is the whole point: "it is wrong for two blocks that are each two rows deep, because a gap between them reads as the gap between columns inside them".
- The tick, `shell.css`/`SKILL.md:1061`: "**THE TICK IS DRAWN, NOT TYPED.** A `✓` is a font glyph, and a font glyph is a different shape, weight and baseline on every machine. Two borders on a rotated box is the same two strokes everywhere."

**The rule that would have prevented all twenty:** *one edge per object, drawn by the outermost thing that owns it.* Inside any joined surface the children give up border, radius and margin; a segment overlaps by exactly one pixel; a ring on a control that already has an edge colours that edge instead of growing a second. And before touching a stylesheet on a reported line, read both rects, because the line is as likely to be reserved layout as a border.

---

## BUCKET 5. SIZE OF THE OBJECT

**20 distinct incidents, ~28 correction events.**

Two one-word verdicts anchor it.

`shell.css:1041`, the glued rows surface:

> **THE FIRST BUILD STRETCHED, AND THE VERDICT WAS *"plainly awful"*.** Four knobs on a pedal floated in the middle of a 660 px band with roughly 250 px of bare surface either side of them, four times over, because a glued surface with no width of its own fills whatever it is put in and `align-items: center` then parks the controls in the middle of the emptiness. **The controls were right and the box around them was making a claim about the object's size that nothing had measured.**

`shell.css:5632` / `SKILL.md:974`, the pad grid, 2026-09-20:

> **A FIXED SQUARE, NOT A GRID TRACK THAT STRETCHES.** Reported with a screenshot of eight pads filling a wide box: *"awful. bring back that original pad button size square"*. The columns were `minmax(0, 1fr)`, so **the pad's SIZE was a function of how many of them there were and how wide the page was**: sixteen looked right and eight were enormous. A pad is a thing a finger hits, so its size is a property of the pad.

The rest:

- `.kbd`, `shell.css:3718`: "a full width panel holding a 496 px keyboard is 800 px of empty surface, which reads as a layout that failed rather than as an instrument at its own size". The opt-in reversal is `/knobs/`'s *"make keyboard 25 full w."*, and *"do not stretch it ever"* stands as the default.
- `/circuit/` round buttons photographed as **ellipses**, `LESSONS.md:2505`: a 41 px round pad in a 46 px wrapper "came out neither 41 nor round". The honest note follows: two things changed at once and the cause was never isolated. What survives is "**at pad size there is nothing to centre and nothing to stretch**, so a whole class of cell arithmetic stops existing".
- `.pos-pad-half`, `shell.css:5740`: `aspect-ratio: 2 / 1` for an hour, "which is the same thing only while the width is fixed, and the width was not: the grid stretched it. **Say the two dimensions rather than a ratio, and the pad cannot be reshaped by how many of it there are.**"
- `.pos-pad-wrap`, `shell.css:5680`: *"actually, make long labels ..."*. The ellipsis rules had always been there "and it never fired because the WRAPPER had no width to overflow: it simply grew".
- `/stage/`, `shell.css:5343`: *"(square!)"*. `.ico` is scoped `.step button.ico`, so outside a segmented row the button took the ordinary 18 px of horizontal padding and MEASURED **48.6 by 34.0**. "CLAUDE.md already records twice that `.ico` needs its own size; this is the third place." `shell.mjs:151` records the same thing as "a rectangle pretending to be an icon, **reported twice, fixed twice**".
- `.pos-vp-foot`, `shell.css:5192`: `1fr auto 1fr` is a trap rather than a typo. An `auto` track's growth limit is its max-content, so a full centre slot takes the row and **both `1fr` tracks resolve to zero**: MEASURED on `/mirror/`, left slot 0 px wide with its presence dot's right edge 2 px INSIDE the centre slot, drawn over the first label.
- `tabs.mjs` and the card grid, `SKILL.md:957`: `minmax(190px, 1fr)` "does not fall back to one column, it makes a COLUMN WIDER THAN THE PAGE": 390 px of screen, a 500 px row, **141 px of page overflow**. `min(100%, …)` is the whole fix.
- `.kit-hwstrips`, `LESSONS.md` #107: `flex-wrap` wraps BETWEEN items, and **a single item wider than the container cannot wrap**: 424 px of content in a 358 px box dragged the document **65 px sideways**. Same lesson from the other end, `SKILL.md:980`: `repeat(var(--pad-cols), …)` is a FIXED track count, so a grid too wide for its box "neither wraps nor shrinks, it spills", 27 px past its own box. Both comments claimed an intention the rule could not implement.
- `/evo/`, `SKILL.md:1238`: `.evo-keys` from `flex: 1 1 auto` to `0 0 auto` moved the flow **461.03 to 151** and the keyboard **334.03 to 24**, "310.03 px of absorbed slack, 67 per cent of the flow's depth", and the keyboard has no intrinsic height at all. "`min-height: 0` is not optional and is the half that gets left out."
- `/knobs/`, `BACKLOG.md:~520`: `full: true` reaches nothing, because `.kbd.kbd-full` is `width: 100%` of a `max-content` host, and it was invisible because **the assert compared the keyboard's box against the very flow that box sizes**.
- `.pos-tbl-row`, `shell.css:3268`: `min-content`, not a typed 560 px, because `/making/` grew three columns in one day and its fixed tracks went 232 px to 476, "so 560 stopped being a floor that held anything".
- `/videoradio/` *"play button is always square"*: a button sized by its content resizes on every press. `/stage/` *"fix button, use regular button"*, where `PLAY RECORDING` clipped to `PL` over `RECOR`. `/wish/` *"just [x] button, use small variant (create in kit if not exists)"*, two controls at 37.3 and 34.0 px in a 72 px column. `/making/` *"image preview box square and fit it by w or h"*.
- `local-remote.mjs`, `SKILL.md:1482`: a component asks its OWN box, not the window, because "a component in a half page column on a 1280 px screen is 600 px wide, and a viewport query would tell it it has room it does not have". And "**A BOX WITH NO WIDTH YET IS NOT A NARROW BOX**": seven diagrams built inside a closed panel came out laid out for 320 px inside a 658 px panel.

**The rule that would have prevented all twenty:** *a component's size is a property of the component, and it is stated in the two dimensions it is about.* A finger target, a keyboard and an instrument get `width: fit-content; max-width: 100%` and a fixed track; only a picture or a text column may take its size from its container. A ratio is not a size while a parent can stretch one axis. And a container that does not fit scrolls against its own `min-content`, never wraps and never shrinks.

---

## BUCKET 6. SPECIFICITY AND CASCADE SIDE EFFECTS

**30 distinct incidents. Six of them are the repo's numbered dead rules.**

Worst example, `SKILL.md:59-71` / `BACKLOG.md:3336`, `/fau/`:

> **A COMPONENT'S SHORTHAND BEATS YOUR LONGHAND, AND WEIGHT DECIDES BEFORE ORDER DOES.** `.fau-src textarea` is `(0,1,1)`. `shell.css`'s `.pos-field.tall textarea` is `(0,2,1)` and sets `padding: 7px 9px` as a SHORTHAND. The page sheet loads later and still lost, so `padding-top` computed **7 px** while the source read as correct. The `border-width` on the same element DID win, because the rule it beats is `(0,1,1)` and a tie goes to the later sheet. **Two declarations in one rule, one winning and one losing, is normal and is invisible in the source.**
> **MATCH THE COMPONENT'S WEIGHT, NEVER OUTRUN IT.**

The dead rules, in the order the repo numbered them:

1. `.pos-pick`'s **entire phone layout** in `@media (max-width: 560px)` at `shell.css:1589`, beaten at every width by a plain rule 460 lines later. "**The picker had NEVER collapsed on a phone in its life.**" Found by putting two controls side by side and measuring both. `SKILL.md:119-134`.
2. `.pos-log { margin-top }`, "inert for as long as it existed".
3. `if (fullSupport() === 'none')` on `/weight/`, a branch comparing against a string the function never returns.
4. `stage.style.aspectRatio`, `LESSONS.md` #102 / `SKILL.md:142`: **an inline style beats every selector**, so a panel given a shape could never give it up. `/making/`'s 1:1 picture box stayed square on a 16:9 screen, the picture sat high, and `.pos-fsx` is `position: absolute` INSIDE that stage so **the way out of full screen rode up there with it**. "**Reported as two separate faults** (*"center fullscreen images"* and *"put back from fullscreen to sceen corner"*) because that is how it looks. One cause." Fix is a custom property, never the property: `stage.style.setProperty('--vp-aspect', aspect)`.
5. `.pos-pg-labs { border-right: 0; padding-right: 0 }` declared three thousand lines above `.panel-fixed-l`, same `(0,1,0)`, later rule wins. `shell.css:6298`: "**THE COST WAS VISIBLE AND SHIPPED FOR THREE DAYS.** The label column's CONTENT box computed to 0.00 px against `width: 22px`", 64 of 64 labels clipped. "**And it came in under an unchanged assert count**", on a commit whose message reads *"/tom/ converted and back at exactly 44/44"*.
6. `.panel-head-plate` override that would have lost on specificity, "tried and deleted" rather than shipped.

Plus the reverse case, `shell.css:7235` / `SKILL.md:926`: "**A RULE THAT RAN WHERE IT MUST NOT.** `.pos-wave[hidden] { display: none }` is `(0,2,0)` and the arrangement rule is `(0,3,0)`, so a wave view holding nothing laid out a 327.5 px wide box across the well, holding a 328 by 150 canvas with **0 of its 49,200 pixels painted**."

The other cascade families, each with its own recorded count:

- **`[hidden]` beaten by an author `display`: five components needed the identical patch** (readout, control row, log, glue, table, rows). `/pack/` showed three column headings over three empty tables **on the page carrying the assert that says it does not**, because the assert read `head.hidden === true`, the PROPERTY. `shell.css:3306-3325`.
- **`[data-thing]` matches an empty attribute.** `root.dataset.full = ''` kept `border: 0`, `background: #000` and no aspect ratio "for the rest of the page's life". `LESSONS.md` #103. "It survived because entering is what gets tested."
- **A custom property inherits downward, never sideways**, three times: `--fdr-foot` on `.pos-fdr` invisible to the button column beside it, `var()` falling back silently while the source read as correct (`SKILL.md:520`); `--panel-pad` on `.panel-head` once it became a SIBLING of the case, *"where is padding. good god.."* one minute later (`shell.css:6822`); and `--rows-gap`'s first draft reading `var(--panel-gap)` and measuring ZERO, where "**an unresolved `var()` makes the WHOLE `padding` shorthand invalid at computed-value time** rather than dropping one side" and every inset assert on `/kit/` read `a row pads 0 px` (`shell.css:211-222`).
- **A tie decided by source order**, "the defect this file has paid for three times": `.tbar-x` against `.tbar-word` deciding the arrow's width (*"arrow button square size"*); `.pos-pad-small` having to be written after all three pad shapes; `.pos-presence-btn .pos-pres { color: inherit }` at `(0,2,0)` sitting 750 lines later than every state rule, so on `/circuit/` the badge computed `rgb(230,230,230)` in **all five states** and the dot did too via `currentColor` (*"chircuit checking should be gray"*, `shell.css:6060`).
- **A selector list discarded whole** by a browser that does not know one pseudo-class: `:fullscreen` would have deleted the fallback "on precisely the browsers that need it", and `:focus:not(:focus-visible)` "which an older engine drops whole" (`shell.css:370`).
- **`/keys/`'s phone layout written three times before it did anything**, `LESSONS.md` #65, four distinct mechanisms in one incident: wrong container, inline style, specificity tie, and "**the rule set `flex-direction`, `align-items` and `gap` but not `display`, and the computed display was `block`. A flex property on a non-flex box is not an error, it is silence**". Plus a fifth, inherited past: `.pos-log` is a `<pre>` so `white-space: pre` inherited into `.pos-m` and made its `overflow-wrap: anywhere` inert while the comment above claimed the opposite.
- **Dead selectors born by renaming**: `.strip-body .pos-fdr` after `.pos-crow` (a lane 29 px short), and every `.fau-panel` ancestor rule once the text became a glue part, "the dead selector this stylesheet has now measured five times" (`BACKLOG.md:3314`).
- `.pos-glue.pos-glue > *` double-classed on purpose, because `.pos-glue > *` weighs exactly what `.pos-strip` and `.tbar` weigh for their own border (`shell.css:979`). And `.pos-scope`'s direct-child selector which "fixed one page and left the other exactly as reported": the canvas read 1 px on `/pack/` and 0 on `/radio/` from the same rule.

**The rule that would have prevented all thirty:** *never read the rule, read the computed value of the property you set.* The repo states it three times and states the corollaries: match a component's weight, never outrun it; put media blocks and overrides after what they override, because order is the fix and weight is an escalation; a component that varies a property per instance sets a custom property, never the property; declare tokens where they can be read (`:root`), because a `var()` that does not resolve kills the whole shorthand; and clear an attribute by deleting it.

---

## BUCKET 7. EMPTY CONTAINERS PAINTING EDGES

**12 distinct incidents, and the repo already has this as a named standing rule.**

Worst example, `/typist/`, `LESSONS.md:1806` and `SKILL.md:721`:

> **An empty container paints its own edges.** The "horizontal rule nobody wrote" above `typist`'s controls was a `.pos-readout` div with **0 children and a height of 2.0 px**, a full-width band made entirely of `shell.css`'s 1 px border on each side, 24 px above the controls. Reported as *"old UI creeping in"*, **which it was, just not in the way it looked.**

Most interesting example, because the shape arrives through a flex gap rather than a border. `shell.css:4730`, `/videoradio/`:

> **AN EMPTY MEMBER STILL EATS A GAP, AND THAT IS WHY THE LAST CONTROL SAT FURTHER FROM THE EDGE THAN FROM THE TOP.** MEASURED: 9 px from the top, 9 from the bottom, 9 from the left and **17 from the right**. Reported as *"eqal top righ bottom padding"*. After the last real control come `.tbar-rates` and `.tbar-badge`, both zero wide and both still separated by a gap: 8 + 8 + 1 of border is the 17.

The full set: `.pos-controls[hidden]` (an empty control row left a 14 px band); `.pos-fb-said:empty` (**reported three times**, because `min-height: 0` left the element in the flow collecting a 14 px gap); `/fau/`'s empty `.panel-strip` (a **40 px band of pure `padding-block` inside a 71 px case holding one word**, and emptying it exposed `gap under plate 0.0px`, `BACKLOG.md:3317`); `/pack/`'s table headings (*"no empty table headers (add rule)"*, 2026-09-21, and **every empty table in the project had been drawing its heading for as long as `table.mjs` existed**); `createNameplate` throwing on no lines, "which is the shape this project has already shipped **twice** as a horizontal rule nobody wrote" (`panel-layout.mjs:~500`); `.pos-vp-under:empty`; `.pos-drop-note[hidden]`; `.tbar-all:empty`; `createGlue` returning the child unwrapped when only one survives and `null` when none do; `createReport()` returning no `foot` when neither half exists.

**The rule that would have prevented all twelve:** *a container with nothing in it must not paint its edges and must not take up room, and that cannot be the page's job to remember.* The component that owns the box hides it. Note the two-step: hiding it with `display: none` is also what stops it collecting a flex `gap`, which `min-height: 0` does not. And assert it on `getComputedStyle(el).display`, never on `el.hidden`, because "`el.hidden` is a fact about an attribute and `getComputedStyle(el).display` is a fact about the screen".

---

## BUCKET 8. SOMETHING CHANGING SIZE WHILE BEING LOOKED AT

**19 distinct incidents. Already a `CLAUDE.md`-level rule, and the bucket with the highest proportion of prevented-by-design entries.**

Worst example, `SKILL.md:693`:

> **NOTHING THAT REDRAWS EVERY FRAME MAY CHANGE HOW MUCH ROOM IT TAKES.** `grain-scope` carried a caption that rewrote itself sixty times a second and reflowed between three and four lines, so the picture, the pane and everything below them jumped continuously, reported as *"a horrible jump of content each time it updates"*. The words were accurate and it did not matter. **The fix is never to shorten the sentence.** The test is not "is it short", it is **can this change its own height while somebody is looking at it**.

Second worst, and the one that shows the rule being half-applied, `shell.css:5386`:

> **A FIXED HEIGHT ON THE NUMBER ... AND A FIXED WIDTH SINCE 2026-09-22, WHICH IS THE HALF THAT WAS MISSING.** REPORTED: *"invisible m4 knob: show value without floating or make it stop wiggling"*. `.pos-knob` is `align-items: center`, so a box sized by its content re-centres on every frame and `9` becoming `10` slides the whole string sideways. **The height alone could never have stopped that.**

The rest: `/videoradio/` *"play button is always square"*; `/fau/` *"just [() ON] and [() OFF] (same w)"*, where the reserve is computed on the WIDER of the two and the precedent is the transport bar's *"the control cannot change size under the finger that pressed it"*; the presence badge's `min-width` reserved in `ch` with no letter-spacing (because `ch` is the advance of `0` and tracking would add one space per character to a reserve that did not budget for it); the feedback panel's two reserved lines, its terminal states dropping the reserve, and nothing reserved before the first word; `.pos-midilog[data-reserve]` (*"press the status button, then play something - rm just leave room for midi table"*); `/wish/`'s JSON box with floor and ceiling the same number, measured as **7 lines with no transform, 12 with one, 16 with two**; `.pos-msgs`' floor; `.pos-tbl-rest` reserving a real row's height; the table heading's `nowrap` ("a wrapped heading is the table reporting that its columns do not fit, and it does it by changing its own height"); `pos-sweep` being PAINT ONLY; `pg-breathe` animating `opacity` alone; `choice.mjs` reusing `data-busy` after its own opacity pulse was reported as a flicker; a disabled control keeping its shape; `.pos-fdr`'s hand mode where **the lane gives up the room so the fader's bottom does not move** (*"why need to account. its just sliders mode"*, *"the bottom y stays"*); the feedback panel being `position: fixed` on `document.body` so opening it moves nothing.

**The rule that would have prevented all nineteen:** *anything that redraws on a clock lives in a fixed box whose reserve is computed from the widest thing that instance can ever say.* A changing number goes in a readout cell or a lane gutter. A changing word gets a `ch` reserve and no tracking. Only `opacity`, `color`, `background-image` and `transform` may animate. And a reserve exists only for the moments a jump is possible: not before the first word, not after the last.

---

# FOUR BUCKETS THE EVIDENCE ADDS

## BUCKET 9. A NUMBER TYPED TWICE

**~16 incidents, and by the repo's own accounting the most repeated defect in it.** `shell.css:203` calls it out by name: "`--sld-col` and `--ctl-gap` both exist because **a measurement typed twice is a measurement that will disagree**". `shell.css:6238` calls it "**this project's most repeated defect in its cheapest form**".

Worst example is `--sld-col`, `shell.css:2110`, **REPORTED THREE TIMES**: a `12` in `shell.css` against a `0` in `/radio/`, and the third report was a different bug wearing the first one's clothes after a component swap had already broken the fix for the first two.

The instances, each with the number that was typed and the token that replaced it:

| token | what it replaced | trigger |
| --- | --- | --- |
| `--pos-gap: 40px` | per-page vertical gaps everywhere | *"same vert space beween as we establised in knob (make a rule and uptada others in bg: make it easy to change later)"*, then **asked again** as *"you can not follow spacing tule. make reusable layout component?"* which `shell.css:135` calls "the right diagnosis" |
| `--ctl-w: 46px` | knob 62, pad 40, fader 34, each with its own row gap | *"controls should line up vetically, make a strip layut or smth"*, 2026-09-20. "Four rows of the same eight channels drew four different column pitches" |
| `--pad-btn/seg/bar` | **six typed figures, one of which followed the rule** | **asked twice**; `shell.css:105` and `SKILL.md:810`. MEASURED 2026-09-20: `.pos-choice button` 11, the same on a phone 8, `.pos-bgroup-row button` 12, `.pos-pick-cell` 10, `.tbar-rates button` 7, `.xr button` 18 |
| `--ctl-head` / `--ctl-foot` / `--ctl-step` | per-page arithmetic about a component's insides | `/twelve/`'s three-in-one-evening |
| `--ctl-off: 0.55` | a caller with nothing to match | `/evo/` drew its own labels at 5.91:1 over buttons dimmed to .38, "**wrong by three times**" |
| `--panel-gap: 16px` | the literal `16px` on `/evo/`'s `.pan-fixed` right padding AND its `.pan-strip` left margin | |
| `--kbd-pad: 9px` | every `-9px` bleed | "A `-9px` written here would be the `--sld-col` defect" |
| `--kpad-pad` | the ink indent, `calc(--kpad-pad + 1px)` | *"just add some padding to left of nola"* |
| `--fdr-knob: calc(--ctl-w / 2)` | "a typed 20 px, **which agreed with nothing**" | *"make slider heads same h as halfbutton heights"* |
| `--fdr-lane-cut: calc(--fdr-lane-w - 1px)` | a four-term hand sum | "Miss the 5 and the fader grows by exactly that" |
| `--tbl-row-h: calc(9px + 7px + 1.4*11px + 1px)` | a guessed reserve height | "the only honest way to say *six rows tall*" |
| `--rows-pad: 20px` | deliberately a second name for one number, **with the agreement asserted** | `/kit/` measures a row's computed padding against `.panel-case`'s and requires them equal, "the only form of *these must not disagree* this project trusts" |
| `--roll-w` | a second measurement of the key row | written from the key row's own `scrollWidth` |
| `--pg-cell` | a typed cell width | measured by `pad-grid.mjs` and written onto both the grid and the label column |
| `--pg-fall` / `RISE_MS` | the lamp's two durations | *"make 2nd and 3nd fade fade faster"* |
| `--knob-num-h` | read by the knob and by the hand button | |

**The rule that would have prevented all sixteen:** *a measurement two elements have to agree about is one declaration at `:root`, read by both, and the agreement is asserted rather than commented.* Corollaries the repo paid for: declare it where it can be read, because a token on a class is invisible to a sibling and an unresolved `var()` kills the whole shorthand; prefer `calc` off an existing token to a new number; and when two names for one number are unavoidable, write the assert that requires them equal.

## BUCKET 10. THE GLUED CONTAINER'S GROUND

**4 incidents, all in the last five weeks, all the same mechanism, now fixed in the component.**

`.pos-glue` is `gap: 1px` over a `--line` ground, so the seam is the ground showing through. Any child with no background of its own therefore paints its **entire area** in the seam colour, and any stray pixel of layout inside a glue becomes a visible line.

`BACKLOG.md:81` states it as a standing warning: "**every glued part paints its own ground or the seam colour comes through its whole area**, and a replaced element in a glue (`canvas`, `textarea`, `img`, `video`) is inline by default and leaves a strip that renders as a second line".

The four: `/wish/`'s parts; `/pack/`'s wave host (`pack/index.html:32`, "Third part, same trap, measured the same day on `/wish/`"); `.pos-glue > .pos-scope`'s background; and the `/fau/` 1.5 px descender strip, which is the same ground made visible by a different mechanism. `glue.mjs:64-79` records the count and the resolution:

> **A ROW IS A CONTAINER, AND IT PAINTS ITS OWN GROUND.** That trap is recorded three times already, against `/wish/` and twice against `/pack/`, **each time as a caller remembering to paint a ground in its own stylesheet**. Here the container does it and there is nothing to remember.

And the structural half, `glue.mjs:80`: the row is `display: flex` **because a flex container blockifies its children**, so a replaced element handed straight to `row()` cannot leave the descender strip at all.

**The rule that would have prevented all four:** *a surface whose seam is a gap over a coloured ground must paint that ground itself, for every part, and must blockify every child.* Never leave it to a caller to remember, and check every `> X` patch also as `> * > X`, because pages wrap their parts inconsistently.

## BUCKET 11. A PAGE-LOCAL REPAIR TO A SHARED COMPONENT

**6 incidents. The nameplate one was reported on three different pages.**

`SKILL.md:80`:

> **A PAGE-LOCAL REPAIR TO A SHARED COMPONENT IS HOW A DEFECT GETS PAID FOR TWICE.** `/tom/` fixed the plate's top padding privately, *"every page after it inherited the defect and not the fix"*, and it was re-reported on `/plai/` as *"you failed afain on nameplate padding"*.

The full `/plai/` quote, `panel-layout.mjs:154`: *"you failed afain on nameplate padding. after hrs work yesterday. why not panel can have just nameplate support via nameplate component"*. It came back a **third** time on `/fau/` as *"add padding under nameplate"* (`shell.css:6479`), when emptying the strip exposed the zero at the other end.

The evidence was one line in a page: `demo/tom/index.html` carried `.tom .panel-plate { padding: 16px 0 0 }`.

And the follow-on that generalises further, `panel-layout.mjs:165`: "**AND A WRAPPER DID NOT SOLVE IT.** `instrument.mjs` was written the same day to stop five pages hand-rolling this assembly, and it centralised the `prepend` while leaving the spacing exactly where it was. **Centralising an assembly that does not own its own layout moves the duplication rather than removing it.**"

Others: `/nola/`'s hand-rolled `.nola-foot` border (the *"in the life of me"* quote above, which `BACKLOG.md:457` explicitly labels "**A CRITICISM OF HOW THIS IS BEING WORKED RATHER THAN OF ONE BORDER**"); `/twelve/` lifting a button column by a foot's height; `/fau/`'s page-local `:empty` rule, written with a comment arguing for it and deleted an hour later; `/stage/`'s hand-rolled bar and buttons; and the standing one, *"you have several instroments done by now. can you not reuse ui?"* (`SKILL.md:1669`).

**The rule that would have prevented all six:** *if the defect is in the component, the fix is in the component, and a condition is what makes it provably narrow.* `SKILL.md:86`: "**a CONDITION can make a component rule provably narrow**: `:has(> .panel-strip:empty)` matches only a case with nothing in its strip, and MEASURED across the three pages that build one, exactly one case in the repository was empty and exactly one page changed." Then re-run the other pages and diff their assert counts, "which is the only thing that makes *provably narrow* a fact rather than an argument".

## BUCKET 12. THE REPORT WAS READ WRONG, OR THE CAUSE WAS ONE LAYER UNDER IT

**6 incidents, and it is the meta-bucket that made the other eleven expensive.**

`SKILL.md:491`: "**when somebody reports what they SEE, the cause is usually one layer under it**, and measuring first costs one throwaway assert." `SKILL.md:41`: "**A CROP IS EVIDENCE OF WHAT IS ON SCREEN, NEVER OF WHAT CAUSED IT.** Three readings of the same crop produced three different culprits."

- `/tom/` *"no top padding on titles"* read backwards, **four rounds**, ending in `STILL NO TITLE PADDING` in capitals.
- `/nola/`'s piano roll vertical lines, `BACKLOG.md:2315`, **the fifth request about those lines**: *"add faint vertical lines"*, then *"make vertical lines on pianoroll continuous"* (done by closing the row gap), then *"no continous vertical bars on pianoroll!"* which **was read as `remove them` and meant `they are still not continuous`**, so they were deleted, then *"you lost vertical lines on piano roll"*, then *"rm gap in piano roll vert lines"*. "The file's own lesson is that the reading which DESTROYS work is the one to check first."
- `/evo/` *"on dislable pad buttons make labels way lighter"*, `SKILL.md:1104`: "**THE CAUSE WAS ONE LAYER UNDER WHAT WAS REPORTED, WHICH IS THE USUAL PLACE.** The kit's own pad labels were never the problem: a pad's `.pos-pad-top` reads 1.96:1, the faintest text on the panel. The names a reader was actually looking at are the ones a PAGE draws, at 5.91:1. **Making the kit's labels lighter would have hidden the faintest text on the page while leaving every bright one exactly where it was.**"
- `LESSONS.md` #107: "**AND THE BLOCK THAT WAS REPORTED WAS NOT THE BLOCK THAT CAUSED IT.** The pads were the visible symptom. The 65 px came from a different section entirely."
- `/fau/`'s deleted affordance: a border removed on suspicion, returned as *"fau on off is missing border"*.
- And the calibration problem, `LESSONS.md:2518`: a photograph captioned *"totlly messed up"* arrived **one minute after the fix for exactly that defect had landed**, with a row pitch off by the 15 px the fix removed. "**A screenshot cannot be attributed to a build. So the number goes first.**"

**The rule that would have prevented all six:** *read the report for its verb and its direction before touching anything, and measure two rectangles before believing any reading of a crop.* If a repeat arrives in plainer words, the previous reading was wrong, not insufficient. And a screenshot has no build stamp, so answer it with the number as it reads now.

---

# THE THREE QUESTIONS

## 1. Which bucket cost the most total corrections?

**By raw correction events, ALIGNMENT (bucket 3), at roughly 45.** `/twelve/` alone contributes twelve screenshot corrections in one evening plus three more about its control rows, and `/circuit/` contributes six across one session.

**By distinct defect shapes that kept recurring across different pages, the winner is A NUMBER TYPED TWICE (bucket 9), at ~16 incidents**, and the repo itself names it: "this project's most repeated defect in its cheapest form". It is also the root cause underneath a large share of bucket 3: `--sld-col`, `--ctl-w`, `--ctl-head/foot` and `--panel-gap` were all created in response to alignment reports.

**If buckets 1 and 2 are merged (and they should be, because they are one question asked from two sides: which element does the air belong to), that pair is the most expensive single family at ~41 events across 23 incidents**, and it carries the worst repeat depth in the corpus: `/tom/` four rounds, `/muta/` three rounds, the feedback panel three reports, the roll four asks, `/fau/` two asks after three insets were zeroed, nameplate padding three pages.

My reading: the honest answer for a new skill is **"air and insets" (1+2) is the family to write the skill around, and alignment is where it gets reported.** Nobody ever reported "the padding is on the wrong element"; they reported "these do not line up", "there is a double border", "it is a mess".

## 2. Visual judgement failures vs CSS cascade failures

Counting the 118 incidents, three categories rather than two, because the third is distinct and is roughly a fifth of the corpus:

| kind | count | what it means | how it was found |
| --- | --- | --- | --- |
| **Visual judgement** | **~62** | the CSS did exactly what it says and the result looked wrong | a screenshot or a crop from the owner, almost always |
| **CSS cascade** | **~34** | the CSS did not do what its author wrote | `getComputedStyle`, and almost never by reading the file |
| **Measurement** | **~22** | the fault was in how the thing was measured or asserted | an assert count moving, or a sabotage |

The measurement category is worth naming for the skill because it is where the previous two hide. Instances: reading `el` (the wrapper) instead of `button` and reporting a button 17 px low while it was exactly right; `offsetTop` instead of rects, **wrong by 579 pixels** because `.pos-tbl-body` is `position: static`; `el.hidden` instead of computed `display`, which passed every run while three headings were on screen; `table.el.querySelector('.pos-tbl-row')` returning the HEADING; `ink()` parsing `#11151d` with `/\d+/g` and therefore **measuring the area of the box**, with three different subjects all reporting exactly `10032`; `/knobs/` comparing a keyboard's box against the `max-content` flow that box sizes, printing `992.0 px wide inside a flow 992.0 px wide`; and a probe that read `documentElement.scrollWidth` on a tabbed page where nine of ten panels were hidden and reported zero overflow.

The asymmetry that matters for the skill: **cascade failures are cheap to find and expensive to leave** (one `getComputedStyle` call ends the argument, but a dead rule reads as correct for weeks, and this repo has six measured). **Visual failures are cheap to leave and expensive to guess at** (they are visible to the owner immediately, but three readings of one crop produced three different culprits). The remedy is different for each and the repo has both: for cascade, read the computed value of the property you set; for visual, print the rect pair of the element and its parent, and the ink inside each.

## 3. Every instance where the fix was a typed pixel number

I found **47**. Verdicts on whether a layout primitive could have removed the number entirely:

**Removable by a primitive (20).**

- `--ctl-head: 15px` and `--ctl-foot: 17px`. **Yes, and this is the biggest one missed.** A single CSS grid over the whole control row with three rows (head / working surface / foot) and `grid-template-rows: subgrid` on each control would align every lane, button and dial with no published numbers at all. The repo reached for tokens plus `flex-end` instead, which works but still requires every component author to opt in, and it still had to add `--ctl-step` as a calc because callers kept counting two of the three contributors.
- `.pos-tbl-row { min-width: 560px }` to `min-width: min-content`. **Yes, and the repo did it.** `shell.css:3268`: "`min-content` is the sum of the tracks, the gaps and the gutters, computed from the very list the caller passed: the same measurement, in one place, in the one language that can see it."
- `minmax(190px, 1fr)` to `minmax(min(100%, 190px), 1fr)`. **Yes, `min()` is the whole fix.**
- Optical centring (`.pos-vp-foot`, `.panel-head`). **Yes, `grid-template-columns: minmax(0,1fr) auto minmax(0,1fr)` removed a centring number entirely** and the repo says a flex row would have missed the ask.
- `.pos-readout` `repeat(auto-fit, minmax(96px,1fr))` to `flex: 1 1 96px`. **Yes for the hole**; the 96 survives as a basis, which is legitimate.
- `.kit-box > :last-child { margin-bottom: 0 }` and `.kit-out { margin-bottom: -14px }`. **Yes.** `.kit-box` is already `display: flex; gap: 10px`. If `.pos-controls` took the parent's `gap` instead of carrying its own `margin-bottom: 14px`, both the fix and the eight-box negative-margin hack disappear. This is the cleanest unremoved primitive in the corpus.
- `.pos-fb-said { min-height: 2.8em }` residue. **Yes, `display: none` on `:empty` plus `gap`** is the pair; `min-height: 0` left the element in the flow collecting a gap, and the repo needed three reports to get there.
- `button[data-glyph] { width: 34px; height: 34px }`. **Yes, `aspect-ratio: 1` removes the width.** The repo explicitly refused a derivation here ("a size computed from four other values looks more rigorous and is one edit from being quietly wrong") and it is right about a four-term calc, but `aspect-ratio` is not a calc and is used elsewhere in the same file.
- `.tbar-scrub { margin: 0 5px }`. **Yes**, `calc(var(--tbar-head-w) / 2)`; today the 10 and the 5 are typed independently.
- `.pos-fdr-cap { border-radius: 3px }`. **Yes**, `calc(var(--r) - 1px)`; the same file already derives the cap's width with `left: 1px; right: 1px`, which is the right instinct applied to one property and not the other.
- `.pos-pad-bot { margin-top: 5px }` summing to `--fdr-foot`'s 17. **Partly yes**: a `min-height` on both foot slots off one token removes the arithmetic.
- `--fdr-lane-w: 34px` (a copy of `.sld-lane`'s height). **Yes**, if the slider's lane size were a `:root` token.
- `--rows-pad: 20px` and `--rows-gap: 16px` (second names for `--panel-pad` and `--panel-gap`). **Yes, by declaring those two at `:root`** instead of on `.panel`. The file states the exact reason it could not read them.
- `--tbl-row-h: calc(9px + 7px + …)`. **Partly yes**: the 9 and 7 are typed both in the padding and in the calc; a `--tbl-pad-y` token closes it.
- `.evo-keys { flex: 0 0 auto; min-height: 0 }`. **Already the primitive**, and applied from an argument (`createPanelLayout({ grow })`) rather than typed on a page, for the stated reason that a required line a caller types is a line no browser check can see when it is missing.
- `.panel-seam { margin-inline: calc(-1 * var(--panel-pad)) }` and `.roll` / `.kbd` bleeds. **Already derived, never typed.**
- `--fdr-knob`, `--fdr-lane-cut`, `--knob-w`, `.pos-pad-small`. **Already calc; each one replaced a typed number that "agreed with nothing".**
- `.pos-tabs` bar top margin. **Margin collapsing is the primitive**, chosen over padding precisely so the number can never add to `--pos-gap`'s 40.
- `outline-offset: -1px`. **A sign, not a number**, and the right answer at any gap.
- `/circuit/ padding: 20px 20px 34px`. **Yes in principle**: the 34 exists because the bottom row of pads has no label under it, which is exactly what a reserved-even-when-empty foot slot (`--ctl-foot`) already solves one component along.

**Not removable, and correctly so (15).** `--pos-gap: 40px` (the site's one rhythm, and `.pos-stack` is already the primitive carrying it). `--ctl-w: 46px` (a finger target; the whole *"awful, bring back that original pad button size square"* lesson is that this number must NOT be a function of layout). `--pad-btn/seg/bar` (a type-scale decision). `--pg-lab: 22px`, `--pg-gap`, `--pg-ruler`. `.pos-pad-face { padding: 0 3px 5px }` (4, then 7 on *"add more bottom padding"*, then 5 on *"to much.."*, and the answer is between them). `.pos-pres { gap: 10px }` up from 6. `.tbar > .pos-pres:first-child { margin-left: 6px }` bringing 9 to 15. `.kbd .keys { margin-bottom: 10px }` up from 4. `.pos-scope { margin: 22px 0 12px }`. `.pos-back` 20 phone / 30 desktop. `.rack-lane { padding: 14px }` against the case's 20. `--roll-row-h: 26px`. `/twelve/`'s doubled `--ctl-gap` above a knob. `/wish/`'s 14-line reserve (**a line count rather than a pixel guess**, measured over what one connection can be: 7 lines with no transform, 12 with one, 16 with two).

**Refused on purpose, and the reasoning is worth keeping (2).** `button[data-glyph]`'s 34, refused as a derivation for the four-term reason above. `/circuit/`'s asymmetric 34 px foot, kept as a page rule with its reason "rather than growing the shared token an asymmetric form, because the reason is instrument specific".

**The pattern across all 47:** every number that survived is a fact about a body (a finger, an eye, a glyph) or about an object's real proportions. Every number that a primitive removed was a number describing a *relationship* between two elements. That is the test worth putting in the new skill: **if the number says how two things relate, a primitive or a token can carry it and the number is a bug waiting; if the number says how big a thing is for a person, type it, measure it, and assert it against ink.**
