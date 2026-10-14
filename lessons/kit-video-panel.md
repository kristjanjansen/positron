# Kit lessons: video-panel.mjs

The long comments cut from `demo/shell/video-panel.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-video-panel.md#<anchor>`.

<a id="header"></a>

## video-panel.mjs, file header

demo/shell/video-panel.mjs — a picture, and a row of three slots under it.

🔴 A PANEL IS A PICTURE PLUS A FOOTER, AND THE FOOTER HAS THREE PLACES.
Asked for 2026-09-17: *"do generic videe panel, witn l c r slots. Right slot
by default is fullcreen button (square!). Left is online status by defaul. No
center default."* Left, centre, right, and a page fills the ones it has
something to say in.

⚠️ THE DEFAULTS ARE WHAT MAKE IT A COMPONENT RATHER THAN A LAYOUT. Every page
with a picture wants the same two things at the bottom of it: whether the
thing feeding it is answering, and a way to make it big. Those are the two
that come for free. The middle is empty by default because there is no answer
that is right for every page, and a slot filled with something generic is
furniture.

🔴 AND THE FULLSCREEN BUTTON IS SQUARE, which was asked for in the same
breath and is not decoration. A button whose width comes from its glyph is a
different width in every font, so a row of controls jumps when the glyph
changes. `.ico` in shell.css fixes it to the control's own height, which is
the same rule `stepper.mjs` follows for its arrows.

🔴 AND A FOURTH PLACE THAT IS NOT IN THE FOOTER AT ALL: `slots.caption`, ON
THE PICTURE, LOW DOWN, WHERE SUBTITLES LIVE. Asked for 2026-09-25 against
`/stage/`: *"Overlay the questions who are appearing on top of video, sort of
a place where usually videos have subtitles and uh, make them more contrasty.
So remove them from video panel footer and move them actually on top of a
video in the lower part."* It is a MOVE and not a new idea: that page already
put its question in `slots.centre`, and the footer is the wrong home for a
thing that arrives, changes and leaves, because the centre slot is a grid
track and a longer question widens the row under the picture.
⚠️ THE FOOTER SLOTS ARE UNTOUCHED AND SO IS `centre`. Three pages fill a
centre slot today and nothing about them changes; this is a fourth place, not
a replacement. `shell.css` at `.pos-vp-cap` carries the contrast numbers,
which are the reason the overlay is a scrim and a plate rather than a
brighter ink.

🔴 AND A PANEL CAN BE ASKED FOR ONE FOOTER AND ONLY ONE: `soloFooter: true`.
Asked in the same breath: *"remove the count time counter from the video
panel, from a footer, and remove a footer as well. So video panel only should
have single footer, which looks and behaves like uh, audience one."*
MEASURED on `/stage/` 2026-09-25, which is what that report is about: the
audience panel is a bare `.pos-vp` with ONE `.pos-vp-foot` under its picture,
and the control room's panel is the same thing wrapped in a `.pos-glue` with
a second part in it: a whole transport bar whose only visible content is an
`output.tbar-time` reading `0:00.000 / 22:11.850`. That bar IS the second
footer and that clock IS the counter, and both come from `glue()` below.
⚠️ SO THE OPTION DOES NOT REMOVE ANYTHING, IT REFUSES. A page asks for one
footer by NOT gluing; what this option adds is that a page which said one
footer and then glues a bar is TOLD, at the call, where the stack still says
who asked. `createTransportBar` already refuses a loop and a loopSlot
together for the same reason.
⚠️ AND IT IS OPT IN, BECAUSE THE OTHER FIVE PAGES ARE NOT ASKING FOR THIS.
MEASURED 2026-09-25 rather than assumed: six pages call `createVideoPanel`
(`held`, `kit`, `making`, `mirror`, `stage`, `weight`, plus `local-remote.mjs`
which only `/kit/` uses), and `glue()` has exactly TWO live callers, `/kit/`'s
specimen at `demo/kit/index.html:2789` and `/stage/`'s control room at
`demo/stage/index.html:1759`. `/kit/` glues on purpose, to demonstrate the
method. So the default is unchanged for all five other pages, and the one
page that must keep gluing is the one whose whole job is to show that it can.

⚠️ FULLSCREEN IS `shell/fullscreen.mjs` AND NOT `requestFullscreen`. That file
exists because an iPhone has NO element Fullscreen API at all: the only thing
that fills an iPhone screen is a `<video>`, and `p.requestFullscreen?.()`
optional-chains straight past the missing method with no throw and no log
line, which is an excellent way to build a control that looks live and is
inert. It falls back to a fixed cover that needs no API and says which ran.

<a id="create-panel-values"></a>

## video-panel.mjs, createPanelValues

🔴 A NAMED VALUE IN A PANEL FOOTER, WHICH WAS ON THREE PAGES AND IN THE KIT
ZERO TIMES. `/mirror/` has `.fact-k` / `.fact-v`, `/blocks/` has `.bl-gpu-k`
/ `.bl-gpu-v` and `/weight/` has `.hd-gpu-k` / `.hd-gpu-v`. Three copies of
one thing, all saying `picture` over a renderer name, and `/blocks/`'s own
comment already names the duplication. CLAUDE.md: a control that exists in
one page and nowhere else is a component nobody has noticed yet.

🔴 AND IT GOES IN THE LEFT SLOT, WHICH IS WHAT `LEFT ALIGNED` MEANS HERE.
Reported 2026-09-20 with a photograph of an iPhone: *"Align glmpu info to the
left"*, over a footer reading `PICTURE Apple GPU   FPS 30.0` in the middle of
a full width picture. The footer is a three track grid and the middle track
is centred BY THE GRID, so no amount of alignment inside that slot moves it:
a row that is to sit against the left edge has to be in the left track. That
is also where `/blocks/` and `/weight/` already put theirs, so this makes the
three agree rather than inventing a fourth arrangement.

🔴 A LABEL IS DROPPED WHEN THE VALUE ALREADY SAYS WHAT IT IS. Pass `label:
''` and no key is drawn. `Apple GPU` needs no word `PICTURE` in front of it;
`30.0` without `FPS` is a bare number. So a row is allowed to be asymmetric,
and that asymmetry is the point rather than something to tidy away.

⚠️ `reserve` IS IN CHARACTERS AND IT IS WHAT STOPS A ROW TWITCHING. A figure
that changes every second must not be able to move the figure beside it, so
the value box holds its widest reading from the start. `tabular-nums` is the
other half: without it a `1` is narrower than a `0` and the number still
shifts inside its own reserved box.
⚠️ AND A CELL IS ALWAYS DRAWN, EVEN WITH NOTHING IN IT. Building a row out of
the facts that happen to be known means the first cell starts at the left
edge and jumps right the moment a second one lands. An empty value under its
own key says "not measured yet", which is true; a zero would be a very
confident measurement of nothing.

@param {Array<{key: string, label?: string, reserve?: number}>} fields

<a id="values-hidden"></a>

## video-panel.mjs, createPanelValues, settle

🔴 THE ROW IS NOT THERE UNTIL SOMETHING HAS BEEN WRITTEN INTO IT, SINCE
2026-09-29. Asked in these words, against a phone screenshot of `/llhls/`
sitting at `STREAM OFF`: *"Do not show video details until we have incomng
data"*. What that picture showed was a picture-shaped hole with a footer
under it reading an empty `fps`, a clipped `H.264 + AA` and a fullscreen
square, about a stream nobody had started.
✅ **AND IT IS THE RULE THIS FILE ALREADY STATES, ENFORCED RATHER THAN
ASKED FOR.** `createPanelValues` refuses an empty `fields` list because
*"a row with nothing in it is a box that paints its edges around nothing"*,
and a row whose every cell is empty is that same box, arrived at from the
other direction. A page no longer has to remember to hide it: the row
appears when the first number lands and goes when the last one is cleared.
⚠️ **IT IS `hidden`, NOT `display: none` IN A STYLESHEET**, so a caller
measuring the row gets 0 rather than a stale rectangle, and so the reason
is readable in the DOM by anybody looking at why the footer is short.

<a id="panel-values-css"></a>

## video-panel.mjs, PANEL_VALUES_CSS bridge

🔴 A BRIDGE, AND IT RETIRES ITSELF. These four rules belong in `shell.css`
beside the rest of `.pos-vp`, and this file could not put them there. So it
asks the stylesheet whether it already carries them and adds them only if it
does not: the day `.pos-vp-k` lands in `shell.css`, this injects nothing and
can be deleted without anything changing. CLAUDE.md's rule about measuring
the COMPUTED value rather than trusting the source is the same instinct: ask
what the browser actually has, do not assume.

⚠️ A CROSS-ORIGIN SHEET CANNOT BE READ and throws on `cssRules`. Treated as
"not ours", which is the safe answer: the worst case is one extra rule that
loses to nothing, because these selectors exist nowhere else.

THE BLOCK TO MOVE, VERBATIM, is `PANEL_VALUES_CSS` below.

⚠️ `.pos-vp-k` LOST ITS CAPS AND ITS TRACKING ON 2026-09-25, with every other
readout key and control label in `shell.css`. It is a readout KEY in a panel
footer, and the owner's chosen scope for *"no uppercase"* was every button on
the site, previewed with tabs, buttons, badges and readout keys all losing
theirs. The tracking went with the caps, which is the one rule that pass
followed everywhere: `letter-spacing: .1em` existed to open out tracked caps
and lowercase mono does not want it.
⚠️ AND IT HAS TO BE CHANGED HERE BECAUSE THIS SHIM IS WHERE THE RULE LIVES.
`.pos-vp-k` is in NO stylesheet, so the check below never finds it and this
block is injected on every page that builds a panel value row. A sweep of
`shell.css` could not have reached it.

<a id="idle-ms"></a>

## video-panel.mjs, IDLE_MS

How long the way out stays up after the last movement.

⚠️ IT IS `fullscreen.mjs`'s NUMBER NOW, NOT A SECOND ONE. This file used to
type 2200 beside a hand-rolled close button; that button is gone and the
shared piece owns the timer, so a page reading this constant and a page
watching the button cannot disagree about when it fades.

<a id="full-modes"></a>

## video-panel.mjs, FULL_MODES

🔴 TWO WAYS TO BE FULL, AND A PAGE SAYS WHICH. Asked for as *"two modes in
api: just fullscreen and close fullscreen butyon on right corner on pointer
activity and mode where footer stays"*.

 'bare'    the picture and nothing else. The way out is the platform's:
           Escape, or the phone's own gesture.
 'hover'   a square ⛶ in the bottom right, up whenever a hand has moved and
           faded when it has not. Nothing else is drawn.
 'footer'  the footer stays visible, so the slots a page put there keep
           working while it is full, and a second storey under it carries
           the controls the page normally keeps in its own control row.

⚠️ `bare` IS NOT THE SAFE DEFAULT AND IS NOT THE DEFAULT. A picture filling
the screen with no visible way out is the shape of control this project has
already been bitten by in a headset, where the rule is that a page owns its
own way out rather than telling somebody to find a system gesture. `hover` is
the default: the way out is there the moment a hand moves.

🔴 THERE IS NO FOURTH MODE, AND THIS IS THE CHOICE THAT WAS MADE INSTEAD.
The ask was for a way out on a phone, and the two readings offered were a new
mode or teaching `hover` that a touch device has no hovering pointer. Neither
was taken, because both leave TWO close buttons in the project: `hover`'s own
close button IS the shared piece now (`createFullscreenExit`), moved from the
top right to the bottom right where it was asked for, wearing ⛶ rather than
✕ so it pairs with the control that got you in. One button, one behaviour,
one file, and `/weight/` and `/floor/` mount the same piece on a bare canvas.

⚠️ AND `footer` GETS IT ONLY WHEN ITS OWN ROW HAS NO WAY OUT. The right slot
holds a ⛶ by default and that row is on screen in this mode, so a second
square in the picture above it is two controls doing one thing. A page that
overrides the right slot has taken that button away, and then the piece is
what keeps the promise that every mode but `bare` has a visible way back.

<a id="opt-aspect"></a>

## video-panel.mjs, createVideoPanel, aspect

🔴 THE SHAPE OF THE PICTURE BOX, WHEN IT IS NOT 16:9. Added 2026-09-18 for
`/stage/`, whose film and canvas are both 4:3: *"add moer height (cut from
sides)"*. Without it the box stays 16:9 and `object-fit: contain` puts the
pillars back one level out, in CSS, where the page cannot see them.
⚠️ IT IS A CSS RATIO STRING, THE SAME SPELLING AS THE STYLESHEET'S, and
`null` leaves the stylesheet alone. A page passing nothing is untouched.

<a id="opt-values"></a>

## video-panel.mjs, createVideoPanel, values

🔴 NAMED VALUES, IN THE LEFT SLOT, WHICH IS WHERE LEFT ALIGNED LIVES.
`[{ key, label, reserve }]`. See `createPanelValues` at the top of this
file for why the label may be empty and why the row goes left rather than
centre. They sit AFTER the presence dot when there is one, so the fact
about the source still leads the row.

<a id="opt-solo-footer"></a>

## video-panel.mjs, createVideoPanel, soloFooter

🔴 ONE FOOTER AND ONLY ONE. See the note at the top of this file for the
measurement that bought it. `true` makes `glue()` THROW rather than build a
second storey under the footer, so a page that has declared a single
audience-style footer cannot quietly grow a second one again.
⚠️ IT SAYS NOTHING ABOUT WHAT THE FOOTER CONTAINS. The slots are still the
page's, and "looks and behaves like the audience one" is two other
decisions that already have their own options: the same three slots, and
`fullMode: 'footer'`, which is what keeps the row on screen while the
picture is full. `hover` takes the footer away, which is the behaviour the
audience panel does NOT have.

<a id="aspect-property"></a>

## video-panel.mjs, --vp-aspect custom property

🔴 A CUSTOM PROPERTY, NOT `stage.style.aspectRatio`. An inline
`aspect-ratio` beats every selector in the stylesheet, including
`.pos-vp[data-full] .pos-vp-stage { aspect-ratio: auto }` which exists
three lines from it and is the rule that lets a panel fill a screen. So a
panel that was given a shape could never give it up: MEASURED 2026-09-19,
`/making/`'s 1:1 picture box stayed square on a 16:9 display, its picture
sat high, and `.pos-fsx` is `position: absolute` INSIDE the stage, so the
way out went up there with it. Reported as two things and it was one.
⚠️ THE FALLBACK IS IN THE STYLESHEET, not here. `var(--vp-aspect, 16 / 9)`
keeps the default in one place and means a panel with no aspect sets no
property at all.

<a id="caption-slot"></a>

## video-panel.mjs, caption slot

🔴 THE CAPTION SLOT, AND IT IS INSIDE THE STAGE RATHER THAN INSIDE THE
PANEL. Two reasons, both measured elsewhere in this file. The stage is the
element that keeps filling the screen when the panel goes full
(`.pos-vp[data-full] .pos-vp-stage { height: 100% }`), so a caption in here
travels with the picture instead of being left in a box the picture has
grown out of. And `.pos-fsx`, the way back out, is already
`position: absolute` in this same stage, so this is the arrangement that is
known to work rather than a second one.
⚠️ ALWAYS BUILT, NEVER CONDITIONAL. `.pos-vp-cap:empty { display: none }`
means an unused slot draws nothing at all, so there is no option to
remember and no page that has to opt in to being able to say something.

<a id="tag-slot"></a>

## video-panel.mjs, tag slot

🔴 THE TAG SLOT, ON THE PICTURE, TOP LEFT, FOR ONE SHORT STATUS ABOUT THE
PICTURE ITSELF. Added 2026-10-05 for `/stage/`, asked as *"perhaps just
visual indication of picture happening"*. The footer badge says whether a
show is on air; whether frames are actually reaching this screen is a fact
about the picture, and it belongs on the picture, where it stays visible
when `hover` has taken the footer away in full screen.
⚠️ TOP LEFT, BECAUSE THE OTHER THREE PLACES ARE TAKEN. `.pos-fsx` owns the
bottom right and the caption owns the bottom edge.
⚠️ ALWAYS BUILT, AND EMPTY DRAWS NOTHING, the caption's own rule: the five
other pages that build a panel get one empty element with `display: none`.

<a id="centre-symbol"></a>

## video-panel.mjs, fullscreen button centring

⚠️ CENTRED ON ITS INK, WHICH THIS BUTTON WAS NOT UNTIL 2026-09-19. U+26F6
is drawn small and high in a box sized for a capital, so `place-items:
center` put it up and left of where the eye expects. `mount()`'s control
row and the fullscreen exit have both done this for a while and the
panel's own ⛶ was the one that had not, which nobody could see until a
second glyph button was put beside it: one centred on its ink next to one
centred on its box is a disagreement you can measure with a ruler.

<a id="under-slot"></a>

## video-panel.mjs, the second storey

🔴 THE SECOND STOREY, WHICH IS ONLY THERE WHILE FULL. Asked 2026-09-19 with
a photograph of `/mirror/` filling an iPhone: *"extend videopanel footer in
fullscreen so it can have section below the footer bar (separaet with
line). put controlgroup there"*.

🔴 IT IS THE PAGE'S OWN ELEMENT, MOVED, NEVER A COPY. Two rows of buttons
that can disagree about which option is chosen is a readout living in two
files, which is a defect this project has already named. So the panel
remembers where the element came from and puts it back on the way out.

<a id="exit-btn"></a>

## video-panel.mjs, the exit piece

The way back out, and the same piece `/weight/` and `/floor/` mount on a bare
canvas. See FULL_MODES for why there is no fourth mode and why this is the
bottom right rather than the top.

<a id="exit-active"></a>

## video-panel.mjs, exitBtn.active at build

⚠️ SET HERE AS WELL AS IN `syncFull`, and not because the button can be seen
yet. `syncFull` fires `onFull`, which a page has not subscribed to at the
moment this file is still building the panel, so the state has to start
right rather than wait for the first change to correct it.

<a id="surface"></a>

## video-panel.mjs, surface

🔴 WHAT THIS PANEL IS AS ONE OBJECT, WHICH IS THE PANEL UNTIL SOMETHING IS
GLUED UNDER IT. `createStripView` has carried a `surface` for the same
reason since it gained a footer: what a page moves, hides or measures is
the whole thing, and after a glue that is no longer the element the
component was built around.

<a id="slots"></a>

## video-panel.mjs, api.slots

The three footer slots, so a page can fill or empty one after the fact,
plus `caption`, which is NOT in the footer: it is the overlay on the
lower part of the picture, where subtitles live. Fill it the same way:
`panel.slots.caption.append(node)`, and empty it with
`panel.slots.caption.textContent = ''`, which makes it draw nothing.

<a id="footers"></a>

## video-panel.mjs, api.footers

How many full-width rows are stacked under the picture: the panel's own
footer, plus anything `glue()` has put beneath it.

⚠️ A NUMBER RATHER THAN A BOOLEAN, so a page can ASSERT the count instead
of believing it. `/stage/` was reported as having two footers and nothing
on the page could say so; `footers() === 1` is the claim in one reading.

<a id="glue"></a>

## video-panel.mjs, api.glue

Join blocks UNDER this panel so the panel and they read as one surface.

🔴 ASKED FOR 2026-09-19: *"make transportbar glueable to videopanel
footer"*. A film's play and stop belong to the picture, and two bordered
boxes with the page rhythm between them say they are two things. Glued,
the panel's footer and the bar under it are one object with one edge and
a 1 px seam, which is the same seam the footer already has above it.

🔴 IT WRAPS IN PLACE, WHICH IS THE WHOLE REASON THIS IS A METHOD RATHER
THAN A PAGE CALLING `createGlue` ITSELF. A panel is usually already in
the document by the time a page has built the bar that belongs to it, and
a glue built the other way has to be re-appended, which puts it at the
END of wherever it lands: on a tabbed page that is below the form and the
diagram rather than where the picture was.
⚠️ A GLUE OF ONE BLOCK IS THAT BLOCK, so a page that calls this with
nothing real gets the panel back unwrapped and no second border.
⚠️ AND IT IS NOT `under()`. That one moves a page's controls into the
panel WHILE IT IS FULL and hands them back after; this one is the
ordinary layout, on screen the whole time.

<a id="glue-refuse"></a>

## video-panel.mjs, api.glue, soloFooter refusal

🔴 REFUSED HERE, NOT IGNORED, AND NOT AT CONSTRUCTION. A page declares
`soloFooter` where it builds the panel and glues somewhere else
entirely, often hundreds of lines later, so this is the call whose
stack names the line that has to change. Doing nothing instead would be
a silent refusal, which is the shape this project calls a lie: the page
would read as though it had a second footer and not have one.

<a id="glue-marker"></a>

## video-panel.mjs, api.glue, the marker

🔴 A MARKER, NOT THE NEXT SIBLING, AND `/kit/` FOUND THIS ON THE FIRST
RUN. The obvious way to remember a place is to hold the node after it
and `insertBefore` that one afterwards. Here the node after the panel is
usually the very bar being glued, `createGlue` MOVES it, and
`insertBefore` then throws `the node before which the new node is to be
inserted is not a child of this node`. `section()` catches that, so the
specimen reads as a component that would not build.
⚠️ `/stage/` DID NOT MEET IT, because there the panel's next sibling is
another block entirely and the bar is appended past it. One caller
passing is not the same as the method working.

<a id="under"></a>

## video-panel.mjs, api.under

The second storey: one element, shown under the footer bar while this
panel is full in `footer` mode and nowhere else.

🔴 HAND IT THE ELEMENT THE PAGE ALREADY HAS. It is MOVED into the panel
and moved back to where it came from on the way out, so the buttons in it
are the same buttons, with the same state and the same asserts, rather
than a full-screen copy that can disagree with the row above. Off screen
the page keeps them in its ordinary control row, which is where a visitor
who is not in full screen looks for them.
⚠️ `null` HANDS BACK WHATEVER IT WAS HOLDING, so a page can take its
controls home without tearing the panel down.

<a id="full"></a>

## video-panel.mjs, api.full

Go full, or come back. Returns what actually happened.

🔴 IT SYNCS THE STATE ITSELF RATHER THAN WAITING TO BE TOLD, AND THAT WAS
THE IPHONE BUG. PHOTOGRAPHED 2026-09-17: the picture in a 16 by 9 box at
the top of the screen, the page's own readout and tabs showing through
underneath, and the two slots stranded at the far edges.

`watch()` listens for `fullscreenchange` and `webkitfullscreenchange`, and
NEITHER FIRES ON THE FALLBACK PATH. An iPhone has no element Fullscreen
API at all, so `fullscreen.mjs` covers the screen with a fixed element
instead, and that is a class change with no event behind it. So on the one
platform the fallback exists for, the attribute every rule below keys on
was never set: the stage kept its aspect ratio, the footer sat under it,
and the rest of the cover was transparent.
⚠️ THE EVENT PATH STAYS TOO. A real fullscreen can end without this page
asking, by Escape or a phone gesture, and only the event knows about that.

<a id="sync-full"></a>

## video-panel.mjs, syncFull

⚠️ THE STATE IS READ BACK, NEVER ASSUMED. `isFull` asks the document and the
element's own class, so this follows what is actually true rather than what
was last requested. Called from both paths: after this page asks, and when
the browser tells us.

<a id="data-full-removed"></a>

## video-panel.mjs, syncFull, data-full removed

🔴 THE ATTRIBUTE IS REMOVED, NOT EMPTIED. This was `root.dataset.full =
full ? fullMode : ''` and that is a bug with a plain name: **`[data-full]`
matches an attribute whose value is the empty string.** Every fullscreen
rule in `shell.css` is written `.pos-vp[data-full] …`, so a panel that
had been full ONCE kept `border: 0`, `background: #000`, a stage with no
aspect ratio and, since 2026-09-19, `width: 100%` — for the rest of the
page's life.
⚠️ IT SURVIVED BECAUSE NOBODY LOOKED AFTER COMING BACK. Entering is what
gets tested; the state that is wrong is the one AFTER leaving, and it is
wrong in a way that reads as a styling choice rather than as a fault.
Found by a check asserting the panel took its own shape back.

<a id="exit-active-every-time"></a>

## video-panel.mjs, syncFull, exitBtn.active

⚠️ `active` IS ASKED EVERY TIME RATHER THAN ONCE AT BUILD, because `mode()`
can change the answer while the panel is already full. It reads the state
back itself, which is the faux path's only way of being told: a class
change has no event behind it.

<a id="place-under"></a>

## video-panel.mjs, placeUnder

Move the page's element into the second storey, or put it back.

⚠️ THE OLD SIBLING MAY HAVE GONE. A page is free to rebuild its control row
while the panel is full, and `insertBefore` throws on a reference node that
is no longer a child. A missing sibling means the end of the row, which is
where a control that was last in the row belongs anyway.
⚠️ AND AN ELEMENT THAT HAD NO HOME STAYS HERE. A page that hands over an
element it never put on the page has given the panel ownership of it;
removing it would be the panel deleting something nobody else holds.
