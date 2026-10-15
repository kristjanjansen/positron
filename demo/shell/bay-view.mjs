// demo/shell/bay-view.mjs: the bay drawn from its own nodes, ports and links and nothing else.
// Out ports on the right or bottom, in ports left or top, wires coloured by medium, no arrowheads.
// Wide hosts chain left to right; a phone stacks top to bottom.
// why: lessons/kit-bay-view.md#header

import { TIMING_NAMES, printOptions } from './link-options.mjs';
import { BAY_GEOMETRY, ranks, rounded, nodeOf, portName, layoutBay, layoutPair, acrossWire } from './bay-layout.mjs';

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, text) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
};

const { FONT, TITLE, ROW, PAD, TGAP, DROW, PLANE } = BAY_GEOMETRY;
// bay-svg.mjs and older callers read these from here.
export { BAY_GEOMETRY, ranks, rounded };

export function createBayView(bay, { stretch = true, sizeAs = 0, maxWire = Infinity, detail = null, arrange = 'auto' } = {}) {
  // stretch, sizeAs, maxWire and detail size the boxes and wires; see the lesson for each.
  // `arrange: 'pair'` is two facing columns at any width (lessons/kit-bay-layout.md#pair).
  // why: lessons/kit-bay-view.md#options
  const el = document.createElement('div');
  el.className = 'lv';
  const svg = s('svg', { class: 'lv-svg' });
  el.append(svg);
  let measure = null;
  const wires = new Map();       // link id -> its <path>, for a page that animates them

  function width(text, size, sans = false) {
    if (!measure) {
      const mono = getComputedStyle(el).fontFamily || 'monospace';
      const sansF = getComputedStyle(document.documentElement).getPropertyValue('--sans').trim() || 'sans-serif';
      const c = document.createElement('canvas').getContext('2d');
      measure = (t, px, sn) => { c.font = `${px}px ${sn ? sansF : mono}`; return c.measureText(t).width; };
    }
    return measure(text, size, sans);
  }
  const fieldsOf = (n) => (detail ? detail(n) || [] : []).map((f) => (f == null ? null : typeof f === 'string' ? { text: f } : f));

  function render() {
    let avail = el.clientWidth;
    if (!avail) return;
    const ports = bay.ports(), links = bay.links();
    const L = (arrange === 'pair' ? layoutPair : layoutBay)({ nodes: bay.nodes(), ports, links }, { avail, stretch, sizeAs, maxWire, fieldsOf, width });
    const { across, need, boxes, at, fieldsR, portsOf, order, backs, pairCount, longest } = L;
    avail = L.avail;
    el.style.overflowX = across && need > el.clientWidth ? 'auto' : '';
    svg.replaceChildren();
    wires.clear();
    const laneOf = new Map();      // phone: link id -> its gutter lane
    let laneX = () => 0;
    let H = L.H;
    if (!across) {
      // A phone: full width cards, ports on the right edge one per row, wires in a right gutter,
      // one lane each, reused where their spans do not overlap.
      // why: lessons/kit-bay-view.md#phone
      // A title that collides with its ports gets a row of its own; that moves every span, so the
      // lanes are worked out again until it settles (a card only gains rows).
      // why: lessons/kit-bay-view.md#title-rows
      const off = new Map(order.map((n) => [n.id, 0]));
      const lay = () => {
        boxes.length = 0; at.clear(); laneOf.clear();
        let y = 0;
        for (const n of order) {
          const { ins, outs } = portsOf(n), o = off.get(n.id);
          const rows = Math.max(o + ins.length + outs.length, fieldsR(n)[0] ? 2 : 1);
          const h = rows * ROW + PAD;
          boxes.push({ n, x: 0, y, h, ins, outs, phone: true });
          [...ins, ...outs].forEach((p, i) => at.set(p.id, { y: y + PAD / 2 + (o + i) * ROW + ROW / 2, side: 'r' }));
          y += h + PAD;
        }
        H = y - PAD;
        // A fan (one outlet to many, or many into one inlet) shares one lane as a trunk with
        // branches; twins with the same two ends keep a lane each.
        // why: lessons/kit-bay-view.md#fan-lane
        const live = links.filter((l) => at.has(l.from) && at.has(l.to));
        const count = (k) => live.filter((l) => l.from === k || l.to === k).length;
        const keyOf = (l) => (pairCount.get(`${l.from} ${l.to}`) > 1 ? l.id
          : count(l.from) > 1 ? `o ${l.from}` : count(l.to) > 1 ? `i ${l.to}` : l.id);
        const groups = new Map();
        for (const l of live) {
          const a = at.get(l.from).y, b = at.get(l.to).y, k = keyOf(l);
          const g = groups.get(k) || { ls: [], lo: Infinity, hi: -Infinity };
          g.ls.push(l); g.lo = Math.min(g.lo, a, b); g.hi = Math.max(g.hi, a, b);
          groups.set(k, g);
        }
        const spans = [...groups.values()].sort((p, q) => (p.hi - p.lo) - (q.hi - q.lo));
        const taken = [];             // per lane, the spans already in it
        for (const sp of spans) {
          let i = taken.findIndex((ls) => ls.every((o) => sp.hi < o.lo - 6 || sp.lo > o.hi + 6));
          if (i < 0) { i = taken.length; taken.push([]); }
          taken[i].push(sp);
          for (const l of sp.ls) laneOf.set(l.id, i);
        }
        return taken.length;
      };
      // What sits on row r of a card on its left: the title on 0, the field on 1.
      const leftW = (n, r) => (r === 0 ? width(n.id, TITLE) : r === 1 && fieldsR(n)[0] ? width(fieldsR(n)[0].text, FONT, true) : 0);
      const collides = (n, bw) => {
        const { ins, outs } = portsOf(n), o = off.get(n.id);
        return [...ins, ...outs].some((p, i) => {
          const lw = leftW(n, o + i);
          return lw && PAD + lw + PAD + width(portName(p.id), FONT) + PAD > bw;
        });
      };
      const minW = Math.ceil(Math.max(...order.map((n) => {
        const { ins, outs } = portsOf(n), f = fieldsR(n)[0];
        return Math.max(width(n.id, TITLE), f ? width(f.text, FONT, true) : 0, longest(ins), longest(outs)) + 2 * PAD;
      })));
      let lanes = 0, bw = 0;
      for (let pass = 0; pass < 8; pass++) {
        lanes = lay();
        bw = Math.max(minW, avail - (8 + PLANE * lanes));
        let moved = false;
        for (const n of order) {
          if (!collides(n, bw)) continue;
          // the title alone first, then the field under it as well
          const next = off.get(n.id) + 1;
          if (next > (fieldsR(n)[0] ? 2 : 1)) continue;
          off.set(n.id, next); moved = true;
        }
        if (!moved) break;
      }
      const need = bw + 8 + PLANE * lanes;
      if (need > avail) { avail = need; el.style.overflowX = 'auto'; }
      for (const b of boxes) b.w = bw;
      for (const q of at.values()) q.x = bw;
      laneX = (i) => bw + 8 + PLANE * i;
    }
    svg.setAttribute('viewBox', `-1 -1 ${avail + 2} ${H + 2}`);
    svg.setAttribute('width', avail + 2);
    svg.setAttribute('height', H + 2);

    for (const b of boxes) {
      const g = s('g', { class: 'lv-box' });
      g.append(s('rect', { x: b.x + 0.5, y: b.y + 0.5, width: b.w - 1, height: b.h - 1, rx: 4 }));
      const ty = b.phone ? b.y + PAD / 2 + ROW / 2 + 5 : b.y + PAD + TITLE - 2;
      g.append(s('text', { x: b.x + PAD, y: ty, class: 'lv-title' }, b.n.id));
      const [f1, f2, f3] = fieldsR(b.n), fy = ty + TGAP + DROW - 2;
      const field = (f, x, y, anchor) => f && g.append(s('text',
        { x, y, 'text-anchor': anchor, class: 'lv-f' }, f.text));
      if (b.phone) { field(f1, b.x + PAD, b.y + PAD / 2 + ROW * 1.5 + 4, 'start'); svg.append(g); continue; }
      if (b.pair) { field(f1, b.x + PAD, ty + DROW, 'start'); svg.append(g); continue; }
      field(f1, b.x + b.w - PAD, ty, 'end');
      field(f2, b.x + PAD, fy, 'start');
      field(f3, b.x + b.w - PAD, fy, 'end');
      svg.append(g);
    }
    // Ports: the port's own name just inside the edge its wire meets.
    for (const p of ports) {
      const q = at.get(p.id);
      if (!q) continue;
      const linked = links.some((l) => l.from === p.id || l.to === p.id);
      const t = q.side === 'l' ? { x: q.x + PAD, y: q.y + 4, 'text-anchor': 'start' }
        : q.side === 'r' ? { x: q.x - PAD, y: q.y + 4, 'text-anchor': 'end' }
        : q.side === 't' ? { x: q.x, y: q.y + ROW - 4, 'text-anchor': 'middle' }
        : { x: q.x, y: q.y - 8, 'text-anchor': 'middle' };
      svg.append(s('text', { ...t, class: `lv-pname md-${p.medium}${linked ? '' : ' lv-free'}` }, portName(p.id)));
    }
    // Wires, outlet to inlet, under the boxes' text. Links with the same two
    // ends (an octaver's three transposes) fan out instead of lying on one line.
    const twins = new Map();
    for (const l of links) { const k = `${l.from} ${l.to}`; twins.set(k, [...(twins.get(k) || []), l]); }
    const FAN = 10;
    for (const l of links) {
      const tw = twins.get(`${l.from} ${l.to}`), o = (tw.indexOf(l) - (tw.length - 1) / 2) * FAN;
      const a = at.get(l.from), b = at.get(l.to);
      if (!a || !b) continue;
      const medium = ports.find((p) => p.id === l.from)?.medium || '';
      const j = backs.indexOf(l) + 1;
      let d;
      if (L.wire) ({ d } = L.wire(l, o));
      else if (!across) {           // phone: out the right edge, into its lane, along, back in
        const x = laneX(laneOf.get(l.id));
        d = rounded([[a.x, a.y], [x, a.y], [x, b.y], [b.x, b.y]], 5);
      } else ({ d } = acrossWire(a, b, o, j, L));
      // A timed link (`ahead`, `follow`) is dashed and carries its option text at its middle;
      // the only typed label this view draws.
      // why: lessons/kit-bay-view.md#timed-label
      const timed = printOptions(l.options, TIMING_NAMES);
      const path = s('path', { d, class: `lv-wire md-${medium}${timed ? ' lv-timed' : ''}` });
      wires.set(l.id, path);
      svg.insertBefore(path, svg.firstChild);
      if (timed) {
        path.append(s('title', {}, `${timed}: the receiver fires on the time the sender stamped`));
        let mid = null;
        try { const n = path.getTotalLength(); mid = path.getPointAtLength(n / 2); } catch { /* not laid out */ }
        // Not on a phone, where the middle is a few px from the screen edge. The words must fit
        // between the two boxes, so it falls back to shorter forms, then the dash alone.
        // why: lessons/kit-bay-view.md#timed-label-fit
        if (mid && across) {
          const room = Math.abs(b.x - a.x) + 12;   // it may lap the two box edges a little
          const t = s('text', { x: mid.x, y: mid.y - 6, 'text-anchor': 'middle', class: `lv-opt md-${medium}` }, timed);
          svg.append(t);
          for (const w of [timed.replace(/follow (\S+?):(\S+?):\S+/, 'follow $1:$2'), timed.split(' ')[0]]) {
            let len = 0;
            try { len = t.getComputedTextLength(); } catch { /* not laid out */ }
            if (len <= room) break;
            t.textContent = w;
          }
          let len = 0;
          try { len = t.getComputedTextLength(); } catch { /* not laid out */ }
          if (len > room) t.remove();
        }
      }
    }
  }

  new ResizeObserver(render).observe(el);
  return { el, render, wires, setDetail(fn) { detail = fn; render(); } };
}

export const BAY_VIEW_CSS = `
  .lv { width: 100%; font-family: var(--mono); }
  .lv-svg { display: block; overflow: visible; }
  .lv-box rect { fill: var(--card2); stroke: var(--line2); }
  .lv-title { fill: var(--fg); font-size: ${TITLE}px; }
  .lv-pname { font-size: ${FONT}px; fill: currentColor; }
  /* Titles and port names name, so they are mono; the notes are read, so they are
     Geist. Asked 2026-10-12: "put sans serif back to the pathcbay non-title
     non-inlet texts". */
  .lv-f { font-size: ${FONT}px; fill: var(--dim2); font-family: var(--sans); }
  .lv-wire { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
  .lv-free { opacity: 0.45; }
  .lv-timed { stroke-dasharray: 6 4; }
  .lv-opt { font-size: ${FONT - 1}px; fill: currentColor; paint-order: stroke; stroke: var(--bg); stroke-width: 3px; }
`;

/** What one site holds, as something `createBayView` can draw: the site's own
 *  nodes, every node a link it holds reaches, and one box per wildcard end
 *  (`*:chat` is every other tab). A wildcard end has no port in the bay, so
 *  it takes the medium of the port at the link's other end. Pass a function
 *  that answers a fresh bay, for a page that builds one per action. */
export function heldPicture(source, site, { star = 'every other tab' } = {}) {
  const bayOf = () => (typeof source === 'function' ? source() : source);
  const read = () => {
    const b = bayOf(), links = b.links();
    const ports = new Map(), nodes = new Map();
    const addNode = (id) => { if (!nodes.has(id)) nodes.set(id, b.node(id) || { id, label: id.startsWith('*:') ? star : '' }); };
    for (const p of b.ports()) if (p.id.split(':')[0] === site) { ports.set(p.id, p); addNode(nodeOf(p.id)); }
    for (const l of links) {
      for (const [id, other, dir] of [[l.from, l.to, 'out'], [l.to, l.from, 'in']]) {
        if (!ports.has(id)) ports.set(id, b.port(id) || { id, dir, medium: b.port(other)?.medium || '' });
        addNode(nodeOf(id));
      }
    }
    return { nodes: [...nodes.values()], ports: [...ports.values()], links };
  };
  return { nodes: () => read().nodes, ports: () => read().ports, links: () => read().links };
}
