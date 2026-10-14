# Kit lessons: messages.mjs

The long comments cut from `demo/shell/messages.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-messages.md#<anchor>`.

<a id="header"></a>

## messages.mjs, file header

demo/shell/messages.mjs — a list of messages, with a column per thing you
need to know about one.

🔴 SECOND HAND-BUILT COPY, AND THE TWO DISAGREED. `wire` drew its live
traffic as a row of coloured gutters plus wrapped text, and drew the HISTORY
of the same messages as a `<pre>` of raw lines — so the same message looked
like two unrelated things depending on which pane it was in, and the history
lost the direction, the size and the stored mark that the live pane showed.
One renderer, both panes.

⚠️ EVERYTHING WRAPS, NOTHING ELLIPSIZES. A line of JSON is ~110 bytes and a
phone is about 45 characters wide, so `nowrap` plus an ellipsis hid most of
the one thing this page exists to show. An ellipsis in this project means the
content is in the wrong place, not that the box needs to be wider.

⚠️ THE GUTTERS ARE FIXED AND THE TEXT IS FLUID. A column that sizes to its
content makes every row start at a different x, which is the same defect the
slider group had — four lanes only line up if they share one set of columns.

<a id="create-message-list"></a>

## messages.mjs, createMessageList

@param {object} o
@param {number} [o.cap]      most rows kept; older ones fall off the end
@param {boolean} [o.newestFirst]  prepend rather than append
@param {string} [o.empty]    what to say when there is nothing yet
@param {string} [o.mark]     the WORD in the third column. It says one more
 fact about a row and the fact is not always "stored": `wire` asks whether
 the relay kept it, `patch` asks whether the bytes came back unchanged. One
 renderer, one column, the caller names it — which is cheaper than a second
 copy of this list, and a second copy is exactly what this file exists to
 have prevented once already.
@returns {{el:HTMLElement, add:(row:object)=>void, set:(rows:object[])=>void,
          clear:(msg?:string)=>void, count:()=>number}}

<a id="add"></a>

## messages.mjs, add

@param {object} r
@param {string} r.dir      'out' | 'in' | 'echo' — what happened to it
@param {number} [r.bytes]  size on the wire
@param {boolean} [r.mark]   is the column's fact true of this row
@param {boolean} [r.stored] the older name for the same flag
@param {string} r.text     the message itself
@param {boolean} [r.hi]    ours, and worth reading

<a id="word-not-tick"></a>

## messages.mjs, add, the mark column

⚠️ A WORD, NOT A TICK. A ✓ in a column headed by nothing is a symbol
whose meaning you have to be told; `stored` says it. And the cell is
never empty-by-accident — a message that was not stored says so by
being blank in a column that is always the same width, so the eye reads
the column rather than hunting for marks.
