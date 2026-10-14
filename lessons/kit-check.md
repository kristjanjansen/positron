# Kit lessons: check

The longer comments cut from `demo/shell/check.mjs` and `demo/shell/check-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-check.md#<anchor>`.

<a id="header"></a>

## `check.mjs` module header

```text
demo/shell/check.mjs
Many of a set, and the box that says so.

🔴 THERE WAS NO CHECKBOX IN THIS KIT. Searched 2026-09-22 across
`demo/shell/` and every page: zero. `choice.mjs` is a segmented row where
exactly ONE option is armed, which is a radio, and the two questions are
different questions. *Which one of these* and *which of these* cannot share a
control, and a page that needs the second has until now hand-rolled it or
gone without.

🔴 IT IS A REAL `<input type="checkbox">`, NOT A BUTTON WEARING
`aria-pressed`, AND THE FOUR REASONS ARE WORTH WRITING DOWN BECAUSE THE OTHER
ANSWER IS ALREADY IN THIS KIT AND IS CORRECT WHERE IT IS.
  1. A screen reader announces a checkbox as `checkbox, checked` and a button
     as `button, pressed`. *Pressed* is the wrong verb for *this one is in
     the set*: it says something happened, when what is true is that
     something IS.
  2. The space key toggles a checkbox with no code at all, and a button has
     to implement it. A control whose keyboard behaviour is the page's job is
     a control whose keyboard behaviour will be missing on one page.
  3. There is a third state. `indeterminate` is a real property of a
     checkbox and it is what *some of the ones under this heading* looks
     like; `aria-pressed` can spell it `mixed` and nothing draws it.
  4. It is a form control, so `:checked`, `:disabled` and `required` are the
     browser's job rather than a set of classes this file would have to keep
     in step.
⚠️ `choice.mjs` STAYS BUTTONS, and that is not an inconsistency. A segmented
row is one object with the chosen segment lit, the look is the whole reason
it is segmented, and `aria-pressed` is the right announcement for an option
somebody armed. The two components answer two questions and wear two shapes
on purpose.

🔴 THE INPUT IS REAL AND THE BOX IS DRAWN BESIDE IT, WHICH IS ONE ELEMENT
MORE THAN `appearance: none` WOULD COST. `appearance: none` on a checkbox
leaves a replaced element whose pseudo elements are rendered by some engines
and not by others, so the tick would be the kind of thing that looks right on
this machine and wrong on somebody's phone, with nothing on the page saying
which. A visually hidden input keeps every semantic above and hands the
drawing to an ordinary `<span>`, where `::after` is not in question.
⚠️ HIDDEN, NOT `display: none`. A `display: none` input is not focusable and
not submitted, so the keyboard path would be gone and nothing would say so.
It is clipped to a pixel and stays in the tab order, which is the standard
arrangement and is asserted on `/kit/`.

⚠️ THE WHOLE THING IS A `<label>`, so the word is part of the target. A 16 px
box is under the 24 px anybody recommends for a finger, and the label is what
makes the real target the height of a row rather than the size of the box.

STYLING lives in `shell.css` beside `.pos-choice`, because a checkbox is a
control and every control in this project is declared there. A component that
only looks right next to one page's stylesheet is the `choice.mjs` bug, which
shipped emitting two class names no stylesheet matched.
```

<a id="createcheck"></a>

## `check.mjs` createCheck

```text
One box and its word.

@param {object} o
@param {string} o.label      the word beside the box
@param {boolean} [o.checked]
@param {boolean} [o.mixed]   the third state, for a heading over a set where
  some but not all are on. ⚠️ IT IS A PICTURE, NOT A VALUE: `get()` still
  answers true or false, because `indeterminate` is what the box LOOKS like
  and the checkbox underneath is still one of the two. Toggling clears it.
@param {boolean} [o.disabled]
@param {string} [o.title]    the browser's own tooltip
@param {(on:boolean)=>void} [o.onChange]
@returns {{el:HTMLElement, input:HTMLInputElement, get:()=>boolean,
  set:(on:boolean, quiet?:boolean)=>void, mixed:(v:boolean)=>void,
  disabled:(v:boolean)=>void}}
```

<a id="createcheckgroup"></a>

## `check.mjs` createCheckGroup

```text
Several boxes under one name, across or down.

🔴 `role="group"` AND `aria-labelledby`, NOT A BARE ROW OF BOXES. A set of
checkboxes with a heading beside it is a heading only to somebody who can see
where it is; to a screen reader the boxes are five loose controls and the
word is a stray label. The group is what carries *these five belong to
`sends`*, and it costs one attribute.
⚠️ NOT A `<fieldset>`. That is the other correct answer and it brings a
`<legend>` whose box model is its own long story on every engine, for a
grouping this already has.

@param {object} o
@param {string} o.label
@param {Array<[string, any]>} o.options   [visible name, value]
@param {any[]} [o.value]                  the values that start on
@param {'row'|'column'} [o.orient]        across or down, default across
@param {(values:any[], last:{value:any, on:boolean})=>void} [o.onChange]
@param {(value:any, name:string, i:number)=>string} [o.title]  a tooltip per
  option, keyed on the option's own VALUE rather than on its position. A list
  keyed by position is a second table that agrees with the first until
  somebody reorders one of them.
@returns {{el:HTMLElement, get:()=>any[], set:(values:any[], quiet?:boolean)=>void,
  has:(v:any)=>boolean, boxes:object[], inputs:HTMLInputElement[],
  disabled:(v:boolean)=>void}}
```

<a id="values"></a>

## `check.mjs` values

```text
⚠️ IN THE ORDER THE OPTIONS WERE DECLARED, never in the order they were
pressed. A page that logs what is on wants a line it can compare against
the last one, and a set iterated in insertion order gives a different
string for the same state depending on how somebody got there.
⚠️ AND DECLARED ABOVE THE BOXES THAT CALL IT. A `const` shadows its whole
block from the top, and this project has already lost seven asserts to a
name read in its dead zone.
```

<a id="test-header"></a>

## `check-test.mjs` check-test module header

```text
demo/shell/check-test.mjs
What the checkbox IS, read off its own source, with no browser.

  node demo/shell/check-test.mjs

🔴 THIS COMPONENT HAS ALMOST NO ARITHMETIC, AND THAT IS WHY THE CHECKS ARE
THE SHAPE THEY ARE. A slider has positions and a filter has a curve; a
checkbox has a semantic. Everything worth grading about it is a statement
about what element it uses and what that element is announced as, which is a
claim about the SOURCE, and the rest is a claim about pixels and belongs on
`/kit/` where there is a document.

⚠️ WHAT IS NOT GRADED HERE. Nothing below opens a document and neither
constructor is called. `/kit/` asserts all of this against the real thing:
  - that the input is still in the tab order after being clipped
  - that the space key toggles it, which is the browser's job and is the
    whole reason it is a real input
  - that the drawn box follows `:checked` and `:indeterminate`
  - that a row wraps and a column stacks
  - that the group is announced by its own name

🔴 AND ONE OF THESE IS A CHECK ABOUT ANOTHER FILE, DELIBERATELY. The
stylesheet and the module are two halves of one control, and this project has
shipped a component emitting class names NO stylesheet matched, twice, which
is a bug that only ever happens to a control nobody else uses. Reading
`shell.css` for the classes this file emits is one command and would have
caught both.
```

<a id="code"></a>

## `check-test.mjs` code

```text
The module with its prose taken out.

⚠️ IT EXISTS BECAUSE THE FIRST VERSION OF THE CHECK BELOW WENT RED ON THIS
FILE'S OWN HEADER. `check.mjs` explains at length why it is not a button
wearing `aria-pressed`, so a search for that string over the whole file finds
the explanation and calls it the defect. A guard on a substring is this
project's named hazard and this is it in its cheapest form.
```

<a id="test-aria-pressed"></a>

## `check-test.mjs` test: not aria-pressed

```text
🔴 THE OTHER ANSWER IS ALREADY IN THIS KIT AND IS CORRECT WHERE IT IS.
   `choice.mjs` is buttons wearing `aria-pressed`, because a segmented row is
   one object with the armed segment lit. A checkbox announced as `button,
   pressed` says something HAPPENED where what is true is that something IS, so
   the two components wear two shapes on purpose and neither may drift into the
   other.
```

<a id="test-clipped"></a>

## `check-test.mjs` test: clipped input

```text
🔴 CLIPPED, NEVER `display: none`. A `display: none` input is not focusable,
   so the keyboard path would be gone and nothing on the page would say so. The
   claim is about the stylesheet rather than the module, which is why it is read
   from there.
```

<a id="test-classes"></a>

## `check-test.mjs` test: every class styled

```text
── every class this module emits is styled ────────────────────────────────

🔴 THE CHECK THAT WOULD HAVE CAUGHT `choice.mjs` AND THE SLIDER GROUP, BOTH
OF WHICH SHIPPED EMITTING CLASS NAMES NO STYLESHEET MATCHED. One of them drew
three loose default buttons under a heading; the other fell into block layout
with four lanes starting at four different x positions. Both read as
unfinished components and both were one grep from being caught.
```

<a id="test-vertical"></a>

## `check-test.mjs` test: vertical radio

```text
── the vertical radio, which is the other half of the same request ────────

⚠️ IT LIVES IN `choice.mjs` AND ITS RULES LIVE IN `shell.css`, so this is the
same stylesheet check one component over. The module half is graded by the
page, which is where a press can happen.
```

<a id="test-join"></a>

## `check-test.mjs` test: join and corners

```text
🔴 THE JOIN AND THE CORNERS BOTH HAVE TO TURN. `.pos-seg` overlaps its
   children on the LEFT and rounds the first child's left corners; stacked,
   that leaves a doubled border on every join and two stray curves in the
   middle of the column. Turning one without the other is the half fix that
   looks finished.
```
