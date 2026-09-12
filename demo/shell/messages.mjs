// demo/shell/messages.mjs — a list of messages, with a column per thing you
// need to know about one.
//
// 🔴 SECOND HAND-BUILT COPY, AND THE TWO DISAGREED. `wire` drew its live
// traffic as a row of coloured gutters plus wrapped text, and drew the HISTORY
// of the same messages as a `<pre>` of raw lines — so the same message looked
// like two unrelated things depending on which pane it was in, and the history
// lost the direction, the size and the stored mark that the live pane showed.
// One renderer, both panes.
//
// ⚠️ EVERYTHING WRAPS, NOTHING ELLIPSIZES. A line of JSON is ~110 bytes and a
// phone is about 45 characters wide, so `nowrap` plus an ellipsis hid most of
// the one thing this page exists to show. An ellipsis in this project means the
// content is in the wrong place, not that the box needs to be wider.
//
// ⚠️ THE GUTTERS ARE FIXED AND THE TEXT IS FLUID. A column that sizes to its
// content makes every row start at a different x, which is the same defect the
// slider group had — four lanes only line up if they share one set of columns.

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {number} [o.cap]      most rows kept; older ones fall off the end
 * @param {boolean} [o.newestFirst]  prepend rather than append
 * @param {string} [o.empty]    what to say when there is nothing yet
 * @returns {{el:HTMLElement, add:(row:object)=>void, set:(rows:object[])=>void,
 *            clear:(msg?:string)=>void, count:()=>number}}
 */
export function createMessageList({ cap = 40, newestFirst = true, empty = 'nothing yet' } = {}) {
  const list = el('div', 'pos-msgs');
  let n = 0;

  const blank = (msg) => {
    list.textContent = '';
    list.append(el('div', 'pos-msgs-empty', msg ?? empty));
    n = 0;
  };
  blank();

  /**
   * @param {object} r
   * @param {string} r.dir      'out' | 'in' | 'echo' — what happened to it
   * @param {number} [r.bytes]  size on the wire
   * @param {boolean} [r.stored] did it go to the history as well
   * @param {string} r.text     the message itself
   * @param {boolean} [r.hi]    ours, and worth reading
   */
  function add(r) {
    if (!n) list.textContent = '';
    const row = el('div', 'pos-msgs-row');
    row.append(el('span', `pos-msgs-dir ${r.dir || ''}`.trim(), r.dir || ''));
    row.append(el('span', 'pos-msgs-sz', r.bytes == null ? '' : `${r.bytes} B`));
    // ⚠️ A WORD, NOT A TICK. A ✓ in a column headed by nothing is a symbol
    // whose meaning you have to be told; `stored` says it. And the cell is
    // never empty-by-accident — a message that was not stored says so by
    // being blank in a column that is always the same width, so the eye reads
    // the column rather than hunting for marks.
    row.append(el('span', `pos-msgs-store${r.stored ? ' yes' : ''}`, r.stored ? 'stored' : ''));
    const t = el('span', 'pos-msgs-txt');
    t.textContent = r.text ?? '';
    if (r.hi) t.dataset.hi = '1';
    row.append(t);
    if (newestFirst) list.prepend(row); else list.append(row);
    n++;
    while (n > cap) { (newestFirst ? list.lastChild : list.firstChild).remove(); n--; }
  }

  return {
    el: list,
    add,
    /** Replace the whole list — what a history read hands back. */
    set: (rows) => {
      list.textContent = ''; n = 0;
      if (!rows?.length) { blank(); return; }
      for (const r of rows) add(r);
    },
    clear: blank,
    count: () => n,
  };
}
