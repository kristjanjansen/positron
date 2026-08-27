# proto/text — the TEXT PERFORMER (`text-op`, the stateful-document kind)

Port 8889. `node proto/text/server.mjs`, then `node proto/text/harness/run-text.mjs`.
Owns `proto/text/` only; imports `timeline/` as-is (aliased at `/timeline/…` by the
server, loaded never copied). **12 pass / 0 fail**, results in `results/verify.json`
and `results/text-verify.png`.

---

## 1. Why this exists

`research/timeline-own-prior-art-2026-08.md` §2:

> **Replay needs the editing model, not the input stream.** Three repos, five text
> adapters, every one refuses arrow-keys/selection/IME with an apologetic comment;
> the newest code REGRESSED to append-only.

The five, dated, with the verbatim excuses:

| # | file | excuse |
|---|---|---|
| 1 | `time/public/demo2.html` | :60 `// Up/down arrows can be complex; for simplicity, we keep cursor unchanged` |
| 2 | `time/public/demo12.html` | (no excuse; ArrowUp/Down silently dropped from the filter, Backspace branch is append-only while the cursor index moves) |
| 3 | `time/public/demo-timeline-component.html` | (no excuse; arrows recorded, no replay branch at all — they vanish) |
| 4 | `demo/pages/keyboard.vue` | :142 `// For simplicity, we're not implementing multi-line cursor movement` |
| 5 | `demo/pages/keyboard2.vue` | :177 `// For simplicity, we ignore arrow keys during playback` ← **the append-only regression**, newest of the five |

The shift double-application bug, both halves, in three of them:

```js
demo2.html:27   recordedKeys.push({ key: event.key, shift: event.shiftKey });   // event.key is ALREADY resolved
demo2.html:64   let char = shift ? key.toUpperCase() : key;                     // …and resolved again
demo12.html:74 / :134                    same pair
demo-timeline-component.html:97 / :111   same pair
```

Masked for ASCII (`"A".toUpperCase() === "A"`), fatal the moment `toUpperCase()`
is non-idempotent or expands in length — `cursorPos++` advances by 1 while two
characters went in, and the caret desyncs permanently.

Cross-cutting, in **all five**: zero `input`/`beforeinput` capture, zero selection
capture (`selectionStart` is *written* on replay by two of them and *never read* on
capture by any), zero IME, no `event.repeat` guard.

---

## 2. The op schema

One row per op, epoch µs, payload nested (never spread over control fields):

```jsonc
{ "at": 1756336… ,          // epoch µs, stamped from the EVENT (performance.timeOrigin
                            // + ev.timeStamp), never re-stamped at handler time
  "kind": "text-op",
  "source": "live",
  "op": { "type": "insert" | "delete" | "select",
          "range": [start, end],        // absolute offsets into the plain-text document
          "text": "…",                  // insert only; the characters the BROWSER produced
          "dir":  "forward|backward|none",   // select only
          "inputType": "insertFromPaste",    // provenance / timbre, never used to compute the range
          "anchor": "caret" | "diff" },      // which disambiguation won
  "meta": { "targetRanges": 0, "preSel": [12, 12] } }   // measurement, not semantics
```

**There is no modifier field, and there never can be.** The log stores the
*resulting characters*; replay splices them verbatim. The double-application bug is
not fixed here, it is unrepresentable.

`reduce(prefix ≤ t)` → `{text, selection:[a,b], dir, counts, ops}`.
`assertState` → `el.value = text; el.setSelectionRange(a, b, dir)`.

---

## 3. How the range is obtained — and why `getTargetRanges()` is not it

The brief proposed `beforeinput` + `event.getTargetRanges()`. **Measured, it returns
nothing usable in Chrome 14x for the inputTypes a typist produces:**

```
<textarea>                    0 / 65 beforeinput events had a non-empty getTargetRanges()
contenteditable=plaintext-only  insertText → 0 ranges,  deleteContentBackward → 0 ranges
```

The textarea result is spec-mandated (the target ranges live in a closed shadow
tree). The contenteditable result is a Chrome implementation fact, measured with
real CDP key input against a focused editable div. So the range comes from
**the document itself**:

1. `beforeinput` snapshots `{value, selectionStart, selectionEnd, inputType}` and the
   event's own timestamp.
2. `input` reads the new value.
3. `deriveOp(old, new, postCaret)` finds the single contiguous replaced range.

Common-prefix/suffix alone is **ambiguous on repeated characters** ("aa" + "a" could
be at 0, 1 or 2) and that ambiguity is exactly what corrupts a cursor. The
**post-edit caret** disambiguates it: after inserting L characters the caret is at
`start + L`; after a delete it is at `start`. Propose that window, verify it
reproduces the new value exactly, fall back to the naive diff otherwise.

Measured on the synthetic performance (64 content ops):

| | n |
|---|---|
| range anchored on the caret | **64** |
| range from the raw diff (fallback) | 0 |
| insert: pre-edit selection agreed with the derived range | 56 |
| insert: pre-edit selection was **wrong** | 1 |
| delete: range **had** to be derived (pre-edit selection collapsed, not the deleted range) | **7** |

That last row is the ancestors' bug in one number: for every backspace the pre-edit
selection is a collapsed caret and tells you nothing about what got deleted. Every
ancestor guessed `slice(0, -1)` or `slice(0, cursor-1)`. The diff does not guess.

---

## 4. inputTypes — handled and deliberately not

**Handled: an open set, by construction.** Any inputType that changes the plain-text
content produces a value diff and is therefore folded correctly, including ones that
did not exist when this was written. Observed in the run: `insertText` (53),
`deleteContentBackward` (7), `insertLineBreak` (1), `insertFromPaste` (1),
`insertCompositionText` (3). `historyUndo`/`historyRedo` also fall out correctly —
they arrive as ordinary diffs, so an undo is recorded as the edit it performs. (This
is why keyboard2's `Cmd+Z` desync — recorded as a literal `"z"` while the browser
reverted the textarea — cannot happen here.)

**Deliberately NOT handled: a closed, enumerated set** (`caps.unhandledInputTypes`,
21 entries) — every `format*` (`formatBold`, `formatFontColor`, `formatIndent`, …)
plus `insertOrderedList` / `insertUnorderedList` / `insertHorizontalRule`. Reason:
this kind's document model is **plain text**. Those change attributes or block
structure and produce *no plain-text diff*, so `{text, selection}` has nowhere to
put them. They are counted (`format ops ignored`) and dropped, not silently lost.
A rich-text kind is a different adapter with a different `reduce` return type.

---

## 5. Results

Synthetic performance driven through the real browser input pipeline (CDP
`Input.dispatchKeyEvent` / `Input.insertText` / editing commands), 9.49 s, **78 ops**
→ 57 characters over 2 lines. It contains, on purpose, every case the ancestors
failed: typing, backspace ×7, **9 ArrowLefts then insertion mid-string**,
**Enter → type → ArrowUp → insert on the line above**, **shift+Arrow selection then
type over it**, **a real clipboard paste**, `Input.insertText`, and
`Input.imeSetComposition`.

| assert | result |
|---|---|
| A0 seek(end) DOM == the browser's own text | 57/57 chars |
| A **replay character-for-character** | identical, 78 actuate() calls at 3×, 0 asserts during play |
| A2 replay selection | `[57,57]` == browser `[57,57]` |
| B **C2 on real text** ×3 | `reduce(prefix≤t)` == `play(0→t)` at 4108 ms/17 ch, 6588 ms/37 ch, 8035 ms/44 ch |
| B2 C2 selection | folded selection == played selection, 3/3 |
| C **selection restored on seek** ×3 | DOM `[8,8] [18,18] [44,44]` == reduce, text exact |
| D pause holds | 0.000 ms drift over 400 ms, document unchanged |
| E rate 2× | 3928.3 ms @1× vs 1967.0 ms @2× → **1.997×** |
| F **two lanes identical** | 529 frame samples (418 while playing), **0 divergences, 0 dispatch lags** |
| H jsonl round-trip | 13 923 B / 79 lines → 78 items, document identical |
| G console errors | 0 |
| I getTargetRanges measured | 0/65 textarea, 0/2 contenteditable |

Probe times are the **midpoints of the three widest silences** in the performance
(429/435/701 ms), so the C2 comparison does not depend on stopping the transport at
an exact instant — `reduce` at `t` and at the actually-stopped position agree.

**The lane check had a bug worth recording.** The first run reported 3/657
mismatches. They were not the reducer: the settling-exclusion window was written as
a position-domain constant (`±40 ms`) when the thing it excludes — scheduler
dispatch jitter and main-thread jank — is a **wall-clock** quantity. At 3× the
window was three times too narrow. Fixed by scaling it by the rate, and residual
mismatches are now *classified* rather than tolerated: a mismatch is a **dispatch
lag** if lane A equals the fold one window either side, and a **divergence**
otherwise. Only divergences are asserted on. Both are 0.

---

## 6. Library seams a stateful-document kind needed

1. **`makeLogDeck`'s default payload spread clobbers the position it just
   computed.** `logdeck.mjs:51` builds `payload: { i, at, ...p.payload }` where
   `p.payload` is the raw row — and every row in this lineage names its µs stamp
   `at`, so the spread overwrites the position-domain `at` with the µs one. Any lane
   whose adapter wants the position (this one does, for the velocity derivation and
   the strip) must supply an explicit `expand` to keep the row out of the payload
   root. Suggested fix: spread first, or nest as `payload: {i, at, row}`.
2. **`reduce()` has no declared return *shape*.** The three kinds now in the repo
   return three different things: a scalar position (pointer), a key Set (notes),
   and a whole document `{text, selection}` (this one). `logdeck.reducedKeys()`
   assumes Map/Set and returns `[]` here. A `caps.seekReduce` tag exists in the two
   newest adapters by convention only — worth making it library vocabulary
   (`'interpolated' | 'keys' | 'document'`), because a HUD cannot render a reduce
   result without it.
3. **`caps.stateful` is a missing capability word.** For a discrete kind the library
   may legitimately treat `reduce`/`assertState` as an optimisation. For a document
   they are *mandatory*: you cannot actuate op #40 onto a document that has not seen
   #1–39. `registerAdapter` should reject `{stateful: true}` without both, the way
   it already rejects `catchUp:'reduce'` without `reduce`.
4. **SEAM 5 is load-bearing here and would not have been enough at v0.1.** A text
   fold is strictly non-commutative — every op's range is interpreted against the
   document the previous ops produced. The old "events one scan missed" input could
   not have produced a correct document. This adapter is the first client that would
   *break* without the whole-ordered-prefix guarantee.
5. **No backward-seek fast path.** `reduce` refolds from the empty document on every
   seek: O(prefix). For a 9 s take that is 2 055 `reduce` calls over ≤78 ops, free.
   For an hour-long typing session it is not. §1.2's undoable-command-log (each entry
   carrying `undo()`) is the second seek strategy the library still lacks; a text op
   is trivially invertible (`insert` ↔ `delete` given the replaced text), so this
   kind is the natural place to prototype it. Snapshot-every-N-ops is the cheaper
   half-measure and also has nowhere to live in the current contract.
6. **`caps.audio` (SEAM 4) worked unmodified for a non-musical kind.** `actuate()`
   receives `when.audioTime` and the click is `start()`ed on the audio clock from the
   wall lane. This is exactly what keyboard2 could not do.

---

## 7. The performance half

Ported from `demo/pages/keyboard2.vue`: the 60ch measure, bold mono at a large size,
`line-height: 1.625`, generous padding, ink-on-paper inverted out of the dark rig
chrome, the native caret on a **readonly (not disabled)** surface so it keeps
blinking while text streams in — and `filter: blur(0.75px)`, the one non-obvious
aesthetic decision in the ancestor, kept.

**The audio is rebuilt from scratch, because the survey corrected the record:**
keyboard2 has no oscillator and no envelope. It `fetch`es an untrimmed freesound
`-lq` preview MP3 and fires it through a bare `BufferSource` with
`source.connect(destination)` and `source.start(0)` — **no gain node at all**
(`keyboard2.vue:35-47`). Consequences, all of which this fixes: no velocity (no gain
stage), no scheduling (`start(0)` rides `setTimeout` jitter, never the audio clock),
unbounded overlapping voices on fast typing, silent until a network fetch resolves,
and an AudioContext built in `onMounted` with no gesture and no `resume()`.

Here: one synthesised click per op, scheduled at `when.audioTime`.
Insert = triangle 1150–2100 Hz through a bandpass, 26 ms, downward glide.
Delete = sawtooth ~190 Hz through a lowpass, 85 ms, falling — a duller thunk.
Select = 3.1 kHz sine, 14 ms, quiet. Velocity = `1 − min(1, dt/320 ms)` from the
inter-op gap, **derived from the immutable log by index, never stored** (the timing
is already in the log; storing a resolved velocity beside it is the same
denormalisation as storing a resolved shift). 24-voice cap. AudioContext reached
`running` in headless Chrome with `--autoplay-policy=no-user-gesture-required`.

**Rhythm-preserving replay** is simply the transport doing its job: the ops carry
their own µs stamps and the wall lane fires them there. Rate 2× halves the wall
duration (1.997× measured) without changing the pattern — the timing *is* the
content.

**Ghost typing** (default on): `actuate` writes into the real editable surface, so
the caret moves and the selection highlights as the performance types itself. Off:
the ops still apply and the projections still update, but the live surface is not
focused.

---

## 8. Out-of-band, structurally

Every control is a button or a pointer-driven `<input type=range>`. **No keyboard
shortcut is bound anywhere in this client, and it would not matter if one were:**
capture listens to `beforeinput`, which non-editing keys never fire. `Escape`
disarms recording and is *structurally uncapturable*. `demo12.html:63-67` had to
hand-exclude its own Ctrl+Space and Ctrl+Enter from the recording; here the
exclusion is a property of the capture model, not a filter that can be forgotten.

Corollary the ancestors also missed: `keyboard2.vue` records `Cmd+A`, `Cmd+V`,
`Cmd+S`, `Cmd+Z` as the literal letters `a v s z` (they pass `key.length === 1`).
None of them can enter this log.

---

## 9. IME / composition — the honest answer

**Partially testable headlessly; tested.** `Input.imeSetComposition` was accepted by
CDP and produced **3 `insertCompositionText` ops**, which folded and replayed
correctly and are inside the character-for-character result. `Input.insertText` (the
emoji-keyboard / IME-commit path) also works and produced the `✓` in the final
document.

**What could not be tested headlessly:** a real platform IME with a candidate window
(CJK conversion, dead keys), because headless Chrome has no IME. What is *known* is
structural rather than measured: composition arrives as ordinary value diffs, so the
range derivation cannot be wrong about it — the only open question is *policy*.
Currently every composition step is its own op (three, above), so replay re-types
the composition as it happened. For a text **performance** that is the right default
— the hesitation is the content — but a `coalesceComposition` flag folding
`compositionstart…compositionend` into one op belongs here for archival use. Not
built; not needed for v0.

---

## 10. Verdict

Yes — this is the text adapter the lineage kept failing to write. The arrow keys
that broke five ancestors are handled by *not being an input event at all*: they
move a selection, the selection rides as its own op, and the reducer folds it.
`reduce(prefix ≤ t)` returning a whole document is what makes seek work; the two
lanes on screen are the proof that it does.
