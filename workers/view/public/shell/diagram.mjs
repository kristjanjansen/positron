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
//     nodes: [{ id:'you', label:'your browser', sub:'a key press', kind:'here',
//               note: 'The browser you are reading this in. **It makes the sound too.**',
//               children: [{ id:'synth', label:'a synthesiser', sub:'in the page' }] }, ...],
//     links: [{ from:'you', to:'relay', label:'note number' },
//             { from:'relay', to:'you', label:'', back:true }],
//   });
//   dg.cuts   // every label the drawer had to shorten, with the full text
//
// ⚠️ A BOX CAN HOLD BOXES, AND THAT IS HOW A MACHINE SAYS WHAT RUNS ON IT.
// `children` puts one or more boxes INSIDE another, measured from what they
// need plus padding rather than from a guessed height, in both layouts. The
// plan said one level of nesting was enough and that a program could be named
// in its machine's `sub` — which is true right up to the point where the
// machine and the program are two different things a link can reach: an arrow
// may target a container or any box inside one.
//
// 🔴 TWO BOXES IN ONE CONTAINER ARE LINKED IN THE GAP THEY ALREADY SHARE, AND
// THAT LINK REPLACES THE TIE BETWEEN THEM. It used to be dropped with a
// warning, on the argument that routing it would mean a third rule for a
// picture nothing had asked for. `/station/` asked: grouping seven boxes into
// three machines killed three real arrows at once and left plain ties standing
// where they had been, which is a picture claiming a chain that does not
// exist. Two boxes that are NEXT TO EACH OTHER inside their container get the
// arrow in the gap between them, with its name beside it. One that reaches
// PAST the box between them gets a lane inside the container's own padding,
// which is the same idea as the lanes over and under the row, one level in.
// A link from a container to a box inside ITSELF has no gap to run through and
// is still refused — reported on `cuts`, never dropped in silence, because a
// link that vanishes without a word is exactly how those three went missing.
// ⚠️ A TIE AND AN ARROW ARE ONE WEIGHT OF INK DOWN ONE MIDDLE, so a container
// holding both says two things in one alphabet and the headless one reads as a
// head that went missing. That is a fact about the DESCRIPTION rather than
// about the drawer: order a machine's boxes so every pair a reader sees side by
// side is a pair a direction was stated for, and the mix cannot arise.
// `api.ties` is how many headless lines the picture holds, so a page can assert
// its own description got that right instead of anybody having to look.
//
// 🔴 THERE IS NO `title` ATTRIBUTE ANYWHERE IN HERE, AND THAT IS THE POINT.
// A box used to carry an SVG `<title>`, which the browser draws as a native
// tooltip — so pointing at one said `Raspberry Pi` in the box, `Raspberry Pi —
// another granulator` in a yellow tooltip ON TOP of it, and the same words
// again in the line under the picture. Three channels saying one thing is the
// defect a legend is. The accessible name the `<title>` was also carrying moves
// to `aria-label`, which no browser draws, so a screen reader keeps everything
// the sighted reader just stopped seeing twice.
//
// `note` is what the line under the picture says while a box is hovered: a
// SENTENCE about what that box does here, not its name a second time. It takes
// `**bold**` and nothing else — two asterisks, written out in `boldParts`,
// because a markdown library for one inline form is a dependency to read the
// release notes of forever.
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
/**
 * 🔴 WHERE A BOX'S WORDS SIT, AND IT IS ONE SWITCH BECAUSE IT HAS TO BE
 * REVERTABLE. Centred is what this drew for its whole life; top-left is what a
 * technical diagram wants, because a reader scanning a column of boxes wants
 * every name to start at the same x and the same y rather than to float
 * according to how much else is in its box. Two boxes of different heights,
 * centred, put their names at two different heights for a reason nobody can
 * see.
 *
 * ⚠️ IT IS A CONSTANT, NOT A PER-CALL OPTION, ON PURPOSE. Half the pictures
 * aligned one way and half the other is worse than either; and if this turns
 * out to be wrong, `'centre'` here puts every diagram in the project back the
 * way it was in one edit, which is the whole reason it is written like this.
 */
export const BOX_ALIGN = 'topleft';           // 'topleft' | 'centre'

/**
 * 🔴 A BOX HAS A HUE, AND A NOTE THAT NAMES IT BORROWS THE SAME ONE.
 *
 * Every note wants to point at another box, and prose cannot: `the clock above`
 * means counting boxes, and a file path or a capitalised SERVER-SIDE means
 * nothing to anybody. So the picture carries the reference instead. Each box is
 * tinted with one hue mixed a long way into the page's own grey, and a **bold**
 * run in a note whose text is a box's NAME is drawn in that same hue, stronger.
 * Pointing is then a colour rather than a sentence.
 *
 * ⚠️ NO NEW SYNTAX, WHICH IS WHY IT WILL STILL BE TRUE NEXT YEAR. There is no
 * `[[link]]` to remember and nothing to keep in step: writing **scsynth** in a
 * note colours it because a box is called scsynth, and renaming that box moves
 * the colour with it. A bold run that matches nothing stays plain bold, which
 * is what bold already meant.
 *
 * ⚠️ AND THE TINT IS FAINT ON PURPOSE. These are boxes on a dark page, not a
 * chart: at 14% the hue is a family resemblance you notice when you look for it
 * and never a colour the picture is about. The text takes 62% because a word in
 * a line of prose has a twentieth of the area to say it with.
 */
/**
 * 🔴 ONE COLOUR PER TECHNOLOGY, ACROSS EVERY DIAGRAM IN THE PROJECT. A page's
 * picture is not the only one anybody will see: Cloudflare is in four of them,
 * a browser in six, a sound pipeline in three. If each diagram picked its own
 * hues then Cloudflare would be orange here, teal there and violet on the third
 * page, and the colour would carry nothing across the set. Declared `tech` on a
 * node takes its colour from this table; anything else falls back to the
 * rotation below, which only has to keep neighbours apart within one picture.
 *
 * ⚠️ `cloudflare` IS ITS OWN BRAND ORANGE and that is the point of naming it.
 * The colour a reader has already learned from the thing itself is worth more
 * than any scheme, and the rotation had picked violet for it.
 */
export const TECH_HUE = {
  cloudflare: 28,          // their orange
  browser: 205,            // the page you are reading this in
  sound: 145,              // anything that makes or carries audio
  graphics: 278,           // anything that draws
  relay: 190,              // our own sockets and workers
  device: 330,             // a machine in a room: a board, a phone, a speaker
  /**
   * 🔴 THEIR OWN RASPBERRY, FOR THE REASON `cloudflare` IS THEIR ORANGE. Asked
   * 2026-09-16 with their logo: *"pi should be brandcolorsih on diageam"*. The
   * colour a reader has already learned from the thing itself is worth more
   * than a slot in a rotation, and a Raspberry Pi is one of the few machines in
   * these pictures that a reader can recognise by colour at all.
   * ⚠️ 343 IS READ OFF THE LOGO, not chosen: #C51A4A is the crimson in their
   * mark, which is hue 343 in HSL. It sits three degrees from `device`, and
   * that is fine: `device` is any machine in a room and this is one machine
   * anybody can name.
   */
  raspberry: 343,          // #C51A4A, the crimson in their own logo
  /**
   * 🔴 THEIR OWN BLUE, FOR THE REASON `cloudflare` IS THEIR ORANGE AND A
   * RASPBERRY PI IS THEIR CRIMSON. Asked 2026-09-19: *"make both outer boxes
   * blue (meta color)"*, about a headset and its controllers.
   * ⚠️ 213 IS READ OFF THE BRAND, not chosen: #0064E0 is hue 213 in HSL.
   * ⚠️ AND IT IS NOT `device`. `device` is any machine in a room, a board, a
   * phone, a speaker, and it stays 330 for all of them. This is for the one
   * make of headset these pages are actually written against, which a reader
   * can name on sight, the same argument the two entries above it make.
   */
  meta: 213,               // #0064E0, their blue
  archive: 250,            // ERR, archive.org, a corpus
  station: 205,            // a broadcaster
};

/**
 * For nodes with no `tech`. It only has to keep neighbours apart inside one
 * picture, so the order is by contrast rather than by meaning.
 * ⚠️ MIXED INTO A NEAR-BLACK GREY, every hue loses saturation and the warm ones
 * lose the most: 35 degrees at a quarter strength came out as brown and was
 * reported as muddy. The repair was not to ban warm hues, which would have made
 * Cloudflare's own colour unusable, but to move the identity into the EDGE: the
 * fill stays almost grey and the stroke carries the hue.
 */
const HUES = [205, 168, 278, 330, 145, 250, 190, 305];
// Almost grey. A tinted fill this faint reads as "these two belong together"
// and never as a colour the picture is about.
const BOX_TINT = 0.1;
// The edge is where a hue survives the mix, so this is where identity lives.
// ⚠️ TURNED DOWN FROM 0.75. At three quarters the strokes were saturated enough
// to read as the subject of the picture rather than as labels on it: four
// bright outlines around near-grey boxes puts the loudest ink on the part that
// carries the least information. Half is still enough to tell two technologies
// apart side by side, which is the whole job.
const EDGE_TINT = 0.52;
const TEXT_TINT = 0.62;
// Kinds whose stylesheet rule replaces the hue on the box edge. A name of one
// of these must not be tinted in the prose either, or the two channels disagree.
// See `.pos-dg-n[data-kind="here"]` in shell.css.
const HUELESS_KINDS = new Set(['here']);
const tint = (deg, amt, onto) =>
  `color-mix(in oklab, hsl(${deg} 72% 62%) ${Math.round(amt * 100)}%, ${onto})`;

const PAD           = 2;    // keeps a 2 px stroke off the svg's own edge
const BOX_PAD_X     = 10;
const BOX_PAD_Y     = 9;
const SUB_GAP       = 3;    // between the last label line and the sub
const GAP_X_MAX     = 58;   // between columns: an arrow plus room for its name
const GAP_X_MIN     = 34;
const GAP_Y         = 16;   // between two boxes sharing a column
const GAP_Y_COL     = 30;   // between two boxes in the one-column layout
// A CONTAINER IS MEASURED FROM WHAT IS IN IT. These three numbers are the only
// thing the arithmetic adds: the room around the boxes inside, the room between
// two of them, and the room under the container's own words. Equal padding on
// all four sides is deliberate — a box inset further from one edge than another
// reads as a box that has drifted rather than one that is held.
const CHILD_PAD     = 8;    // a container's edge to the boxes inside it
// ⚠️ 10 RATHER THAN 6, so the line that ties two children together has room to
// be seen. At 6 px the tie was four pixels of hairline between two box edges,
// which is indistinguishable from the edges themselves.
const CHILD_GAP     = 10;   // between two boxes inside one container
const HEAD_GAP      = 7;    // a container's own words to its first box
// A LINK BETWEEN TWO BOXES IN ONE CONTAINER LIVES IN THESE TWO NUMBERS.
// ⚠️ THE LANE'S ROOM IS TAKEN FROM BOTH SIDES, so the boxes inside stay
// centred. Taking it from the right alone would buy the lane at the price of
// the rule above it: a box inset further from one edge than another reads as a
// box that has drifted rather than one that is held.
/**
 * 🔴 20, UP FROM 14, AND THE SIX PIXELS ARE AN ARROWHEAD. Reported 2026-09-16
 * with a photograph of `/crate/`: *"can not see rightmost connector
 * arrowhead"*. It was not missing, it had nowhere to stand.
 *
 * The arithmetic, because it is the whole bug. A container insets its boxes by
 * `CHILD_PAD + maxLanes * SIB_LANE` and puts lane `i` at `CHILD_PAD +
 * SIB_LANE * (i + 0.5)` from its edge, so the straight run from the lane to the
 * box it arrives at was `14 - 7 - 3 = 4 px` — and `SIB_CORNER` is 4, so the
 * TURN ate the entire run and the marker had a zero-length segment to orient
 * itself on. At 20 the run is 10 px, the corner takes 4 and the head has 6 to
 * sit on, which is its own length.
 * ⚠️ THE COST IS 6 px OF CONTAINER WIDTH PER LANE and nothing else: the boxes
 * inset by the same amount the lane moves out, so no label gets narrower.
 */
const SIB_LANE      = 20;   // room inside a container for one such lane
const SIB_CORNER    = 4;    // its turns: the run out of a box is about 5 px
// ⚠️ AND THE GAP GROWS FOR THE HEAD, NOT FOR A NAME. An arrowhead is 7 px long
// and is drawn back along the line from its tip, so in a 10 px gap it starts
// inside the box it leaves: a smear between two edges rather than an arrow.
// Sixteen leaves four pixels of line behind the head, which is what makes it
// read as pointing somewhere.
const SIB_GAP       = 16;   // a gap with an arrow in it rather than a tie
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
// How far out of the source a step turns before it changes height. Short, so a
// fork's branches separate at once and each gets the rest of the gap at its own
// target's height — which is the room its name needs. See `stepElbow`.
const STEP_TURN     = 16;

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
 * survives in the box's `aria-label`, which a screen reader reads and no
 * browser draws: nothing is lost, only hidden, and the author is told exactly
 * which. ⚠️ IT USED TO SURVIVE IN A `<title>`, and that is a NATIVE TOOLTIP —
 * the whole string drawn on top of the box the moment a pointer rests on it,
 * beside a line under the picture already saying the same words. Hiding a cut
 * behind a hover also let a too-long label feel harmless; it is not, and the
 * report is the point.
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
      // broken, a broken word is one that is still whole in `aria-label`.
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
 * One flat list of boxes out of a description that nests one level.
 *
 * ⚠️ A CHILD TAKES ITS CONTAINER'S `kind`, and that is the colour rule rather
 * than a shortcut: the hue says WHICH MACHINE a box is, so a program drawn
 * inside a machine is that machine's colour. What tells the two apart is that
 * one is inside the other — position and size, which survive greyscale.
 *
 * `_kids` and `_owner` are scratch, deleted before `layout` returns anything.
 *
 * @returns {{tops: object[], kids: object[], owner: Map<string,string>}}
 */
function unpack(spec) {
  const tops = [], kids = [], owner = new Map();
  for (const n of (spec.nodes || [])) {
    const t = { ...n };
    const cs = (n.children || []).map((c) => ({ ...c, kind: c.kind || n.kind }));
    delete t.children;
    t._kids = cs;
    for (const c of cs) {
      // one level, and a second one is REPORTED rather than half-drawn: a box
      // inside a box inside a box is a diagram that wants to be a file tree.
      if (c.children) delete c.children;
      c._kids = [];
      c._owner = n.id;
      owner.set(c.id, n.id);
      kids.push(c);
    }
    tops.push(t);
  }
  return { tops, kids, owner };
}

/**
 * `**bold**`, and nothing else, split into runs.
 *
 * ⚠️ AN UNPAIRED `**` STAYS ON THE PAGE AS TWO ASTERISKS. The tempting
 * implementation toggles on every marker it meets, which turns one typo into a
 * sentence that is bold from the mistake to the full stop — a rendering bug
 * that looks like a writing decision. A run has to be closed to exist.
 *
 * @param {string} text
 * @returns {Array<{text: string, bold: boolean}>}
 */
export function boldParts(text) {
  const s = String(text ?? '');
  const out = [];
  let i = 0;
  for (;;) {
    const open = s.indexOf('**', i);
    if (open < 0) break;
    const close = s.indexOf('**', open + 2);
    if (close < 0) break;
    if (open > i) out.push({ text: s.slice(i, open), bold: false });
    if (close > open + 2) out.push({ text: s.slice(open + 2, close), bold: true });
    i = close + 2;
  }
  if (i < s.length) out.push({ text: s.slice(i), bold: false });
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
  const { tops: nodes, kids, owner } = unpack(spec);
  const byId = new Map(nodes.concat(kids).map((n) => [n.id, n]));
  // which box on the FLOW a given box belongs to: itself, or the machine it is
  // drawn inside. Every question about where a link goes is asked of this.
  const ref = (id) => owner.get(id) || id;
  const inside = [];
  const sibs = [];
  const links = (spec.links || [])
    .filter((l) => byId.has(l.from) && byId.has(l.to) && l.from !== l.to)
    // 🔴 A LINK WHOSE TWO ENDS SHARE A MACHINE NEVER REACHES THE OUTSIDE, so
    // none of the routing below is about it. Two boxes INSIDE the container
    // are routed between themselves by `placeSibs`; a container and a box
    // inside itself have no gap to run a line through and are refused, in
    // writing, on `cuts`.
    .filter((l) => {
      if (ref(l.from) !== ref(l.to)) return true;
      if (owner.has(l.from) && owner.has(l.to)) sibs.push({ ...l });
      else inside.push(l);
      return false;
    })
    .map((l) => ({ ...l }));
  // ⚠️ SEEDED FROM THE SPEC, so anything refused BEFORE the layout runs — a
  // title under the standing heading, today — arrives in the same list the
  // page's own `nothing cut, nothing refused` assert reads. A second channel
  // for refusals is a refusal nobody sees.
  const cuts = Array.isArray(spec.cutsSink) ? [...spec.cutsSink] : [];
  const avail = Math.max(140, Math.floor(width));

  if (!nodes.length) {
    return { mode: 'row', width: avail, height: 0, boxW: 0, boxH: 0,
             nodes: [], links: [], cuts, cycle: false };
  }

  // The columns are a statement about the MACHINES, so a link that names a box
  // inside one is asked about its machine — otherwise a program in the middle
  // of a chain would be given a column of its own and the picture would say the
  // signal visits a place it never leaves.
  const { col, cycle } = assignColumns(nodes,
    links.map((l) => ({ ...l, from: ref(l.from), to: ref(l.to) })));
  for (const c of kids) col.set(c.id, col.get(c._owner));
  const cols = Math.max(...nodes.map((n) => col.get(n.id))) + 1;

  // ── what the boxes inside a container have to make room for ─────────────
  // 🔴 A LINK ASKED FOR AND NOT DRAWN IS A REPORT, NOT A SILENCE. This is how
  // three arrows went missing from /station/ without anybody seeing it: the
  // picture looked complete, the ties between the children stood where the
  // arrows should have been, and the only trace was a console warning nobody
  // was reading. Every one of these is on `cuts`, which /kit/ prints.
  for (const l of inside) {
    cuts.push({ id: `${l.from} to ${l.to}`, where: 'link',
                full: l.label || `${l.from} to ${l.to}`,
                shown: 'NOT DRAWN: a box and the box it is inside have no gap between them',
                width: 0 });
  }
  // where each box sits in its container, which is what "are these two next to
  // each other" means
  const kidIx = new Map();
  for (const n of nodes) n._kids.forEach((c, i) => kidIx.set(c.id, i));
  const sibSpan = (l) => Math.abs(kidIx.get(l.to) - kidIx.get(l.from));
  // how many lanes the busiest container needs, and therefore how far in from
  // its edges every container holds its boxes
  const laneCount = new Map();
  for (const l of sibs) {
    if (sibSpan(l) <= 1) continue;
    const k = owner.get(l.from);
    laneCount.set(k, (laneCount.get(k) || 0) + 1);
  }
  const maxLanes = laneCount.size ? Math.max(...laneCount.values()) : 0;
  const childInset = CHILD_PAD + maxLanes * SIB_LANE;
  // one gap for every container in the picture, because gaps of two sizes
  // would read as a difference that means something
  const childGap = sibs.some((l) => sibSpan(l) === 1) ? SIB_GAP : CHILD_GAP;

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
    for (const c of kids) rowOf.set(c.id, rowOf.get(c._owner));

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
    // a box INSIDE a container is inset, so what it needs is what it needs
    // plus the room its container holds around it
    for (const c of kids) boxNeed = Math.max(boxNeed, measure.sub(c.sub || '') + childInset * 2);
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
  // heights in one row is a picture where the tall one looks important. A
  // container is taller than a plain box by what it holds — and it hands that
  // height to every other box in the picture rather than keeping it, for the
  // same reason: a row of unequal panels ranks them.
  const kidInner = Math.max(20, w - childInset * 2 - BOX_PAD_X * 2);
  // ⚠️ ASSIGNED IN READING ORDER, PARENTS AND CHILDREN ALIKE, so neighbouring
  // boxes never share a hue and the order is the one a reader meets them in.
  // A node may state its own; that is what a page reaches for when two pictures
  // have to agree about what colour a thing is.
  {
    let h = 0;
    const give = (n) => {
      if (n.hue == null && n.tech) n.hue = TECH_HUE[n.tech];
      if (n.hue == null) n.hue = HUES[h++ % HUES.length];
      for (const k of (n.children || [])) give(k);
    };
    for (const n of nodes) give(n);
  }
  const fit = (n, width) => {
    n._lab = wrapLines(n.label, width, 2, measure.lab);
    n._sub = wrapLines(n.sub, width, 1, measure.sub);
    if (n._lab.cut) {
      cuts.push({ id: n.id, where: 'label', full: n._lab.full,
                  shown: n._lab.lines.join(' '), width });
    }
    // 🔴 A LONG NOTE IS REPORTED THE WAY A LONG LABEL IS. It cannot be cut at
    // the reader, because a note is prose and half a sentence is worse than
    // none; what it gets instead is a line in `cuts` so the author sees it.
    // Forty words is about two sentences at this register. See CLAUDE.md.
    if (n.note) {
      const words = String(n.note).trim().split(/\s+/).length;
      if (words > 40) {
        cuts.push({ id: n.id, where: 'note', full: String(n.note),
                    shown: `${words} words`, width: 40 });
      }
    }
    if (n._sub.cut) {
      cuts.push({ id: n.id, where: 'sub', full: n._sub.full,
                  shown: n._sub.lines.join(' '), width });
    }
  };
  // in the order they were written, boxes inside a container included, so the
  // report reads down the description rather than by where the drawer got to
  for (const n of nodes) { fit(n, inner); for (const c of n._kids) fit(c, kidInner); }

  const own = (n) => n._lab.lines.length * m.labLh
                   + (n._sub.lines.length ? SUB_GAP + m.subLh : 0);
  let kidH = 0;
  for (const c of kids) kidH = Math.max(kidH, own(c) + BOX_PAD_Y * 2);
  kidH = Math.round(kidH);
  let boxH = 0;
  for (const n of nodes) {
    boxH = Math.max(boxH, n._kids.length
      ? own(n) + HEAD_GAP + n._kids.length * kidH
        + (n._kids.length - 1) * childGap + CHILD_PAD * 2
      : own(n) + BOX_PAD_Y * 2);
  }
  boxH = Math.round(boxH);

  const shared = { sibs, kidIx, sibSpan, childGap, childInset };
  const out = mode === 'row'
    ? placeRow(nodes, links, { col, cols, avail, w, boxH, kidH, owner, gapX, m, measure, cuts,
                               ...shared })
    : placeColumn(links, { order, rowOf, avail, w, boxH, kidH, owner, leftInset, rightInset,
                           backBudget, skipBudget, m, measure, cuts, ...shared });

  for (const n of nodes.concat(kids)) { delete n._lab; delete n._sub; }
  return { mode, boxW: w, boxH, cuts, cycle, gapX, ...out,
           ...(inside.length ? { inside } : {}) };
}

function placeRow(nodes, links, { col, cols, avail, w, boxH, kidH, owner, gapX, m, measure, cuts,
                                  sibs, kidIx, sibSpan, childGap, childInset }) {
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
    return box(n, x, y, w, boxH, m, kidH, childGap, childInset);
  });
  const at = new Map();
  for (const p of placed) { at.set(p.id, p); for (const k of p.kids || []) at.set(k.id, k); }
  // 🔴 A LINK ATTACHES TO THE BOX IT NAMES AND ITS NAME GOES OUTSIDE THE
  // MACHINE THAT BOX IS IN. Those are two different boxes the moment anything
  // is nested: an arrow into a program dives through its machine's edge, which
  // is the picture, while a name at the midpoint of that dive would be written
  // inside the machine, on top of whatever else is in there. So the path is
  // built from the box and the name from `outer`, and with nothing nested the
  // two are the same object — which is why a picture with no container in it
  // comes out unchanged to the last decimal.
  const outer = (id) => at.get(owner.get(id) || id);
  const bottom = top + tallest;

  // ── the return paths, under the row ───────────────────────────────────
  // 🔴 UNDER, NEVER BETWEEN THE BOXES. A return drawn back through the forward
  // path is the one thing that makes a signal diagram unreadable: with two
  // lines between the same pair of boxes the eye cannot tell the way out from
  // the way home.
  const backs = links.filter((l) => l.back);
  const level = backLevels(backs.map((l) => {
    const f = outer(l.from), t = outer(l.to);
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

  // 🔴 TWO ARROWS THAT LAND ON ONE BOX MUST NOT LAND AT ONE POINT. Both would
  // come in at the target's centre, so the second is drawn exactly on top of
  // the first and their two names are written at one x and one y — MEASURED on
  // /station/, `Range requests` and `the playlist` printed over each other into
  // an unreadable smear, and the picture said one thing arrives where two do.
  // A fork is spread by its branches' own targets; a JOIN has nothing to spread
  // it, so the arrivals share out the target's edge instead. One line of link
  // type apart at the least, because the names are what collide first.
  const arrivals = new Map();
  for (const l of links) {
    if (l.back || overs.includes(l)) continue;
    if (!arrivals.has(l.to)) arrivals.set(l.to, []);
    arrivals.get(l.to).push(l);
  }
  // 🔴 TWO LINES OF ROOM, NOT ONE, AND THAT IS THE WHOLE FIX THE SECOND TIME.
  // Spreading arrivals by ONE line height was right about the mechanism and
  // short by half: `wrapLines` is allowed two lines, a name sits ABOVE its own
  // arrow, and both of station's arrivals into `player` wrap. So two two-line
  // names 15 px apart still printed through each other, which is the same smear
  // in a smaller font. `LINK_MAX_LINES` is the cap, so reserving it can never
  // be too little, and where a name turns out to be one line the extra gap
  // costs nothing but air.
  const LINK_MAX_LINES = 2;
  // 🔴 AND A THIRD TIME, BECAUSE NOT COLLIDING IS NOT THE SAME AS BEING APART.
  // Two lines of room plus 6 px puts two two-line names 28 px apart, which is
  // exactly enough that they do not overlap and reads as one clump: reported
  // with a photograph of `playlist text` and `mp3 bytes` arriving at `player`,
  // *"can we get connectors a bit separate?"*. The first two fixes were about a
  // SMEAR and this one is about the gap being legible. 18 px of air rather than
  // 6 is half a line between the blocks, so the eye takes them as two arrivals
  // before it has read either name.
  const spread = Math.max(ATTACH_OFF, Math.round(m.linkLh) * LINK_MAX_LINES + 18);
  const arriveAt = (l, t) => {
    const list = arrivals.get(l.to);
    if (!list || list.length < 2) return t.cy;
    return t.cy + (list.indexOf(l) - (list.length - 1) / 2) * spread;
  };
  /**
   * 🔴 AND EACH ARRIVAL TURNS DOWN AT ITS OWN x, WHICH IS THE OTHER HALF.
   *
   * Reported with a photograph after the vertical gap was widened: *"still no x
   * separation"*. Two arrows into one box were 46 px apart at their heads and
   * their VERTICAL RUNS were on top of each other, because the bend is taken at
   * `x1 + STEP_TURN` and `x1` is the source box's right edge — and on
   * `/station/` both sources are boxes in ONE container, so they share that
   * edge to the pixel. Two names, two heads, one line down the middle.
   *
   * The index into the arrival list is already the number that spreads the
   * heads, so it spreads the bends too: arrival 0 turns first and each one
   * after it turns further along. They nest instead of overlapping.
   */
  const TURN_STEP = 13;
  const turnAt = (l, x1, x2) => {
    const list = arrivals.get(l.to);
    const i = list && list.length > 1 ? list.indexOf(l) : 0;
    const want = x1 + STEP_TURN + i * TURN_STEP;
    // ⚠️ CLAMPED INSIDE THE RUN. A bend past the target is an elbow that
    // doubles back, and one behind the source is a line that leaves backwards.
    return Math.max(x1 + 6, Math.min(want, Math.max(x1 + 6, x2 - 6)));
  };

  const drawn = [];
  for (const l of links) {
    const f = at.get(l.from), t = at.get(l.to);
    const fm = outer(l.from), tm = outer(l.to);   // the machines they are in
    if (!l.back) {
      const o = overs.indexOf(l);
      if (o < 0) {
        const x1 = f.x + f.w + EDGE_OUT, y1 = f.cy;
        const x2 = t.x - EDGE_OUT - 1, y2 = arriveAt(l, t);
        // the gap between the two MACHINES, which is the room the name has —
        // never the length of the line, which reaches further whenever one end
        // of it is a box inside one of them
        const ox1 = fm.x + fm.w + EDGE_OUT, ox2 = tm.x - EDGE_OUT - 1;
        const budget = ox2 - ox1 - 1;
        const lab = wrapLines(l.label, budget, 2, measure.link);
        if (lab.cut) {
          cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                      shown: lab.lines.join(' '), width: budget });
        }
        // 🔴 SIX PIXELS ABOVE THE LINE, AND NOW THAT IS ALL IT TAKES. The old
        // code measured the arrow's SLOPE and lifted each name clear of it,
        // then put the two names of a fork on opposite sides so they did not
        // fall into the wedge the branches open. Both were repairs to the
        // diagonal; `stepElbow` has no slope and no wedge, so the line under
        // every name is horizontal at its own target's height and the
        // clearance is one number.
        const turn = turnAt(l, x1, x2);
        const lx = Math.max((ox1 + ox2) / 2, turn + 1);
        drawn.push({ ...l, d: stepElbow(x1, y1, x2, y2, turn),
                     lab, lx, ly: y2 - 6, anchor: 'middle', stack: 'up' });
        continue;
      }
      // over the row, out of the source's TOP edge and down into the target's
      // — off the MACHINE both ends, because a lane that dived into a box
      // inside one would cross that container's own words on the way
      const dy = top - LANE_FIRST - overLevel[o] * overStep;
      const sx = fm.cx + ATTACH_OFF, tx = tm.cx - ATTACH_OFF;
      const budget = laneBudget(sx, tx);
      const lab = wrapLines(l.label, budget, 1, measure.link);
      if (lab.cut) {
        cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                    shown: lab.lines.join(' '), width: budget });
      }
      drawn.push({ ...l, d: acrossLane(sx, fm.y, tx, tm.y - EDGE_OUT - 1, dy, -1),
                   lab, lx: (sx + tx) / 2, ly: dy - 5, anchor: 'middle',
                   stack: 'none', level: overLevel[o], depth: dy });
      continue;
    }
    const i = backs.indexOf(l);
    const dy = bottom + LANE_FIRST + level[i] * step;
    deepest = Math.max(deepest, dy);
    /**
     * 🔴 A RETURN PATH LANDS ON THE BOX IT REACHES, NOT ON THE MACHINE AROUND
     * IT. This used the containers (`fm`, `tm`), so on `/keys/` the sound came
     * back from the bottom edge of `Raspberry Pi` and arrived at the bottom
     * edge of `Cloudflare`, with nothing joining it to `capture` or to `sound
     * back`. REPORTED in exactly those terms: *"capture should conntect to
     * sound back and that should connet to playout"*.
     *
     * ⚠️ A FORWARD LINK ALREADY DID THIS. `at.get(id)` resolves a child to the
     * child and a top-level node to itself, so the two halves of the picture
     * were disagreeing about what a link connects, and only the return half was
     * wrong. Where a link names a whole machine, `f` IS `fm` and nothing moves.
     * ⚠️ IT CROSSES THE CONTAINER'S OWN EDGE, which is correct rather than
     * untidy: the line is going into that machine, and stopping at the wall
     * would say it arrives at the building rather than at the thing inside it.
     */
    const sx = f.cx - ATTACH_OFF, tx = t.cx + ATTACH_OFF;
    const sy = f.y + f.h, ty = t.y + t.h + EDGE_OUT + 1;
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

  drawn.push(...placeSibs(sibs, at, { owner, kidIx, sibSpan, cuts }));

  const height = Math.round(
    backs.length ? deepest + (backLabelled ? 16 : 6) + PAD : bottom + PAD);
  return { width: avail, height, nodes: placed, links: drawn };
}

function placeColumn(links, { order, rowOf, avail, w, boxH, kidH, owner, leftInset, rightInset,
                             backBudget, skipBudget, m, measure, cuts,
                             sibs, kidIx, sibSpan, childGap, childInset }) {
  // ⚠️ ONE COLUMN IS NOT THE ROW LAYOUT ROTATED. A horizontal diagram on a
  // phone is a diagram nobody reads, so below the break the steps stack top to
  // bottom in the order the signal takes them, the return paths run down the
  // left-hand gutter, and a forward link that reaches past the box under it
  // runs down the right-hand one. Onward on the right, back on the left: two
  // gutters that cannot collide, and neither line is ever behind a box.
  const x = leftInset + PAD;
  const placed = order.map((n, r) =>
    box(n, x, PAD + r * (boxH + GAP_Y_COL), w, boxH, m, kidH, childGap, childInset));
  const at = new Map();
  for (const p of placed) { at.set(p.id, p); for (const k of p.kids || []) at.set(k.id, k); }
  // the machine a box is drawn inside, or the box itself — see placeRow, where
  // the same two lines carry the same rule
  const outer = (id) => at.get(owner.get(id) || id);
  const bottom = PAD + placed.length * boxH + (placed.length - 1) * GAP_Y_COL;
  const right = x + w;

  const backs = links.filter((l) => l.back);
  const level = backLevels(backs.map((l) => {
    const f = outer(l.from), t = outer(l.to);
    return [f.cy - ATTACH_OFF / 2, t.cy + ATTACH_OFF / 2];
  }));
  const overs = links.filter((l) => skipsABox(l, rowOf));
  const overLevel = backLevels(overs.map((l) => {
    const f = outer(l.from), t = outer(l.to);
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

  // 🔴 AND TWO LINKS BETWEEN ONE PAIR OF MACHINES ARE ONE LINE WITH TWO NAMES,
  // WHICH MUST NOT BE WRITTEN AT ONE POINT. Stacked, every link attaches to the
  // machine, so `Worker -> player` and `programmes -> player` are the SAME
  // vertical run: their two names landed on one x and one y and printed over
  // each other. MEASURED on /station/ at 390 px, both at y 641.8. The row
  // layout spreads the same case across the target's edge, which it can because
  // the two arrows are distinct there; here the arrow is one thing and only the
  // names can move.
  const pairs = new Map();
  for (const l of links) {
    if (l.back || overs.includes(l)) continue;
    const key = `${outer(l.from).id}|${outer(l.to).id}`;
    if (!pairs.has(key)) pairs.set(key, []);
    pairs.get(key).push(l);
  }
  const apart = Math.round(m.linkLh) + 2;

  const drawn = [];
  for (const l of links) {
    // 🔴 IN ONE COLUMN EVERY LINK ATTACHES TO THE MACHINE, NEVER TO A BOX
    // INSIDE IT — and the row layout is the opposite, for one reason that
    // decides both. A container's own name sits at the TOP of it with its
    // boxes under, so the ground between a container's edge and a box inside
    // it is EMPTY sideways and FULL downwards. Here every run is vertical:
    // MEASURED, an arrow drawn into a box inside `Raspberry Pi` ran straight
    // through the words `Raspberry Pi` on its way, which is the same defect as
    // a lane through its own name and has three checks of its own already.
    // Left to right the same arrow crosses nothing but padding, so there it
    // reaches the box it names.
    const f = outer(l.from), t = outer(l.to);
    if (!l.back) {
      const o = overs.indexOf(l);
      if (o < 0) {
        const down = rowOf.get(l.to) > rowOf.get(l.from);
        const y1 = down ? f.y + f.h + EDGE_OUT : f.y - EDGE_OUT;
        const y2 = down ? t.y - EDGE_OUT - 1 : t.y + t.h + EDGE_OUT + 1;
        const lab = wrapLines(l.label, fwdBudget, 1, measure.link);
        if (lab.cut) {
          cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: lab.full,
                      shown: lab.lines.join(' '), width: fwdBudget });
        }
        const share = pairs.get(`${f.id}|${t.id}`) || [l];
        const off = share.length < 2 ? 0
          : (share.indexOf(l) - (share.length - 1) / 2) * apart;
        drawn.push({ ...l, d: `M${r1(f.cx)} ${r1(y1)} L${r1(f.cx)} ${r1(y2)}`,
                     lab, lx: f.cx + (stepLeft ? -STEP_OFF : STEP_OFF),
                     ly: (y1 + y2) / 2 + off + m.linkSize * 0.35,
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
      const sx = f.x + f.w + EDGE_OUT, tx = t.x + t.w + EDGE_OUT + 1;
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

  drawn.push(...placeSibs(sibs, at, { owner, kidIx, sibSpan, cuts }));

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

/**
 * A STEP from one column to the next: out of the box, across, and in.
 *
 * 🔴 IT USED TO BE ONE STRAIGHT LINE FROM EDGE TO EDGE, and for a step between
 * two boxes at the same height that is exactly what this still draws. The
 * problem was the other case: a fork puts two boxes in one column, so its
 * arrows ran DIAGONALLY, and a diagonal is the only line in the whole picture
 * that is not horizontal or vertical — the lanes over and under the row have
 * turned corners since they were written, the boxes have rounded corners, and
 * two slanted arrows in the middle of that read as a different drawing.
 * Reported twice, on two different pictures, as wanting `-|` with rounded
 * turns. Same `CORNER` as the lanes above, so there is one radius in the file.
 *
 * ⚠️ THE TURN IS EARLY, NEAR THE SOURCE, AND THAT IS WHAT THE NAMES NEED. Turn
 * late and every branch shares one long trunk at the source's height, so their
 * names stack on top of each other; turn early and each branch gets the whole
 * gap at its OWN target's height to be named in. The short stub they share is
 * the fork, which is how a fork ought to look anyway.
 *
 * ⚠️ AND A FORK'S NAMES NO LONGER NEED LIFTING OFF THEIR OWN ARROWS. The old
 * code measured the slope and pushed each name clear of the wedge two diverging
 * branches open — MEASURED in `/kit/` at 655 px, `settings` climbed 5.4 px
 * through the middle of its own word. There is no wedge now and no slope: the
 * line under a name is horizontal, so the name sits a fixed distance above it.
 */
/**
 * The join between two boxes stacked inside one machine: straight down the
 * middle, or down-across-down with the same rounded turns every other link in
 * the picture uses when their centres do not line up.
 */
function tieElbow(sx, sy, tx, ty) {
  if (Math.abs(sx - tx) < 0.5) return `M${r1(sx)} ${r1(sy)} L${r1(tx)} ${r1(ty)}`;
  const mid = (sy + ty) / 2;
  const k = tx > sx ? 1 : -1;
  return `M${r1(sx)} ${r1(sy)} L${r1(sx)} ${r1(mid - CORNER)}`
       + ` Q${r1(sx)} ${r1(mid)} ${r1(sx + CORNER * k)} ${r1(mid)}`
       + ` L${r1(tx - CORNER * k)} ${r1(mid)}`
       + ` Q${r1(tx)} ${r1(mid)} ${r1(tx)} ${r1(mid + CORNER)}`
       + ` L${r1(tx)} ${r1(ty)}`;
}

/**
 * Every link whose two ends are boxes inside ONE container.
 *
 * 🔴 IT REPLACES THE TIE, IT IS NEVER DRAWN ON TOP OF ONE. A tie is a bracket
 * saying "these are parts of one machine" and carries no head, because a head
 * would claim an order the drawing does not know. Where the author has DECLARED
 * a link the order is known and said out loud, so the bracket has nothing left
 * to add and the arrow takes its place. Two lines between one pair of boxes is
 * the defect a return path under the row exists to avoid, one level in.
 *
 * 🔴 AND IT CARRIES NO NAME. The gap two stacked boxes share is sixteen pixels
 * tall and about half a box wide, so a name in it either runs under both boxes
 * or shrinks past the point of being read. The DIRECTION is the whole message
 * here; what travels goes in the link's `note`, which is read on hover in the
 * line under the picture where there is room for a sentence. A label written on
 * one anyway is reported on `cuts` rather than quietly ignored, because an
 * author who cannot see their own label has no way to know where it went.
 *
 * Two shapes, and which one is used is not a preference:
 *   next to each other: the arrow runs down the gap they already share, where
 *     the tie ran.
 *   reaching past a box: a lane inside the container's own padding, out of one
 *     side and back in at the same side, because down the middle it would pass
 *     straight through a box it never visits.
 *
 * @returns {object[]} drawable links, in the same shape the placers produce
 */
function placeSibs(sibs, at, { owner, kidIx, sibSpan, cuts }) {
  const drawn = [];
  const lanes = new Map();      // container -> how many lanes it is already holding
  for (const l of sibs || []) {
    const f = at.get(l.from), t = at.get(l.to);
    const c = at.get(owner.get(l.from));
    if (!f || !t || !c) continue;
    // the name survives whole for a screen reader and for the line under the
    // picture, and nothing is drawn from it
    const lab = { lines: [], cut: false, full: String(l.label ?? '') };
    if (l.label) {
      cuts.push({ id: `${l.from} to ${l.to}`, where: 'link', full: String(l.label),
                  shown: 'NOT DRAWN: an arrow between two boxes in one container shows '
                       + 'direction only. Put what travels in its note',
                  width: 0 });
    }
    const mid = { lab, lx: c.cx, ly: (f.cy + t.cy) / 2, anchor: 'middle', stack: 'none' };

    if (sibSpan(l) === 1) {
      const down = t.y > f.y;
      const sy = down ? f.y + f.h + EDGE_OUT : f.y - EDGE_OUT;
      const ty = down ? t.y - EDGE_OUT - 1 : t.y + t.h + EDGE_OUT + 1;
      drawn.push({ ...l, sib: true, ...mid, d: tieElbow(f.cx, sy, t.cx, ty) });
      continue;
    }

    const i = lanes.get(c.id) || 0;
    lanes.set(c.id, i + 1);
    /**
     * 🔴 AN INLET AND AN OUTLET MAY NOT BE THE SAME POINT, AND ON ONE EDGE THEY
     * WERE. Reported 2026-09-16 with a photograph of `/station/`: two lanes
     * arriving at the Worker's right edge landed on one arrowhead at `t.cy`,
     * because a lane's arrival y was the target's CENTRE whatever else was
     * already there. The forward links across the picture have shared out a
     * target's edge since the day two names printed over each other; the lanes
     * inside a container never learned it.
     * ⚠️ HALF THE SPREAD THE OUTER ONES USE. Those are keeping two NAMES apart
     * and a name is two lines tall; a lane inside a container carries no label
     * at all, so what has to be apart is two arrowheads.
     */
    const inTo = sibs.filter((x) => x.to === l.to && sibSpan(x) > 1);
    const k = inTo.length > 1 ? inTo.indexOf(l) - (inTo.length - 1) / 2 : 0;
    const ty0 = t.cy + k * ATTACH_OFF;
    const bx = c.x + c.w - CHILD_PAD - SIB_LANE * (i + 0.5);
    // ⚠️ THE HEAD LANDS ON THE BOX'S EDGE, not three pixels short of it. Those
    // three were the last of the four the corner needed; see `SIB_LANE`.
    const sx = f.x + f.w + EDGE_OUT, tx = t.x + t.w;
    drawn.push({ ...l, sib: true, ...mid,
                 d: sideLane(sx, f.cy, tx, ty0, bx, -1, SIB_CORNER) });
  }
  return drawn;
}

function stepElbow(sx, sy, tx, ty, bx) {
  if (Math.abs(ty - sy) < 0.5) return `M${r1(sx)} ${r1(sy)} L${r1(tx)} ${r1(ty)}`;
  const vs = ty > sy ? 1 : -1;                 // down the picture, or up it
  const hs = tx > sx ? 1 : -1;                 // onward, which is left to right
  const c = Math.min(CORNER, Math.abs(ty - sy) / 2,
    Math.abs(bx - sx), Math.abs(tx - bx));
  return `M${r1(sx)} ${r1(sy)} L${r1(bx - c * hs)} ${r1(sy)}`
       + ` Q${r1(bx)} ${r1(sy)} ${r1(bx)} ${r1(sy + c * vs)}`
       + ` L${r1(bx)} ${r1(ty - c * vs)}`
       + ` Q${r1(bx)} ${r1(ty)} ${r1(bx + c * hs)} ${r1(ty)}`
       + ` L${r1(tx)} ${r1(ty)}`;
}

/**
 * a lane that runs DOWN the side: `hs` +1 left of the column, -1 right of it.
 * ⚠️ THE RADIUS IS A PARAMETER FOR ONE REASON: a lane inside a container has
 * about five pixels to turn in, and a 6 px corner on a 5 px run doubles back
 * on itself. Every lane outside the boxes keeps `CORNER`, so there is still
 * one radius in the picture a reader can see.
 */
function sideLane(sx, sy, tx, ty, bx, hs, corner = CORNER) {
  const k = ty < sy ? 1 : -1;          // the usual return direction: bottom to top
  const c = Math.min(corner, Math.abs(bx - sx), Math.abs(bx - tx), Math.abs(ty - sy) / 2);
  return `M${r1(sx)} ${r1(sy)} L${r1(bx + c * hs)} ${r1(sy)}`
       + ` Q${r1(bx)} ${r1(sy)} ${r1(bx)} ${r1(sy - c * k)}`
       + ` L${r1(bx)} ${r1(ty + c * k)}`
       + ` Q${r1(bx)} ${r1(ty)} ${r1(bx + c * hs)} ${r1(ty)}`
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
  // what the line will SAY for a box — its own sentence if it has one, its
  // name if it does not. Reserving against the name while the pointer shows
  // the sentence is the same defect as reserving against the box while the
  // pointer shows the caption, one step further in.
  const says = (n) => n?.note || n?.title || n?.label?.full || '';
  const out = [spec?.caption || ''];
  for (const n of (nodes || [])) {
    out.push(says(n));
    for (const k of (n.kids || [])) out.push(says(k));
  }
  return out;
}

/**
 * one box's geometry, and the baseline of every line of type inside it — plus,
 * for a container, the boxes it holds.
 *
 * 🔴 A CONTAINER IS MEASURED FROM ITS CONTENTS, NOT GUESSED AT. `h` already
 * holds the room its children need (`layout` took the tallest of every box in
 * the picture, containers included), so the only thing left here is to put the
 * words and the boxes in it: the whole block — the container's own name, the
 * gap under it, every child and every gap between them — is centred in the
 * height, exactly as a plain box's two lines of type are. A container that
 * top-aligned its contents would sit differently from every other box in the
 * row for a reason a reader cannot see.
 */
function box(n, x, y, w, h, m, kidH, childGap = CHILD_GAP, childInset = CHILD_PAD) {
  const lab = n._lab, sub = n._sub;
  const ks = n._kids || [];
  const own = lab.lines.length * m.labLh + (sub.lines.length ? SUB_GAP + m.subLh : 0);
  const stack = ks.length
    ? HEAD_GAP + ks.length * kidH + (ks.length - 1) * childGap : 0;
  const block = own + stack;
  // ⚠️ THE CHILDREN STILL HANG OFF `top`, whichever way the text is aligned, so
  // a container's contents move with its head rather than needing a second rule.
  const top = BOX_ALIGN === 'topleft' ? y + BOX_PAD_Y : y + (h - block) / 2;
  const out = {
    id: n.id, kind: n.kind || 'plain', x, y, w, h,
    hue: n.hue,
    cx: x + w / 2, cy: y + h / 2,
    // Where a line of text STARTS, and what it is anchored by. One pair, read
    // by the renderer, so the switch above is the only place that decides.
    tx: BOX_ALIGN === 'topleft' ? r1(x + BOX_PAD_X) : r1(x + w / 2),
    anchor: BOX_ALIGN === 'topleft' ? 'start' : 'middle',
    label: lab, sub,
    labY: lab.lines.map((_, i) => r1(top + i * m.labLh + m.labLh / 2 + m.labSize * 0.35)),
    subY: r1(top + lab.lines.length * m.labLh + SUB_GAP + m.subLh / 2 + m.subSize * 0.35),
    title: [lab.full, sub.full].filter(Boolean).join(', '),
  };
  if (n.note) out.note = String(n.note);
  // ⚠️ CARRIED THROUGH TO THE RENDER NODE EXPLICITLY. `box()` builds a fresh
  // object rather than spreading the spec, so a flag the author sets is invisible
  // to the painter unless it is copied here. `set` went missing exactly that way
  // and read as "the option does nothing".
  if (n.set) out.set = true;
  if (n.join === false) out.join = false;
  if (ks.length) {
    let ky = top + own + HEAD_GAP;
    out.kids = ks.map((c) => {
      const p = box(c, x + childInset, ky, w - childInset * 2, kidH, m, 0);
      ky += kidH + childGap;
      return p;
    });
  }
  return out;
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
/**
 * 🔴 ONE HEADING, ONE WORDING, ONE PLACE. Every page that explains itself ends
 * with the same picture under the same three words, and the moment that is
 * typed per page it becomes "How this works" on one, "How it works" on the
 * next and "how this works" on a third. That is not a hypothetical: it was
 * MEASURED across the tree on 2026-09-16 and there were THREE treatments in
 * six pages. `items`, `radio`, `replay` and `station` passed `how: true` and
 * got this constant; `crate` typed `title: 'how it works'` and got its own
 * lowercase heading; `grains` had no heading at all. It is a constant because
 * it is a promise the site makes, not a label a page chooses.
 *
 * 🔴 AND THE WORDING IS `it`, NOT `this`, DECIDED 2026-09-16 ON A DIRECT ASK.
 * Three reasons, in the order they matter:
 *   · "How it works" is the settled English phrase. A reader recognises it
 *     without parsing, which is the whole job of a heading read once.
 *   · `it` ALREADY HAS THE RIGHT REFERENT ON THESE PAGES. Every `what`
 *     paragraph uses it for the demo: *"It keeps taking a few seconds of
 *     whatever is on air"*. `this` introduces a second pointer at the same
 *     thing, in a heading, three inches below the first one.
 *   · `this` is doing a job POSITION already does. The diagram is last on the
 *     page it belongs to, so nothing else could be meant, and a word that
 *     disambiguates something never ambiguous is a word to cut.
 */
export const HOW = 'How it works';

/**
 * @param {object} [o]
 * @param {boolean} [o.how]  put the standing heading above it. A page passes
 *                           `how: true` and says nothing about the words.
 */
export function createDiagram(host, spec, { onRender, how = false, atEnd = false } = {}) {
  const uid = `dg${++seq}`;
  /**
   * 🔴 A PAGE MAY NOT TYPE ITS OWN TITLE UNDER THE STANDING HEADING, AND IT
   * COULD, AND THE RESULT WAS TWO HEADINGS. PHOTOGRAPHED on `/station/`:
   *
   *     HOW THIS WORKS
   *     HOW IT WORKS
   *     [the picture]
   *
   * The page had carried `title: 'how it works'` since before `how` existed,
   * and adding `how: true` put the standing one above it rather than instead of
   * it. Neither half is wrong on its own, which is why nothing caught it.
   *
   * Refused rather than silently dropped, and reported on `cuts` like every
   * other thing this component will not draw: an author who cannot see their
   * own title has no way to know where it went, and the page's own
   * `nothing cut, nothing refused` assert is what tells them.
   */
  if (how && spec && spec.title) {
    (spec.cutsSink || (spec.cutsSink = [])).push({
      id: 'title', where: 'heading', full: String(spec.title),
      shown: 'NOT DRAWN: `how: true` already writes the standing heading. '
           + 'Remove the title, or drop `how`', width: 0 });
    spec = { ...spec, title: '' };
  }
  // 🔴 `atEnd` PUTS IT AFTER THE LOG, WHICH IS THE ACTUAL BOTTOM OF THE PAGE.
  // `mount()` appends the log to `document.body`, not to `.pos-body`, so a
  // diagram appended to the page's own element lands ABOVE it however late it
  // is built — which is the whole page except the last box. A page that wants
  // its explanation last has to say so, because "last" is not where the host
  // element ends.
  // ⚠️ Outside `.pos-body` the shell's `* + *` rhythm does not reach it, so the
  // gap above comes from a class rather than from the page's own spacing.
  const place = atEnd ? document.body : host;
  if (atEnd) place.classList.add('has-dg-end');
  if (how) {
    const h = document.createElement('h2');
    h.className = atEnd ? 'pos-how pos-dg-end' : 'pos-how';
    h.textContent = HOW;
    place.append(h);
  }
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
  // ⚠️ `aria-label`, NEVER `<title>`. A `<title>` on the svg root is a NATIVE
  // TOOLTIP over the whole picture, so the drawer that says it has no tooltips
  // had one covering everything. `role="img"` plus a label is the same
  // accessible name with nothing drawn.
  svg.setAttribute('aria-label', spec.title || 'a diagram');

  // The ruler. Parked off to one side rather than hidden, because a
  // `display: none` ancestor is precisely what makes getComputedTextLength
  // answer 0 — see the header. The svg clips to its own box, so nothing shows.
  const probe = s('text', { x: -9999, y: -9999, 'aria-hidden': 'true' });
  svg.append(probe);

  const field = s('g');
  svg.append(field);

  const cap = document.createElement('figcaption');
  cap.className = 'pos-dg-cap';
  // ⚠️ ONE FUNCTION WRITES THIS LINE, and the height reservation calls the
  // SAME one. Bold is wider than the face beside it, so a sentence measured as
  // plain text and drawn with a bold run in it can take one more line than was
  // reserved — which is the jump this whole mechanism exists to prevent,
  // reintroduced by the measurement instead of by the drawing.
  // Every box's name, lower-cased, to the hue it was drawn in. Rebuilt on each
  // layout because a re-layout can change what is in the picture.
  let hueOfName = new Map();
  const say = (text) => {
    cap.textContent = '';
    for (const part of boldParts(text)) {
      if (!part.text) continue;
      if (!part.bold) { cap.append(part.text); continue; }
      const b = document.createElement('strong');
      b.textContent = part.text;
      // 🔴 THE REFERENCE IS A COLOUR. A bold run whose text is a box's name is
      // drawn in that box's own hue, so a note can point at a box without
      // saying "the one above" or naming a file. Anything else stays plain
      // bold, which is what bold already meant.
      const hue = hueOfName.get(part.text.trim().toLowerCase());
      if (hue != null) b.style.color = tint(hue, TEXT_TINT, 'var(--fg)');
      cap.append(b);
    }
  };
  say(spec.caption || '');

  wrap.append(head, svg, cap);
  place.append(wrap);

  // `ties` is how many headless bracket lines the last layout drew. See the
  // count in `render`: it is the only thing that can answer "is there a line in
  // my picture with no arrowhead on it".
  const api = { el: wrap, svg, cuts: [], ties: 0, mode: 'row', measured: false,
                render, destroy };

  /** the line under the picture, back to what it says when nothing is hovered */
  const resetCaption = () => {
    delete cap.dataset.on;
    say(spec.caption || '');
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

  /**
   * one box, drawn — a plain one, a container, or a box inside a container.
   *
   * 🔴 A CONTAINER AND THE BOXES IN IT ARE SIBLINGS IN THE MARKUP, never
   * nested `<g>`s, and that is a CSS decision rather than a drawing one:
   * `.pos-dg-n[data-kind="here"] .pos-dg-box` is a DESCENDANT selector, so a
   * box drawn inside a `here` group would take the container's styling as well
   * as its own, and hovering the machine would restyle everything in it. Two
   * flat groups cannot do that. The nesting a reader sees is geometry, which
   * is where this file keeps everything else.
   */
  const nodeGroup = (n) => {
    const g = s('g', { class: 'pos-dg-n', 'data-kind': n.kind, tabindex: '0' });
    // 🔴 `aria-label`, NOT `<title>`. A `<title>` here is the browser's own
    // tooltip, which drew this box's name ON TOP of the box while the line
    // under the picture was already saying it — the same words in three
    // places. The label is the only thing a screen reader now has, so it
    // carries the whole of the box: its name and its sub UNCUT, which keeps
    // the promise that shortening hides text and never loses it, and the
    // sentence, which is what a sighted reader gets from the caption.
    //
    // ⚠️ WITH THE ASTERISKS TAKEN OUT. A reader of the page sees a heavier
    // face; a reader of this attribute would have heard "star star" twice a
    // sentence, which is the mark leaking out of the one place that renders
    // it. MEASURED on /grains/ before this line existed.
    const spoken = (t) => boldParts(t).map((q) => q.text).join('');
    g.setAttribute('aria-label',
      [n.title, n.note && spoken(n.note)].filter(Boolean).join('. '));
    const rect = s('rect', {
      class: n.kids ? 'pos-dg-box pos-dg-cbox' : 'pos-dg-box',
      x: n.x + 0.5, y: n.y + 0.5, width: n.w - 1, height: n.h - 1, rx: 5, ry: 5,
    });
    // ⚠️ SET AS CUSTOM PROPERTIES, NOT AS `fill`. The stylesheet still owns
    // which state wins — a hovered box, a container, a dashed cloud — and it
    // reads these two. An inline `fill` would beat every one of those rules and
    // the kinds would quietly stop meaning anything.
    if (n.hue != null) {
      rect.style.setProperty('--dg-fill', tint(n.hue, BOX_TINT, 'var(--card2)'));
      rect.style.setProperty('--dg-stroke', tint(n.hue, EDGE_TINT, 'var(--line2)'));
    }
    g.append(rect);
    if (n.label.lines.length) {
      const t = s('text', { class: 'pos-dg-lab', x: n.tx, y: n.labY[0],
                            'text-anchor': n.anchor });
      n.label.lines.forEach((line, i) => {
        t.append(s('tspan', { x: n.tx, y: n.labY[i] }, line));
      });
      g.append(t);
    }
    if (n.sub.lines.length) {
      g.append(s('text', { class: 'pos-dg-sub', x: n.tx, y: n.subY,
                           'text-anchor': n.anchor }, n.sub.lines[0]));
    }
    // Hovering writes what this box DOES into the line under the picture.
    // Not a tooltip: a tooltip is drawn on top of the thing it describes and
    // is read again every time you point at one, so it has to stay two short
    // lines. A line under the picture is read in place, has room for a whole
    // sentence, and costs no positioning code at all.
    //
    // ⚠️ AND IT SAYS SOMETHING THE BOX DOES NOT. It used to write the box's
    // own name and sub — `Raspberry Pi — another granulator`, under a box
    // reading `Raspberry Pi` / `another granulator` — so pointing at a box
    // repeated it. `note` is a sentence about what that box is for here; with
    // none written the name is still better than an empty line.
    const show = () => {
      g.dataset.on = '1';
      cap.dataset.on = '1';
      say(n.note || n.title || n.label.full);
    };
    const hide = () => {
      delete g.dataset.on;
      resetCaption();
    };
    g.addEventListener('pointerenter', show);
    g.addEventListener('pointerleave', hide);
    g.addEventListener('focus', show);
    g.addEventListener('blur', hide);
    return g;
  };

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

    // ⚠️ REBUILT ON EVERY LAYOUT, not once at construction. A re-layout can put
    // different boxes in the picture, and a stale name-to-hue map would colour
    // a word after the box it named had gone.
    hueOfName = new Map();
    for (const n of L.nodes) {
      const add = (x) => {
        // 🔴 ONLY A BOX THAT PAINTS ITS HUE MAY LEND IT TO A WORD. `here` is the
        // browser you are reading this in, and the stylesheet gives it a lighter
        // fill and a plain grey edge on purpose: being filled is its whole
        // signal and it carries no colour. Its `tech` hue was still going into
        // this map, so the word `browser` came out BLUE under a picture where
        // the browser box is grey — a reader matching ink to ink finds nothing,
        // which is worse than no colour at all, because a colour that matches
        // nothing reads as a box they have missed.
        if (x.hue != null && x.label?.full && !HUELESS_KINDS.has(x.kind)) {
          hueOfName.set(x.label.full.trim().toLowerCase(), x.hue);
        }
        for (const k of (x.kids || [])) add(k);
      };
      add(n);
    }

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

    // 🔴 THREE PASSES, AND THE ORDER IS THE WHOLE OF IT. Containers first,
    // because an arrow that reaches a box INSIDE one has to cross that
    // container's edge and would otherwise be painted over by the machine it
    // is entering — the fork bug in a new costume, where a line ends somewhere
    // the reader cannot see it end. Then the links, so no box is drawn under
    // its own arrow. Then every box that holds nothing, which is the layer the
    // reader is meant to read. With no container in the picture the first pass
    // emits nothing and the order is what it always was.
    for (const n of L.nodes) if (n.kids) field.append(nodeGroup(n));

    for (const l of L.links) {
      // 🔴 AN ARROW IS A THING YOU CAN POINT AT NOW, AND IT NEEDED A HIT AREA TO
      // BE ONE. A `<path>` with no fill is only hittable ON ITS STROKE, and the
      // stroke is one pixel — so the arrow that carries the most interesting
      // sentence in the picture ("what actually travels here") was the one thing
      // a pointer could not reach. The fat transparent copy underneath is the
      // standard repair: same geometry, twelve pixels wide, invisible.
      const lg = s('g', { class: 'pos-dg-l', tabindex: '0', role: 'img' });
      lg.append(s('path', { class: 'pos-dg-hit', d: l.d }));
      lg.append(s('path', {
        class: l.back ? 'pos-dg-link pos-dg-back' : 'pos-dg-link',
        d: l.d, 'marker-end': `url(#${uid}-${l.back ? 'b' : 'f'})`,
      }));
      if (l.lab.lines.length) {
        const first = l.stack === 'up' ? l.ly - (l.lab.lines.length - 1) * m.linkLh : l.ly;
        const t = s('text', { class: 'pos-dg-llab', x: r1(l.lx), y: r1(first),
                              'text-anchor': l.anchor });
        l.lab.lines.forEach((line, i) => {
          t.append(s('tspan', { x: r1(l.lx), dy: i ? m.linkLh : 0 }, line));
        });
        // the whole name for a screen reader, with NO native tooltip — this is
        // the same trade the boxes make, and a cut is reported on `cuts` for the
        // author rather than hidden behind a hover for the reader
        if (l.lab.cut) t.setAttribute('aria-label', l.lab.full);
        lg.append(t);
      }
      // ⚠️ AND IT SAYS WHAT TRAVELS, not what the arrow is called. The label is
      // already on the picture; a hover that repeated it would be the third
      // channel carrying one fact, which is the mistake the boxes' own note
      // exists to avoid. With no `note` written, the label is still better than
      // an empty line.
      const said = l.note || l.lab.full || `${l.from} to ${l.to}`;
      lg.setAttribute('aria-label', said);
      const lshow = () => { lg.dataset.on = '1'; cap.dataset.on = '1'; say(said); };
      const lhide = () => { delete lg.dataset.on; resetCaption(); };
      lg.addEventListener('pointerenter', lshow);
      lg.addEventListener('pointerleave', lhide);
      lg.addEventListener('focus', lshow);
      lg.addEventListener('blur', lhide);
      field.append(lg);
    }

    // 🔴 HOW MANY BRACKETS THIS PICTURE DREW, AND IT IS COUNTED BECAUSE A PAGE
    // HAS NO OTHER WAY TO ASK. A tie is the one mark in here that carries no
    // head, so "is there a headless line in my diagram" is the exact question
    // behind the report that bought the rule below, and until this existed the
    // only answer was to look at it. `cuts` cannot see it: nothing was cut.
    let ties = 0;
    for (const n of L.nodes) {
      if (n.kids) {
        // 🔴 THE THINGS INSIDE ONE MACHINE ARE JOINED, AND THE JOIN HAS NO
        // ARROWHEAD. Three boxes stacked inside a container read as three
        // unrelated things that happen to be in the same room; a line between
        // them says they are one chain. ⚠️ AND NO HEAD, WHICH IS THE WHOLE
        // POINT: every arrow in this picture means "the signal goes this way",
        // and a head here would claim an ORDER between the parts of one machine
        // that the drawing does not know. It is a bracket, not a step.
        // Drawn BEFORE the children so a box's own fill covers its ends.
        // ⚠️ DOWN THE MIDDLE, NOT DOWN THE LEFT. It used to hang at a fixed
        // 12 px inset, which put it under the first letter of each label and
        // read as a margin rule rather than as a join between two boxes. A tie
        // leaves the bottom edge of one and meets the top edge of the next, and
        // it steps across with a rounded turn where their centres differ, which
        // is the same shape every other link in the picture makes.
        // 🔴 AND A TIE IS NOT DRAWN WHERE A DECLARED LINK ALREADY RUNS. The
        // author has said there is a direction between those two boxes, so the
        // bracket has nothing left to say and two lines down one gap is the
        // thing every routing rule in this file exists to prevent.
        // 🔴 BUT A GAP NOBODY DECLARED ACROSS STILL GETS ONE, AND THAT IS A
        // DECISION RATHER THAN AN OVERSIGHT. /station/ was reported as "where
        // is the arrowhead between programmes and schedule": its Cloudflare box
        // had an arrow, then a tie, then an arrow, and a headless line between
        // two headed ones reads as a head that fell off. Taking every tie out
        // of a container the moment one arrow is declared in it was tried and
        // is wrong. It puts the fix in the drawer for a fact only the author
        // knows, and it silently deletes the bracket from any machine whose
        // parts really are unordered. The repair belongs in the description:
        // order the boxes so that every pair the reader sees side by side is a
        // pair a direction has been stated for. `api.ties` is how a page checks
        // that it did, and /kit/ shows both halves of this gap on purpose.
        /**
         * 🔴 `join: false` DRAWS NOTHING BETWEEN THEM AT ALL, which is a third
         * answer and was asked for on sight: *"no connections between
         * keyboard/playout and and notesout/soundback"*.
         *
         * The three are now: an ARROW (the default, they feed each other), a
         * BRACKET (`set: true`, they are parts of one machine and the drawing
         * says so), and NOTHING (`join: false`). The last is right where the
         * container's own box already carries the whole relationship: `Browser`
         * holds a keyboard and a playout, and a line between them adds no fact,
         * it just gives the eye something to follow that leads nowhere.
         */
        if (n.join === false) { for (const k of n.kids) field.append(nodeGroup(k)); continue; }
        const stepped = new Set();
        for (const l of L.links) {
          if (l.sib) stepped.add(`${l.from}|${l.to}`).add(`${l.to}|${l.from}`);
        }
        for (let i = 0; i + 1 < n.kids.length; i++) {
          const a = n.kids[i], b = n.kids[i + 1];
          if (stepped.has(`${a.id}|${b.id}`)) continue;
          const ax = a.x + a.w / 2, bx = b.x + b.w / 2;
          const y0 = a.y + a.h, y1 = b.y;
          /**
           * 🔴 AN ARROWHEAD, AND THIS REVERSES WHAT THE BLOCK ABOVE ARGUES.
           * Instructed 2026-09-16 with a screenshot of `video`, `cue log` and
           * `timeline` joined by bare lines: *"need arrowheads between inner
           * boxes (make it a rule)"*.
           *
           * The old reasoning was that a head claims an ORDER between the parts
           * of one machine that the drawing does not know. True, and it is the
           * wrong thing to optimise: a reader meeting a headed line, then a
           * headless one, then a headed one down a single column does not read
           * "this pair is unordered", they read a head that fell off. That was
           * REPORTED on `/station/` and now again here.
           *
           * ⚠️ SO THE DEFAULT FLIPS AND THE ESCAPE HATCH IS EXPLICIT. A
           * container whose children really are a SET rather than a chain says
           * `set: true` and gets brackets, which is the one case the old rule
           * was right about and the only one it should ever have covered.
           */
          field.append(s('path', {
            class: n.set ? 'pos-dg-tie' : 'pos-dg-tie pos-dg-tie-arrow',
            ...(n.set ? {} : { 'marker-end': `url(#${uid}-f)` }),
            d: Math.abs(ax - bx) < 0.5
              ? `M${r1(ax)} ${r1(y0)} L${r1(ax)} ${r1(y1)}`
              : tieElbow(ax, y0, bx, y1),
          }));
          if (n.set) ties++;
        }
        for (const k of n.kids) field.append(nodeGroup(k));
      } else field.append(nodeGroup(n));
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
    // next un-hover grew the block by 78 px. `captionTexts` names the set,
    // which now includes every box's own SENTENCE and every box inside a
    // container — the two things this line can hold that the boxes did not
    // used to have.
    //
    // ⚠️ AND IT IS MEASURED THROUGH `say`, THE SAME WRITER THE HOVER USES.
    // Setting `textContent` here would measure `**bold**` as six characters of
    // literal asterisks in the ordinary face, while the hover draws a heavier
    // one that is wider — so the string that reserved three lines could be
    // drawn in four. A reservation taken with a different renderer is not a
    // reservation.
    cap.style.minHeight = '';
    const keep = [...cap.childNodes];       // put back exactly what was there
    let capH = 0;
    for (const text of captionTexts(spec, L.nodes)) {
      say(text);
      capH = Math.max(capH, cap.offsetHeight);
    }
    cap.textContent = '';
    cap.append(...keep);
    cap.style.minHeight = `${capH}px`;

    api.cuts = L.cuts;
    api.ties = ties;
    api.mode = L.mode;
    for (const l of L.inside || []) {
      // a container and a box inside ITSELF: there is no gap between the two
      // to run a line through. Two boxes that are both inside one container do
      // have one and are drawn there; this is the case that is left. It is on
      // `cuts` as well, which is the report anybody actually reads.
      console.warn(`[diagram] ${l.from} holds ${l.to}, so there is no gap `
        + 'between them for an arrow and none is drawn');
    }
    if (L.cycle) {
      // every link pointing forward in a loop means somebody forgot a
      // `back: true`. The picture is still drawn — a diagram that looks wrong
      // is a better bug report than a page that threw.
      console.warn('[diagram] the links run forward in a circle. Is one of them missing `back: true`?');
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
