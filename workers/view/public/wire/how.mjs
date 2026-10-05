// demo/wire/how.mjs: the "How it works" picture for each tab of `/wire/`, and
// the three checks every one of them owes.
//
// 🔴 ONE PICTURE PER TAB, BECAUSE THE TWO TABS DO DIFFERENT THINGS. MESSAGES is
// a socket to the relay plus a recorder beside it and a history read over
// HTTPS; KEYBOARD is notes through the relay to another machine and, on a
// press, that machine's sound back peer to peer. One picture of both would be
// two pictures sharing a Cloudflare box.
//
// 🔴 DRAWN ON THE TAB'S FIRST SHOWING, NEVER IN `build`. `tab-page.mjs` adds the
// tab's report (readout and log) AFTER `build` returns, so a picture made in
// `build` would sit above the log rather than last; and a picture measured in a
// closed panel is laid out for a width nobody has (the kit's seven diagrams at
// 320 px inside a 658 px panel). `show()` runs after the report is placed and
// only on a panel that is open.
//
// ⚠️ `atEnd: false`, the way `/stage/` does it. With `atEnd` the component
// appends to `document.body` and both tabs' pictures would stand under the page
// whatever tab was open.

import { createDiagram } from '/shell/diagram.mjs';
import { el } from '/shell/shell.mjs';

const frame = () => new Promise((r) => requestAnimationFrame(r));

/** Draw `spec` as the last block of `panel`, once. Returns a getter. */
export function howIn(panel) {
  let dg = null, host = null;
  return {
    draw(spec) {
      if (dg) return dg;
      host = el('div', 'wire-how');
      panel.add(host);
      dg = createDiagram(host, spec, { how: true });
      return dg;
    },
    get dg() { return dg; },
    get host() { return host; },
  };
}

/** Every box in a spec, containers and the boxes inside them. */
export const boxesOf = (nodes) => nodes.flatMap((n) => [n, ...boxesOf(n.children || [])]);

/**
 * The three checks a picture owes, made by the tab's own `A`. The fourth, that
 * its boxes are the parts the tab really uses, is the tab's to make, because
 * only the tab knows which socket and which element each box stands for.
 */
export async function gradeHow(A, how, spec) {
  const dg = how.dg;
  // It re-lays itself out through a ResizeObserver when its host gets a width,
  // so wait for that rather than reading the first estimate.
  for (let i = 0; i < 40 && dg && !dg.measured; i++) await frame();
  const last = how.host?.parentElement?.lastElementChild === how.host;
  const drawn = dg ? dg.svg.querySelectorAll('.pos-dg-n').length : 0;
  const want = boxesOf(spec.nodes).length;
  A('the How it works picture is drawn, last in the tab, with every box in it',
    !!dg && last && drawn === want,
    dg ? `${drawn} of ${want} boxes, ${last ? 'last in the tab' : 'NOT last in the tab'}` : 'no picture');

  const w = dg ? dg.el.clientWidth : 0;
  const svgW = dg ? Number(dg.svg.getAttribute('width')) : 0;
  A('it is laid out at the width it really has, measured rather than estimated',
    !!dg && dg.measured && w > 320 && Math.abs(svgW - w) < 2,
    dg ? `${dg.measured ? 'type measured' : 'type ESTIMATED'}, drawn ${svgW} px in a ${w} px box, ${dg.mode}` : 'no picture');

  A('nothing in the picture was cut or refused', !!dg && dg.cuts.length === 0,
    dg ? (dg.cuts.map((c) => `${c.where} ${c.id}: ${c.shown}`).join(', ') || 'every name and arrow whole') : 'no picture');
}
