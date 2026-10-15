// demo/shell/bay-oled.mjs: a small patch drawn on a 1 bit 128x64 panel, generalised from the Pico
// router's screen (rig/pico/patch/main.c): rounded boxes with their names, one pixel wires between.
// Two facing columns by default (`arrange: 'columns'` for up to three by rank), up to 4 boxes a column.
// Draws through the firmware UI kit's calls (`fill`, `text`, `cap`, `adv`), so the Pi's panel and its
// simulator make the same pixels.
// why: lessons/kit-bay-oled.md#header

import { ranks } from './bay-layout.mjs';

const W = 128, H = 64, BOX_H = 13, PAD = 2, MAX_COLS = 3, MAX_ROWS = 4;
const nodeOf = (id) => id.split(':').slice(0, 2).join(':');

/**
 * The layout alone, for a check or a caller that draws its own: boxes `{ id, x, y, w, h, label, home }`,
 * wires `{ from, to, pts }` (points to join with one pixel lines), and what did not fit.
 */
export function layoutBayOled(patch, o = {}) {
  return (o.arrange === 'columns' ? layoutColumns : layoutPairOled)(patch, o);
}

/**
 * Two facing columns, as bay-layout.mjs `layoutPair` draws a patch for a phone: sources left, the rest
 * right, the links across in the field between, a link inside one column a bracket in its outer lane.
 * Two columns of 52 px hold seven letters a name where three hold five.
 */
function layoutPairOled({ nodes, links }, { home = 'pi-1', adv = 6 } = {}) {
  const ids = new Set(nodes.map((n) => n.id));
  const ls = links.map((l, i) => ({ from: nodeOf(l.from), to: nodeOf(l.to), medium: l.medium, i })).filter((l) => ids.has(l.from) && ids.has(l.to) && l.from !== l.to);
  const { rank } = ranks(nodes, ls.map((l, i) => ({ id: `l${i}`, from: `${l.from}:x`, to: `${l.to}:x` })));
  const order = nodes.map((n, i) => [n, i]).sort((a, b) => (rank.get(a[0].id) || 0) - (rank.get(b[0].id) || 0) || a[1] - b[1]).map(([n]) => n);
  // the split: sources left, unless one column would then hold more than four
  let k = order.filter((n) => !(rank.get(n.id) || 0)).length;
  if (k === order.length) k = Math.ceil(order.length / 2);
  k = Math.max(order.length - MAX_ROWS, Math.min(MAX_ROWS, k));
  const sides = [order.slice(0, k), order.slice(k)].filter((c) => c.length);
  if (sides.length < 2) return layoutColumns({ nodes, links }, { home, adv });
  // An outer lane of 7 px each side carries the links inside a column, so the field between carries only
  // links across and a chain never reads as a fan.
  const LANE = 7, FIELD = 16, bw = Math.floor((W - FIELD - 2 * LANE) / 2), per = Math.max(1, Math.floor((bw - 2 * PAD - 2 + 1) / adv));
  const boxes = [], at = new Map(), cut = [];
  sides.forEach((col, ci) => {
    col.forEach((n, ri) => {
      const name = n.id.split(':')[1] || n.id, label = name.length > per ? name.slice(0, per) : name;
      if (label !== name) cut.push(`${n.id} as ${label}`);
      const y = Math.round((ri + 0.5) * H / col.length - BOX_H / 2);
      const b = { id: n.id, x: ci ? W - LANE - bw : LANE, y, w: bw, h: BOX_H, label, home: n.id.split(':')[0] === home, side: ci };
      boxes.push(b); at.set(n.id, b);
    });
  });
  const wires = [], mid = LANE + bw + (FIELD >> 1);
  const bracket = [0, 0];
  for (const l of ls) {
    const a = at.get(l.from), b = at.get(l.to);
    if (!a || !b) continue;
    const ya = a.y + (BOX_H >> 1), yb = b.y + (BOX_H >> 1);
    const ea = a.side ? a.x - 1 : a.x + a.w, eb = b.side ? b.x - 1 : b.x + b.w;     // the inner edges
    if (a.side !== b.side) wires.push({ from: l.from, to: l.to, medium: l.medium, i: l.i, pts: ya === yb ? [[ea, ya], [eb, yb]] : [[ea, ya], [mid, ya], [mid, yb], [eb, yb]] });
    else {
      // a bracket in the column's outer lane, each a second pixel further out so two do not overlap
      const k = bracket[a.side]++, oa = a.side ? a.x + a.w : a.x - 1, ob = b.side ? b.x + b.w : b.x - 1;
      // 3 px clear of the boxes, so the bracket reads as a wire and not as a box's second edge
      const x = a.side ? Math.min(W - 1, a.x + a.w + 3 + 2 * k) : Math.max(0, a.x - 4 - 2 * k);
      wires.push({ from: l.from, to: l.to, medium: l.medium, i: l.i, pts: [[oa, ya], [x, ya], [x, yb], [ob, yb]] });
    }
  }
  return { boxes, wires, cut };
}

function layoutColumns({ nodes, links }, { home = 'pi-1', adv = 6 } = {}) {
  const ids = new Set(nodes.map((n) => n.id));
  const ls = links.map((l, i) => ({ from: nodeOf(l.from), to: nodeOf(l.to), medium: l.medium, i })).filter((l) => ids.has(l.from) && ids.has(l.to) && l.from !== l.to);
  const { rank } = ranks(nodes, ls.map((l, i) => ({ id: `l${i}`, from: `${l.from}:x`, to: `${l.to}:x` })));
  const cols = [];
  for (const n of nodes) (cols[Math.min(rank.get(n.id) || 0, MAX_COLS - 1)] ??= []).push(n);
  const used = cols.filter(Boolean);
  const nc = used.length, MIN_GAP = 8;
  const nameOfBox = (n) => n.id.split(':')[1] || n.id;
  // Each column as wide as its longest name; the wires get what is left, shared equally.
  const want = used.map((col) => Math.max(...col.slice(0, MAX_ROWS).map((n) => nameOfBox(n).length * adv - 1 + 2 * PAD + 2)));
  const room = W - (nc - 1) * MIN_GAP, sum = want.reduce((x, y) => x + y, 0);
  // Too wide: the widest column gives up a pixel at a time, so short names stay whole and the long one is cut.
  const widths = [...want];
  for (let total = sum; total > room; total--) { const i = widths.indexOf(Math.max(...widths)); widths[i]--; }
  const gap = nc > 1 ? Math.floor((W - widths.reduce((x, y) => x + y, 0)) / (nc - 1)) : 0;
  const lefts = []; let xx = 0;
  for (let i = 0; i < nc; i++) { lefts.push(nc === 1 ? Math.round((W - widths[0]) / 2) : xx); xx += widths[i] + gap; }
  if (nc > 1) lefts[nc - 1] = W - widths[nc - 1];          // the last column flush right, as the router's
  const boxes = [], at = new Map(), cut = [];
  used.forEach((col, ci) => {
    const shown = col.slice(0, MAX_ROWS), bw = widths[ci];
    const per = Math.max(1, Math.floor((bw - 2 * PAD - 2 + 1) / adv));
    if (col.length > MAX_ROWS) cut.push(...col.slice(MAX_ROWS).map((n) => n.id));
    shown.forEach((n, ri) => {
      const name = nameOfBox(n);
      const label = name.length > per ? name.slice(0, per) : name;
      if (label !== name) cut.push(`${n.id} as ${label}`);
      const y = Math.round((ri + 0.5) * H / shown.length - BOX_H / 2);
      const b = { id: n.id, x: lefts[ci], y, w: bw, h: BOX_H, label, home: n.id.split(':')[0] === home };
      boxes.push(b); at.set(n.id, b);
    });
  });
  // A wire leaves the right edge's middle and enters the left edge's middle; an elbow halfway
  // across the gap when the two sit at different heights. A wire to a box not shown is left out.
  const wires = [];
  for (const l of ls) {
    const a = at.get(l.from), b = at.get(l.to);
    if (!a || !b || b.x <= a.x) continue;
    const y0 = a.y + (BOX_H >> 1), y1 = b.y + (BOX_H >> 1), x0 = a.x + a.w, x1 = b.x - 1;
    const mx = Math.round((x0 + x1) / 2);
    wires.push({ from: l.from, to: l.to, medium: l.medium, i: l.i, pts: y0 === y1 ? [[x0, y0], [x1, y1]] : [[x0, y0], [mx, y0], [mx, y1], [x1, y1]] });
  }
  return { boxes, wires, cut };
}

/** A wire's texture by its medium, so one ink tells them apart: audio solid, midi dashed (3 on, 2 off),
 *  value dotted (1 on, 2 off), video a double line. A wire with no medium is solid. */
const ON = { midi: (c) => c % 5 < 3, value: (c) => c % 3 === 0 };
/** The wire's two rails for video: the line moved 1 px to each side, the corners mitred so the rails meet
 *  there as a bent pair rather than crossing or leaving a gap. Wires are only ever level or upright. */
function rails(pts) {
  const dir = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
  const nrm = ([dx, dy]) => [-dy, dx];
  const side = (k) => pts.map((p, i) => {
    const n0 = i > 0 ? nrm(dir(pts[i - 1], p)) : null, n1 = i < pts.length - 1 ? nrm(dir(p, pts[i + 1])) : null;
    const n = !n0 ? n1 : !n1 ? n0 : n0[0] === n1[0] && n0[1] === n1[1] ? n0 : [n0[0] + n1[0], n0[1] + n1[1]];
    return [p[0] + k * n[0], p[1] + k * n[1]];
  });
  return [side(1), side(-1)];
}
function solid(ui, pts) {
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    ui.fill(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]) + 1, Math.abs(b[1] - a[1]) + 1, 1);
  }
}
function texture(ui, pts, medium) {
  if (medium === 'video') {
    for (const r of rails(pts)) solid(ui, r);
    // the outer rail's corner pixel off at each bend, as a box's corners are, so the turn reads round
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i], d0 = [Math.sign(p[0] - pts[i - 1][0]), Math.sign(p[1] - pts[i - 1][1])], d1 = [Math.sign(pts[i + 1][0] - p[0]), Math.sign(pts[i + 1][1] - p[1])];
      const ix = d1[0] - d0[0], iy = d1[1] - d0[1];            // towards the inside of the turn
      if (ix && iy) ui.fill(p[0] - ix, p[1] - iy, 1, 1, 0);
    }
    return;
  }
  let c = 0;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], d = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    const sx = Math.sign(b[0] - a[0]), sy = Math.sign(b[1] - a[1]);
    for (let j = i === 1 ? 0 : 1; j <= d; j++, c++) {
      const x = a[0] + sx * j, y = a[1] + sy * j;
      if (!ON[medium] || ON[medium](c)) ui.fill(x, y, 1, 1, 1);
    }
  }
}

/** A point `at` px along a wire. */
function along(pts, at) {
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], d = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    if (at <= d) return [a[0] + Math.sign(b[0] - a[0]) * at, a[1] + Math.sign(b[1] - a[1]) * at];
    at -= d;
  }
  return pts.at(-1);
}
const lengthOf = (pts) => pts.slice(1).reduce((n, b, i) => n + Math.abs(b[0] - pts[i][0]) + Math.abs(b[1] - pts[i][1]), 0);

/** Beads, `t` in seconds. A stream (audio, video, or no medium) runs a bead every BEAD px at SPEED px a
 *  second while shown; an event medium (midi, value) sends one bead out to in over EVENT_S after each event
 *  in `events[i]`, the time of the wire's last event. */
const BEAD = 10, SPEED = 20, EVENT_S = 0.6, MARCH = 6;
/** A bead's shape: `solid` a 3x3 block, `hollow` a 5x5 outline around the wire, `diamond` a 5 px diamond. */
export const BEADS = ['solid', 'hollow', 'diamond'];
function bead(ui, [x, y], shape = 'solid') {
  x = Math.round(x); y = Math.round(y);
  if (shape === 'hollow') { ui.fill(x - 2, y - 2, 5, 1, 1); ui.fill(x - 2, y + 2, 5, 1, 1); ui.fill(x - 2, y - 1, 1, 3, 1); ui.fill(x + 2, y - 1, 1, 3, 1); }
  else if (shape === 'diamond') { ui.fill(x, y - 2, 1, 5, 1); ui.fill(x - 1, y - 1, 3, 3, 1); ui.fill(x - 2, y, 5, 1, 1); }
  else ui.fill(x - 1, y - 1, 3, 3, 1);
}
function beads(ui, w, t, events, valueBead) {
  const len = lengthOf(w.pts);
  if (w.medium === 'midi' || w.medium === 'value') {
    const t0 = events?.[w.i], u = Number.isFinite(t0) ? (t - t0) / EVENT_S : -1;
    if (u >= 0 && u <= 1) bead(ui, along(w.pts, Math.max(2, Math.min(len - 2, u * len))), w.medium === 'value' ? valueBead : 'solid');
    return;
  }
  // audio: the line itself marches, a 1 px gap every MARCH px moving out to in; video runs beads
  if (w.medium === 'audio') {
    for (let at = Math.floor(t * SPEED) % MARCH; at <= len; at += MARCH) { const [x, y] = along(w.pts, at); ui.fill(Math.round(x), Math.round(y), 1, 1, 0); }
    return;
  }
  for (let at = (t * SPEED) % BEAD + 2; at < len - 2; at += BEAD) bead(ui, along(w.pts, at));
}

/** The patch drawn with the UI kit's calls, each wire textured by its `medium`; `o.t` (seconds) runs beads along
 *  the wires and `o.events` (link index to the time of its last event) sends one along an event wire.
 *  Answers the layout, `cut` naming what did not fit. */
export function drawBayOled(ui, patch, o = {}) {
  const L = layoutBayOled(patch, { ...o, adv: ui.adv });
  for (const w of L.wires) texture(ui, w.pts, w.medium);
  if (Number.isFinite(o.t)) for (const w of L.wires) beads(ui, w, o.t, o.events, BEADS.includes(o.valueBead) ? o.valueBead : 'solid');
  for (const b of L.boxes) {
    // the firmware's box: an outline with its corners off. Never filled: a lit box drowns its thin letters.
    ui.fill(b.x + 1, b.y, b.w - 2, 1, 1); ui.fill(b.x + 1, b.y + b.h - 1, b.w - 2, 1, 1);
    ui.fill(b.x, b.y + 1, 1, b.h - 2, 1); ui.fill(b.x + b.w - 1, b.y + 1, 1, b.h - 2, 1);
    const tw = ui.textW(b.label), tx = b.x + Math.round((b.w - tw) / 2), ty = b.y + Math.round((b.h - ui.cap) / 2);
    ui.text(tx, ty, b.label);
  }
  return L;
}
