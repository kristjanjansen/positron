# Kit lessons: oled-view.mjs

The long comments cut from `demo/shell/oled-view.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-oled-view.md#<anchor>`.

<a id="header"></a>

## oled-view.mjs, file header

demo/shell/oled-view.mjs, the router's 128x64 panel drawn on a page.

🔴 LIFTED OUT OF `/kit/`, 2026-10-06, FOR THE KIT SPLIT (plans/plan-kit-split.md
section 7 step 1). These were page functions in `demo/kit/index.html` and two
parts read them: HARDWARE draws the emulator's screen and the screen parts
with them, and SLIDES draws the OLED slide with them. Once the parts are
separate pages they cannot share a page function, so the helpers are a
module and both pages import it.
⚠️ MOVED VERBATIM, comments included. The only change is that `hwPartsLoad`
and `hwPart` used to close over the page's `hw` object and its `d.log`, so
they are made by `createOledParts(hw, { log })` and read the same fields of
the same object: a page that writes `hw.oled`, `hw.parts`, `hw.partsFetched`
and `hw.partsFrom` keeps writing them, and its checks keep reading them.
⚠️ `/kit/` STILL CARRIES ITS OWN COPIES until step 4 of that plan, when the
monolith becomes the SLIDES page. That duplication is temporary and named in
the plan so nobody tidies it early.
⚠️ THE STYLES ARE `.kit-oled`, `.kit-oled-pair` and `.kit-oled-fig` in
`demo/shell/kit-page.css`, beside the other `.kit-*` rules they came with.

<a id="oled-canvas"></a>

## oled-view.mjs, oledCanvas

🔴 PIXEL EXACT, SO THE SCALE IS A WHOLE NUMBER. The canvas holds 128x64
and is drawn `image-rendering: pixelated` at k times that, where k is the
largest whole number that fits the box, 1 to 4. A fractional scale would
make some panel pixels one screen pixel wider than their neighbours, which
on a 5 pixel glyph is a letter visibly wider on one side.
⚠️ AND A BOX WITH NO WIDTH YET IS NOT A NARROW BOX: inside a closed tab the
stack measures 0, and that is skipped rather than read as a phone.
A 128x64 canvas in `box`, blank, scaled by a whole number to fit it, so
every panel pixel is the same size on screen. Lifted 2026-10-14 from
/synth/dots/ for /connect/. The box's own rule gives it a size.

<a id="frame-chrome"></a>

## oled-view.mjs, oledCanvas, the frame's chrome

⚠️ THE FRAME'S OWN PADDING AND BORDER, READ AS STYLE AND NOT AS
`screen.offsetWidth - cv.offsetWidth`: the frame is `max-width: 100%`,
so once the canvas is wider than the box that difference goes
negative and asks for a BIGGER scale. MEASURED at 375 px: a 512 px
panel in a 310 px box, 179 px of the page dragged sideways.

<a id="shared-row"></a>

## oled-view.mjs, oledCanvas, panels sharing a row

⚠️ SEVERAL PANELS IN ONE ROW SHARE THE ROW, so each is sized off the
      row and not off its own cell: a cell sized by the canvas inside it is a
      loop, and MEASURED at 756 px it settled with the second panel a scale
      larger than the first and 154 px of the page dragged sideways. Two to a
      row only while both fit at 2x, else one under the other.

<a id="create-oled-parts"></a>

## oled-view.mjs, createOledParts

🔴 THE ROUTER'S SCREEN, ONE PART AT A TIME, 2026-10-04. Asked as *"Break
down hw ui some more on kit"*. Every picture below is drawn by
`rig/pico/firmware/ui.c` itself, compiled a second time to WebAssembly
(`/resources/pico/oled-ui.wasm`, 7.7 KB, no imports), not by a JavaScript
copy of it. `rig/pico/firmware/wasm/test.mjs` compares the two compilations
with the emulated board pixel for pixel, and a check at the foot of this
file does it again here.
⚠️ FETCHED WITH THE FIRMWARE, WHEN HARDWARE IS OPENED, NEVER ON A VISIT.
🔴 OR WHEN SLIDES IS OPENED, SINCE 2026-10-05, because the OLED slide shows
ui.c's LINK screen (*"oled"*, from the slides list, item 7). A tab press is
a person's press either way. Once, whichever tab asks first: the second
caller finds `partsFetched` set and returns, and the first one's arrival
draws every registered part, the slide's included. `partsFrom` says which.

`hw` is the page's own state object and these two read and write the fields
they always did: `oled`, `parts`, `partsFetched` and `partsFrom`.
