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
// Four of these are NEGATIVE CONTROLS: a check that cannot fail is a check
// that is decoration, so each of the three claims above is also run against an
// input that must break it.

import { assignColumns, backLevels, wrapLines, layout, METRICS } from './diagram.mjs';

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

{
  // metrics are read from the page, not typed twice: a bigger font must make
  // taller boxes without anything else being touched
  const small = layout(TRIP, { width: 660, measure });
  const big = layout(TRIP, { width: 660, measure,
    metrics: { ...METRICS, labSize: 18, labLh: 23, subSize: 15, subLh: 19 } });
  ok('bigger type makes taller boxes', big.boxH > small.boxH,
     `${small.boxH} px against ${big.boxH} px`);
}

console.log(`\n${pass} ok, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
