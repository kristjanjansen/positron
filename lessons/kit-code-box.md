# Kit lessons: code-box

The longer comments cut from `demo/shell/code-box.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-code-box.md#<anchor>`.

<a id="header"></a>

## `code-box.mjs` module header

```text
demo/shell/code-box.mjs: a box you type a program into, with its syntax
coloured and its knob parameters in their own hues.

🔴 IT WRAPS `createField` AND DOES NOT REPLACE IT. The field builds the
label and the textarea with the code attributes it already sets
(autocorrect, autocapitalize and spellcheck off); this moves that textarea
into a scroller and puts a <pre> of coloured spans behind it. The person
types into the real textarea, so undo, IME, the iPhone keyboard, the loupe,
paste and `demo/verify.mjs`'s `Input.insertText` all reach the element they
always reached. `plans/plan-code-editor.md` is the spec; its section 2a
measured the drawn layer pixel identical to the textarea's own glyphs as
plain text and within 0.11 px per glyph once split into spans.

🔴 EVERY METRIC IS COPIED OFF THE TEXTAREA'S COMPUTED STYLE, at mount, on a
resize, on `document.fonts.ready` and when the field's classes change (the
compile note's host class adds a `padding-bottom`). The textarea is styled
by rules at three weights, and a rule this file never heard of that wins
there wins on the pre by construction. ⚠️ SO THE PRE CARRIES INLINE STYLES,
which this project otherwise refuses from a component: it is a mirror, it is
`aria-hidden`, and nothing may style it except by styling the textarea.

⚠️ THE COMPILE NOTE IS UNCHANGED: `createCompileIdle({ input: box.input,
host: box.el })`. The host is the field label AROUND the scroller, so the
note sits in the box's bottom right corner and does not scroll away.

⚠️ `set()` FIRES NO `input` EVENT, as `field.set()` never did, and repaints
itself. A page that writes `box.input.value` directly has to call
`box.paint()`, which is the one way to get the two layers out of step.
```

<a id="laidout"></a>

## `code-box.mjs` laidOut

```text
⚠️ A BOX WITH NO WIDTH YET IS NOT A NARROW BOX. Built inside a closed tab
panel it measures 0, and writing a 0 px height then would leave a box
with no lines when the panel opens. Nothing is measured until it is laid
out; the ResizeObserver below fires the moment it is.
```
