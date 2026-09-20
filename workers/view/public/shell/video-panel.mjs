// demo/shell/video-panel.mjs — a picture, and a row of three slots under it.
//
// 🔴 A PANEL IS A PICTURE PLUS A FOOTER, AND THE FOOTER HAS THREE PLACES.
// Asked for 2026-09-17: *"do generic videe panel, witn l c r slots. Right slot
// by default is fullcreen button (square!). Left is online status by defaul. No
// center default."* Left, centre, right, and a page fills the ones it has
// something to say in.
//
// ⚠️ THE DEFAULTS ARE WHAT MAKE IT A COMPONENT RATHER THAN A LAYOUT. Every page
// with a picture wants the same two things at the bottom of it: whether the
// thing feeding it is answering, and a way to make it big. Those are the two
// that come for free. The middle is empty by default because there is no answer
// that is right for every page, and a slot filled with something generic is
// furniture.
//
// 🔴 AND THE FULLSCREEN BUTTON IS SQUARE, which was asked for in the same
// breath and is not decoration. A button whose width comes from its glyph is a
// different width in every font, so a row of controls jumps when the glyph
// changes. `.ico` in shell.css fixes it to the control's own height, which is
// the same rule `stepper.mjs` follows for its arrows.
//
// ⚠️ FULLSCREEN IS `shell/fullscreen.mjs` AND NOT `requestFullscreen`. That file
// exists because an iPhone has NO element Fullscreen API at all: the only thing
// that fills an iPhone screen is a `<video>`, and `p.requestFullscreen?.()`
// optional-chains straight past the missing method with no throw and no log
// line, which is an excellent way to build a control that looks live and is
// inert. It falls back to a fixed cover that needs no API and says which ran.

import { el } from './shell.mjs';
import { createPresence } from './presence.mjs';
import { createGlue } from './glue.mjs';
import { centreSymbol } from './symbol.mjs';
import {
  toggle as fsToggle, exit as fsExit, isFull, watch as fsWatch, support,
  createFullscreenExit, EXIT_IDLE_MS,
} from './fullscreen.mjs';

/**
 * How long the way out stays up after the last movement.
 *
 * ⚠️ IT IS `fullscreen.mjs`'s NUMBER NOW, NOT A SECOND ONE. This file used to
 * type 2200 beside a hand-rolled close button; that button is gone and the
 * shared piece owns the timer, so a page reading this constant and a page
 * watching the button cannot disagree about when it fades.
 */
export const IDLE_MS = EXIT_IDLE_MS;

/**
 * 🔴 TWO WAYS TO BE FULL, AND A PAGE SAYS WHICH. Asked for as *"two modes in
 * api: just fullscreen and close fullscreen butyon on right corner on pointer
 * activity and mode where footer stays"*.
 *
 *   'bare'    the picture and nothing else. The way out is the platform's:
 *             Escape, or the phone's own gesture.
 *   'hover'   a square ⛶ in the bottom right, up whenever a hand has moved and
 *             faded when it has not. Nothing else is drawn.
 *   'footer'  the footer stays visible, so the slots a page put there keep
 *             working while it is full, and a second storey under it carries
 *             the controls the page normally keeps in its own control row.
 *
 * ⚠️ `bare` IS NOT THE SAFE DEFAULT AND IS NOT THE DEFAULT. A picture filling
 * the screen with no visible way out is the shape of control this project has
 * already been bitten by in a headset, where the rule is that a page owns its
 * own way out rather than telling somebody to find a system gesture. `hover` is
 * the default: the way out is there the moment a hand moves.
 *
 * 🔴 THERE IS NO FOURTH MODE, AND THIS IS THE CHOICE THAT WAS MADE INSTEAD.
 * The ask was for a way out on a phone, and the two readings offered were a new
 * mode or teaching `hover` that a touch device has no hovering pointer. Neither
 * was taken, because both leave TWO close buttons in the project: `hover`'s own
 * close button IS the shared piece now (`createFullscreenExit`), moved from the
 * top right to the bottom right where it was asked for, wearing ⛶ rather than
 * ✕ so it pairs with the control that got you in. One button, one behaviour,
 * one file, and `/weight/` and `/floor/` mount the same piece on a bare canvas.
 *
 * ⚠️ AND `footer` GETS IT ONLY WHEN ITS OWN ROW HAS NO WAY OUT. The right slot
 * holds a ⛶ by default and that row is on screen in this mode, so a second
 * square in the picture above it is two controls doing one thing. A page that
 * overrides the right slot has taken that button away, and then the piece is
 * what keeps the promise that every mode but `bare` has a visible way back.
 */
export const FULL_MODES = ['hover', 'footer', 'bare'];

/**
 * @param {object} o
 * @param {HTMLVideoElement|HTMLCanvasElement|Element} [o.media] the picture. A
 *   panel with no media is a frame, which is what `/kit/` shows.
 * @param {string} [o.of]      what the default presence badge is about.
 * @param {Element|false} [o.left]   override the left slot, or `false` for none.
 * @param {Element|false} [o.right]  override the right slot, or `false` for none.
 * @param {Element} [o.centre]       the middle, which has no default.
 * @param {'hover'|'footer'|'bare'} [o.fullMode]
 * @param {Element|{el: Element}} [o.under] the second storey. See `api.under`.
 * @param {(full:boolean, how:string)=>void} [o.onFull]
 */
export function createVideoPanel({
  media = null, of = '', left, right, centre = null,
  fullMode = 'hover', onFull = () => {}, under = null,
  /**
   * 🔴 THE SHAPE OF THE PICTURE BOX, WHEN IT IS NOT 16:9. Added 2026-09-18 for
   * `/stage/`, whose film and canvas are both 4:3: *"add moer height (cut from
   * sides)"*. Without it the box stays 16:9 and `object-fit: contain` puts the
   * pillars back one level out, in CSS, where the page cannot see them.
   * ⚠️ IT IS A CSS RATIO STRING, THE SAME SPELLING AS THE STYLESHEET'S, and
   * `null` leaves the stylesheet alone. A page passing nothing is untouched.
   */
  aspect = null,
} = {}) {
  if (!FULL_MODES.includes(fullMode)) {
    throw new Error(`video panel: fullMode is one of ${FULL_MODES.join(', ')}, not ${JSON.stringify(fullMode)}.`);
  }

  const root = el('div', 'pos-vp');
  const stage = el('div', 'pos-vp-stage');
  /**
   * 🔴 A CUSTOM PROPERTY, NOT `stage.style.aspectRatio`. An inline
   * `aspect-ratio` beats every selector in the stylesheet, including
   * `.pos-vp[data-full] .pos-vp-stage { aspect-ratio: auto }` which exists
   * three lines from it and is the rule that lets a panel fill a screen. So a
   * panel that was given a shape could never give it up: MEASURED 2026-09-19,
   * `/making/`'s 1:1 picture box stayed square on a 16:9 display, its picture
   * sat high, and `.pos-fsx` is `position: absolute` INSIDE the stage, so the
   * way out went up there with it. Reported as two things and it was one.
   * ⚠️ THE FALLBACK IS IN THE STYLESHEET, not here. `var(--vp-aspect, 16 / 9)`
   * keeps the default in one place and means a panel with no aspect sets no
   * property at all.
   */
  if (aspect) stage.style.setProperty('--vp-aspect', aspect);
  if (media) stage.append(media.el || media);
  root.append(stage);

  // ── the default left slot: is the thing feeding this answering ────────────
  // A dot rather than a badge, because a footer under a picture is a row of
  // small things and a full phrase would own it.
  let presence = null;
  if (left === undefined) {
    presence = createPresence({ of: of || 'it', mode: 'dot', state: 'unknown' });
  }

  // ── the default right slot: make it big ──────────────────────────────────
  const fsBtn = el('button', 'ico pos-vp-full', '⛶', {
    type: 'button', title: 'fill the screen', 'aria-label': 'fill the screen',
  });
  /**
   * ⚠️ CENTRED ON ITS INK, WHICH THIS BUTTON WAS NOT UNTIL 2026-09-19. U+26F6
   * is drawn small and high in a box sized for a capital, so `place-items:
   * center` put it up and left of where the eye expects. `mount()`'s control
   * row and the fullscreen exit have both done this for a while and the
   * panel's own ⛶ was the one that had not, which nobody could see until a
   * second glyph button was put beside it: one centred on its ink next to one
   * centred on its box is a disagreement you can measure with a ruler.
   */
  centreSymbol(fsBtn);
  fsBtn.onclick = () => api.full(!isFull(root));

  const foot = el('div', 'pos-vp-foot');
  const slot = (cls, node) => {
    const s = el('div', `pos-vp-slot ${cls}`);
    if (node) s.append(node.el || node);
    return s;
  };
  const leftSlot = slot('pos-vp-l', left === undefined ? presence.el : (left || null));
  const centreSlot = slot('pos-vp-c', centre);
  const rightSlot = slot('pos-vp-r', right === undefined ? fsBtn : (right || null));
  foot.append(leftSlot, centreSlot, rightSlot);
  root.append(foot);

  /**
   * 🔴 THE SECOND STOREY, WHICH IS ONLY THERE WHILE FULL. Asked 2026-09-19 with
   * a photograph of `/mirror/` filling an iPhone: *"extend videopanel footer in
   * fullscreen so it can have section below the footer bar (separaet with
   * line). put controlgroup there"*.
   *
   * 🔴 IT IS THE PAGE'S OWN ELEMENT, MOVED, NEVER A COPY. Two rows of buttons
   * that can disagree about which option is chosen is a readout living in two
   * files, which is a defect this project has already named. So the panel
   * remembers where the element came from and puts it back on the way out.
   */
  const underSlot = el('div', 'pos-vp-under');
  root.append(underSlot);
  let underNode = null;
  let underHome = null;

  /**
   * The way back out, and the same piece `/weight/` and `/floor/` mount on a bare
   * canvas. See FULL_MODES for why there is no fourth mode and why this is the
   * bottom right rather than the top.
   */
  const exitBtn = createFullscreenExit(stage, { of: root, onExit: () => syncFull() });
  /** Does this mode need the piece? See the note on FULL_MODES. */
  const wantsExit = () => fullMode === 'hover'
    || (fullMode === 'footer' && right !== undefined);
  // ⚠️ SET HERE AS WELL AS IN `syncFull`, and not because the button can be seen
  // yet. `syncFull` fires `onFull`, which a page has not subscribed to at the
  // moment this file is still building the panel, so the state has to start
  // right rather than wait for the first change to correct it.
  exitBtn.active(wantsExit());

  /**
   * 🔴 WHAT THIS PANEL IS AS ONE OBJECT, WHICH IS THE PANEL UNTIL SOMETHING IS
   * GLUED UNDER IT. `createStripView` has carried a `surface` for the same
   * reason since it gained a footer: what a page moves, hides or measures is
   * the whole thing, and after a glue that is no longer the element the
   * component was built around.
   */
  let surface = root;

  const api = {
    el: root,
    stage,
    foot,
    /** The panel, or the glued box holding it and whatever is under it. */
    get surface() { return surface; },
    /** The three slots, so a page can fill or empty one after the fact. */
    slots: { left: leftSlot, centre: centreSlot, right: rightSlot },
    /** The default badge, or null when a page supplied its own left slot. */
    presence,
    /**
     * Join blocks UNDER this panel so the panel and they read as one surface.
     *
     * 🔴 ASKED FOR 2026-09-19: *"make transportbar glueable to videopanel
     * footer"*. A film's play and stop belong to the picture, and two bordered
     * boxes with the page rhythm between them say they are two things. Glued,
     * the panel's footer and the bar under it are one object with one edge and
     * a 1 px seam, which is the same seam the footer already has above it.
     *
     * 🔴 IT WRAPS IN PLACE, WHICH IS THE WHOLE REASON THIS IS A METHOD RATHER
     * THAN A PAGE CALLING `createGlue` ITSELF. A panel is usually already in
     * the document by the time a page has built the bar that belongs to it, and
     * a glue built the other way has to be re-appended, which puts it at the
     * END of wherever it lands: on a tabbed page that is below the form and the
     * diagram rather than where the picture was.
     * ⚠️ A GLUE OF ONE BLOCK IS THAT BLOCK, so a page that calls this with
     * nothing real gets the panel back unwrapped and no second border.
     * ⚠️ AND IT IS NOT `under()`. That one moves a page's controls into the
     * panel WHILE IT IS FULL and hands them back after; this one is the
     * ordinary layout, on screen the whole time.
     */
    glue(...blocks) {
      const parts = blocks.filter(Boolean).map((b) => b.el || b);
      if (!parts.length) return surface;
      /**
       * 🔴 A MARKER, NOT THE NEXT SIBLING, AND `/kit/` FOUND THIS ON THE FIRST
       * RUN. The obvious way to remember a place is to hold the node after it
       * and `insertBefore` that one afterwards. Here the node after the panel is
       * usually the very bar being glued, `createGlue` MOVES it, and
       * `insertBefore` then throws `the node before which the new node is to be
       * inserted is not a child of this node`. `section()` catches that, so the
       * specimen reads as a component that would not build.
       * ⚠️ `/stage/` DID NOT MEET IT, because there the panel's next sibling is
       * another block entirely and the bar is appended past it. One caller
       * passing is not the same as the method working.
       */
      const parent = surface.parentNode;
      const mark = parent ? parent.insertBefore(document.createComment('glue'), surface) : null;
      surface = createGlue(surface, ...parts);
      if (mark) mark.replaceWith(surface);
      return surface;
    },
    /** Which way it goes full. Changing it while full re-applies immediately. */
    mode(next) {
      if (next === undefined) return fullMode;
      if (!FULL_MODES.includes(next)) {
        throw new Error(`video panel: fullMode is one of ${FULL_MODES.join(', ')}, not ${JSON.stringify(next)}.`);
      }
      fullMode = next;
      syncFull();
      return fullMode;
    },
    /**
     * The second storey: one element, shown under the footer bar while this
     * panel is full in `footer` mode and nowhere else.
     *
     * 🔴 HAND IT THE ELEMENT THE PAGE ALREADY HAS. It is MOVED into the panel
     * and moved back to where it came from on the way out, so the buttons in it
     * are the same buttons, with the same state and the same asserts, rather
     * than a full-screen copy that can disagree with the row above. Off screen
     * the page keeps them in its ordinary control row, which is where a visitor
     * who is not in full screen looks for them.
     * ⚠️ `null` HANDS BACK WHATEVER IT WAS HOLDING, so a page can take its
     * controls home without tearing the panel down.
     */
    under(node) {
      if (node === undefined) return underNode;
      placeUnder(false);
      underNode = node ? (node.el || node) : null;
      // Recorded HERE rather than at the moment of the move: a home read at
      // move time is read while the page is already rearranging itself, and
      // this is the one instant the caller is telling us where it lives.
      underHome = underNode && underNode.parentNode
        ? { parent: underNode.parentNode, next: underNode.nextSibling }
        : null;
      placeUnder(isFull(root) && fullMode === 'footer');
      return underNode;
    },
    /**
     * Go full, or come back. Returns what actually happened.
     *
     * 🔴 IT SYNCS THE STATE ITSELF RATHER THAN WAITING TO BE TOLD, AND THAT WAS
     * THE IPHONE BUG. PHOTOGRAPHED 2026-09-17: the picture in a 16 by 9 box at
     * the top of the screen, the page's own readout and tabs showing through
     * underneath, and the two slots stranded at the far edges.
     *
     * `watch()` listens for `fullscreenchange` and `webkitfullscreenchange`, and
     * NEITHER FIRES ON THE FALLBACK PATH. An iPhone has no element Fullscreen
     * API at all, so `fullscreen.mjs` covers the screen with a fixed element
     * instead, and that is a class change with no event behind it. So on the one
     * platform the fallback exists for, the attribute every rule below keys on
     * was never set: the stage kept its aspect ratio, the footer sat under it,
     * and the rest of the cover was transparent.
     * ⚠️ THE EVENT PATH STAYS TOO. A real fullscreen can end without this page
     * asking, by Escape or a phone gesture, and only the event knows about that.
     */
    async full(want = true) {
      const was = isFull(root);
      if (want === was) return was;
      if (want) await fsToggle(root); else await fsExit(root);
      syncFull();
      return isFull(root);
    },
    isFull: () => isFull(root),
    /** What `fullscreen.mjs` could do here: the real API, or the cover. */
    support,
  };

  /**
   * ⚠️ THE STATE IS READ BACK, NEVER ASSUMED. `isFull` asks the document and the
   * element's own class, so this follows what is actually true rather than what
   * was last requested. Called from both paths: after this page asks, and when
   * the browser tells us.
   */
  function syncFull(how = 'class') {
    const full = isFull(root);
    /**
     * 🔴 THE ATTRIBUTE IS REMOVED, NOT EMPTIED. This was `root.dataset.full =
     * full ? fullMode : ''` and that is a bug with a plain name: **`[data-full]`
     * matches an attribute whose value is the empty string.** Every fullscreen
     * rule in `shell.css` is written `.pos-vp[data-full] …`, so a panel that
     * had been full ONCE kept `border: 0`, `background: #000`, a stage with no
     * aspect ratio and, since 2026-09-19, `width: 100%` — for the rest of the
     * page's life.
     * ⚠️ IT SURVIVED BECAUSE NOBODY LOOKED AFTER COMING BACK. Entering is what
     * gets tested; the state that is wrong is the one AFTER leaving, and it is
     * wrong in a way that reads as a styling choice rather than as a fault.
     * Found by a check asserting the panel took its own shape back.
     */
    if (full) root.dataset.full = fullMode;
    else delete root.dataset.full;
    // ⚠️ `active` IS ASKED EVERY TIME RATHER THAN ONCE AT BUILD, because `mode()`
    // can change the answer while the panel is already full. It reads the state
    // back itself, which is the faux path's only way of being told: a class
    // change has no event behind it.
    exitBtn.active(wantsExit());
    placeUnder(full && fullMode === 'footer');
    onFull(full, how);
  }

  /**
   * Move the page's element into the second storey, or put it back.
   *
   * ⚠️ THE OLD SIBLING MAY HAVE GONE. A page is free to rebuild its control row
   * while the panel is full, and `insertBefore` throws on a reference node that
   * is no longer a child. A missing sibling means the end of the row, which is
   * where a control that was last in the row belongs anyway.
   * ⚠️ AND AN ELEMENT THAT HAD NO HOME STAYS HERE. A page that hands over an
   * element it never put on the page has given the panel ownership of it;
   * removing it would be the panel deleting something nobody else holds.
   */
  function placeUnder(inPanel) {
    if (!underNode) return;
    if (inPanel) {
      if (underNode.parentNode === underSlot) return;
      underSlot.append(underNode);
      return;
    }
    if (underNode.parentNode !== underSlot || !underHome || !underHome.parent) return;
    const next = underHome.next && underHome.next.parentNode === underHome.parent
      ? underHome.next : null;
    underHome.parent.insertBefore(underNode, next);
  }

  fsWatch(root, (full, how) => syncFull(how));
  if (under) api.under(under);

  return api;
}
