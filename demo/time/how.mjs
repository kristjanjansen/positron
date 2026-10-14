// The "How it works" picture at the foot of each /time/ tab, read off its code.
// Drawn on the tab's first showing (a closed panel lays out for 320 px), with
// `how: true`, not `atEnd`, which would put it under every tab at once.
// See lessons/page-time.md#time-3

import { el } from '/shell/shell.mjs';
import { createDiagram } from '/shell/diagram.mjs';

/** The words a drawn box shows, one string per box, its wrapped lines joined.
 *  Not the ruler: `diagram.mjs` measures with an `aria-hidden` text that wears
 *  the same class. */
function drawnNames(dg) {
  return [...dg.svg.querySelectorAll('text.pos-dg-lab:not([aria-hidden])')]
    .map((t) => [...t.querySelectorAll('tspan')].map((s) => s.textContent).join(' ').trim());
}

/** Every label in a spec, children included, in order. */
function specNames(spec) {
  const out = [];
  const walk = (ns) => { for (const n of ns) { out.push(n.label); if (n.children) walk(n.children); } };
  walk(spec.nodes);
  return out;
}

/** The boxes that do something: every label that holds no other box. */
function leafNames(spec) {
  const out = [];
  const walk = (ns) => { for (const n of ns) { if (n.children?.length) walk(n.children); else out.push(n.label); } };
  walk(spec.nodes);
  return out;
}

/**
 * @param {object} panel   the tab's stack, from `build({ panel })`
 * @param {() => object} makeSpec  the picture, built when it is first drawn,
 *        so a sub can read a number the tab only has after its build
 */
export function tabDiagram(panel, makeSpec) {
  let dg = null, spec = null, host = null;
  return {
    get dg() { return dg; },
    /** Draw it once, the first time the tab is on screen. */
    draw() {
      if (dg) return dg;
      spec = makeSpec();
      host = el('div', 'time-how');
      panel.add(host);
      dg = createDiagram(host, spec, { how: true });
      return dg;
    },
    /**
     * @param {Function} A  the tab's assert
     * @param {Array<[string, boolean, string?]>} facts  one per box: its name,
     *        whether the tab really has that thing, and what was read
     */
    check(A, facts) {
      A('the diagram is drawn in this tab, last in it',
        !!dg && panel.el.contains(dg.el) && panel.el.lastElementChild === host,
        dg ? `last child is .${panel.el.lastElementChild?.className}` : 'no diagram');
      if (!dg) return;
      const w = dg.el.clientWidth;
      const drawnW = Number(dg.svg.getAttribute('width'));
      A('the diagram is laid out at the width it is shown at, with measured type',
        dg.measured && w > 0 && Math.abs(drawnW - w) <= 2,
        `${drawnW} px drawn in ${w} px, ${dg.mode}, type ${dg.measured ? 'measured' : 'ESTIMATED'}`);
      A('the diagram drew every name and every arrow whole',
        dg.cuts.length === 0,
        dg.cuts.map((c) => `${c.where} ${c.id}: ${c.shown || c.full}`).join(', ') || 'nothing cut, nothing refused');
      // Sorted: the drawer places boxes in its own order, not the spec's.
      const want = specNames(spec).sort(), got = drawnNames(dg).sort();
      const missing = facts.filter(([, ok]) => !ok);
      // A container is the machine the boxes run on and has no reading of its
      // own; every box inside one needs a fact.
      const unnamed = leafNames(spec).filter((n) => !facts.some(([f]) => f === n));
      A('every box in the diagram names something this tab really runs',
        got.length === want.length && want.every((n, i) => got[i] === n)
          && !missing.length && !unnamed.length,
        got.join() !== want.join() ? `drew ${got.join(', ')} for ${want.join(', ')}`
        : missing.length || unnamed.length
          ? `not true: ${missing.map(([f, , d]) => `${f} (${d || 'no'})`).join(', ') || 'none'}; `
            + `no reading for: ${unnamed.join(', ') || 'none'}`
          : facts.map(([f, , d]) => (d ? `${f} ${d}` : f)).join(', '));
    },
  };
}
