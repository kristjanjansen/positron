// demo/shell/bay-svg.mjs: the patchbay picture as an SVG string with no DOM, for Node, a Worker
// or a browser. Every attribute is literal (resvg has no cascade). Layout is bay-layout.mjs;
// the phone arrangement is not ported, so a width under STACK_BELOW throws.
// why: lessons/kit-bay-svg.md#header
import { BAY_GEOMETRY, nodeOf, portName, layoutBay, acrossWire } from './bay-layout.mjs';
import { MEDIUM_COLOURS } from './patchbay.mjs';
import { TIMING_NAMES, printOptions } from './link-options.mjs';
import M from './font-metrics.mjs';

const { FONT, TITLE, PAD, STACK_BELOW, TGAP, DROW } = BAY_GEOMETRY;

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
  if (!(width > 0)) throw new Error('drawBay needs a width');
  const nodes = read(bay.nodes), ports = read(bay.ports), links = read(bay.links);
  const fieldsOf = (n) => (detail ? detail(n) || [] : []).map((f) => (f == null ? null : typeof f === 'string' ? { text: f } : f));
  const W = (t, size) => textWidth(t, 'mono', size);
  const L = layoutBay({ nodes, ports, links }, { avail: width, stretch, sizeAs, maxWire, fieldsOf,
    width: (t, size, sans) => textWidth(t, sans ? 'sans' : 'mono', size) });
  if (!L.across) throw new Error(`drawBay draws the across arrangement only; ${width} px is under ${STACK_BELOW}, where bay-view stacks`);
  const { avail, H, boxes, at, fieldsR, backs } = L;

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
    const { d, mid } = acrossWire(a, b, o, backs.indexOf(l) + 1, L, n2);
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
