// demo/shell/midi-log.mjs: what arrived on the wire, in columns. The hex and the reading are
// two columns, never one. A flood (clock, 733 messages in 8 s from an MK-425C) is counted,
// never listed: add() returns false. /dump/ keeps its own richer table.
// why: lessons/kit-midi-log.md#header
import { createTable } from '/shell/table.mjs';

export const MAX_ROWS = 200;

/**
 * @param {object} [o]
 * @param {number} [o.cap]    rows kept. The oldest fall off the top.
 * @param {string} [o.empty]  what the box says before anything has arrived.
 * @param {number} [o.reserve] rows of height to hold open while it is empty, independent
 *   of `empty`; rows, not pixels, so the row height stays shell.css's (--tbl-row-h).
 * @returns {{el, add:(m:object)=>boolean, count:()=>number, clear:Function,
 *            table:object}}
 * why: lessons/kit-midi-log.md#create-midi-log
 */
export function createMidiLog({ cap = MAX_ROWS, empty = 'nothing has arrived yet',
                                reserve = 0 } = {}) {
  const t0 = performance.now();
  const table = createTable({
    columns: [
      // Every heading is one short word, so none wraps.
      // why: lessons/kit-midi-log.md#headings
      { key: 'at', label: 'at', width: 60, align: 'right' },
      { key: 'ch', label: 'ch', width: 34, align: 'right' },
      { key: 'what', label: 'what', width: 92 },
      { key: 'bytes', label: 'bytes', width: 100, hi: true },
      { key: 'reading', label: 'reading', grow: true, clip: true },
    ],
    cap,
    // The newest row stays in view: at 733 messages in 8 s a table that does not follow shows the past.
    // why: lessons/kit-midi-log.md#stick
    stick: true,
    empty,
    note: 'hover',
  });
  table.el.classList.add('pos-midilog');
  if (reserve > 0) {
    table.el.dataset.reserve = String(reserve);
    table.el.style.setProperty('--reserve-rows', String(reserve));
  }

  return {
    el: table.el,
    table,
    /**
     * @param {object} m a decoded message from `midi-decode.mjs`
     * @returns {boolean} false if it was a flood and was not listed
     */
    add(m) {
      if (m.flood) return false;
      table.add({
        at: `${((performance.now() - t0) / 1000).toFixed(2)}s`,
        ch: m.ch === null ? '' : m.ch,
        what: m.what,
        bytes: m.bytes,
        reading: m.reading,
        hover: `status 0x${m.status.toString(16).toUpperCase()}`,
      });
      return true;
    },
    count: () => table.count(),
    clear: () => table.clear(),
  };
}
