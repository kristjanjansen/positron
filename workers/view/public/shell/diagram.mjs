// demo/shell/diagram.mjs — a picture of where the signal goes.
//
// For a page whose subject is a PATH — a key press that leaves this browser,
// crosses a rented computer, reaches a board in the studio and comes back as
// sound — the `what` paragraph is describing a SHAPE, in prose, badly. This
// draws the shape instead. plan-diagram.md is the brief; the decisions in it
// are taken and this file implements them rather than re-opening them.
//
//   const dg = createDiagram(host, {
//     title: 'a key press, and what it costs',
//     caption: 'one line under the picture',
//     nodes: [{ id:'you', label:'your browser', sub:'a key press', kind:'here' }, ...],
//     links: [{ from:'you', to:'relay', label:'note number' },
//             { from:'relay', to:'you', label:'', back:true }],
//   });
//   dg.cuts   // every label the drawer had to shorten, with the full text
//
// 🔴 IT DRAWS A DESCRIPTION, IT IS NEVER A DRAWING. Nothing anywhere positions
// a box. A page hands over the structure above and this file decides every
// pixel — which is the only reason the same structure can later grow a live
// number per box without the layout moving.
//
// ⚠️ SVG, AND THE TEXT IS IN THE SVG TOO. Not DOM text over a canvas: that
// needs the layout computed twice in two coordinate systems that drift the
// moment anything reflows, and it puts a label OUTSIDE the box it names, where
// it can end up beside the wrong one. Not `<foreignObject>` either — patchy in
// Safari and it re-introduces exactly that second coordinate system. The price
// is that SVG has no line wrapping at all, which is why the plan calls the
// wrapping "the actual work" and why it lives here, once, rather than in every
// page that draws a diagram.
//
// 🔴 THE TRAP, AND IT IS THE FIRST THING TO SUSPECT: `getComputedTextLength()`
// RETURNS 0 for a <text> that is not in the document, or that sits inside a
// `display: none` ancestor. Every label then measures as zero, every string
// "fits", and the whole diagram comes out one line per box with no wrapping
// and no cuts — which looks like a wrapping bug and is an attachment bug. So
// the probe is measured in the LIVE svg after it is attached, and if it still
// reads 0 the drawer falls back to an estimate, says so on `dg.measured`, and
// lays out again when the host finally has a size.

const NS = 'http://www.w3.org/2000/svg';

// ── the numbers, all of them, here ────────────────────────────────────────
// A constant belongs beside the thing it governs; these govern the whole
// picture, so this is beside it.
const PAD           = 2;    // keeps a 2 px stroke off the svg's own edge
const BOX_PAD_X     = 10;
const BOX_PAD_Y     = 9;
const SUB_GAP       = 3;    // between the last label line and the sub
const GAP_X_MAX     = 58;   // between columns: an arrow plus room for its name
const GAP_X_MIN     = 34;
const GAP_Y         = 16;   // between two boxes sharing a column
const GAP_Y_COL     = 30;   // between two boxes in the one-column layout
const BOX_TARGET_W  = 122;  // narrow the gaps until a box is at least this wide
const BOX_MIN_W     = 92;   // narrower than this and it becomes one column
const BOX_MAX_W     = 190;
const BOX_MAX_W_COL = 300;
const COL_BREAK     = 560;  // below this, one column top to bottom
const BACK_FIRST    = 18;   // how far under the row the first return path runs
const BACK_STEP     = 14;   // and how much deeper each one after it
const CORNER        = 6;
const EDGE_OUT      = 2;    // the slight offset into the box's edge
const ATTACH_OFF    = 12;   // so two return paths never leave from one point
const LINK_MIN      = 40;   // the narrowest a link's name is allowed to get
const LINK_MAX      = 120;

/** what the drawer assumes about type, when nothing has measured it yet */
export const METRICS = {
  labSize: 12, labLh: 15,
  subSize: 9.5, subLh: 12,
  linkSize: 9.5, linkLh: 11,
};

let seq = 0;   // arrowheads live in <defs> and need an id nobody else has

// ── the pure parts ────────────────────────────────────────────────────────
// Everything from here to the end of `layout()` is arithmetic with no document
// in it, so `diagram-test.mjs` runs it under node. That is deliberate: the
// wrapping and the column assignment are the two places a mistake is invisible
// — a label that reads fine but quietly lost a word, two return paths drawn on
// top of each other — and both are far cheaper to check than to look at.

/**
 * Which column each box sits in: the LONGEST forward path to it.
 *
 * 🔴 `back: true` LINKS ARE IGNORED HERE, and that is exactly what makes a
 * loopback a loopback. Counting them would put every box of a round trip in a
 * column of its own and the picture would run off the right-hand edge saying
 * the signal visits five places when it visits three.
 *
 * Longest path by relaxation rather than by a topological sort, because a spec
 * CAN hold a forward cycle — somebody forgets a `back: true` — and a sort
 * throws on one while this stops after a bounded number of passes and reports
 * it. A diagram drawn slightly wrong beats a page that threw.
 *
 * @returns {{col: Map<string, number>, cycle: boolean}}
 */
export function assignColumns(nodes, links) {
  const ids = (nodes || []).map((n) => n.id);
  const known = new Set(ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  const usable = (links || []).filter(
    (l) => !l.back && known.has(l.from) && known.has(l.to) && l.from !== l.to);

  const relax = (fwd) => {
    const col = new Map(ids.map((id) => [id, 0]));
    for (let pass = 0; ; pass++) {
      let moved = false;
      for (const l of fwd) {
        const want = col.get(l.from) + 1;
        if (want > col.get(l.to)) { col.set(l.to, want); moved = true; }
      }
      if (!moved) return { col, cycle: false };
      if (pass >= ids.length) return { col, cycle: true };
    }
  };

  const first = relax(usable);
  if (!first.cycle) return first;
  // ⚠️ AND THE REPAIR IS NOT "GIVE UP". Left as it is, a forward circle keeps
  // relaxing until the cap and hands back columns like 14, 15, 16 — a picture
  // seventeen boxes wide of a path with three steps in it, which is a much
  // worse bug than the missing `back: true` that caused it. A link pointing at
  // an EARLIER box in the spec's own node list is almost always the one that
  // was meant to be a return path, so the second pass drops those, draws the
  // right shape, and still reports the cycle so the spec gets fixed.
  const cut = usable.filter((l) => order.get(l.to) > order.get(l.from));
  return { col: relax(cut).col, cycle: true };
}

/**
 * How deep under the row each return path runs.
 *
 * The plan asks for "a depth that grows with how far it travels so two
 * loopbacks never overlap". Those are two rules and only the second one is the
 * point: two return paths of the SAME length that overlap — one spanning boxes
 * 1 to 3, the other 2 to 4 — travel the same distance, so a depth read off the
 * distance alone would draw them on top of each other. This does the stronger
 * thing instead: shortest first, each takes the shallowest depth where nothing
 * already lies under it. Distance still decides in practice, because a longer
 * path overlaps more; and two paths that share no ground share a depth rather
 * than stacking up for nothing, which keeps the picture shallow.
 *
 * @param {Array<[number, number]>} spans  each path's real run in PIXELS, not
 *        its box index — so two paths that meet at one box and turn away from
 *        each other are correctly seen as not overlapping.
 * @returns {number[]} one depth level per span, in the order given
 */
export function backLevels(spans) {
  const order = spans
    .map(([a, b], i) => ({ i, a: Math.min(a, b), b: Math.max(a, b) }))
    .sort((x, y) => (x.b - x.a) - (y.b - y.a) || x.a - y.a);
  const taken = [];
  const level = new Array(spans.length).fill(0);
  for (const sp of order) {
    let lv = 0;
    for (;;) {
      const used = taken[lv] || (taken[lv] = []);
      // 1 px of shared ground is a join, not a collision
      if (used.every(([a, b]) => sp.b - a <= 1 || b - sp.a <= 1)) {
        used.push([sp.a, sp.b]);
        break;
      }
      lv++;
    }
    level[sp.i] = lv;
  }
  return level;
}

/**
 * Break one string into lines that fit, and cut the last one if it cannot.
 *
 * ⚠️ A CUT LABEL IS A REPORT, NOT A FEATURE. CLAUDE.md: anything that
 * truncates with an ellipsis is in the wrong place. That rule is about gutters
 * and readouts, and here it applies to whoever wrote the label — so every cut
 * is collected on `dg.cuts` and /kit/ prints them. The full string always
 * survives in the box's `<title>`, where the browser shows it on hover and a
 * screen reader reads all of it: nothing is ever lost, only hidden, and the
 * author is told exactly which.
 *
 * @param {string} text
 * @param {number} maxWidth               in px
 * @param {number} maxLines
 * @param {(s:string)=>number} measure
 * @returns {{lines: string[], cut: boolean, full: string}}
 */
export function wrapLines(text, maxWidth, maxLines, measure) {
  const full = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!full) return { lines: [], cut: false, full: '' };
  if (maxLines < 1 || maxWidth <= 0) return { lines: [], cut: true, full };

  const words = full.split(' ');
  const lines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const cand = cur ? cur + ' ' + w : w;
    if (measure(cand) <= maxWidth) { cur = cand; continue; }
    if (!cur) {
      // One word wider than the whole box. Broken mid-word rather than allowed
      // to run out past the border: an overflowing word is a box that looks
      // broken, a broken word is one you can still finish reading in <title>.
      const pieces = splitWord(w, maxWidth, measure);
      for (let k = 0; k < pieces.length - 1; k++) lines.push(pieces[k]);
      cur = pieces[pieces.length - 1];
      continue;
    }
    lines.push(cur);
    cur = '';
    i--;                                   // this word has not been placed yet
  }
  if (cur) lines.push(cur);

  if (lines.length <= maxLines) return { lines, cut: false, full };

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(last + '…') > maxWidth) last = last.slice(0, -1).trimEnd();
  kept[maxLines - 1] = last + '…';
  return { lines: kept, cut: true, full };
}

function splitWord(word, maxWidth, measure) {
  const out = [];
  let cur = '';
  for (const ch of word) {
    if (cur && measure(cur + ch) > maxWidth) { out.push(cur); cur = ch; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Every pixel in the picture, from the description and a way to measure type.
 *
 * No document is touched, so this runs under node with a made-up ruler. The
 * caller supplies `measure.lab`, `.sub` and `.link` — three functions turning a
 * string into a width, one per type size.
 *
 * @returns {{mode, width, height, boxW, boxH, nodes, links, cuts, cycle}}
 */
export function layout(spec, { width, measure, metrics = METRICS } = {}) {
  const m = { ...METRICS, ...metrics };
  const nodes = (spec.nodes || []).map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = (spec.links || [])
    .filter((l) => byId.has(l.from) && byId.has(l.to) && l.from !== l.to)
    .map((l) => ({ ...l }));
  const cuts = [];
  const avail = Math.max(140, Math.floor(width));

  if (!nodes.length) {
    return { mode: 'row', width: avail, height: 0, boxW: 0, boxH: 0,
             nodes: [], links: [], cuts, cycle: false };
  }

  const { col, cycle } = assignColumns(nodes, links);
  const cols = Math.max(...nodes.map((n) => col.get(n.id))) + 1;

  // ── how wide a box gets, and whether the row layout is possible at all ──
  // The gaps give way before the boxes do: a narrow box cuts words, a narrow
  // gap only shortens an arrow.
  let gapX = GAP_X_MAX;
  let boxW = (avail - (cols - 1) * gapX) / cols;
  while (boxW < BOX_TARGET_W && gapX > GAP_X_MIN) {
    gapX -= 2;
    boxW = (avail - (cols - 1) * gapX) / cols;
  }
  const mode = (avail >= COL_BREAK && boxW >= BOX_MIN_W) ? 'row' : 'column';

  const backs = links.filter((l) => l.back);
  let leftInset = 0;
  let colBoxW = 0;
  if (mode === 'column') {
    // The return paths run down the LEFT of the column, so that gutter holds
    // two things SIDE BY SIDE and not one: the lanes the paths run in, and the
    // names written beside them.
    //
    // ⚠️ MEASURED, with the two stacked instead: `the sound` was drawn with a
    // return path running straight through it, because the gutter was sized to
    // whichever of the two was wider rather than to both together. A name that
    // has a line through it reads as a name in the wrong place, which is what
    // it was.
    //
    // `backs.length` is the worst case for the number of lanes — every path on
    // a level of its own — and is used because the real levels need positions
    // that need this width. It over-reserves when two paths share a lane; the
    // alternative is laying the whole thing out twice.
    const budget = Math.max(LINK_MIN, Math.min(LINK_MAX, Math.round(avail * 0.30)));
    let widest = 0;
    for (const l of backs) {
      if (!l.label) continue;
      const wrapped = wrapLines(l.label, budget, 1, measure.link);
      widest = Math.max(widest, measure.link(wrapped.lines[0] || ''));
    }
    leftInset = backs.length
      ? Math.ceil(widest) + 16 + (backs.length - 1) * BACK_STEP
      : 0;
    colBoxW = Math.min(avail - leftInset - PAD * 2, BOX_MAX_W_COL);
  }

  const w = mode === 'row'
    ? Math.min(Math.floor(boxW), BOX_MAX_W)
    : Math.max(90, Math.floor(colBoxW));
  const inner = w - BOX_PAD_X * 2;

  // ── the type, which decides how tall every box is ──────────────────────
  // One height for every box, taken from the tallest. Boxes of different
  // heights in one row is a picture where the tall one looks important.
  let boxH = 0;
  for (const n of nodes) {
    n._lab = wrapLines(n.label, inner, 2, measure.lab);
    n._sub = wrapLines(n.sub, inner, 1, measure.sub);
    if (n._lab.cut) {
      cuts.push({ id: n.id, where: 'label', full: n._lab.full,
                  shown: n._lab.lines.join(' '), width: inner });
    }
    if (n._sub.cut) {
      cuts.push({ id: n.id, where: 'sub', full: n._sub.full,
                  shown: n._sub.lines.join(' '), width: inner });
    }
    const block = n._lab.lines.length * m.labLh
                + (n._sub.lines.length ? SUB_GAP + m.subLh : 0);
    boxH = Math.max(boxH, block + BOX_PAD_Y * 2);
  }
  boxH = Math.round(boxH);

  const out = mode === 'row'
    ? placeRow(nodes, links, { col, cols, avail, w, boxH, gapX, m, measure, cuts })
    : placeColumn(nodes, links, { col, avail, w, boxH, leftInset, m, measure, cuts });

  for (const n of nodes) { delete n._lab; delete n._sub; }
  return { mode, boxW: w, boxH, cuts, cycle, gapX, ...out };
}

function placeRow(nodes, links, { col, cols, avail, w, boxH, gapX, m, measure, cuts }) {
  const total = cols * w + (cols - 1) * gapX;
  const left = Math.max(PAD, Math.round((avail - total) / 2));

  const inCol = [];
  for (const n of nodes) {
    const c = col.get(n.id);
    (inCol[c] || (inCol[c] = [])).push(n);
  }
  const colH = inCol.map((list) => list.length * boxH + (list.length - 1) * GAP_Y);
  const tallest = Math.max(...colH);

  const placed = nodes.map((n) => {
    const c = col.get(n.id);
    const r = inCol[c].indexOf(n);
    const x = left + c * (w + gapX);
    const y = PAD + Math.round((tallest - colH[c]) / 2) + r * (boxH + GAP_Y);
    return box(n, x, y, w, boxH, m);
  });
  const at = new Map(placed.map((p) => [p.id, p]));
  const bottom = PAD + tallest;

  // ── the return paths, under the row ───────────────────────────────────
  // 🔴 UNDER, NEVER BETWEEN THE BOXES. A return drawn back through the forward
  // path is the one thing that makes a signal diagram unreadable: with two
  // lines between the same pair of boxes the eye cannot tell the way out from
  // the way home.
  const backs = links.filter((l) => l.back);
  const level = backLevels(backs.map((l) => {
    const f = at.get(l.from), t = at.get(l.to);
    return [f.cx - ATTACH_OFF, t.cx + ATTACH_OFF];
  }));
  // ⚠️ A NAME UNDER A RETURN PATH NEEDS THE DEPTH TO MAKE ROOM FOR IT.
  // MEASURED with two loopbacks and the step at a flat 14 px: `slow down` sat
  // on top of the line belonging to the path below it. Two paths that do not
  // overlap is a claim about the PATHS, and the names are a second layer that
  // has to clear as well — so when any of them is named, the step grows by one
  // line of that type rather than by a number picked to look right.
  const named = backs.some((l) => l.label);
  const step = BACK_STEP + (named ? Math.round(m.linkLh) : 0);
  let deepest = bottom;
  let backLabelled = false;

  const drawn = [];
  for (const l of links) {
    const f = at.get(l.from), t = at.get(l.to);
    if (!l.back) {
      const x1 = f.x + w + EDGE_OUT, y1 = f.cy;
      const x2 = t.x - EDGE_OUT - 1, y2 = t.cy;
      const lab = wrapLines(l.label, gapX - 6, 2, measure.link);
      if (lab.cut) {
        cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                    shown: lab.lines.join(' '), width: gapX - 6 });
      }
      drawn.push({ ...l, d: `M${r1(x1)} ${r1(y1)} L${r1(x2)} ${r1(y2)}`,
                   lab, lx: (x1 + x2) / 2, ly: (y1 + y2) / 2 - 6,
                   anchor: 'middle', stack: 'up' });
      continue;
    }
    const i = backs.indexOf(l);
    const dy = bottom + BACK_FIRST + level[i] * step;
    deepest = Math.max(deepest, dy);
    const sx = f.cx - ATTACH_OFF, tx = t.cx + ATTACH_OFF;
    const sy = f.y + boxH, ty = t.y + boxH + EDGE_OUT + 1;
    const k = sx > tx ? 1 : -1;          // the usual direction: right to left
    const d = `M${r1(sx)} ${r1(sy)} L${r1(sx)} ${r1(dy - CORNER)}`
            + ` Q${r1(sx)} ${r1(dy)} ${r1(sx - CORNER * k)} ${r1(dy)}`
            + ` L${r1(tx + CORNER * k)} ${r1(dy)}`
            + ` Q${r1(tx)} ${r1(dy)} ${r1(tx)} ${r1(dy - CORNER)}`
            + ` L${r1(tx)} ${r1(ty)}`;
    const budget = Math.max(LINK_MIN, Math.min(LINK_MAX, Math.abs(sx - tx) - 20));
    const lab = wrapLines(l.label, budget, 1, measure.link);
    if (lab.cut) {
      cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                  shown: lab.lines.join(' '), width: budget });
    }
    if (lab.lines.length) backLabelled = true;
    drawn.push({ ...l, d, lab, lx: (sx + tx) / 2, ly: dy + 4 + m.linkSize * 0.85,
                 anchor: 'middle', stack: 'none', level: level[i], depth: dy });
  }

  const height = Math.round(
    backs.length ? deepest + (backLabelled ? 16 : 6) + PAD : bottom + PAD);
  return { width: avail, height, nodes: placed, links: drawn };
}

function placeColumn(nodes, links, { col, avail, w, boxH, leftInset, m, measure, cuts }) {
  // ⚠️ ONE COLUMN IS NOT THE ROW LAYOUT ROTATED. A horizontal diagram on a
  // phone is a diagram nobody reads, so below the break the steps stack top to
  // bottom in the order the signal takes them, and the return paths run down
  // the left-hand gutter where they have somewhere to go.
  const order = nodes
    .map((n, i) => ({ n, c: col.get(n.id), i }))
    .sort((a, b) => a.c - b.c || a.i - b.i)
    .map((o) => o.n);

  const x = leftInset + PAD;
  const placed = order.map((n, r) =>
    box(n, x, PAD + r * (boxH + GAP_Y_COL), w, boxH, m));
  const at = new Map(placed.map((p) => [p.id, p]));
  const rowOf = new Map(placed.map((p, r) => [p.id, r]));
  const bottom = PAD + placed.length * boxH + (placed.length - 1) * GAP_Y_COL;

  const backs = links.filter((l) => l.back);
  const level = backLevels(backs.map((l) => {
    const f = at.get(l.from), t = at.get(l.to);
    return [f.cy - ATTACH_OFF / 2, t.cy + ATTACH_OFF / 2];
  }));
  const backBudget = Math.max(LINK_MIN, Math.min(LINK_MAX, Math.round(avail * 0.30)));
  // a forward name sits to the right of the vertical arrow, so it may use the
  // half of the box it starts over and no more
  const fwdBudget = Math.max(LINK_MIN, Math.floor(w / 2) - 16);

  const drawn = [];
  for (const l of links) {
    const f = at.get(l.from), t = at.get(l.to);
    if (!l.back) {
      const down = rowOf.get(l.to) > rowOf.get(l.from);
      const y1 = down ? f.y + boxH + EDGE_OUT : f.y - EDGE_OUT;
      const y2 = down ? t.y - EDGE_OUT - 1 : t.y + boxH + EDGE_OUT + 1;
      const lab = wrapLines(l.label, fwdBudget, 1, measure.link);
      if (lab.cut) {
        cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                    shown: lab.lines.join(' '), width: fwdBudget });
      }
      drawn.push({ ...l, d: `M${r1(f.cx)} ${r1(y1)} L${r1(f.cx)} ${r1(y2)}`,
                   lab, lx: f.cx + 9, ly: (y1 + y2) / 2 + m.linkSize * 0.35,
                   anchor: 'start', stack: 'none' });
      continue;
    }
    const i = backs.indexOf(l);
    // the lanes fill the LEFT of the gutter and the names the right of it, so
    // a deeper path moves further left and never under a name
    const bx = PAD + 4 + (backs.length - 1 - level[i]) * BACK_STEP;
    const sy = f.cy - ATTACH_OFF / 2, ty = t.cy + ATTACH_OFF / 2;
    const sx = f.x - EDGE_OUT, tx = t.x - EDGE_OUT - 1;
    const k = ty < sy ? 1 : -1;
    const d = `M${r1(sx)} ${r1(sy)} L${r1(bx + CORNER)} ${r1(sy)}`
            + ` Q${r1(bx)} ${r1(sy)} ${r1(bx)} ${r1(sy - CORNER * k)}`
            + ` L${r1(bx)} ${r1(ty + CORNER * k)}`
            + ` Q${r1(bx)} ${r1(ty)} ${r1(bx + CORNER)} ${r1(ty)}`
            + ` L${r1(tx)} ${r1(ty)}`;
    const lab = wrapLines(l.label, backBudget, 1, measure.link);
    if (lab.cut) {
      cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                  shown: lab.lines.join(' '), width: backBudget });
    }
    drawn.push({ ...l, d, lab, lx: t.x - 6, ly: ty - 5,
                 anchor: 'end', stack: 'none', level: level[i], bx });
  }

  return { width: avail, height: Math.round(bottom + PAD), nodes: placed, links: drawn };
}

/** one box's geometry, and the baseline of every line of type inside it */
function box(n, x, y, w, h, m) {
  const lab = n._lab, sub = n._sub;
  const block = lab.lines.length * m.labLh + (sub.lines.length ? SUB_GAP + m.subLh : 0);
  const top = y + (h - block) / 2;
  return {
    id: n.id, kind: n.kind || 'plain', x, y, w, h,
    cx: x + w / 2, cy: y + h / 2,
    label: lab, sub,
    labY: lab.lines.map((_, i) => r1(top + i * m.labLh + m.labLh / 2 + m.labSize * 0.35)),
    subY: r1(top + lab.lines.length * m.labLh + SUB_GAP + m.subLh / 2 + m.subSize * 0.35),
    title: [lab.full, sub.full].filter(Boolean).join(' — '),
  };
}

const r1 = (v) => Math.round(v * 10) / 10;

// ── the drawing ───────────────────────────────────────────────────────────

function s(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v !== undefined && v !== null) e.setAttribute(k, String(v));
  }
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}

/**
 * @param {HTMLElement} host        where the picture goes
 * @param {object} spec             {title, caption, nodes, links}
 * @param {object} [opts]
 * @param {(info)=>void} [opts.onRender]  after every layout, with
 *        {mode, width, height, boxW, boxH, cuts, measured} — /kit/ uses it to
 *        print which labels had to be shortened and at what width
 * @returns {{el, svg, cuts, mode, measured, render, destroy}}
 */
export function createDiagram(host, spec, { onRender } = {}) {
  const uid = `dg${++seq}`;
  const wrap = document.createElement('figure');
  wrap.className = 'pos-dg';

  const head = document.createElement('div');
  head.className = 'pos-dg-t';
  head.textContent = spec.title || '';
  if (!spec.title) head.hidden = true;

  const svg = s('svg', { class: 'pos-dg-svg', xmlns: NS, role: 'img' });
  const defs = s('defs');
  // ⚠️ `markerUnits="userSpaceOnUse"`, NOT the default. The default scales an
  // arrowhead by its line's stroke width, so a heavier line would grow a
  // heavier head — and stroke weight is one of the two channels carrying
  // `kind` in greyscale, which must stay a statement about BOXES only.
  for (const [name, cls] of [['f', 'pos-dg-head'], ['b', 'pos-dg-head pos-dg-head-b']]) {
    const mk = s('marker', {
      id: `${uid}-${name}`, viewBox: '0 0 8 8', refX: 7.2, refY: 4,
      markerWidth: 7, markerHeight: 7, markerUnits: 'userSpaceOnUse', orient: 'auto',
    });
    mk.append(s('path', { class: cls, d: 'M0 0 L8 4 L0 8 Z' }));
    defs.append(mk);
  }
  svg.append(defs);
  svg.append(s('title', null, spec.title || 'a diagram'));

  // The ruler. Parked off to one side rather than hidden, because a
  // `display: none` ancestor is precisely what makes getComputedTextLength
  // answer 0 — see the header. The svg clips to its own box, so nothing shows.
  const probe = s('text', { x: -9999, y: -9999, 'aria-hidden': 'true' });
  svg.append(probe);

  const field = s('g');
  svg.append(field);

  const cap = document.createElement('figcaption');
  cap.className = 'pos-dg-cap';
  cap.textContent = spec.caption || '';

  wrap.append(head, svg, cap);
  host.append(wrap);

  const api = { el: wrap, svg, cuts: [], mode: 'row', measured: false, render, destroy };

  // ── measuring ─────────────────────────────────────────────────────────
  const cache = new Map();
  function ruler(cls, fallbackSize) {
    return (str) => {
      if (!str) return 0;
      const key = cls + ' ' + str;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      probe.setAttribute('class', cls);
      probe.textContent = str;
      let px = 0;
      try { px = probe.getComputedTextLength(); } catch { px = 0; }
      // 🔴 0 means "not measurable yet", never "an empty string" — that case
      // returned above. Estimating from the character count keeps the picture
      // roughly right until the host has a size, and `measured` says which of
      // the two happened, so /kit/ cannot report an estimate as a measurement.
      if (px > 0) api.measured = true;
      else px = str.length * fallbackSize * 0.6;
      cache.set(key, px);
      return px;
    };
  }

  // ⚠️ ONE PLACE DECIDES LINE HEIGHT, and it derives it from the size the
  // stylesheet actually computed rather than from a number typed twice. Change
  // a font-size in shell.css and the boxes follow it, instead of leaving two
  // lines of type overlapping inside a box sized for the old one.
  function sizes() {
    const px = (cls, fallback) => {
      probe.setAttribute('class', cls);
      return parseFloat(getComputedStyle(probe).fontSize) || fallback;
    };
    const labSize = px('pos-dg-lab', METRICS.labSize);
    const subSize = px('pos-dg-sub', METRICS.subSize);
    const linkSize = px('pos-dg-llab', METRICS.linkSize);
    return {
      labSize, labLh: Math.round(labSize * 1.26),
      subSize, subLh: Math.round(subSize * 1.26),
      linkSize, linkLh: Math.round(linkSize * 1.16),
    };
  }

  let lastW = -1;

  function render() {
    const avail = Math.max(140,
      Math.floor(wrap.clientWidth || host.clientWidth || 320));
    lastW = avail;
    cache.clear();
    api.measured = false;
    const m = sizes();
    const L = layout(spec, {
      width: avail,
      metrics: m,
      measure: {
        lab: ruler('pos-dg-lab', m.labSize),
        sub: ruler('pos-dg-sub', m.subSize),
        link: ruler('pos-dg-llab', m.linkSize),
      },
    });
    probe.textContent = '';

    svg.setAttribute('width', L.width);
    svg.setAttribute('height', L.height);
    svg.setAttribute('viewBox', `0 0 ${L.width} ${L.height}`);
    field.textContent = '';

    // links first, so a box is never drawn under its own arrow
    for (const l of L.links) {
      field.append(s('path', {
        class: l.back ? 'pos-dg-link pos-dg-back' : 'pos-dg-link',
        d: l.d, 'marker-end': `url(#${uid}-${l.back ? 'b' : 'f'})`,
      }));
      if (!l.lab.lines.length) continue;
      const first = l.stack === 'up' ? l.ly - (l.lab.lines.length - 1) * m.linkLh : l.ly;
      const t = s('text', { class: 'pos-dg-llab', x: r1(l.lx), y: r1(first),
                            'text-anchor': l.anchor });
      l.lab.lines.forEach((line, i) => {
        t.append(s('tspan', { x: r1(l.lx), dy: i ? m.linkLh : 0 }, line));
      });
      if (l.lab.cut) t.append(s('title', null, l.lab.full));
      field.append(t);
    }

    for (const n of L.nodes) {
      const g = s('g', { class: 'pos-dg-n', 'data-kind': n.kind, tabindex: '0' });
      // <title> FIRST, so the browser's own tooltip and a screen reader both
      // get the whole string — the promise that a cut hides text and never
      // loses it. It costs nothing and it is the accessible path, which is why
      // there is no hand-built tooltip anywhere in this file.
      g.append(s('title', null, n.title));
      g.append(s('rect', { class: 'pos-dg-box', x: n.x + 0.5, y: n.y + 0.5,
                           width: n.w - 1, height: n.h - 1, rx: 5, ry: 5 }));
      if (n.label.lines.length) {
        const t = s('text', { class: 'pos-dg-lab', x: r1(n.cx), y: n.labY[0],
                              'text-anchor': 'middle' });
        n.label.lines.forEach((line, i) => {
          t.append(s('tspan', { x: r1(n.cx), y: n.labY[i] }, line));
        });
        g.append(t);
      }
      if (n.sub.lines.length) {
        g.append(s('text', { class: 'pos-dg-sub', x: r1(n.cx), y: n.subY,
                             'text-anchor': 'middle' }, n.sub.lines[0]));
      }
      // Hovering writes what this box does into the line UNDER the picture.
      // Not a tooltip: a tooltip is drawn on top of the thing it describes and
      // is read again every time you point at one, so it has to stay two short
      // lines. A line under the picture is read in place, has room for a whole
      // sentence, and costs no positioning code at all.
      const show = () => {
        g.dataset.on = '1';
        cap.dataset.on = '1';
        cap.textContent = n.title || n.label.full;
      };
      const hide = () => {
        delete g.dataset.on;
        delete cap.dataset.on;
        cap.textContent = spec.caption || '';
      };
      g.addEventListener('pointerenter', show);
      g.addEventListener('pointerleave', hide);
      g.addEventListener('focus', show);
      g.addEventListener('blur', hide);
      field.append(g);
    }

    // 🔴 THE LINE UNDER THE PICTURE KEEPS ITS HEIGHT, OR HOVERING MOVES THE
    // PAGE. A three-line caption replaced by a five-word sentence is two lines
    // shorter, so everything below the diagram jumps up the moment the pointer
    // touches a box and back down when it leaves — on a page of several
    // diagrams that is the whole article twitching under the cursor. The tallest
    // thing the line will ever hold is reserved once per layout, which costs a
    // few reflows here and nothing at all afterwards.
    cap.style.minHeight = '';
    let capH = cap.offsetHeight;
    const keep = cap.textContent;
    for (const n of L.nodes) {
      cap.textContent = n.title || n.label.full;
      capH = Math.max(capH, cap.offsetHeight);
    }
    cap.textContent = keep;
    cap.style.minHeight = `${capH}px`;

    api.cuts = L.cuts;
    api.mode = L.mode;
    if (L.cycle) {
      // every link pointing forward in a loop means somebody forgot a
      // `back: true`. The picture is still drawn — a diagram that looks wrong
      // is a better bug report than a page that threw.
      console.warn('[diagram] the links run forward in a circle — is one of them missing `back: true`?');
    }
    onRender?.({ mode: L.mode, width: L.width, height: L.height,
                 boxW: L.boxW, boxH: L.boxH, cuts: L.cuts, measured: api.measured });
  }

  // The host can be laid out after this call, and it can change width later.
  // As far as the picture is concerned those are the same event.
  const ro = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => {
        const now = Math.floor(wrap.clientWidth || 0);
        if (now > 0 && Math.abs(now - lastW) >= 2) render();
      })
    : null;

  render();
  ro?.observe(wrap);

  function destroy() {
    ro?.disconnect();
    wrap.remove();
  }

  return api;
}
