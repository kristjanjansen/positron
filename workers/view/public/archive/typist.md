# Typist (front page demo /typist/), archived 2026-10-12

Asked: *"archive/mdfy typist"*. The page is gone from the site and from the
tree. Its last version is `demo/typist/index.html` in commit `36b1689a`
(`git show 36b1689a:demo/typist/index.html`), 1227 lines, one file with no
module of its own. It lived a month: first commit `a040df7b` on 2026-09-13 and
ten commits in all. Since 2026-10-12 its card on `/concepts/` read `not
needed`, because `/concepts/typist/030/` (Playback) shows the same idea on the
same deck, transport bar and strip.

## What it was for

The last of the prototypes to be given a page, promoted from `proto/text/`:
the text recorder this project's timeline lineage had failed to write five
times. Every earlier one listened to `keydown` and rebuilt the cursor by hand,
so every one refused arrow keys and the newest regressed to append only.
Typist wrote down what each change DID to the document (where the text
changed and what it changed to) rather than the key that was pressed, which is
what makes a seek a fold over the edits rather than a replay of keys.

Its one sentence: *"Type, and every change is written down as where the text
changed and what it changed to rather than as the key you pressed, which is
what lets any moment of it be put back or run backwards."*

## What it showed

- **A carriage**: one box of two layers pinned together. An invisible
  `<textarea>` on top took every keystroke; a `<pre>` under it drew the text,
  a block cursor between two characters and the highlight at the offsets the
  browser reported. Both layers carried one `.type` class so they could not
  drift a character apart. The paper rolled so the cursor's line stayed in
  view, as a carriage does.
- **A transport bar** (`scrub: false`, `loopWays: true`, so a loop could run
  forwards, backwards or both ways) and **a strip with three lanes**: `typed`
  (inserts, in `--hi`), `taken back` (deletions, in `--bad`) and `cursor`
  (moves, in `--dim`). The letter WAS the mark: zoomed in, each insert drew as
  the character it recorded; zoomed out, a middot stood in. Each lane's gutter
  carried its own counts: edits and letters in, edits and letters out, moves
  and `keys stored` (always 0, which was the point).
- **No readout and no controls.** It opened on your own typing with the cursor
  in the box. Dragging the strip put the box back to any moment, cursor
  included; a seek was refused while you were typing.
- **A shipped recording as a fixture, not as the opening screen**: 73 edits
  typed through real key events in Chrome over CDP on 2026-09-13 (nine cursor
  keys, ten backspaces, a word selected and typed over, a clipboard paste, an
  emoji keyboard insert and three composition steps), with `truth`, the text
  the browser itself held when the recording stopped. It was graded at load
  and then the page was handed over empty.

## How it was built

- **`/shell/text-adapter.mjs`**, the `text-op` kind (`makeTextOpAdapter`,
  `deriveOp`, `selectOp`, `foldOps`, `toJsonl`, `fromJsonl`), promoted
  unchanged from `proto/text/text-adapter.js`. Still in the kit and used by
  `/concepts/typist/030/`.
- **Capture from `beforeinput`, `input` and `selectionchange`, and no
  `keydown` listener in the file at all.** An arrow key produces no
  `beforeinput`, so it could not enter the recording by accident; the cursor's
  new place rode as its own edit, coalesced over 40 ms so a drag of the cursor
  was one move. Stamps came from `ev.timeStamp`, never from a clock read in the
  handler.
- **The range came from the document**: the text before and after, settled by
  the cursor after the edit, because a backspace never says what it removed.
- **Kit modules**: `shell.mjs`, `transport-bar.mjs`, `strip.mjs`
  (`createStripView`, `marks: 'char'`), `/timeline/logdeck.mjs`
  (`makeLogDeck`), `text-adapter.mjs`, `selfcheck.mjs`.
- **`data-typing="document"`** on the textarea is how `demo/verify.mjs` knew
  to type into it with real key events. That typing drill was written for this
  page and stays in the harness for any page that sets the attribute.
- **Seventeen page asserts** over the fixture and over live typing, among them:
  the document rebuilt from its own edits at every moment; not one key stored;
  replaying the keys instead of the edits puts letters in the wrong place;
  where a letter repeats, the cursor settles which one was typed; a backspace
  played backwards is the character coming back; a lap running backwards takes
  edits off one at a time; the whole recording rebuilds the browser's own
  text; the recording survives a round trip through a plain text file.

## What it taught

- **A text recording is edits, not keys.** Replaying keys puts letters in the
  wrong place as soon as the cursor moves; recording what changed makes a seek
  a fold, and a fold does not get slower the further in you drag.
- **A backspace never says what it removed.** On a plain text box the browser
  named the edited range 0 times in 62 chances, so the range has to come from
  the text before and after.
- **Where a letter repeats, only the cursor can say which one was typed.**
  `aaa`, three arrows left, `a`: every answer gives `aaaa`. A plain diff gets
  the letters right and the cursor wrong at that moment, which is invisible
  until somebody drags back to it.
- **An empty readout box is a line.** `readout: null` still built an empty
  `.pos-readout`, and its own borders drew a 2 px band 24 px above the
  controls, reported as *"old UI creeping in"*. The shell hides an empty
  readout since; `shell.mjs`, `table.mjs`, `glue.mjs` and `/kit/` still cite
  `/typist/` as the case.
- **`readout: null` is a declaration**, not an omission, and `verify.mjs`
  learned to read it here.
- **The order of a check and a hand over is load bearing.** Running
  `startOwn()` before `check()` took the page from 22 asserts to 7 with every
  remaining one green; only the count said so.
- **A strip that fits itself once** drew six of seventy one edits while the
  clock read 7.7 s. Found the first time the harness typed into the page.

## Where the idea lives now

`/concepts/typist/030/` (Playback) is one paper whose typing is kept on the
same timeline and played back, and `/concepts/typist/040/` puts six papers
side by side. 030 uses `text-adapter.mjs`.
