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
 * @returns {{el:HTMLElement, set:(rows:object[])=>void, add:(row:object)=>void,
 *            clear:(msg?:string)=>void, count:()=>number, columns:Column[]}}
 */
export function createTable({ columns, cap = 1000, empty = 'nothing yet' } = {}) {
  if (!Array.isArray(columns) || !columns.length) {
    throw new Error('createTable: columns are the whole point — declare some');
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

  const hasHead = columns.some((c) => c.label);
  if (hasHead) {
    const head = el('div', 'pos-tbl-row pos-tbl-head');
    for (const c of columns) {
      head.append(el('span', `pos-tbl-c${c.align === 'right' ? ' r' : ''}`, c.label || ''));
    }
    wrap.append(head);
  }

  const body = el('div', 'pos-tbl-body');
  wrap.append(body);
  let n = 0;

  const blank = (msg) => {
    body.textContent = '';
    body.append(el('div', 'pos-tbl-empty', msg ?? empty));
    n = 0;
  };
  blank();

  function add(r) {
    if (!n) body.textContent = '';
    const row = el('div', 'pos-tbl-row');
    for (const c of columns) {
      const v = r[c.key];
      const text = v == null || v === '' ? '' : String(v);
      const cell = el('span', `pos-tbl-c${c.align === 'right' ? ' r' : ''}`
        + `${c.hi ? ' hi' : ''}${c.clip ? ' clip' : ''}`);
      const href = c.link ? r[c.link] : null;
      if (href && text) {
        const a = el('a', 'pos-tbl-a', text, { href, target: '_blank', rel: 'noreferrer noopener' });
        if (c.clip) a.title = text;
        cell.append(a);
      } else {
        cell.textContent = text;
        if (c.clip && text) cell.title = text;
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
      body.textContent = ''; n = 0;
      if (!rows?.length) { blank(); return; }
      for (const r of rows) add(r);
    },
    clear: blank,
    count: () => n,
    columns,
  };
}
