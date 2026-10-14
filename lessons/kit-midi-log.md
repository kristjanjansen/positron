# Kit lessons: midi-log.mjs

The long comments cut from `demo/shell/midi-log.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-midi-log.md#<anchor>`.

<a id="header"></a>

## midi-log.mjs, file header

demo/shell/midi-log.mjs — what arrived on the wire, in columns, under the
panel it moved.

🔴 WHY THIS IS A MODULE AND NOT A TABLE TYPED INTO THREE PAGES. Asked
2026-09-21: *"add midi event logs to circuit and rack demos"*, and `/evo/`
was written the same hour, which makes three callers on one day. This
project has paid twice for a control that existed in one page and was
retyped in the next: three radio rows and two slider stacks, and both times
the copies drifted where nobody was looking.

🔴 THE READING NEVER REPLACES THE BYTES. `midi-decode.mjs` returns both for
a reason written at the top of that file: a relative encoder reads as a
POSITION if all you have is an interpretation, and a panel above this table
is exactly an interpretation. The hex column is the fact and the reading is
the opinion, so they are two columns and never one.

🔴 A FLOOD IS COUNTED AND NEVER LISTED, AND THAT POLICY LIVES HERE RATHER
THAN IN EACH PAGE. A Circuit sends 24 clock bytes a quarter note whether
anything is playing or not, and an MK-425C was measured at 733 messages in
eight seconds. A table that listed those is a table whose only visible rows
are from several seconds ago. `add()` refuses them and says so by returning
false, so a caller that wants to COUNT one still can.

⚠️ IT IS `/dump/`'s TABLE, LIFTED. That page keeps its own, because it folds
four NRPN messages into a fifth reading and carries a port name on the
hover, neither of which a single instrument's panel needs. If a third
behaviour ever appears, they merge here rather than growing a third copy.

<a id="create-midi-log"></a>

## midi-log.mjs, createMidiLog()

@param {object} [o]
@param {number} [o.cap]    rows kept. The oldest fall off the top.
@param {string} [o.empty]  what the box says before anything has arrived.
                          A page whose traffic sits behind a press should
                          name that press here.
@param {number} [o.reserve] rows of height to hold open while it is empty.
@returns {{el, add:(m:object)=>boolean, count:()=>number, clear:Function,
          table:object}}
🔴 `reserve` HOLDS THE BOX OPEN WITH NOTHING IN IT, AND IT REPLACES A
SENTENCE THAT WAS DOING TWO JOBS. Asked 2026-09-21: *"`press the status
button, then play something` - rm just leave room for midi table"*. That
string told a visitor what to press, which the button beside it already says
on its face, and it held the table's height, which is the half worth keeping.
⚠️ **AND THE TWO ARE INDEPENDENT ON PURPOSE.** `empty: ''` with no `reserve`
collapses the box, which is right for a table that appears when a file lands;
`reserve` with no `empty` keeps both. A page asking for room is not asking
for a caption and had to say so in one option before.
⚠️ IT IS ROWS RATHER THAN PIXELS, because a table's row height is `shell.css`'s
business and a page that typed `min-height: 186px` would be a second opinion
about it. `--tbl-row-h` is declared beside `.pos-tbl-row` and asserted against
a real measured row.

<a id="headings"></a>

## midi-log.mjs, column headings

⚠️ EVERY HEADING IS ONE SHORT WORD AND NONE OF THEM WRAPS. A wrapping
heading is a table reporting that its columns do not fit, in the one
place a reader cannot act on it.

<a id="stick"></a>

## midi-log.mjs, stick

🔴 THE NEWEST ROW STAYS IN VIEW, for `/dump/`'s measured reason: at 733
messages in eight seconds, a table that does not follow is a table
showing the past.
