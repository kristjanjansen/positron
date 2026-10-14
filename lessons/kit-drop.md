# Kit lessons: drop

The longer comments cut from `demo/shell/drop.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-drop.md#<anchor>`.

<a id="header"></a>

## `drop.mjs` module header

```text
demo/shell/drop.mjs — drop a file anywhere on the page and it OPENS.

🔴 IT IS `open`, NOT `upload`, AND THE WORD IS THE POINT.
Nothing leaves the machine. The file is read into an `ArrayBuffer` in the tab
and handed to the caller, and this module names no network API at all: no
`fetch`, no `XMLHttpRequest`, no `WebSocket`, no form. A purchased soundbank
lives in `purchased/` precisely because it is not ours to publish, and a
control called *upload* invites somebody to build the thing that gitignore
exists to prevent. The label a visitor reads says **open**.
⚠️ `plans/plan-pack-page.md` §3 specifies `FileReader`. `file.arrayBuffer()`
is the same locality with fewer moving parts and it returns a promise, so a
read that fails propagates instead of landing in an `onerror` nobody wrote.

🔴 IT HAS A VISIBLE AREA, AND THE FIRST VERSION DID NOT. THAT WAS THE DEFECT.
It shipped with a button and a cover, and the cover is `position: fixed` and is
inserted into the document ONLY while a drag is already in flight. So a reader
who had not started dragging had nothing on screen telling them they could:
**the affordance appeared after the gesture it exists to invite.** Reported
2026-09-21 as *"i just do not get funcionality why there is no upload aread /
button, global component i am asking"*, which is exactly right.
⚠️ THE PLAN SPECIFIED THE DRAG, THE REFUSAL, THE KEYBOARD PATH AND THE COVER,
AND SPECIFIED NO RESTING STATE. Every one of those is about what happens after
somebody has decided to drop something. Nothing said what the page looks like
before that, so nothing was built, and each piece was correct on its own.

🔴 FIVE THINGS TO GET RIGHT AND FOUR WERE ALREADY MEASURED ELSEWHERE HERE.

1. `dragleave` FIRES ON EVERY CHILD, so a boolean flickers: the pointer
   crossing a table row leaves the row and enters the next one, and a cover
   keyed on a boolean blinks all the way down the page. Keep a COUNTER of
   enter minus leave.
2. `preventDefault` ON BOTH `dragover` AND `drop`, ON THE DOCUMENT. Without
   the first the drop event never fires at all; without the second the
   browser NAVIGATES TO THE FILE and the page is gone with whatever was on it.
3. THE COVER IS `position: fixed; inset: 0` AND IS OVER THE CONTROLS, which
   is the `/weight/` and `/floor/` lesson: a full page cover sat over the row
   holding the button that got you out. So it is in the document only while a
   drag is in flight, and it is `pointer-events: none` for its whole life.
4. A REFUSED FILE SAYS SO IN WORDS AND IN THE LOG. Dropping a JPEG has to read
   as *this is not a pack*, never as nothing happening, which is the same rule
   `unzip.mjs` states about an encrypted entry.
5. AND IT TAKES A KEYBOARD PATH, because a drop target that is the only way in
   is a page somebody cannot use. One `<input type="file">` behind a button,
   on the same handler, so there is one code path rather than two.
```

<a id="input"></a>

## `drop.mjs` file input

```text
⚠️ `hidden` RATHER THAN `display: none` ON A CLASS, so a stylesheet cannot
accidentally reveal it, and so the button below is the only way in.
```

<a id="area"></a>

## `drop.mjs` drop area

```text
🔴 THE AREA IS THE COMPONENT'S RESTING STATE AND IT SAYS WHAT MAY BE DROPPED
ON IT. A dashed edge is a target; the words inside name the extensions, so a
refusal is never the first time a reader learns what this takes.
⚠️ THE NOTE LINE IS PART OF IT RATHER THAN THE PAGE'S, so every caller gets
the refusal and the confirmation in the same place with nothing to remember.
It is NEVER EMPTY: it says `nothing has been opened` before anything is, and
that is not politeness. `/wish/` reserved a picture's room with `min-height`
and MEASURED the host at 0 px and `display: none`, beaten by
`.pos-stack > div:empty { display: none }` at (0,2,1), so the log moved on
every answer for hours while the source read as correct. A box with words in
it cannot lose that fight.
```

<a id="note"></a>

## `drop.mjs` drop note footer

```text
🔴 THE NOTE IS A FOOTER ON THE BLOCK, ASKED FOR 2026-09-21 AS *"should be
file uplaod block footer, glued"*. It sat inside the area's padding and it
spans the block now, under a seam, the way a glued pair's second part does.
🔴 AND IT EXISTS ONLY WHEN IT HAS WORDS, which is the other half of the same
instruction: *"rm nothing has been opened"*. A footer with a border and
nothing in it is `positron-ui`'s named defect exactly, **an empty box is a
line**, and a page that opts out of a surface has to opt out of its BOX too.
So the two requests are one mechanism rather than two changes that fight.
⚠️ `hidden` RATHER THAN AN EMPTY STRING, because `.pos-drop-note` carries a
`min-height` and an emptied one would reserve a strip and paint its seam.
```

<a id="hint"></a>

## `drop.mjs` hint placement

```text
🔴 THE HINT SITS UNDER THE BUTTON AND NOT OVER IT, ASKED FOR 2026-09-21 AS
*"put this under a button"*. The order a reader meets is the title, then
the thing to press, then the small print about what may be dropped. It was
the other way round and the extension list was the first thing on the
area, which is the least useful sentence in the block reading first.
⚠️ THE EXTENSIONS STAY IN THE AREA'S OWN TEXT wherever the line lands,
because `/kit/` and `/pack/` both assert that a reader is told what this
takes BEFORE a refusal has to tell them.
```

<a id="body"></a>

## `drop.mjs` drop body

```text
⚠️ THE BODY IS A WRAPPER SO THE FOOTER CAN SPAN THE BLOCK. The area used
to carry the padding and every child sat inside it; a footer inside that
padding is a line with a gap each side of it, which is not a footer.
```

<a id="show"></a>

## `drop.mjs` show

```text
⚠️ THE AREA AND THE COVER LIGHT UP TOGETHER, so a drag that starts far from
the area still points at it. `data-over` is DELETED rather than set empty:
`[data-over]` matches on PRESENCE, and `= ''` is how `video-panel.mjs` kept
a panel in full screen state for the rest of a page's life.
```

<a id="tell"></a>

## `drop.mjs` tell

```text
Everything the component has to say goes through here, so its own line and
the page's log can never disagree about what happened.
⚠️ AND THE FOOTER COMES AND GOES WITH ITS WORDS. Nothing else in here has
to remember that, which is the point of one function saying everything.
```

<a id="listeners"></a>

## `drop.mjs` document listeners

```text
🔴 THE DOCUMENT LISTENERS, AND BOTH `preventDefault` CALLS ARE LOAD BEARING.
```

<a id="onend"></a>

## `drop.mjs` onEnd

```text
⚠️ A DRAG THAT ENDS OFF THE WINDOW FIRES NEITHER `dragleave` NOR `drop` in
every browser, and a cover left standing is a page that looks frozen.
```
