// demo/shell/canvas-font.mjs: the site's two faces, for a canvas.
//
// 🔴 A CANVAS CANNOT READ `var(--mono)`. `ctx.font` is parsed with no element
// behind it, so a token there is invalid and the assignment is silently
// ignored (the xy-pad note in positron-ui). Until 2026-10-12 four pictures
// typed a system stack instead (`ui-monospace, Menlo, monospace`), so after the
// font switch they drew Menlo or SF Mono beside a page set in JetBrains Mono.
// This reads the token's COMPUTED value, which is the `@font-face` family plus
// its fallbacks, so a canvas names the same face the stylesheet does and
// follows it if the token ever changes.
//
// 🔴 AND A ONE SHOT PICTURE HAS TO DRAW AGAIN ONCE THE FACE ARRIVES. A canvas
// does not reflow: text drawn before the woff2 has loaded is drawn in the
// fallback and stays that way. `whenFaces(fn)` asks for both weights of the
// face by name (`document.fonts.ready` alone waits only for fonts already
// loading, and nothing may have asked for this one yet) and calls `fn` when
// they are in, so a picture painted early repaints once. A picture that
// redraws every frame does not need it.

const FALLBACK = {
  mono: "'Brand JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "'Brand Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

/** The family list `--mono` or `--sans` computes to. Read at call time, so a
 *  module imported before the stylesheet applied still gets the token. */
export function face(which = 'mono') {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(`--${which}`).trim();
    if (v) return v;
  } catch { /* no document: a worker or a test */ }
  return FALLBACK[which] || FALLBACK.mono;
}

/** A complete `ctx.font` string: `font(600, 12)`, `font(400, 14, 'sans')`. */
export function font(weight, px, which = 'mono') {
  return `${weight} ${px}px ${face(which)}`;
}

/** Calls `fn` once both weights of the face are loaded (or the browser has
 *  given up on them). Returns the promise, so a check can await it too. */
export function whenFaces(fn, which = 'mono') {
  const fonts = typeof document !== 'undefined' ? document.fonts : null;
  if (!fonts?.load) return Promise.resolve().then(() => fn?.());
  const f = face(which);
  return Promise.all([fonts.load(`400 12px ${f}`), fonts.load(`600 12px ${f}`)])
    .catch(() => {})
    .then(() => fonts.ready)
    .then(() => fn?.());
}
