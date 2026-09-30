# plan: a small code editor for the synth pages

Asked 2026-09-30: *"in bg: invertigate minimal visual code editor with basic
syntac hilite for our synths. they are rare languages so perhaps we need use
some other templte"*. Two follow ups the same afternoon: *"a hand-rolled
overlay - maybe not that bad idea"*, and *"coloring slider code snippets would
be nice, perhaps each on its own hue"*.

Research only. Nothing in `demo/` was changed. The prototype lives in the
session scratchpad and is described in section 5 so it can be rebuilt.

Every claim carries one of three marks. **MEASURED** means a command ran today
and printed the number. **READ** means it was read out of a package, a
repository or its documentation, and nothing was run. **INFERRED** means it is
reasoning from the first two.

## Verdict

**Build the overlay (option a), as one kit piece, `demo/shell/code-box.mjs`,
with one tokenizer engine and a small rule table per language.** No third
party code is needed, nothing is vendored, and the three textareas keep every
native behaviour they have today (undo, IME, the iPhone keyboard, the loupe,
selection handles), because a person is still typing into a real textarea.

The reasons, in order of weight:

1. **None of the three languages is covered by any library we would vendor.**
   MEASURED: `@codemirror/legacy-modes` has no Faust, SuperCollider or Csound
   mode; highlight.js core has none of the three; Prism core has SuperCollider
   only. So every option needs a hand-written grammar for at least two of the
   three languages anyway, and the grammar is most of the work.
2. **The overlay lines up exactly.** MEASURED on real `/fau/`, `/collide/` and
   `/und/` text at 1280 px and at 375 px on a mobile emulated phone, as loaded,
   scrolled to the end, after a long unbreakable line was typed, and after
   typing mid-text plus Enter: the textarea's own glyphs and the drawn layer's
   glyphs are **pixel identical** in every case when the drawn layer is plain
   text, and at most **0.11 px** apart per character once it is split into
   coloured spans. Section 2a has the numbers.
3. **It is small.** The prototype is 63 lines of engine, 32 lines of Faust
   rules, 52 of SuperCollider, 13 of Csound score, and 68 of box. A repaint of
   a 1 KB program takes 0.2 to 0.3 ms. CodeMirror 6, the credible library, is
   about **122 KB gzipped** before a single language (MEASURED).
4. **The parameter hues fall out of it for free.** A parameter is one more span
   with a `data-param` and a `--p-hue`, and the knob under the code reads the
   same hue from the same map (section 6).

The fallback, if the overlay hits something it cannot fix on a real iPhone,
is `prism-code-editor` (option d): the same overlay idea, done by somebody
else, MIT, about 5 KB gzipped, loadable as plain relative ES modules. Its cost
is that it replaces native undo with its own (READ).

## 1. What exists per language

| language | what exists | engine | licence | mark |
| --- | --- | --- | --- | --- |
| Faust | Grame's own Faust IDE editor, `src/monaco-faust/FaustLang.ts` in `grame-cncm/faustide` | Monaco Monarch tokenizer, 237 lines, library names read at run time from the compiler's `stdfaust.lib` | LGPL-2.1 (the repository's `package.json`) | READ |
| Faust | Grame's `@grame/faust-web-component` 0.9.0, `src/editor.ts` | **CodeMirror 6 `StreamLanguage` over the legacy `clike` mode**, with two word lists: 10 keywords and 38 primitives | LGPL-3.0 | READ |
| Faust | `hellbent/vscode-faust` (and its copy `grame-cncm/vscode-faust`), `syntaxes/faust.tmLanguage.json`, 2,963 bytes | TextMate | MIT (hellbent), none stated on the Grame copy | READ |
| Faust | `tree-sitter-faust` 1.1.5 | tree-sitter, needs a wasm runtime in a browser | MIT | READ |
| Faust | Prism, highlight.js, CodeMirror legacy modes | nothing | | MEASURED |
| SuperCollider | Prism core component `prism-supercollider`, 854 bytes minified, 532 gzipped | Prism | MIT | MEASURED |
| SuperCollider | `highlightjs-supercollider` 1.0.0 (listed by highlight.js as the third party grammar), 2,634 bytes, 1,164 gzipped; also `highlightjs-sclang` 0.2.0 | highlight.js | MIT | MEASURED size, READ licence |
| SuperCollider | `scztt/vscode-supercollider`, `syntaxes/supercollider.tmLanguage.json`, 3,503 bytes | TextMate | MIT | READ |
| SuperCollider | `tree-sitter-supercollider` 0.2.2 | tree-sitter | ISC | READ |
| SuperCollider | `prism-code-editor` ships `languages/supercollider.js` | Prism grammar | MIT | MEASURED |
| SuperCollider | CodeMirror legacy modes | nothing (there is a `smalltalk` mode, 1.2 KB gzipped) | | MEASURED |
| Csound | `csound/csound-vscode-plugin`, `csound-sco.tmLanguage.json` 4,556 bytes, `csound-orc` 26,694 | TextMate | MIT | READ |
| Csound | `@kunstmusik/codemirror-lang-csound` 1.0.3, CSD, ORC and SCO | CodeMirror 6 Lezer grammar plus opcode docs, 7.7 MB unpacked | MIT | READ |
| Csound | `@hlolli/codemirror-lang-csound` 1.0.0-alpha11 | CodeMirror 6 Lezer | LGPL-2.0 | READ |
| Csound | Ace `mode-csound_score` 1.9 KB gzipped, `mode-csound_orchestra` 11.8 KB | Ace | BSD-3-Clause | MEASURED |
| Csound | Prism, highlight.js, CodeMirror legacy modes | nothing | | MEASURED |

Two facts in that table decide the question the ask raised, *"perhaps we need
use some other template"*:

- **Grame itself answered it for Faust.** Their web component highlights Faust
  as C with a Faust word list (READ, quoted above). Faust is a functional
  language, but what a reader needs coloured in it is C-shaped: `//` and `/* */`
  comments, double quoted strings, numbers, identifiers. The part that is not
  C, the block diagram operators `<:` `:>` `:` `~` `,`, is five tokens.
- **Prism's SuperCollider grammar is 854 bytes and is already the template.**
  sclang is Smalltalk semantics in C clothing, and the grammar reads that way:
  C comments, strings, `\symbol` and `'symbol'`, `$c` characters, capitalised
  class names, `key:` labels, numbers with `pi` and radix forms.

So "another template" is: **C-like comments, strings and numbers as the base,
plus a handful of language specific rules**, which is small enough to write
into our own rule tables rather than to import. The TextMate grammars are the
references to read while writing them, not files to convert: a TextMate grammar
needs Oniguruma regexes and a scope engine to run, which is the whole of
`vscode-textmate`.

**Csound needs a note of its own.** `/und/` holds a Csound SCORE (`.sco`), not
an orchestra: `t`, `m`, `i`, `n` statements in column one, then p-fields, with
`+` `.` `^` `<` `>` carry and ramp symbols (READ from `demo/und/index.html` and
the VS Code grammar). That is the simplest of the three by far, 13 lines in the
prototype. Orchestra highlighting (opcodes, `a` `k` `i` rate prefixes) is only
needed if a page ever shows an orchestra, and none does.

## 2. The editor options, priced

All sizes MEASURED today by fetching the files from jsDelivr (`+esm` or
`.min.js`, which jsDelivr minifies) or from the npm tarball, and running
`gzip -9`. Not bundled or tree shaken, so a real build would be somewhat
smaller for the libraries and exactly this for the hand-rolled code.

| option | gzipped | loads as plain ES modules, no build | covers our languages | keeps native textarea editing |
| --- | --- | --- | --- | --- |
| a. hand-rolled overlay | about 2 KB estimated from 228 source lines, nothing vendored | yes | we write all three | **yes** |
| b. CodeMirror 6 minimum | **121.9 KB** (state 15.9, view 64.1, language 14.1, commands 10.0, lezer common 9.9, lezer highlight 3.3, and four small ones 4.6) plus a mode: `clike` 8.2 or `simple-mode` 1.4 | **no**, bare specifiers need an import map or a one-off bundle | none of the three | no, it is `contenteditable` |
| c. Prism driving (a) | core 3.2, SC grammar 0.5 | no, Prism core is a global script | SC only | yes |
| c. highlight.js driving (a) | core 8.6, SC plugin 1.2 | yes (`lib/core.js` has an ESM build) | SC only | yes |
| d. `prism-code-editor` 5.4.0 | core about 3.9 (two core chunks 2.1 and 1.4, index 0.4), SC 1.2, layout CSS 0.8 | **yes**, every import is relative (MEASURED) | SC only | no, its own undo (READ) |
| d. `codejar` 4.3.0 | 4.0 | yes | none (bring a highlighter) | no, `contenteditable` |
| d. `@speed-highlight/core` 2.1.0 | 1.5 | yes | none | highlighter only, CC0 |
| d. Ace 1.44.0 | 126.1 core, Csound score mode 1.9 | no, classic script | Csound only | no |
| d. Monaco 0.57.0 | 101 MB unpacked on npm | no | Faust via Grame's Monarch | no |

### 2a. The hand-rolled overlay, measured

**Shape.** The kit field's own textarea, with `color: transparent`,
`-webkit-text-fill-color: transparent` and `caret-color: var(--fg)`, sits on top
of a `<pre aria-hidden="true">` of coloured spans. The person types into the
textarea; after every `input` event the pre is rebuilt from the textarea's
value. The textarea is what a screen reader, a keyboard, a paste and an iPhone
see.

**Two ways to scroll it were built and measured.**

- `sync`: the textarea scrolls as it does today, and the pre is moved to match
  on every `scroll` event.
- `grow`: neither layer scrolls. The textarea is set to its own `scrollHeight`
  on every input, the pre is the same height, and one wrapper `div` with
  `overflow: auto` and a `max-height` of `rows` lines scrolls both. There is
  nothing to keep in step.

**How alignment was measured.** Headless Chrome over CDP, the real `shell.css`
and the real `createField({ rows, code: true })`. Two screenshots of the same
box: one with only the pre's ink drawn, one with only the textarea's ink drawn,
both in plain white on the same ground, then a per pixel difference inside the
page. Identical pictures mean identical glyph positions. Widths: 1280 px at
device pixel ratio 1, and 375 px at ratio 3 with `mobile: true` through
`Emulation.setDeviceMetricsOverride`, which is what `demo/shot.mjs` uses. Text:
`/fau/`'s first preset (19 lines), `/collide/`'s `pad` preset from
`demo/collide/presets.mjs` (14 lines), `/und/`'s default score (13 lines).
Four states each: as loaded; scrolled to the end; after typing, with real CDP
`Input.insertText`, a line holding a 160 character run with no break
opportunity; after typing `abc ` a third of the way in and a real Enter key.

Results, MEASURED:

| layer drawn as | mode | width | differing pixels, 12 cases per row |
| --- | --- | --- | --- |
| plain text | grow | 1280 | **0 in all 12** |
| plain text | grow | 375 | **0 in all 12** |
| plain text | sync | 1280 | **0 in all 12** |
| plain text | sync | 375 | 0 in 10, and 579 and 92 px in two `/collide/` cases, all on 2 pixel rows at the bottom edge |
| coloured spans | grow | both | 558 to 4,935 px, scattered single glyphs |

The last row looked like a failure and is not one. The differing pixels are
single glyphs here and there, not lines or columns, and a second measurement
says why: for every character, the rectangle `Range.getClientRects()` reports in
the coloured pre against the same text laid out plain, the largest horizontal
difference is **0.11 px** on `/fau/` and 0.06 to 0.09 px on the others, and
the largest vertical difference is **0**. Splitting a line into spans restarts
the text run at each span, and the glyph after the cut is placed a fraction of a
pixel differently, which changes its antialiasing and nothing else. A tenth of
a CSS pixel is below anything an eye can see, and the caret is drawn by the
textarea, where it always was.

The `sync` edge case is real: the textarea clips its text at its own padding
box and the pre at its border box, so a line half out of view at the bottom is
cut at two different places. That is one of three reasons to prefer `grow`.

**Caret following, MEASURED in `grow` mode.** With the wrapper parked at the
top and the caret at the end of a program longer than the box, one typed
character scrolled the wrapper to 353 of 362 px (1280) and 716 of 725 px (375):
Chrome scrolls an ancestor scroller to keep the caret visible without being
asked. The last 9 px not scrolled is the note's reserve under the last line.
Safari was not measured (section 7).

**Cost, MEASURED.** Tokenize and render of 700 to 1,100 characters: 0.1 to
0.3 ms per keystroke in headless Chrome on this desk. The whole pre is rebuilt
on every input; incremental repaint is not needed at this size.

**The failure modes met while building it, and the fix for each.**

1. **The two layers must share every metric.** `/typist/` says so in capitals
   and set its metrics once on a class both layers wear. That is weaker than it
   looks here, because the kit field's textarea is styled by `shell.css`
   rules at three specificities (`.pos-field textarea`, `.pos-field.tall
   textarea`, `.pos-field.tall.code textarea`) and `positron-ui` already records
   a shorthand at `(0,2,1)` beating a page's longhand. **Fix: copy the
   textarea's COMPUTED style onto the pre in JavaScript**, 33 properties (font
   family, size, weight, style, stretch, ligatures, kerning, feature and
   variation settings, line height, letter and word spacing, tab size, text
   indent and transform, white space, overflow wrap, word break, hyphens, box
   sizing, four paddings, four border widths and styles, text rendering, font
   smoothing), at mount, on `ResizeObserver`, and on `document.fonts.ready`.
   Whatever rule wins on the textarea wins on the pre by construction.
2. **A trailing newline.** A textarea ending in `\n` shows an empty last line; a
   pre drops it, so the heights disagree by a line. Fix: append one space to
   the pre when the value ends in a newline or is empty.
3. **Spans that change a glyph's width.** Bold or italic in a token style can
   change the advance in a fallback face and shift everything after it. Fix:
   token styles set `color` and `background` only, never weight or style.
   Measured result of doing so: 0.11 px, above.
4. **A scrollbar that narrows one layer.** A classic scrollbar inside the
   textarea narrows its content box and the text wraps earlier than in the
   pre. `sync` has to size the pre from `textarea.clientWidth` on every
   resize. `grow` has no such case: the scrollbar belongs to the wrapper and
   both layers sit inside it at the same width.
5. **Edge clipping in `sync`.** Measured above. `grow` has no edge.
6. **A frame of lag in `sync`.** A `scroll` event is delivered after the
   compositor has already moved the textarea, so during a fling the pre
   follows a frame late. INFERRED, not measured, and irrelevant in `grow`.
7. **The box's border scrolls away in `grow`.** SEEN in the prototype
   screenshot at 375 px: the textarea's border and rounded bottom were inside
   the scroller, so a scrolled box had no bottom edge. Fix: the wrapper carries
   the border, the radius, the ground and the focus colour
   (`.pos-code:focus-within { border-color: var(--hi) }`), and the textarea is
   borderless. This is the same rule `positron-ui` states for the wave view: the
   border goes on the wrapper, not on the thing inside.
8. **The compile note must not scroll.** `compile-idle.mjs` makes its host
   `position: relative` and puts the note in its corner. If the host were the
   scroller, the note would scroll away with the text. Fix: the host is the
   non-scrolling field label around the scroller, exactly as today, and the
   textarea keeps the `padding-bottom` reserve that `.pos-cnote-host textarea`
   already gives it, which the pre copies through fix 1.
9. **The note's ground.** `.pos-cnote` paints `var(--well, var(--bg))`. The
   wrapper paints the same token, so nothing changes for `/fau/` and
   `/collide/`. `/und/` sets `--well: #0d1117` on its own host today and would
   keep doing so.
10. **Selection.** With transparent text, the selection highlight is all a
    reader sees of a selection. Fix: `::selection { background:
    color-mix(in oklab, var(--hi) 28%, transparent) }`, the `/typist/` value.
    Chrome renders it; iOS draws its own handles over a textarea whatever the
    text colour (INFERRED).
11. **The drawn layer eating presses.** Fix: `pointer-events: none` on the pre,
    and the textarea is above it in the stacking order.
12. **Fonts.** A web font arriving after the first paint changes every
    advance; `symbol.mjs` and `/radio1965/` already re-measure on
    `document.fonts.ready`. The site's `--mono` is a system stack
    (`ui-monospace, SFMono-Regular, Menlo, monospace`) so there is usually
    nothing to wait for, and fix 1 re-copies on it anyway.
13. **An unclosed comment or string while typing.** `/*` with no `*/` paints
    everything after it as a comment until the `*/` is typed. That is what every
    editor does and it is correct: the compiler would read it the same way.
    The rules allow an unterminated match to run to the end rather than fall
    back to plain text.
14. **The `input` event is the only trigger.** A page writing the box with
    `field.set()` (a preset) fires no event; the kit piece's own `set()`
    repaints. The prototype calls `paint()` from `set()`.
15. **Wrapped lines lose their indent.** A wrapped continuation starts at
    column 0 in the textarea today and in the overlay the same way, since both
    wrap identically. Unchanged, and noted only so nobody files it against the
    overlay.

**What it keeps for free**, and none of the libraries in the table keeps all
of it: native undo and redo including shake to undo on iOS, IME composition,
autocorrect and autocapitalise off through the field's existing attributes, the
loupe and selection handles (`field.mjs` deliberately leaves those on), paste,
drag and drop, `Tab` behaving as the page's own focus order expects, the field's
`aria-label`, and every existing harness path, because `demo/verify.mjs` types
into a real textarea with `Input.insertText` and finds it by the same element.

### 2b. CodeMirror 6

- Size: 121.9 KB gzipped for the minimum editable set with history and a
  keymap, MEASURED as the sum of ten packages; plus 8.2 KB for `clike` or
  1.4 KB for `simple-mode` as the language template.
- No build: CodeMirror's packages import each other by bare specifier
  (`@codemirror/state`), so vendoring them as files needs an import map in
  every page that uses them, or a one-off bundle made with a bundler and
  committed, which is a build step in all but name.
- **A trap MEASURED today:** jsDelivr's `+esm` builds resolve each package's
  dependencies separately. `@codemirror/view@6.43.13` imports `state@6.7.5`
  while `state` is at 6.7.6, `language` imports `state@6.7.0`, and `commands`
  imports `state@6.7.4`. CodeMirror refuses to run with two copies of
  `@codemirror/state` loaded, so loading it straight from a CDN is not an
  option either.
- Mobile: CodeMirror 6 edits through `contenteditable` with its own input
  handling (READ). It is good, and it is also a second implementation of
  everything the textarea already does, on the one platform this project
  cannot test in its harness.
- It would still be the answer if the pages grew into an IDE (completion,
  diagnostics under the error, bracket matching, folding). Nothing asked for
  that.

### 2c. Prism or highlight.js as the tokenizer under (a)

Both would save writing the SuperCollider rules and nothing else, since neither
has Faust or Csound. Prism core is a global script (`Prism.languages`), not a
module. highlight.js has an ESM core at 8.6 KB, more than the whole hand-rolled
engine and three tables together. Neither exposes a parameter finder, which the
hue feature needs, so a second pass over the text is needed either way.
Refused: it adds a vendored dependency with a licence file to cover one of
three languages, and the SC rules are 20 lines.

### 2d. The others

- **`prism-code-editor`** is the one worth remembering. It is the overlay
  pattern done as a library, MIT, with relative imports throughout (MEASURED),
  line numbers, optional wrap, and a SuperCollider grammar. It is the fallback
  if (a) meets an iPhone problem it cannot fix. Its costs: its own undo stack
  (READ, *"Custom undo/redo behavior"*), grammars in Prism's format, and styles
  it expects to own.
- **`codejar`** and anything else on `contenteditable`: 4 KB, but gives up the
  textarea, which is the reason to overlay at all. Refused.
- **`@speed-highlight/core`**: 1.5 KB, CC0, a highlighter with no languages we
  need. Nothing to gain over our own engine.
- **Ace**: 126 KB, classic scripts, Csound only. Refused on size.
- **Monaco**: 101 MB unpacked on npm, and it is what the Faust IDE runs on.
  Refused on size; its Monarch Faust tokenizer (READ in full) is the best word
  list for Faust and is where the kit's Faust table borrows its keyword and
  primitive lists from. The list is facts about a language, the licence is
  LGPL-2.1, and the table here is written fresh in our own rule format.

## 3. How much highlighting each language needs

"Basic" means: comments, strings, numbers, a short keyword list, and the one or
two things that make each language readable. The prototype's tables, which are
the proposal:

**Faust**, 32 lines with its parameter finder:
comments `//` and `/* */`; strings; **library prefixes** `os.` `en.` `fi.` `de.`
`no.` `pm.` and any two or three lowercase letters followed by `.` and a name,
drawn in `--dim` so `osc` stands out rather than `os`; keywords (`import`,
`process`, `effect`, `with`, `letrec`, `declare`, `component`, `library`,
`environment`, `seq`, `par`, `sum`, `prod`, `inputs`, `outputs`); primitives
(`hslider`, `vslider`, `nentry`, `button`, `checkbox`, the groups, `mem`,
`prefix`, `rdtable`, `select2`, the math functions); numbers including `.5`;
the composition operators `<:` `:>` `:` `~`.
**One correction from looking at it:** the prototype also coloured `,` as a
composition operator, which is correct Faust (it is parallel composition) and
wrong to the eye, because every comma inside an `hslider(...)` argument list lit
up. The build leaves `,` plain.

**SuperCollider**, 52 lines with its parameter finder (the rules themselves are
12): comments; strings; symbols `\name` and `'name'`; characters `$a`; keywords
(`arg`, `var`, `classvar`, `const`, `this`, `nil`, `true`, `false`, `inf`, `pi`);
**class names**, any capitalised identifier, which is how every UGen
(`SinOsc`, `EnvGen`, `LPF`) is found without a list; `key:` labels such as
`doneAction:`; numbers with `pi`; `~environment` variables; and the rate
methods `.ar` `.kr` `.ir` `.tr` coloured apart, because the rate is what
`sclang-lite.mjs` most often refuses. `demo/shell/sclang-lite.mjs`'s own
`lex()` was checked as a possible reuse and **is not one**: it throws on
anything outside the subset and drops comments, and a highlighter has to
survive every half-typed state and show comments.
Not handled: nested `/* /* */ */`, which sclang allows. The rule stops at the
first `*/`. None of our presets nest.

**Csound score**, 13 lines: comments `;` `//` `/* */`; strings; the statement
letter at the start of a line (`t` `m` `n` `i` `f` `e` `s` `r` and the rest);
the label after `m` and `n`; carry and ramp symbols `+` `.` `^` `<` `>` `!` and
`np`/`pp` references, coloured like operators so a reader can see which
p-fields are carried; numbers.

**One engine.** Every table is an ordered list of `[RegExp, type]`. The engine
compiles each regex once to a sticky (`y`) copy, tries them in order at each
position, emits the first non-empty match as a token, and otherwise advances
one character of plain text. That is what Prism, Monarch and CodeMirror's
`simple-mode` all do in some form, and it is enough for three languages with no
nesting that matters. A language may also carry a `params(src)` function
(section 6). The engine never throws: an unmatched character is plain text.

Token colours, MEASURED as contrast against `--bg` `#0b0e14`: comment
`--dim2` 3.98:1 (the same ink comments already get in the log, and deliberately
the quietest thing in the box), string `#9ecf8a` 10.80, number `#d9a0e0` 9.25,
keyword `#7fb6e8` 8.98, class and primitive `#79c9c0` 10.05, operator
`#e0a878` 9.24, plain text `--fg` 15.48. **No token uses `--hi` yellow**: the
accent is spent on what is chosen or live (`positron-ui`, *"the accent is a
budget"*), and a code box has neither. These values are a first proposal and
belong in `shell.css` as named tokens (`--code-str`, `--code-num` and so on),
not as literals in a module.

## 4. Recommendation, the kit piece and its API

**`demo/shell/code-box.mjs`, exporting `createCodeBox`, and
`demo/shell/code-lang.mjs`, exporting the engine and the three tables.** Two
files so the tables can be graded in node with no browser, which is how
`sclang-lite-test.mjs` already grades the compiler.

```js
const box = createCodeBox({
  language: 'faust',            // 'faust' | 'sclang' | 'csound-sco', or a table
  value: PRESETS[0].code,
  rows: 20,                     // the box is this many lines tall, then scrolls
  label: '',                    // as createField: '' builds no caption
  ariaLabel: 'the Faust program this page compiles',
  onInput: (text) => {},        // as createField
  hues: book,                   // optional, section 6
});
box.el        // the field label, which is also the compile note's host
box.input     // the real textarea, for compile-idle.mjs and the harness
box.value(); box.set(text);     // set() repaints; it fires no input event, as today
box.params()  // [{ name, from, to, kind }] found by the last paint
box.mark(name, on)   // raise one parameter's tint while its knob is held
```

It **wraps `createField`** rather than replacing it: the field builds the label
and the textarea with the code attributes it already sets (autocorrect,
autocapitalize and spellcheck off), and the code box moves that textarea into
the scroller and puts the pre behind it. `createCompileIdle({ input:
box.input, host: box.el })` is unchanged, so the note stays in the bottom right
corner of the box and its reserve under the last line still works (failure
modes 8 and 9).

**What it costs per page.** `/fau/` and `/collide/`: replace `createField({
rows, code: true, ... })` with `createCodeBox({ language, rows, ... })`, about
five changed lines each; the `aria-label` moves into the options. `/und/`:
more, because its textarea is hand-built with its own font (11.5 px, weight
500, line height 1.65) and its own `--well`. Moving it onto the kit piece is
the same "second copy becomes a component" argument `field.mjs` makes about
itself, and it will change how `/und/`'s box looks (the kit's 12.5 px face).
That is a visible change and should be named in the commit, not slipped in.

**Verification, in the project's own terms.**
- `demo/shell/code-lang-test.mjs`, node only: every preset of all three pages
  tokenizes to text that joins back to the input exactly (the round trip,
  which is the one thing a highlighter must never break); the parameter finder
  on every `/fau/` and `/collide/` preset returns the names the COMPILER
  returns (Faust's UI JSON labels, `sclang-lite`'s `params`), which is grading
  against a second source rather than against itself; and negative controls,
  written so the bug they name fails them: an `hslider("x", ...)` inside a
  comment is not a parameter, a `\name.kr` inside a string is not one, a table
  that returns everything as plain text fails a check that asserts a
  `comment` token exists, and a finder that returns every quoted string fails a
  check on `import("stdfaust.lib")`.
- On each page, one new assert that reads the rendered pre and the textarea
  (not the attribute): the pre's text equals the textarea's value, and the
  pre's computed `font-size`, `line-height` and `padding-top` equal the
  textarea's. That is the invariant the whole design rests on, and it is free.
- `node demo/verify.mjs fau collide und` and a diff of each page's assert
  count, since nothing about the controls moves. `node demo/shot.mjs fau 375
  1280` to look at it.

**The first step** is `code-lang.mjs` plus its node test, because the tables
and the round trip are gradeable with no browser and are where the bugs will
be. Then the box on `/collide/` alone (the smallest page), then `/fau/`, then
`/und/`.

## 5. The prototype, and how to rebuild the measurement

In the session scratchpad, `proto/`, not in the repository:

- `highlight.mjs`: the engine, `render()` with parameter spans, and the three
  tables with Faust and SC parameter finders.
- `codebox.mjs`: `createCodeBox` on top of the real `/shell/field.mjs`, both
  scrolling modes, the computed style copy.
- `index.html`: the three real texts under the real `shell.css`, with a knob
  row stand-in under each box coloured from the same hue map.
- `measure.mjs`: a static server mapping `/shell/` and `/collide/` to the repo
  read only, a headless Chrome with its own profile removed on exit, the two
  screenshot difference, the per character rectangle drift, and a saved look
  at a given width.
- `caret.mjs`: the caret following check.

Everything numbered in section 2a came from `node measure.mjs grow,sync`, the
same with `PLAIN=1`, and `node caret.mjs && node caret-run.mjs`.

## 6. A hue per parameter, and its knob wears the same one

Asked: *"coloring slider code snippets would be nice, perhaps each on its own
hue"*, with knobs read from the code coming to `/collide/` and `/fau/`.

**What is a snippet, per language** (built and seen in the prototype):

- **Faust**: the whole call, `hslider("cutoff", 1200, 40, 8000, 1)`, found by
  `\b(hslider|vslider|nentry|checkbox|button)\s*\(\s*"` and a bracket count to
  its closing `)`. The whole call gets a faint tint; the quoted label gets the
  hue as its ink. The name is the label with Faust's own decorations removed,
  `[unit:Hz]` metadata and a `h:group/` path, because that is what the compiled
  UI JSON calls the control. A call inside a comment or string is skipped.
  While a call is half typed and has no `)`, the tint stops after the label.
- **SuperCollider**: two shapes. A function argument, `freq = 220` inside
  `|...|` or after `arg`, where the snippet is `name = default` and the name is
  the name. A NamedControl, `\cutoff.kr(1200)` (also `.ar` `.ir` `.tr`), where
  the snippet is the whole expression and the name is the symbol.
  `sclang-lite.mjs` does not accept NamedControl today; the finder does, so the
  day the compiler does, the highlighter already agrees.
- **Csound score**: no parameters. p-fields are positions, not names.

**Which parameters get a hue at all: the ones that have a knob, and only
those.** MEASURED today: every `/fau/` preset with controls has exactly three,
`freq`, `gain` and `gate`, and every `/collide/` preset has three arguments,
`freq`, `amp` and `gate`. All six are played by the keyboard, not by a knob. So
the page, which knows which parameters its knob row shows, hands the box that
list, and a key-driven parameter stays uncoloured. On today's presets the
feature therefore colours nothing until presets grow a `cutoff` or a `\res.kr`,
which is the right answer: a hue on `freq` would promise a knob that does not
exist.

**How hues are assigned so they are stable.** One map from name to hue, owned
by the page and shared by the code box and the knob row, so the two cannot
disagree:
- A name gets its hue **when a compile succeeds and the knob row is built**,
  not on a keystroke. Otherwise typing `cutoff` letter by letter would hand
  hues to `c`, `cu` and `cut` on the way. Until a name has a hue its snippet is
  drawn uncoloured.
- A name keeps its hue for as long as it exists. A name that disappears on a
  successful compile frees its hue for the next new one.
- Loading a preset clears the map and assigns in order of appearance, so the
  same preset always opens with the same colours.

**The palette.** Six hues, each at `hsl(h 75% 72%)` for ink and
`hsl(h 72% 62% / .13)` for the tint:

| hue | contrast on `--bg` (MEASURED) |
| --- | --- |
| 205 blue | 9.90:1 |
| 330 pink | 7.81:1 |
| 168 teal | 13.86:1 |
| 278 violet | 7.19:1 |
| 28 orange | 10.54:1 |
| 250 indigo | 6.14:1 |

The first four are `diagram.mjs`'s own `HUES` rotation entries, reordered so
that consecutive parameters are far apart on the wheel (the diagram order puts
190 next to 205 and 145 next to 168, 15 and 23 degrees apart, which reads as
one colour on a knob label). Every ink here is above 6:1 (MEASURED, WCAG formula against `#0b0e14`) on the dark ground.
**Excluded on purpose:** yellow (52 measured 14.23:1 and is `--hi`, the accent
spent on what is chosen or live), red (`--bad`), and green near 145 (`--ok`,
"inside what it promises"). A parameter colour is identity, and `positron-ui`
already says a mark's colour must not borrow a meaning it does not have.
⚠️ That same rule says lane identity is carried by row, label and swatch, not
by colour. The hue here is a fourth channel beside the name printed on the
knob, never the only one, so a reader who cannot tell violet from indigo still
reads `cutoff` on both the knob and the code.

**Past six.** The seventh parameter onward gets no hue: plain ink in the code,
the kit's neutral knob. Six colours a reader can tell apart on a dark ground at
knob label size is already optimistic. The box reports it the way
`createDiagram` reports a label it had to cut: `box.cuts` gains an entry, so the
author learns a program has more knobs than colours. INFERRED as the right
number; nobody has looked at seven.

**What the overlay needs for it.** Already in the prototype: each snippet is one
`<span class="cb-p" data-param="cutoff" style="--p-hue:278">` around its
tokens, tokens that straddle a snippet boundary are split there, and the name
inside it carries `cb-pname`. Seen in the 1280 and 375 px screenshots: the
tint reads as a highlighter mark behind the call, and the label's hue matches
the stand-in knob beneath. `box.mark(name, true)` sets `data-active` on that
span while its knob is held, which is one CSS rule (a stronger tint) and lets a
reader see which line a knob is turning. The knob side is one custom property,
`--p-hue`, on the knob's own element, the same shape `shell.css` already uses
for per instance values (`positron-ui`: *"a component that varies a property
per instance sets a custom property, never the property"*).

## 7. What could not be settled here

- **iOS Safari was not measured.** Everything in 2a is Chromium, with the phone
  emulated for layout. The three things to check on a real iPhone:
  `-webkit-text-fill-color: transparent` hiding the textarea's ink while the
  caret stays visible; the selection handles and loupe over transparent text;
  and whether WebKit also scrolls an ancestor to keep the caret in view in
  `grow` mode. `node demo/verify-safari.mjs` can answer the first and third on
  desktop Safari, which shares the engine; it needs Remote Automation on and
  opens a Safari window, so it was not run from a background task. A phone in
  hand answers all three in a minute.
- **iOS zooms into a field whose text is under 16 px when it is focused.** The
  kit's code field is 12.5 px today, so this already happens on all three
  pages, and the overlay neither causes nor fixes it. INFERRED from WebKit's
  long standing behaviour, not measured here.
- **The token colours are a proposal**, checked for contrast and not for
  taste. One look on the deployed page decides them.
- **The 0.11 px span drift was measured in Chromium only.** WebKit and Gecko
  place glyphs after a run break by their own rules; the plain text case being
  pixel identical says the geometry agrees, not that the antialiasing will.
- **Very long programs.** Full re-render per keystroke was 0.3 ms at 1 KB. At
  50 KB it would be around 15 ms (INFERRED, linear), which would start to show.
  No program on these pages is near that.

## Cost of this investigation

One background session. Packages fetched from npm and jsDelivr for measurement
only, into the scratchpad; nothing installed into the repository. One headless
Chrome at a time, each with its own profile, removed on exit. No external
source was contacted by any page.
