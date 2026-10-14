// The "How it works" picture of one /sync/ tab, one per tab since each works
// differently. `atEnd: false` keeps it inside its tab; it is drawn on the tab's
// first showing, never at build, because a closed panel measures 0.
// See lessons/page-sync.md#sync-4

import { el } from '/shell/shell.mjs';
import { createDiagram } from '/shell/diagram.mjs';

const frame = () => new Promise((r) => requestAnimationFrame(r));

/**
 * @param {object} panel  the tab's stack (`build`'s `panel`)
 * @param {() => object} makeSpec  the picture, built when it is first drawn
 */
export function tabDiagram(panel, makeSpec) {
  let dg = null;
  return {
    get dg() { return dg; },
    /** Draw it once, the first time the tab is shown. */
    draw() {
      if (dg) return dg;
      const host = el('div');
      panel.add(host);
      dg = createDiagram(host, makeSpec(), { how: true });
      return dg;
    },
    /**
     * @param {Function} A  the tab's assert
     * @param {string[]} want  every box as `name, sub`, from the tab's own
     *   constants, so a picture that drifts from what the tab runs reads red
     */
    async check(A, want) {
      A('the diagram is drawn in this tab, under its readout and log',
        !!dg && dg.el.isConnected && panel.el.contains(dg.el)
          && !!dg.el.previousElementSibling?.matches?.('.pos-how'),
        dg ? (dg.el.isConnected ? 'in the tab, under its heading' : 'built but not on the page') : 'never drawn');
      if (!dg) return;
      // The component re-lays itself out when its box gets a width; wait for
      // that rather than assuming it.
      for (let i = 0; i < 40 && !dg.measured; i++) await frame();
      await frame();
      const W = Math.floor(dg.el.clientWidth);
      const drawn = Number(dg.svg.getAttribute('width'));
      A('the diagram is laid out at the width it really has, with real type',
        dg.measured && W > 0 && Math.abs(drawn - W) <= 2,
        `${dg.measured ? 'measured' : 'NEVER MEASURED, so the cut count below means nothing'}, `
        + `drawn ${drawn} px wide in a box ${W} px wide, ${dg.mode} layout`);
      A('nothing in the diagram was cut or refused', dg.cuts.length === 0,
        dg.cuts.map((c) => `${c.where} ${c.id}: ${c.shown}`).join(', ') || 'every name, sub, note and arrow whole');
      const got = [...dg.svg.querySelectorAll('.pos-dg-n')]
        .map((g) => (g.getAttribute('aria-label') || '').split('. ')[0]);
      const missing = want.filter((w) => !got.includes(w));
      const extra = got.filter((g) => !want.includes(g));
      A('the boxes drawn are the parts this tab runs, by name and sub',
        missing.length === 0 && extra.length === 0 && got.length === want.length,
        missing.length || extra.length
          ? `missing ${missing.join(' | ') || 'none'}, not expected ${extra.join(' | ') || 'none'}`
          : `${got.length} boxes: ${got.join(' | ')}`);
    },
  };
}
