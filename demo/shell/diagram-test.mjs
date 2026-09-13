// demo/shell/diagram-test.mjs — the diagram's arithmetic, with no browser.
//
//   node demo/shell/diagram-test.mjs
//
// Three things in `diagram.mjs` are invisible when they are wrong, which is
// why they are pure functions and why this file exists:
//
//   - a column assignment that counted the return paths draws a round trip as
//     a straight line of five boxes. It looks fine. It is a lie about the
//     shape, which is the only thing the picture is for.
//   - a wrap that drops a word looks like a shorter label.
//   - two return paths at the same depth are ONE line on screen, and the
//     second one is simply not there.
//
// ⚠️ THE RULER HERE IS MADE UP AND THAT IS THE POINT. `getComputedTextLength`
// needs a live document; a fixed width per character needs nothing and makes
// every expected number below exact rather than approximate. What it cannot
// check is the real font — that is /kit/'s job, with real type in a real svg.
//
//   - a branch drawn straight through the box in its way looks like a path
//     that does not exist, and it is the SECOND branch that breaks, so the
//     first one still looks right.
//   - a container whose height is a GUESS rather than a measurement looks
//     right with one box in it and wrong with three, which nobody tries.
//   - a bold run that toggles on every marker turns one typo into a sentence
//     that is bold from the mistake to the full stop, and reads as a decision.
//
// Nine of these are NEGATIVE CONTROLS: a check that cannot fail is a check that
// is decoration, so each of the claims above is also run against an input
// that must break it.

import { assignColumns, backLevels, wrapLines, layout, captionTexts, boldParts, METRICS }
  from './diagram.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};

// 10 px a character. Chosen so every width in this file is countable by eye.
const CH = 10;
const ruler = (s) => s.length * CH;
const measure = { lab: ruler, sub: ruler, link: ruler };

// the plan's own example: a key press out, the sound it made back
const TRIP = {
  nodes: [
    { id: 'you', label: 'your browser', sub: 'a key press', kind: 'here' },
    { id: 'relay', label: 'Cloudflare', sub: 'passes messages on', kind: 'cloud' },
    { id: 'box', label: 'Raspberry Pi', sub: 'makes the sound', kind: 'device' },
  ],
  links: [
    { from: 'you', to: 'relay', label: 'note number' },
    { from: 'relay', to: 'box', label: '' },
    { from: 'box', to: 'relay', label: 'the sound', back: true },
    { from: 'relay', to: 'you', label: '', back: true },
  ],
};

// A BRANCH THAT REACHES PAST THE BOX IN ITS WAY, which is the shape every fork
// takes: the second branch always skips whatever the first one landed on. Here
// the settings go to Cloudflare AND straight on to the board, so `you -> pi`
// has `cf` standing between its two ends — in the row layout by a column, in
// the one-column layout by a row. One spec, both modes, one defect.
const REACH = {
  nodes: [
    { id: 'you', label: 'this page', kind: 'here' },
    { id: 'cf', label: 'Cloudflare', kind: 'cloud' },
    { id: 'pi', label: 'Raspberry Pi', kind: 'device' },
  ],
  links: [
    { from: 'you', to: 'cf', label: 'settings' },
    { from: 'cf', to: 'pi', label: '' },
    { from: 'you', to: 'pi', label: 'the same' },
  ],
};

// The fork that `grains` measured out: two copies of one thing, one here and
// one on a board, fed the same settings. In a row the two copies share a
// column and nothing is skipped; stacked in one column, `you -> cf` has the
// copy in this page between its ends.
const FORK = {
  nodes: [
    { id: 'you', label: 'this page', sub: 'one copy here', kind: 'here' },
    { id: 'near', label: 'a copy here', sub: 'the same settings' },
    { id: 'cf', label: 'Cloudflare', sub: 'passes it on', kind: 'cloud' },
    { id: 'pi', label: 'Raspberry Pi', sub: 'a copy there', kind: 'device' },
  ],
  links: [
    { from: 'you', to: 'near', label: 'settings' },
    { from: 'you', to: 'cf', label: 'and out' },
    { from: 'cf', to: 'pi', label: '' },
    { from: 'pi', to: 'cf', label: 'the sound', back: true },
    { from: 'cf', to: 'you', label: '', back: true },
  ],
};

// A MACHINE WITH TWO PROGRAMS ON IT, which is the case a `sub` under a name
// draws as one thing. The note reaches ONE of the two programs and the OTHER
// one answers, so a link that names a box inside a container has to be a real
// link rather than a link to the container with a caption.
const NEST = {
  nodes: [
    { id: 'you', label: 'your browser', sub: 'a key press', kind: 'here',
      note: 'The browser you are reading this in.' },
    { id: 'pi', label: 'Raspberry Pi', kind: 'device', children: [
      { id: 'synth', label: 'a synthesiser', sub: 'plays the note' },
      { id: 'rec', label: 'a recorder', sub: 'keeps a minute' },
    ] },
  ],
  links: [
    { from: 'you', to: 'synth', label: 'note number' },
    { from: 'rec', to: 'you', label: 'the last minute', back: true },
  ],
};

/** a box by id, whether it is a box in the picture or a box inside one */
const boxOf = (L, id) => L.nodes.find((n) => n.id === id)
  || L.nodes.flatMap((n) => n.kids || []).find((k) => k.id === id);
const inside = (k, c) => k.x > c.x && k.x + k.w < c.x + c.w
                      && k.y > c.y && k.y + k.h < c.y + c.h;

// every (x, y) in a path string. Every command the drawer emits — M, L, Q —
// takes coordinate PAIRS and nothing else, so the numbers alternate all the
// way through and a regular expression is enough.
const pathPoints = (d) => {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const out = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
  return out;
};
const PAD_GUESS = 2 + 4;    // where the outermost return lane starts
const EDGE_OUT = 2;         // diagram.mjs's own offset into a box's edge
const findLink = (L, from, to) => L.links.find((l) => l.from === from && l.to === to);

console.log('\n== columns: the longest forward path, and nothing else ==');

{
  const { col, cycle } = assignColumns(TRIP.nodes, TRIP.links);
  ok('a round trip is three columns, not five',
     col.get('you') === 0 && col.get('relay') === 1 && col.get('box') === 2 && !cycle,
     `you ${col.get('you')} · relay ${col.get('relay')} · box ${col.get('box')}`);
}

{
  // 🔴 NEGATIVE CONTROL. The same four links with `back` dropped is a forward
  // circle. If the check above were passing because the graph is simply short,
  // this would also read 0/1/2; it must not.
  const flat = TRIP.links.map((l) => ({ from: l.from, to: l.to }));
  const { col, cycle } = assignColumns(TRIP.nodes, flat);
  ok('dropping `back: true` is DETECTED, not drawn as if it were fine',
     cycle === true,
     `cycle ${cycle}, columns you ${col.get('you')} · relay ${col.get('relay')} · box ${col.get('box')}`);
  ok('and the picture is still three boxes wide, not seventeen',
     col.get('you') === 0 && col.get('relay') === 1 && col.get('box') === 2,
     'a link pointing at an earlier box is treated as the return path it meant to be');
}

{
  // the longest path wins, not the first one found: a short cut straight from
  // the first box to the last must not pull the last box back to column 1
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const links = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' },
                 { from: 'c', to: 'd' }, { from: 'a', to: 'd' }];
  const { col } = assignColumns(nodes, links);
  ok('a short cut does not shorten the picture', col.get('d') === 3,
     `d is in column ${col.get('d')}, and the long way round is 3 steps`);
}

console.log('\n== return paths: never two on one line ==');

{
  // the trip above: box -> relay leaves box on its left, relay -> you leaves
  // relay on ITS left, so the two runs pass no ground to each other
  const levels = backLevels([[300, 180], [140, 40]]);
  ok('two returns that share no ground share a depth',
     levels[0] === 0 && levels[1] === 0, `levels ${levels.join(', ')}`);
}

{
  // one return nested inside another: the long one has to go deeper
  const levels = backLevels([[400, 40], [300, 180]]);
  ok('a return that spans another one is drawn under it',
     levels[1] === 0 && levels[0] === 1, `levels ${levels.join(', ')}`);
}

{
  // 🔴 NEGATIVE CONTROL, and the reason this is not a distance table. Two
  // returns of EXACTLY the same length that overlap would both be "depth 1"
  // under a rule that reads the distance — one line on screen, the second
  // silently absent. They must come out different.
  const levels = backLevels([[0, 200], [100, 300]]);
  ok('two returns of equal length that cross are still told apart',
     levels[0] !== levels[1], `levels ${levels.join(', ')}`);
}

console.log('\n== wrapping: break on words, cut on the last line ==');

{
  const r = wrapLines('your browser', 200, 2, ruler);
  ok('what fits stays on one line', r.lines.length === 1 && !r.cut, r.lines.join(' / '));
}

{
  const text = 'passes messages between the two ends';
  const r = wrapLines(text, 120, 4, ruler);
  ok('it breaks between words, never inside one, and loses none of them',
     !r.cut && r.lines.join(' ') === text, r.lines.join(' / '));
  ok('every line fits the box it was given',
     r.lines.every((l) => ruler(l) <= 120), r.lines.map((l) => ruler(l)).join(', ') + ' px of 120');
}

{
  // a single word wider than the box: broken mid-word rather than left to run
  // out past the border
  const r = wrapLines('supercalifragilistic', 80, 2, ruler);
  ok('one word too wide for the box is broken inside the word',
     r.lines[0].length === 8 && r.lines.length === 2,
     r.lines.join(' / ') + (r.cut ? ' (cut)' : ''));
}

{
  const full = 'a Raspberry Pi in the studio running two programs at once and a fan';
  const r = wrapLines(full, 120, 2, ruler);
  ok('too much text is cut to the last line, with an ellipsis',
     r.cut && r.lines.length === 2 && r.lines[1].endsWith('…'), r.lines.join(' / '));
  ok('the cut line still fits, ellipsis included',
     ruler(r.lines[1]) <= 120, `${ruler(r.lines[1])} px of 120`);
  ok('the whole string survives the cut, for <title>', r.full === full, `${r.full.length} characters`);
}

{
  // 🔴 NEGATIVE CONTROL: `cut` is not decoration. The same string in a box
  // wide enough must come back whole and unmarked.
  const full = 'a Raspberry Pi in the studio running two programs at once and a fan';
  const r = wrapLines(full, 400, 2, ruler);
  ok('the same string in a wide enough box is not reported as cut',
     !r.cut && r.lines.join(' ') === full, `${r.lines.length} lines`);
}

console.log('\n== the two layouts, and where one becomes the other ==');

{
  const L = layout(TRIP, { width: 660, measure });
  const x = Object.fromEntries(L.nodes.map((n) => [n.id, n.x]));
  ok('a wide page draws it left to right', L.mode === 'row',
     `boxes ${L.boxW} px wide, ${L.width} x ${L.height}`);
  ok('the columns come out in the order the signal takes them',
     x.you < x.relay && x.relay < x.box, `x ${x.you} · ${x.relay} · ${x.box}`);
  const backs = L.links.filter((l) => l.back);
  ok('both return paths run under the boxes',
     backs.length === 2 && backs.every((l) => L.height > L.nodes[0].y + L.boxH),
     `picture is ${L.height} px tall, boxes end at ${L.nodes[0].y + L.boxH}`);
}

{
  const L = layout(TRIP, { width: 320, measure });
  const y = Object.fromEntries(L.nodes.map((n) => [n.id, n.y]));
  const xs = new Set(L.nodes.map((n) => n.x));
  ok('a phone gets one column, top to bottom', L.mode === 'column' && xs.size === 1,
     `${xs.size} column, boxes ${L.boxW} px wide`);
  ok('and it is still in the order the signal takes',
     y.you < y.relay && y.relay < y.box, `y ${y.you} · ${y.relay} · ${y.box}`);
  ok('the return paths route to the LEFT of the boxes, and have room',
     [...xs][0] > 0, `the column starts ${[...xs][0]} px in`);
  // 🔴 THE GUTTER HOLDS TWO THINGS SIDE BY SIDE, NOT ONE ON TOP OF THE OTHER.
  // This failed on screen first: `the sound` was drawn with a return path
  // running straight through it, because the gutter had been sized to
  // whichever of the lane and the name was wider. A name with a line through
  // it reads as a name in the wrong place, which is exactly what it was.
  const named = L.links.filter((l) => l.back && l.lab.lines.length);
  ok('a return path never runs through its own name',
     named.length > 0 && named.every((l) => l.lx - ruler(l.lab.lines[0]) >= l.bx + 6),
     named.map((l) => `"${l.lab.lines[0]}" starts at ${Math.round(l.lx - ruler(l.lab.lines[0]))} px, its lane is at ${l.bx}`).join(' · '));
}

{
  // ⚠️ THE SWITCH IS A CLIFF AND IT IS SUPPOSED TO BE. 560 px is the line;
  // one pixel either side must give two different layouts, or the rule is
  // being decided by something else.
  const a = layout(TRIP, { width: 559, measure });
  const b = layout(TRIP, { width: 560, measure });
  ok('559 px is one column and 560 px is a row',
     a.mode === 'column' && b.mode === 'row', `${a.mode} / ${b.mode}`);
}

{
  // a label nobody could fit, reported rather than silently shortened
  const spec = {
    nodes: [
      { id: 'a', label: 'a browser somewhere on a train in the middle of nowhere',
        sub: 'holding a key down for longer than anyone needs to' },
      { id: 'b', label: 'here' },
    ],
    links: [{ from: 'a', to: 'b', label: '' }],
  };
  const L = layout(spec, { width: 660, measure });
  ok('a label too long for its box is REPORTED, not just shortened',
     L.cuts.length >= 1 && L.cuts.some((c) => c.id === 'a' && c.where === 'label'),
     L.cuts.map((c) => `${c.id}.${c.where} at ${c.width} px`).join(' · '));
  ok('and what it was cut to is carried with the whole original',
     L.cuts.every((c) => c.full.length > c.shown.length && c.shown.endsWith('…')),
     L.cuts.map((c) => c.shown).join(' | '));
}

console.log('\n== a branch: a link that reaches past the box in its way ==');

{
  // 🔴 THE ROW LAYOUT. A forward link was a straight line from one box's edge
  // to the other's and routed around NOTHING, so a branch spanning two columns
  // was drawn through the box in the middle of it — in and out again, with its
  // name at the midpoint, i.e. under that box.
  const L = layout(REACH, { width: 660, measure });
  const reach = findLink(L, 'you', 'pi');
  const step = findLink(L, 'you', 'cf');
  const top = Math.min(...L.nodes.map((n) => n.y));
  ok('a branch that reaches past a box is drawn OVER the row, never through it',
     L.mode === 'row' && reach.depth !== undefined && reach.depth < top,
     `its lane is at y ${reach.depth}, and the boxes start at ${top}`);

  // 🔴 NEGATIVE CONTROL. If everything were routed, the picture would be all
  // detours and the check above would pass on a drawer that had learnt
  // nothing. A step to the NEXT box along has nothing in the way and must
  // still be the straight line it always was.
  ok('NEGATIVE CONTROL: a step to the next box along is still a straight line',
     step.depth === undefined && /^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/.test(step.d),
     step.d);

  // the room for the lane is taken out of the picture rather than off it: the
  // boxes move down, the svg grows, and nothing is drawn where nothing shows
  const pts = L.links.flatMap((l) => pathPoints(l.d));
  ok('the room for it comes out of the picture, so no line is drawn off the edge',
     top > 2 && pts.every(([x, y]) => x >= 0 && y >= 0 && x <= L.width && y <= L.height),
     `boxes start ${top} px down · ${pts.length} points, y from ` +
     `${Math.min(...pts.map((q) => q[1]))} to ${Math.max(...pts.map((q) => q[1]))} of ${L.height}`);
}

{
  // 🔴 THE ONE-COLUMN LAYOUT, WHICH IS WHERE THIS WAS FOUND. Every box is
  // stacked, a forward link was a straight vertical at its source's CENTRE,
  // and a branch reaching past one row therefore ran behind that box and came
  // out underneath it with an arrowhead into the next one — a phone read a
  // path the page does not have.
  const L = layout(FORK, { width: 340, measure });
  const left = L.nodes[0].x, right = L.nodes[0].x + L.boxW;
  const branch = findLink(L, 'you', 'cf');
  const straight = findLink(L, 'you', 'near');
  const backs = L.links.filter((l) => l.back);
  ok('in one column a fork\'s second branch runs down the RIGHT, clear of every box',
     L.mode === 'column' && branch.bx !== undefined && branch.bx >= right,
     `its lane is at ${branch.bx} and the boxes end at ${right}`);

  // ⚠️ THE RETURN PATHS ALREADY OWN THE LEFT-HAND GUTTER. Two kinds of routed
  // line in one gutter is the overlap bug this file already has three checks
  // for, in a new costume — so onward goes right, back goes left, and the
  // boxes are between them.
  ok('and it never meets the return paths, which have the left-hand gutter',
     backs.length > 0 && backs.every((l) => l.bx <= left) && branch.bx > left,
     `returns at ${backs.map((l) => l.bx).join(', ')} · the branch at ${branch.bx} · boxes ${left}..${right}`);

  ok('a branch never runs through its own name either',
     branch.lab.lines.length > 0 && branch.lx >= right
       && branch.lx + ruler(branch.lab.lines[0]) <= branch.bx - 6,
     `"${branch.lab.lines[0]}" runs ${branch.lx}..${Math.round(branch.lx + ruler(branch.lab.lines[0]))}, its lane is at ${branch.bx}`);

  // 🔴 NEGATIVE CONTROL: the OTHER branch of the same fork goes to the box
  // directly under it, has nothing in the way, and must still be the straight
  // vertical at the source's centre. Routing both would be a picture where
  // nothing goes anywhere directly.
  ok('NEGATIVE CONTROL: the branch to the box under it is still a straight drop',
     straight.bx === undefined && /^M([\d.]+) [\d.]+ L\1 [\d.]+$/.test(straight.d),
     straight.d);
}

console.log('\n== the line under the picture, and the height reserved for it ==');

{
  // 🔴 THE RESERVATION USED TO START FROM WHATEVER THE ELEMENT WAS SHOWING.
  // That is the caption only while nothing is hovered — and a re-layout with
  // the pointer on a box destroys the box that would have put the caption
  // back, so the element is left holding a five-word sentence and the block is
  // reserved for THAT. MEASURED: `min-height: 19px` under a 97 px caption, so
  // the next un-hover grew the page by 78 px, which is the exact jump the
  // reservation exists to prevent.
  const spec = { caption: 'a caption long enough to take three lines on a phone, '
                        + 'which is the tallest this line will ever be' };
  const nodes = [{ id: 'a', title: 'this page — one copy here', label: { full: 'this page' } },
                 { id: 'b', title: '', label: { full: 'a copy here' } }];
  const t = captionTexts(spec, nodes);
  ok('the height reserved under the picture counts the CAPTION, not only the boxes',
     t.includes(spec.caption), `${t.length} strings, the first is ${t[0].length} characters`);
  ok('and every box\'s own sentence, so hovering one cannot make it grow either',
     t.includes(nodes[0].title) && t.includes(nodes[1].label.full),
     t.slice(1).map((x) => `"${x}"`).join(' · '));
}

console.log('\n== an arrow\'s name gets the room that is actually beside it ==');

// how much horizontal room a drawn name has where it is put: a lane name has
// the gutter between its lane and the box, a step name has the whole of its
// side of the picture
const roomFor = (L, l, lanes) => {
  if (l.back) return l.lx - (l.bx + 6);
  if (l.bx !== undefined) return (l.bx - 6) - l.lx;
  return l.anchor === 'end' ? l.lx - lanes : (L.width - 2) - l.lx;
};

{
  // 🔴 A STEP'S NAME USED TO BE MEASURED AGAINST HALF A BOX. Between two
  // stacked boxes is a gap that is empty right across the picture with one
  // short arrow in it — MEASURED at 258 px in /kit/, that budget handed
  // `settings` 41 px with 106 px of nothing beside it, and cut it.
  const L = layout(FORK, { width: 340, measure });
  const step = findLink(L, 'you', 'near');
  const lanes = PAD_GUESS + (L.links.filter((l) => l.back).length - 1) * 14 + 6;
  const room = roomFor(L, step, lanes);
  ok('a step\'s name is measured against the row it sits in, not against half a box',
     L.mode === 'column' && !step.lab.cut && room > L.boxW / 2,
     `"${step.lab.lines[0]}" has ${Math.round(room)} px beside it; half a box is ${L.boxW / 2}`);
  ok('and it goes on the WIDER side of its arrow', step.anchor === 'end',
     `anchored ${step.anchor} at ${step.lx}, the arrow is at ${L.nodes[0].cx}`);
}

{
  // 🔴 NEGATIVE CONTROL, and the one that matters most here: a budget that
  // grew until nothing was ever cut would be indistinguishable from a drawer
  // that had silently stopped reporting. A name nobody could fit must still be
  // cut, and must still be COUNTED.
  const spec = {
    nodes: [{ id: 'a', label: 'here' }, { id: 'b', label: 'there' }],
    links: [{ from: 'a', to: 'b', label: 'a name for this arrow that will never fit' }],
  };
  const L = layout(spec, { width: 300, measure });
  const link = L.cuts.filter((c) => c.where === 'link');
  ok('NEGATIVE CONTROL: a name nobody could fit is still cut, and still counted',
     link.length === 1 && link[0].shown.endsWith('…'),
     `${link.length} reported — "${link[0] ? link[0].shown : ''}" at ${link[0] ? link[0].width : '-'} px`);
}

{
  // 🔴 A GUTTER IS SIZED BY WHAT ITS NAMES NEED, NOT BY A SHARE OF THE
  // PICTURE. Under the old flat 30% the same two names would move the boxes to
  // a different place on a wider page, for no reason anybody could point at —
  // and, worse, the name was WRAPPED to that share and the widest result then
  // sized the gutter, so a cut made the gutter smaller, which made the cut.
  //
  // ⚠️ AND THE TWO WIDTHS ARE CHOSEN SO THE OLD RULE WOULD FAIL IT. A name of
  // 100 px is under 30% of 420 and over 30% of 300, so a share-of-the-picture
  // budget cuts it at one width and not the other and the gutter comes out
  // 60 px apart. Picked at 460 and 540 first, where 30% never bit either way
  // and the check passed on the broken code — a test that cannot fail.
  const spec = {
    nodes: [{ id: 'a', label: 'here' }, { id: 'b', label: 'there' }],
    links: [{ from: 'a', to: 'b', label: '' },
            { from: 'b', to: 'a', label: 'ten chars!', back: true }],
  };
  const a = layout(spec, { width: 300, measure });
  const b = layout(spec, { width: 420, measure });
  ok('the same names ask for the same gutter however wide the picture is',
     a.mode === 'column' && b.mode === 'column' && a.nodes[0].x === b.nodes[0].x
       && !a.cuts.length,
     `the column starts ${a.nodes[0].x} px in at 300 and ${b.nodes[0].x} px in at 420, ` +
     `for a name wanting ${ruler('ten chars!')} px`);
}

{
  // 🔴 WHEN IT WILL NOT ALL FIT, THE BOXES' OWN WORDS WIN. A picture that
  // shortens the names of the things it is about is broken where a reader can
  // see it; an arrow name that had to give way is reported instead.
  const spec = {
    nodes: [
      { id: 'a', label: 'here', sub: 'a fairly long line here' },
      { id: 'b', label: 'there', sub: 'short' },
    ],
    links: [{ from: 'a', to: 'b', label: '' },
            { from: 'b', to: 'a', label: 'a long return name', back: true }],
  };
  const L = layout(spec, { width: 300, measure });
  const subCut = L.cuts.filter((c) => c.where === 'sub' || c.where === 'label');
  const linkCut = L.cuts.filter((c) => c.where === 'link');
  ok('a box keeps the width its own words need, and the arrow name gives way',
     subCut.length === 0 && linkCut.length === 1,
     `box ${L.boxW} px for a line needing ${ruler('a fairly long line here') + 20}; ` +
     `"${linkCut.length ? linkCut[0].shown : ''}" cut at ${linkCut.length ? linkCut[0].width : '-'} px`);
}

{
  // 🔴 NEGATIVE CONTROL: the side is CHOSEN, not swapped. With nothing routed
  // in either gutter the boxes sit in the middle, the two sides are equal, and
  // the name stays where it has always been.
  const spec = {
    nodes: [{ id: 'a', label: 'here' }, { id: 'b', label: 'there' }],
    links: [{ from: 'a', to: 'b', label: 'onward' }],
  };
  const L = layout(spec, { width: 300, measure });
  const step = L.links[0];
  ok('NEGATIVE CONTROL: with neither gutter in use a step\'s name does not move',
     L.nodes[0].x === 2 && step.anchor === 'start' && step.lx > L.nodes[0].cx,
     `anchored ${step.anchor} at ${step.lx}, the arrow is at ${L.nodes[0].cx}`);
}

console.log('\n== and no name has its own arrow drawn through it ==');

{
  // 🔴 "SIX PIXELS ABOVE THE MIDDLE" ONLY CLEARS A HORIZONTAL ARROW. A fork's
  // arrows are DIAGONAL, and MEASURED in /kit/ the line climbed 5.4 px through
  // the middle of `settings`. The line here is rebuilt from the path string
  // rather than from the drawer's own numbers, so this cannot pass by agreeing
  // with the formula it is checking.
  //
  // ⚠️ AND IT IS MEASURED ACROSS THE NAME'S WHOLE WIDTH, NOT AT ITS MIDDLE.
  // Written against the midpoint first, where a straight line is at the
  // midpoint's own height whatever its slope — so a flat six pixels up scored
  // exactly six and the check passed on the broken code. The clearance a
  // reader sees is at the ENDS of the word, which is where the line reaches
  // it; positive means the name is above its line and negative below.
  const L = layout(FORK, { width: 660, measure });
  const clear = (l) => {
    const [[x1, y1], [x2, y2]] = pathPoints(l.d);
    const yAt = (x) => y1 + (y2 - y1) * ((x - x1) / (x2 - x1));
    const half = ruler(l.lab.lines[0] || '') / 2;
    const lo = Math.min(yAt(l.lx - half), yAt(l.lx + half));
    const hi = Math.max(yAt(l.lx - half), yAt(l.lx + half));
    if (l.ly <= lo) return lo - l.ly;         // clear above
    if (l.ly >= hi) return hi - l.ly;         // clear below
    return 0;                                 // the line runs through the word
  };
  const up = findLink(L, 'you', 'near'), down = findLink(L, 'you', 'cf');
  const gapUp = clear(up), gapDown = clear(down);
  ok('a diagonal arrow\'s name clears the line across the whole of the name',
     L.mode === 'row' && Math.abs(gapUp) >= 6 && Math.abs(gapDown) >= 6,
     `"${up.lab.lines[0]}" is ${Math.round(gapUp)} px off its line, ` +
     `"${down.lab.lines[0]}" is ${Math.round(gapDown)} px off its`);

  // 🔴 AND THE SECOND-ORDER ONE, which lifting alone produced: two branches
  // leaving one box open a WEDGE, and both names lifted above their own line
  // put the lower one inside the upper one's path. MEASURED at 4.2 px in.
  ok('and a fork\'s two names sit on opposite sides, so the wedge stays empty',
     Math.sign(gapUp) !== Math.sign(gapDown) && gapUp !== 0 && gapDown !== 0,
     `the rising one is ${gapUp > 0 ? 'above' : 'below'} its line, the falling one is ${gapDown > 0 ? 'above' : 'below'} its`);
}

{
  // 🔴 A BOX'S TWO ATTACHMENT POINTS ARE 12 PX APART AND A LINE OF THIS TYPE
  // IS 11 PX TALL, so a name placed BETWEEN them cannot clear both — MEASURED
  // in /kit/, the run leaving a box cut 2 px through the ascenders of the name
  // belonging to the run arriving at it. It goes below both instead, which is
  // where the row layout has always put a return's name.
  const L = layout(TRIP, { width: 320, measure });
  const back = L.links.find((l) => l.back && l.lab.lines.length);
  const t = L.nodes.find((n) => n.id === back.to);
  ok('in one column a return\'s name clears BOTH runs at the box it names',
     L.mode === 'column' && back.ly - t.cy >= 6 + METRICS.linkLh / 2,
     `"${back.lab.lines[0]}" sits ${Math.round(back.ly - t.cy)} px below the middle of its box; ` +
     `the two runs are at -6 and +6`);
}

{
  // metrics are read from the page, not typed twice: a bigger font must make
  // taller boxes without anything else being touched
  const small = layout(TRIP, { width: 660, measure });
  const big = layout(TRIP, { width: 660, measure,
    metrics: { ...METRICS, labSize: 18, labLh: 23, subSize: 15, subLh: 19 } });
  ok('bigger type makes taller boxes', big.boxH > small.boxH,
     `${small.boxH} px against ${big.boxH} px`);
}

console.log('\n== a box inside a box ==');

{
  // 🔴 A CONTAINER IS MEASURED FROM WHAT IS IN IT. Nothing here re-derives the
  // drawer's own formula — that is the mistake `timeline/csound.mjs` made for
  // months, where the check and the code shared a misreading. These are the
  // things a READER sees: each box is inside its container on all four sides,
  // the two do not overlap each other, and the container's own name is above
  // the first of them.
  const L = layout(NEST, { width: 660, measure });
  const pi = boxOf(L, 'pi'), synth = boxOf(L, 'synth'), rec = boxOf(L, 'rec');
  ok('a box inside a container is drawn inside it, on all four sides',
     L.mode === 'row' && inside(synth, pi) && inside(rec, pi),
     `container ${pi.x}..${pi.x + pi.w} x ${pi.y}..${pi.y + pi.h}; ` +
     `synth ${synth.x}..${synth.x + synth.w} x ${synth.y}..${synth.y + synth.h}`);
  ok('and two of them do not sit on top of each other',
     synth.y + synth.h <= rec.y && synth.h === rec.h,
     `synth ends at ${synth.y + synth.h}, the recorder starts at ${rec.y}`);
  ok('the container\'s own name is above the boxes it holds',
     pi.labY[0] < synth.y, `its name sits at ${pi.labY[0]}, the first box at ${synth.y}`);
}

{
  // 🔴 NEGATIVE CONTROL, and it is the one that matters: a container whose
  // height was a GUESS — a constant, or the plain box height plus a number —
  // would come out the same whatever was put in it. A third box in it must
  // make it taller, and the picture with it must be taller still.
  const two = layout(NEST, { width: 660, measure });
  const three = layout({ ...NEST, nodes: [NEST.nodes[0],
    { ...NEST.nodes[1], children: [...NEST.nodes[1].children,
      { id: 'log', label: 'a log', sub: 'says what it did' }] }] },
    { width: 660, measure });
  ok('NEGATIVE CONTROL: a third box inside makes the container taller',
     three.boxH > two.boxH && three.height > two.height,
     `${two.boxH} px becomes ${three.boxH} px, and the picture ${two.height} -> ${three.height}`);
  // and the plain box beside it keeps up, because a row of unequal boxes ranks
  // them — which is the rule that was already here for two lines of type
  const you = boxOf(three, 'you'), pi = boxOf(three, 'pi');
  ok('and every box in the row is still one height', you.h === pi.h,
     `${you.h} px and ${pi.h} px`);
}

{
  // 🔴 EVERY LAYOUT THAT EXISTED BEFORE NESTING COMES OUT BYTE-IDENTICAL, and
  // this is the cheap in-suite half of that claim: the same description with
  // an EMPTY `children` on every box must be the same picture to the last
  // decimal. If any of the new arithmetic ran unconditionally it would show
  // up here as a diff. (The other half is every spec in this file and in
  // /kit/ diffed against the version before the change, at 17 widths.)
  //
  // ⚠️ AND IT TAKES TWO ASSERTS, because the obvious one is an A/B where both
  // arms share the bug: layout(spec) against layout(spec + `children: []`)
  // comes out equal even when the nesting arithmetic runs unconditionally,
  // since it then runs on BOTH. MEASURED by sabotage — forcing the container
  // branch always on left this at 63/63 until the second line existed. So the
  // result is also checked for any TRACE of nesting: no empty list, no key.
  const L = layout(TRIP, { width: 660, measure });
  const plain = JSON.stringify(L);
  const withKey = JSON.stringify(layout(
    { ...TRIP, nodes: TRIP.nodes.map((n) => ({ ...n, children: [] })) },
    { width: 660, measure }));
  ok('a description with nothing inside any box is unchanged, to the last decimal',
     plain === withKey, `${plain.length} characters, identical`);
  ok('and it carries no trace of nesting — no empty list, no key',
     L.nodes.every((n) => !('kids' in n)) && !('inside' in L),
     `${L.nodes.length} boxes, keys ${Object.keys(L.nodes[0]).join(' ')}`);
}

{
  // 🔴 LEFT TO RIGHT, AN ARROW REACHES THE BOX IT NAMES. The ground between a
  // container's edge and a box inside it is empty sideways, so the arrowhead
  // lands on the synthesiser rather than on the board — which is the whole
  // reason a link may name a box inside a container at all.
  const L = layout(NEST, { width: 660, measure });
  const pi = boxOf(L, 'pi'), synth = boxOf(L, 'synth'), you = boxOf(L, 'you');
  const note = findLink(L, 'you', 'synth');
  const end = pathPoints(note.d).at(-1);
  ok('left to right the arrow reaches the box it names, not the machine',
     end[0] > pi.x && end[0] <= synth.x, `it ends at x ${end[0]}, ` +
     `the machine's edge is ${pi.x} and the box inside it starts at ${synth.x}`);
  // 🔴 AND ITS NAME IS MEASURED AGAINST THE GAP BETWEEN THE MACHINES, NOT
  // AGAINST THE LINE. The line is longer, because it carries on past the
  // container's edge to the box inside it — and the room beside that last
  // stretch is not empty, it is the container. A name budgeted on the run
  // would be written over the machine it is entering, which is the same defect
  // as a name under a box, one layer in. So the budget is the shorter number
  // and the name sits at the middle of the gap.
  const run = Math.abs(end[0] - pathPoints(note.d)[0][0]);
  const gap = (pi.x - EDGE_OUT - 1) - (you.x + you.w + EDGE_OUT) - 1;
  const cut = L.cuts.find((c) => c.id === 'you to synth');
  ok('and its name is in the gap between the machines, not inside one',
     note.lx > you.x + you.w && note.lx < pi.x,
     `"${note.lab.lines.join(' ')}" is at ${note.lx}, between ${you.x + you.w} and ${pi.x}`);
  ok('and it is budgeted on that gap, which is SHORTER than the arrow',
     cut && cut.width === gap && gap < run,
     `${cut ? cut.width : '-'} px of room for a name beside a ${Math.round(run)} px arrow`);
}

{
  // 🔴 STACKED, THE SAME ARROW STOPS AT THE MACHINE — and that is not an
  // inconsistency, it is the same rule: a container's name is at the TOP of
  // it, so a run coming down from above would cross the words `Raspberry Pi`
  // on its way in. MEASURED on screen before this: it did exactly that.
  const L = layout(NEST, { width: 320, measure });
  const pi = boxOf(L, 'pi'), synth = boxOf(L, 'synth');
  const note = findLink(L, 'you', 'synth');
  const end = pathPoints(note.d).at(-1);
  ok('in one column it stops at the machine, clear of the container\'s own name',
     L.mode === 'column' && end[1] <= pi.y && end[1] < pi.labY[0] && synth.y > pi.labY[0],
     `it ends at y ${end[1]}, the machine starts at ${pi.y} and its name sits at ${pi.labY[0]}`);
}

{
  // 🔴 TWO BOXES IN ONE CONTAINER HAVE NO ROUTE BETWEEN THEM, so the link is
  // dropped and REPORTED. Drawing it silently is the defect this is here to
  // prevent: a line between two boxes that share a container has nowhere to go
  // that is not through one of them.
  const L = layout({ ...NEST,
    links: [...NEST.links, { from: 'synth', to: 'rec', label: 'straight on' }] },
    { width: 660, measure });
  ok('a link between two boxes in one container is dropped AND reported',
     (L.inside || []).length === 1 && !findLink(L, 'synth', 'rec'),
     `${(L.inside || []).length} reported: ` +
     (L.inside || []).map((l) => `${l.from} to ${l.to}`).join(', '));
}

{
  // 🔴 A COLUMN IS A STATEMENT ABOUT THE MACHINES. A link naming a box inside
  // one must be counted against the machine, or the program gets a column of
  // its own and the picture says the signal visits a place it never leaves.
  const L = layout({
    nodes: [
      { id: 'you', label: 'here' },
      { id: 'pi', label: 'a board', children: [{ id: 'synth', label: 'a program' }] },
      { id: 'far', label: 'over there' },
    ],
    links: [{ from: 'you', to: 'synth', label: 'in' }, { from: 'pi', to: 'far', label: 'on' }],
  }, { width: 660, measure });
  const xs = L.nodes.map((n) => n.x);
  ok('a box inside a machine does not take a column of its own',
     L.nodes.length === 3 && xs[0] < xs[1] && xs[1] < xs[2] && new Set(xs).size === 3,
     `three boxes at x ${xs.join(', ')} — the program is inside the middle one`);
}

console.log('\n== the line under the picture says what a box DOES ==');

{
  // 🔴 A BOX'S SENTENCE IS WHAT THE LINE WILL HOLD, SO IT IS WHAT THE HEIGHT
  // IS RESERVED FOR. Reserving against the box's NAME while the pointer shows
  // its sentence is the same defect as reserving against the box while the
  // pointer shows the caption — one step further in, and it moves the page by
  // the difference.
  const L = layout(NEST, { width: 660, measure });
  const t = captionTexts({ caption: 'a caption' }, L.nodes);
  ok('the reserved list holds a box\'s SENTENCE, not its name',
     t.includes(NEST.nodes[0].note) && !t.includes(boxOf(L, 'you').title),
     `"${t[1]}" rather than "${boxOf(L, 'you').title}"`);
  ok('and every box inside a container is in it too',
     t.includes(boxOf(L, 'synth').title) && t.includes(boxOf(L, 'rec').title),
     `${t.length} strings for ${L.nodes.length} boxes and 2 inside one of them`);
  // 🔴 NEGATIVE CONTROL: a box with no sentence still has to be measured, or
  // the list quietly loses boxes and the reservation is short for exactly the
  // ones nobody wrote a sentence for.
  ok('NEGATIVE CONTROL: a box with no sentence still contributes its name',
     t.includes(boxOf(L, 'pi').title) && boxOf(L, 'pi').note === undefined,
     `"${boxOf(L, 'pi').title}"`);
}

console.log('\n== bold, and nothing else ==');

{
  const r = boldParts('the same four settings, **unchanged**, on to the board');
  ok('two asterisks make one bold run and the asterisks go',
     r.length === 3 && r[1].bold && r[1].text === 'unchanged'
       && !r[0].bold && !r[2].bold,
     r.map((p) => `${p.bold ? 'BOLD' : 'plain'} "${p.text}"`).join(' · '));
  ok('and the sentence survives it whole',
     r.map((p) => p.text).join('') === 'the same four settings, unchanged, on to the board',
     r.map((p) => p.text).join(''));
}

{
  // 🔴 NEGATIVE CONTROL: the tempting implementation toggles on every marker
  // it meets, which turns one typo into a sentence that is bold from the
  // mistake to the full stop — a rendering bug that reads as a decision. An
  // unpaired marker has to stay on the page as two asterisks.
  const r = boldParts('a sentence with one ** in it and no closing pair');
  ok('NEGATIVE CONTROL: an unpaired marker is text, and nothing goes bold',
     r.length === 1 && !r[0].bold
       && r[0].text === 'a sentence with one ** in it and no closing pair',
     r.map((p) => `${p.bold ? 'BOLD' : 'plain'} "${p.text}"`).join(' · '));
  const plain = boldParts('no marks at all');
  ok('a sentence with no marks is one plain run',
     plain.length === 1 && !plain[0].bold && plain[0].text === 'no marks at all',
     `${plain.length} run`);
}

console.log(`\n${pass} ok, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
