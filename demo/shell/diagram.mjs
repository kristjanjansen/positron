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
// 🔴 A LINK THAT CANNOT RUN STRAIGHT GETS A LANE OUTSIDE THE BOXES, and the
// two kinds share these two numbers because they are one mechanism seen from
// two sides: a return path runs UNDER the row (down the LEFT, in one column)
// and a forward link that reaches past its neighbour runs OVER it (down the
// RIGHT). One spacing, so the picture reads as one idea and the two kinds of
// lane can never be assigned widths that disagree.
const LANE_FIRST    = 18;   // how far off the boxes the first lane runs
const LANE_STEP     = 14;   // and how much further out each one after it
const CORNER        = 6;
const EDGE_OUT      = 2;    // the slight offset into the box's edge
const ATTACH_OFF    = 12;   // so two return paths never leave from one point
const LINK_MIN      = 40;   // the narrowest a link's name is allowed to get
const LINK_MAX      = 120;
const GUTTER_PAD    = 16;   // a gutter's fixed part: 6 px to the box, 6 to the
                            // lane, and the 4 the shallowest lane sits in from
                            // the picture's edge
const STEP_OFF      = 9;    // a step's name, off to one side of its arrow

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
 * Does this forward link have to pass over a box on its way?
 *
 * 🔴 THE ANSWER IS WHAT MAKES A FORK DRAWABLE, AND IT IS THE SAME QUESTION IN
 * BOTH LAYOUTS. A straight arrow is the right drawing for a step to the next
 * place along and routes around NOTHING; a branch that reaches further is
 * drawn straight THROUGH whatever stands between, so the arrow vanishes behind
 * a box it never touches and comes out the far side with its head in the next
 * one. That is a picture of a path the page does not have, and the name that
 * would have told the two branches apart is drawn at the midpoint, i.e. under
 * the box. The second branch of a fork always skips whatever the first one
 * landed on, so every fork breaks that way until the link is routed outside
 * the boxes instead.
 *
 * @param {object} l          one link
 * @param {Map<string,number>} pos  where each box sits ALONG the flow: the
 *        column in the row layout, the row in the one-column layout. One
 *        predicate, two coordinate systems, because it is one defect.
 */
function skipsABox(l, pos) {
  return !l.back && Math.abs(pos.get(l.to) - pos.get(l.from)) > 1;
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
  let rightInset = 0;
  let backBudget = 0, skipBudget = 0;
  let colBoxW = 0;
  let order = null, rowOf = null;
  if (mode === 'column') {
    // Which box sits on which row is decided here rather than in placeColumn,
    // because the gutters have to be reserved before a box has a width and
    // "does this link skip a box" is a question about rows.
    order = nodes
      .map((n, i) => ({ n, c: col.get(n.id), i }))
      .sort((a, b) => a.c - b.c || a.i - b.i)
      .map((o) => o.n);
    rowOf = new Map(order.map((n, r) => [n.id, r]));

    // The return paths run down the LEFT of the column and the forward links
    // that skip a box down the RIGHT, so each gutter holds two things SIDE BY
    // SIDE and not one: the lanes the paths run in, and the names written
    // beside them.
    //
    // ⚠️ MEASURED, with the two stacked instead: `the sound` was drawn with a
    // return path running straight through it, because the gutter was sized to
    // whichever of the two was wider rather than to both together. A name that
    // has a line through it reads as a name in the wrong place, which is what
    // it was.
    //
    // The list's LENGTH is the worst case for the number of lanes — every path
    // on a level of its own — and is used because the real levels need
    // positions that need this width. It over-reserves when two paths share a
    // lane; the alternative is laying the whole thing out twice.
    //
    // 🔴 A GUTTER IS SIZED BY WHAT ITS NAMES NEED, NEVER BY A SHARE OF THE
    // PICTURE. It used to be a flat 30% of the width: the name was wrapped to
    // that, and the widest RESULT then sized the gutter — so a name that had
    // been cut made the gutter smaller, which is a cut reinforcing itself.
    // MEASURED at 258 px: `sound and grains` wanted 92 px, was cut to
    // `sound and…` at 58, and the gutter then reserved 58 — while the box
    // beside it held 166 px for text needing 128. The name is measured WHOLE
    // here, before anything wraps it, so the number cannot be fed by its own
    // shortening.
    const want = (list) => {
      if (!list.length) return 0;
      let widest = 0;
      for (const l of list) {
        if (!l.label) continue;
        widest = Math.max(widest, measure.link(l.label));
      }
      return Math.ceil(Math.min(widest, LINK_MAX)) + GUTTER_PAD + (list.length - 1) * LANE_STEP;
    };
    // and the floor, when there is not enough picture for everyone: the lanes
    // themselves still have to be somewhere, even with no room for a name
    const lanesOnly = (list) => (list.length ? 8 + (list.length - 1) * LANE_STEP : 0);
    const skips = links.filter((l) => skipsABox(l, rowOf));
    leftInset = want(backs);
    rightInset = want(skips);

    // 🔴 AND WHEN THE PICTURE IS TOO NARROW FOR ALL OF IT, THE BOXES' OWN
    // WORDS WIN. A diagram that shortens the names of the things it is about
    // is broken in a way a reader can see; the order is the box's text, then
    // the arrows' names, then empty space. The binding measurement is the
    // `sub`, because it gets ONE line and is never wrapped — so the width it
    // needs is simply its own, with no second layout pass to find out. A
    // `label` has two lines and gives way gracefully. MEASURED before this
    // existed: at 258 px /kit/'s fork block cut ALL FOUR box subs while
    // reserving a gutter nothing had asked for.
    let boxNeed = 0;
    for (const n of nodes) boxNeed = Math.max(boxNeed, measure.sub(n.sub || ''));
    boxNeed = Math.min(Math.ceil(boxNeed) + BOX_PAD_X * 2, BOX_MAX_W_COL);
    const room = avail - PAD * 2 - boxNeed;
    if (leftInset + rightInset > room) {
      const floorL = lanesOnly(backs), floorR = lanesOnly(skips);
      const spare = Math.max(0, room - floorL - floorR);
      const over = (leftInset - floorL) + (rightInset - floorR);
      const k = over > 0 ? spare / over : 0;
      leftInset = floorL + Math.floor((leftInset - floorL) * k);
      rightInset = floorR + Math.floor((rightInset - floorR) * k);
    }
    // what is left of each gutter once its lanes have theirs — the width a
    // name in it actually gets, and the number `cuts` is reported against
    const nameRoom = (inset, list) => (list.length
      ? Math.max(0, inset - GUTTER_PAD - (list.length - 1) * LANE_STEP) : 0);
    backBudget = nameRoom(leftInset, backs);
    skipBudget = nameRoom(rightInset, skips);
    colBoxW = Math.min(avail - leftInset - rightInset - PAD * 2, BOX_MAX_W_COL);
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
    : placeColumn(links, { order, rowOf, avail, w, boxH, leftInset, rightInset,
                           backBudget, skipBudget, m, measure, cuts });

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

  // ── a forward link that skips a column runs OVER the row ────────────────
  // 🔴 THIS IS WHAT MAKES A FORK DRAWABLE HERE, and it is the return path's
  // rule turned upside down: a link that cannot run straight gets a lane
  // outside the boxes, over for onward and under for back, so the two never
  // meet and neither is ever drawn through a box.
  //
  // The lanes can be worked out before a single box has a y, because every x
  // in the row layout is fixed by the column alone. So the depths are assigned
  // first and the whole row is then pushed down by exactly the room they need
  // — rather than laying the picture out twice.
  const cxOf = (id) => left + col.get(id) * (w + gapX) + w / 2;
  const overs = links.filter((l) => skipsABox(l, col));
  const overLevel = backLevels(overs.map(
    (l) => [cxOf(l.from) + ATTACH_OFF, cxOf(l.to) - ATTACH_OFF]));
  const overNamed = overs.some((l) => l.label);
  const overStep = LANE_STEP + (overNamed ? Math.round(m.linkLh) : 0);
  const head = overs.length
    ? LANE_FIRST + Math.max(...overLevel) * overStep + (overNamed ? 16 : 6)
    : 0;
  const top = PAD + head;

  const placed = nodes.map((n) => {
    const c = col.get(n.id);
    const r = inCol[c].indexOf(n);
    const x = left + c * (w + gapX);
    const y = top + Math.round((tallest - colH[c]) / 2) + r * (boxH + GAP_Y);
    return box(n, x, y, w, boxH, m);
  });
  const at = new Map(placed.map((p) => [p.id, p]));
  const bottom = top + tallest;

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
  const step = LANE_STEP + (named ? Math.round(m.linkLh) : 0);
  let deepest = bottom;
  let backLabelled = false;
  // how wide a name beside a lane may get: the lane's own run, less the two
  // corners, clamped so it is never narrower than a word or wider than a line
  const laneBudget = (sx, tx) =>
    Math.max(LINK_MIN, Math.min(LINK_MAX, Math.abs(sx - tx) - 20));

  const drawn = [];
  for (const l of links) {
    const f = at.get(l.from), t = at.get(l.to);
    if (!l.back) {
      const o = overs.indexOf(l);
      if (o < 0) {
        const x1 = f.x + w + EDGE_OUT, y1 = f.cy;
        const x2 = t.x - EDGE_OUT - 1, y2 = t.cy;
        const lab = wrapLines(l.label, gapX - 6, 2, measure.link);
        if (lab.cut) {
          cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                      shown: lab.lines.join(' '), width: gapX - 6 });
        }
        // ⚠️ "SIX PIXELS ABOVE THE MIDDLE" IS ONLY CLEAR OF A HORIZONTAL
        // ARROW. A fork puts two boxes in one column, so its arrows are
        // DIAGONAL — MEASURED in /kit/ at 655 px, the line for `settings`
        // climbed 5.4 px through the middle of the word, and `and out` 4.8.
        // The lift is the height the line itself gains across the name's own
        // width, so the clearance is the same at any slope, and zero for a
        // horizontal arrow, which is every picture with no branch in it.
        //
        // 🔴 AND EACH NAME GOES ON THE OUTSIDE OF ITS OWN ARROW, which lifting
        // alone does not give you: the two branches of a fork leave one point
        // and open a wedge, so putting both names above pushed `and out`
        // 4.2 px into the branch above it — the same defect one arrow further
        // on. A name that rises sits above its line and a name that falls sits
        // below it, so the wedge stays empty and each name is on the side its
        // own arrow is travelling away from.
        const half = Math.max(...lab.lines.map((t) => measure.link(t)), 0) / 2;
        const rise = x2 === x1 ? 0 : Math.abs((y2 - y1) / (x2 - x1)) * half;
        const falls = y2 > y1;
        drawn.push({ ...l, d: `M${r1(x1)} ${r1(y1)} L${r1(x2)} ${r1(y2)}`,
                     lab, lx: (x1 + x2) / 2,
                     ly: falls ? (y1 + y2) / 2 + rise + 4 + m.linkSize * 0.85
                               : (y1 + y2) / 2 - rise - 6,
                     anchor: 'middle', stack: falls ? 'none' : 'up' });
        continue;
      }
      // over the row, out of the source's TOP edge and down into the target's
      const dy = top - LANE_FIRST - overLevel[o] * overStep;
      const sx = f.cx + ATTACH_OFF, tx = t.cx - ATTACH_OFF;
      const budget = laneBudget(sx, tx);
      const lab = wrapLines(l.label, budget, 1, measure.link);
      if (lab.cut) {
        cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                    shown: lab.lines.join(' '), width: budget });
      }
      drawn.push({ ...l, d: acrossLane(sx, f.y, tx, t.y - EDGE_OUT - 1, dy, -1),
                   lab, lx: (sx + tx) / 2, ly: dy - 5, anchor: 'middle',
                   stack: 'none', level: overLevel[o], depth: dy });
      continue;
    }
    const i = backs.indexOf(l);
    const dy = bottom + LANE_FIRST + level[i] * step;
    deepest = Math.max(deepest, dy);
    const sx = f.cx - ATTACH_OFF, tx = t.cx + ATTACH_OFF;
    const sy = f.y + boxH, ty = t.y + boxH + EDGE_OUT + 1;
    const d = acrossLane(sx, sy, tx, ty, dy, 1);
    const budget = laneBudget(sx, tx);
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

function placeColumn(links, { order, rowOf, avail, w, boxH, leftInset, rightInset,
                             backBudget, skipBudget, m, measure, cuts }) {
  // ⚠️ ONE COLUMN IS NOT THE ROW LAYOUT ROTATED. A horizontal diagram on a
  // phone is a diagram nobody reads, so below the break the steps stack top to
  // bottom in the order the signal takes them, the return paths run down the
  // left-hand gutter, and a forward link that reaches past the box under it
  // runs down the right-hand one. Onward on the right, back on the left: two
  // gutters that cannot collide, and neither line is ever behind a box.
  const x = leftInset + PAD;
  const placed = order.map((n, r) =>
    box(n, x, PAD + r * (boxH + GAP_Y_COL), w, boxH, m));
  const at = new Map(placed.map((p) => [p.id, p]));
  const bottom = PAD + placed.length * boxH + (placed.length - 1) * GAP_Y_COL;
  const right = x + w;

  const backs = links.filter((l) => l.back);
  const level = backLevels(backs.map((l) => {
    const f = at.get(l.from), t = at.get(l.to);
    return [f.cy - ATTACH_OFF / 2, t.cy + ATTACH_OFF / 2];
  }));
  const overs = links.filter((l) => skipsABox(l, rowOf));
  const overLevel = backLevels(overs.map((l) => {
    const f = at.get(l.from), t = at.get(l.to);
    return [f.cy + ATTACH_OFF / 2, t.cy - ATTACH_OFF / 2];
  }));
  // 🔴 A STEP'S NAME TAKES THE ROW IT SITS IN, NOT HALF A BOX. Between two
  // stacked boxes is a gap that is EMPTY right across the picture, and the
  // only thing in it is one short vertical arrow. The budget used to be "the
  // half of the box it starts over" — MEASURED at 258 px in /kit/'s fork
  // block, that handed `settings` 41 px with 106 px of nothing beside it, and
  // cut it to `settin…`. A name is now measured against the space it is
  // actually drawn in.
  //
  // It goes on the WIDER side of the arrow, and on the same side for every
  // step, because in one column every box shares an x — so the choice is made
  // once from real positions and the names line up in a column instead of
  // alternating. Which side is wider is not a guess: a left gutter pushes the
  // boxes right, so the room is usually on the left, and with no gutters at
  // all the two are equal and it stays where it has always been.
  const laneR = backs.length ? PAD + 4 + (backs.length - 1) * LANE_STEP + 6 : PAD;
  const laneL = overs.length
    ? right + rightInset - 4 - (overs.length - 1) * LANE_STEP - 6 : avail - PAD;
  const cx = placed[0].cx;
  const roomL = cx - STEP_OFF - laneR, roomR = laneL - (cx + STEP_OFF);
  const stepLeft = roomL > roomR;
  const fwdBudget = Math.min(LINK_MAX, Math.floor(Math.max(0, roomL, roomR)));

  const drawn = [];
  for (const l of links) {
    const f = at.get(l.from), t = at.get(l.to);
    if (!l.back) {
      const o = overs.indexOf(l);
      if (o < 0) {
        const down = rowOf.get(l.to) > rowOf.get(l.from);
        const y1 = down ? f.y + boxH + EDGE_OUT : f.y - EDGE_OUT;
        const y2 = down ? t.y - EDGE_OUT - 1 : t.y + boxH + EDGE_OUT + 1;
        const lab = wrapLines(l.label, fwdBudget, 1, measure.link);
        if (lab.cut) {
          cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                      shown: lab.lines.join(' '), width: fwdBudget });
        }
        drawn.push({ ...l, d: `M${r1(f.cx)} ${r1(y1)} L${r1(f.cx)} ${r1(y2)}`,
                     lab, lx: f.cx + (stepLeft ? -STEP_OFF : STEP_OFF),
                     ly: (y1 + y2) / 2 + m.linkSize * 0.35,
                     anchor: stepLeft ? 'end' : 'start', stack: 'none' });
        continue;
      }
      // 🔴 OUT OF THE RIGHT EDGE, DOWN THE RIGHT GUTTER, BACK IN AT THE RIGHT
      // EDGE. The straight vertical this replaces left the source's CENTRE and
      // ran behind every box between the two, which is the fork bug: the
      // branch emerges under a box it never visits with its head in the next
      // one, and its name is drawn at the midpoint, i.e. under that box.
      // The lanes fill the RIGHT of the gutter and the names the left of it,
      // so a deeper path moves further right and never under a name — the
      // left gutter's rule, mirrored.
      const bx = right + rightInset - 4 - (overs.length - 1 - overLevel[o]) * LANE_STEP;
      const sy = f.cy + ATTACH_OFF / 2, ty = t.cy - ATTACH_OFF / 2;
      const sx = f.x + w + EDGE_OUT, tx = t.x + w + EDGE_OUT + 1;
      const lab = wrapLines(l.label, skipBudget, 1, measure.link);
      if (lab.cut) {
        cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                    shown: lab.lines.join(' '), width: skipBudget });
      }
      drawn.push({ ...l, d: sideLane(sx, sy, tx, ty, bx, -1), lab,
                   lx: right + 6, ly: sy + 4 + m.linkSize * 0.85,
                   anchor: 'start', stack: 'none', level: overLevel[o], bx });
      continue;
    }
    const i = backs.indexOf(l);
    // the lanes fill the LEFT of the gutter and the names the right of it, so
    // a deeper path moves further left and never under a name
    const bx = PAD + 4 + (backs.length - 1 - level[i]) * LANE_STEP;
    const sy = f.cy - ATTACH_OFF / 2, ty = t.cy + ATTACH_OFF / 2;
    const sx = f.x - EDGE_OUT, tx = t.x - EDGE_OUT - 1;
    const lab = wrapLines(l.label, backBudget, 1, measure.link);
    if (lab.cut) {
      cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                  shown: lab.lines.join(' '), width: backBudget });
    }
    // 🔴 BELOW ITS OWN RUN, NOT BETWEEN THE TWO. A box's two attachment
    // points are ATTACH_OFF apart — 12 px — and a line of this type is 11 px
    // tall, so a name placed between them cannot clear both: MEASURED in
    // /kit/, the run LEAVING a box cut 2 px through the ascenders of the name
    // belonging to the run ARRIVING at it. Below is also where the row layout
    // puts a return's name, so the two layouts now agree.
    drawn.push({ ...l, d: sideLane(sx, sy, tx, ty, bx, 1), lab,
                 lx: t.x - 6, ly: ty + 4 + m.linkSize * 0.85,
                 anchor: 'end', stack: 'none', level: level[i], bx });
  }

  return { width: avail, height: Math.round(bottom + PAD), nodes: placed, links: drawn };
}

// ── the two lane shapes ───────────────────────────────────────────────────
// One rounded L out of a box's edge, along a lane that clears every box in the
// way, and back in at the other end. Both kinds of routed link — a return
// under the row and a forward link over it — are the SAME shape with one sign
// flipped, so they are one function each rather than four copies of a path
// string. A copy is where the two would drift apart.

/** a lane that runs ACROSS the picture: `vs` +1 under the boxes, -1 over them */
function acrossLane(sx, sy, tx, ty, dy, vs) {
  const k = sx > tx ? 1 : -1;          // the usual return direction: right to left
  return `M${r1(sx)} ${r1(sy)} L${r1(sx)} ${r1(dy - CORNER * vs)}`
       + ` Q${r1(sx)} ${r1(dy)} ${r1(sx - CORNER * k)} ${r1(dy)}`
       + ` L${r1(tx + CORNER * k)} ${r1(dy)}`
       + ` Q${r1(tx)} ${r1(dy)} ${r1(tx)} ${r1(dy - CORNER * vs)}`
       + ` L${r1(tx)} ${r1(ty)}`;
}

/** a lane that runs DOWN the side: `hs` +1 left of the column, -1 right of it */
function sideLane(sx, sy, tx, ty, bx, hs) {
  const k = ty < sy ? 1 : -1;          // the usual return direction: bottom to top
  return `M${r1(sx)} ${r1(sy)} L${r1(bx + CORNER * hs)} ${r1(sy)}`
       + ` Q${r1(bx)} ${r1(sy)} ${r1(bx)} ${r1(sy - CORNER * k)}`
       + ` L${r1(bx)} ${r1(ty + CORNER * k)}`
       + ` Q${r1(bx)} ${r1(ty)} ${r1(bx + CORNER * hs)} ${r1(ty)}`
       + ` L${r1(tx)} ${r1(ty)}`;
}

/**
 * Every string the line under the picture will ever hold.
 *
 * 🔴 THE CAPTION IS ONE OF THEM, AND LEAVING IT OUT IS WHY THE PAGE JUMPED.
 * That line is the caption until a box is hovered and that box's own sentence
 * while it is, so its height has to be reserved for the TALLEST of those — or
 * everything below the picture moves the moment the pointer touches a box. The
 * reservation used to start from whatever the element happened to be showing,
 * which is the caption only if nothing is hovered: a re-layout while the
 * pointer is on a box destroys the `<g>` that would have fired `pointerleave`,
 * so the element is left holding a five-word sentence and the whole block is
 * reserved at 19 px under a caption that needs 97. It reads as fixed, because
 * the next hover in and out repairs it.
 *
 * Pure, so the test can check the list rather than the pixels: what went wrong
 * is WHICH STRINGS were measured, not how.
 */
export function captionTexts(spec, nodes) {
  return [spec?.caption || '']
    .concat((nodes || []).map((n) => n.title || n.label?.full || ''));
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

  /** the line under the picture, back to what it says when nothing is hovered */
  const resetCaption = () => {
    delete cap.dataset.on;
    cap.textContent = spec.caption || '';
  };

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
    // 🔴 THE CAPTION GOES BACK FIRST, BECAUSE THE NEXT LINE DESTROYS THE BOX
    // THAT WOULD HAVE PUT IT BACK. `pointerleave` fires on an element, and an
    // element removed from under the pointer never fires it — so a re-layout
    // while a box is hovered (a resize, an orientation change, the first
    // ResizeObserver callback) leaves the line holding a sentence about a box
    // that no longer exists, and the reservation below then measures THAT.
    // Restoring here is the whole repair: nothing else can know a hover was
    // interrupted rather than ended.
    resetCaption();
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
        resetCaption();
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
    //
    // ⚠️ AND IT RESERVES FOR THE CAPTION EXPLICITLY, never for "whatever the
    // element is showing". Those are the same string only while nothing is
    // hovered, and the one moment they differ is the one moment a re-layout
    // is running — which is when this code is reached. MEASURED at the point
    // the two came apart: `min-height: 19px` under a 97 px caption, so the
    // next un-hover grew the block by 78 px. `captionTexts` names the set.
    cap.style.minHeight = '';
    const keep = cap.textContent;
    let capH = 0;
    for (const text of captionTexts(spec, L.nodes)) {
      cap.textContent = text;
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
