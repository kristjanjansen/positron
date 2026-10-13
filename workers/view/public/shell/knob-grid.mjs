// demo/shell/knob-grid.mjs, knobs in boxes of their own, on a grid that keeps a
// slot for every knob it was given.
//
// 🔴 THE ASK, 2026-10-10: *"Knobs: each has its own wrapper box, in a grid,
// already reserve room for it. A kit component. In 40 41"*. `/concepts/synth/040/` (removed 2026-10-13)
// had taken a knob the step did not offer out of the row (`cc-gone`) and hid
// the whole bank when a step offered none (`cc-off`), so the row closed up and
// opened out under the reader on every step. Here a knob that is switched off
// keeps its box where it was, and only what is in the box dims, so nothing
// reflows when a knob comes or goes.
//
// ⚠️ IT IS NOT `control-grid.mjs`, AND THE REASON IS WHAT EACH ONE IS FOR.
// That one puts dial centres on a SQUARE lattice by MEASURING the biggest cell
// and writing a fixed column count from script. This one is boxes of one
// declared size whose count the browser derives from the width (`auto-fill`),
// which is a stylesheet rule and needs no measurement at all. Folding the two
// would have given the square lattice a second mode with nothing in common
// with its first.
// ⚠️ AND IT IS NOT `createKnobBank`, which is a single scrolling row with
// optional hairlines: a bank compares knobs ACROSS, and a grid of boxes wraps.
//
// 🔴 NO STYLE PROPERTY IS WRITTEN FROM HERE. The only thing set on an element
// is `--kgrid-cols`, a custom property, from the `cols` option; the rules that
// read it are in `shell.css` beside the knob bank.

/** One knob's name, from what the caller handed in. */
function nameOf(item, i) {
  if (item && item.name) return String(item.name);
  const lab = (item?.knob || item)?.el?.querySelector?.('.pos-knob-lab');
  return lab ? lab.textContent.trim().toLowerCase() : String(i);
}

/**
 * Knobs in boxes, on a grid that reserves a box for every one of them.
 *
 * @param {Array|Map} knobs  `createKnob` results, `{ name, knob }` pairs, or a
 *   Map from name to knob. A bare knob is named by its label, lower case.
 * @param {object} [o]
 * @param {number} [o.cols]  the most boxes across. Unset, the grid takes the
 *   width it is given and fits as many as that holds.
 * @param {string} [o.cls]   an extra class for a page's own rules
 * @returns {{el, cells, knobs, names, show, on, cellOf, receive}}
 */
export function createKnobGrid(knobs = [], { cols, row = false, cls = '' } = {}) {
  const list = knobs instanceof Map
    ? [...knobs].map(([name, knob]) => ({ name, knob }))
    : [...knobs].map((k, i) => (k && k.knob ? { name: nameOf(k, i), knob: k.knob } : { name: nameOf(k, i), knob: k }));
  /* 🔴 REFUSED, FOR THE REASON THE KNOB BANK REFUSES: a grid with no knobs is
     a container painting its own edges. */
  if (!list.length) throw new Error('a knob grid with no knobs is an empty box painting its own edges');
  if (cols !== undefined && !(Number.isInteger(cols) && cols > 0)) {
    throw new Error(`a knob grid's cols is a ceiling of at least 1, got ${JSON.stringify(cols)}`);
  }
  const seen = new Set();
  for (const { name } of list) {
    if (seen.has(name)) throw new Error(`a knob grid has two knobs called ${name}, so show("${name}") could not say which`);
    seen.add(name);
  }

  const root = document.createElement('div');
  root.className = cls ? `pos-kgrid ${cls}` : 'pos-kgrid';
  // `row`: one row that scrolls sideways and never wraps, the knobs area of a
  // concept synth (asked 2026-10-10, *"knobs ... independent in the knobs
  // area, horiz scrollable"*). It takes no `cols`.
  if (row) {
    if (cols) throw new Error('a knob row is one row; cols is for a wrapping grid');
    root.dataset.row = '';
  }
  if (cols) {
    root.dataset.cols = String(cols);
    root.style.setProperty('--kgrid-cols', String(cols));
  }
  const byName = new Map();
  const cells = list.map(({ name, knob }) => {
    const cell = document.createElement('div');
    cell.className = 'pos-kgrid-cell';
    cell.dataset.knob = name;
    cell.append(knob.el);
    root.append(cell);
    byName.set(name, { knob, cell });
    return cell;
  });

  /** The entry for a name, a knob object, or an index. */
  function find(x) {
    if (typeof x === 'number') return byName.get(list[x]?.name);
    if (typeof x === 'string') return byName.get(x);
    for (const v of byName.values()) if (v.knob === x || v.cell === x) return v;
    return undefined;
  }

  /**
   * Switch a knob on or off. Off keeps its box and dims what is in it.
   *
   * ⚠️ IT GOES THROUGH THE KNOB'S OWN `enable`, so an off knob takes no drag,
   * no wheel and no tab stop, which is the honest state of a knob whose cable
   * reaches nothing. A knob a page had already disabled for a reason of its
   * own is switched back on by `show(x, true)`; a page with both reasons keeps
   * the second one itself.
   */
  function show(x, on = true) {
    const e = find(x);
    if (!e) throw new Error(`a knob grid has no knob ${JSON.stringify(typeof x === 'object' ? '(object)' : x)}`);
    e.knob.enable?.(!!on);
    if (on) delete e.cell.dataset.off;
    else e.cell.dataset.off = '1';
    return !!on;
  }

  return {
    el: root,
    cells,
    knobs: list.map((x) => x.knob),
    names: list.map((x) => x.name),
    show,
    /** whether a knob is switched on, by name, knob or index */
    on: (x) => { const e = find(x); return !!e && !e.cell.dataset.off; },
    /** the box a knob sits in, so a check can measure it */
    cellOf: (x) => find(x)?.cell ?? null,
    /**
     * A value from somewhere else for one knob, by name, knob or index: it
     * glides and is marked, and nothing is sent (`knob.mjs` `receive`). A knob
     * switched off here takes nothing, so a page cannot draw a turn on a knob
     * whose cable reaches nothing.
     */
    receive(x, value, opts) {
      const e = find(x);
      if (!e) throw new Error(`a knob grid has no knob ${JSON.stringify(typeof x === 'object' ? '(object)' : x)}`);
      if (e.cell.dataset.off) return e.knob.value();
      return e.knob.receive ? e.knob.receive(value, opts) : e.knob.set(value, { ...opts, quiet: true });
    },
  };
}

export default createKnobGrid;
