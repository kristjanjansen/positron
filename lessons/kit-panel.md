# Kit lessons: panel.mjs

The long comments cut from `demo/shell/panel.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-panel.md#<anchor>`.

<a id="header"></a>

## panel.mjs, file header

demo/shell/panel.mjs — a picture with a footer of real numbers under it.

`plans/plan-xr-room.md` §2 says the room's panels are "like `mirror`'s: a picture
with a footer of real numbers under it — that already exists as a design and
it reads well, so the room borrows rather than invents". This is that design,
extracted, so the borrowing is a module rather than a resemblance.

🔴 IT DRAWS TO A CANVAS, WHICH IS WHY IT WORKS IN BOTH PLACES. A page can put
the canvas on screen; an immersive session can hand the same canvas to
`texImage2D` and hang it in the room. `scene` already does exactly that for
its status panel — a 2D canvas uploaded as a texture — because THE 2D PAGE IS
INVISIBLE INSIDE AN IMMERSIVE SESSION: `d.log` and the readout are behind
your face, so anything you need to read while wearing the headset has to be
drawn in the scene.

⚠️ CONTAINED, NEVER COVERED OR STRETCHED. The rule `pattern.mjs` paid for:
iOS ignores a resolution request and hands back PORTRAIT, where stretching
squashes a face and `cover` showed 32% of the frame. One line of arithmetic
said so before it shipped and nobody did it.

⚠️ THE FOOTER CARRIES WHAT THIS PANEL MEASURED, NEVER INSTRUCTIONS. Same rule
as a strip's gutter: `latency 2.31 s` or an honest `no way to check`, not
"press play". A panel that has nothing to say says so in words, because a
blank cell collapses "we did not look" and "we looked and it was fine".

⚠️ AND A PANEL THAT IS NOT LIVE SAYS SO. `plans/plan-xr-room.md` §5.6: a frozen
frame reads as a broken stream. `state` is drawn where you cannot miss it.

<a id="no-pad"></a>

## panel.mjs, no pad around the picture

🔴 NO PAD AROUND THE PICTURE. A panel in a headset is a SCREEN, and a screen
with a margin around its image reads as a photograph of a screen. The picture
goes edge to edge and the only inset is the footer's own text. Reported from
the device, and it is the same instinct that took the border off a television.

<a id="footer-into"></a>

## panel.mjs, `footerInto()`

🔴 THE FOOTER, ONCE, FOR THE PANELS THAT HAVE A PICTURE ABOVE IT AND FOR THE
ONES THAT DO NOT.

A panel whose picture is RENDERED by the graphics card rather than drawn on a
canvas cannot carry a word — a framebuffer has no text in it — so its numbers
have to arrive as a second, much smaller texture. That strip has to look
exactly like the footer under every other panel here, and the only way two
surfaces look exactly alike is if they are one function.

⚠️ FIXED COLUMNS, so two panels side by side can be read across. A column
that sizes to its content is the alignment bug the slider group had.

<a id="footer-absent"></a>

## panel.mjs, `footerInto()`, an absent value

⚠️ NOTHING, NOT A ZERO. A missing measurement prints as ABSENT — a
zero reads as a very impressive measurement of nothing. It drew an em
dash until 2026-09-13; the label above the slot already says the slot
is there, and a column of dashes reads as failed readings.

<a id="create-panel-footer"></a>

## panel.mjs, `createPanelFooter()`

A footer strip on its own — the bottom of a panel, with no picture over it.

For a panel whose picture is a framebuffer in a headset session's own
context. It is a NINTH of a full panel's pixels and it is handed to the card
only when a number moves rather than every frame, which is most of why a
live-rendered panel costs no copy worth measuring. `dirty()` is the version
an XR render loop compares against its last upload.

<a id="draw-no-title"></a>

## panel.mjs, `draw()`, no title in the corner

── whether it is live ───────────────────────────────────────────────
🔴 NO TITLE IN THE CORNER. It sat over the picture, which is the one
thing a panel exists to show, and it said something that never changed —
the same rule as a readout cell that cannot move. What the panel IS
belongs in the footer beside its numbers, where it is read once.
