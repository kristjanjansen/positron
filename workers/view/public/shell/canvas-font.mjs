// demo/shell/canvas-font.mjs: the site's two faces for a canvas. `ctx.font` cannot read `var(--mono)`,
// so this reads the token's computed value. A canvas does not reflow, so `whenFaces(fn)` loads both
// weights by name and calls `fn` once they are in, for a one shot picture to repaint.
// why: lessons/kit-canvas-font.md#header

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
