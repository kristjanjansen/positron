# Kit lessons: code-lang

The longer comments cut from `demo/shell/code-lang.mjs` and `demo/shell/code-lang-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-code-lang.md#<anchor>`.

<a id="header"></a>

## `code-lang.mjs` module header

```text
demo/shell/code-lang.mjs: one tokenizer, a small rule table per language,
and the finder that says which stretch of a program is a parameter.

🔴 PURE, SO IT IS GRADED IN NODE WITH NO BROWSER. `code-box.mjs` draws what
this returns; everything that can be wrong about a highlighter (a character
dropped, a comment read as code, a slider in a comment called a parameter)
is decided here, and `code-lang-test.mjs` grades it against the Faust
compiler and `sclang-lite.mjs`, which are sources this file did not come
from. `plans/plan-code-editor.md` is the spec and the measurements.

🔴 THE ENGINE NEVER THROWS AND NEVER DROPS A CHARACTER. A highlighter runs
on every half-typed state a program passes through, so an unclosed `/*` or
`"` runs to the end (the compiler would read it the same way) and anything
no rule matches is plain text, one character at a time. The tokens joined
back together ARE the input, which is the one invariant the whole overlay
rests on: the drawn layer must hold exactly the textarea's text.

⚠️ A LANGUAGE IS DATA: `{ name, rules: [[RegExp, type]], params?(src) }`.
Rules are tried in order at each position as sticky copies and the first
non-empty match wins. That is what Prism, Monarch and CodeMirror's
`simple-mode` all do, and none of them has Faust or a Csound score, which is
why the tables are written here rather than imported (plan section 1).
```

<a id="faust"></a>

## `code-lang.mjs` Faust

```text
── Faust ───────────────────────────────────────────────────────────────────
The word lists are facts about the language, read from Grame's own Monarch
tokenizer for the Faust IDE and its web component (plan section 1), written
fresh in this format.
```

<a id="comma"></a>

## `code-lang.mjs` Faust comma

```text
⚠️ THE COMMA IS LEFT PLAIN. It is Faust's parallel composition and the
prototype coloured it, and every comma inside an `hslider(...)` argument
list lit up. Right for the language, wrong for the eye (plan section 3).
```

<a id="resume"></a>

## `code-lang.mjs` dead match resume

```text
⚠️ RESUME ONE CHARACTER ON, NOT AFTER THE MATCH. A dead match can run
from inside a string across the closing quote into real code, so
`"see hslider("; q = hslider("real", ...)` swallowed `real` whole.
```

<a id="sclang"></a>

## `code-lang.mjs` SuperCollider

```text
── SuperCollider, the subset `sclang-lite.mjs` compiles ──────────────────
Borrowed shape: Prism's `supercollider` component (MIT), which is
Smalltalk-ish tokens in C clothing. ⚠️ `sclang-lite.mjs`'s own `lex()` is
NOT reusable here: it throws outside the subset and drops comments, and a
highlighter has to survive every half-typed state and show comments.
⚠️ NESTED `/* /* */ */` IS NOT HANDLED, which sclang allows. The rule stops
at the first `*/`. No preset nests.
```

<a id="csound-sco"></a>

## `code-lang.mjs` Csound score

```text
── Csound score ────────────────────────────────────────────────────────────
What `/csound/` holds is a SCORE, not an orchestra: one statement letter at the
start of a line, then p-fields. Borrowed shape: the csound VS Code plugin's
`csound-sco.tmLanguage.json` (MIT). No parameters: p-fields are positions,
not names.
```

<a id="linekind"></a>

## `code-lang.mjs` lineKind

```text
🔴 WHAT A LINE IS, SO A PAGE CAN DRAW IT IN THE COLOUR OF THE LANE THAT
SHOWS IT. Asked 2026-09-30 on `/csound/` with a screenshot of the score over
its strip: *"can you mathc lane colors and code colors somehow"*. The strip
has three lanes, `part`, `event` and `tempo`, and the score has exactly
those three kinds of line, so the statement letter decides the kind and
every coloured token on the line carries it. Comments keep their own ink.
```

<a id="bound"></a>

## `code-lang.mjs` bound variables

```text
🔴 THE VARIABLE A KNOB'S CONTROL IS BOUND TO WEARS THE KNOB'S HUE, AND SO
   DOES EVERY USE OF IT. Asked 2026-09-30 with a crop of `/fau/`'s Sweep:
   *"cutoff var should be blue"*. `cutoff = hslider(...)` coloured only the
   quoted label, so `min(cutoff, ...)` three lines down, which is where the
   knob actually acts, read as any other name. The binding is read off the
   control's own line (`name = ` right before it, which is Faust's
   definition and sclang's `var name = `); an argument is its own name.
   Only a bare identifier token is matched, so `cutoffs`, a comment and a
   string are never coloured.
```

<a id="only-control"></a>

## `code-lang.mjs` only control

```text
⚠️ ONLY WHEN IT IS THE ONLY CONTROL IN THAT DEFINITION. `q = hslider("a",
...) + hslider("b", ...)` makes `q` neither `a` nor `b`, and colouring it
as the first would put one knob's ink on a mix of two.
```

<a id="param-hues"></a>

## `code-lang.mjs` PARAM_HUES

```text
🔴 SIX HUES, ORDERED SO NEIGHBOURS ARE FAR APART ON THE WHEEL. The first four
are `diagram.mjs`'s own rotation, reordered: its order put 190 beside 205
and 145 beside 168, which read as one colour on a knob label. Every ink at
`hsl(h 75% 72%)` is above 6:1 on `--bg` (plan section 6, MEASURED).
⚠️ NO YELLOW (`--hi`, spent on what is chosen or live), NO RED (`--bad`),
NO GREEN NEAR 145 (`--ok`). A parameter colour is identity and must not
borrow a meaning it does not have.
```

<a id="createhuebook"></a>

## `code-lang.mjs` createHueBook

```text
The one map from a parameter name to its hue, owned by the page and read by
the code box and the knob row alike, so the two cannot disagree.
- `assign(names)` is called on a SUCCESSFUL compile with the names that got
  a knob. A name keeps its hue while it exists; a name that went away frees
  its hue; a new name takes the first free one. Never on a keystroke, or
  typing `cutoff` would hand hues to `c`, `cu` and `cut` on the way.
- `clear()` when a preset is loaded, so the same preset always opens with
  the same colours, assigned in order of appearance.
- Past six a name gets no hue and `cuts` says so, the way `createDiagram`
  reports a label it had to cut.
```

<a id="test-header"></a>

## `code-lang-test.mjs` code-lang-test module header

```text
demo/shell/code-lang-test.mjs: the highlighter's tables and its parameter
finder, with no browser.

  node demo/shell/code-lang-test.mjs

🔴 GRADED AGAINST THE COMPILERS, NOT AGAINST ITSELF. Every current preset of
`/fau/`, `/collide/` and `/csound/` is read from the page or module that ships
it (never a copy here), and what the finder calls a parameter is compared
with what a compiler this file did not write reports:
  Faust          libfaust 2.89.2 out of `demo/fau/vendor/`, compiled in node,
                 and the labels in its UI JSON
  SuperCollider  `sclang-lite.mjs`'s `controls`
  Csound score   `timeline/csound.mjs`'s `csoundPart`, whose note rows carry
                 the line they came from, against the lines this table
                 colours an `i` statement on
⚠️ libfaust's glue writes a temporary module NEXT TO the `.js` it is handed,
so the 157 kB `.js` is copied to the system temporary directory first and
`demo/fau/vendor/` is only ever read.

🔴 A NAMED PROPORTION ARE NEGATIVE CONTROLS, marked `NEGATIVE CONTROL`,
written so the defect they name fails them. `CODE_LANG_MODULE=<path>` runs
this file against another copy of the module, which is how each was PROVED
able to fail rather than argued. MEASURED 2026-09-30, 45 ok on the real
module, then eleven sabotaged copies, each one line:

  a plain run loses its last character before a token   13 red, every round trip
  the finder names every quoted string                   9 red
  `<` and `>` not escaped in the drawn HTML              7 red, every `<:` preset
  no metadata or path stripped off a Faust label         2 red
  a Faust call in a comment counted                      2 red
  a named control in a comment counted                   2 red
  a dead Faust match resumed AFTER itself, not one on    1 red, `real` lost
  the comma coloured as composition                      1 red
  a statement letter matched anywhere on the line        1 red, the label `e`
  a hue drawn on a parameter with no knob                1 red
  a vanished name keeps its hue                          1 red

⚠️ THE HUE AND THE STATEMENT LETTER SABOTAGES WERE GREEN ON THE FIRST
SABOTAGE RUN, and the tests were what was weak: the hue check matched only
a numeric `data-hue`, so `data-hue="null"` slipped past it, and nothing had
ever asked for a one-letter label. Both were tightened and re-run red.
⚠️ AND THE FIRST STRING FIXTURE FOUND A REAL DEFECT: a dead match skipped by
resuming after it swallowed the real call beyond the string's closing quote.

⚠️ WHAT THIS CANNOT GRADE: where a glyph lands. That needs a document, and
`/kit/`'s CODE BOX block asserts it (drawn text equals the textarea's, the
metrics equal, a hue only on a knob parameter).
```

<a id="faupresets"></a>

## `code-lang-test.mjs` fauPresets

```text
`/fau/`'s presets, imported from the module the page imports since
 2026-10-06. They were read out of the page with a regular expression until
 then.
```

<a id="undscore"></a>

## `code-lang-test.mjs` undScore

```text
`/csound/`'s one score, in its SCORE tab's module since the page got tabs
 (396ca4b), as an array joined with newlines. Read from the page before that
 and broken from then until 2026-10-05.
```

<a id="test-notes"></a>

## `code-lang-test.mjs` test: csound notes

```text
🔴 SECOND SOURCE: the notes `csoundPart` read, by the line they came from,
against the lines this table colours an `i` on. `m` and `n` are not notes.
```

<a id="test-line-kinds"></a>

## `code-lang-test.mjs` test: line kinds

```text
🔴 LINE KINDS, so `/csound/` can draw a line in the colour of its lane. The
second source is again `csound.mjs`: every line it read a note from is an
event line, and nothing else is.
```

<a id="test-bound"></a>

## `code-lang-test.mjs` test: bound hue

```text
🔴 THE BOUND VARIABLE WEARS THE KNOB'S HUE WHERE IT IS DEFINED AND WHERE
IT IS USED (*"cutoff var should be blue"*), and nowhere it is not that
variable.
```

<a id="test-library"></a>

## `code-lang-test.mjs` test: library controls

```text
⚠️ A CONTROL DECLARED INSIDE A LIBRARY HAS NO SNIPPET IN THE BOX.
`pm.djembe_ui_MIDI` builds six sliders in `physmodels.lib` and the text
holds none of them, so there is nothing there to colour. The grade is
therefore two halves: every name found is a control libfaust built, and
every control libfaust built that was NOT found has no quoted label
anywhere in the program outside a comment.
```

<a id="test-strings"></a>

## `code-lang-test.mjs` test: sclang strings

```text
⚠️ sclang-lite has no strings, so the compiler grades the comment case and
the string case is graded on the finder alone, on the same program.
```
