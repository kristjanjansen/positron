// demo/shell/roll.mjs: a vertical piano roll drawn above the keys it names, one row per chord.
// It must line up with the keys, so the geometry is keyboard.mjs's own (`placeKey`, `--k-cols`).
// It parses nothing (chords.mjs does) and is not note-grid.mjs. No autoscroll yet.
// why: lessons/kit-roll.md#header

import { placeKey } from './keyboard.mjs';

/**
 * @param {HTMLElement} host   where to draw it
 * @param {object} o
 * @param {number} o.base      MIDI note of the leftmost key. Pass the keyboard's.
 * @param {string[]} o.keys    the key ids, in order, as the keyboard has them
 * @param {Record<string, number>} o.map   key id -> semitones above `base`
 * @param {Set<string>} o.sharps           which ids are black keys
 * @param {Array<{label?: string, notes: number[]}>} [o.rows]
 * @param {boolean} [o.prepend] put it FIRST inside `host` rather than last,
 *   which is what glues it on top of a keyboard. See below.
 * @param {HTMLElement} [o.scroller] the key row, whose sideways scroll this
 *   follows. Pass a keyboard's `keysEl`.
 * @param {(row:object|null, i:number)=>void} [o.onPick] a row was picked, or
 *   unpicked, in which case `row` is null. See below.

 * @returns {{el, setRows, setBase, rows, dotsOf, destroy}}
 */
export function createRoll(host, { base = 60, keys = [], map = {}, sharps = new Set(),
                                   rows = [], prepend = false, scroller = null,
                                   onPick = null, lines = true, minRows = 0 } = {}) {
  const el = document.createElement('div');
  el.className = 'roll';
  /**
   * Faint rules where the white keys divide; `lines: false` turns them off.
   * The rules run continuously: the one gap was under the first row (6.5 px), fixed in shell.css.
   * why: lessons/kit-roll.md#lines
   */
  if (lines) el.dataset.lines = '1';

  let at = base;
  let current = rows;
  /** which row is picked, or -1. A redraw forgets it: the rows are new rows. */
  let picked = -1;
  /** which row Tab would land on. Never -1 while there are rows, or the roll
   *  falls out of the tab order entirely and cannot be reached at all. */
  let focused = 0;
  /**
   * The seam a glued roll draws between itself and the keys. Declared here because `draw()`
   * reads it and runs first; below the call it is in its temporal dead zone.
   * why: lessons/kit-roll.md#seam
   */
  let seam = null;
  /** element -> note, so a check can read what a dot means without arithmetic */
  const noteOfDot = new Map();

  const draw = () => {
    el.textContent = '';
    noteOfDot.clear();
    // An empty roll draws nothing, not an empty box, unless `minRows` reserves the room
    // (a roll that learns opens empty and would jump on every row). `minRows` defaults to 0.
    // why: lessons/kit-roll.md#empty-roll
    el.hidden = current.length === 0 && minRows === 0;
    if (seam) seam.hidden = el.hidden;
    current.forEach((row, i) => {
      /**
       * A row is a `button`: role, focus, Enter and Space for free.
       * why: lessons/kit-roll.md#row-button
       */
      const r = document.createElement('button');
      r.type = 'button';
      r.className = 'roll-row';
      // A row may say its kind; the page styles it. Set only when present: `[data-kind]` matches empty.
      // why: lessons/kit-roll.md#row-kind
      if (row.kind) r.dataset.kind = row.kind;
      // One tab stop for the whole roll; the arrows move between rows.
      // why: lessons/kit-roll.md#roving-tabindex
      r.tabIndex = i === focused ? 0 : -1;
      const lane = document.createElement('div');
      lane.className = 'roll-lane';
      let whites = 0;
      const notes = new Set(row.notes || []);
      for (const k of keys) {
        const sharp = sharps.has(k);
        const note = at + map[k];
        const cell = document.createElement('div');
        cell.className = `roll-cell${sharp ? ' sharp' : ''}${notes.has(note) ? ' on' : ''}`;
        whites = placeKey(cell, { sharp, whites, pitchClass: ((map[k] % 12) + 12) % 12 });
        // A black key dot sits on the join, without the keyboard's `SHARP_NUDGE` (2.27 px off it at 0.5
        // on a 42.7 px white key), so it sits on the line the eye follows down.
        // why: lessons/kit-roll.md#black-dot
        if (sharp) cell.style.setProperty('--k-off', '0');
        if (notes.has(note)) noteOfDot.set(cell, note);
        lane.append(cell);
      }
      lane.style.setProperty('--k-cols', String(Math.max(1, whites)));
      r.append(lane);
      // The label sits over the lane, absolute: its own column would shift every dot off its key.
      // why: lessons/kit-roll.md#label-over-lane
      if (row.label) {
        const t = document.createElement('span');
        t.className = 'roll-label';
        t.textContent = row.label;
        r.append(t);
      }
      // Reports the pick and paints itself; what a pick does to the keyboard is the page's business.
      // why: lessons/kit-roll.md#on-pick
      r.onclick = () => {
        picked = picked === i ? -1 : i;
        paintPicked();
        onPick?.(picked === -1 ? null : current[picked], picked);
      };
      el.append(r);
    });
    // Placeholders hold the room open with the same lane as a real row. No button, aria-hidden,
    // and not counted in `current`.
    // why: lessons/kit-roll.md#rest-rows
    for (let i = current.length; i < minRows; i++) {
      // Not `.roll-row`: checks count rows by that class (nine went red when it was tried).
      // why: lessons/kit-roll.md#roll-rest
      const r = document.createElement('div');
      r.className = 'roll-rest';
      r.setAttribute('aria-hidden', 'true');
      const lane = document.createElement('div');
      lane.className = 'roll-lane';
      let whites = 0;
      for (const k of keys) {
        const sharp = sharps.has(k);
        const cell = document.createElement('div');
        cell.className = `roll-cell${sharp ? ' sharp' : ''}`;
        whites = placeKey(cell, { sharp, whites, pitchClass: ((map[k] % 12) + 12) % 12 });
        if (sharp) cell.style.setProperty('--k-off', '0');
        lane.append(cell);
      }
      lane.style.setProperty('--k-cols', String(Math.max(1, whites)));
      r.append(lane);
      el.append(r);
    }
    paintPicked();
  };

  /**
   * `aria-pressed` as well as the styled attribute, so every reader hears the selection.
   * why: lessons/kit-roll.md#paint-picked
   */
  const paintPicked = () => {
    // Real rows only: a placeholder told `aria-pressed="false"` announces a chord that is not there.
    // why: lessons/kit-roll.md#real-rows-only
    [...el.children].slice(0, current.length).forEach((r, i) => {
      if (i === picked) r.dataset.on = '1'; else delete r.dataset.on;
      r.setAttribute('aria-pressed', i === picked ? 'true' : 'false');
    });
  };

  draw();
  /**
   * Inside the keyboard's own box, so both grids share width and `--k-min` (as a sibling the
   * columns missed: 0,29,52 against 0,26,46 px). The seam is its own element, not a border on
   * the scroller, full-bleeding by `--kbd-pad`.
   * why: lessons/kit-roll.md#prepend
   */
  if (prepend) {
    seam = document.createElement('div');
    seam.className = 'roll-seam';
    host.prepend(seam);
    host.prepend(el);
  } else {
    host.append(el);
  }

  /**
   * The dots follow the key row's sideways scroll, one direction only, passive.
   * Arrows move focus, Enter or Space picks: a moving pick would fire `onPick` per row.
   * why: lessons/kit-roll.md#follow-scroll
   */
  const moveFocus = (to) => {
    const rows = [...el.children];
    if (!rows.length) return;
    focused = Math.max(0, Math.min(rows.length - 1, to));
    rows.forEach((r, i) => { r.tabIndex = i === focused ? 0 : -1; });
    rows[focused].focus();
  };
  el.addEventListener('keydown', (e) => {
    const rows = [...el.children];
    if (!rows.length) return;
    const at = rows.indexOf(document.activeElement);
    if (at < 0) return;
    const go = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: rows.length - 1 }[e.key];
    if (go === undefined) return;
    e.preventDefault();          // or the page scrolls under the arrows
    moveFocus(go);
  });

  const follow = scroller ? () => {
    el.scrollLeft = scroller.scrollLeft;
    // The picked row's ground is as wide as the keys' own content.
    // why: lessons/kit-roll.md#roll-w
    el.style.setProperty('--roll-w', `${scroller.scrollWidth}px`);
  } : null;
  if (follow) {
    scroller.addEventListener('scroll', follow, { passive: true });
    follow();
  }

  return {
    el,
    /** Replace every row. The whole picture is redrawn, which is cheap and has
     *  no state to get wrong: a roll is a function of its rows. */
    setRows(next) {
      current = next || [];
      picked = -1;
      /* ⚠️ AND THE LANDING ROW COMES BACK TO THE TOP. The rows are new rows, so
         a remembered index would point at a chord nobody typed. */
      focused = 0;
      draw();
      follow?.();
    },
    /**
     * Add a row at the bottom, keeping the selection and the landing row (`setRows` resets both).
     * An append moves nothing already on screen.
     * @returns {number} the new row's index
     * why: lessons/kit-roll.md#add-row
     */
    addRow(row) {
      current = [...current, row];
      draw();
      follow?.();
      return current.length - 1;
    },
    /**
     * `trimRows(n)` keeps a prefix for a tail the page rebuilds; `dropRow(i)` removes one row from
     * the middle of a log and moves nothing under it. The selection follows the rows, and a pick
     * on a dropped row is cleared.
     * why: lessons/kit-roll.md#trim-drop
     */
    dropRow(i) {
      if (i < 0 || i >= current.length) return;
      current = current.filter((_, at) => at !== i);
      if (picked === i) picked = -1; else if (picked > i) picked -= 1;
      if (focused > i) focused -= 1;
      focused = Math.max(0, Math.min(focused, Math.max(0, current.length - 1)));
      draw();
      follow?.();
    },
    trimRows(n) {
      const keep = Math.max(0, Math.min(n, current.length));
      if (keep === current.length) return keep;
      current = current.slice(0, keep);
      if (picked >= keep) picked = -1;
      if (focused >= keep) focused = Math.max(0, keep - 1);
      draw();
      follow?.();
      return keep;
    },
    /**
     * Pick a row from the page, or -1 for none. It toggles, because a press toggles.
     * why: lessons/kit-roll.md#pick
     */
    pick(i) {
      const want = (i >= 0 && i < current.length) ? i : -1;
      picked = want === picked ? -1 : want;
      paintPicked();
      onPick?.(picked === -1 ? null : current[picked], picked);
      return picked;
    },
    picked: () => picked,
    /** Follow the keyboard when its octave moves, which is the other half of
     *  lining up: a roll that stayed put while the keys moved would be wrong in
     *  a way that looks like it is working. */
    setBase(next) { at = next; draw(); follow?.(); },
    rows: () => current,
    /**
     * Light any row whose notes are exactly the held set (a third state, not a pick). Two or more
     * held notes all inside a chord mark its dots as partial; a full match marks no dots.
     * why: lessons/kit-roll.md#set-held
     */
    setHeld(notes) {
      const held = new Set(notes || []);
      [...el.children].slice(0, current.length).forEach((r, i) => {
        const want = current[i]?.notes || [];
        const same = want.length > 0 && want.length === held.size
          && want.every((n) => held.has(n));
        if (same) r.dataset.held = '1'; else delete r.dataset.held;
        /* Inside the chord, at least two of it, and not the whole of it. */
        const inside = held.size > 0 && [...held].every((n) => want.includes(n));
        const part = !same && inside && held.size >= 2;
        for (const cell of r.querySelectorAll('.roll-cell.on')) {
          const note = noteOfDot.get(cell);
          // `delete`, never `= ''`: `[data-part]` matches an empty attribute.
          // why: lessons/kit-roll.md#delete-part
          if (part && held.has(note)) cell.dataset.part = '1';
          else delete cell.dataset.part;
        }
      });
    },
    /** Move the keyboard's landing row, for a page's own check. */
    focus: (i) => moveFocus(i),
    focused: () => focused,
    /** every drawn dot, as element -> note, for a page's own check */
    dotsOf: () => new Map(noteOfDot),
    /** Put the rows where the keys are, for a page whose check moved the row. */
    sync: () => follow?.(),
    destroy() {
      if (follow) scroller.removeEventListener('scroll', follow);
      seam?.remove();
      el.remove();
    },
  };
}
