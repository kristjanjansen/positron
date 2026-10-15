// demo/shell/oled-card.mjs: one card holding a picture of the Pi's 128x64 screen: a name, an optional line,
// the screen in a well that runs edge to edge, and a footer like the video panel's with its buttons on the
// right. /devices/patches/ and /devices/drums/ build their cards with it. Styles: `.pos-oc*` in shell.css.
import { el } from './shell.mjs';

/**
 * @param {object} o
 * @param {string} o.name             the card's title
 * @param {string} [o.say]            one line under it
 * @param {HTMLCanvasElement} o.canvas  a 128x64 canvas, drawn at the grid's `--oc-k` scale
 * @param {HTMLElement} [o.right]     the footer's right end, usually a button group
 * @param {HTMLElement|string} [o.left]  the footer's left end, a short note
 * @returns {{ el: HTMLElement, foot: HTMLElement }}
 */
export function createOledCard({ name, say = '', canvas, right = null, left = '' }) {
  const card = el('div', 'pos-oc');
  const head = el('div', 'pos-oc-head');
  head.append(el('h3', 'pos-oc-name', name), ...(say ? [el('p', 'pos-oc-say', say)] : []));
  const frame = el('div', 'pos-oc-frame'); frame.append(canvas);
  const well = el('div', 'pos-oc-well'); well.append(frame);
  const foot = el('div', 'pos-oc-foot');
  foot.append(typeof left === 'string' ? el('span', 'pos-oc-note', left) : left, ...(right ? [right] : []));
  card.append(head, well, foot);
  return { el: card, foot };
}

/** A grid of cards; `k` is the screens' scale. */
export function createOledGrid(k = 2) {
  const g = el('div', 'pos-oc-grid');
  g.style.setProperty('--oc-k', String(k));
  return g;
}
