// demo/shell/bay-view.mjs: the bay drawn from its own data and nothing
// else. A box is a node (`bay.nodes()`), its inlets and outlets are its ports
// (`bay.ports()`, in on the left, out on the right), and a wire is a link
// (`bay.links()`) from the outlet it names to the inlet it names, coloured by
// the out port's medium, with no arrowhead: out is always the right or
// bottom edge and in the left or top, as on a patch cable. No typed labels,
// no notes: rename a port and the picture follows. Wide hosts chain left to right; a phone stacks top to
// bottom with inlets on the top edge and outlets on the bottom.

const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, text) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
};

const FONT = 11, TITLE = 13, ROW = 20, PAD = 10, GAP = 48, MIN_GAP = 28, STACK_BELOW = 480, TWIN_GAP = 64, TGAP = 10, DROW = 16, PLANE = 8;
const nodeOf = (portId) => portId.split(':').slice(0, 2).join(':');
const portName = (portId) => portId.split(':').slice(2).join(':');

/** A path through `pts` with every corner rounded at radius `r` (smaller
 *  where a leg is too short for it). Legs may be straight or slanted. */
function rounded(pts, r = 6) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y);
    const k = Math.min(r, l1 / 2, l2 / 2);
    if (!l1 || !l2) continue;
    const u = [(x - px) / l1, (y - py) / l1], v = [(nx - x) / l2, (ny - y) / l2];
    d += ` L${x - u[0] * k},${y - u[1] * k} Q${x},${y} ${x + v[0] * k},${y + v[1] * k}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L${lx},${ly}`;
}

/** Column of each node: the longest chain of links that reaches it. A link
 *  that closes a loop (a chat's speaker and listener) is a RETURN link: it is
 *  left out of the ranking and drawn back under the row instead. */
function ranks(nodes, links) {
  const out = new Map(nodes.map((n) => [n.id, []]));
  for (const l of links) {
    const a = nodeOf(l.from), b = nodeOf(l.to);
    if (a !== b && out.has(a) && out.has(b)) out.get(a).push([l, b]);
  }
  const back = new Set(), state = new Map();      // 1 on the stack, 2 done
  const visit = (id) => {
    state.set(id, 1);
    for (const [l, b] of out.get(id)) {
      if (state.get(b) === 1) back.add(l.id);
      else if (!state.get(b)) visit(b);
    }
    state.set(id, 2);
  };
  for (const n of nodes) if (!state.get(n.id)) visit(n.id);
  const r = new Map(nodes.map((n) => [n.id, 0]));
  for (let i = 0; i < nodes.length; i++) {
    let moved = false;
    for (const [id, ls] of out) for (const [l, b] of ls) {
      if (back.has(l.id) || r.get(b) >= r.get(id) + 1) continue;
      r.set(b, r.get(id) + 1); moved = true;
    }
    if (!moved) break;
  }
  return { rank: r, back };
}

export function createBayView(bay, { stretch = true, sizeAs = 0, maxWire = Infinity, detail = null } = {}) {
  // stretch: boxes share the width and wires keep GAP; false keeps each box
  // at its own width and gives the rest to the wires. sizeAs: n draws a box
  // as wide as one in a row of n stretched boxes. maxWire caps the gap a
  // wire crosses when stretch is false; the row then sits at the left.
  // detail: (node) => [beside the title, under it left, under it right], each a
  // string or { text, sans }, drawn grey. Without it a box is compact.
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
    /* 🔴 A ROW THAT DOES NOT FIT FOLDS ITS LABELS FIRST, 2026-10-11. Asked:
       *"adjust rendering so the connectors fit into w"*, when the relay box
       (`cf-relay:<room>`, patchbay.mjs) made a three box chat 15 px wider than
       the page and its return wire ran off the right edge. The grey field
       beside a title moves under it, which narrows every box to its title or
       its ports, before the row is allowed to scroll. */
    let folded = false;
    const fieldsR = (n) => { const f = fieldsOf(n); return folded && f[0] && !f[1] ? [null, f[0], f[2]] : f; };
    const nodes = bay.nodes(), ports = bay.ports(), links = bay.links();
    const portsOf = (n) => {
      const mine = ports.filter((p) => nodeOf(p.id) === n.id);
      return { ins: mine.filter((p) => p.dir === 'in'), outs: mine.filter((p) => p.dir === 'out') };
    };
    const { rank, back } = ranks(nodes, links);
    const backs = links.filter((l) => back.has(l.id));
    const LANE = 10;                // room per return wire, under the row or beside the stack
    const cols = [];
    for (const n of nodes) (cols[rank.get(n.id)] ??= []).push(n);
    const order = cols.flat();

    // Box width from what each box holds: its title, and its own longest in
    // label beside its own longest out label. One width for every box.
    const longest = (ps) => Math.max(0, ...ps.map((p) => width(portName(p.id), FONT)));
    // One width per COLUMN, from the boxes in it, since 2026-10-11 (*"adjust
    // rendering so the connectors fit into w"*): one width for every box made
    // a four column chain as wide as four of its widest box, and Yoshimi's
    // row ran off the page for one long knob name in the first column.
    const nodeW = (n) => {
      const { ins, outs } = portsOf(n);
      const [f1, f2, f3] = fieldsR(n), fw = (f) => (f ? width(f.text, FONT, f.sans) : 0);
      return Math.max(width(n.id, TITLE) + fw(f1) + (f1 ? 3 : 2) * PAD,
        fw(f2) + fw(f3) + (f2 && f3 ? 3 : 2) * PAD,
        longest(ins) + longest(outs) + (ins.length && outs.length ? 3 : 2) * PAD);
    };
    const boxWidth = () => Math.ceil(Math.max(...order.map(nodeW)));
    const colWidths = () => cols.map((col) => Math.ceil(Math.max(...col.map(nodeW))));
    let boxW = boxWidth(), colW = colWidths();
    // What the boxes need side by side: each column its own width when the
    // boxes stretch, one width for all when a page asked for that (sizeAs, no stretch).
    const boxesW = () => (stretch ? colW.reduce((a, b) => a + b, 0) : cols.length * boxW);
    // Return wires run in lanes outside the boxes, so the row gives up a
    // margin on each side for them: STEP per wire, plus room for a corner.
    const STEP = 6, M = backs.length ? 8 + STEP * backs.length : 0;
    // Across if the row fits at the full GAP, or at MIN_GAP before giving up
    // and stacking: a four box chain should stay a chain at desk width.
    // A gap that twin links cross (same two ends) is at least TWIN_GAP, so
    // they have room to split, run side by side and rejoin.
    const pairCount = new Map();
    for (const l of links) { const k = `${l.from} ${l.to}`; pairCount.set(k, (pairCount.get(k) || 0) + 1); }
    const wide = new Set(links.filter((l) => pairCount.get(`${l.from} ${l.to}`) > 1 && !back.has(l.id))
      .map((l) => rank.get(nodeOf(l.from))));
    const extra = (g) => wide.size * Math.max(0, TWIN_GAP - g);
    const gapFor = (g) => boxesW() + (cols.length - 1) * g + extra(g) + 2 * M <= avail;
    // Too wide even then: a wide host keeps the chain and scrolls sideways;
    // only a phone stacks. Stacking on a desk was tried 2026-10-10 and
    // refused: *"do not do vert layouts on desktop. overflow"*.
    if (avail >= STACK_BELOW && !gapFor(MIN_GAP) && order.some((n) => fieldsOf(n)[0] && !fieldsOf(n)[1])) { folded = true; boxW = boxWidth(); colW = colWidths(); }
    const GAPX = gapFor(GAP) ? GAP : MIN_GAP;
    const need = boxesW() + (cols.length - 1) * GAPX + extra(GAPX) + 2 * M;
    const across = gapFor(GAPX) || avail >= STACK_BELOW;
    if (across && need > avail) avail = need;
    el.style.overflowX = across && need > el.clientWidth ? 'auto' : '';
    const room = avail - 2 * M;

    // Under the title: TGAP in a compact box, a grey line of fields in a detailed one.
    const HEAD = PAD + TITLE + TGAP + (order.some((n) => { const f = fieldsR(n); return f[1] || f[2]; }) ? DROW : 0);
    svg.replaceChildren();
    wires.clear();
    const at = new Map();          // port id -> { x, y, side }
    const laneOf = new Map();      // phone: link id -> its gutter lane
    let laneX = () => 0;
    const boxes = [];
    let H = 0;
    if (across) {
      // Stretched: the spare width is shared out in proportion to each
      // column's own width, so a wide column stays the wider one.
      const k = (room - (cols.length - 1) * GAPX - extra(GAPX)) / boxesW();
      const fixed = Math.max(boxW, sizeAs ? (room - (sizeAs - 1) * GAPX) / sizeAs : 0);
      const wOf = (ci) => (stretch ? colW[ci] * k : fixed);
      const w = fixed;
      const gap = stretch || cols.length < 2 ? GAPX : Math.min(maxWire, (room - cols.length * w) / (cols.length - 1));
      const gapAt = (i) => (wide.has(i) ? Math.max(gap, TWIN_GAP) : gap);
      const left = [M];
      for (let i = 1; i < cols.length; i++) left[i] = left[i - 1] + wOf(i - 1) + gapAt(i - 1);
      cols.forEach((col, ci) => {
        let y = 0;
        for (const n of col) {
          const { ins, outs } = portsOf(n);
          const top = y + HEAD;
          const h = HEAD + Math.max(ins.length, outs.length, 1) * ROW + PAD / 2;
          const x = left[ci], w = wOf(ci);
          boxes.push({ n, x, y, w, h, ins, outs });
          ins.forEach((p, i) => at.set(p.id, { x, y: top + i * ROW + ROW / 2, side: 'l' }));
          outs.forEach((p, i) => at.set(p.id, { x: x + w, y: top + i * ROW + ROW / 2, side: 'r' }));
          y += h + PAD * 2;
        }
        H = Math.max(H, y - PAD * 2);
      });
    } else {
      // A phone: full width cards, title top left with the first field under
      // it, every port on the right edge one per row (ins, then outs), and every
      // wire in a gutter to the right, one lane each, reused where their
      // vertical spans do not overlap (plans/plan-links-view-phone.md).
      let y = 0;
      for (const n of order) {
        const { ins, outs } = portsOf(n);
        const rows = Math.max(ins.length + outs.length, fieldsR(n)[0] ? 2 : 1);
        const h = rows * ROW + PAD;
        boxes.push({ n, x: 0, y, h, ins, outs, phone: true });
        [...ins, ...outs].forEach((p, i) => at.set(p.id, { y: y + PAD / 2 + i * ROW + ROW / 2, side: 'r' }));
        y += h + PAD;
      }
      H = y - PAD;
      const spans = links.filter((l) => at.has(l.from) && at.has(l.to)).map((l) => {
        const a = at.get(l.from).y, b = at.get(l.to).y;
        return { l, lo: Math.min(a, b), hi: Math.max(a, b) };
      }).sort((p, q) => (p.hi - p.lo) - (q.hi - q.lo));
      const taken = [];               // per lane, the spans already in it
      for (const sp of spans) {
        let i = taken.findIndex((ls) => ls.every((o) => sp.hi < o.lo - 6 || sp.lo > o.hi + 6));
        if (i < 0) { i = taken.length; taken.push([]); }
        taken[i].push(sp);
        laneOf.set(sp.l.id, i);
      }
      const bw = avail - (8 + PLANE * taken.length);
      for (const b of boxes) b.w = bw;
      for (const q of at.values()) q.x = bw;
      laneX = (i) => bw + 8 + PLANE * i;
    }
    const rowH = H;
    if (across && backs.length) H += LANE * (backs.length + 1);
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
        { x, y, 'text-anchor': anchor, class: `lv-f${f.sans ? ' lv-f-sans' : ''}` }, f.text));
      if (b.phone) { field(f1, b.x + PAD, b.y + PAD / 2 + ROW * 1.5 + 4, 'start'); svg.append(g); continue; }
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
      const k = across ? Math.max(24, Math.abs(b.x - a.x) / 2) : Math.max(16, Math.abs(b.y - a.y) / 2);
      const j = backs.indexOf(l) + 1;
      let d;
      if (!across) {                // phone: out the right edge, into its lane, along, back in
        const x = laneX(laneOf.get(l.id));
        d = rounded([[a.x, a.y], [x, a.y], [x, b.y], [b.x, b.y]], 5);
      } else if (j && across) {            // a return wire: right out of the box, down, under the row, up, in from the left
        const y = rowH + LANE * j, xr = a.x + 8 + STEP * (j - 1), xl = b.x - 8 - STEP * (j - 1);
        d = rounded([[a.x, a.y], [xr, a.y], [xr, y], [xl, y], [xl, b.y], [b.x, b.y]]);
      } else if (o && across && Math.abs(b.y - a.y) < 1) {
        // a twin on a level run: split just after the outlet, run parallel, rejoin before the inlet
        const e = 4, s = Math.min(10, (b.x - a.x) / 4);
        d = rounded([[a.x, a.y], [a.x + e, a.y], [a.x + e + s, a.y + o], [b.x - e - s, b.y + o], [b.x - e, b.y], [b.x, b.y]], 4);
      } else d = across
        ? `M${a.x},${a.y} C${a.x + k},${a.y + o * 2} ${b.x - k},${b.y + o * 2} ${b.x},${b.y}`
        : `M${a.x},${a.y} C${a.x + o * 2},${a.y + k} ${b.x + o * 2},${b.y - k} ${b.x},${b.y}`;
      const path = s('path', { d, class: `lv-wire md-${medium}` });
      wires.set(l.id, path);
      svg.insertBefore(path, svg.firstChild);
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
  .lv-f { font-size: ${FONT}px; fill: var(--dim2); }
  .lv-f-sans { font-family: var(--sans); }
  .lv-wire { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
  .lv-free { opacity: 0.45; }
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
