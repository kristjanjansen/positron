// demo/shell/fullscreen.mjs: fill the screen, on a browser that may have no Fullscreen API (iPhone).
// Two paths, reported to the caller: 'element' (the real API) and 'faux' (position: fixed).
// `.pos-full` is the only styling hook: an unknown `:fullscreen` in a list drops the whole rule.
// why: lessons/kit-fullscreen.md#header

// One import, and `symbol.mjs` imports nothing back, so no cycle in the frame every page mounts.
// why: lessons/kit-fullscreen.md#import
import { centreSymbol } from './symbol.mjs';

const FULL = 'pos-full';
const FAUX = 'pos-faux';

/** What this browser can actually do. 'element', 'video' or false. */
export function support() {
  const el = document.documentElement;
  if (document.fullscreenEnabled && el.requestFullscreen) return 'element';
  if (document.webkitFullscreenEnabled && el.webkitRequestFullscreen) return 'element';
  // An iPhone: no element fullscreen, but a <video> can still take over the
  // screen. Worth reporting separately — a page holding real video has an
  // option a canvas-only page does not.
  if (typeof HTMLVideoElement !== 'undefined'
      && HTMLVideoElement.prototype.webkitEnterFullscreen) return 'video';
  return false;
}

/** Is this element currently filling the screen, by either route? */
export const isFull = (el) =>
  document.fullscreenElement === el || document.webkitFullscreenElement === el
  || el.classList.contains(FULL);

/**
 * Toggle. Returns the path taken: 'element', 'faux', or 'exit'. The real API is tried first and
 * awaited, and a refusal falls back to faux too.
 * why: lessons/kit-fullscreen.md#toggle
 */
export async function toggle(el) {
  if (isFull(el)) { await exit(el); return 'exit'; }

  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) {
    try {
      await req.call(el);
      el.classList.add(FULL);
      return 'element';
    } catch { /* fall through to faux — a refusal is not a reason to do nothing */ }
  }

  el.classList.add(FULL, FAUX);
  document.documentElement.classList.add('pos-faux-host');
  return 'faux';
}

export async function exit(el) {
  if (el.classList.contains(FAUX)) {
    el.classList.remove(FULL, FAUX);
    document.documentElement.classList.remove('pos-faux-host');
    return;
  }
  el.classList.remove(FULL);
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
  } catch { /* already out */ }
}

/**
 * Keep the class honest when the user leaves by Escape, system chrome or a swipe.
 * Escape is handled by hand for the faux path only; the real API takes it itself.
 * why: lessons/kit-fullscreen.md#watch
 */
export function watch(el, onChange = () => {}) {
  const sync = () => {
    const real = document.fullscreenElement === el || document.webkitFullscreenElement === el;
    if (!real && !el.classList.contains(FAUX)) el.classList.remove(FULL);
    onChange(isFull(el));
  };
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.classList.contains(FAUX)) { exit(el); onChange(false); }
  });
  return sync;
}

// The way back on a device with no Escape key: a square exit on every path, not only faux.
// Always in the DOM, only opacity moves; faded it is `pointer-events: none` (shell.css `.pos-fsx`).
// why: lessons/kit-fullscreen.md#exit

/** How long it stays up after the last movement, touch or key. */
export const EXIT_IDLE_MS = 2600;

/** U+26F6 SQUARE FOUR CORNERS, the same glyph every ⛶ control on the site
 *  carries, so the way out and the way in are visibly one pair. */
export const EXIT_GLYPH = '⛶';

/**
 * A square way out, bottom right, inside the thing that went full: `createFullscreenExit(wrap)`.
 * @param {Element} host  where the button is appended and positioned against; inside the
 *   element that went full, never `document.body`, or it is off screen in element fullscreen.
 * @param {object} [o]
 * @param {Element} [o.of]        the element whose fullness it follows; defaults to `host`.
 * @param {() => void} [o.onExit] called after the screen has been given back.
 * @param {number} [o.idleMs]
 * @param {string} [o.glyph]
 * @param {string} [o.aria]
 * @returns {{el: HTMLButtonElement, wake: () => void, sync: () => void,
 *            active: (yes?: boolean) => boolean, destroy: () => void}}
 * why: lessons/kit-fullscreen.md#createfullscreenexit
 */
export function createFullscreenExit(host, {
  of = host,
  onExit = () => {},
  idleMs = EXIT_IDLE_MS,
  glyph = EXIT_GLYPH,
  aria = 'leave full screen',
} = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pos-fsx';
  b.textContent = glyph;
  b.title = aria;
  b.setAttribute('aria-label', aria);
  // Centred on its ink: U+26F6 sits small and high in its box.
  // why: lessons/kit-fullscreen.md#centre
  centreSymbol(b);

  // The button is absolute, so a static host gets `position: relative`, which moves nothing
  // and keeps the button inside the fullscreen element.
  // why: lessons/kit-fullscreen.md#host-position
  const hadPosition = host.style.position;
  let tookPosition = false;
  try {
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
      tookPosition = true;
    }
  } catch { /* no layout to read yet; the stylesheet is the caller's problem */ }
  host.append(b);

  let on = true;
  let idle = false;
  let timer = null;

  const paint = () => {
    const show = on && isFull(of);
    b.dataset.on = show ? '1' : '';
    b.dataset.idle = show && idle ? '1' : '';
  };

  function wake() {
    if (!on || !isFull(of)) return;
    idle = false;
    clearTimeout(timer);
    paint();
    timer = setTimeout(() => { idle = true; paint(); }, idleMs);
  }

  /**
   * Read the truth back and follow it; the caller calls it on the faux path, which has no event.
   * why: lessons/kit-fullscreen.md#sync
   */
  function sync() {
    if (on && isFull(of)) { wake(); return; }
    clearTimeout(timer);
    timer = null;
    idle = false;
    paint();
  }

  // On the document, in capture, so a canvas stopping propagation cannot starve the wake timer.
  // why: lessons/kit-fullscreen.md#wake
  const WAKE = ['pointermove', 'pointerdown', 'touchstart', 'keydown'];
  for (const ev of WAKE) document.addEventListener(ev, wake, { passive: true, capture: true });
  for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, sync);

  // The press stops here, so it does not also paint a stroke on the picture under it.
  // why: lessons/kit-fullscreen.md#click
  b.addEventListener('click', async (e) => {
    e.stopPropagation();
    await exit(of);
    sync();
    onExit();
  });

  // Read once now: on something already full the faux path would never get an event.
  // why: lessons/kit-fullscreen.md#initial-sync
  sync();

  return {
    el: b,
    wake,
    sync,
    /** Does anything want this way out right now? A panel in its bare mode does
     *  not, and says so here rather than by never building the button. */
    active(yes) {
      if (yes === undefined) return on;
      on = !!yes;
      sync();
      return on;
    },
    destroy() {
      clearTimeout(timer);
      for (const ev of WAKE) document.removeEventListener(ev, wake, { capture: true });
      for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.removeEventListener(ev, sync);
      if (tookPosition) host.style.position = hadPosition;
      b.remove();
    },
  };
}
