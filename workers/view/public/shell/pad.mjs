// demo/shell/pad.mjs: a square button that can be lit, and a grid of them, for beat grids and
// devices with coloured pads. A pad's tint names its lane, unlike a strip mark's colour; do not
// carry that back to strip.mjs. A face label is optional and usually empty.
// why: lessons/kit-pad.md#header

/**
 * One pad.
 * @param {object} o
 * @param {string} [o.label]   on the face. Two or three characters at most.
 * @param {string} [o.top]     above the pad: names what it is. Always reserves its slot.
 * @param {string} [o.bottom]  below the pad, where hardware prints a name. No slot when absent.
 * @param {string} [o.tint]    any CSS colour or var; off pads show a trace of it
 * @param {boolean} [o.on]     lit
 * @param {string} [o.title]   hover text, which is where a long name belongs
 * @param {string} [o.aria]    accessible name, defaults to `label` or `title`
 * @param {(on:boolean, pad:object)=>void} [o.onPress]
 * @param {boolean} [o.latch]  default true: a press toggles and stays; false is momentary
 * @param {boolean} [o.small]  three quarters of a pad; scales the box, not the type
 * @param {boolean} [o.round]  a circle 10 per cent smaller, same labels; wins over `half`
 * @param {boolean} [o.half]   half height
 * @param {boolean} [o.disabled]  refuses presses and says so (see `enable`)
 * @returns {{el:HTMLElement, set:Function, on:()=>boolean, tint:Function,
 *            flash:Function, presses:()=>number}}
 * why: lessons/kit-pad.md#create-pad
 */
export function createPad({
  label = '', top = '', bottom = '', tint = '', on = false, title = '', aria = '',
  onPress = () => {}, latch = true, half = false, round = false, small = false,
  disabled = false,
} = {}) {
  // ⚠️ SAID OUT LOUD RATHER THAN SILENTLY PREFERRED. A half height circle is an
  // ellipse; a caller asking for both has a wrong idea of one of them.
  if (round && half) console.warn('pad: round and half together is an ellipse. round wins.');
  let lit = !!on, presses = 0;

  const el = document.createElement('button');
  el.type = 'button';
  el.className = (round ? 'pos-pad pos-pad-round'
    : half ? 'pos-pad pos-pad-half' : 'pos-pad')
    + (small ? ' pos-pad-small' : '');
  el.disabled = !!disabled;
  if (title) el.title = title;
  el.setAttribute('aria-label', aria || label || title || 'pad');
  // `aria-pressed` only when it latches: a momentary pad holds no state.
  // why: lessons/kit-pad.md#aria-pressed
  if (latch) el.setAttribute('aria-pressed', String(lit));

  const face = document.createElement('span');
  face.className = 'pos-pad-face';
  face.textContent = label;
  el.append(face);

  /**
   * The top label sits outside the button, in a wrapper, so it is not part of the press target
   * or the name. The empty slot is kept so pads in a row line up.
   * why: lessons/kit-pad.md#wrapper
   */
  const root = document.createElement('div');
  root.className = 'pos-pad-wrap';
  /**
   * The wrapper carries the disabled state too: `:disabled` cannot reach the sibling labels.
   * why: lessons/kit-pad.md#wrapper-disabled
   */
  if (disabled) root.dataset.off = '1';
  const topEl = document.createElement('div');
  topEl.className = 'pos-pad-top';
  topEl.textContent = top;
  root.append(topEl, el);
  const botEl = bottom ? document.createElement('div') : null;
  if (botEl) {
    botEl.className = 'pos-pad-bot';
    botEl.textContent = bottom;
    root.append(botEl);
  }

  function paintTint(c) {
    if (c) el.style.setProperty('--pad-tint', c);
    else el.style.removeProperty('--pad-tint');
  }
  paintTint(tint);

  function paint() {
    // Deleted, never emptied: `[data-on]` matches on presence.
    // why: lessons/kit-pad.md#data-on
    if (lit) el.dataset.on = '1'; else delete el.dataset.on;
    if (latch) el.setAttribute('aria-pressed', String(lit));
  }

  /** @param {boolean} next @param {{quiet?:boolean}} [o] */
  function set(next, { quiet = false } = {}) {
    const was = lit;
    lit = !!next;
    paint();
    if (!quiet && lit !== was) onPress(lit, api);
    return lit;
  }

  el.addEventListener('click', () => {
    // ⚠️ A DISABLED BUTTON FIRES NO CLICK IN ANY BROWSER, so this is belt and
    // braces rather than the guard. What it is really for is a caller that
    // dispatches a synthetic click, which a harness does.
    if (el.disabled) return;
    presses++;
    if (latch) set(!lit);
    else { onPress(true, api); flash(); }
  });

  /**
   * Light it for one moment. A class and a timer, not an animation restart (that needs a reflow).
   * why: lessons/kit-pad.md#flash
   */
  let flashT = 0;
  function flash(ms = 90) {
    el.dataset.hit = '1';
    clearTimeout(flashT);
    flashT = setTimeout(() => delete el.dataset.hit, ms);
  }

  paint();

  const api = {
    /** The WRAPPER, so a caller places the pad and its label together. */
    el: root,
    /** The button itself, for a caller that needs to measure or focus it. */
    button: el,
    set, flash,
    on: () => lit,
    tint: paintTint,
    presses: () => presses,
    label(next) { face.textContent = next; },
    top(next) { topEl.textContent = next; },
    bottom(next) { if (botEl) botEl.textContent = next; },
    /**
     * Disable only a control that cannot do its job, and keep what sat behind it reachable:
     * a disabled control is a check the harness can no longer reach.
     * @param {boolean} yes @param {string} [why]  shown on hover
     * why: lessons/kit-pad.md#enable
     */
    enable(yes, why = '') {
      el.disabled = !yes;
      // Both, for the reason on the wrapper above.
      if (yes) delete root.dataset.off; else root.dataset.off = '1';
      if (!yes && why) el.title = why;
      else if (yes && why) el.title = title;
      return !el.disabled;
    },
    disabled: () => el.disabled,
  };
  return api;
}

/**
 * A grid of pads.
 * @param {object} o
 * @param {number} o.cols   how many across: the beat, 16 for sixteenths of a bar
 * @param {number} [o.rows] default 1
 * @param {(x:number, y:number)=>object} [o.pad]  options per pad; its `onPress` runs before the grid's
 * @param {(on:boolean, x:number, y:number, pad:object)=>void} [o.onPress]  the whole grid's handler
 * @returns {{el:HTMLElement, pads:object[][], at:Function, column:Function,
 *            lit:()=>number, clear:Function}}
 * why: lessons/kit-pad.md#create-pad-grid
 */
export function createPadGrid({ cols, rows = 1, pad = () => ({}), onPress = () => {} } = {}) {
  if (!(cols > 0)) throw new Error('a pad grid needs a column count: it is the beat');
  const el = document.createElement('div');
  el.className = 'pos-padgrid';
  // A custom property, not an inline grid-template, so the stylesheet can still override it.
  // why: lessons/kit-pad.md#pad-cols
  el.style.setProperty('--pad-cols', String(cols));

  /**
   * A grid with no labels at all collapses its label slots (they added 15 px to every row gap).
   * Decided per grid, so specs are read before any pad is built.
   * why: lessons/kit-pad.md#collapse-labels
   */
  const specs = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) row.push(pad(x, y) || {});
    specs.push(row);
  }
  const anyLabel = specs.flat().some((s) => s.top || s.bottom);
  if (!anyLabel) el.classList.add('pos-padgrid-bare');

  const pads = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      /**
       * Both handlers run, the pad's own first. The grid's used to overwrite it silently.
       * why: lessons/kit-pad.md#both-handlers
       */
      const own = specs[y][x].onPress;
      const p = createPad({
        ...specs[y][x],
        onPress: (on, self) => { own?.(on, self); onPress(on, x, y, self); },
      });
      row.push(p);
      el.append(p.el);
    }
    pads.push(row);
  }

  return {
    el,
    pads,
    at: (x, y = 0) => pads[y]?.[x],
    /** Flash a whole column, which is what a playhead walking the grid does. */
    column(x, ms) { for (const row of pads) row[x]?.flash(ms); },
    lit: () => pads.flat().filter((p) => p.on()).length,
    clear() { for (const p of pads.flat()) p.set(false, { quiet: true }); },
  };
}
