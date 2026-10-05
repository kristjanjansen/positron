// demo/sync/how.mjs: the "How it works" picture of one /sync/ tab, drawn
// into that tab and graded from that tab's own check.
//
// 🔴 ONE PICTURE PER TAB, BECAUSE THE FOUR TABS WORK FOUR DIFFERENT WAYS.
// INSTANT goes through the relay and back, CLOCKS agrees a time between two
// clocks and then sends nothing, LATE VIDEO holds a cue for a picture that
// arrives late, REPLAY lets a recording be the clock. One picture under the
// whole page would describe none of them, which is what `/stage/` was told
// about its own (*"move how it works to control room and archive"*).
// ⚠️ SO IT IS `atEnd: false`. `atEnd` appends to `document.body`, under every
// tab at once, and the picture would leave the tab it describes.
//
// 🔴 DRAWN ON THE TAB'S FIRST SHOWING, NEVER AT BUILD. A diagram laid out in a
// closed panel measures 0 and lays out for 320 px; `tab-page.mjs` only builds
// a tab into an open panel, but `ensure()` can build one closed, and the
// picture comes after the tab's readout and log, which `tab-page.mjs` adds
// after `build` returns. `show()` is after both.
//
// 🔴 THE CHECK GRADES FOUR THINGS, AND THE THIRD IS THE ONE THAT CATCHES THE
// CLOSED-PANEL BUG. Built; measured with real type (`measured`, or a clean
// `cuts` means nothing, see `/stage/`); drawn at the width its box has NOW,
// so a picture laid out for 320 px inside a 700 px panel reads red; nothing
// cut; and the boxes on screen are the boxes the tab declares, name and sub,
// read back off the drawing rather than off the spec.

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
