// demo/shell/bay-layout.mjs: where the patchbay picture's boxes, ports and
// across wires go, as numbers and with no DOM. `createBayView` (bay-view.mjs)
// draws it in a page and `drawBay` (bay-svg.mjs) writes it as an SVG string;
// both lay out through `layoutBay` and `acrossWire`, so a desk layout change
// is made once. Text is measured by the caller's `width(text, px, sans)`.

export const FONT = 11, TITLE = 13, ROW = 20, PAD = 10, GAP = 48, MIN_GAP = 28, STACK_BELOW = 480, TWIN_GAP = 64, TGAP = 10, DROW = 16, PLANE = 8;
export const BAY_GEOMETRY = { FONT, TITLE, ROW, PAD, GAP, MIN_GAP, STACK_BELOW, TWIN_GAP, TGAP, DROW, PLANE };
export const nodeOf = (portId) => portId.split(':').slice(0, 2).join(':');
export const portName = (portId) => portId.split(':').slice(2).join(':');

/** A path through `pts` with every corner rounded at radius `r` (smaller
 *  where a leg is too short for it). Legs may be straight or slanted. */
export function rounded(pts, r = 6) {
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
export function ranks(nodes, links) {
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

/**
 * The across arrangement of a bay in `avail` px, or the decision that it
 * stacks. Options as `createBayView` takes them; `fieldsOf(n)` is the
 * detail fields normalised, `width(text, px, sans)` measures text.
 * Returns `across`, the widened `avail` and `need`, `boxes` and `at` (port id
 * to `{ x, y, side }`, empty when it stacks), `H` and `rowH`, and the pieces
 * the stacked layout and the writers read: `fieldsR`, `portsOf`, `order`,
 * `backs`, `pairCount`, `longest`, `HEAD`, `LANE`, `STEP`.
 */
export function layoutBay({ nodes, ports, links }, { avail, stretch = true, sizeAs = 0, maxWire = Infinity, fieldsOf, width }) {
  /* 🔴 A ROW THAT DOES NOT FIT FOLDS ITS LABELS FIRST, 2026-10-11. Asked:
     *"adjust rendering so the connectors fit into w"*, when the relay box
     (`cf-relay:<room>`, patchbay.mjs) made a three box chat 15 px wider than
     the page and its return wire ran off the right edge. The grey field
     beside a title moves under it, which narrows every box to its title or
     its ports, before the row is allowed to scroll. */
  let folded = false;
  const fieldsR = (n) => { const f = fieldsOf(n); return folded && f[0] && !f[1] ? [null, f[0], f[2]] : f; };
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
  // label beside its own longest out label.
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
  const room = avail - 2 * M;

  // Under the title: TGAP in a compact box, a grey line of fields in a detailed one.
  const HEAD = PAD + TITLE + TGAP + (order.some((n) => { const f = fieldsR(n); return f[1] || f[2]; }) ? DROW : 0);
  const at = new Map();
  const boxes = [];
  let H = 0, rowH = 0;
  if (across) {
    // Stretched: the spare width is shared out in proportion to each
    // column's own width, so a wide column stays the wider one.
    const k = (room - (cols.length - 1) * GAPX - extra(GAPX)) / boxesW();
    const fixed = Math.max(boxW, sizeAs ? (room - (sizeAs - 1) * GAPX) / sizeAs : 0);
    const wOf = (ci) => (stretch ? colW[ci] * k : fixed);
    const gap = stretch || cols.length < 2 ? GAPX : Math.min(maxWire, (room - cols.length * fixed) / (cols.length - 1));
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
    rowH = H;
    if (backs.length) H += LANE * (backs.length + 1);
  }
  return { across, avail, need, boxes, at, H, rowH, fieldsR, portsOf, order, backs, pairCount, longest, HEAD, LANE, STEP };
}

/**
 * An across wire from outlet `a` to inlet `b`: a return wire (`j`, its
 * 1-based place among the return links) runs under the row, a twin `o` px
 * off its pair on a level run splits and rejoins, anything else is an S curve.
 * `f` formats the S curve's numbers. Returns `{ d, mid }`, `mid` where an
 * option's words go.
 */
export function acrossWire(a, b, o, j, { rowH, LANE, STEP }, f = (v) => v) {
  if (j) {
    const y = rowH + LANE * j, xr = a.x + 8 + STEP * (j - 1), xl = b.x - 8 - STEP * (j - 1);
    return { d: rounded([[a.x, a.y], [xr, a.y], [xr, y], [xl, y], [xl, b.y], [b.x, b.y]]), mid: { x: (xr + xl) / 2, y } };
  }
  if (o && Math.abs(b.y - a.y) < 1) {
    const e = 4, s = Math.min(10, (b.x - a.x) / 4);
    return { d: rounded([[a.x, a.y], [a.x + e, a.y], [a.x + e + s, a.y + o], [b.x - e - s, b.y + o], [b.x - e, b.y], [b.x, b.y]], 4), mid: { x: (a.x + b.x) / 2, y: a.y + o } };
  }
  const k = Math.max(24, Math.abs(b.x - a.x) / 2);
  // the cubic's own middle, t = 0.5, where getPointAtLength(n / 2) lands on a symmetric S curve
  return { d: `M${f(a.x)},${f(a.y)} C${f(a.x + k)},${f(a.y + o * 2)} ${f(b.x - k)},${f(b.y + o * 2)} ${f(b.x)},${f(b.y)}`, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + o * 1.5 } };
}
