// demo/shell/picker.mjs: step through a list, or jump to one by name: < | Brass 1 | >  die.
// The dropdown is a real <select> at opacity 0 over a cell we draw; the name cell has a fixed width
// (--pick-w, name room only) so the arrows never move. The die sits outside the group and is SVG.
// why: lessons/kit-picker.md#header

import { el } from './shell.mjs';
import { centreSymbol } from './symbol.mjs';

/** Die face six: two columns of three pips. `currentColor`, so it wears the
 *  button's own colour including :disabled and :hover, with no extra rules. */
const DIE_SVG = `<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
  <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <g fill="currentColor">
    <circle cx="5.5" cy="4.6" r="1.15"/><circle cx="10.5" cy="4.6" r="1.15"/>
    <circle cx="5.5" cy="8" r="1.15"/><circle cx="10.5" cy="8" r="1.15"/>
    <circle cx="5.5" cy="11.4" r="1.15"/><circle cx="10.5" cy="11.4" r="1.15"/>
  </g>
</svg>`;

/**
 * createPicker (below): o.label, o.what, o.prev, o.next, o.random (no die without it),
 * o.onPick(i) from the dropdown, o.cls. Returns { el, buttons, select, show, options, disabled }.
 *
 * createValueCell: the middle of a segmented row as a choice, shared with stepper.mjs.
 * Our paint on a span, the platform's list from a real <select> laid over it.
 * why: lessons/kit-picker.md#create-value-cell
 */
export function createValueCell({ what = 'it', onPick } = {}) {
  const cell = el('span', 'pos-pick-cell');
  const name = el('span', 'pos-pick-n', '—');
  const select = el('select', 'pos-pick-sel', '', { 'aria-label': `choose a ${what}` });
  select.onchange = () => onPick?.(select.selectedIndex);
  cell.append(name, select);

  const show = (label_, i) => {
    name.textContent = label_ ?? '—';
    // ⚠️ THE TITLE IS THE WHOLE NAME. The cell ellipsizes at a fixed width, so
    // the only place a long name survives is the tooltip.
    cell.title = label_ ?? '';
    if (Number.isInteger(i) && i >= 0 && i < select.options.length) select.selectedIndex = i;
  };
  /**
   * The width comes from the widest name in the list (8 to 24 ch), so stepping never moves the arrows.
   * Set as --pick-w in characters, not width, so the phone rule still wins and shell.css owns the padding.
   * why: lessons/kit-picker.md#width-from-widest
   */
  const MAX_CH = 24;
  const MIN_CH = 8;
  const fitWidth = (names) => {
    const widest = names.reduce((n, s2) => Math.max(n, [...s2].length), 0);
    // One spare character, because a proportional fallback face is wider than
    // the mono one this is measured in.
    const ch = Math.min(MAX_CH, Math.max(MIN_CH, widest + 1));
    cell.style.setProperty('--pick-w', `${ch}ch`);
    return ch;
  };

  const options = (names, at = 0) => {
    fitWidth(names);
    select.textContent = '';
    for (const n of names) select.append(el('option', '', n));
    const i = names.length ? Math.max(0, Math.min(names.length - 1, at)) : -1;
    if (i >= 0) select.selectedIndex = i;
    /**
     * options() draws the name it just selected; callers are not asked to call show() afterwards.
     * why: lessons/kit-picker.md#options-draws-name
     */
    name.textContent = i >= 0 ? names[i] : '—';
    cell.title = i >= 0 ? names[i] : '';
    // A list of one has nowhere to go; a list of none is not a list yet.
    const usable = names.length > 1;
    select.disabled = !usable;
    cell.dataset.flat = usable ? '' : '1';
  };
  return { el: cell, name, select, show, options };
}

export function createPicker({ label, what = 'it', prev, next, random, onPick, cls = '' } = {}) {
  const wrap = el('span', `pos-pick ${cls}`.trim());
  if (label) wrap.append(el('span', 'pos-pick-l', label));

  // `step` is the join — the 1 px border overlap, the outer-only corners and
  // the hover raise all live in that one block. Third component to reuse it
  // rather than write a fourth copy of a segmented row.
  const seg = el('span', 'step pos-seg pos-pick-seg');
  wrap.append(seg);

  const mk = (text, title, fn, k = '') => {
    const b = el('button', k, text, { type: 'button', title });
    b.onclick = fn;
    return b;
  };

  const back = mk('‹', `the ${what} before this one`, prev, 'ico');
  const fwd = mk('›', `the ${what} after this one`, next, 'ico');
  // The arrows sit high and narrow in their advance, so they are centred on their ink like other glyph controls.
  // why: lessons/kit-picker.md#centre-arrows
  for (const b of [back, fwd]) centreSymbol(b);

  // The middle slot: our paint, the platform's list.
  const { el: cell, name, select, show: drawCell, options: fillCell } =
    createValueCell({ what, onPick });

  seg.append(back, cell, fwd);

  const buttons = [back, fwd];
  let die = null;
  if (random) {
    // Outside the segment, with a gap — see the header.
    die = mk('', `jump to any ${what}`, random, 'ico pos-pick-die');
    die.innerHTML = DIE_SVG;
    die.setAttribute('aria-label', `jump to any ${what}`);
    wrap.append(die);
    buttons.push(die);
  }

  return {
    el: wrap,
    buttons,
    select,
    /** Draw the current one. `i` keeps the invisible select in step with it. */
    show: drawCell,
    /** Replace the list. The board's library arrives over the wire, so this is
     *  called long after the control is on screen. */
    options: fillCell,
    disabled: (v) => {
      buttons.forEach((b) => { b.disabled = !!v; });
      select.disabled = !!v || select.options.length < 2;
    },
  };
}
