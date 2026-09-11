// demo/shell/fullscreen.mjs — make an element fill the screen, on a browser
// that may have no Fullscreen API at all.
//
// 🔴 iPHONE SAFARI HAS NO ELEMENT FULLSCREEN. `Element.requestFullscreen` is
// undefined there and so is `webkitRequestFullscreen`; the only thing that goes
// fullscreen on an iPhone is a <video>, through the non-standard
// `HTMLVideoElement.webkitEnterFullscreen()`, which hands the media to the
// system player. iPad is different — iPadOS does carry the prefixed element
// API — so "iOS" is the wrong unit and the capability has to be ASKED.
//
// mirror's ⛶ therefore did nothing on an iPhone: `p.requestFullscreen?.()`
// optional-chains straight past a missing method, so there was no throw, no
// `catch`, no log line and no picture — a button that looks live and is inert,
// which is the exact failure shape this repo keeps writing rules about.
//
// So there are two paths and the caller is told which one ran:
//
//   'element' — the real Fullscreen API (standard or -webkit- prefixed)
//   'faux'    — position:fixed over the viewport, which needs no API at all
//
// ⚠️ THE CLASS IS THE ONLY STYLING HOOK, NOT `:fullscreen`. A rule written
// `.pane:fullscreen, .pane.d-full { … }` is DROPPED ENTIRELY by any browser
// that does not recognise `:fullscreen` — one unknown selector invalidates the
// whole list — so grouping them would take the fallback down on precisely the
// browsers that need it. Both paths set `.d-full`; faux adds `.d-faux` for the
// positioning it alone requires.

const FULL = 'd-full';
const FAUX = 'd-faux';

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
 * Toggle. Returns the path taken — 'element', 'faux', or 'exit'.
 *
 * ⚠️ The real API is tried FIRST and awaited, because its promise is how a
 * refusal arrives (a gesture that was not a gesture, a permissions policy).
 * Falling back on rejection rather than only on absence means a browser that
 * HAS the API and declines to use it still ends up with a full-screen picture.
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
  document.documentElement.classList.add('d-faux-host');
  return 'faux';
}

export async function exit(el) {
  if (el.classList.contains(FAUX)) {
    el.classList.remove(FULL, FAUX);
    document.documentElement.classList.remove('d-faux-host');
    return;
  }
  el.classList.remove(FULL);
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
  } catch { /* already out */ }
}

/**
 * Keep the class honest when the user leaves by a route we did not drive —
 * Escape, the system chrome, a swipe. Without this the pane keeps its
 * fullscreen layout while no longer being fullscreen, which is worse than
 * never having gone.
 *
 * Escape is handled by hand for the faux path only: the real API takes Escape
 * itself, and a second handler would fight it.
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
