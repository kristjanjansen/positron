// demo/shell/table.mjs — rows in columns you declare, rather than columns
// somebody else already decided.
//
// 🔴 WHY THIS EXISTS, AND IT IS A CORRECTION. `/kurenniemi/` needed a list of
// 122 archive records with the date, the holder, the name, the size and the
// licence each in its own column, the name a link, and one line per row. It was
// built on `messages.mjs`, which has FIVE HARD-CODED COLUMNS — direction, size,
// a marker word, the text — chosen for a page that watches relay traffic. Each
// new need arrived as another option on that component: a fourth column, a way
// to remove the third, a size the caller formats, a switch to stop wrapping.
// Four options to describe one table. REPORTED as *"just make reusable
// component that take different types of cols"*, which is the right answer and
// was the right answer two options earlier.
//
// ⚠️ IT DOES NOT REPLACE `messages.mjs`. That one renders a MESSAGE — a thing
// with a direction and a size that arrived over a wire, wrapped because a line
// of JSON on a phone must not be cut. This renders a RECORD. Two shapes, two
// components; the mistake was making the first one grow a spec it did not want.
//
// ⚠️ A REAL GRID, NOT PADDED MONOSPACE. The page it replaces lined its columns
// up by `padEnd()` inside one text cell, which works only while every glyph is
// the same width and breaks the moment anything is not — and it cannot give a
// column its own colour, alignment or link.

import { el } from './shell.mjs';

/**
 * @typedef {object} Column
 * @property {string} key        the field this column reads from a row
 * @property {string} [label]    a heading. Any column having one gives the
 *   table a header row; with none anywhere there is no header at all.
 * @property {number} [width]    a fixed track, in px
 * @property {boolean} [grow]    take the remaining width. One column should.
 * @property {'left'|'right'} [align]
 * @property {string} [link]     the field holding a URL. The cell becomes a
 *   link to it; a row with nothing there still shows its value, unlinked,
 *   because "no address" is a fact about the record and not a reason to hide
 *   its name.
 * @property {boolean} [hi]      full-strength text rather than dim
 * @property {string} [hover]   a field whose value becomes this cell's `title`,
 *   for when the cell SHORTENS what it shows. A column of licences reads down
 *   only if `CC BY-NC-SA 4.0` is three or four characters wide, and an
 *   abbreviation nobody can expand is worse than a long word. Defaults to the
 *   cell's own text when `clip` is set.
 * @property {boolean} [clip]    ONE LINE, cut with an ellipsis, full value on
 *   `title`. ⚠️ CLAUDE.md says an ellipsis means the content is in the wrong
 *   place, and that rule is about a MEASUREMENT or a label being squeezed. A
 *   proper name is the case it does not cover: 122 titles wrapping to two and
 *   three lines each is not a table anybody can read down, the full text is one
 *   hover away, and the cell is usually a link to the whole record besides.
 */

/**
 * @param {object} o
 * @param {Column[]} o.columns
 * @param {number} [o.cap]      most rows kept
 * @param {string} [o.empty]    what to say with nothing in it
 * @param {string} [o.note]     a field whose value becomes the ROW's `title`.
 *   ⚠️ FOR A SENTENCE THAT HAS NO COLUMN AND SHOULD NOT GET ONE. A record can
 *   carry a paragraph — *"a page of his diary, photographed"* — that is worth
 *   having and would ruin the grid: a column wide enough for it starves every
 *   other, and a narrow one shows four words and an ellipsis, which is the
 *   signal that a thing is in the wrong place. Hovering is the right weight for
 *   a fact you want occasionally.
 * @returns {{el:HTMLElement, set:(rows:object[])=>void, add:(row:object)=>void,
 *            clear:(msg?:string)=>void, count:()=>number, columns:Column[]}}
 */
export function createTable({ columns, cap = 1000, empty = 'nothing yet', note = '',
                              onPick = null } = {}) {
  if (!Array.isArray(columns) || !columns.length) {
    throw new Error('createTable: columns are the whole point, so declare some');
  }
  // 🔴 EXACTLY ONE COLUMN MAY GROW, AND SAYING SO IS CHEAPER THAN DEBUGGING IT.
  // With none, the table does not fill its box and the last column floats in the
  // middle of nowhere; with two, neither has a predictable width and the row
  // reflows as content changes — which is the defect the grid exists to remove.
  const growers = columns.filter((c) => c.grow).length;
  if (growers !== 1) {
    throw new Error(`createTable: exactly one column must grow, not ${growers}`);
  }

  const wrap = el('div', 'pos-tbl');
  const tracks = columns
    .map((c) => (c.grow ? 'minmax(0, 1fr)' : `${c.width || 80}px`))
    .join(' ');
  wrap.style.setProperty('--tbl-cols', tracks);

  /**
   * 🔴 A HEADER OVER NOTHING IS THREE WORDS LABELLING AIR. An empty table used
   * to draw `file · size · state` above a line saying nothing had been dropped
   * yet, which is a column heading for a column that does not exist and a
   * promise the table is not yet keeping. Reported on /crate/, pointing at each
   * of the three in turn.
   * The header is HIDDEN rather than removed, so the moment a row lands it is
   * there and the rows below it line up under names that were already measured.
   * Building it late would size its columns against the first row instead of
   * against the track list every row shares.
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

  // Every row element now on screen, and the data it was built from, so a
  // caller can light one after a repaint. See `mark`.
  const els = [], shown = [];
  const blank = (msg) => {
    body.textContent = '';
    // 🔴 AN EMPTY STRING MEANS SAY NOTHING, AND SAYING NOTHING MEANS NO
    // ELEMENT. `.pos-tbl-empty` carries `padding: 8px 10px`, so appending it
    // with no text leaves a padded band with nothing in it: a container
    // painting its own space, which is the same fault as the empty readout
    // that drew a 2 px rule nobody wrote. A caller that passes '' wants the
    // table silent, not quietly tall.
    const said = msg ?? empty;
    if (said) body.append(el('div', 'pos-tbl-empty', said));
    n = 0;
    if (head) head.hidden = true;
  };
  blank();

  function add(r) {
    if (!n) { body.textContent = ''; if (head) head.hidden = false; }
    const row = el('div', 'pos-tbl-row');
    if (note && r[note]) row.title = String(r[note]);
    /**
     * 🔴 A ROW A CALLER CAN ACT ON, WITHOUT THE TABLE KNOWING WHAT THE ACTION
     * IS. Asked for on `/crate/` 2026-09-16: *"no table rework. just make
     * clickin files playable"*, and the second half of that sentence is the
     * design. The component gains one callback and no opinion: no play glyph,
     * no chevron, no second column.
     *
     * ⚠️ A `<button>` ROW, NOT A DIV WITH A CLICK HANDLER. A clickable div is
     * unreachable by keyboard and invisible to a screen reader, and this is a
     * list somebody may be working through with tab.
     * ⚠️ AND IT DOES NOT SWALLOW A LINK. A cell may already be an anchor
     * (`link:`), which is a different destination from the row's own action, so
     * a press that lands on one is left alone rather than being turned into a
     * row press.
     */
    els.push(row); shown.push(r);
    if (onPick) {
      row.setAttribute('role', 'button');
      row.tabIndex = 0;
      row.classList.add('pick');
      const go = (e) => {
        if (e.target?.closest?.('a')) return;
        onPick(r, row);
      };
      row.addEventListener('click', go);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); }
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
    body.append(row);
    n++;
    while (n > cap) { body.firstChild.remove(); n--; }
  }

  return {
    el: wrap,
    add,
    set(rows) {
      body.textContent = ''; n = 0; els.length = 0; shown.length = 0;
      if (!rows?.length) { blank(); return; }
      for (const r of rows) add(r);
    },
    /**
     * 🔴 WHICH ROW IS THE LIVE ONE, DECIDED BY THE CALLER AND DRAWN BY THE
     * TABLE. Asked for on `/crate/` 2026-09-16: *"i do not see which one is
     * actiev on table"*.
     *
     * ⚠️ IT TAKES A PREDICATE OVER THE ROW DATA, NOT AN INDEX. A page repaints
     * this list whenever the store changes, and an index survives exactly until
     * a row is added at the top, which `/crate/` does on every upload. Asking
     * the caller "is THIS row the one" is the only form that survives a repaint.
     */
    mark(is) {
      els.forEach((e, i) => e.classList.toggle('on', !!is && !!is(shown[i], i)));
    },
    clear: blank,
    count: () => n,
    columns,
  };
}
