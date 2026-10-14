// demo/shell/video-panel.mjs: a picture and a footer of three slots (left presence, right square fullscreen),
// plus slots.caption on the picture where subtitles live. soloFooter: true makes glue() refuse.
// Fullscreen goes through fullscreen.mjs: an iPhone has no element Fullscreen API.
// why: lessons/kit-video-panel.md#header

import { el } from './shell.mjs';
import { createPresence } from './presence.mjs';
import { createGlue } from './glue.mjs';
import { centreSymbol } from './symbol.mjs';
import {
  toggle as fsToggle, exit as fsExit, isFull, watch as fsWatch, support,
  createFullscreenExit, EXIT_IDLE_MS,
} from './fullscreen.mjs';

/**
 * Named values for the left slot. label: '' draws no key; reserve (characters) plus tabular-nums
 * stops a row twitching; a cell is always drawn, empty meaning not measured yet.
 * @param {Array<{key: string, label?: string, reserve?: number}>} fields
 * why: lessons/kit-video-panel.md#create-panel-values
 */
export function createPanelValues(fields = []) {
  if (!Array.isArray(fields) || !fields.length) {
    throw new Error('panel values: pass at least one { key, label, reserve }. '
      + 'A row with nothing in it is a box that paints its edges around nothing.');
  }
  shimPanelValues();
  const root = document.createElement('span');
  root.className = 'pos-vp-vals';
  const vals = new Map();
  for (const f of fields) {
    const key = typeof f === 'string' ? f : f.key;
    if (!key) throw new Error('panel values: every field needs a `key`.');
    const label = typeof f === 'string' ? '' : (f.label ?? '');
    const cell = document.createElement('span');
    cell.className = 'pos-vp-cell';
    if (label) {
      const k = document.createElement('span');
      k.className = 'pos-vp-k';
      k.textContent = label;
      cell.append(k);
    }
    const v = document.createElement('span');
    v.className = 'pos-vp-v';
    if (f.reserve) v.style.minWidth = `${f.reserve}ch`;
    cell.append(v);
    root.append(cell);
    vals.set(key, v);
  }
  /**
   * The row is hidden until something is written into it, and hidden again when every cell is empty.
   * hidden rather than a stylesheet rule, so a measuring caller gets 0.
   * why: lessons/kit-video-panel.md#values-hidden
   */
  const settle = () => {
    root.hidden = ![...vals.values()].some((v) => v.textContent !== '');
  };
  settle();
  return {
    el: root,
    /** Write one cell. `null`, `undefined` and `''` all empty it. */
    set(key, text) {
      const v = vals.get(key);
      if (!v) throw new Error(`panel values: there is no cell called "${key}".`);
      v.textContent = text == null ? '' : String(text);
      settle();
      return v;
    },
    /** Is the row on screen? True once any cell carries something. */
    shown: () => !root.hidden,
    /** One cell's element, for a page that wants to measure it. */
    cell: (key) => vals.get(key) || null,
    keys: () => [...vals.keys()],
  };
}

/**
 * A bridge: these rules belong in shell.css, so they are injected only when no sheet carries .pos-vp-k
 * (a cross-origin sheet counts as not ours). .pos-vp-k is in no stylesheet, so its case and tracking live here.
 * why: lessons/kit-video-panel.md#panel-values-css
 */
const PANEL_VALUES_CSS = `
.pos-vp-vals {
  display: flex; align-items: baseline; gap: 14px; min-width: 0;
  overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
}
.pos-vp-vals::-webkit-scrollbar { display: none; }
/* 🔴 THE display: flex ABOVE BEATS THE UA SHEET'S [hidden] RULE, so the row
   has to be told again. MEASURED 2026-09-29 without this line: the root
   carried hidden, every value was empty, and the fps LABEL was on screen
   anyway, in a footer describing a stream nobody had started. That is this
   project's recurring lesson about hidden not meaning hidden once something
   has set a display, and shell.css already carries the same repair for a wave
   view inside a pane.
   NO BACKTICKS IN THIS BLOCK: it is a template literal, and one would end it. */
.pos-vp-vals[hidden] { display: none; }
.pos-vp-cell { display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }
.pos-vp-k {
  font: 500 9.5px/1 var(--mono);
  color: var(--dim2);
}
.pos-vp-v {
  font: 400 11px/1.4 var(--mono); color: var(--fg);
  font-variant-numeric: tabular-nums;
}`;
let shimmed = false;
function shimPanelValues() {
  if (shimmed || typeof document === 'undefined') return;
  shimmed = true;
  const has = [...document.styleSheets].some((s) => {
    try {
      return [...s.cssRules].some((r) => (r.selectorText || '').split(',')
        .some((t) => t.trim() === '.pos-vp-k'));
    } catch { return false; }
  });
  if (has) return;
  const style = document.createElement('style');
  style.dataset.shim = 'pos-vp-vals';
  style.textContent = PANEL_VALUES_CSS;
  document.head.append(style);
}

/**
 * How long the way out stays up after the last movement; fullscreen.mjs owns the number.
 * why: lessons/kit-video-panel.md#idle-ms
 */
export const IDLE_MS = EXIT_IDLE_MS;

/**
 * 'hover' (default): a square in the bottom right while a hand moves. 'footer': the footer stays, with a
 * second storey under it. 'bare': the picture only. One exit piece (createFullscreenExit), no fourth mode;
 * footer mode gets it only when its own row has no way out.
 * why: lessons/kit-video-panel.md#full-modes
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
   * The picture box's shape as a CSS ratio string when it is not 16:9; null leaves the stylesheet alone.
   * why: lessons/kit-video-panel.md#opt-aspect
   */
  aspect = null,
  /**
   * Named values in the left slot, after the presence dot. See createPanelValues.
   * why: lessons/kit-video-panel.md#opt-values
   */
  values = null,
  /**
   * true makes glue() throw, so a panel declared with one footer cannot grow a second.
   * It says nothing about the footer's contents.
   * why: lessons/kit-video-panel.md#opt-solo-footer
   */
  soloFooter = false,
} = {}) {
  if (!FULL_MODES.includes(fullMode)) {
    throw new Error(`video panel: fullMode is one of ${FULL_MODES.join(', ')}, not ${JSON.stringify(fullMode)}.`);
  }

  const root = el('div', 'pos-vp');
  const stage = el('div', 'pos-vp-stage');
  /**
   * A custom property, not style.aspectRatio: an inline aspect-ratio beats .pos-vp[data-full], so a shaped
   * panel could never fill a screen. The 16 / 9 fallback lives in the stylesheet.
   * why: lessons/kit-video-panel.md#aspect-property
   */
  if (aspect) stage.style.setProperty('--vp-aspect', aspect);
  if (media) stage.append(media.el || media);
  /**
   * The caption sits inside the stage, so it travels with the picture when the panel goes full.
   * Always built; .pos-vp-cap:empty draws nothing.
   * why: lessons/kit-video-panel.md#caption-slot
   */
  const capSlot = el('div', 'pos-vp-cap');
  /**
   * One short status about the picture, top left on the picture, so it stays visible in full screen.
   * Always built; empty draws nothing.
   * why: lessons/kit-video-panel.md#tag-slot
   */
  const tagSlot = el('div', 'pos-vp-tag');
  stage.append(capSlot, tagSlot);
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
   * Centred on its ink: U+26F6 is drawn small and high in a box sized for a capital.
   * why: lessons/kit-video-panel.md#centre-symbol
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
  // The named values ride in the left slot, beside whatever is already there.
  const panelValues = values ? createPanelValues(values) : null;
  if (panelValues) leftSlot.append(panelValues.el);
  const centreSlot = slot('pos-vp-c', centre);
  const rightSlot = slot('pos-vp-r', right === undefined ? fsBtn : (right || null));
  foot.append(leftSlot, centreSlot, rightSlot);
  root.append(foot);

  /**
   * The second storey, only there while full. It holds the page's own element, moved and put back,
   * never a copy that can disagree with the row above.
   * why: lessons/kit-video-panel.md#under-slot
   */
  const underSlot = el('div', 'pos-vp-under');
  root.append(underSlot);
  let underNode = null;
  let underHome = null;

  /**
   * The way back out, the same piece /weight/ and /floor/ mount on a bare canvas.
   * why: lessons/kit-video-panel.md#exit-btn
   */
  const exitBtn = createFullscreenExit(stage, { of: root, onExit: () => syncFull() });
  /** Does this mode need the piece? See the note on FULL_MODES. */
  const wantsExit = () => fullMode === 'hover'
    || (fullMode === 'footer' && right !== undefined);
  // Set here as well as in syncFull: onFull has no subscriber yet while the panel is being built.
  // why: lessons/kit-video-panel.md#exit-active
  exitBtn.active(wantsExit());

  /**
   * What this panel is as one object: the panel until something is glued under it.
   * why: lessons/kit-video-panel.md#surface
   */
  let surface = root;
  /** What `glue()` has put under the footer, so `footers()` can count it. */
  const glued = [];

  const api = {
    el: root,
    stage,
    foot,
    /** The panel, or the glued box holding it and whatever is under it. */
    get surface() { return surface; },
    /**
     * The three footer slots, plus caption, the overlay on the lower picture.
     * Fill with slots.caption.append(node); textContent = '' empties it.
     * why: lessons/kit-video-panel.md#slots
     */
    slots: {
      left: leftSlot, centre: centreSlot, right: rightSlot, caption: capSlot,
      /** On the picture, top left: one short status about the picture. */
      tag: tagSlot,
    },
    /**
     * How many full-width rows sit under the picture: the footer plus anything glued. A number, to assert on.
     * why: lessons/kit-video-panel.md#footers
     */
    footers: () => 1 + glued.length,
    /** The default badge, or null when a page supplied its own left slot. */
    presence,
    /** The named value row, or null. `values.set('fps', '30.0')`. */
    values: panelValues,
    /**
     * Join blocks under this panel as one surface with 1 px seams. It wraps in place, so the glue stays where
     * the panel was. A glue of one block is that block. Not under(), which is only while full.
     * why: lessons/kit-video-panel.md#glue
     */
    glue(...blocks) {
      const parts = blocks.filter(Boolean).map((b) => b.el || b);
      if (!parts.length) return surface;
      /**
       * Refused here, at the call whose stack names the line to change, rather than silently ignored.
       * why: lessons/kit-video-panel.md#glue-refuse
       */
      if (soloFooter) {
        throw new Error('video panel: soloFooter is on, so this panel has one footer'
          + ` and ${parts.length} block(s) asked to be glued under it.`
          + ' Drop soloFooter, or do not glue.');
      }
      /**
       * A comment marker, not the next sibling: the next sibling is often the bar being glued, which createGlue
       * moves, and insertBefore then throws.
       * why: lessons/kit-video-panel.md#glue-marker
       */
      const parent = surface.parentNode;
      const mark = parent ? parent.insertBefore(document.createComment('glue'), surface) : null;
      surface = createGlue(surface, ...parts);
      if (mark) mark.replaceWith(surface);
      glued.push(...parts);
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
     * The second storey: shown under the footer while full in footer mode. The element is moved in and
     * back out, so its buttons keep their state. null hands back whatever it held.
     * why: lessons/kit-video-panel.md#under
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
     * Go full, or come back; returns what happened. It syncs the state itself: the iPhone fallback is a
     * class change and fires no fullscreenchange. The event path stays for Escape and phone gestures.
     * why: lessons/kit-video-panel.md#full
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
   * The state is read back from the document and the element's class, never assumed.
   * why: lessons/kit-video-panel.md#sync-full
   */
  function syncFull(how = 'class') {
    const full = isFull(root);
    /**
     * Removed, not emptied: [data-full] matches an empty value, so a panel full once kept every full rule.
     * why: lessons/kit-video-panel.md#data-full-removed
     */
    if (full) root.dataset.full = fullMode;
    else delete root.dataset.full;
    // Asked every time, because mode() can change the answer while the panel is full.
    // why: lessons/kit-video-panel.md#exit-active-every-time
    exitBtn.active(wantsExit());
    placeUnder(full && fullMode === 'footer');
    onFull(full, how);
  }

  /**
   * Move the page's element into the second storey, or put it back. A vanished sibling means the end of the
   * row; an element that had no home stays here.
   * why: lessons/kit-video-panel.md#place-under
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
