# Kit lessons: fullscreen

The longer comments cut from `demo/shell/fullscreen.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-fullscreen.md#<anchor>`.

<a id="header"></a>

## `fullscreen.mjs` module header

```text
demo/shell/fullscreen.mjs — make an element fill the screen, on a browser
that may have no Fullscreen API at all.

🔴 iPHONE SAFARI HAS NO ELEMENT FULLSCREEN. `Element.requestFullscreen` is
undefined there and so is `webkitRequestFullscreen`; the only thing that goes
fullscreen on an iPhone is a <video>, through the non-standard
`HTMLVideoElement.webkitEnterFullscreen()`, which hands the media to the
system player. iPad is different — iPadOS does carry the prefixed element
API — so "iOS" is the wrong unit and the capability has to be ASKED.

mirror's ⛶ therefore did nothing on an iPhone: `p.requestFullscreen?.()`
optional-chains straight past a missing method, so there was no throw, no
`catch`, no log line and no picture — a button that looks live and is inert,
which is the exact failure shape this repo keeps writing rules about.

So there are two paths and the caller is told which one ran:

  'element' — the real Fullscreen API (standard or -webkit- prefixed)
  'faux'    — position:fixed over the viewport, which needs no API at all

⚠️ THE CLASS IS THE ONLY STYLING HOOK, NOT `:fullscreen`. A rule written
`.pane:fullscreen, .pane.pos-full { … }` is DROPPED ENTIRELY by any browser
that does not recognise `:fullscreen` — one unknown selector invalidates the
whole list — so grouping them would take the fallback down on precisely the
browsers that need it. Both paths set `.pos-full`; faux adds `.pos-faux` for the
positioning it alone requires.
```

<a id="import"></a>

## `fullscreen.mjs` symbol import

```text
⚠️ ONE IMPORT, AND IT IMPORTS NOTHING BACK. `symbol.mjs` is the bottom of the
kit's dependency graph, so reaching it from here cannot make a cycle in the
frame every page mounts.
```

<a id="toggle"></a>

## `fullscreen.mjs` toggle

```text
Toggle. Returns the path taken — 'element', 'faux', or 'exit'.

⚠️ The real API is tried FIRST and awaited, because its promise is how a
refusal arrives (a gesture that was not a gesture, a permissions policy).
Falling back on rejection rather than only on absence means a browser that
HAS the API and declines to use it still ends up with a full-screen picture.
```

<a id="watch"></a>

## `fullscreen.mjs` watch

```text
Keep the class honest when the user leaves by a route we did not drive —
Escape, the system chrome, a swipe. Without this the pane keeps its
fullscreen layout while no longer being fullscreen, which is worse than
never having gone.

Escape is handled by hand for the faux path only: the real API takes Escape
itself, and a second handler would fight it.
```

<a id="exit"></a>

## `fullscreen.mjs` EXIT_IDLE_MS, the way back

```text
── the way back, on a device with no Escape key ─────────────────────────
   🔴 REPORTED FROM AN IPHONE, 2026-09-19: *"I can not leave fullscreen on
   mobile"*, with a photograph of `/weight/` filling the screen. The mechanism is
   two facts above meeting: an iPhone always takes the faux path, and the faux
   cover is `position: fixed; inset: 0` OVER the control row holding the button
   that got you in. The only exit wired anywhere was the `keydown` Escape in
   `watch()`, and two pages had each hand-rolled a badge that says the word
   Escape to somebody holding a device that has no such key, and then fades
   itself out. So on a phone the page was a trap.

   🔴 IT IS ONE PIECE HERE AND `video-panel.mjs` OFFERS IT AS A MODE, WHICH WAS
   DIRECTED: *"that close fullcreen on mobile standalone button can just be a
   mode of fullscreen videopanel component"*. A mode is what a page author sees.
   The reason it is not ONLY a mode is `/weight/` and `/floor/`, which cover the
   screen with a bare canvas and have no panel at all, so a mode on the panel
   would not reach the two pages the report came from.

   🔴 EVERY PATH, NOT ONLY FAUX. Android Chrome takes the ELEMENT path and has
   no Escape key either, so gating this on the fallback would leave the second
   commonest phone in the same trap. A faded square costs a desktop nothing.

   ⚠️ IT IS IN THE DOM FROM THE START AND ONLY ITS OPACITY MOVES, which is the
   decision `video-panel.mjs` already made for its own close button: a button
   added and removed on pointer movement is layout work at the rate a hand
   moves, and this project's standing rule is that nothing redrawing that often
   may change how much room it takes.

   ⚠️ AND WHILE IT IS FADED IT IS `pointer-events: none`. Without that, the
   bottom right corner of the picture silently exits full screen for somebody
   who was reaching for the picture, which is a control that fires when nobody
   pressed it. The rule is in shell.css beside `.pos-fsx` and `/kit/` grades it
   by measuring the faded button rather than by reading the stylesheet.
```

<a id="createfullscreenexit"></a>

## `fullscreen.mjs` createFullscreenExit

```text
A square way out, bottom right, inside the thing that went full.

One line is the whole call for a page that covers itself with a bare canvas:

    createFullscreenExit(wrap);

@param {Element} host  where the button is appended AND what it is positioned
  against. 🔴 INSIDE THE ELEMENT THAT WENT FULL, NEVER `document.body`: in
  real element fullscreen nothing outside that subtree is on screen, so a
  button anywhere else is invisible on exactly the path where it is the
  fallback rather than the only exit.
@param {object} [o]
@param {Element} [o.of]        the element whose fullness it follows and
  leaves. Defaults to `host`; a video panel passes its root and mounts the
  button in the picture, so the button never lands on top of its own footer.
@param {() => void} [o.onExit] called after the screen has been given back.
@param {number} [o.idleMs]
@param {string} [o.glyph]
@param {string} [o.aria]
@returns {{el: HTMLButtonElement, wake: () => void, sync: () => void,
           active: (yes?: boolean) => boolean, destroy: () => void}}
```

<a id="centre"></a>

## `fullscreen.mjs` centreSymbol

```text
⚠️ CENTRED ON ITS INK, not on its box, which is what `shell.mjs` does for
the ⛶ in its own control row. U+26F6 is drawn small and high in a box sized
for a capital, so `place-items: center` puts it up and to the left.
```

<a id="host-position"></a>

## `fullscreen.mjs` host position

```text
🔴 THE BUTTON IS `position: absolute`, SO THE HOST HAS TO BE A CONTAINING
BLOCK. A static host would send it to whatever positioned ancestor lies
OUTSIDE the fullscreen element, which in element fullscreen is not on
screen at all. Giving a static element `position: relative` moves neither
it nor anything in its flow; it only decides where an absolutely positioned
descendant measures from, which is the whole intent. The faux cover is
already `fixed` and the panel's picture is already `relative`, so this fires
on a bare wrapper and nowhere else.
```

<a id="sync"></a>

## `fullscreen.mjs` sync

```text
Read the truth back and follow it. Called by this module on the events the
 real API fires, and BY THE CALLER on the faux path, where a class change
 has no event behind it.
```

<a id="wake"></a>

## `fullscreen.mjs` WAKE

```text
⚠️ ON THE DOCUMENT AND IN THE CAPTURE PHASE. The thing filling the screen is
usually a canvas that handles its own gestures, and a handler that stops
propagation would otherwise starve the timer that brings the way out back.
```

<a id="click"></a>

## `fullscreen.mjs` exit click

```text
⚠️ THE PRESS STOPS HERE. The host under it is a picture a page drives with
pointer events, and a press that both leaves full screen and paints a stroke
is one gesture doing two things.
```

<a id="initial-sync"></a>

## `fullscreen.mjs` initial sync

```text
⚠️ READ THE TRUTH ONCE BEFORE ANYBODY TOUCHES ANYTHING. A piece mounted on
something that is ALREADY full would otherwise stay invisible until the
next event, which on the faux path is an event that never comes.
```
