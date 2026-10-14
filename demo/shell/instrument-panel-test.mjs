// demo/shell/instrument-panel-test.mjs: the panel's order, with no browser. Geometry is graded on
// /kit/. The stubbed `document` is tiny and every claim here is asserted again on /kit/ in a real
// browser, so a drifting stub cannot be the only witness.
// why: lessons/kit-instrument-panel.md#test-header

/* ── the smallest document these two modules can be built against ─────────── */
function stubDocument() {
  const make = (tag) => {
    const node = {
      tag,
      nodeType: 1,
      dataset: {},
      children: [],
      parentNode: null,
      hidden: false,
      textContent: '',
      _cls: new Set(),
      get className() { return [...node._cls].join(' '); },
      set className(v) { node._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
      classList: {
        add: (...c) => c.forEach((x) => node._cls.add(x)),
        remove: (...c) => c.forEach((x) => node._cls.delete(x)),
        contains: (c) => node._cls.has(c),
      },
      setAttribute() {},
      append(...kids) {
        for (const k of kids) { if (k.parentNode) k.parentNode.removeChild(k); k.parentNode = node; node.children.push(k); }
      },
      removeChild(k) {
        const i = node.children.indexOf(k);
        if (i >= 0) node.children.splice(i, 1);
        k.parentNode = null;
      },
      insertBefore(k, ref) {
        if (k.parentNode) k.parentNode.removeChild(k);
        k.parentNode = node;
        const i = ref ? node.children.indexOf(ref) : -1;
        if (i < 0) node.children.push(k); else node.children.splice(i, 0, k);
        return k;
      },
      remove() { if (node.parentNode) node.parentNode.removeChild(node); },
      /* One class selector, descendants only, which is the one query these two
         modules make (`.pos-pick-l` under a patch control). Anything else is
         refused rather than answered wrongly. */
      querySelectorAll(sel) {
        const m = /^\.([\w-]+)$/.exec(sel);
        if (!m) throw new Error(`stub querySelectorAll: only a single .class selector, not ${JSON.stringify(sel)}`);
        const hits = [];
        const walk = (n) => { for (const k of n.children) { if (k._cls.has(m[1])) hits.push(k); walk(k); } };
        walk(node);
        return hits;
      },
    };
    return node;
  };
  return { createElement: make };
}
globalThis.document = stubDocument();

const { createGlueRows, ROW_ALIGN } = await import('./glue.mjs');
const { createInstrumentPanel, ROW_KINDS } = await import('./instrument-panel.mjs');

let pass = 0, fail = 0;
const ok = (what, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${what}${detail ? `  (${detail})` : ''}`); }
  else { fail++; console.log(`  FAIL ${what}  ${detail}`); }
};
const threw = (fn) => { try { fn(); return false; } catch { return true; } };

// 1. The alignments are a closed set, and anything else is refused rather than
//    quietly laid out the default way.
ok('there are four alignments and they can be asked for by name',
  ROW_ALIGN.join(',') === 'start,center,end,between', ROW_ALIGN.join(', '));
ok('a surface refuses an alignment it does not have',
  threw(() => createGlueRows({ align: 'middle' })));
ok('a row refuses one too, which is the half a caller reaches more often',
  threw(() => createGlueRows().row(null, { align: 'middle' })));

// 2. A container with nothing in it must not paint its edges. This project has
//    shipped that defect twice as a horizontal rule nobody wrote.
{
  const g = createGlueRows();
  const empty = g.el.hidden;
  const r = g.row(document.createElement('div'));
  const filled = g.el.hidden;
  g.remove(r);
  ok('an empty surface is hidden, a row shows it, and the last row leaving hides it again',
    empty === true && filled === false && g.el.hidden === true && g.count() === 0,
    `empty ${empty}, filled ${filled}, emptied ${g.el.hidden}`);
}

// 3. Nulls are skipped, the way createStack and createGlue already skip them,
//    so a caller never has to put an `if` around an append.
{
  const g = createGlueRows();
  const r = g.row([document.createElement('div'), null, undefined, document.createElement('div')]);
  ok('a row skips the parts that are not there, rather than making a caller branch',
    r.children.length === 2, `${r.children.length} of 4 appended`);
}

// 4. The sketch's order is the component's, not the caller's, however late a row is asked for.
// why: lessons/kit-instrument-panel.md#t4
{
  const panel = createInstrumentPanel({
    viz: document.createElement('canvas'),
    rows: [[document.createElement('button')]],
    keys: document.createElement('div'),
    plate: { name: 'NOLA', patch: 'RHODES MK I' },
  });
  const before = panel.shape().join(' ');
  panel.addRow([document.createElement('button')]);
  panel.addRow([document.createElement('button')]);
  const after = panel.shape().join(' ');
  ok('the panel builds in the order the sketch draws',
    before === 'viz controls keys plate', before);
  ok('a row asked for after the keyboard and the plate exist still lands above both',
    after === 'viz controls controls controls keys plate', after);
  ok('and the count of control rows is what was asked for, so nothing was dropped on the way',
    panel.controls().length === 3, `${panel.controls().length} control rows`);
}

// 5. A panel does not have to have every row, which is what makes the component
//    reusable rather than one instrument's proportions with a factory around it.
{
  const bare = createInstrumentPanel({ rows: [[document.createElement('button')]] });
  ok('a panel with only controls is only controls, with no empty picture row and no empty foot',
    bare.shape().join(' ') === 'controls' && bare.viz === null && bare.plate === null,
    bare.shape().join(' ') || '(nothing)');
}

// 6. The foot's right-hand end is the one that changes, and a box that was never
//    reserved is refused rather than grown while somebody is looking at it.
{
  const two = createInstrumentPanel({ plate: { name: 'NOLA', patch: 'RHODES MK I' } });
  two.patch('WURLITZER 200A');
  ok('the patch is the plate’s last line and rewriting it changes nothing else',
    two.plate.lines.length === 2
    && two.plate.lines[1].textContent === 'WURLITZER 200A'
    && two.plate.lines[0].textContent === 'NOLA',
    two.plate.lines.map((l) => l.textContent).join(' | '));

  const one = createInstrumentPanel({ plate: { name: 'NOLA' } });
  ok('a plate with no patch line refuses to grow one, because a box that arrives late moves the page',
    threw(() => one.patch('WURLITZER 200A')));

  const none = createInstrumentPanel({ rows: [[document.createElement('button')]] });
  ok('and a panel with no plate at all says so rather than failing somewhere else',
    threw(() => none.patch('ANYTHING')));
}

// 7. `shape()` reads what is RENDERED. This project has been caught believing a
//    property instead: `/pack/`'s assert read `head.hidden === true` and passed
//    every run while the heading was on screen.
{
  const panel = createInstrumentPanel({
    rows: [[document.createElement('button')]],
    keys: document.createElement('div'),
  });
  panel.glue.remove(panel.keys);
  ok('taking a row out of the surface takes it out of the shape, because the shape is read off the children',
    panel.shape().join(' ') === 'controls', panel.shape().join(' ') || '(nothing)');
}

// 8. The kinds are named, so a check can ask for one rather than matching a
//    class name it copied out of a stylesheet.
ok('the four row kinds are named in the order the sketch draws them',
  ROW_KINDS.join(',') === 'viz,controls,keys,plate', ROW_KINDS.join(', '));

// 9. No em dash or middot in anything either module names; the characters are built from code
// points so this file does not carry them itself.
// why: lessons/kit-instrument-panel.md#t9
{
  const EM = String.fromCharCode(0x2014), MID = String.fromCharCode(0xB7);
  const words = [...ROW_ALIGN, ...ROW_KINDS];
  ok('no em dash and no middot in anything these modules name',
    words.every((s) => !s.includes(EM) && !s.includes(MID)), `${words.length} words`);
}

// 10. The foot takes a control at each end; text written into a control is refused, and the text
// case is asserted again at the end.
// why: lessons/kit-instrument-panel.md#t10
{
  const sw = document.createElement('button'), pk = document.createElement('div');
  const p = createInstrumentPanel({ keys: document.createElement('div'), plate: { name: 'FAU', status: sw, patch: { el: pk } } });
  const row = p.plateRow;
  ok('a foot with controls is one justified row of two ends, and the shape still ends in a plate',
    p.shape().join(' ') === 'keys plate' && row.dataset.align === 'between' && row.children.length === 2,
    `${p.shape().join(' ')}, ${row.dataset.align}, ${row.children.length} ends`);
  const start = row.children[0];
  ok('the start end is the name and then the switch, and the end is the patch control',
    start.children.length === 2 && start.children[0] === p.plate.el && start.children[1] === sw
    && row.children[1] === pk && p.status === sw && p.patchEnd === pk
    && p.plate.lines.length === 1 && p.plate.lines[0].textContent === 'FAU',
    `${start.children.length} in the start end, plate reads ${p.plate.lines.map((l) => l.textContent).join('|')}`);
  ok('a patch end that is a control refuses text, because there is no reserved line to write into',
    threw(() => p.patch('ORGAN')));

  const sw2 = document.createElement('button');
  const t = createInstrumentPanel({ plate: { name: 'NOLA', patch: 'RHODES MK I', status: sw2 } });
  t.patch('WURLITZER 200A');
  ok('a switch beside a text patch keeps the text at the far end and still writable',
    t.plateRow.dataset.align === 'between' && t.plateRow.children.length === 2
    && t.plateRow.children[0].children[1] === sw2 && t.plateRow.children[1].children[0].textContent === 'WURLITZER 200A',
    `${t.plateRow.children.length} ends, patch reads ${t.plateRow.children[1].children[0].textContent}`);

  const lone = createInstrumentPanel({ plate: { name: 'NOLA', status: document.createElement('button') } });
  ok('a switch and no patch is a start row with one end, not a justified row with nothing to justify',
    lone.plateRow.dataset.align === 'start' && lone.plateRow.children.length === 1 && threw(() => lone.patch('X')),
    `${lone.plateRow.dataset.align}, ${lone.plateRow.children.length} child`);

  const txt = createInstrumentPanel({ plate: { name: 'NOLA', patch: 'RHODES MK I' } });
  ok('a text plate is exactly what it was: one plate spanning a centred row, the patch its second line',
    txt.plateRow.children.length === 1 && txt.plateRow.children[0] === txt.plate.el && txt.plateRow.dataset.align === 'center'
    && txt.plate.lines.length === 2 && txt.status === null && txt.patchEnd === null,
    `${txt.plateRow.children.length} child, ${txt.plateRow.dataset.align}, ${txt.plate.lines.length} lines`);
}

// 11. The patch picker lands last in the row, its caption gone from the DOM, and as `status` it is
// refused.
// why: lessons/kit-instrument-panel.md#t11
{
  const picker = () => {
    const wrap = document.createElement('span'); wrap.className = 'pos-pick';
    const cap = document.createElement('span'); cap.className = 'pos-pick-l'; cap.textContent = 'patch';
    const seg = document.createElement('span'); seg.className = 'step pos-seg pos-pick-seg';
    wrap.append(cap, seg);
    return { el: wrap, cap };
  };
  const pk = picker();
  const sw = document.createElement('button');
  const p = createInstrumentPanel({ keys: document.createElement('div'), plate: { name: 'FAU', status: sw, patch: pk } });
  const row = p.plateRow;
  const last = row.children[row.children.length - 1];
  ok('the patch selector is the last thing in the plate row, after the name and its switch',
    last === pk.el && row.children.length === 2 && row.children[0].children[0] === p.plate.el && p.patchEnd === pk.el,
    `${row.children.length} ends, the selector ${last === pk.el ? 'last' : 'NOT last'}`);
  const left = pk.el.querySelectorAll('.pos-pick-l').length;
  ok('and its caption is gone from the DOM, because the row already says what it is',
    left === 0 && pk.cap.parentNode === null && pk.el.children.length === 1,
    `${left} caption(s) left under the selector, ${pk.el.children.length} child of the wrap`);

  const alone = picker();
  const solo = createInstrumentPanel({ plate: { name: 'FAU', patch: alone } });
  ok('with no switch the selector is still the far end of a justified row, and still unlabelled',
    solo.plateRow.dataset.align === 'between' && solo.plateRow.children[1] === alone.el
    && alone.el.querySelectorAll('.pos-pick-l').length === 0,
    `${solo.plateRow.dataset.align}, ${solo.plateRow.children.length} ends`);

  ok('a selector handed in as the status is refused, because the start of the row is the wrong end for it',
    threw(() => createInstrumentPanel({ plate: { name: 'FAU', status: picker(), patch: document.createElement('button') } })));
  ok('NEGATIVE CONTROL: a switch that is not a selector is still taken as the status',
    !threw(() => createInstrumentPanel({ plate: { name: 'FAU', status: document.createElement('button') } })));
}

console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
