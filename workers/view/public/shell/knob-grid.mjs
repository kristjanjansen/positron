// demo/shell/knob-grid.mjs: knobs in boxes of their own, on an `auto-fill` grid that keeps a
// slot for every knob, so a knob switched off dims in place and nothing reflows. Not
// `control-grid.mjs` (measured square lattice) nor `createKnobBank` (one scrolling row).
// why: lessons/kit-knob-grid.md#grid-header

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
  // Refused, as the knob bank refuses: a grid with no knobs paints only its own edges.
  // why: lessons/kit-knob-grid.md#grid-empty
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
  // `row`: one row that scrolls sideways and never wraps, a concept synth's knobs area.
  // It takes no `cols`.
  // why: lessons/kit-knob-grid.md#grid-row
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
   * Switch a knob on or off. Off keeps its box and dims what is in it, through the knob's own
   * `enable`, so an off knob takes no drag, wheel or tab stop.
   * why: lessons/kit-knob-grid.md#grid-show
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
