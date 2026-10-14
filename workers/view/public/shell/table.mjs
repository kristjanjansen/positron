// demo/shell/table.mjs: rows in columns you declare, as a real grid (not padded monospace).
// It renders a record; messages.mjs renders a message off a wire, and does not grow columns.
// why: lessons/kit-table.md#header

import { el } from './shell.mjs';

/**
 * @typedef {object} Column
 * @property {string} key        the field this column reads from a row
 * @property {string} [label]    a heading. Any column having one gives the
 *   table a header row; with none anywhere there is no header at all.
 * @property {number} [width]    a fixed track, in px
 * @property {boolean} [grow]    take the remaining width. Exactly one column must.
 * @property {'left'|'right'} [align]
 * @property {string} [link]     the field holding a URL; a row without one still shows its value.
 * @property {boolean} [hi]      full-strength text rather than dim
 * @property {string} [hover]   a field whose value becomes this cell's `title`, for a cell
 *   that shortens what it shows. Defaults to the cell's own text when `clip` is set.
 * @property {boolean} [clip]    one line, cut with an ellipsis, full value on `title`;
 *   for proper names, which are usually a link to the whole record besides.
 * why: lessons/kit-table.md#column
 */

/**
 * @param {object} o
 * @param {Column[]} o.columns
 * @param {number} [o.cap]      most rows kept
 * @param {string} [o.empty]    what to say with nothing in it
 * @param {string} [o.note]     a field whose value becomes the ROW's `title`, for a sentence
 *   that has no column and should not get one.
 * @param {boolean} [o.stick]   keep the newest row in view; stands down while focus is in the body.
 * @param {number} [o.minRows]  the empty table is the empty state: the body is exactly this
 *   many --tbl-row-h rows, floor and ceiling, with no caption. Placeholders are not rows.
 * @returns {{el:HTMLElement, set:(rows:object[])=>void, add:(row:object)=>void,
 *            clear:(msg?:string)=>void, count:()=>number, columns:Column[]}}
 * why: lessons/kit-table.md#create-table
 */
export function createTable({ columns, cap = 1000, empty = 'nothing yet', note = '', stick = false,
                              minRows = 0, onPick = null } = {}) {
  if (!Array.isArray(columns) || !columns.length) {
    throw new Error('createTable: columns are the whole point, so declare some');
  }
  // Exactly one column may grow: with none the table does not fill its box, with two
  // the row reflows as content changes.
  // why: lessons/kit-table.md#one-grower
  const growers = columns.filter((c) => c.grow).length;
  if (growers !== 1) {
    throw new Error(`createTable: exactly one column must grow, not ${growers}`);
  }

  const wrap = el('div', 'pos-tbl');
  /**
   * The growing track has a floor, --tbl-grow in shell.css (minmax(0, 1fr) measured 0 px
   * on a phone). The row's min-width is min-content, so the tracks set the smallest row.
   * why: lessons/kit-table.md#grow-floor
   */
  const tracks = columns
    .map((c) => (c.grow ? 'minmax(var(--tbl-grow), 1fr)' : `${c.width || 80}px`))
    .join(' ');
  wrap.style.setProperty('--tbl-cols', tracks);

  /**
   * A header over no rows labels air, so it is hidden, not removed: built now, it is sized
   * against the track list rather than the first row.
   * why: lessons/kit-table.md#hidden-head
   */
  const hasHead = columns.some((c) => c.label);
  let head = null;
  if (hasHead) {
    head = el('div', 'pos-tbl-row pos-tbl-head');
    for (const c of columns) {
      head.append(el('span', `pos-tbl-c${c.align === 'right' ? ' r' : ''}`, c.label || ''));
    }
    head.hidden = true;
    wrap.append(head);
  }

  const body = el('div', 'pos-tbl-body');
  wrap.append(body);
  let n = 0;

  /* The frame's own two numbers, both read by `shell.css` and neither typed
     there: how many rows the box holds open, and therefore how tall it is. The
     attribute is what arms the rule, so a table with no `minRows` is byte for
     byte the table that was here before. */
  if (minRows > 0) {
    wrap.dataset.rows = '1';
    wrap.style.setProperty('--tbl-rows', String(minRows));
  }
  /** the placeholders holding the box open, newest last, real rows above them */
  const rests = [];
  const holdRoom = () => {
    const want = Math.max(0, minRows - n);
    while (rests.length > want) rests.pop().remove();
    while (rests.length < want) {
      const r = el('div', 'pos-tbl-rest');
      r.setAttribute('aria-hidden', 'true');
      body.append(r);
      rests.push(r);
    }
  };

  // Every row element now on screen, and the data it was built from, so a
  // caller can light one after a repaint. See `mark`.
  const els = [], shown = [];

  /**
   * Put the keyboard on one row; returns whether there was one. Scrolls the table's own box
   * only (focus with preventScroll), keeping one row of margin off the edge.
   * why: lessons/kit-table.md#focus-row
   */
  function focusRow(i) {
    const row = els[i];
    if (!row) return false;
    row.focus({ preventScroll: true });
    keepInView(row);
    return true;
  }

  /**
   * Bring a row inside the scrolling box by writing only its scrollTop. Rects, not offsetTop:
   * the body is position: static, so offsetTop is measured from some other ancestor.
   * why: lessons/kit-table.md#keep-in-view
   */
  function keepInView(row) {
    const box = body;
    if (box.scrollHeight <= box.clientHeight) return;
    const b = box.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    // One row of margin, so a row reached by stepping is never flush against
    // the boundary with nothing visible beyond it.
    const pad = r.height;
    let move = 0;
    if (r.top - pad < b.top) move = (r.top - pad) - b.top;
    else if (r.bottom + pad > b.bottom) move = (r.bottom + pad) - b.bottom;
    if (!move) return;
    // The clamp is what lets the margin be unconditional: at the first and last
    // row there is nowhere to put it, and asking for it changes nothing.
    const max = box.scrollHeight - box.clientHeight;
    box.scrollTop = Math.max(0, Math.min(box.scrollTop + move, max));
  }
  const blank = (msg) => {
    body.textContent = '';
    rests.length = 0;
    // An empty string means no element, not a padded empty band. A framed (minRows) table
    // shows no caption at all: the frame is the empty state.
    // why: lessons/kit-table.md#empty-caption
    const said = minRows ? '' : (msg ?? empty);
    if (said) body.append(el('div', 'pos-tbl-empty', said));
    n = 0;
    // The heading stands only over a frame's ruled rows; otherwise it hides as before.
    // why: lessons/kit-table.md#framed-head
    if (head) head.hidden = !minRows;
    holdRoom();
  };
  blank();

  function add(r) {
    if (!n) { if (!minRows) body.textContent = ''; if (head) head.hidden = false; }
    const row = el('div', 'pos-tbl-row');
    if (note && r[note]) row.title = String(r[note]);
    /**
     * onPick makes a row a <button> a caller can act on, keyboard reachable. A press on a
     * cell's own link is left to the link.
     * why: lessons/kit-table.md#on-pick
     */
    els.push(row); shown.push(r);
    if (onPick) {
      row.setAttribute('role', 'button');
      /**
       * Roving tabindex: the list is one tab stop, the arrows move inside it.
       * why: lessons/kit-table.md#roving-tabindex
       */
      row.tabIndex = els.length === 1 ? 0 : -1;
      row.classList.add('pick');
      const go = (e) => {
        if (e.target?.closest?.('a')) return;
        onPick(r, row);
      };
      row.addEventListener('click', go);
      /**
       * Arrows move focus and Enter or Space picks; an arrow that picked would fetch a file per
       * row held. preventDefault keeps the page from scrolling under the arrow.
       * why: lessons/kit-table.md#arrows-enter
       */
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); return; }
        const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[e.key];
        const jump = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : null;
        if (step === undefined && jump === null) return;
        e.preventDefault();
        const here = els.indexOf(row);
        const want = jump !== null ? jump : here + step;
        focusRow(Math.max(0, Math.min(els.length - 1, want)));
      });
      /* The roving index follows the focus rather than leading it, so a row
         reached by a mouse press or by a screen reader's own navigation
         becomes the list's tab stop too. Without this, tabbing out and back
         returns to whichever row happened to be first. */
      row.addEventListener('focus', () => {
        for (const other of els) other.tabIndex = other === row ? 0 : -1;
      });
    }
    for (const c of columns) {
      const v = r[c.key];
      const text = v == null || v === '' ? '' : String(v);
      const cell = el('span', `pos-tbl-c${c.align === 'right' ? ' r' : ''}`
        + `${c.hi ? ' hi' : ''}${c.clip ? ' clip' : ''}`);
      const href = c.link ? r[c.link] : null;
      const hover = c.hover ? (r[c.hover] || '') : (c.clip ? text : '');
      if (href && text) {
        const a = el('a', 'pos-tbl-a', text, { href, target: '_blank', rel: 'noreferrer noopener' });
        if (hover) a.title = hover;
        cell.append(a);
      } else {
        cell.textContent = text;
        if (hover && text) cell.title = hover;
      }
      row.append(cell);
    }
    // Inserted above the placeholder rows, not after them.
    // why: lessons/kit-table.md#above-rests
    if (rests.length) body.insertBefore(row, rests[0]); else body.append(row);
    n++;
    while (n > cap) { body.firstChild.remove(); n--; }
    holdRoom();
    // scrollHeight is read after the append and the cap trim, or the view lands one row short.
    // why: lessons/kit-table.md#stick-after
    if (stick && !body.contains(document.activeElement)) body.scrollTop = body.scrollHeight;
  }

  return {
    el: wrap,
    add,
    set(rows) {
      body.textContent = ''; n = 0; els.length = 0; shown.length = 0; rests.length = 0;
      if (!rows?.length) { blank(); return; }
      if (head) head.hidden = false;
      for (const r of rows) add(r);
    },
    /**
     * Which row is the live one: a predicate over the row data, not an index, so it survives
     * a repaint that adds rows at the top.
     * why: lessons/kit-table.md#mark
     */
    mark(is) {
      els.forEach((e, i) => e.classList.toggle('on', !!is && !!is(shown[i], i)));
    },
    clear: blank,
    count: () => n,
    columns,
    /**
     * Put the keyboard on a row, by index. For a page that wants the list ready
     * to step through after it fills, and for a check that has to prove the
     * arrows move something.
     */
    focusRow,
    /** Which row has the keyboard, or -1. */
    focused: () => els.findIndex((e) => e === document.activeElement),
    /** The element that scrolls, so a check can read where the list is. */
    scroller: () => body,
    /**
     * What did not fit, reported to the author, like createDiagram's cut labels. A method,
     * read after mount: an unlaid table answers measured: false and no cuts.
     * @returns {{measured: boolean, width: number,
     *            cuts: {id: string, where: 'label'|'columns',
     *                   full: string, shown: string, width: number}[]}}
     * why: lessons/kit-table.md#cuts
     */
    cuts() {
      const seen = wrap.getBoundingClientRect().width;
      const ref = head && !head.hidden ? head : els[0];
      if (!seen || !ref) return { measured: false, width: seen, cuts: [] };
      const out = [];
      /**
       * Columns wider than the box are dragged sideways, intended on a phone; reported because
       * on a wide screen only the author can decide which column goes.
       * why: lessons/kit-table.md#cuts-columns
       */
      const over = wrap.scrollWidth - wrap.clientWidth;
      if (over > 1) {
        out.push({ id: 'the columns', where: 'columns',
                   full: `${wrap.scrollWidth} px of columns`,
                   shown: `${wrap.clientWidth} px of box`, width: Math.round(over) });
      }
      // A heading against its own column. `white-space: nowrap; overflow:
      // hidden` in shell.css is what makes this readable: the cell lays the
      // whole label out on one line and clips it, so the overflow is the exact
      // number of pixels the author is short.
      [...ref.children].forEach((cell, i) => {
        const c = columns[i];
        if (!c || !c.label) return;
        const cut = cell.scrollWidth - cell.clientWidth;
        if (cut > 1) {
          out.push({ id: c.key, where: 'label', full: c.label,
                     shown: `${cell.clientWidth} px of column`, width: Math.round(cut) });
        }
      });
      return { measured: true, width: seen, cuts: out };
    },
  };
}
