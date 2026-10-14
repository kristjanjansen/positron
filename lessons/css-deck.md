# demo/slides/deck.css: the comments that left the stylesheet

Every comment below was cut from `demo/slides/deck.css` on 2026-10-14 and is kept here verbatim. The stylesheet keeps a short version where one was worth keeping, and a pointer `/* why: lessons/css-deck.md#<anchor> */` to the section below. Line numbers are from before the cut.

<a id="file-header"></a>

### deck.css `file header` (line 1)

````css
/* demo/slides/deck.css, the stylesheet of the slide deck engine.

   Both `/slides/` (the sample and the system) and `/talk/` (the talk about
   positron) link this file and import `/slides/deck.mjs`. Everything a slide
   looks like is here; a page carries no slide CSS of its own.
   plans/plan-slides.md has the research behind every number. */
````

<a id="font-face"></a>

### deck.css `@font-face` (line 8)

````css
/* ONE FACE, JETBRAINS MONO, READ FROM `/shell/vendor/` SINCE 2026-10-12.
   The archive offered seven monospaced faces behind a picker until
   plans/plan-fonts-minimal.md cut the site to two families; the other six and
   this folder's byte-identical copy of JetBrains Mono went, and the deck now
   reads the files the rest of the site ships. Latin subset, 400 and 600,
   @fontsource 5.3.0, SIL OFL 1.1, licence beside them in `shell/vendor/`.
   Nothing on a deck is fetched from another host. */
````

<a id="sl-deck"></a>

### deck.css `.sl-deck` (line 20)

````css
/* THE DECK: the panel and, under it, the speaker notes. It is an inline size
   container so the notes, which sit outside the slide, can still be set at
   the slide's own step 1: in the page the slide is 16:9 and as wide as this
   box, so 4 per cent of its height is 4 x 9 / 16 = 2.25 per cent of this
   box's width. */
````

<a id="sl-panel-pos-vp-stage"></a>

### deck.css `.sl-panel .pos-vp-stage` (line 27)

````css
/* A slide lives inside a video panel's stage. The stage is the size
   container, so the slide is sized off the panel's box and never off the
   window: a panel in a page column on a desk, a panel on a phone and a panel
   filling a projector all get the same slide at a different scale. */
````

<a id="sl-in"></a>

### deck.css `.sl-in` (line 49)

````css
/* The inset is on a box inside the slide and never on the slide itself,
   because a container's query units measure its CONTENT box. MEASURED with
   the padding on the slide: LARGE came out at 7.7 per cent of the slide
   rather than 9, at both widths, because 14 per cent of the height was
   padding the units could not see. */
````

<a id="sl-deck-2"></a>

### deck.css `.sl-deck` (line 60)

````css
/* THE TYPE SCALE: ONE BASE, ONE RATIO, SIX STEPS, AND NO SIZE TYPED TWICE.
   Asked 2026-10-05: *"big type headers / sentences words. figure out type
   scale"*. Every step is the base times the ratio to a power, so each one is
   1.5 times the one under it, well clear of the 25 per cent floor below which
   two neighbouring sizes read as almost the same. The base is 4 per cent of
   the slide's height, twice the 8H rule's 1/50 floor, and the ratio puts the
   old LARGE, 9, exactly on step 3, so evidence keeps the size it had.
   plans/plan-slides.md section 3 has each step's measured px.
     step   size   line   track     use
     --sl-1  4.00  1.45   0         caption, bottom left
     --sl-2  6.00  1.30  -0.005em   evidence with four rows, which does not fit at step 3
     --sl-3  9.00  1.20  -0.01em    evidence: tables, stacks, a list
     --sl-4 13.50  1.10  -0.02em    the headline
     --sl-5 20.25  1.05  -0.03em    a statement slide, the words are the slide
     --sl-6 30.38  1.00  -0.04em    one number
   The two numbers are read back by the self-check, which derives every step
   from them and requires every size on a slide to be one of them.
   THE LINE HEIGHT IS PART OF THE STEP, and it opens as the size drops. Asked
   2026-10-05: *"bit more line height on smaller font"*. A big line is read
   as a shape and its leading is mostly empty ascender room, so it closes up;
   a small line is read as words across a wide measure, and the eye needs
   the extra room to find the start of the next one.
   THE TRACKING IS PART OF THE STEP TOO, and it closes as the size grows.
   Asked 2026-10-05: *"add biit negative letter spaing as bigger we go with
   slides type"*. A face's own spacing is drawn for reading sizes, so at a
   headline the gaps between letters grow with the letters and the word comes
   apart. In em so it scales with the step. A mono face closes up fast, so the
   steps are small: at step 6 the gap is 0.04 of the size, and the letters do
   not touch in any of the seven faces (LOOKED AT in the screenshots). Every
   row of a step gets the same tracking, so a character column still lines up,
   and the self-check measures that from the glyphs. The two scale tokens and
   the three per step are declared on the deck, so the notes under the panel
   read them as well. */
````

<a id="sl-t"></a>

### deck.css `.sl-t` (line 106)

````css
/* The face is a custom property on the deck, so the switcher changes one
   declaration and every slide, full screen and the notes included, follows by
   inheritance. A step is a custom property and `cqh` in it resolves where it
   is used, so every step is a share of the slide it sits on. */
````

<a id="sl-hi"></a>

### deck.css `.sl-hi` (line 118)

````css
/* THE ACCENT: a word or a number that carries the slide's point, and not on
   every slide. Same face, same size, same advance, so a character column
   through it still lines up. MEASURED 12.8:1 on the slide ground and asserted
   at 7:1. */
````

<a id="sl-hue"></a>

### deck.css `.sl-hue` (line 123)

````css
/* A HUE JOINS A WORD TO A BOX IN A DIAGRAM ON THE DECK. Same hue, same
   strength as the diagram's own bold run naming a box (diagram.mjs,
   `tint(hue, TEXT_TINT, 'var(--fg)')`, 62 per cent into the ink), so
   `Cloudflare` in a headline is the colour of the Cloudflare box and of the
   word Cloudflare under it. The hue is a custom property per span; the
   formula is copied from diagram.mjs, which does not export it, and the
   self-check compares every span against the diagram's rendered word, so a
   change there goes red here rather than drifting. */
````

<a id="sl-ev"></a>

### deck.css `.sl-ev` (line 135)

````css
/* The headline sits top left, every slide, same place. What proves it goes
   in the evidence region under it, which takes whatever height is left, and
   it is CENTRED in that region on both axes: the headline is read first and
   left aligned, the evidence is looked at and sits in the middle. */
````

<a id="sl-ev-sl-ev-dg"></a>

### deck.css `.sl-ev.sl-ev-dg` (line 145)

````css
/* MORE AIR ABOVE A DIAGRAM. Asked 2026-10-05 with a screenshot of the
   machines slide: *"bit more space on top of diagram"*. A diagram is boxes
   and lines with no ink of its own at the top edge, so the 4 per cent that
   is plenty above a line of text read as the picture touching the headline.
   The gap is ONE LINE OF STEP 2, `--sl-2` times its line height, 7.8 per cent
   of the slide: derived from the scale and not typed, and nearly twice the
   ordinary 4. The self-check measures headline bottom to picture top. */
````

<a id="sl-ev-sl-st"></a>

### deck.css `.sl-ev > .sl-st` (line 153)

````css
/* A STATEMENT SLIDE HAS NO EVIDENCE: its sentence is the slide, at step 5,
   in the middle of the height the evidence would have taken and still left
   aligned like every headline. Three lines are allowed here and nowhere
   else, because the room a headline gives to evidence is the room a third
   line of a statement takes: 3 x 20.25 x 1.05 is 63.8 per cent of the
   slide, inside the 86 the inset leaves with a caption under it. */
````

<a id="sl-cap"></a>

### deck.css `.sl-cap` (line 163)

````css
/* THE CAPTION, AT STEP 1, IN THE CHOSEN FACE, PINNED BOTTOM LEFT. Asked with
   a screenshot of the diagram slide: *"desc seems off. perhaps write it with
   slide's smallest text font and align to bottom left?"*. It is the last
   child of the column, so the evidence region above it shrinks to make room
   and the caption's left and bottom edges ARE the inset; nothing is
   positioned and no number says where the corner is. */
````

<a id="sl-rows"></a>

### deck.css `.sl-rows` (line 172)

````css
/* MONO DOING WHAT ONLY MONO CAN. A table here is lines of text padded with
   spaces, so a column is a character position and lines up in every face
   with no grid behind it. `white-space: pre` keeps the padding. */
````

<a id="sl-ev-canvas"></a>

### deck.css `.sl-ev > canvas` (line 187)

````css
/* A canvas and a scaled component take the whole region and centre their
   own picture inside it, so they stretch rather than shrink to nothing. A
   direct child only: a canvas a kit component sizes itself (the wave view's,
   the step grid's) is inside `.sl-fit-in` and keeps its own px. */
````

<a id="sl-fit"></a>

### deck.css `.sl-fit` (line 193)

````css
/* A component sized in px (a readout, a diagram, a step grid) is laid out
   at a fixed logical width and scaled to the region, the way a projector
   scales it. The scale is a custom property the page writes, never the
   transform. */
````

<a id="sl-fit-in-pos-dg-cap"></a>

### deck.css `.sl-fit-in .pos-dg-cap` (line 208)

````css
/* WHAT A DIAGRAM BOX IS, WRITTEN AS SLIDE TEXT UNDER ITS COLUMN. Asked
   2026-10-05: *"do not use diagram native descs below but use slides text
   and postion"*. A diagram on a slide carries box names and nothing else:
   no `sub` inside a box and no label on a line, because the diagram's own
   small text is set in px for a page and comes out at a size on no step.
   What the boxes are goes here instead, in the chosen face at step 1, one
   line under each top level box, centred on that box. The x is a custom
   property per line, written by the deck from the box's own rectangle after
   the picture is fitted, never the property itself. */
````

<a id="media-hover-hover-and-pointer-fine"></a>

### deck.css `@media (hover: hover) and (pointer: fine)` (line 234)

````css
/* NO WAY-OUT BUTTON OVER A SLIDE ON A DESKTOP. Asked 2026-10-05: *"do not
   show back-from-fullscreen button in desktop"*. In full screen the panel
   draws `.pos-fsx` over the picture on any movement, and on a projected
   slide it is a button on the talk. A desktop has a keyboard: Escape, `f`
   and F5 leave full screen (the deck's own keys, and the browser's Escape on
   the real API), so the button is not the only way out there.
   ⚠️ ONLY WHERE A FINE POINTER CAN HOVER. On a phone or a tablet the button
   IS the way out: an iPhone has no Escape and no element full screen at all,
   so the fallback cover would be a trap without it.
   (0,2,0), matching `.pos-fsx[data-on="1"]` in shell.css rather than
   outrunning it; that rule sets opacity, not display, so nothing it says is
   contested and the tie is never reached. */
````

<a id="sl-notes"></a>

### deck.css `.sl-notes` (line 260)

````css
/* SPEAKER NOTES, UNDER THE PANEL, SHOWN NOWHERE UNLESS ASKED FOR. `?notes=1`
   in the address shows them; without it the box is `hidden` and takes no
   room. Set at the slide's step 1 in the chosen face (the arithmetic is on
   `.sl-deck` above), so a note reads at the size of the caption it sits
   under. A presenter's laptop shows the page and the projector the full
   screen panel; the notes are never inside the slide. */
````
