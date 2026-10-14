# Kit lessons: text-adapter.mjs

The long comments cut from `demo/shell/text-adapter.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-text-adapter.md#<anchor>`.

<a id="header"></a>

## text-adapter.mjs, file header

demo/shell/text-adapter.mjs — the `text-op` kind: a STATEFUL-DOCUMENT

🔴 PROMOTED FROM proto/text/text-adapter.js, UNCHANGED BELOW THIS HEADER. It
was finished and measured and had never been given a page: 73 edits recorded
through a real browser fold to the browser's own text character for
character (48/48, cursor [48,48]), all 10 deletions had a range no event
reported, and 62 of 62 ranges were settled by the post-edit cursor rather
than by the raw diff. `demo/typist/` was the page until 2026-10-12 (archive/typist.md); /typist/playback/ uses it now.

(was: the `text-op` kind: a STATEFUL-DOCUMENT adapter for
timeline/transport.mjs.)

This is the fifth attempt in this lineage at a text adapter and the first one
that is allowed to seek. The four ancestors — time/public/demo2.html,
demo12.html, demo-timeline-component.html, demo/pages/keyboard.vue and
keyboard2.vue — all listened to `keydown` and tried to rebuild a cursor by
hand, which is why every one of them carries an apologetic comment refusing
arrow keys, and why the newest of them regressed to append-only.
research/timeline-own-prior-art-2026-08.md §2:

    "Replay needs the editing model, not the input stream. […] For text kinds
     capture the semantic op/diff (or result), not keystrokes."

So: CAPTURE THE OPERATION, NOT THE KEY.

  FIX-1  the unit of the log is a document-model edit
         `{type:'insert'|'delete'|'select', range:[start,end], text?}` —
         an absolute range into the plain-text document, never a keycode.
         Arrow keys are therefore not a special case; they are not even
         visible to the capture (they produce no `beforeinput`), they only
         move the selection, which rides as its own op.
  FIX-2  the range is DERIVED FROM THE DOCUMENT, not reconstructed from the
         key. `beforeinput` snapshots (value, selection); `input` reads the
         new value; the op is the minimal contiguous replacement between
         them, disambiguated by the POST-edit caret. This is exact for every
         inputType the browser can produce — paste, drag, IME composition,
         autocorrect, undo — because all of them are, in the end, one
         contiguous replacement in a plain-text document.
  FIX-3  NO RESOLVED MODIFIERS ARE EVER STORED. The double-application bug
         (`shift ? key.toUpperCase() : key` written at capture AND re-applied
         at replay, present in four ancestor files) cannot occur here: the
         log stores the *resulting characters* the browser produced, and
         replay splices them in verbatim. There is no modifier field.
  FIX-4  reduce(prefix <= t) folds the ops into `{text, selection}` — a whole
         document. THIS is what finally makes seek work for text: the state
         at t is a pure function of the prefix, so the library's C2 property
         (`assertState(reduce(prefix<=t)) === state after play(0->t)`) holds
         on real text, selection included.

Plain ESM, no deps, browser+node.

<a id="input-types"></a>

## text-adapter.mjs, inputType policy

---------------------------------------------------------------------------
inputType policy. The document model of this kind is PLAIN TEXT, so the
handled/unhandled split is not a list of special cases — it is one rule:

  handled     = every inputType that changes the plain-text content
  unhandled   = every inputType that changes only rich-text ATTRIBUTES or
                BLOCK STRUCTURE, because those produce no plain-text diff and
                there is nowhere in `{text, selection}` to put them.

The handled set is open: an inputType nobody has heard of still arrives as a
value diff and is still folded correctly. The unhandled set is closed and
enumerated, so "we do not do rich text" is a declaration and not a silence.
---------------------------------------------------------------------------

<a id="derive-op"></a>

## text-adapter.mjs, deriveOp

---------------------------------------------------------------------------
deriveOp — the whole trick, in twenty lines.

Between two values of a plain-text document produced by ONE editing action
there is always exactly one contiguous replaced range. Common-prefix /
common-suffix finds a range that produces the right text but is AMBIGUOUS
when the edit touches repeated characters ("aa" + "a" could be at 0, 1 or 2)
— and that ambiguity is precisely what corrupts the cursor. The post-edit
caret disambiguates it: after an insert of L characters the caret sits at
start + L; after a delete it sits at start. So we propose that window first
and only fall back to the naive diff if the proposal does not reproduce the
new value exactly.
---------------------------------------------------------------------------

<a id="fold-ops"></a>

## text-adapter.mjs, the reducer

---------------------------------------------------------------------------
The reducer. `reduce(prefix <= t)` for a stateful-document kind returns the
WHOLE DOCUMENT — this is the shape the library did not have a name for
(a pointer's reduce returns a position, a note lane's returns a held-key Set;
a text lane's returns a value). See NOTES.md, THE STATEFUL-DOCUMENT SEAM.

Folds forward from the empty document over the complete ordered prefix the
library guarantees (SEAM 5). Non-commutative by construction — which is
exactly why SEAM 5 had to exist before this adapter could be written.
---------------------------------------------------------------------------

<a id="adapter"></a>

## text-adapter.mjs, makeTextOpAdapter

---------------------------------------------------------------------------
The adapter.

  caps.discrete       — ops happen AT instants; nothing is defined between
                        two of them (the opposite of proto/paths' pointer)
  caps.catchUp        — 'reduce': a burst of stale keystrokes is meaningless
                        for a document; folding them is the only right answer
  caps.stateful       — NEW capability word. The surface carries state the
                        individual events do not: you cannot actuate op #40
                        onto a document that has not seen ops #1..#39.
                        reduce()+assertState() is therefore MANDATORY, not
                        an optimisation.
---------------------------------------------------------------------------
