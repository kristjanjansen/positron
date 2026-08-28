// megatimeline gestures — lifted from sitemap-vis/src/input/gesture.ts (EKA
// lineage), de-typed. Changes for the timeline: pan is x-free / y-clamped to
// the track area; pinch and wheel zoom act on zx only (time axis); plain
// wheel = zoom-about-cursor (this is a timeline, not a board), ctrl+wheel =
// trackpad pinch (stronger coefficient), deltaX-dominant wheel = horizontal
// two-finger pan. Inertia kept, x-only.

import { viewport, zoomAt, clampZx, clampY, cancelAnim } from './viewport.mjs';

const pointers = new Map();
let pan = null;
let pinch = null;

let inertiaTimer = null;
const INERTIA_DECAY = 0.92;
const INERTIA_MIN_V = 0.05;

export function attachGestures(target, onChange) {
  target.addEventListener('pointerdown', (e) => onDown(e, target, onChange));
  target.addEventListener('pointermove', (e) => onMove(e, onChange));
  target.addEventListener('pointerup', (e) => onUp(e, target, onChange));
  target.addEventListener('pointercancel', (e) => onUp(e, target, onChange));
  target.addEventListener('wheel', (e) => onWheel(e, onChange), { passive: false });
}

function onDown(e, target, onChange) {
  cancelInertia();
  cancelAnim();
  target.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
  target.classList.add('dragging');

  if (pointers.size === 1) {
    pan = {
      startX: e.clientX, startY: e.clientY,
      panX: viewport.panX, panY: viewport.panY,
      lastT: performance.now(), lastX: e.clientX,
      vx: 0, moved: false,
    };
    pinch = null;
  } else if (pointers.size === 2) {
    startPinch();
    pan = null;
  }
  onChange();
}

function onMove(e, onChange) {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  p.x = e.clientX;
  p.y = e.clientY;

  if (pinch && pointers.size === 2) {
    updatePinch();
    onChange();
    return;
  }

  if (pan && pointers.size === 1) {
    const dx = (e.clientX - pan.startX) / viewport.zx;
    const dy = (e.clientY - pan.startY) / viewport.zy;
    if (Math.abs(e.clientX - pan.startX) + Math.abs(e.clientY - pan.startY) > 3) pan.moved = true;
    viewport.panX = pan.panX + dx;
    viewport.panY = pan.panY + dy;
    clampY();

    const now = performance.now();
    const dt = Math.max(1, now - pan.lastT);
    pan.vx = (e.clientX - pan.lastX) / dt;      // screen px / ms
    pan.lastT = now;
    pan.lastX = e.clientX;

    onChange();
  }
}

export function panWasDrag() { return lastPanMoved; }
let lastPanMoved = false;

function onUp(e, target, onChange) {
  if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
  pointers.delete(e.pointerId);

  if (pan && pointers.size === 0) {
    const { vx, moved } = pan;
    lastPanMoved = moved;
    pan = null;
    if (Math.abs(vx) > INERTIA_MIN_V) startInertia(vx, onChange);
  }

  if (pinch && pointers.size < 2) {
    pinch = null;
    if (pointers.size === 1) {
      const remaining = pointers.values().next().value;
      pan = {
        startX: remaining.x, startY: remaining.y,
        panX: viewport.panX, panY: viewport.panY,
        lastT: performance.now(), lastX: remaining.x,
        vx: 0, moved: true,
      };
    }
  }

  if (pointers.size === 0) target.classList.remove('dragging');
  onChange();
}

function startPinch() {
  const [a, b] = [...pointers.values()];
  pinch = {
    startDist: Math.max(1, Math.abs(a.x - b.x)),   // x-distance: zx-only pinch
    startZx: viewport.zx,
    startMidX: (a.x + b.x) / 2,
    startPanX: viewport.panX,
  };
}

function updatePinch() {
  if (!pinch) return;
  const [a, b] = [...pointers.values()];
  const dist = Math.max(1, Math.abs(a.x - b.x));
  const midX = (a.x + b.x) / 2;
  const newZx = clampZx(pinch.startZx * (dist / pinch.startDist));
  const cx = window.innerWidth / 2;
  const wx = (pinch.startMidX - cx) / pinch.startZx - pinch.startPanX;
  viewport.zx = newZx;
  viewport.panX = (midX - cx) / newZx - wx;
}

function onWheel(e, onChange) {
  e.preventDefault();
  cancelInertia();
  cancelAnim();
  if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    // trackpad two-finger horizontal → pan the time axis
    viewport.panX -= e.deltaX / viewport.zx;
  } else {
    // plain wheel AND trackpad pinch (ctrlKey) → zoom about cursor
    const k = e.ctrlKey ? 0.01 : 0.0015;
    const factor = Math.exp(-e.deltaY * k);
    zoomAt(viewport.zx * factor, e.clientX);
  }
  onChange();
}

function startInertia(vx, onChange) {
  cancelInertia();
  let v = vx;
  const tick = () => {
    if (Math.abs(v) < INERTIA_MIN_V) { inertiaTimer = null; onChange(); return; }
    viewport.panX += (v * 16) / viewport.zx;
    v *= INERTIA_DECAY;
    onChange();
    inertiaTimer = requestAnimationFrame(tick);
  };
  inertiaTimer = requestAnimationFrame(tick);
}

function cancelInertia() {
  if (inertiaTimer != null) {
    cancelAnimationFrame(inertiaTimer);
    inertiaTimer = null;
  }
}
