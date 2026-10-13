// demo/shell/bay-view.mjs: the bay drawn from its own data and nothing
// else. A box is a node (`bay.nodes()`), its inlets and outlets are its ports
// (`bay.ports()`, in on the left, out on the right), and a wire is a link
// (`bay.links()`) from the outlet it names to the inlet it names, coloured by
// the out port's medium, with no arrowhead: out is always the right or
// bottom edge and in the left or top, as on a patch cable. No typed labels,
// no notes: rename a port and the picture follows. Wide hosts chain left to right; a phone stacks top to
// bottom with inlets on the top edge and outlets on the bottom.

import { TIMING_NAMES, printOptions } from './link-options.mjs';

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
      const [f1, f2, f3] = fieldsR(n), fw = (f) => (f ? width(f.text, FONT, true) : 0);
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
      /* 🔴 A TITLE THAT DOES NOT FIT BESIDE ITS PORTS GETS A LINE OF ITS OWN,
         2026-10-11. The first port row shared the title's line on every card,
         so on /typist/multi-typer/?n=6 at 375 px the gutter took 22 lanes, the
         cards shrank to 159 px and `web:typewriter-k` was drawn over its own
         `value-in` (40 overlapping labels, MEASURED). Each card now measures
         its title (and the grey field under it) against the port names on the
         same rows, and only a card that collides pushes its ports down a row
         or two. That moves every span, so the lanes are worked out again, and
         a narrower card can make another one collide: it settles in a few
         passes because a card only ever gains rows. A card narrower than its
         own longest name is not squeezed further: the picture widens and
         scrolls inside its own box. */
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
        // ⚠️ A FAN SHARES ONE LANE, 2026-10-11: every wire out of one outlet
        // (a sample store to six typewriters) or into one inlet (six fx boxes
        // to one speaker) runs in one lane as a trunk with branches, which is
        // how a patch bus is drawn. One lane per wire gave typist/040 at six
        // papers 26 lanes, a gutter wider than its cards. Twins (same two
        // ends) keep a lane each, so they still split, run and rejoin.
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
        { x, y, 'text-anchor': anchor, class: 'lv-f' }, f.text));
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
      /* 🔴 A TIMED LINK SAYS SO ON ITS WIRE, SINCE 2026-10-12. `ahead` and
         `follow` (link-options.mjs) change WHEN a message lands, which no
         port name shows, so a wire carrying one is dashed and carries its
         option in the link's own text form, `ahead 150`, at its middle, in the
         medium's colour. The one typed label this view draws, and only the
         timing ones: `w 640` on a video link changes what is asked for, not
         when, and stays off the picture as before. */
      const timed = printOptions(l.options, TIMING_NAMES);
      const path = s('path', { d, class: `lv-wire md-${medium}${timed ? ' lv-timed' : ''}` });
      wires.set(l.id, path);
      svg.insertBefore(path, svg.firstChild);
      if (timed) {
        path.append(s('title', {}, `${timed}: the receiver fires on the time the sender stamped`));
        let mid = null;
        try { const n = path.getTotalLength(); mid = path.getPointAtLength(n / 2); } catch { /* not laid out */ }
        // ⚠️ NOT ON A PHONE. There the wire's middle is its lane in the right
        // gutter, a few px from the screen edge, and the words ran off it
        // (MEASURED at 375 on /concepts/clock/030/). The dash and the hover stay.
        // It has to fit between the two boxes, or it lies on their port names
        // (MEASURED on /concepts/clock/040/, `follow web-1:cam:video-out` over
        // a 70 px gap). The full option, then the node it follows, then the
        // option's name alone, then nothing but the dash and the hover.
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
