// demo/shell/instrument-panel.mjs: an instrument as a stack of glued rows: picture, controls, keys,
// nameplate foot. The order is the component's: `addRow` always lands above keys and plate.
// The patch selector has no label and sits at the plate row's right end; in `status` it throws.
// why: lessons/kit-instrument-panel.md#header

import { createGlueRows } from './glue.mjs';
import { createNameplate } from './panel-layout.mjs';
import { el } from './shell.mjs';

/** The row kinds, in the order the sketch draws them. `shape()` returns these. */
export const ROW_KINDS = ['viz', 'controls', 'keys', 'plate'];

/**
 * An element, or `{ el, ...rowOptions }`: one escape for `viz` and `keys`.
 * why: lessons/kit-instrument-panel.md#partof
 */
function partOf(v) {
  if (!v) return null;
  if (v.nodeType === 1) return { el: v, opt: {} };
  const e = v.el;
  if (!e) return null;
  const { el: _drop, ...opt } = v;
  return { el: e, opt };
}

/** An element, or the element of a built control. A string or nothing is null. */
function elOf(v) {
  if (!v || typeof v === 'string') return null;
  if (v.nodeType === 1) return v;
  return v.el && v.el.nodeType === 1 ? v.el : null;
}

/** Is this a `createPicker` control? Read off its class, which is what renders. */
function isPicker(e) {
  return !!(e && e.classList && e.classList.contains('pos-pick'));
}

/**
 * Take a picker's `.pos-pick-l` caption off: removed, not hidden, so the node test can see it.
 * why: lessons/kit-instrument-panel.md#unlabel
 */
function unlabel(ctl) {
  const found = ctl.querySelectorAll ? ctl.querySelectorAll('.pos-pick-l') : [];
  for (const l of found) l.remove();
  return found.length;
}

/**
 * An instrument panel.
 * @param {object} [o]
 * @param {Element|object} [o.viz]   the picture, edge to edge by default.
 * @param {Array[]} [o.rows]         rows of controls, top to bottom. Each entry is an array of controls, or an array of `[controls, options]`.
 * @param {Element|object} [o.keys]  the keyboard.
 * @param {object|false} [o.plate]   `{ name, patch, status }`, or a built nameplate, or `false` for a panel with no foot. `patch` is a string or a control; `status` is a control placed after the name.
 * @param {string} [o.cls]           extra classes for the surface.
 * why: lessons/kit-instrument-panel.md#createinstrumentpanel
 */
export function createInstrumentPanel(o = {}) {
  const { viz = null, rows: rowSpecs = [], keys = null, plate: plateSpec = null, cls = '', full = false } = o;

  const glue = createGlueRows({ cls: cls ? `pos-ipanel ${cls}` : 'pos-ipanel', full });
  /** @type {{el: Element, kind: string}[]} the rows, in order, with their kind. */
  const kept = [];

  function put(content, kind, opt = {}) {
    const before = kind === 'controls' ? (keysRow || plateRow) : null;
    const r = glue.row(content, { ...opt, cls: `pos-ipanel-${kind}${opt.cls ? ` ${opt.cls}` : ''}`, before });
    // The kind is on the element too, so a check reads what is rendered, not what this module remembers.
    // why: lessons/kit-instrument-panel.md#data-kind
    r.dataset.kind = kind;
    const at = before ? kept.findIndex((k) => k.el === before) : -1;
    kept.splice(at < 0 ? kept.length : at, 0, { el: r, kind });
    return r;
  }

  // The parts that anchor the order are built first, so `put('controls')` has something to insert before.
  // why: lessons/kit-instrument-panel.md#anchors
  const vizPart = partOf(viz);
  const vizRow = vizPart ? glue.row(vizPart.el, { pad: false, cls: 'pos-ipanel-viz', ...vizPart.opt }) : null;
  if (vizRow) { vizRow.dataset.kind = 'viz'; kept.push({ el: vizRow, kind: 'viz' }); }

  const keysPart = partOf(keys);
  let keysRow = null;
  if (keysPart) {
    keysRow = glue.row(keysPart.el, { align: 'start', cls: 'pos-ipanel-keys', ...keysPart.opt });
    keysRow.dataset.kind = 'keys';
    kept.push({ el: keysRow, kind: 'keys' });
  }

  /**
   * The foot is a nameplate, `place: 'ends'`: name and its `status` switch at the start, the patch at
   * the end, so a longer patch grows into air. A picker is only ever the end, without caption.
   * Under 560 px the row centres (shell.css `.pos-ipanel-plate`); no harness runs at that width.
   * why: lessons/kit-instrument-panel.md#foot
   */
  let plate = null, plateRow = null, status = null, patchEnd = null, patchLine = null;
  if (plateSpec) {
    const built = !!(plateSpec.el && plateSpec.lines);
    status = built ? null : elOf(plateSpec.status);
    const patchCtl = built ? null : elOf(plateSpec.patch);
    const patchText = built || patchCtl ? null : plateSpec.patch;
    const caps = plateSpec.caps !== false;
    // A patch selector in the status slot is refused here rather than drawn at the start.
    // why: lessons/kit-instrument-panel.md#picker-status
    if (isPicker(status)) {
      throw new Error('createInstrumentPanel: a patch selector goes in `patch`, which is the far end of the plate row; `status` is the switch beside the name');
    }
    if (patchCtl && isPicker(patchCtl)) unlabel(patchCtl);
    if (built || (!status && !patchCtl)) {
      plate = built
        ? plateSpec
        : createNameplate({
          lines: [plateSpec.name, patchText].filter((t) => t != null && t !== ''),
          place: plateSpec.place || 'ends',
          caps,
        });
      patchLine = plate.lines.length > 1 ? plate.lines[plate.lines.length - 1] : null;
      if (patchLine) patchLine.classList.add('panel-plate-patch');
      plateRow = glue.row(plate.el, { cls: 'pos-ipanel-plate' });
    } else {
      plate = createNameplate({ lines: [plateSpec.name].filter((t) => t != null && t !== ''), place: 'ends', caps });
      const start = el('div', 'pos-ipanel-name');
      start.append(plate.el);
      if (status) start.append(status);
      if (patchCtl) {
        patchEnd = patchCtl;
      } else if (patchText != null && patchText !== '') {
        const tail = createNameplate({ lines: [patchText], place: 'ends', caps });
        patchLine = tail.lines[0];
        patchLine.classList.add('panel-plate-patch');
        patchEnd = tail.el;
      }
      plateRow = patchEnd
        ? glue.row([start, patchEnd], { align: 'between', cls: 'pos-ipanel-plate' })
        : glue.row([start], { align: 'start', cls: 'pos-ipanel-plate' });
    }
    plateRow.dataset.kind = 'plate';
    kept.push({ el: plateRow, kind: 'plate' });
  }

  // The control rows, in the order given, each above the keyboard and the foot.
  const controlRows = rowSpecs.filter(Boolean).map((spec) => {
    const [content, opt] = Array.isArray(spec) && Array.isArray(spec[0]) ? spec : [spec, {}];
    return put(content, 'controls', opt || {});
  });

  /**
   * Rewrite the foot's right-hand end, printed as typed (`panel-plate-patch` drops the uppercase).
   * Throws on a plate with no second line: a line arriving later would resize the foot on screen.
   * why: lessons/kit-instrument-panel.md#patch
   */
  function patch(text) {
    if (!plate) throw new Error('createInstrumentPanel.patch: this panel has no plate');
    if (patchEnd && !patchLine) {
      throw new Error('createInstrumentPanel.patch: this plate’s patch end is a control, so there is no text to rewrite');
    }
    if (!patchLine) {
      throw new Error('createInstrumentPanel.patch: this plate has no patch line, so there is no reserved box to write into');
    }
    patchLine.textContent = text;
    return text;
  }

  return {
    el: glue.el,
    glue,
    viz: vizRow,
    keys: keysRow,
    plate,
    plateRow,
    /** The foot's status control, or `null`. The element, as handed in. */
    status,
    /** The foot's end: the patch control, or the text patch's own plate, or `null`. */
    patchEnd,
    /** The control rows, in order. */
    controls: () => controlRows.slice(),
    /** Every row, in the order the page renders them, with its kind. */
    rows: () => kept.slice(),
    /**
     * The panel's shape, as row kinds top to bottom, read off the DOM rather than the list.
     * why: lessons/kit-instrument-panel.md#shape
     */
    shape: () => [...glue.el.children].map((r) => r.dataset.kind || '?'),
    /** Another row of controls, above the keyboard and the foot. */
    addRow: (content, opt) => {
      const r = put(content, 'controls', opt || {});
      controlRows.push(r);
      return r;
    },
    patch,
  };
}
