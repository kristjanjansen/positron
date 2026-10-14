// demo/shell/messages.mjs: a list of messages, a column per thing you need to know about one.
// One renderer for live and history panes. Everything wraps, nothing ellipsizes (a JSON line
// is about 110 bytes, a phone about 45 characters). Fixed gutters, fluid text.
// why: lessons/kit-messages.md#header

import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {number} [o.cap]      most rows kept; older ones fall off the end
 * @param {boolean} [o.newestFirst]  prepend rather than append
 * @param {string} [o.empty]    what to say when there is nothing yet
 * @param {string} [o.mark]     the WORD in the third column, named by the caller
 *   (`wire`: did the relay keep it; `patch`: did the bytes come back unchanged)
 * @returns {{el:HTMLElement, add:(row:object)=>void, set:(rows:object[])=>void,
 *            clear:(msg?:string)=>void, count:()=>number}}
 * why: lessons/kit-messages.md#create-message-list
 */
export function createMessageList({ cap = 40, newestFirst = true, empty = 'nothing yet',
                                   mark = 'stored' } = {}) {
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
   * @param {string} r.dir      'out' | 'in' | 'echo', what happened to it
   * @param {number} [r.bytes]  size on the wire
   * @param {boolean} [r.mark]   is the column's fact true of this row
   * @param {boolean} [r.stored] the older name for the same flag
   * @param {string} r.text     the message itself
   * @param {boolean} [r.hi]    ours, and worth reading
   * why: lessons/kit-messages.md#add
   */
  function add(r) {
    if (!n) list.textContent = '';
    const row = el('div', 'pos-msgs-row');
    row.append(el('span', `pos-msgs-dir ${r.dir || ''}`.trim(), r.dir || ''));
    row.append(el('span', 'pos-msgs-sz', r.bytes == null ? '' : `${r.bytes} B`));
    // A word, not a tick, in a column that is always the same width.
    // why: lessons/kit-messages.md#word-not-tick
    const on = r.mark ?? r.stored;
    row.append(el('span', `pos-msgs-store${on ? ' yes' : ''}`, on ? mark : ''));
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
