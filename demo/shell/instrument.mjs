// demo/shell/instrument.mjs: a cased panel with the instrument's name on it. A composition of
// `createPanelLayout` and `createNameplate`, reimplementing neither; the plate belongs to the case,
// above the fixed column and the strip, or it scrolls away from what it names.
// why: lessons/kit-instrument.md#header

import { el } from './shell.mjs';
import { createGlue } from './glue.mjs';
import { createPanelLayout, createNameplate } from './panel-layout.mjs';
import { createPresence, createPresenceButton } from './presence.mjs';

/** What every instrument on this site is made by, so no page types it. */
export const MAKER = 'POSITRON';

/**
 * What the header's status control says in its two states. Colours and width come from
 * `presence.mjs`; two states, not five, since a header says only whether it is in the chain.
 * why: lessons/kit-instrument.md#header-says
 */
/**
 * One word, the state: `PLAITS on` means it is on, and the dot agrees with it.
 * A caller with no `press` still gets the states named through `says`.
 * why: lessons/kit-instrument.md#header-word
 */
export const HEADER_SAYS = { online: 'on', offline: 'off' };
/** The only two states a header's status control can reach. See `HEADER_SAYS`. */
export const HEADER_STATES = ['online', 'offline'];

/**
 * The plate's lines and the placement they need. Pure, so instrument-test.mjs grades it with no
 * browser. A maker of `''` means no brand, and one line goes to `end`: `ends` parks it on the left.
 * why: lessons/kit-instrument.md#platelines
 */
// `side` survives a single line: the left-parking argument is horizontal, and `/shape/` is one line.
// why: lessons/kit-instrument.md#keeps-one-line
const KEEPS_ONE_LINE = new Set(['side']);

export function plateSpec(maker, name, place = 'ends') {
  const lines = maker ? [maker, name] : [name];
  return { lines, place: lines.length === 1 && !KEEPS_ONE_LINE.has(place) ? 'end' : place };
}

/**
 * The header row: status left, patch selector centred, nameplate right. `1fr auto 1fr` puts the
 * centre on the case's centre. With `press` the status is a real button, without it a badge.
 * The plate in a header is `end`, never `ends`, which would butt maker and model together.
 * why: lessons/kit-instrument.md#buildheader
 */
function buildHeader({ name, maker, header }) {
  const { online = {}, patch = null } = header;
  const head = el('div', 'panel-head');

  // The plate is first in the DOM and third in the picture: source order is the phone's one column;
  // shell.css places all three on desktop by `grid-column`.
  // why: lessons/kit-instrument.md#header-order
  /**
   * `plate: false` drops the plate, since the status control already prints the name.
   * The default keeps it.
   * why: lessons/kit-instrument.md#plate-false
   */
  const plate = header.plate === false
    ? null
    : createNameplate({ ...plateSpec(maker, name, 'end'), cls: 'panel-head-plate' });
  if (plate) head.append(plate.el);

  let status = null;
  if (online !== false) {
    const { press = null, state = 'online', says = {}, of = name, ...rest } = online;
    /**
     * The control paints `on` and `off`, never the name, since the plate is on the same row.
     * `of` stays for the aria label. Before `...rest`, so `showName: true` brings the name back.
     * why: lessons/kit-instrument.md#on-off
     */
    const opts = {
      of,
      can: HEADER_STATES,
      says: { ...HEADER_SAYS, ...says },
      state,
      showName: false,
      ...rest,
    };
    status = press
      ? createPresenceButton({ ...opts, press, aria: `switch ${of} on and off` })
      : createPresence({ ...opts, mode: 'badge' });
    status.el.classList.add('panel-head-on');
    head.append(status.el);
  }

  const mid = el('div', 'panel-head-mid');
  if (patch) mid.append(patch.el || patch);
  head.append(mid);

  return { head, plate, status, mid };
}

/**
 * A cased instrument panel with its name printed across the top.
 * @param {object}  o
 * @param {string}  o.name            the model, printed at the right end
 * @param {string}  [o.maker=MAKER]   the maker, printed at the left end
 * @param {Element} [o.host]          append the case to this
 * @param {string}  [o.place='ends']  a `createNameplate` placement
 * @param {object}  [o.panel]         passed straight to `createPanelLayout`
 * @param {object}  [o.header]        build a header row across the case, see `buildHeader`. `{ online, patch }`, where `online` takes a `press` to become a button and is `false` for no status control. Off by default, so existing cases and their asserts are unchanged.
 * @returns {{el, panel, plate, fixed, strip, flow, head, online, add, band, unband, seam, shown}}
 * why: lessons/kit-instrument.md#createinstrument
 */
export function createInstrument(o = {}) {
  const {
    name, maker = MAKER, host, place = 'ends', panel: panelOpts = {},
    header = false,
    parts = null,
    /**
     * `caps: false` keeps the name as typed (`/shape/`), a deliberate departure from every other plate.
     * why: lessons/kit-instrument.md#caps
     */
    caps = true,
  } = o;
  /**
   * Refused without a name, at build time: the plate is the only thing saying which instrument this is.
   * why: lessons/kit-instrument.md#no-name
   */
  if (!name) {
    throw new Error('an instrument needs a name: the plate is the only thing saying which one it is');
  }

  /* The lines and the placement are decided by `plateSpec`, which is pure and
     is graded without a browser. */
  const spec = { ...plateSpec(maker, name, place), caps };
  // The header owns the plate when there is one, the panel when there is not: never two plates.
  // why: lessons/kit-instrument.md#plate-owner
  /**
   * The header is a glued part, not a row inside the case: a border inside the case's padding can
   * never reach the sides. `createGlue` gives the seam full width and drops the doubled padding.
   * why: lessons/kit-instrument.md#glued-header
   */
  const head = header ? buildHeader({ name, maker, header }) : null;
  /**
   * The panel places the plate, this file does not: a plate prepended from outside sat on the top
   * border. `createPanelLayout` takes a `plate` and owns the spacing.
   * why: lessons/kit-instrument.md#panel-places-plate
   */
  /**
   * The case keeps its own plate whenever the bar is not carrying one: the test is who has the plate.
   * why: lessons/kit-instrument.md#barhasplate
   */
  const barHasPlate = !!head && header.plate !== false;
  const panel = createPanelLayout({ ...panelOpts, plate: barHasPlate ? null : spec });
  const plate = barHasPlate ? head.plate : panel.plate;
  // The header belongs to the case, above the fixed column and the strip; its spacing is shell.css's
  // `.panel-case > .panel-head`, off `--panel-pad`.
  // why: lessons/kit-instrument.md#header-placement
  // Glued, never prepended. `createGlue` returns a single block unwrapped, so no header adds no box.
  // why: lessons/kit-instrument.md#glued
  /**
   * `header: { at: 'head' | 'foot' }`, `head` by default; `createGlue` takes parts in order, so it is
   * an argument swap rather than a second assembly.
   * why: lessons/kit-instrument.md#at-foot
   */
  /**
   * `parts: [el]` glues a caller's own parts between the case and the bar. They are glue parts with
   * the seam either side, not case contents like `add()`.
   * why: lessons/kit-instrument.md#parts
   */
  const atFoot = !!head && header.at === 'foot';
  const mid = (parts || []).filter(Boolean).map((b) => b.el || b);
  const root = head
    ? (atFoot ? createGlue(panel.el, ...mid, head.head) : createGlue(head.head, panel.el, ...mid))
    : createGlue(panel.el, ...mid);
  host?.append(root);

  return {
    el: root,
    /** The case itself, which is `el` on an instrument with no header. */
    case: panel.el,
    panel,
    plate,
    /** The header row, or `null` on a case that was not given one. */
    head: head?.head || null,
    /** The header's status control, or `null`. A presence api either way. */
    online: head?.status || null,
    /** The header's centre cell, which is where a patch selector goes. */
    patchSlot: head?.mid || null,
    // The three places a caller puts things, forwarded rather than wrapped, so
    // everything `panel-layout.mjs` documents about them stays true here.
    fixed: panel.fixed,
    strip: panel.strip,
    flow: panel.flow,
    /** Put blocks in the scrolling flow, in order. `null` is skipped. */
    add(...blocks) {
      const into = panel.flow || panel.strip;
      for (const b of blocks) if (b) into.append(b.el || b);
      return this;
    },
    /**
     * Stack a block across the case, under whatever is there, with the rule between two of them.
     * Forwarded like `fixed`, `strip` and `flow`. Not `add()`, which puts a block in the scroller.
     * why: lessons/kit-instrument.md#band
     */
    band: (block) => panel.band(block),
    unband: (block) => panel.unband(block),
    seam: () => panel.seam(),
    /** What the plate RENDERS, uppercase transform included. See the plate. */
    shown: () => plate.shown(),
  };
}

export default createInstrument;
