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
import { toggle as fsToggle, exit as fsExit, isFull, watch as fsWatch, support } from './fullscreen.mjs';

/** How long the close button stays up after the last movement, in `hover` mode. */
export const IDLE_MS = 2200;

/**
 * 🔴 TWO WAYS TO BE FULL, AND A PAGE SAYS WHICH. Asked for as *"two modes in
 * api: just fullscreen and close fullscreen butyon on right corner on pointer
 * activity and mode where footer stays"*.
 *
 *   'bare'    the picture and nothing else. The way out is the platform's:
 *             Escape, or the phone's own gesture.
 *   'hover'   a close button appears in the top right when the pointer moves
 *             and fades when it stops. Nothing else is drawn.
 *   'footer'  the footer stays visible, so the slots a page put there keep
 *             working while it is full.
 *
 * ⚠️ `bare` IS NOT THE SAFE DEFAULT AND IS NOT THE DEFAULT. A picture filling
 * the screen with no visible way out is the shape of control this project has
 * already been bitten by in a headset, where the rule is that a page owns its
 * own way out rather than telling somebody to find a system gesture. `hover` is
 * the default: the way out is there the moment a hand moves.
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
 * @param {(full:boolean, how:string)=>void} [o.onFull]
 */
export function createVideoPanel({
  media = null, of = '', left, right, centre = null,
  fullMode = 'hover', onFull = () => {},
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
  if (aspect) stage.style.aspectRatio = aspect;
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
   * The close button for `hover`, drawn on the picture rather than in the
   * footer, because in that mode the footer is not there to put it in.
   * ⚠️ IT IS IN THE DOM FROM THE START AND ONLY ITS OPACITY CHANGES. A button
   * added and removed on pointer movement is layout work sixty times a second,
   * and this project already has the rule that nothing redrawing that often may
   * change how much room it takes.
   */
  const closeBtn = el('button', 'ico pos-vp-close', '✕', {
    type: 'button', title: 'leave the screen', 'aria-label': 'leave the screen',
  });
  closeBtn.onclick = () => api.full(false);
  stage.append(closeBtn);

  let idleTimer = null;
  const showClose = () => {
    if (!isFull(root) || fullMode !== 'hover') return;
    root.dataset.idle = '';
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { root.dataset.idle = '1'; }, IDLE_MS);
  };
  // `pointermove` covers a mouse and a stylus; `touchstart` is what a phone
  // gives instead, where there is no hovering pointer to move.
  for (const ev of ['pointermove', 'pointerdown', 'touchstart']) {
    root.addEventListener(ev, showClose, { passive: true });
  }

  const api = {
    el: root,
    stage,
    foot,
    /** The three slots, so a page can fill or empty one after the fact. */
    slots: { left: leftSlot, centre: centreSlot, right: rightSlot },
    /** The default badge, or null when a page supplied its own left slot. */
    presence,
    /** Which way it goes full. Changing it while full re-applies immediately. */
    mode(next) {
      if (next === undefined) return fullMode;
      if (!FULL_MODES.includes(next)) {
        throw new Error(`video panel: fullMode is one of ${FULL_MODES.join(', ')}, not ${JSON.stringify(next)}.`);
      }
      fullMode = next;
      root.dataset.full = isFull(root) ? fullMode : '';
      if (isFull(root)) showClose();
      return fullMode;
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
    root.dataset.full = full ? fullMode : '';
    if (full) showClose(); else { clearTimeout(idleTimer); root.dataset.idle = ''; }
    onFull(full, how);
  }
  fsWatch(root, (full, how) => syncFull(how));

  return api;
}
