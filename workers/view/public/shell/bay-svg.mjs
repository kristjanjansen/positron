// demo/shell/bay-svg.mjs: the patchbay picture as an SVG STRING, with no DOM.
// The same boxes, port names and wires `createBayView` (bay-view.mjs) draws in
// a page, laid out from the bay's own `nodes()`, `ports()` and `links()` and
// from the site's font metrics (font-metrics.mjs, read off the TTFs by
// workers/view/og/og-fonts.py) instead of a canvas `measureText`.
//
// 🔴 WHY IT EXISTS, 2026-10-13. The share card is drawn without a browser
// (*"What headless chrome?!!? See ../eccm etc"*), the way eccm and trip draw
// theirs: SVG written by our own code, rasterised by resvg. `createBayView`
// needs `clientWidth`, a canvas, a ResizeObserver and a stylesheet, none of
// which exist in Node or in a Worker. So this runs anywhere: Node at build
// (workers/view/og/render.mjs), a Worker, and a browser (/kit/share/ draws the
// card's SVG inline beside the PNG).
//
// ⚠️ EVERY ATTRIBUTE IS LITERAL. No class, no `var()`, no stylesheet: resvg has
// no cascade, so a fill is a hex and a font is a family list. The colours are
// shell.css's `:root` tokens and patchbay.mjs's MEDIUM_COLOURS, the values the
// page's `.lv-*` rules resolve to (BAY_VIEW_CSS in bay-view.mjs).
// ⚠️ ONE GEOMETRY, TWO WRITERS. The numbers, `ranks()` and `rounded()` are
// imported from bay-view.mjs, and the layout below is that file's `render()`
// in its ACROSS arrangement, line for line. /kit/share/ asserts the two agree
// box by box at the hero's width. The phone arrangement (stacked cards, wires
// in a right gutter, below 480 px) is NOT ported: a width under STACK_BELOW
// throws rather than drawing something bay-view would not.
import { BAY_GEOMETRY, ranks, rounded } from './bay-view.mjs';
import { MEDIUM_COLOURS } from './patchbay.mjs';
import { TIMING_NAMES, printOptions } from './link-options.mjs';
import M from './font-metrics.mjs';

const { FONT, TITLE, ROW, PAD, GAP, MIN_GAP, STACK_BELOW, TWIN_GAP, TGAP, DROW } = BAY_GEOMETRY;

/** shell.css `:root`, the dark theme, which is the only theme the site has. */
export const INK = {
  bg: '#0b0e14', card: '#11151d', card2: '#151b26', line: '#1f2937', line2: '#2b3546',
  fg: '#e6e6e6', dim: '#8b93a1', dim2: '#6a7280', hi: '#ffd400',
};
/** A family list that resolves in both renderers: a page has the faces as
 *  `Brand ...` (shell.css @font-face), resvg has the TTFs by their own names. */
export const FAMILY = {
  mono: "'Brand JetBrains Mono', 'JetBrains Mono', monospace",
  sans: "'Brand Geist', Geist, sans-serif",
};

/** The width of `text` set in `face` ('mono' | 'sans') at `size` px and
 *  `weight` 400 or 600, plus `tracking` px after every character, from the
 *  font's own advances. A code point the subset lacks counts as 0.6 em. */
export function textWidth(text, face, size, { weight = 400, tracking = 0 } = {}) {
  const adv = M[`${face}${weight}`].adv;
  let w = 0, n = 0;
  for (const ch of String(text)) { w += adv[ch.codePointAt(0)] ?? 0.6; n++; }
  return w * size + tracking * n;
}

export const xml = (v) => String(v).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);
const attrs = (o) => Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}="${xml(v)}"`).join(' ');
const tag = (t, o, text) => (text == null ? `<${t} ${attrs(o)}/>` : `<${t} ${attrs(o)}>${xml(text)}</${t}>`);
const n2 = (v) => +(+v).toFixed(2);

const nodeOf = (portId) => portId.split(':').slice(0, 2).join(':');
const portName = (portId) => portId.split(':').slice(2).join(':');
const read = (x) => (typeof x === 'function' ? x() : x);

/**
 * The bay at `width` px, as `createBayView(bay, o)` would draw it in a column
 * that wide. Same options: `stretch`, `sizeAs`, `maxWire`, `detail`.
 * Returns `{ width, height, body, svg, boxes }`: `body` is the markup in the
 * layout's own coordinates (0,0 at the top left, the picture `width` by
 * `height`), for a caller placing it inside a bigger SVG; `svg` is the same as
 * a standalone `<svg>` with bay-view's 1 px margin; `boxes` is each node's
 * `{ id, x, y, w, h }`, for a check against the page's own view.
 */
export function drawBay(bay, { width, stretch = true, sizeAs = 0, maxWire = Infinity, detail = null } = {}) {
  let avail = width;
  if (!(avail > 0)) throw new Error('drawBay needs a width');
  const nodes = read(bay.nodes), ports = read(bay.ports), links = read(bay.links);
  const W = (t, size) => textWidth(t, 'mono', size);
  const WS = (t, size) => textWidth(t, 'sans', size);
  const fieldsOf = (n) => (detail ? detail(n) || [] : []).map((f) => (f == null ? null : typeof f === 'string' ? { text: f } : f));
  let folded = false;
  const fieldsR = (n) => { const f = fieldsOf(n); return folded && f[0] && !f[1] ? [null, f[0], f[2]] : f; };
  const portsOf = (n) => {
    const mine = ports.filter((p) => nodeOf(p.id) === n.id);
    return { ins: mine.filter((p) => p.dir === 'in'), outs: mine.filter((p) => p.dir === 'out') };
  };
  const { rank, back } = ranks(nodes, links);
  const backs = links.filter((l) => back.has(l.id));
  const LANE = 10;
  const cols = [];
  for (const n of nodes) (cols[rank.get(n.id)] ??= []).push(n);
  const order = cols.flat();

  const longest = (ps) => Math.max(0, ...ps.map((p) => W(portName(p.id), FONT)));
  const nodeW = (n) => {
    const { ins, outs } = portsOf(n);
    const [f1, f2, f3] = fieldsR(n), fw = (f) => (f ? WS(f.text, FONT) : 0);
    return Math.max(W(n.id, TITLE) + fw(f1) + (f1 ? 3 : 2) * PAD,
      fw(f2) + fw(f3) + (f2 && f3 ? 3 : 2) * PAD,
      longest(ins) + longest(outs) + (ins.length && outs.length ? 3 : 2) * PAD);
  };
  const boxWidth = () => Math.ceil(Math.max(...order.map(nodeW)));
  const colWidths = () => cols.map((col) => Math.ceil(Math.max(...col.map(nodeW))));
  let boxW = boxWidth(), colW = colWidths();
  const boxesW = () => (stretch ? colW.reduce((a, b) => a + b, 0) : cols.length * boxW);
  const STEP = 6, Mg = backs.length ? 8 + STEP * backs.length : 0;
  const pairCount = new Map();
  for (const l of links) { const k = `${l.from} ${l.to}`; pairCount.set(k, (pairCount.get(k) || 0) + 1); }
  const wide = new Set(links.filter((l) => pairCount.get(`${l.from} ${l.to}`) > 1 && !back.has(l.id))
    .map((l) => rank.get(nodeOf(l.from))));
  const extra = (g) => wide.size * Math.max(0, TWIN_GAP - g);
  const gapFor = (g) => boxesW() + (cols.length - 1) * g + extra(g) + 2 * Mg <= avail;
  if (avail >= STACK_BELOW && !gapFor(MIN_GAP) && order.some((n) => fieldsOf(n)[0] && !fieldsOf(n)[1])) { folded = true; boxW = boxWidth(); colW = colWidths(); }
  const GAPX = gapFor(GAP) ? GAP : MIN_GAP;
  const need = boxesW() + (cols.length - 1) * GAPX + extra(GAPX) + 2 * Mg;
  const across = gapFor(GAPX) || avail >= STACK_BELOW;
  if (!across) throw new Error(`drawBay draws the across arrangement only; ${width} px is under ${STACK_BELOW}, where bay-view stacks`);
  if (need > avail) avail = need;
  const room = avail - 2 * Mg;

  const HEAD = PAD + TITLE + TGAP + (order.some((n) => { const f = fieldsR(n); return f[1] || f[2]; }) ? DROW : 0);
  const at = new Map();
  const boxes = [];
  let H = 0;
  const k = (room - (cols.length - 1) * GAPX - extra(GAPX)) / boxesW();
  const fixed = Math.max(boxW, sizeAs ? (room - (sizeAs - 1) * GAPX) / sizeAs : 0);
  const wOf = (ci) => (stretch ? colW[ci] * k : fixed);
  const gap = stretch || cols.length < 2 ? GAPX : Math.min(maxWire, (room - cols.length * fixed) / (cols.length - 1));
  const gapAt = (i) => (wide.has(i) ? Math.max(gap, TWIN_GAP) : gap);
  const left = [Mg];
  for (let i = 1; i < cols.length; i++) left[i] = left[i - 1] + wOf(i - 1) + gapAt(i - 1);
  cols.forEach((col, ci) => {
    let y = 0;
    for (const n of col) {
      const { ins, outs } = portsOf(n);
      const top = y + HEAD;
      const h = HEAD + Math.max(ins.length, outs.length, 1) * ROW + PAD / 2;
      const x = left[ci], w = wOf(ci);
      boxes.push({ n, x, y, w, h });
      ins.forEach((p, i) => at.set(p.id, { x, y: top + i * ROW + ROW / 2, side: 'l' }));
      outs.forEach((p, i) => at.set(p.id, { x: x + w, y: top + i * ROW + ROW / 2, side: 'r' }));
      y += h + PAD * 2;
    }
    H = Math.max(H, y - PAD * 2);
  });
  const rowH = H;
  if (backs.length) H += LANE * (backs.length + 1);

  const mono = { 'font-family': FAMILY.mono };
  const colour = (m) => MEDIUM_COLOURS[m] || INK.fg;
  const wires = [], top = [], opts = [];
  for (const b of boxes) {
    const g = [tag('rect', { x: n2(b.x + 0.5), y: n2(b.y + 0.5), width: n2(b.w - 1), height: n2(b.h - 1), rx: 4, fill: INK.card2, stroke: INK.line2 })];
    const ty = b.y + PAD + TITLE - 2;
    g.push(tag('text', { x: n2(b.x + PAD), y: n2(ty), ...mono, 'font-size': TITLE, fill: INK.fg }, b.n.id));
    const [f1, f2, f3] = fieldsR(b.n), fy = ty + TGAP + DROW - 2;
    const field = (f, x, y, anchor) => f && g.push(tag('text',
      { x: n2(x), y: n2(y), 'text-anchor': anchor === 'start' ? null : anchor, 'font-family': FAMILY.sans, 'font-size': FONT, fill: INK.dim2 }, f.text));
    field(f1, b.x + b.w - PAD, ty, 'end');
    field(f2, b.x + PAD, fy, 'start');
    field(f3, b.x + b.w - PAD, fy, 'end');
    top.push(`<g>${g.join('')}</g>`);
  }
  for (const p of ports) {
    const q = at.get(p.id);
    if (!q) continue;
    const linked = links.some((l) => l.from === p.id || l.to === p.id);
    const t = q.side === 'l' ? { x: q.x + PAD, y: q.y + 4, 'text-anchor': null } : { x: q.x - PAD, y: q.y + 4, 'text-anchor': 'end' };
    top.push(tag('text', { x: n2(t.x), y: n2(t.y), 'text-anchor': t['text-anchor'], ...mono, 'font-size': FONT,
      fill: colour(p.medium), 'fill-opacity': linked ? null : 0.45 }, portName(p.id)));
  }
  const twins = new Map();
  for (const l of links) { const key = `${l.from} ${l.to}`; twins.set(key, [...(twins.get(key) || []), l]); }
  const FAN = 10;
  for (const l of links) {
    const tw = twins.get(`${l.from} ${l.to}`), o = (tw.indexOf(l) - (tw.length - 1) / 2) * FAN;
    const a = at.get(l.from), b = at.get(l.to);
    if (!a || !b) continue;
    const medium = ports.find((p) => p.id === l.from)?.medium || '';
    const kk = Math.max(24, Math.abs(b.x - a.x) / 2);
    const j = backs.indexOf(l) + 1;
    let d, mid;
    if (j) {
      const y = rowH + LANE * j, xr = a.x + 8 + STEP * (j - 1), xl = b.x - 8 - STEP * (j - 1);
      d = rounded([[a.x, a.y], [xr, a.y], [xr, y], [xl, y], [xl, b.y], [b.x, b.y]]);
      mid = { x: (xr + xl) / 2, y };
    } else if (o && Math.abs(b.y - a.y) < 1) {
      const e = 4, s = Math.min(10, (b.x - a.x) / 4);
      d = rounded([[a.x, a.y], [a.x + e, a.y], [a.x + e + s, a.y + o], [b.x - e - s, b.y + o], [b.x - e, b.y], [b.x, b.y]], 4);
      mid = { x: (a.x + b.x) / 2, y: a.y + o };
    } else {
      d = `M${n2(a.x)},${n2(a.y)} C${n2(a.x + kk)},${n2(a.y + o * 2)} ${n2(b.x - kk)},${n2(b.y + o * 2)} ${n2(b.x)},${n2(b.y)}`;
      // the cubic's own middle, t = 0.5, which is where bay-view's
      // getPointAtLength(n / 2) lands on a symmetric S curve
      mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + o * 1.5 };
    }
    const timed = printOptions(l.options, TIMING_NAMES);
    wires.unshift(tag('path', { d, fill: 'none', stroke: colour(medium), 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-dasharray': timed ? '6 4' : null }));
    if (timed) {
      // the same ladder bay-view climbs: the full option, then the node it
      // follows, then the option's name, then nothing but the dash
      const roomX = Math.abs(b.x - a.x) + 12;
      const fit = [timed, timed.replace(/follow (\S+?):(\S+?):\S+/, 'follow $1:$2'), timed.split(' ')[0]].find((w) => W(w, FONT - 1) <= roomX);
      if (fit) opts.push(tag('text', { x: n2(mid.x), y: n2(mid.y - 6), 'text-anchor': 'middle', ...mono, 'font-size': FONT - 1,
        fill: colour(medium), stroke: INK.bg, 'stroke-width': 3, 'paint-order': 'stroke' }, fit));
    }
  }
  const body = wires.join('') + top.join('') + opts.join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n2(avail + 2)}" height="${n2(H + 2)}" viewBox="-1 -1 ${n2(avail + 2)} ${n2(H + 2)}">${body}</svg>`;
  return { width: avail, height: H, body, svg, boxes: boxes.map((b) => ({ id: b.n.id, x: b.x, y: b.y, w: b.w, h: b.h })) };
}
