// megatimeline viewport — lifted from sitemap-vis/src/viewport.ts (EKA lineage),
// de-typed to plain ESM. The one structural change: scale is split into
// zx (time axis, px per DAY) and zy (track axis — fixed 1 in v0, tracks have
// screen-fixed heights). World x unit = days since unix epoch (float64,
// negative for pre-1970 — 1908 ≈ day −22645). All layout math stays float64
// on the CPU; drawing is camera-relative.

export const viewport = { panX: 0, panY: 0, zx: 1, zy: 1 };

// ~40000× usable x-range: whole 1908–2026 (~43500 days) fits an ~800 px
// window at ZX_MIN; one day ≈ 480 px at ZX_MAX.
export const ZX_MIN = 0.012;
export const ZX_MAX = 480;

// World-y extent of the track area (set once by layout). zy stays 1.
let worldH = 600;
export function setWorldHeight(h) { worldH = h; clampY(); }

export function clampZx(z) {
  return Math.max(ZX_MIN, Math.min(ZX_MAX, z));
}

// Keep the track area in view: content pinned to top when it fits the
// window, free y-pan between top and bottom edges when it doesn't.
export function clampY() {
  const h = window.innerHeight;
  if (worldH <= h) {
    viewport.panY = -h / 2 / viewport.zy;         // world y0 → screen y0
  } else {
    const top = -h / 2 / viewport.zy;             // world 0 at screen 0
    const lo = (h / 2 - worldH) / viewport.zy;    // world worldH at screen h
    viewport.panY = Math.max(Math.min(viewport.panY, top), lo);
  }
}

// Screen coords (clientX, clientY) → world coords [days, worldY].
export function screenToWorld(sx, sy) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const wx = (sx - w / 2) / viewport.zx - viewport.panX;
  const wy = (sy - h / 2) / viewport.zy - viewport.panY;
  return [wx, wy];
}

export function worldToScreenX(wx) {
  return (wx + viewport.panX) * viewport.zx + window.innerWidth / 2;
}
export function worldToScreenY(wy) {
  return (wy + viewport.panY) * viewport.zy + window.innerHeight / 2;
}

// Visible world-x range [minDay, maxDay].
export function visibleX() {
  const w = window.innerWidth;
  return [
    -viewport.panX - w / 2 / viewport.zx,
    -viewport.panX + w / 2 / viewport.zx,
  ];
}

// Zoom the time axis about a screen-space anchor so the world point under
// the anchor stays put. Y untouched.
export function zoomAt(targetZx, anchorX) {
  const z = clampZx(targetZx);
  const w = window.innerWidth;
  const wx = (anchorX - w / 2) / viewport.zx - viewport.panX;
  viewport.zx = z;
  viewport.panX = (anchorX - w / 2) / z - wx;
}

// Fit a world-x range into the viewport (y untouched, then clamped).
export function fitX(minX, maxX, padding = 40) {
  const sw = Math.max(100, window.innerWidth - padding * 2);
  viewport.zx = clampZx(sw / (maxX - minX));
  viewport.panX = -(minX + (maxX - minX) / 2);
  clampY();
}

// ─── Animated transitions (easing kept from the lineage) ────────────────────

let animHandle = null;

export function cancelAnim() {
  if (animHandle != null) {
    cancelAnimationFrame(animHandle);
    animHandle = null;
  }
}
export function animating() { return animHandle != null; }

export function animateZoomAt(targetZx, anchorX, duration = 220, onUpdate) {
  cancelAnim();
  const startZx = viewport.zx;
  const startPanX = viewport.panX;
  const endZx = clampZx(targetZx);
  const w = window.innerWidth;
  const wx = (anchorX - w / 2) / startZx - startPanX;
  const endPanX = (anchorX - w / 2) / endZx - wx;
  runAnim(startZx, startPanX, endZx, endPanX, duration, onUpdate);
}

export function animateFitX(minX, maxX, duration = 600, onUpdate, padding = 40) {
  cancelAnim();
  const startZx = viewport.zx;
  const startPanX = viewport.panX;
  const sw = Math.max(100, window.innerWidth - padding * 2);
  const endZx = clampZx(sw / (maxX - minX));
  const endPanX = -(minX + (maxX - minX) / 2);
  runAnim(startZx, startPanX, endZx, endPanX, duration, onUpdate);
}

function runAnim(z0, p0, z1, p1, duration, onUpdate) {
  const t0 = performance.now();
  // interpolate zoom in log-space (a zoom is multiplicative), pan so the
  // world-center path stays smooth
  const lz0 = Math.log(z0), lz1 = Math.log(z1);
  const tick = () => {
    const t = Math.min(1, (performance.now() - t0) / duration);
    const e = easeOutCubic(t);
    viewport.zx = Math.exp(lz0 + (lz1 - lz0) * e);
    viewport.panX = p0 + (p1 - p0) * e;
    clampY();
    onUpdate?.();
    if (t < 1) animHandle = requestAnimationFrame(tick);
    else { animHandle = null; onUpdate?.(); }
  };
  animHandle = requestAnimationFrame(tick);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
