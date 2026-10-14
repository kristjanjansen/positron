# Kit lessons: picker.mjs

The long comments cut from `demo/shell/picker.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-picker.md#<anchor>`.

<a id="header"></a>

## picker.mjs, file header

demo/shell/picker.mjs — step through a list, or jump straight to one by name.

‹ | Brass 1 | ›    ⚅

🔴 WHY THIS EXISTS AND `stepper.mjs` WAS NOT ENOUGH. A stepper over a list of
three is fine. Over `/keys/`'s patch library it is not: Yoshimi alone reaches
878 instruments, and "press › eight hundred times" is not a way to choose
anything. The name in the middle was already being drawn beside the stepper
as dead text — it had the list's most useful property, which is that you can
READ where you are, and none of its most useful behaviour, which is that you
can GO somewhere.

⚠️ THE DROPDOWN IS A REAL `<select>`, AND IT IS INVISIBLE UNTIL PRESSED.
A native select carries the platform's own chrome — a bevel on macOS, a full
sheet on iOS, a hard-coded font — none of which belongs in a row of mono
buttons. So the select is laid over the name cell at `opacity: 0` and the
cell underneath is drawn by us. Pressing anywhere on it opens the platform's
own list, which is the one part of a dropdown nobody should reimplement:
it scrolls, it type-aheads, it keyboards, and on a phone it is a proper
sheet. We draw the closed state; the platform draws the open one.

⚠️ FIXED WIDTH, BECAUSE A CONTROL THAT RESIZES IS A CONTROL THAT MOVES.
Patch names here run from `Dig Rhodes` to `Vibraphone Soft 2`, and a cell
that fits its text makes the two arrows and the die jump sideways every time
you step, so the thing you are about to press again is not where it was.
`--pick-w` is the room RESERVED FOR THE NAME, and `shell.css` adds the cell's
own padding and edges on top of it before setting a width. It said "the cell
is `--pick-w` wide" until 2026-09-20, and that was the bug: the box was that
wide, so the padding came out of the name's share and a 9 ch reservation
showed six characters. Long names still ellipsize, past the cap below.

⚠️ THE DIE IS OUTSIDE THE GROUP. `stepper.mjs` argues the opposite for its
own `random`, and that argument still holds THERE: back/roll/forward are one
axis and the roll is a jump along it. Here the middle slot is the readout, so
a die wedged between the name and `›` would split the one thing you read. It
sits after the group with a gap, which also says what it is — not another
step, a different kind of move.

🔴 THE DIE IS DRAWN, NOT TYPED. `⚅` (U+2685) was the obvious answer to
`stepper.mjs`'s ban on 🎲 — an ordinary glyph that takes the row's font,
colour and baseline instead of being a colour picture at a size of its own.
It rendered as TOFU: a last-resort box with the hex digits in it, because
U+2685 is not in the mono face and was in no fallback the browser had.
Photographed at 4x before it shipped.

A font stack would only move the question to "which machine is this", which
is the same class of bug as the emoji. Six pips of SVG take `currentColor`,
are square by construction and look identical everywhere — so the glyph
stops being something the platform gets a vote on.

<a id="create-value-cell"></a>

## picker.mjs, createPicker params and createValueCell

@param {object} o
@param {string} [o.label]     shown before the group, uppercased by CSS
@param {string} [o.what]      what is being stepped, for the button titles
@param {() => void} o.prev
@param {() => void} o.next
@param {() => void} [o.random]        omit it and there is no die
@param {(i:number)=>void} [o.onPick]  chosen from the dropdown, by index
@param {string} [o.cls]
@returns {{el:HTMLElement, buttons:HTMLButtonElement[], select:HTMLSelectElement,
          show:(name:string, i?:number)=>void,
          options:(names:string[], at?:number)=>void,
          disabled:(v:boolean)=>void}}
🔴 THE MIDDLE OF A SEGMENTED ROW, AS A THING YOU CAN CHOOSE FROM. Extracted
2026-09-17 so `stepper.mjs` can have one too, asked for as *"stepper: want
middle pne selectable like synth patches"*. It was written here first, for
the patch row, and a second copy in the stepper is exactly the drift `/kit/`
exists to catch: this project already has three hand-built segmented rows in
its history and one of them is why `createChoice` exists.

OUR PAINT, THE PLATFORM'S LIST. The visible half is a span we draw, so it
takes the row's font and its ellipsis; the working half is a real `<select>`
laid over it, so the list is the one the operating system already knows how
to show, including on a phone where a hand-built menu is a small disaster.

<a id="width-from-widest"></a>

## picker.mjs, createValueCell, width from the widest name

🔴 THE WIDTH COMES FROM THE WIDEST NAME IN THE LIST, NOT FROM A CONSTANT.
Asked 2026-09-17 with a picture of `‹ kaleidoscope ›`: *"w should be set on
widest member ("..." too wide ones)"*.

The fixed width was already right about the thing that matters, and the
comment in shell.css says it: a cell that sizes to its CURRENT text moves
the arrows every time you step, so the control you are about to press again
is not where it was. What was wrong was the number. 13 ch and 22 ch were
guesses at a phone and a desktop, so a list of short names sat in a box half
empty and a list of long ones ellipsised inside a row with room to spare.
Reserving the widest MEMBER keeps the no-movement guarantee and spends
exactly the room the list needs.

⚠️ IT SETS THE CUSTOM PROPERTY, NOT `width`. The phone rule sets
`width: auto` on this cell, and an inline `width` would beat it and drag the
row off a small screen. Setting `--pick-w` lets the base rule use it and
lets the phone rule still win.
⚠️ AND THE NUMBER IS CHARACTERS OF NAME, NOT PIXELS OF CONTROL. What the
cell does with it, including how much padding goes round it, is
`shell.css`'s to decide and is deliberately not known here: a padding
written in both files is a padding that will disagree with itself, which is
what `--sld-col` was created to stop.
⚠️ AND IT IS CAPPED, which is what the ellipsis is for. A 60 character name
would make a control nothing else on the page could sit beside, so past the
cap the name is cut and the whole of it stays in the title.

<a id="options-draws-name"></a>

## picker.mjs, createValueCell, options draws the name

🔴 AND IT DRAWS THE NAME IT JUST SELECTED. IT DID NOT, AND THE CONTROL
READ `—` FOREVER. PHOTOGRAPHED on `/mirror/`: a LOOK picker with ten
shaders in it, a shader running, and a long em dash where the name goes.
The list was handed over correctly, `selectedIndex` was set correctly, and
the VISIBLE half was never told, so the cell kept the placeholder it is
built with until somebody pressed an arrow.
⚠️ IT IS NOT THE CALLER'S JOB TO CALL `show()` AFTERWARDS. Two pages did
and one did not, which is the definition of a thing that belongs in the
component.

<a id="centre-arrows"></a>

## picker.mjs, createPicker, centring the arrows

⚠️ THE SAME CENTRING THE SHELL'S GLYPH CONTROLS GET. `‹` and `›` sit above
the baseline and narrower than their own advance, so a grid that centres
the BOX leaves them high and off to one side — the same defect as ⛶, in a
control nobody had looked at closely. The die beside them is an `<svg>` and
needs no measuring, which is why `symbol.mjs` takes either kind.
